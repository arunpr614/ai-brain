/**
 * POST /api/capture/url — bearer-authed URL capture (v0.5.0 T-12).
 *
 * Called from the APK share-handler and the Chrome extension when the
 * user shares a URL. The proxy (T-4) verifies the bearer token + rate
 * limit before the handler runs; this handler only checks Origin and
 * enforces server-side dedup (F-041 defense-in-depth).
 *
 * Flow: duplicate URL check → extract article via Readability →
 * insertCaptured → return {id, duplicate?}.
 *
 * On duplicate (URL already in the library OR shared again within the
 * 2s dedup window), responds 200 with {duplicate: true, itemId} so the
 * client can route the user to the existing item without a second
 * capture attempt.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateOrigin } from "@/lib/auth/bearer";
import { findItemByUrl, insertCaptured } from "@/db/items";
import { extractArticleFromUrl, UrlCaptureError } from "@/lib/capture/url";
import {
  extractVideoId,
  canonicalYoutubeUrl,
  extractYoutubeVideo,
  YoutubeCaptureError,
} from "@/lib/capture/youtube";
import type { CapturedContent } from "@/lib/capture/types";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { logError } from "@/lib/errors/sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CaptureUrlBody = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500).optional(),
  note: z.string().max(10_000).optional(),
});

export async function POST(req: NextRequest) {
  if (!validateOrigin(req.headers.get("origin"))) {
    logError({
      type: "lan.bearer.reject-origin",
      path: "/api/capture/url",
      origin: req.headers.get("origin"),
      ts: Date.now(),
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  let parsed;
  try {
    parsed = CaptureUrlBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { url: rawUrl } = parsed.data;

  // v0.5.1: YouTube-aware URL normalization BEFORE dedup so variants
  // (youtu.be/X, watch?v=X, shorts/X, etc.) collide as one library item.
  // shareDedupKey's first arg stays "url" — it identifies the payload
  // shape (we're passing a URL), not the source_type of the final item.
  const videoId = extractVideoId(rawUrl);
  const url = videoId ? canonicalYoutubeUrl(videoId) : rawUrl;

  // Server-side dedup (F-041 defense-in-depth). Catches APK double-fire
  // even if the client-side dedup window was skipped (hot reload, etc.).
  if (isDuplicateShare(shareDedupKey("url", url))) {
    logError({
      type: "share.intent.duplicate",
      source: "server",
      path: "/api/capture/url",
      ts: Date.now(),
    });
    const existing = findItemByUrl(url);
    return NextResponse.json(
      { duplicate: true, itemId: existing?.id ?? null, reason: "window" },
      { status: 200 },
    );
  }

  // Historical-duplicate check (URL already in library from a past capture).
  const existing = findItemByUrl(url);
  if (existing) {
    return NextResponse.json(
      { duplicate: true, itemId: existing.id, reason: "exists" },
      { status: 200 },
    );
  }

  // Extractor dispatch. Both return CapturedContent — route never narrows
  // the union because insertCaptured accepts the shared base type.
  let content: CapturedContent;
  try {
    content = videoId
      ? await extractYoutubeVideo(videoId, rawUrl)
      : await extractArticleFromUrl(url);
  } catch (err) {
    if (err instanceof UrlCaptureError || err instanceof YoutubeCaptureError) {
      logError({
        type: "share.http.capture-failed",
        url,
        message: err.message,
        ts: Date.now(),
      });
      return NextResponse.json(
        { error: "capture_failed", message: err.message, code: err instanceof YoutubeCaptureError ? err.code : undefined },
        { status: 422 },
      );
    }
    throw err;
  }

  const item = insertCaptured({
    source_type: videoId ? "youtube" : "url",
    title: content.title,
    body: content.body,
    author: content.author,
    source_url: content.source_url,
    extraction_warning: content.extraction_warning,
    duration_seconds: content.duration_seconds ?? null,
  });

  return NextResponse.json({ id: item.id, duplicate: false }, { status: 201 });
}
