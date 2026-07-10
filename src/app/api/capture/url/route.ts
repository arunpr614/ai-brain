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
import { findItemByUrl, insertCaptured } from "@/db/items";
import { upgradeItemCaptureContent } from "@/db/item-upgrades";
import {
  enqueueTranscriptJobForItem,
  isYoutubeTranscriptRecoveryCandidate,
} from "@/db/transcript-jobs";
import { UrlCaptureError } from "@/lib/capture/url";
import { YoutubeCaptureError } from "@/lib/capture/youtube";
import { extractUrlCapture } from "@/lib/capture/capture-url";
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
import { classifyCaptureUpgrade } from "@/lib/capture/upgrade-policy";
import { analyzeUserProvidedText } from "@/lib/capture/user-provided";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CaptureUrlBody = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500).optional(),
  note: z.string().max(100_000).optional(),
  selected_text: z.string().max(100_000).optional(),
});

function reviewPath(itemId: string): string {
  return `/review?focus=${encodeURIComponent(itemId)}`;
}

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

  const { url: rawUrl, note, selected_text: selectedText } = parsed.data;
  const captureSource = captureSourceFromTrustedHeader(req.headers.get("x-brain-capture-source"));

  const detection = detectCapturePlatform(rawUrl);
  const url = detection.canonicalUrl;
  const isSelectedTextCapture = typeof selectedText === "string" && selectedText.trim().length > 0;
  const userTextSource = isSelectedTextCapture ? "selected_text" : "paste";
  const userTextInput = isSelectedTextCapture ? selectedText : note;
  const userTextAnalysis = analyzeUserProvidedText(userTextInput, rawUrl, url);
  const userText = userTextAnalysis.isMeaningful ? userTextAnalysis.text : null;
  const hasUserText = userTextAnalysis.text.length > 0;

  if (isSelectedTextCapture && !userText) {
    logCaptureDecision("capture.selected_text.rejected", {
      platform: detection.platform,
      source_url: url,
      action: "rejected_too_short",
      reason: userTextAnalysis.tooLong ? "selected_text_too_long" : "selected_text_too_short",
      text_chars: userTextAnalysis.charCount,
      text_words: userTextAnalysis.wordCount,
    });
    return NextResponse.json(
      {
        error: userTextAnalysis.tooLong ? "text_too_long" : "text_too_short",
        action: "rejected_too_short",
        message: userTextAnalysis.tooLong
          ? "Selected text is too long."
          : "Select at least 8 words to save this passage.",
      },
      { status: 422 },
    );
  }

  // Server-side dedup (F-041 defense-in-depth). Catches APK double-fire
  // even if the client-side dedup window was skipped (hot reload, etc.).
  if (!userText && isDuplicateShare(shareDedupKey("url", url))) {
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
        action: "duplicate",
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
  if (existing && !hasUserText) {
    if (isYoutubeTranscriptRecoveryCandidate(existing)) {
      enqueueTranscriptJobForItem(existing, { reset: true, priority: 20 });
      logCaptureDecision("capture.transcript_recovery.queued", {
        item_id: existing.id,
        platform: existing.source_platform ?? detection.platform,
        source_url: url,
        action: "transcript_recovery_queued",
        reason: "duplicate_metadata_only_youtube",
      });
      return NextResponse.json(
        {
          duplicate: true,
          itemId: existing.id,
          reason: "transcript-recovery-queued",
          action: "transcript_recovery_queued",
          reviewPath: reviewPath(existing.id),
        },
        { status: 200 },
      );
    }
    logCaptureDecision("capture.duplicate", {
      item_id: existing.id,
      platform: existing.source_platform ?? detection.platform,
      source_url: url,
      action: "duplicate",
      reason: "exists",
    });
    return NextResponse.json(
      {
        duplicate: true,
        itemId: existing.id,
        reason: "exists",
        action: "duplicate",
        capture_result: toDuplicateCaptureResultPayload(existing),
      },
      { status: 200 },
    );
  }
  if (existing && hasUserText && !userText) {
    logCaptureDecision("capture.upgrade.rejected", {
      item_id: existing.id,
      platform: existing.source_platform ?? detection.platform,
      source_url: url,
      old_quality: existing.capture_quality ?? null,
      action: "rejected_too_short",
      reason: userTextAnalysis.tooLong ? "user_text_too_long" : "user_text_too_short",
      text_chars: userTextAnalysis.charCount,
      text_words: userTextAnalysis.wordCount,
    });
    return NextResponse.json(
      {
        error: userTextAnalysis.tooLong ? "text_too_long" : "text_too_short",
        action: "rejected_too_short",
        message: userTextAnalysis.tooLong
          ? "Pasted text is too long."
          : "Paste at least 8 words after the link to upgrade this item.",
        itemId: existing.id,
      },
      { status: 422 },
    );
  }
  if (existing && userText) {
    const incomingQuality = isSelectedTextCapture ? "client_dom" : "user_provided_full_text";
    const preDecision = classifyCaptureUpgrade(existing, {
      platform: detection.platform,
      quality: incomingQuality,
      hasMeaningfulText: true,
      hasUserText: true,
    });
    if (preDecision.action !== "upgrade") {
      logCaptureDecision(
        preDecision.action === "unsupported" ? "capture.upgrade.rejected" : "capture.duplicate",
        {
          item_id: existing.id,
          platform: existing.source_platform ?? detection.platform,
          source_url: url,
          old_quality: existing.capture_quality ?? null,
          action: preDecision.action,
          reason: preDecision.reason,
          text_chars: userTextAnalysis.charCount,
          text_words: userTextAnalysis.wordCount,
        },
      );
      return NextResponse.json(
        { duplicate: true, itemId: existing.id, reason: preDecision.reason, action: "duplicate" },
        { status: 200 },
      );
    }
    logCaptureDecision("capture.upgrade.started", {
      item_id: existing.id,
      platform: existing.source_platform ?? detection.platform,
      source_url: url,
      old_quality: existing.capture_quality ?? null,
      action: "upgrade",
      reason: preDecision.reason,
      text_chars: userTextAnalysis.charCount,
      text_words: userTextAnalysis.wordCount,
    });
  }

  let extracted;
  try {
    extracted = await extractUrlCapture({
      url: rawUrl,
      userText: userTextInput,
      userTextSource,
      title: parsed.data.title,
      existingItem: existing,
    });
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

  if (existing) {
    const decision = classifyCaptureUpgrade(existing, {
      platform: content.source_platform ?? extracted.detection.platform,
      quality: content.capture_quality ?? null,
      hasMeaningfulText: Boolean(userText),
      hasUserText,
    });
    if (decision.action !== "upgrade") {
      logCaptureDecision(
        decision.action === "unsupported" || decision.action === "rejected_too_short"
          ? "capture.upgrade.rejected"
          : "capture.duplicate",
        {
          item_id: existing.id,
          platform: existing.source_platform ?? content.source_platform ?? extracted.detection.platform,
          source_url: url,
          old_quality: existing.capture_quality ?? null,
          new_quality: content.capture_quality ?? null,
          action: decision.action,
          reason: decision.reason,
          text_chars: userTextAnalysis.charCount,
          text_words: userTextAnalysis.wordCount,
        },
      );
      return NextResponse.json(
        {
          duplicate: true,
          itemId: existing.id,
          reason: decision.reason,
          action: "duplicate",
          capture_result: toDuplicateCaptureResultPayload(existing),
        },
        { status: 200 },
      );
    }

    const item = await upgradeItemCaptureContent({
      itemId: existing.id,
      content: {
        ...content,
        source_platform: content.source_platform ?? extracted.detection.platform,
      },
      platform: extracted.detection.platform,
    });
    const savedItem = item ?? existing;
    return NextResponse.json(
      {
        id: savedItem.id,
        duplicate: false,
        action: "upgraded",
        capture_result: toCaptureResultPayload(savedItem, {
          state: "updated_existing",
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
  logCaptureDecision("capture.created", {
    item_id: item.id,
    platform: content.source_platform ?? extracted.detection.platform,
    source_url: content.source_url,
    new_quality: content.capture_quality ?? null,
    extraction_method: content.extraction_method ?? null,
    action: "created",
    text_chars: content.body.length,
  });

  if (isYoutubeTranscriptRecoveryCandidate(item)) {
    enqueueTranscriptJobForItem(item, { priority: 20 });
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

function logCaptureDecision(type: string, fields: Record<string, unknown>): void {
  logError({
    type,
    ...fields,
    ts: Date.now(),
  });
}
