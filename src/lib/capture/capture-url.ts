import type { SourceType } from "@/db/items";
import { extractArticleFromUrl } from "./url";
import { extractYoutubeVideo } from "./youtube";
import { detectCapturePlatform, type PlatformDetection } from "./platform";
import { extractSubstackFromUrl } from "./substack";
import { captureLinkedInUserText, extractLinkedInMetadataFromUrl } from "./linkedin";
import type { CapturedContent } from "./types";
import { CAPTURE_EXTRACTION_VERSION } from "./quality";

export interface ExtractUrlCaptureInput {
  url: string;
  userText?: string | null;
}

export interface ExtractUrlCaptureResult {
  detection: PlatformDetection;
  content: CapturedContent;
  source_type: SourceType;
}

export async function extractUrlCapture(
  input: ExtractUrlCaptureInput,
): Promise<ExtractUrlCaptureResult> {
  const detection = detectCapturePlatform(input.url);
  let content: CapturedContent;

  if (detection.videoId) {
    content = await extractYoutubeVideo(detection.videoId, input.url);
  } else if (detection.platform === "substack") {
    content = await extractSubstackFromUrl(detection.canonicalUrl);
  } else if (detection.platform === "linkedin") {
    const pasted = meaningfulUserText(input.userText, input.url);
    content = pasted
      ? captureLinkedInUserText(detection.canonicalUrl, pasted)
      : await extractLinkedInMetadataFromUrl(detection.canonicalUrl);
  } else {
    content = await extractArticleFromUrl(detection.canonicalUrl);
    content = {
      ...content,
      source_url: detection.canonicalUrl,
      source_platform: "generic_article",
      capture_quality: "full_text",
      extraction_method: "readability",
      extraction_version: CAPTURE_EXTRACTION_VERSION,
    };
  }

  return {
    detection,
    content,
    source_type: detection.sourceType,
  };
}

export function meaningfulUserText(text: string | null | undefined, url: string): string | null {
  const cleaned = removeUrl(text ?? "", url)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  return wordCount >= 8 ? cleaned : null;
}

function removeUrl(text: string, url: string): string {
  if (!text) return "";
  const escaped = escapeRegExp(url);
  let without = text.replace(new RegExp(escaped, "gi"), " ");
  try {
    const canonical = detectCapturePlatform(url).canonicalUrl;
    without = without.replace(new RegExp(escapeRegExp(canonical), "gi"), " ");
  } catch {}
  return without;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
