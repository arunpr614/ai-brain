// src/lib/llm/ollama.ts — Ollama provider (v0.6.0 B-2).
//
// Adapts the existing Ollama-direct functions to satisfy the
// LLMProvider interface defined in ./types.ts. Existing call sites
// continue to import the module-level functions (generate,
// generateStream, generateJson, isOllamaAlive) — those now delegate
// to a default-singleton OllamaProvider so behavior is unchanged.
//
// Shape changes from v0.5.x:
//   - GenerateMetrics is the honest 3-field schema
//     {input_tokens, output_tokens, wall_ms}. The Ollama-specific
//     internals (load_duration, prompt_eval_tps, etc.) are still
//     computed for diagnostics but exposed via getOllamaDiagnostics()
//     when needed; they no longer ride on every call.
//   - OllamaError is now an alias for LLMError. Same codes, same
//     constructor signature; existing throw/catch sites compile
//     unchanged.
//
// Enforces (unchanged from v0.3.0+):
//   - think: false on every request (Qwen 3 thinking-mode bug per
//     SELF_CRITIQUE.md L-9; Qwen 2.5 ignores the flag cleanly)
//   - keep_alive defaults tuned for our workloads ("15m")
//   - JSON-mode retry at lower temperature on parse failure

import { LLMError } from "./errors";
import type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
  LLMProvider,
} from "./types";

/** Re-exports so external imports stay stable. */
export { LLMError } from "./errors";
export type {
  GenerateJsonResult,
  GenerateMetrics,
  GenerateOptions,
  GenerateResult,
  GenerateStreamOptions,
} from "./types";

/**
 * Backwards-compatibility alias. Existing consumers (e.g.
 * src/lib/enrich/pipeline.ts) catch `OllamaError`; the codes and
 * constructor signature match LLMError exactly. New code should
 * import LLMError directly.
 */
export { LLMError as OllamaError } from "./errors";

const DEFAULT_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5:7b-instruct-q4_K_M";
const DEFAULT_KEEP_ALIVE = "15m";

interface OllamaProviderOptions {
  host?: string;
  model?: string;
  /** Default keep_alive applied to every generate / stream call. */
  keep_alive?: string | number;
}

function asMs(ns: number | undefined): number {
  if (typeof ns !== "number" || !Number.isFinite(ns)) return 0;
  return Math.round(ns / 1e6);
}

/**
 * Strip Qwen-3-style <think>...</think> blocks. Qwen 3 sometimes emits
 * them even with `think: false` (rare; observed in the wild). Removing
 * them here keeps downstream JSON parsing clean.
 */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Concrete LLMProvider for a local Ollama daemon. Constructed by the
 * factory (B-7) when LLM_*_PROVIDER=ollama, or via the default
 * singleton below.
 */
export class OllamaProvider implements LLMProvider {
  private host: string;
  private defaultModel: string;
  private keepAlive: string | number;

  constructor(opts: OllamaProviderOptions = {}) {
    this.host = opts.host ?? DEFAULT_HOST;
    this.defaultModel = opts.model ?? DEFAULT_MODEL;
    this.keepAlive = opts.keep_alive ?? DEFAULT_KEEP_ALIVE;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const model = opts.model ?? this.defaultModel;
    const signal =
      opts.signal ??
      (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(90_000)
        : undefined);

    const body = {
      model,
      prompt: opts.prompt,
      system: opts.system,
      stream: false,
      think: false,
      options: {
        num_ctx: opts.num_ctx ?? 8192,
        num_predict: opts.num_predict ?? 1200,
        temperature: opts.temperature ?? 0.3,
      },
      keep_alive: this.keepAlive,
    };

    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        throw new LLMError("timeout", `Ollama request timed out`);
      }
      throw new LLMError(
        "connection",
        `Cannot reach Ollama at ${this.host}: ${e.message}. Is the daemon running?`,
      );
    }
    const wall_ms = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Ollama returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }

    const data = (await res.json()) as {
      response?: string;
      total_duration?: number;
      load_duration?: number;
      prompt_eval_count?: number;
      prompt_eval_duration?: number;
      eval_count?: number;
      eval_duration?: number;
    };

    if (typeof data.response !== "string") {
      throw new LLMError("invalid_response", "Ollama response missing `response` field");
    }

    const metrics: GenerateMetrics = {
      input_tokens: data.prompt_eval_count ?? 0,
      output_tokens: data.eval_count ?? 0,
      wall_ms,
    };

    // Diagnostics not on the public LLMProvider surface — kept as a
    // best-effort side channel for the bench script via
    // getLastOllamaDiagnostics() if we choose to expose it later.
    lastDiagnostics = {
      total_duration_ms: asMs(data.total_duration),
      load_duration_ms: asMs(data.load_duration),
      prompt_eval_duration_ms: asMs(data.prompt_eval_duration),
      eval_duration_ms: asMs(data.eval_duration),
    };

    return {
      model,
      response: stripThinking(data.response),
      metrics,
    };
  }

  async *generateStream(opts: GenerateStreamOptions): AsyncGenerator<string, void, void> {
    const model = opts.model ?? this.defaultModel;
    const body = {
      model,
      prompt: opts.prompt,
      system: opts.system,
      stream: true,
      think: false,
      options: {
        num_ctx: opts.num_ctx ?? 8192,
        num_predict: opts.num_predict ?? 1200,
        temperature: opts.temperature ?? 0.3,
      },
      keep_alive: this.keepAlive,
    };

    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        throw new LLMError("timeout", "Ollama stream request timed out");
      }
      throw new LLMError(
        "connection",
        `Cannot reach Ollama at ${this.host}: ${e.message}. Is the daemon running?`,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Ollama returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }
    if (!res.body) {
      throw new LLMError("invalid_response", "Ollama streaming response has no body");
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
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;
          let frame: {
            response?: string;
            done?: boolean;
            prompt_eval_count?: number;
            eval_count?: number;
          };
          try {
            frame = JSON.parse(line);
          } catch {
            continue;
          }
          if (typeof frame.response === "string" && frame.response.length > 0) {
            yield frame.response;
          }
          if (frame.done) {
            inputTokens = frame.prompt_eval_count ?? 0;
            outputTokens = frame.eval_count ?? 0;
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
    const firstAttempt = await this.generateRaw({ ...opts, format: "json" });
    try {
      return {
        parsed: JSON.parse(firstAttempt.response) as T,
        raw: firstAttempt.response,
        metrics: firstAttempt.metrics,
        attempts: 1,
      };
    } catch {
      // Retry at lower temperature.
    }

    const retry = await this.generateRaw({
      ...opts,
      format: "json",
      temperature: 0.1,
    });
    try {
      return {
        parsed: JSON.parse(retry.response) as T,
        raw: retry.response,
        metrics: retry.metrics,
        attempts: 2,
      };
    } catch (err) {
      const e = err as Error;
      const wrapped = new LLMError(
        "invalid_response",
        `Model produced malformed JSON after retry: ${e.message}`,
      );
      (wrapped as unknown as { cause?: unknown }).cause = { raw: retry.response };
      throw wrapped;
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/tags`, {
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
   * Internal generate that accepts the `format` flag — used only by
   * generateJson to ask Ollama for a structured response. Not on the
   * public LLMProvider surface.
   */
  private async generateRaw(
    opts: GenerateOptions & { format?: "json" | "text" },
  ): Promise<GenerateResult> {
    const model = opts.model ?? this.defaultModel;
    const signal =
      opts.signal ??
      (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(90_000)
        : undefined);

    const body = {
      model,
      prompt: opts.prompt,
      system: opts.system,
      stream: false,
      format: opts.format === "json" ? "json" : undefined,
      think: false,
      options: {
        num_ctx: opts.num_ctx ?? 8192,
        num_predict: opts.num_predict ?? 1200,
        temperature: opts.temperature ?? 0.3,
      },
      keep_alive: this.keepAlive,
    };

    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        throw new LLMError("timeout", `Ollama request timed out`);
      }
      throw new LLMError(
        "connection",
        `Cannot reach Ollama at ${this.host}: ${e.message}. Is the daemon running?`,
      );
    }
    const wall_ms = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        "http",
        `Ollama returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        res.status,
      );
    }

    const data = (await res.json()) as {
      response?: string;
      total_duration?: number;
      load_duration?: number;
      prompt_eval_count?: number;
      prompt_eval_duration?: number;
      eval_count?: number;
      eval_duration?: number;
    };

    if (typeof data.response !== "string") {
      throw new LLMError("invalid_response", "Ollama response missing `response` field");
    }

    return {
      model,
      response: stripThinking(data.response),
      metrics: {
        input_tokens: data.prompt_eval_count ?? 0,
        output_tokens: data.eval_count ?? 0,
        wall_ms,
      },
    };
  }
}

interface OllamaDiagnostics {
  total_duration_ms: number;
  load_duration_ms: number;
  prompt_eval_duration_ms: number;
  eval_duration_ms: number;
}
let lastDiagnostics: OllamaDiagnostics | null = null;

/** Last call's Ollama-specific timings. Used by bench scripts only. */
export function getLastOllamaDiagnostics(): OllamaDiagnostics | null {
  return lastDiagnostics;
}

/**
 * Default singleton — the back-compat shim every existing call site
 * uses. The factory (B-7) will replace these with provider-aware
 * resolution, but until then `generate()` etc. keep their pre-B-2
 * call shape.
 */
const defaultProvider = new OllamaProvider();

export function generate(opts: GenerateOptions): Promise<GenerateResult> {
  return defaultProvider.generate(opts);
}

export function generateStream(
  opts: GenerateStreamOptions,
): AsyncGenerator<string, void, void> {
  return defaultProvider.generateStream(opts);
}

export function generateJson<T = unknown>(
  opts: GenerateOptions,
): Promise<GenerateJsonResult<T>> {
  return defaultProvider.generateJson<T>(opts);
}

export function isOllamaAlive(): Promise<boolean> {
  return defaultProvider.isAlive();
}
