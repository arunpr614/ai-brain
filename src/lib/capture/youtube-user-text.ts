import type { ItemRow } from "@/db/client";
import { CAPTURE_EXTRACTION_VERSION } from "./quality";
import { buildUserProvidedBody } from "./user-provided";
import { fetchYoutubeDataApiMetadata } from "./youtube-metadata";
import type { CapturedContent } from "./types";

export interface YoutubeUserTextInput {
  canonicalUrl: string;
  platform: "youtube" | "youtube_short";
  videoId: string;
  userText: string;
  existingItem?: ItemRow | null;
}

export async function buildYoutubeUserTextCapture(
  input: YoutubeUserTextInput,
): Promise<CapturedContent> {
  const existing = input.existingItem ?? null;
  const metadata = existing ? null : await fetchYoutubeDataApiMetadata(input.videoId);
  const title = existing?.title || metadata?.title || "YouTube video";
  const author = existing?.author ?? metadata?.channelTitle ?? null;
  const durationSeconds = existing?.duration_seconds ?? metadata?.durationSeconds ?? null;
  const publishedAt = existing?.published_at ??
    (metadata?.publishedAt ? Date.parse(metadata.publishedAt) : null);
  const thumbnailUrl = existing?.thumbnail_url ?? metadata?.thumbnailUrl ?? null;
  const description = existing?.description ?? metadata?.description ?? "User-provided YouTube text.";

  const body = buildUserProvidedBody({
    title,
    platform: input.platform,
    sourceUrl: input.canonicalUrl,
    text: input.userText,
    captureQuality: "user_provided_full_text",
  });

  const artifacts: CapturedContent["artifacts"] = [
    {
      kind: "user_provided_text",
      content_type: "text/plain",
      suggested_filename: "youtube-user-provided-text.txt",
      body: input.userText,
    },
  ];
  if (metadata) {
    artifacts.push({
      kind: "youtube_data_api_json",
      content_type: "application/json",
      suggested_filename: "youtube-data-api.json",
      body: JSON.stringify(metadata.raw, null, 2),
    });
  }

  return {
    title,
    author,
    duration_seconds: durationSeconds,
    source_url: input.canonicalUrl,
    body,
    extraction_warning: null,
    source_platform: input.platform,
    capture_quality: "user_provided_full_text",
    extraction_method: "youtube_user_provided_text",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: Number.isFinite(publishedAt) ? publishedAt : null,
    thumbnail_url: thumbnailUrl,
    description,
    artifacts,
  };
}
