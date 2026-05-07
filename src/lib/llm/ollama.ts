/**
 * Typed Ollama client wrapper — F-201 (v0.3.0).
 *
 * Sole entry point for every LLM call in AI Brain. Enforces:
 *   - think: false on every request (Qwen 3 thinking mode bug per
 *     SELF_CRITIQUE.md L-9; Qwen 2.5 ignores the flag cleanly, so setting
 *     it unconditionally is safe)
 *   - keep_alive defaults tuned for our workloads
 *   - Structured error handling with one retry at lower temperature
 *     (per R-LLM-b recommendation)
 *
 * No streaming here — v0.3.0 enrichment is batch. v0.4.0 chat will
 * add a separate streaming path.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5:7b-instruct-q4_K_M";

export interface GenerateOptions {
  model?: string;
  system?: string;
  prompt: string;
  /** Parse response as JSON. When true, the return type is unknown-shaped JSON. */
  format?: "json" | "text";
  num_ctx?: number;
  num_predict?: number;
  temperature?: number;
  /** e.g. "15m", "10m", 0 (unload immediately) */
  keep_alive?: string | number;
  /** Abort controller signal. Times out if not set; default 90s. */
  signal?: AbortSignal;
}

export interface GenerateMetrics {
  total_duration_ms: number;
  load_duration_ms: number;
  prompt_eval_count: number;
  prompt_eval_duration_ms: number;
  prompt_eval_tps: number;
  eval_count: number;
  eval_duration_ms: number;
  eval_tps: number;
  wall_ms: number;
}

export interface GenerateResult {
  model: string;
  response: string;
  metrics: GenerateMetrics;
}

export class OllamaError extends Error {
  code: "http" | "timeout" | "connection" | "invalid_response";
  status?: number;
  constructor(code: OllamaError["code"], message: string, status?: number) {
    super(message);
    this.code = code;
    this.name = "OllamaError";
    this.status = status;
  }
}

function asMs(ns: number | undefined): number {
  if (typeof ns !== "number" || !Number.isFinite(ns)) return 0;
  return Math.round(ns / 1e6);
}

function tps(tokens: number | undefined, duration_ns: number | undefined): number {
  if (!tokens || !duration_ns || duration_ns === 0) return 0;
  return Math.round((tokens / duration_ns) * 1e9);
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
 * Run one generate call. Throws OllamaError on HTTP / connection failures.
 * Does NOT retry — callers compose their own retry policy (see `generateJson`).
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const model = opts.model ?? DEFAULT_MODEL;
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
    // Unconditional: SELF_CRITIQUE L-9. Qwen 3 burns num_predict on
    // <think> traces otherwise. Qwen 2.5 ignores.
    think: false,
    options: {
      num_ctx: opts.num_ctx ?? 8192,
      num_predict: opts.num_predict ?? 1200,
      temperature: opts.temperature ?? 0.3,
    },
    keep_alive: opts.keep_alive ?? "15m",
  };

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError" || e.name === "TimeoutError") {
      throw new OllamaError("timeout", `Ollama request timed out`);
    }
    throw new OllamaError(
      "connection",
      `Cannot reach Ollama at ${OLLAMA_HOST}: ${e.message}. Is the daemon running?`,
    );
  }
  const wall_ms = Date.now() - t0;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OllamaError(
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
    throw new OllamaError("invalid_response", "Ollama response missing `response` field");
  }

  return {
    model,
    response: stripThinking(data.response),
    metrics: {
      total_duration_ms: asMs(data.total_duration),
      load_duration_ms: asMs(data.load_duration),
      prompt_eval_count: data.prompt_eval_count ?? 0,
      prompt_eval_duration_ms: asMs(data.prompt_eval_duration),
      prompt_eval_tps: tps(data.prompt_eval_count, data.prompt_eval_duration),
      eval_count: data.eval_count ?? 0,
      eval_duration_ms: asMs(data.eval_duration),
      eval_tps: tps(data.eval_count, data.eval_duration),
      wall_ms,
    },
  };
}

/**
 * Convenience: generate + parse JSON with one retry at lower temperature.
 *
 * Per R-LLM-b §7: "If JSON.parse fails once, retry once with the same payload
 * + temperature: 0.1. If second attempt fails, store raw response and mark
 * enrichment_state = 'error'."
 *
 * On second failure, throws OllamaError("invalid_response", ...) with the raw
 * text attached as `cause` for caller inspection.
 */
export async function generateJson<T = unknown>(
  opts: Omit<GenerateOptions, "format">,
): Promise<{ parsed: T; raw: string; metrics: GenerateMetrics; attempts: number }> {
  const firstAttempt = await generate({ ...opts, format: "json" });
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

  const retry = await generate({
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
    const wrapped = new OllamaError(
      "invalid_response",
      `Model produced malformed JSON after retry: ${e.message}`,
    );
    // attach raw for diagnostics
    (wrapped as unknown as { cause?: unknown }).cause = { raw: retry.response };
    throw wrapped;
  }
}

/**
 * Quickly check whether the daemon is reachable. Used by the enrichment
 * worker to decide whether to retry jobs or stall.
 */
export async function isOllamaAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
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
