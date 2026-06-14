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
import { checkClientApiVersion } from "@/lib/auth/api-version";
import { findItemByUrl, insertCaptured, updateItemCaptureContent } from "@/db/items";
import type { ItemRow } from "@/db/client";
import { UrlCaptureError } from "@/lib/capture/url";
import { YoutubeCaptureError } from "@/lib/capture/youtube";
import { extractUrlCapture, meaningfulUserText } from "@/lib/capture/capture-url";
import { detectCapturePlatform } from "@/lib/capture/platform";
import { isDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { captureSourceFromTrustedHeader } from "@/lib/capture/source";
import { saveCaptureArtifacts } from "@/lib/capture/artifacts";
import {
  toCaptureResultPayload,
  toDuplicateCaptureResultPayload,
  toFailedCaptureResultPayload,
} from "@/lib/capture/result";
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

  const versionReject = checkClientApiVersion(req);
  if (versionReject) return versionReject;

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

  const { url: rawUrl, note } = parsed.data;
  const captureSource = captureSourceFromTrustedHeader(req.headers.get("x-brain-capture-source"));

  const detection = detectCapturePlatform(rawUrl);
  const url = detection.canonicalUrl;
  const userText = meaningfulUserText(note, rawUrl);

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
      {
        duplicate: true,
        itemId: existing?.id ?? null,
        reason: "window",
        capture_result: toDuplicateCaptureResultPayload(existing, {
          sourcePlatform: detection.platform,
          capturedVia: captureSource,
        }),
      },
      { status: 200 },
    );
  }

  // Historical-duplicate check (URL already in library from a past capture).
  const existing = findItemByUrl(url);
  if (existing && !userText) {
    return NextResponse.json(
      {
        duplicate: true,
        itemId: existing.id,
        reason: "exists",
        capture_result: toDuplicateCaptureResultPayload(existing),
      },
      { status: 200 },
    );
  }

  let extracted;
  try {
    extracted = await extractUrlCapture({ url: rawUrl, userText: note });
  } catch (err) {
    if (err instanceof UrlCaptureError || err instanceof YoutubeCaptureError) {
      logError({
        type: "share.http.capture-failed",
        url,
        message: err.message,
        ts: Date.now(),
      });
      return NextResponse.json(
        {
          error: "capture_failed",
          message: err.message,
          code: err instanceof YoutubeCaptureError ? err.code : undefined,
          capture_result: toFailedCaptureResultPayload(err.message, {
            sourcePlatform: detection.platform,
            capturedVia: captureSource,
            warningCode: err instanceof YoutubeCaptureError ? err.code : null,
          }),
        },
        { status: 422 },
      );
    }
    throw err;
  }
  const { content } = extracted;

  if (existing && shouldUpgradeWeakCapture(existing, content.capture_quality)) {
    const item = updateItemCaptureContent(existing.id, {
      title: content.title,
      body: content.body,
      author: content.author,
      extraction_warning: content.extraction_warning,
      duration_seconds: content.duration_seconds ?? null,
      source_platform: content.source_platform ?? extracted.detection.platform,
      capture_quality: content.capture_quality ?? null,
      extraction_method: content.extraction_method ?? null,
      extraction_version: content.extraction_version ?? null,
      published_at: content.published_at ?? null,
      thumbnail_url: content.thumbnail_url ?? null,
      description: content.description ?? null,
    });
    const savedItem = item ?? existing;
    let artifactError: string | null = null;
    try {
      await saveCaptureArtifacts(existing.id, content.artifacts);
    } catch (err) {
      artifactError = (err as Error).message;
      logError({
        type: "capture.artifact-save-failed",
        item_id: existing.id,
        message: artifactError,
        ts: Date.now(),
      });
    }
    return NextResponse.json(
      {
        id: savedItem.id,
        duplicate: false,
        action: "upgraded",
        capture_result: toCaptureResultPayload(savedItem, {
          state: artifactError ? "error_with_saved_item" : "updated_existing",
          errorMessage: artifactError,
        }),
      },
      { status: 200 },
    );
  }

  const item = insertCaptured({
    source_type: extracted.source_type,
    capture_source: captureSource,
    title: content.title,
    body: content.body,
    author: content.author,
    source_url: content.source_url,
    extraction_warning: content.extraction_warning,
    duration_seconds: content.duration_seconds ?? null,
    source_platform: content.source_platform ?? extracted.detection.platform,
    capture_quality: content.capture_quality ?? null,
    extraction_method: content.extraction_method ?? null,
    extraction_version: content.extraction_version ?? null,
    published_at: content.published_at ?? null,
    thumbnail_url: content.thumbnail_url ?? null,
    description: content.description ?? null,
  });
  let artifactError: string | null = null;
  try {
    await saveCaptureArtifacts(item.id, content.artifacts);
  } catch (err) {
    artifactError = (err as Error).message;
    logError({
      type: "capture.artifact-save-failed",
      item_id: item.id,
      message: artifactError,
      ts: Date.now(),
    });
  }

  return NextResponse.json(
    {
      id: item.id,
      duplicate: false,
      action: "created",
      capture_result: toCaptureResultPayload(item, {
        state: artifactError ? "error_with_saved_item" : undefined,
        errorMessage: artifactError,
      }),
    },
    { status: 201 },
  );
}

function shouldUpgradeWeakCapture(
  existing: ItemRow,
  incomingQuality: string | null | undefined,
): boolean {
  return existing.capture_quality === "metadata_only" &&
    incomingQuality === "user_provided_full_text";
}
