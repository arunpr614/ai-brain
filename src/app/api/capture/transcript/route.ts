/**
 * POST /api/capture/transcript - attach a user-provided transcript to a weak item.
 *
 * Accepts either JSON pasted transcript text or multipart user-supplied
 * transcript files. This route records policy/source provenance and reuses
 * the repair pipeline so enrichment/search are reset.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import { validateOrigin, verifyBearerToken } from "@/lib/auth/bearer";
import { checkClientApiVersion } from "@/lib/auth/api-version";
import {
  attachUploadedTranscriptFileToYoutubeItem,
  attachUserProvidedTranscriptToYoutubeItem,
  UserProvidedTranscriptError,
} from "@/lib/capture/transcripts/user-provided";
import { toCaptureResultPayload, toFailedCaptureResultPayload } from "@/lib/capture/result";
import { logError } from "@/lib/errors/sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TranscriptBody = z.object({
  item_id: z.string().min(1),
  text: z.string().min(1).max(500_000),
  title: z.string().max(500).optional(),
  language_code: z.string().max(32).optional(),
});

export async function POST(req: NextRequest) {
  const hasCookie = verifySessionCookie(req.cookies);
  const hasBearer = verifyBearerToken(req.headers.get("authorization")).ok;

  if (!hasCookie && !hasBearer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (hasBearer && !validateOrigin(req.headers.get("origin"))) {
    logError({
      type: "lan.bearer.reject-origin",
      path: "/api/capture/transcript",
      origin: req.headers.get("origin"),
      ts: Date.now(),
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const versionReject = checkClientApiVersion(req);
  if (versionReject) return versionReject;

  const contentType = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (contentType === "multipart/form-data") {
    return handleMultipartTranscript(req);
  }
  if (
    contentType &&
    contentType !== "application/json" &&
    !contentType.endsWith("+json")
  ) {
    return NextResponse.json(
      {
        error: "unsupported_content_type",
        message: "Upload a JSON body or multipart transcript file.",
      },
      { status: 415 },
    );
  }

  let parsed;
  try {
    try {
      parsed = TranscriptBody.safeParse(await req.json());
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = attachUserProvidedTranscriptToYoutubeItem({
      itemId: parsed.data.item_id,
      text: parsed.data.text,
      title: parsed.data.title,
      languageCode: parsed.data.language_code,
    });
    return NextResponse.json(
      {
        id: result.repair.item.id,
        action: "upgraded",
        policy_decision_id: result.policyDecisionId,
        transcript_source_id: result.transcriptSource.id,
        capture_result: toCaptureResultPayload(result.repair.item, {
          state: "updated_existing",
        }),
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof UserProvidedTranscriptError) {
      const status = statusForTranscriptError(err);
      return NextResponse.json(
        {
          error: err.code,
          message: err.message,
          capture_result: toFailedCaptureResultPayload(err.message, {
            sourcePlatform: "youtube",
            warningCode: err.code,
          }),
        },
        { status },
      );
    }

    logError({
      type: "capture.transcript.unexpected-failure",
      item_id: parsed?.data.item_id,
      message: err instanceof Error ? err.message : String(err),
      ts: Date.now(),
    });
    return NextResponse.json(
      {
        error: "transcript_upgrade_failed",
        capture_result: toFailedCaptureResultPayload("Transcript could not be saved."),
      },
      { status: 500 },
    );
  }
}

async function handleMultipartTranscript(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const itemId = form.get("item_id")?.toString() ?? "";
  const title = form.get("title")?.toString();
  const languageCode = form.get("language_code")?.toString();
  const file = form.get("transcript");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "missing_transcript_file",
        message: "Choose a transcript file first.",
      },
      { status: 400 },
    );
  }

  try {
    const result = attachUploadedTranscriptFileToYoutubeItem({
      itemId,
      title,
      languageCode,
      filename: file.name,
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json(
      {
        id: result.repair.item.id,
        action: "upgraded",
        policy_decision_id: result.policyDecisionId,
        transcript_source_id: result.transcriptSource.id,
        segment_count: result.transcriptSource.segment_count,
        timestamp_mode: result.transcriptSource.timestamp_mode,
        capture_result: toCaptureResultPayload(result.repair.item, {
          state: "updated_existing",
        }),
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof UserProvidedTranscriptError) {
      const status = statusForTranscriptError(err);
      return NextResponse.json(
        {
          error: err.code,
          message: err.message,
          capture_result: toFailedCaptureResultPayload(err.message, {
            sourcePlatform: "youtube",
            warningCode: err.code,
          }),
        },
        { status },
      );
    }

    logError({
      type: "capture.transcript.multipart-unexpected-failure",
      item_id: itemId,
      message: err instanceof Error ? err.message : String(err),
      ts: Date.now(),
    });
    return NextResponse.json(
      {
        error: "transcript_upgrade_failed",
        capture_result: toFailedCaptureResultPayload("Transcript could not be saved."),
      },
      { status: 500 },
    );
  }
}

function statusForTranscriptError(err: UserProvidedTranscriptError): number {
  switch (err.code) {
    case "not_found":
      return 404;
    case "not_youtube_item":
    case "policy_blocked":
      return 422;
    case "text_too_short":
    case "text_too_large":
    case "unsupported_transcript_file":
    case "transcript_file_too_large":
    case "too_many_segments":
    case "malformed_transcript_file":
    case "invalid_title":
      return 400;
  }
}
