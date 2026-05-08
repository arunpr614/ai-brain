/**
 * Ollama embedding client — v0.4.0 F-013.
 *
 * Wraps POST /api/embed for batched text-to-vector conversion. Single model:
 * nomic-embed-text (768-dim float32), locked per v0.4.0 plan §12.
 *
 * Errors:
 *   EMBED_MODEL_NOT_INSTALLED — first call with unavailable model (plan P-1).
 *     Carries the exact `ollama pull` command in the message.
 *   EMBED_CONNECTION          — daemon unreachable.
 *   EMBED_HTTP                — non-2xx / non-404 response.
 *   EMBED_INVALID_RESPONSE    — JSON shape mismatch.
 *
 * Retries: caller's responsibility (pipeline implements 3× backoff in T-5).
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
export const EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
export const EMBED_DIM = 768;

export type EmbedErrorCode =
  | "EMBED_MODEL_NOT_INSTALLED"
  | "EMBED_CONNECTION"
  | "EMBED_HTTP"
  | "EMBED_INVALID_RESPONSE";

export class EmbedError extends Error {
  code: EmbedErrorCode;
  status?: number;
  pullCommand?: string;
  constructor(code: EmbedErrorCode, message: string, extras?: { status?: number; pullCommand?: string }) {
    super(message);
    this.name = "EmbedError";
    this.code = code;
    this.status = extras?.status;
    this.pullCommand = extras?.pullCommand;
  }
}

export interface EmbedOptions {
  model?: string;
  /** AbortSignal for caller-side timeout. */
  signal?: AbortSignal;
  /** Host override for tests. */
  host?: string;
}

/**
 * Embed an array of strings. Returns Float32Array per input, in order.
 *
 * Ollama /api/embed accepts `input: string | string[]` and returns
 * `embeddings: number[][]`. Batch size is the caller's decision — the
 * pipeline (T-5) chunks to 16 per call.
 */
export async function embed(
  inputs: string[],
  opts: EmbedOptions = {},
): Promise<Float32Array[]> {
  if (inputs.length === 0) return [];
  const host = opts.host ?? OLLAMA_HOST;
  const model = opts.model ?? EMBED_MODEL;

  let res: Response;
  try {
    res = await fetch(`${host}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input: inputs }),
      signal: opts.signal,
    });
  } catch (err) {
    const e = err as Error;
    throw new EmbedError(
      "EMBED_CONNECTION",
      `Cannot reach Ollama at ${host}: ${e.message}. Is the daemon running? Try: ollama serve`,
    );
  }

  if (res.status === 404 || res.status === 400) {
    // Ollama returns 404 for unknown models via /api/embed; some versions use
    // 400 with `error: "model ... not found"`. Inspect the body.
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const errMsg =
      (body as { error?: string } | undefined)?.error ?? `HTTP ${res.status}`;
    if (/not found|pull/i.test(errMsg)) {
      const pullCommand = `ollama pull ${model}`;
      throw new EmbedError(
        "EMBED_MODEL_NOT_INSTALLED",
        `Embedding model "${model}" is not installed. Run: ${pullCommand}`,
        { status: res.status, pullCommand },
      );
    }
    throw new EmbedError("EMBED_HTTP", `Ollama /api/embed ${res.status}: ${errMsg}`, {
      status: res.status,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EmbedError(
      "EMBED_HTTP",
      `Ollama /api/embed ${res.status}: ${text.slice(0, 200)}`,
      { status: res.status },
    );
  }

  const json = (await res.json()) as { embeddings?: number[][] };
  if (!json.embeddings || !Array.isArray(json.embeddings)) {
    throw new EmbedError(
      "EMBED_INVALID_RESPONSE",
      "Ollama /api/embed returned no `embeddings` array",
    );
  }
  if (json.embeddings.length !== inputs.length) {
    throw new EmbedError(
      "EMBED_INVALID_RESPONSE",
      `Expected ${inputs.length} embeddings, got ${json.embeddings.length}`,
    );
  }
  return json.embeddings.map((row, i) => {
    if (!Array.isArray(row) || row.length !== EMBED_DIM) {
      throw new EmbedError(
        "EMBED_INVALID_RESPONSE",
        `Embedding ${i} has dim ${row?.length ?? "?"}, expected ${EMBED_DIM}`,
      );
    }
    return new Float32Array(row);
  });
}
