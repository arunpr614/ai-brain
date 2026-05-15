// src/lib/llm/openrouter.ts — OpenRouter provider (v0.6.0 B-5, B-6).
//
// OpenRouter exposes an OpenAI-compatible /v1/chat/completions endpoint
// with optional `provider` routing block. We hit it via fetch — no SDK
// — so the privacy-pin block is enforced verbatim per the matrix in
// docs/research/openrouter-provider-evaluation.md.
//
// **Privacy invariant (locked):** every outbound request body MUST carry
//
//   provider: {
//     order: ["Anthropic"],
//     allow_fallbacks: false,
//     data_collection: "deny",
//   }
//
// without it OR can route to upstreams that log inputs. The provider's
// constructor takes an `upstreamOrder` list so a future caller can
// target a non-Anthropic upstream, but `data_collection: "deny"` and
// `allow_fallbacks: false` are non-overridable. A test in
// openrouter.test.ts asserts these are present on every request.
//
// B-6: OpenRouter has no batch API. submitBatch / pollBatch are
// deliberately omitted; the LLMProvider interface marks them optional,
// and Phase C's enrichment-batch.ts checks `typeof provider.submitBatch
// === "function"` before scheduling a batch path.

import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL =
  process.env.LLM_ASK_MODEL ?? "anthropic/claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1200;

interface OpenRouterProviderOptions {
  apiKey?: string;
  /** Default model when GenerateOptions.model is unset. */
  model?: string;
  /** Override for tests / proxies. */
  baseURL?: string;
  /** Cap output tokens; mirrors Ollama num_predict. */
  defaultMaxTokens?: number;
  /**
   * Upstream provider routing (which provider OR pulls from). Defaults to
   * Anthropic since v0.6.0 ships Anthropic-direct as primary; OR is the
   * standby. `data_collection: "deny"` + `allow_fallbacks: false` are
   * always applied regardless of this value.
   */
  upstreamOrder?: string[];
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private upstreamOrder: string[];

  constructor(opts: OpenRouterProviderOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        "connection",
        "OpenRouter provider requires OPENROUTER_API_KEY (env or constructor)",
      );
    }
    this.apiKey = apiKey;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultModel = opts.model ?? DEFAULT_MODEL;
    this.defaultMaxTokens = opts.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
    this.upstreamOrder = opts.upstreamOrder ?? ["Anthropic"];
  }

  /**
   * Build the request body. Centralised so the privacy block is
   * impossible to forget — every code path goes through this.
   */
  private buildBody(
    opts: GenerateOptions,
    extras: { stream: boolean; max_tokens?: number },
  ): Record<string, unknown> {
    const messages: OpenRouterMessage[] = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: opts.prompt });

    return {
      model: opts.model ?? this.defaultModel,
      messages,
      stream: extras.stream,
      max_tokens: extras.max_tokens ?? opts.num_predict ?? this.defaultMaxTokens,
      temperature: opts.temperature ?? 0.3,
      provider: {
        order: this.upstreamOrder,
        allow_fallbacks: false,
        data_collection: "deny",
      },
    };
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
      // Recommended by OR docs for routing analytics; not load-bearing
      // for behavior. Hardcoded so it shows up in OR's dashboards under
      // a stable name.
      "http-referer": "https://brain.arunp.in",
      "x-title": "AI Brain",
    };
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const body = this.buildBody(opts, { stream: false });
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw wrapFetchError(err, this.baseURL);
    }
    const wall_ms = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `OpenRouter returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new LLMError("invalid_response", "OpenRouter response missing choices[0].message.content");
    }

    return {
      model: (body.model as string) ?? this.defaultModel,
      response: text,
      metrics: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
        wall_ms,
      },
    };
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncGenerator<string, void, void> {
    const body = this.buildBody(opts, { stream: true });
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      throw wrapFetchError(err, this.baseURL);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `OpenRouter returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }
    if (!res.body) {
      throw new LLMError("invalid_response", "OpenRouter streaming response has no body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines; lines start with `data: `.
        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nlIdx).trimEnd();
          buffer = buffer.slice(nlIdx + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          let frame: {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          try {
            frame = JSON.parse(payload);
          } catch {
            // OR sometimes injects keep-alive comments — skip silently.
            continue;
          }
          const delta = frame.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) yield delta;
          if (frame.usage) {
            inputTokens = frame.usage.prompt_tokens ?? inputTokens;
            outputTokens = frame.usage.completion_tokens ?? outputTokens;
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
      // Retry at lower temperature.
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
        `OpenRouter produced malformed JSON after retry: ${(err as Error).message}`,
      );
      (wrapped as unknown as { cause?: unknown }).cause = { raw: retry.response };
      throw wrapped;
    }
  }

  async isAlive(): Promise<boolean> {
    // Cheapest reachability check: GET /models. 200 → up; any error → false.
    try {
      const res = await fetch(`${this.baseURL}/models`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
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

  // B-6: deliberately omit submitBatch / pollBatch. OpenRouter has no
  // batch API; the LLMProvider interface marks them optional, and
  // callers (Phase C) gate on `typeof provider.submitBatch === "function"`.
}

function wrapFetchError(err: unknown, base: string): LLMError {
  const e = err as Error;
  if (e?.name === "AbortError" || e?.name === "TimeoutError") {
    return new LLMError("timeout", "OpenRouter request timed out");
  }
  return new LLMError(
    "connection",
    `Cannot reach OpenRouter at ${base}: ${e?.message ?? String(err)}`,
  );
}

function stripJsonFence(s: string): string {
  const trimmed = s.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

export type { GenerateMetrics };
