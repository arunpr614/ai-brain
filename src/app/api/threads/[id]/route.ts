/**
 * /api/threads/[id] — rename or delete a thread (v0.4.0 T-13).
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { deleteThread, getThread, renameThread } from "@/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthed(): Response {
  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}

const PatchBody = z.object({
  title: z.string().min(1).max(200),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { id } = await params;
  const thread = getThread(id);
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { id } = await params;
  if (!getThread(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  let body;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
  renameThread(id, body.title);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { id } = await params;
  deleteThread(id);
  return NextResponse.json({ ok: true });
}
