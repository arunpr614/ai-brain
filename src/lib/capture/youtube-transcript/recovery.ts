import type { ItemRow } from "@/db/client";
import type { CapturedContent } from "@/lib/capture/types";
import {
  extractYoutubeVideo,
  YoutubeCaptureError,
  YOUTUBE_ANTIBOT_METADATA_WARNING,
  YOUTUBE_TRANSCRIPT_FETCH_METADATA_WARNING,
} from "@/lib/capture/youtube";
import { extractVideoId } from "@/lib/capture/youtube-url";

export type TranscriptRecoveryState = "success" | "retryable_error" | "manual_needed";

export interface TranscriptRecoveryResult {
  provider: string;
  state: TranscriptRecoveryState;
  content?: CapturedContent;
  retryable: boolean;
  errorCode?: string;
  errorMessage?: string;
  statusCode?: number | null;
  transcriptLanguage?: string | null;
  transcriptIsGenerated?: boolean | null;
  transcriptIsTranslated?: boolean | null;
  transcriptChars?: number | null;
}

const PROVIDER = "youtube_innertube_timedtext";

export async function recoverYoutubeTranscriptForItem(input: {
  item: ItemRow;
  videoId?: string | null;
}): Promise<TranscriptRecoveryResult> {
  const sourceUrl = input.item.source_url;
  const videoId = input.videoId ?? (sourceUrl ? extractVideoId(sourceUrl) : null);
  if (!sourceUrl || !videoId) {
    return {
      provider: PROVIDER,
      state: "manual_needed",
      retryable: false,
      errorCode: "missing_video_id",
      errorMessage: "This YouTube item does not have a parseable video URL.",
    };
  }

  try {
    const content = await extractYoutubeVideo(videoId, sourceUrl);
    if (content.capture_quality && content.capture_quality !== "metadata_only") {
      return {
        provider: PROVIDER,
        state: "success",
        content,
        retryable: false,
        transcriptChars: content.body.length,
      };
    }
    return classifyMetadataOnlyResult(content);
  } catch (err) {
    if (err instanceof YoutubeCaptureError) {
      return classifyYoutubeCaptureError(err);
    }
    return {
      provider: PROVIDER,
      state: "retryable_error",
      retryable: true,
      errorCode: "provider_exception",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

export function classifyYoutubeCaptureError(err: YoutubeCaptureError): TranscriptRecoveryResult {
  if (err.code === "video_unavailable") {
    return {
      provider: PROVIDER,
      state: "manual_needed",
      retryable: false,
      errorCode: "video_unavailable",
      errorMessage: err.message,
    };
  }

  if (err.code === "invalid_url") {
    return {
      provider: PROVIDER,
      state: "manual_needed",
      retryable: false,
      errorCode: "invalid_youtube_url",
      errorMessage: err.message,
    };
  }

  if (err.code === "no_captions") {
    return {
      provider: PROVIDER,
      state: "manual_needed",
      retryable: false,
      errorCode: "captions_unavailable",
      errorMessage: err.message,
    };
  }

  if (err.code === "live_stream") {
    return {
      provider: PROVIDER,
      state: "retryable_error",
      retryable: true,
      errorCode: "live_stream_captions_pending",
      errorMessage: err.message,
    };
  }

  return {
    provider: PROVIDER,
    state: "retryable_error",
    retryable: true,
    errorCode: "innertube_fetch_failed",
    errorMessage: err.message,
  };
}

function classifyMetadataOnlyResult(content: CapturedContent): TranscriptRecoveryResult {
  const warning = content.extraction_warning;
  const body = content.body;

  if (warning === YOUTUBE_TRANSCRIPT_FETCH_METADATA_WARNING) {
    const statusCode = parseTimedTextStatus(body);
    const retryable = statusCode === null || statusCode === 429 || statusCode >= 500;
    return {
      provider: PROVIDER,
      state: retryable ? "retryable_error" : "manual_needed",
      retryable,
      errorCode: statusCode ? `timedtext_http_${statusCode}` : "timedtext_fetch_failed",
      errorMessage: metadataOnlyMessage(body, "Timed-text transcript fetch failed."),
      statusCode,
    };
  }

  if (warning === YOUTUBE_ANTIBOT_METADATA_WARNING) {
    return {
      provider: PROVIDER,
      state: "retryable_error",
      retryable: true,
      errorCode: YOUTUBE_ANTIBOT_METADATA_WARNING,
      errorMessage: "YouTube returned an anti-bot sign-in challenge.",
    };
  }

  if (warning === "no_transcript") {
    return {
      provider: PROVIDER,
      state: "manual_needed",
      retryable: false,
      errorCode: "captions_unavailable",
      errorMessage: "No YouTube caption track was available.",
    };
  }

  return {
    provider: PROVIDER,
    state: "manual_needed",
    retryable: false,
    errorCode: warning ?? "metadata_only",
    errorMessage: metadataOnlyMessage(body, "Transcript was still unavailable."),
  };
}

function parseTimedTextStatus(body: string): number | null {
  const match = body.match(/Timed-text returned\s+(\d{3})/i);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

function metadataOnlyMessage(body: string, fallback: string): string {
  const match = body.match(/\[Transcript unavailable:\s*([^\]]+)\]/i);
  return match?.[1]?.trim() || fallback;
}
