import type { CapturePlatform, CaptureQuality } from "./types";

export const CAPTURE_EXTRACTION_VERSION = "capture-v0.7.5";

export function qualityLabel(quality: string | null | undefined): string {
  switch (quality) {
    case "metadata_plus_transcript":
      return "Transcript";
    case "metadata_only":
      return "Metadata only";
    case "paywall_preview":
      return "Preview only";
    case "user_provided_full_text":
      return "Full text";
    case "client_dom":
      return "Browser capture";
    case "email_body":
      return "Email body";
    case "full_text":
      return "Full text";
    case "transcript":
      return "Transcript";
    case "failed":
      return "Needs upgrade";
    default:
      return "Captured";
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

export function captureSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case "android":
      return "Android";
    case "extension":
      return "Extension";
    case "telegram":
      return "Telegram";
    case "system":
      return "System";
    case "web":
      return "Web";
    case "recall":
      return "Recall";
    default:
      return "Unknown";
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
    return "Retry later or add a transcript if the video has no available captions.";
  }
  if (quality === "metadata_only" && platform === "linkedin") {
    return "Paste the post text with the link to upgrade this capture.";
  }
  if (quality === "paywall_preview" && platform === "substack") {
    return "Attach or paste the newsletter email body to save the full post.";
  }
  return null;
}

export function isLimitedCaptureQuality(quality: string | null | undefined): boolean {
  return quality === "metadata_only" || quality === "paywall_preview" || quality === "failed";
}

export function needsUpgradeReason(input: {
  source_platform?: string | null;
  capture_quality?: string | null;
  extraction_warning?: string | null;
}): string | null {
  if (input.capture_quality === "failed") return "Extraction failed";
  if (input.capture_quality === "paywall_preview") return "Preview only";
  if (input.capture_quality === "metadata_only" && input.source_platform === "linkedin") {
    return "Needs pasted post text";
  }
  if (
    input.capture_quality === "metadata_only" &&
    (input.source_platform === "youtube" || input.source_platform === "youtube_short")
  ) {
    return "Needs transcript";
  }
  if (input.capture_quality === "metadata_only") return "Needs readable text";
  if (input.extraction_warning === "no_transcript") return "No transcript available";
  if (input.extraction_warning === "youtube_antibot_metadata_only") {
    return "Transcript blocked";
  }
  if (input.extraction_warning === "youtube_transcript_fetch_metadata_only") {
    return "Transcript fetch failed";
  }
  return null;
}
