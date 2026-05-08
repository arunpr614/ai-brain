/**
 * /api/threads — list + create chat threads (v0.4.0 T-13).
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { createThread, listThreads } from "@/db/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthed(): Response {
  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const item_id = searchParams.get("item_id") ?? undefined;
  if (scope && scope !== "library" && scope !== "item") {
    return NextResponse.json({ error: "invalid scope" }, { status: 400 });
  }
  const threads = listThreads({
    scope: (scope as "library" | "item" | null) ?? undefined,
    item_id,
  });
  return NextResponse.json({ threads });
}

const CreateBody = z.object({
  title: z.string().max(200).optional(),
  scope: z.enum(["library", "item"]).default("library"),
  item_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauthed();
  let body;
  try {
    body = CreateBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
  if (body.scope === "item" && !body.item_id) {
    return NextResponse.json(
      { error: "scope=item requires item_id" },
      { status: 400 },
    );
  }
  const thread = createThread({
    title: body.title ?? null,
    scope: body.scope,
    item_id: body.item_id ?? null,
  });
  return NextResponse.json({ thread }, { status: 201 });
}
