// src/lib/embed/gemini.ts — Gemini text-embedding-004 (v0.6.0 B-10).
//
// Free-tier provider for v0.6.0 cloud migration. text-embedding-004 is
// 768-dim by default, matching chunks_vec.
//
// Endpoint: POST /v1beta/models/text-embedding-004:batchEmbedContents?key=<API_KEY>
// Request body: {requests: [{model, content: {parts: [{text}]}, outputDimensionality}]}
// Response:     {embeddings: [{values: number[]}]}
//
// Rate limits (free tier): 1500 requests/min as of 2026-05. We send one
// batched request per call (up to ~100 inputs); pipeline already chunks
// to BATCH_SIZE=16 so this is well within bounds.

import { EmbedError } from "./client";
import { EMBED_OUTPUT_DIM, type EmbedProvider, type EmbedRequestOptions } from "./types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "text-embedding-004";

interface GeminiProviderOptions {
  apiKey?: string;
  /** Default model when constructor model unset. */
  model?: string;
  /** Override base URL for tests. */
  baseURL?: string;
}

interface GeminiBatchResponse {
  embeddings?: Array<{ values?: number[] }>;
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

    const url = `${this.baseURL}/v1beta/models/${encodeURIComponent(
      this.model,
    )}:batchEmbedContents?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      requests: inputs.map((text) => ({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBED_OUTPUT_DIM,
      })),
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
        `Gemini batchEmbedContents ${res.status}: ${errMsg.slice(0, 200)}`,
        { status: res.status },
      );
    }

    const data = (await res.json()) as GeminiBatchResponse;
    const rows = data.embeddings;
    if (!Array.isArray(rows)) {
      throw new EmbedError(
        "EMBED_INVALID_RESPONSE",
        "Gemini response missing `embeddings` array",
      );
    }
    if (rows.length !== inputs.length) {
      throw new EmbedError(
        "EMBED_INVALID_RESPONSE",
        `Expected ${inputs.length} embeddings, got ${rows.length}`,
      );
    }
    return rows.map((row, i) => {
      const values = row?.values;
      if (!Array.isArray(values) || values.length !== EMBED_OUTPUT_DIM) {
        throw new EmbedError(
          "EMBED_INVALID_RESPONSE",
          `Embedding ${i} has dim ${values?.length ?? "?"}, expected ${EMBED_OUTPUT_DIM}`,
        );
      }
      return new Float32Array(values);
    });
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
