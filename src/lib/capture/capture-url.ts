import type { SourceType } from "@/db/items";
import type { ItemRow } from "@/db/client";
import { extractArticleFromUrl } from "./url";
import { extractYoutubeVideo } from "./youtube";
import { detectCapturePlatform, type PlatformDetection } from "./platform";
import { extractSubstackFromUrl } from "./substack";
import { captureLinkedInUserText, extractLinkedInMetadataFromUrl } from "./linkedin";
import type { CapturedContent } from "./types";
import { CAPTURE_EXTRACTION_VERSION } from "./quality";
import { buildYoutubeUserTextCapture } from "./youtube-user-text";
import { meaningfulUserText as extractMeaningfulUserText } from "./user-provided";

export interface ExtractUrlCaptureInput {
  url: string;
  userText?: string | null;
  existingItem?: ItemRow | null;
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
  const pasted = meaningfulUserText(input.userText, input.url, detection.canonicalUrl);

  if (detection.videoId && pasted) {
    content = await buildYoutubeUserTextCapture({
      canonicalUrl: detection.canonicalUrl,
      platform: detection.platform === "youtube_short" ? "youtube_short" : "youtube",
      videoId: detection.videoId,
      userText: pasted,
      existingItem: input.existingItem,
    });
  } else if (detection.videoId) {
    content = await extractYoutubeVideo(detection.videoId, input.url);
  } else if (detection.platform === "substack") {
    content = await extractSubstackFromUrl(detection.canonicalUrl);
  } else if (detection.platform === "linkedin") {
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

export function meaningfulUserText(
  text: string | null | undefined,
  url: string,
  canonicalUrl?: string | null,
): string | null {
  try {
    return extractMeaningfulUserText(text, url, canonicalUrl ?? detectCapturePlatform(url).canonicalUrl);
  } catch {
    return extractMeaningfulUserText(text, url);
  }
}
