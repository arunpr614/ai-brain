/**
 * POST /api/capture/note — bearer-authed note capture (v0.5.0 T-12).
 *
 * Called from the APK share-handler when Android shares plain text that
 * doesn't parse as a URL (research §6.5 routing). Chrome extension can
 * also hit this for "save this page as a note" flows in the future.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateOrigin } from "@/lib/auth/bearer";
import { checkClientApiVersion } from "@/lib/auth/api-version";
import { insertCaptured } from "@/db/items";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { logError } from "@/lib/errors/sink";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CaptureNoteBody = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(100_000),
});

export async function POST(req: NextRequest) {
  if (!validateOrigin(req.headers.get("origin"))) {
    logError({
      type: "lan.bearer.reject-origin",
      path: "/api/capture/note",
      origin: req.headers.get("origin"),
      ts: Date.now(),
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const versionReject = checkClientApiVersion(req);
  if (versionReject) return versionReject;

  let parsed;
  try {
    parsed = CaptureNoteBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { title, body } = parsed.data;

  // Dedup on title+body hash — the note has no URL identifier to key off.
  const hash = crypto.createHash("sha256").update(`${title}\n${body}`).digest("hex").slice(0, 32);
  if (isDuplicateShare(shareDedupKey("note", hash))) {
    logError({
      type: "share.intent.duplicate",
      source: "server",
      path: "/api/capture/note",
      ts: Date.now(),
    });
    return NextResponse.json(
      { duplicate: true, reason: "window" },
      { status: 200 },
    );
  }

  const item = insertCaptured({
    source_type: "note",
    title,
    body,
  });

  return NextResponse.json({ id: item.id, duplicate: false }, { status: 201 });
}
