import type { CapturePlatform, CaptureQuality } from "./types";

export const CAPTURE_EXTRACTION_VERSION = "capture-v0.7.5";

export function qualityLabel(quality: string | null | undefined): string {
  switch (quality) {
    case "metadata_plus_transcript":
      return "metadata + transcript";
    case "metadata_only":
      return "metadata only";
    case "paywall_preview":
      return "preview only";
    case "user_provided_full_text":
      return "pasted text";
    case "client_dom":
      return "browser capture";
    case "email_body":
      return "email body";
    case "full_text":
      return "full text";
    case "transcript":
      return "transcript";
    case "failed":
      return "failed";
    default:
      return "captured";
  }
}

export function platformLabel(platform: string | null | undefined, sourceType?: string): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "youtube_short":
      return "YouTube Short";
    case "substack":
      return "Substack";
    case "linkedin":
      return "LinkedIn";
    case "generic_article":
      return "Article";
    case "pdf":
      return "PDF";
    case "note":
      return "Note";
    default:
      if (sourceType === "youtube") return "YouTube";
      if (sourceType === "url") return "Article";
      if (sourceType === "pdf") return "PDF";
      if (sourceType === "note") return "Note";
      return "Capture";
  }
}

export function inferQualityFromWarning(
  platform: CapturePlatform,
  warning: string | null | undefined,
): CaptureQuality {
  if (warning === "youtube_antibot_metadata_only" || warning === "no_transcript") {
    return "metadata_only";
  }
  if (platform === "youtube" || platform === "youtube_short") {
    return "transcript";
  }
  if (platform === "note") return "user_provided_full_text";
  return "full_text";
}

export function improvementHint(
  platform: string | null | undefined,
  quality: string | null | undefined,
): string | null {
  if (quality === "metadata_only" && (platform === "youtube" || platform === "youtube_short")) {
    return "Add the transcript or your notes to upgrade this capture.";
  }
  if (quality === "metadata_only" && platform === "linkedin") {
    return "Paste the post text with the link to upgrade this capture.";
  }
  if (quality === "paywall_preview" && platform === "substack") {
    return "Full Substack text requires the newsletter email body. This item remains a preview until email-body capture is added.";
  }
  return null;
}
