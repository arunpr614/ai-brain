// src/lib/llm/anthropic.ts — Anthropic provider (v0.6.0 B-3, B-4).
//
// Hits the Anthropic REST API directly via fetch. No SDK dep — symmetric
// with openrouter.ts so both providers go through the same audit lens
// (raw bodies, single chokepoint, owned error wrapping).
//
// API surface used:
//   POST /v1/messages                              — one-shot + SSE stream
//   POST /v1/messages/batches                      — Batch submit
//   GET  /v1/messages/batches/:id                  — Batch poll (status)
//   GET  /v1/messages/batches/:id/results          — JSONL per-request results
//
// Required headers (locked):
//   x-api-key: <key>
//   anthropic-version: 2023-06-01
//   content-type: application/json
//
// JSON mode: Anthropic doesn't have an Ollama-style format:"json" flag.
// generateJson runs the prompt verbatim, parses, and on parse failure
// retries once at temperature 0.1 — same shape as the Ollama path so
// enrich/pipeline.ts catches the same LLMError("invalid_response").

import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_MODEL = process.env.LLM_ENRICH_MODEL ?? "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1200;
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicProviderOptions {
  apiKey?: string;
  /** Default model when GenerateOptions.model is unset. */
  model?: string;
  /** Override base URL for tests / proxies. Trailing slashes stripped. */
  baseURL?: string;
  /** Cap output tokens; mirrors Ollama's num_predict default. */
  defaultMaxTokens?: number;
}

/** Subset of the Anthropic Message shape we read. */
interface AnthropicMessage {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: Array<{ type: string; text?: string }>;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

/** Subset of the SSE event shapes we react to. */
type AnthropicSseEvent =
  | {
      type: "message_start";
      message?: { usage?: { input_tokens?: number; output_tokens?: number } };
    }
  | {
      type: "content_block_delta";
      delta: { type: string; text?: string };
    }
  | {
      type: "message_delta";
      usage?: { output_tokens?: number };
    }
  | { type: string };

export interface AnthropicBatchRequestCounts {
  processing: number;
  succeeded: number;
  errored: number;
  canceled: number;
  expired: number;
}

interface AnthropicBatchEnvelope {
  id: string;
  type: "message_batch";
  processing_status: "in_progress" | "canceling" | "ended";
  request_counts: AnthropicBatchRequestCounts;
  results_url: string | null;
}

/** Per-entry shape returned by the batch results JSONL. */
type AnthropicBatchRawResult =
  | {
      custom_id: string;
      result: {
        type: "succeeded";
        message: AnthropicMessage;
      };
    }
  | {
      custom_id: string;
      result: {
        type: "errored";
        error?: { type?: string; error?: { type?: string; message?: string } };
      };
    }
  | {
      custom_id: string;
      result: { type: "canceled" | "expired" };
    };

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
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
    this.apiKey = apiKey;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultModel = opts.model ?? DEFAULT_MODEL;
    this.defaultMaxTokens = opts.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
  }

  private headers(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    };
  }

  private buildMessageBody(
    opts: GenerateOptions,
    extras: { stream: boolean },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: opts.model ?? this.defaultModel,
      max_tokens: opts.num_predict ?? this.defaultMaxTokens,
      temperature: opts.temperature ?? 0.3,
      messages: [{ role: "user", content: opts.prompt }],
    };
    if (opts.system) body.system = opts.system;
    if (extras.stream) body.stream = true;
    return body;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const body = this.buildMessageBody(opts, { stream: false });
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/v1/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw wrapFetchError(err, this.baseURL, "/v1/messages");
    }
    const wall_ms = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Anthropic returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }

    const data = (await res.json()) as AnthropicMessage;
    return {
      model: (body.model as string) ?? this.defaultModel,
      response: extractText(data),
      metrics: {
        input_tokens: data.usage?.input_tokens ?? 0,
        output_tokens: data.usage?.output_tokens ?? 0,
        wall_ms,
      },
    };
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncGenerator<string, void, void> {
    const body = this.buildMessageBody(opts, { stream: true });
    const t0 = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;

    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/v1/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw wrapFetchError(err, this.baseURL, "/v1/messages (stream)");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Anthropic stream returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }
    if (!res.body) {
      throw new LLMError("invalid_response", "Anthropic stream response has no body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are delimited by blank lines; we parse line by line and
        // pick up `data: ` payloads. `event:` lines are ignored — the JSON
        // body carries `type`.
        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nlIdx).trimEnd();
          buffer = buffer.slice(nlIdx + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          let frame: AnthropicSseEvent;
          try {
            frame = JSON.parse(payload);
          } catch {
            continue;
          }
          if (frame.type === "message_start") {
            const u = (frame as Extract<AnthropicSseEvent, { type: "message_start" }>).message
              ?.usage;
            if (u) {
              if (typeof u.input_tokens === "number") inputTokens = u.input_tokens;
              if (typeof u.output_tokens === "number") outputTokens = u.output_tokens;
            }
          } else if (frame.type === "content_block_delta") {
            const delta = (frame as Extract<AnthropicSseEvent, { type: "content_block_delta" }>)
              .delta;
            if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text) {
              yield delta.text;
            }
          } else if (frame.type === "message_delta") {
            const u = (frame as Extract<AnthropicSseEvent, { type: "message_delta" }>).usage;
            if (u && typeof u.output_tokens === "number") outputTokens = u.output_tokens;
          }
        }
      }
    } finally {
      reader.releaseLock();
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
    // Cheapest reachability check Anthropic exposes is a 1-token completion;
    // they don't have /health. Auth + network failures both → false. The
    // 2-second timeout matches OllamaProvider.isAlive.
    try {
      const res = await fetch(`${this.baseURL}/v1/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal:
          typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
            ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(2000)
            : undefined,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * B-4: submit a batch of one-shot requests against the 50%-discount
   * Message Batches API. Each request must carry a stable custom_id —
   * caller (enrichment-batch.ts in Phase C) maps these to item ids.
   */
  async submitBatch(requests: AnthropicBatchRequest[]): Promise<{ batch_id: string }> {
    if (requests.length === 0) {
      throw new LLMError("invalid_response", "submitBatch: requests array is empty");
    }
    const body = {
      requests: requests.map((r) => ({
        custom_id: r.custom_id,
        params: {
          model: r.model ?? this.defaultModel,
          max_tokens: r.num_predict ?? this.defaultMaxTokens,
          temperature: r.temperature ?? 0.3,
          ...(r.system ? { system: r.system } : {}),
          messages: [{ role: "user", content: r.prompt }],
        },
      })),
    };
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/v1/messages/batches`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw wrapFetchError(err, this.baseURL, "/v1/messages/batches");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Anthropic batch submit ${res.status}: ${text.slice(0, 200)}`,
        res.status,
      );
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      throw new LLMError("invalid_response", "Anthropic batch submit response missing id");
    }
    return { batch_id: data.id };
  }

  /**
   * B-4: poll a batch by id. While processing, returns counts only. When
   * ended, fetches the JSONL results and returns one entry per custom_id
   * with type ∈ {succeeded, errored, canceled, expired}.
   */
  async pollBatch(batch_id: string): Promise<AnthropicBatchPoll> {
    let env: AnthropicBatchEnvelope;
    try {
      const res = await fetch(`${this.baseURL}/v1/messages/batches/${encodeURIComponent(batch_id)}`, {
        method: "GET",
        headers: this.headers(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new LLMError(
          "http",
          `Anthropic batch poll ${res.status}: ${text.slice(0, 200)}`,
          res.status,
        );
      }
      env = (await res.json()) as AnthropicBatchEnvelope;
    } catch (err) {
      if (err instanceof LLMError) throw err;
      throw wrapFetchError(err, this.baseURL, `/v1/messages/batches/${batch_id}`);
    }

    if (env.processing_status !== "ended") {
      return {
        batch_id,
        status: env.processing_status,
        request_counts: env.request_counts,
        results: null,
      };
    }

    // Anthropic returns a results_url for ended batches; if absent, fall
    // back to the canonical /results path.
    const resultsUrl =
      env.results_url ??
      `${this.baseURL}/v1/messages/batches/${encodeURIComponent(batch_id)}/results`;

    let raw: string;
    try {
      const res = await fetch(resultsUrl, {
        method: "GET",
        headers: this.headers(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new LLMError(
          "http",
          `Anthropic batch results ${res.status}: ${text.slice(0, 200)}`,
          res.status,
        );
      }
      raw = await res.text();
    } catch (err) {
      if (err instanceof LLMError) throw err;
      throw wrapFetchError(err, this.baseURL, `/v1/messages/batches/${batch_id}/results`);
    }

    const results: AnthropicBatchResultEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry: AnthropicBatchRawResult;
      try {
        entry = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (entry.result.type === "succeeded") {
        const msg = entry.result.message;
        results.push({
          custom_id: entry.custom_id,
          type: "succeeded",
          response: extractText(msg),
          metrics: {
            input_tokens: msg.usage?.input_tokens ?? 0,
            output_tokens: msg.usage?.output_tokens ?? 0,
            wall_ms: 0, // batch wall_ms isn't per-request
          },
        });
      } else if (entry.result.type === "errored") {
        results.push({
          custom_id: entry.custom_id,
          type: "errored",
          error: entry.result.error?.error?.message ?? "unknown error",
        });
      } else {
        results.push({
          custom_id: entry.custom_id,
          type: entry.result.type,
          error: entry.result.type,
        });
      }
    }

    return {
      batch_id,
      status: "ended",
      request_counts: env.request_counts,
      results,
    };
  }
}

function extractText(msg: AnthropicMessage): string {
  for (const block of msg.content ?? []) {
    if (block.type === "text" && typeof block.text === "string") return block.text;
  }
  return "";
}

function stripJsonFence(s: string): string {
  const trimmed = s.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

function wrapFetchError(err: unknown, base: string, path: string): LLMError {
  const e = err as Error;
  if (e?.name === "AbortError" || e?.name === "TimeoutError") {
    return new LLMError("timeout", `Anthropic ${path}: request timed out`);
  }
  return new LLMError(
    "connection",
    `Cannot reach Anthropic at ${base}${path}: ${e?.message ?? String(err)}`,
  );
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
  request_counts: AnthropicBatchRequestCounts;
  results: AnthropicBatchResultEntry[] | null;
}
