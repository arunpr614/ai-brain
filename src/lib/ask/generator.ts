/**
 * Real Ollama-backed generator — v0.4.0 T-9.
 *
 * Wraps `ollama.generateStream()` with:
 *   - a system prompt that forces citation-grounded answers
 *   - incremental [CITE:chunk_id] parsing as tokens arrive
 *   - orphan-citation drop + log (plan patch P-4)
 *   - llm_usage write on completion
 *
 * Plugs into orchestrateAsk() as the `generator` argument. Emits text
 * deltas the same way echoGenerator does, but with [CITE:...] markers
 * filtered in-stream so the UI doesn't see orphan references.
 */
import { getDb } from "@/db/client";
import { generateStream } from "@/lib/llm/ollama";
import { logError } from "@/lib/errors/sink";
import type { RetrievedChunk } from "@/lib/retrieve";

const SYSTEM_PROMPT = `You are AI Brain, a personal knowledge assistant. Answer ONLY from the provided library chunks below. If nothing in the chunks answers the question, say exactly: "I don't have anything on this in your library."

Cite every non-trivial claim with [CITE:chunk_id]. Never output a chunk_id that isn't in the list below. Keep answers concise (3–6 sentences unless the user asks for detail).`;

function buildPrompt(question: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `=== Library chunks ===\n(none)\n\n=== User question ===\n${question}`;
  }
  const parts = chunks.map(
    (c) => `[id=${c.chunk_id}] from "${c.item_title}"\n${c.body}`,
  );
  return `=== Library chunks ===\n${parts.join("\n---\n")}\n\n=== User question ===\n${question}`;
}

export interface OllamaGeneratorOptions {
  thread_id?: string;
  model?: string;
  /** Test hook: override the underlying stream. */
  streamFn?: typeof generateStream;
  /** Test hook: skip DB write. */
  skipUsageRecord?: boolean;
}

/**
 * Returns an async iterable of text deltas for a question. [CITE:bad_id]
 * markers (not in `validChunkIds`) are stripped; each drop logs via the
 * shared error sink.
 */
export function ollamaGenerator(opts: OllamaGeneratorOptions = {}) {
  return async function* (input: {
    question: string;
    chunks: RetrievedChunk[];
    signal?: AbortSignal;
  }): AsyncIterable<string> {
    const validIds = new Set(input.chunks.map((c) => c.chunk_id));
    const prompt = buildPrompt(input.question, input.chunks);
    const model = opts.model ?? process.env.OLLAMA_DEFAULT_MODEL;

    const streamImpl = opts.streamFn ?? generateStream;

    // Incremental parser state. Buffer only the portion that might be an
    // in-progress [CITE:... — everything else flushes immediately.
    let carry = "";
    type Usage = { input_tokens: number; output_tokens: number; wall_ms: number };
    // `usage` is written from within the `onDone` callback below, but TS's
    // closure analysis narrows the outer binding to `null` and doesn't see
    // the async write. Use a mutable container to preserve the type.
    const usageHolder: { value: Usage | null } = { value: null };

    const tokens = streamImpl({
      system: SYSTEM_PROMPT,
      prompt,
      model,
      signal: input.signal,
      onDone: (m) => {
        usageHolder.value = m;
      },
    });

    for await (const delta of tokens) {
      if (input.signal?.aborted) break;
      carry += delta;
      const [safe, rest] = splitAtPossibleCitation(carry);
      carry = rest;
      if (safe) {
        for (const piece of filterCitations(safe, validIds, opts.thread_id)) {
          yield piece;
        }
      }
    }

    // Flush remaining buffer.
    if (carry) {
      for (const piece of filterCitations(carry, validIds, opts.thread_id)) {
        yield piece;
      }
    }

    const finalUsage = usageHolder.value;
    if (finalUsage && !opts.skipUsageRecord) {
      recordAskUsage({
        model: model ?? "unknown",
        input_tokens: finalUsage.input_tokens,
        output_tokens: finalUsage.output_tokens,
      });
    }
  };
}

/**
 * Split buffer into (safe-to-emit, possible-partial-marker). If a `[` appears
 * and the tail could still grow into `[CITE:...]`, withhold from the `[`
 * onward. Otherwise flush the whole buffer.
 */
export function splitAtPossibleCitation(buffer: string): [string, string] {
  const lastOpen = buffer.lastIndexOf("[");
  if (lastOpen === -1) return [buffer, ""];
  const tail = buffer.slice(lastOpen);
  // If we can confirm the tail is NOT a partial marker, flush everything.
  // A partial marker is: starts with `[`, then a prefix of `CITE:...]`.
  if (!/^\[(C(I(T(E(:[^\]]*)?)?)?)?)?$/.test(tail)) {
    return [buffer, ""];
  }
  // If the tail already contains a `]`, the marker (real or bogus) is complete.
  if (tail.includes("]")) return [buffer, ""];
  return [buffer.slice(0, lastOpen), tail];
}

/**
 * Replace complete [CITE:id] markers in `text` by yielding text before the
 * marker, then the marker itself if the id is valid, else dropping + logging.
 * Assumes `text` contains no partial markers (caller's responsibility).
 */
export function* filterCitations(
  text: string,
  validIds: Set<string>,
  thread_id: string | undefined,
): Generator<string, void, void> {
  const re = /\[CITE:([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) yield text.slice(last, m.index);
    const id = m[1];
    if (validIds.has(id)) {
      yield m[0];
    } else {
      logError({
        type: "orphan_citation",
        ts: Date.now(),
        chunk_id: id,
        thread_id: thread_id ?? null,
      });
      // Drop silently from the stream.
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) yield text.slice(last);
}

function recordAskUsage(args: {
  model: string;
  input_tokens: number;
  output_tokens: number;
}): void {
  try {
    const bm = new Date().toISOString().slice(0, 7); // YYYY-MM
    getDb()
      .prepare(
        `INSERT INTO llm_usage (provider, model, purpose, input_tokens, output_tokens, cost_usd, billing_month)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("ollama", args.model, "ask", args.input_tokens, args.output_tokens, 0, bm);
  } catch (err) {
    console.warn("[ask] llm_usage write failed:", (err as Error).message);
  }
}
