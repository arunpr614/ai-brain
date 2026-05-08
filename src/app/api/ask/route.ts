/**
 * /api/ask — RAG chat endpoint (v0.4.0 T-8 skeleton).
 *
 * POST body:
 *   { question: string, scope?: "library" | "item", item_id?: string,
 *     thread_id?: string, top_k?: number, min_similarity?: number }
 *
 * Response: text/event-stream with frames:
 *   retrieve | token | citation | done | error
 *
 * T-8 ships the echo generator (plumbing verification). T-9 plugs in the
 * real Ollama streaming generator + [CITE:...] post-filter + llm_usage.
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { retrieve } from "@/lib/retrieve";
import { echoGenerator, orchestrateAsk, toSSEStream, encodeSSE } from "@/lib/ask/sse";

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

  const stream = toSSEStream(
    orchestrateAsk({
      question: parsed.question,
      chunks,
      generator: echoGenerator,
      signal: req.signal,
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
