/**
 * /api/threads/[id]/messages — list messages for reload; POST appends.
 *
 * Usually the streaming /api/ask writes both user + assistant messages
 * itself (T-13 extends the route), but a raw POST here is useful for
 * tests and for the UI to pre-record a user message before the stream
 * returns.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { appendMessage, getThread, listMessages } from "@/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthed(): Response {
  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { id } = await params;
  if (!getThread(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const messages = listMessages(id);
  return NextResponse.json({ messages });
}

const PostBody = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  citations: z
    .array(
      z.object({
        chunk_id: z.string(),
        item_id: z.string(),
        item_title: z.string(),
        similarity: z.number(),
      }),
    )
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { id } = await params;
  if (!getThread(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  let body;
  try {
    body = PostBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
  const message = appendMessage({
    thread_id: id,
    role: body.role,
    content: body.content,
    citations: body.citations,
  });
  return NextResponse.json({ message }, { status: 201 });
}
