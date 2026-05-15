// src/lib/llm/anthropic.ts — Anthropic provider (v0.6.0 B-3, B-4).
//
// Uses @anthropic-ai/sdk to satisfy LLMProvider. The SDK exposes messages.create
// for one-shot, messages.stream for streaming, and messages.batches.* for the
// 50%-discount Batch API.
//
// JSON mode: Anthropic doesn't have an Ollama-style format:"json" flag. The
// existing enrichment prompt already constrains the model to return JSON-only,
// so generateJson follows the same shape as the Ollama path: parse → on
// failure, retry once at lower temperature → on second failure, throw with
// raw response on cause.
//
// API key is required at construction time; falls back to ANTHROPIC_API_KEY.
// Throws LLMError("connection") if neither is present so the factory's
// failure mode matches Ollama's "daemon unreachable".

import Anthropic from "@anthropic-ai/sdk";
import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

interface AnthropicProviderOptions {
  apiKey?: string;
  /** Default model when GenerateOptions.model is unset. */
  model?: string;
  /** Override base URL for tests / proxies. */
  baseURL?: string;
  /** Cap output tokens; mirrors Ollama's num_predict default. */
  defaultMaxTokens?: number;
}

const DEFAULT_MODEL = process.env.LLM_ENRICH_MODEL ?? "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1200;

function wrapSdkError(err: unknown, context: string): LLMError {
  const e = err as { status?: number; message?: string; name?: string };
  if (e?.name === "AbortError" || e?.name === "TimeoutError") {
    return new LLMError("timeout", `${context}: request timed out`);
  }
  if (typeof e?.status === "number") {
    return new LLMError("http", `${context}: ${e.status} ${e.message ?? ""}`.trim(), e.status);
  }
  return new LLMError("connection", `${context}: ${e?.message ?? String(err)}`);
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor(opts: AnthropicProviderOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        "connection",
        "Anthropic provider requires ANTHROPIC_API_KEY (env or constructor)",
      );
    }
    this.client = new Anthropic({ apiKey, baseURL: opts.baseURL });
    this.defaultModel = opts.model ?? DEFAULT_MODEL;
    this.defaultMaxTokens = opts.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const model = opts.model ?? this.defaultModel;
    const t0 = Date.now();
    let res: Anthropic.Message;
    try {
      res = await this.client.messages.create(
        {
          model,
          max_tokens: opts.num_predict ?? this.defaultMaxTokens,
          temperature: opts.temperature ?? 0.3,
          system: opts.system,
          messages: [{ role: "user", content: opts.prompt }],
        },
        { signal: opts.signal },
      );
    } catch (err) {
      throw wrapSdkError(err, "Anthropic messages.create");
    }
    const wall_ms = Date.now() - t0;
    return {
      model,
      response: extractText(res),
      metrics: {
        input_tokens: res.usage.input_tokens,
        output_tokens: res.usage.output_tokens,
        wall_ms,
      },
    };
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncGenerator<string, void, void> {
    const model = opts.model ?? this.defaultModel;
    const t0 = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let stream: ReturnType<Anthropic["messages"]["stream"]>;
    try {
      stream = this.client.messages.stream(
        {
          model,
          max_tokens: opts.num_predict ?? this.defaultMaxTokens,
          temperature: opts.temperature ?? 0.3,
          system: opts.system,
          messages: [{ role: "user", content: opts.prompt }],
        },
        { signal: opts.signal },
      );
    } catch (err) {
      throw wrapSdkError(err, "Anthropic messages.stream");
    }

    try {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta" &&
          event.delta.text.length > 0
        ) {
          yield event.delta.text;
        } else if (event.type === "message_delta" && event.usage) {
          // Final usage arrives on message_delta; input_tokens shows up
          // earlier on message_start.
          outputTokens = event.usage.output_tokens;
        } else if (event.type === "message_start" && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens;
          outputTokens = event.message.usage.output_tokens;
        }
      }
    } catch (err) {
      throw wrapSdkError(err, "Anthropic stream read");
    } finally {
      if (opts.onDone) {
        opts.onDone({
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          wall_ms: Date.now() - t0,
        });
      }
    }
  }

  async generateJson<T = unknown>(
    opts: GenerateOptions,
  ): Promise<GenerateJsonResult<T>> {
    const first = await this.generate(opts);
    try {
      return {
        parsed: JSON.parse(stripJsonFence(first.response)) as T,
        raw: first.response,
        metrics: first.metrics,
        attempts: 1,
      };
    } catch {
      // Retry with lower temperature (matches Ollama path)
    }

    const retry = await this.generate({ ...opts, temperature: 0.1 });
    try {
      return {
        parsed: JSON.parse(stripJsonFence(retry.response)) as T,
        raw: retry.response,
        metrics: retry.metrics,
        attempts: 2,
      };
    } catch (err) {
      const wrapped = new LLMError(
        "invalid_response",
        `Anthropic produced malformed JSON after retry: ${(err as Error).message}`,
      );
      (wrapped as unknown as { cause?: unknown }).cause = { raw: retry.response };
      throw wrapped;
    }
  }

  async isAlive(): Promise<boolean> {
    // Cheapest reachability check: a 1-token completion against the cheapest
    // model. Anthropic has no /health endpoint. Failure → false; HTTP errors
    // (incl. 401) also → false because they imply we can't actually use the
    // service.
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * B-4: submit a batch of one-shot requests against the 50%-discount
   * Message Batches API. Each request must carry a stable custom_id —
   * caller (enrichment-batch.ts in Phase C) maps these to item ids.
   *
   * Returns the batch_id for later polling. Polling lives on pollBatch.
   */
  async submitBatch(requests: AnthropicBatchRequest[]): Promise<{ batch_id: string }> {
    if (requests.length === 0) {
      throw new LLMError("invalid_response", "submitBatch: requests array is empty");
    }
    try {
      const batch = await this.client.messages.batches.create({
        requests: requests.map((r) => ({
          custom_id: r.custom_id,
          params: {
            model: r.model ?? this.defaultModel,
            max_tokens: r.num_predict ?? this.defaultMaxTokens,
            temperature: r.temperature ?? 0.3,
            system: r.system,
            messages: [{ role: "user", content: r.prompt }],
          },
        })),
      });
      return { batch_id: batch.id };
    } catch (err) {
      throw wrapSdkError(err, "Anthropic messages.batches.create");
    }
  }

  /**
   * B-4: poll a batch by id. Returns processing_status plus, when ended,
   * the per-request results. Caller decides retry/resubmit policy based
   * on per-result type ("succeeded" | "errored" | "canceled" | "expired").
   */
  async pollBatch(batch_id: string): Promise<AnthropicBatchPoll> {
    let batch: Anthropic.Messages.Batches.MessageBatch;
    try {
      batch = await this.client.messages.batches.retrieve(batch_id);
    } catch (err) {
      throw wrapSdkError(err, "Anthropic messages.batches.retrieve");
    }

    if (batch.processing_status !== "ended") {
      return {
        batch_id,
        status: batch.processing_status,
        request_counts: batch.request_counts,
        results: null,
      };
    }

    const results: AnthropicBatchResultEntry[] = [];
    try {
      for await (const entry of await this.client.messages.batches.results(batch_id)) {
        if (entry.result.type === "succeeded") {
          const msg = entry.result.message;
          results.push({
            custom_id: entry.custom_id,
            type: "succeeded",
            response: extractText(msg),
            metrics: {
              input_tokens: msg.usage.input_tokens,
              output_tokens: msg.usage.output_tokens,
              wall_ms: 0, // batch wall_ms isn't per-request; left at 0
            },
          });
        } else {
          results.push({
            custom_id: entry.custom_id,
            type: entry.result.type,
            error:
              entry.result.type === "errored"
                ? entry.result.error?.error?.message ?? "unknown error"
                : entry.result.type,
          });
        }
      }
    } catch (err) {
      throw wrapSdkError(err, "Anthropic messages.batches.results");
    }

    return {
      batch_id,
      status: "ended",
      request_counts: batch.request_counts,
      results,
    };
  }
}

/** Pull the first text block out of an Anthropic Message. */
function extractText(msg: Anthropic.Message): string {
  for (const block of msg.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/**
 * Strip ```json fences if the model emits a fenced block instead of raw JSON.
 * Cheap defensive parse — Haiku 4.5 with our prompts almost never fences,
 * but Sonnet variants occasionally do when the system prompt is permissive.
 */
function stripJsonFence(s: string): string {
  const trimmed = s.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

export interface AnthropicBatchRequest {
  custom_id: string;
  prompt: string;
  system?: string;
  model?: string;
  num_predict?: number;
  temperature?: number;
}

export type AnthropicBatchResultEntry =
  | {
      custom_id: string;
      type: "succeeded";
      response: string;
      metrics: GenerateMetrics;
    }
  | {
      custom_id: string;
      type: "errored" | "canceled" | "expired";
      error: string;
    };

export interface AnthropicBatchPoll {
  batch_id: string;
  status: "in_progress" | "canceling" | "ended";
  request_counts: Anthropic.Messages.Batches.MessageBatch["request_counts"];
  results: AnthropicBatchResultEntry[] | null;
}
