// src/lib/llm/types.ts — Provider-agnostic LLM contract (v0.6.0 B-1).
//
// Existing call sites use three operations:
//   - generateJson — src/lib/enrich/pipeline.ts (one-shot JSON with retry)
//   - generateStream — src/lib/ask/generator.ts (SSE token stream)
//   - isAlive — src/lib/queue/enrichment-worker.ts (cheap reachability gate)
// Plus optional batch (Anthropic-only, deferred to B-4).
//
// B-2 adapts src/lib/llm/ollama.ts to satisfy this interface with zero
// call-site changes. B-3..B-6 add Anthropic + OpenRouter providers.
// Errors live in src/lib/llm/errors.ts (LLMError).

export interface GenerateOptions {
  model?: string;
  system?: string;
  prompt: string;
  num_ctx?: number;
  num_predict?: number;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Honest metrics schema — only fields every provider can populate truthfully.
 * Ollama-specific internals (load_duration, prompt_eval_tps, etc.) stay on
 * the concrete OllamaProvider's extended return shape, not here.
 */
export interface GenerateMetrics {
  input_tokens: number;
  output_tokens: number;
  wall_ms: number;
}

export interface GenerateResult {
  model: string;
  response: string;
  metrics: GenerateMetrics;
}

export interface GenerateStreamOptions extends GenerateOptions {
  /**
   * Called once with totals when the stream completes. Necessary because
   * AsyncIterable<string> has no return-channel for metrics. May migrate
   * to a return-tuple shape in a later cleanup.
   */
  onDone?: (m: GenerateMetrics) => void;
}

export interface GenerateJsonResult<T> {
  parsed: T;
  raw: string;
  metrics: GenerateMetrics;
  attempts: number;
}

export interface LLMProvider {
  generate(opts: GenerateOptions): Promise<GenerateResult>;
  generateStream(opts: GenerateStreamOptions): AsyncIterable<string>;
  generateJson<T = unknown>(opts: GenerateOptions): Promise<GenerateJsonResult<T>>;
  isAlive(): Promise<boolean>;

  // Optional batch — Anthropic-only at v0.6.0; shapes defined in B-4 when
  // the concrete call site exists. Marked unknown deliberately to avoid
  // baking in speculative request/response shapes.
  submitBatch?(requests: unknown[]): Promise<{ batch_id: string }>;
  pollBatch?(batch_id: string): Promise<unknown>;
}
