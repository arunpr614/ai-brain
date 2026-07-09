import { NextResponse, type NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { toFailedCaptureResultPayload } from "@/lib/capture/result";
import { logError } from "@/lib/errors/sink";
import {
  logOwnedMediaUploadEvent,
  OwnedMediaUploadError,
  prepareOwnedMediaUpload,
} from "@/lib/capture/transcripts/owned-media-stt-route-service";
import { DEFAULT_OWNED_MEDIA_STT_MAX_BYTES } from "@/lib/capture/transcripts/owned-media-stt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    logOwnedMediaUploadEvent("capture.transcript.owned_media.invalid_request", {
      status: "rejected",
      reason: "invalid_multipart",
    });
    return failure("invalid_multipart", "Upload an owned media file.", 400);
  }

  const media = form.get("media");
  if (!(media instanceof File)) {
    logOwnedMediaUploadEvent("capture.transcript.owned_media.invalid_request", {
      item_id: stringField(form, "item_id") || undefined,
      status: "rejected",
      reason: "missing_media_file",
    });
    return failure("missing_media_file", "Choose an owned media file first.", 400);
  }
  if (media.size === 0) {
    logOwnedMediaUploadEvent("capture.transcript.owned_media.invalid_request", {
      item_id: stringField(form, "item_id") || undefined,
      status: "rejected",
      reason: "missing_media_file",
    });
    return failure("missing_media_file", "Choose an owned media file first.", 400);
  }
  if (media.size > DEFAULT_OWNED_MEDIA_STT_MAX_BYTES) {
    logOwnedMediaUploadEvent("capture.transcript.owned_media.invalid_request", {
      item_id: stringField(form, "item_id") || undefined,
      status: "rejected",
      reason: "invalid_media",
    });
    return failure("invalid_media", "Owned media file is too large.", 400);
  }

  try {
    const bytes = new Uint8Array(await media.arrayBuffer());
    const prepared = prepareOwnedMediaUpload({
      itemId: stringField(form, "item_id"),
      title: optionalStringField(form, "title"),
      languageCode: optionalStringField(form, "language_code"),
      rightsAttestation: optionalStringField(form, "rights_attestation"),
      filename: media.name,
      contentType: media.type,
      bytes,
      durationMs: optionalIntegerField(form, "media_duration_ms"),
      expectedSha256: req.headers.get("x-expected-sha256"),
    });

    logOwnedMediaUploadEvent("capture.transcript.owned_media.provider_disabled", {
      ...prepared.logFields,
      provider: "disabled",
      status: "blocked",
    });
    return failure(
      "provider_disabled",
      "Owned-media transcription is not enabled yet.",
      503,
      {
        provider_mode: "disabled",
        item_id: prepared.itemId,
      },
    );
  } catch (err) {
    if (err instanceof OwnedMediaUploadError) {
      const eventType =
        err.code === "sha256_mismatch"
          ? "capture.transcript.owned_media.sha256_mismatch"
          : "capture.transcript.owned_media.invalid_request";
      logOwnedMediaUploadEvent(eventType, {
        item_id: stringField(form, "item_id") || undefined,
        status: "rejected",
        reason: err.code,
      });
      return failure(err.code, err.message, err.details.status, {
        expected: err.details.expected,
        actual: err.details.actual,
      });
    }

    logError({
      type: "capture.transcript.owned_media.unexpected_failure",
      item_id: stringField(form, "item_id") || null,
      reason: "unexpected_failure",
      error_name: err instanceof Error ? err.name : typeof err,
      ts: Date.now(),
    });
    return failure("owned_media_upload_failed", "Owned media could not be processed.", 500);
  }
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function optionalStringField(form: FormData, name: string): string | null {
  const value = stringField(form, name).trim();
  return value || null;
}

function optionalIntegerField(form: FormData, name: string): number | null {
  const raw = optionalStringField(form, name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : Number.NaN;
}

function failure(
  error: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      error,
      message,
      ...dropUndefined(extra),
      capture_result: toFailedCaptureResultPayload(message, {
        sourcePlatform: "youtube",
        warningCode: error,
      }),
    },
    { status },
  );
}

function dropUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
