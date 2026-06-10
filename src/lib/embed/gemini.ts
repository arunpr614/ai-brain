// src/lib/embed/gemini.ts — Gemini gemini-embedding-001 @ 768 (v0.6.0 B-10 + S-13).
//
// gemini-embedding-001 is Matryoshka-trained: outputDimensionality=768
// produces a usable truncation of its native 3072-dim output, matching the
// chunks_vec schema with no migration required. Wire-verified from Hetzner
// 2026-05-19: cosine(cat,feline)=0.75 vs cosine(cat,quantum)=0.48.
//
// Replaces text-embedding-004 (locked in v0.6.0 plan §1 #6 on 2026-05-12,
// retired by Google before 2026-05-19). Spike S-13 selected this as the
// smallest-delta replacement.
//
// Endpoint: POST /v1beta/models/gemini-embedding-001:batchEmbedContents?key=<API_KEY>
// Request body: {requests: [{model, content: {parts: [{text}]}, outputDimensionality}]}
// Response:     {embeddings: [{values: number[]}]}
//
// Rate limits (free tier): 1500 requests/min as of 2026-05. We send one
// batched request per call (up to ~100 inputs); pipeline already chunks
// to BATCH_SIZE=16 so this is well within bounds.

import { EmbedError } from "./client";
import { EMBED_OUTPUT_DIM, type EmbedProvider, type EmbedRequestOptions } from "./types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-embedding-001";

interface GeminiProviderOptions {
  apiKey?: string;
  /** Default model when constructor model unset. */
  model?: string;
  /** Override base URL for tests. */
  baseURL?: string;
}

interface GeminiErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

export class GeminiEmbedProvider implements EmbedProvider {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(opts: GeminiProviderOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new EmbedError(
        "EMBED_CONNECTION",
        "Gemini embed provider requires GEMINI_API_KEY (env or constructor)",
      );
    }
    this.apiKey = apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  getInfo(): { provider: "gemini"; model: string; dim: 768 } {
    return { provider: "gemini", model: this.model, dim: EMBED_OUTPUT_DIM };
  }

  async embed(inputs: string[], opts: EmbedRequestOptions = {}): Promise<Float32Array[]> {
    if (inputs.length === 0) return [];

    // Serial embedContent loop instead of batchEmbedContents. Free-tier
    // gemini-embedding-001 throttles batchEmbedContents aggressively (~1
    // batch/min observed during D-12 cutover); embedContent has a higher
    // but still real RPM cap. 1.1s inter-call delay = ~55 RPM ceiling,
    // well under the documented free-tier "100 RPM" for embedContent and
    // generous enough that backoff retries don't compound the burst.
    // Single-user volume impact: 44 chunks × 1.1s = 48s per large item,
    // acceptable for a once-per-month migration cost. Realtime capture
    // path embeds 1-4 chunks → 0-3s overhead, negligible.
    // Diagnosed empirically 2026-05-19 during D-12 cutover.
    const out: Float32Array[] = [];
    for (let i = 0; i < inputs.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1100));
      out.push(await this.embedOne(inputs[i], opts));
    }
    return out;
  }

  private async embedOne(text: string, opts: EmbedRequestOptions): Promise<Float32Array> {
    const url = `${this.baseURL}/v1beta/models/${encodeURIComponent(
      this.model,
    )}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      content: { parts: [{ text }] },
      outputDimensionality: EMBED_OUTPUT_DIM,
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        throw new EmbedError("EMBED_CONNECTION", "Gemini embed request timed out");
      }
      throw new EmbedError(
        "EMBED_CONNECTION",
        `Cannot reach Gemini at ${this.baseURL}: ${e.message}`,
      );
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const parsed = (await res.json()) as GeminiErrorBody;
        if (parsed.error?.message) errMsg = parsed.error.message;
      } catch {
        // body may not be JSON; fall back to status-only
      }
      throw new EmbedError(
        "EMBED_HTTP",
        `Gemini embedContent ${res.status}: ${errMsg.slice(0, 200)}`,
        { status: res.status },
      );
    }

    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBED_OUTPUT_DIM) {
      throw new EmbedError(
        "EMBED_INVALID_RESPONSE",
        `Embedding has dim ${values?.length ?? "?"}, expected ${EMBED_OUTPUT_DIM}`,
      );
    }
    return new Float32Array(values);
  }

  async isAlive(): Promise<boolean> {
    // Cheapest reachability: GET the model metadata. 200 → up; auth or
    // network failure → false. Costs zero quota.
    try {
      const url = `${this.baseURL}/v1beta/models/${encodeURIComponent(
        this.model,
      )}?key=${encodeURIComponent(this.apiKey)}`;
      const res = await fetch(url, {
        method: "GET",
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
}
