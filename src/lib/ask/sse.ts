/**
 * Server-Sent Events framing for /api/ask — v0.4.0 T-8.
 *
 * Shape: each frame is `data: <json>\n\n`. We use a named event field only
 * when the client needs to branch; for simplicity this skeleton uses a
 * discriminated JSON payload instead (type: "retrieve" | "token" | ...),
 * matching plan §5.5.
 *
 * The generator model (real Ollama in T-9) plugs in via AskStreamGenerator.
 */
import type { RetrievedChunk } from "@/lib/retrieve";

export type AskFrame =
  | { type: "retrieve"; chunks: Array<Pick<RetrievedChunk, "chunk_id" | "item_id" | "item_title" | "similarity">> }
  | { type: "token"; text: string }
  | { type: "citation"; chunk_id: string }
  | { type: "done"; usage?: { input_tokens: number; output_tokens: number } }
  | { type: "error"; code: string; message: string };

export function encodeSSE(frame: AskFrame): string {
  return `data: ${JSON.stringify(frame)}\n\n`;
}

/**
 * Build a ReadableStream from an async iterable of frames. Automatically
 * encodes, handles cancellation via the passed AbortSignal, and emits a
 * final `done` frame if the iterable finishes without one.
 */
export function toSSEStream(
  frames: AsyncIterable<AskFrame>,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let sawDone = false;
      try {
        for await (const frame of frames) {
          if (signal?.aborted) break;
          controller.enqueue(encoder.encode(encodeSSE(frame)));
          if (frame.type === "done" || frame.type === "error") sawDone = true;
        }
        if (!sawDone) {
          controller.enqueue(encoder.encode(encodeSSE({ type: "done" })));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            encodeSSE({ type: "error", code: "STREAM_FAILED", message }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export interface AskStreamGenerator {
  /**
   * Produce tokens for a question given retrieved context. Implementations
   * yield incremental text deltas; the caller wraps each in a `token` frame.
   *
   * T-8 ships an echo implementation; T-9 replaces with real Ollama.
   */
  (input: {
    question: string;
    chunks: RetrievedChunk[];
    signal?: AbortSignal;
  }): AsyncIterable<string>;
}

/**
 * Stub generator for T-8. Emits the question back as tokens in chunks of
 * a few words so the SSE plumbing is verifiable end-to-end before the
 * real model wire.
 */
export async function* echoGenerator(input: {
  question: string;
  chunks: RetrievedChunk[];
}): AsyncIterable<string> {
  const reply = input.chunks.length
    ? `You asked: "${input.question}". I found ${input.chunks.length} chunk(s) — top hit: ${input.chunks[0].item_title}.`
    : `You asked: "${input.question}". No matching chunks in the library.`;
  const words = reply.split(" ");
  for (let i = 0; i < words.length; i += 3) {
    yield words.slice(i, i + 3).join(" ") + " ";
  }
}

/**
 * Orchestrates a full ask stream: retrieve frame → token frames →
 * optional citation frames → done. The generator plugs in via AskStreamGenerator.
 *
 * T-13: onComplete() fires once the token stream ends (pre `done` frame) with
 * the fully-accumulated assistant text. The /api/ask route uses this to
 * persist the assistant message to chat_messages.
 */
export async function* orchestrateAsk(input: {
  question: string;
  chunks: RetrievedChunk[];
  generator: AskStreamGenerator;
  signal?: AbortSignal;
  onComplete?: (args: { answer: string; aborted: boolean }) => void;
}): AsyncIterable<AskFrame> {
  yield {
    type: "retrieve",
    chunks: input.chunks.map((c) => ({
      chunk_id: c.chunk_id,
      item_id: c.item_id,
      item_title: c.item_title,
      similarity: c.similarity,
    })),
  };

  let accumulated = "";
  let aborted = false;
  for await (const text of input.generator({
    question: input.question,
    chunks: input.chunks,
    signal: input.signal,
  })) {
    if (input.signal?.aborted) {
      aborted = true;
      break;
    }
    accumulated += text;
    yield { type: "token", text };
  }
  if (input.signal?.aborted) aborted = true;
  input.onComplete?.({ answer: accumulated, aborted });

  yield { type: "done" };
}
