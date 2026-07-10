/**
 * /api/ask — RAG chat endpoint.
 *
 * POST body:
 *   { question: string, scope?: "library" | "item" | "items",
 *     item_id?: string, item_ids?: string[], thread_id?: string,
 *     top_k?: number, min_similarity?: number }
 *
 * Response: text/event-stream with frames:
 *   retrieve | token | citation | done | error
 *
 * Error codes:
 *   UNAUTHENTICATED   — no session cookie
 *   BAD_REQUEST       — body schema / scope mismatch
 *   LLM_PROVIDER_OFFLINE — configured generation provider unreachable
 *   RETRIEVE_FAILED   — vec0 query threw
 *   STREAM_FAILED     — generator threw mid-stream (wrapped by toSSEStream)
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import { retrieve } from "@/lib/retrieve";
import { orchestrateAsk, toSSEStream, encodeSSE } from "@/lib/ask/sse";
import { ollamaGenerator } from "@/lib/ask/generator";
import { getAskProvider } from "@/lib/llm/factory";
import { appendMessage, getThread } from "@/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().min(1).max(2000),
  scope: z.enum(["library", "item", "items"]).default("library"),
  item_id: z.string().optional(),
  item_ids: z.array(z.string().min(1)).max(50).optional(),
  thread_id: z.string().optional(),
  top_k: z.number().int().min(1).max(50).default(8),
  min_similarity: z.number().min(-1).max(1).optional(),
});

export async function POST(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) {
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

  if (parsed.scope === "items" && (!parsed.item_ids || parsed.item_ids.length === 0)) {
    return new Response(
      encodeSSE({ type: "error", code: "BAD_REQUEST", message: "scope=items requires item_ids" }),
      { status: 400, headers: sseHeaders() },
    );
  }

  // Fail fast if the configured Ask LLM provider is not reachable. The
  // generator needs it for streaming; retrieval has its own embedding
  // provider path.
  if (!(await getAskProvider().isAlive())) {
    return new Response(
      encodeSSE({
        type: "error",
        code: "LLM_PROVIDER_OFFLINE",
        legacy_code: "OLLAMA_OFFLINE",
        message:
          "The Ask AI provider is not reachable right now. Check AI services in Settings.",
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
      itemIds: parsed.scope === "items" ? parsed.item_ids : undefined,
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
    item_source_type: c.item_source_type,
    item_source_platform: c.item_source_platform,
    item_capture_quality: c.item_capture_quality,
    item_extraction_warning: c.item_extraction_warning,
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
