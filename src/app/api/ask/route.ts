/**
 * /api/ask — RAG chat endpoint.
 *
 * POST body:
 *   { question: string, scope?: "library" | "item", item_id?: string,
 *     thread_id?: string, top_k?: number, min_similarity?: number }
 *
 * Response: text/event-stream with frames:
 *   retrieve | token | citation | done | error
 *
 * Error codes:
 *   UNAUTHENTICATED   — no session cookie
 *   BAD_REQUEST       — body schema / scope/item_id mismatch
 *   OLLAMA_OFFLINE    — daemon unreachable (SC-8, T-10)
 *   RETRIEVE_FAILED   — vec0 query threw
 *   STREAM_FAILED     — generator threw mid-stream (wrapped by toSSEStream)
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { retrieve } from "@/lib/retrieve";
import { orchestrateAsk, toSSEStream, encodeSSE } from "@/lib/ask/sse";
import { ollamaGenerator } from "@/lib/ask/generator";
import { isOllamaAlive } from "@/lib/llm/ollama";
import { appendMessage, getThread } from "@/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().min(1).max(2000),
  scope: z.enum(["library", "item"]).default("library"),
  item_id: z.string().optional(),
  thread_id: z.string().optional(),
  top_k: z.number().int().min(1).max(50).default(8),
  min_similarity: z.number().min(-1).max(1).optional(),
});

export async function POST(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return new Response(
      encodeSSE({ type: "error", code: "UNAUTHENTICATED", message: "Sign in first." }),
      { status: 401, headers: sseHeaders() },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    parsed = BodySchema.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return new Response(
      encodeSSE({ type: "error", code: "BAD_REQUEST", message }),
      { status: 400, headers: sseHeaders() },
    );
  }

  if (parsed.scope === "item" && !parsed.item_id) {
    return new Response(
      encodeSSE({ type: "error", code: "BAD_REQUEST", message: "scope=item requires item_id" }),
      { status: 400, headers: sseHeaders() },
    );
  }

  // T-10 (SC-8): fail fast if Ollama isn't running. The retrieve step needs
  // Ollama to embed the query, and the generator needs it for streaming.
  // A structured error SSE frame lets the UI show a friendly message
  // instead of surfacing a fetch failure mid-stream.
  if (!(await isOllamaAlive())) {
    return new Response(
      encodeSSE({
        type: "error",
        code: "OLLAMA_OFFLINE",
        message:
          "Ollama isn't reachable at http://localhost:11434. Start it with `ollama serve` and try again.",
      }),
      { status: 503, headers: sseHeaders() },
    );
  }

  // T-13: thread persistence. If thread_id is supplied and valid, write the
  // user message now so it survives a mid-stream abort. Assistant message is
  // written in onComplete once the stream finishes.
  let threadId: string | null = null;
  if (parsed.thread_id) {
    if (!getThread(parsed.thread_id)) {
      return new Response(
        encodeSSE({ type: "error", code: "THREAD_NOT_FOUND", message: `Thread ${parsed.thread_id} not found.` }),
        { status: 404, headers: sseHeaders() },
      );
    }
    threadId = parsed.thread_id;
    appendMessage({ thread_id: threadId, role: "user", content: parsed.question });
  }

  let chunks;
  try {
    chunks = await retrieve(parsed.question, {
      topK: parsed.top_k,
      itemId: parsed.scope === "item" ? parsed.item_id : undefined,
      minSimilarity: parsed.min_similarity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retrieval failed";
    return new Response(
      encodeSSE({ type: "error", code: "RETRIEVE_FAILED", message }),
      { status: 500, headers: sseHeaders() },
    );
  }

  const citations = chunks.map((c) => ({
    chunk_id: c.chunk_id,
    item_id: c.item_id,
    item_title: c.item_title,
    similarity: c.similarity,
  }));

  const stream = toSSEStream(
    orchestrateAsk({
      question: parsed.question,
      chunks,
      generator: ollamaGenerator({ thread_id: parsed.thread_id }),
      signal: req.signal,
      onComplete: ({ answer, aborted }) => {
        if (!threadId) return;
        // Persist whatever was generated even on abort — the user might
        // want to see a partial response rendered after reload. Flag it
        // in the citations-metadata sidecar via a role='system' marker
        // is overkill; aborted state lives in UI memory for v0.4.0.
        if (answer.trim().length === 0 && aborted) return;
        appendMessage({
          thread_id: threadId,
          role: "assistant",
          content: answer,
          citations,
        });
      },
    }),
    req.signal,
  );

  return new Response(stream, { status: 200, headers: sseHeaders() });
}

function sseHeaders(): HeadersInit {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Disable Next/Vercel compression for SSE. Harmless on localhost; matters
    // at deploy time (v1.0.0+).
    "x-accel-buffering": "no",
  };
}
