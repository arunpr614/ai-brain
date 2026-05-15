// src/lib/embed/types.ts — Provider-agnostic embedding contract (v0.6.0 B-9).
//
// One operation: embed(inputs[]) → Float32Array[]. Plus an isAlive()
// reachability gate for the search routes that decide between FTS-only
// and semantic/hybrid modes.
//
// Output dimension is locked at 768 to match the chunks_vec float[768]
// column. Providers MUST return 768-dim vectors or throw EmbedError.
// A future provider (e.g. Gemini text-embedding-large at 3072) cannot
// be wired in without a schema migration; the wrapper will reject the
// dim mismatch loudly rather than silently truncating.

import type { EmbedError } from "./client";

export const EMBED_OUTPUT_DIM = 768 as const;

export interface EmbedRequestOptions {
  /** Caller-side cancellation. */
  signal?: AbortSignal;
}

export interface EmbedProvider {
  /**
   * Embed an array of strings. Returns Float32Array per input, in the
   * same order. Throws EmbedError on:
   *   - upstream connection / HTTP failure
   *   - model not installed (Ollama-only)
   *   - response shape mismatch (count, dim)
   *
   * Empty input array returns empty array without making a call.
   */
  embed(inputs: string[], opts?: EmbedRequestOptions): Promise<Float32Array[]>;

  /**
   * Cheap reachability check. Returns true when a follow-up embed() would
   * have a fighting chance (auth + network + model presence). Used by
   * /api/search and /search to flip semantic-mode availability.
   */
  isAlive(): Promise<boolean>;

  /**
   * Identifying info for diagnostics + (future) llm_usage rows. Provider
   * implementations expose at least the model name; dim is always
   * EMBED_OUTPUT_DIM by interface contract.
   */
  getInfo(): { provider: "ollama" | "gemini"; model: string; dim: 768 };
}

/** Re-export for symmetry with src/lib/llm/{types,errors}.ts. */
export type { EmbedError };
