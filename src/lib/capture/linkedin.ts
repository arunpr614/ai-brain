import { CAPTURE_EXTRACTION_VERSION } from "./quality";
import { CaptureFetchError, fetchPublicHtml } from "./http";
import { extractOpenGraph } from "./opengraph";
import type { CapturedContent } from "./types";

export async function extractLinkedInMetadataFromUrl(url: string): Promise<CapturedContent> {
  try {
    const html = await fetchPublicHtml(url);
    const og = extractOpenGraph(html, url);
    const title = og.title ?? "LinkedIn link";
    const description = og.description ?? "LinkedIn metadata was saved. Full text requires pasted or browser-captured content.";
    return {
      title,
      author: og.siteName ?? "LinkedIn",
      source_url: og.canonicalUrl ?? url,
      body: buildLinkedInBody({
        title,
        description,
        sourceUrl: og.canonicalUrl ?? url,
        body: description,
        quality: "metadata_only",
      }),
      extraction_warning: null,
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: CAPTURE_EXTRACTION_VERSION,
      published_at: null,
      thumbnail_url: og.image,
      description,
      artifacts: [
        {
          kind: "metadata_json",
          content_type: "application/json",
          suggested_filename: "linkedin-metadata.json",
          body: JSON.stringify(
            {
              title: og.title,
              description: og.description,
              canonicalUrl: og.canonicalUrl ?? url,
              image: og.image,
              siteName: og.siteName,
              html_retained: false,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (err) {
    if (!(err instanceof CaptureFetchError)) throw err;
    const title = "LinkedIn link";
    const description = "LinkedIn metadata could not be read from the server. Paste the post text with the link to save the full content.";
    return {
      title,
      author: "LinkedIn",
      source_url: url,
      body: buildLinkedInBody({
        title,
        description,
        sourceUrl: url,
        body: description,
        quality: "metadata_only",
      }),
      extraction_warning: "linkedin_metadata_fetch_failed",
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: CAPTURE_EXTRACTION_VERSION,
      published_at: null,
      thumbnail_url: null,
      description,
    };
  }
}

export function captureLinkedInUserText(url: string, userText: string): CapturedContent {
  const body = userText.trim();
  const title = firstLineTitle(body) ?? "LinkedIn post";
  return {
    title,
    author: "LinkedIn",
    source_url: url,
    body: buildLinkedInBody({
      title,
      description: "User-provided LinkedIn post text.",
      sourceUrl: url,
      body,
      quality: "user_provided_full_text",
    }),
    extraction_warning: null,
    source_platform: "linkedin",
    capture_quality: "user_provided_full_text",
    extraction_method: "user_paste",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: null,
    thumbnail_url: null,
    description: "User-provided LinkedIn post text.",
    artifacts: [
      {
        kind: "user_text",
        content_type: "text/plain",
        suggested_filename: "linkedin-user-text.txt",
        body,
      },
    ],
  };
}

function buildLinkedInBody(input: {
  title: string;
  description: string;
  sourceUrl: string;
  body: string;
  quality: "metadata_only" | "user_provided_full_text";
}): string {
  return [
    `LinkedIn post`,
    `Title: ${input.title}`,
    `URL: ${input.sourceUrl}`,
    `Capture quality: ${input.quality}`,
    "",
    input.quality === "metadata_only" ? "Preview:" : "Post text:",
    input.body,
    "",
    input.description,
  ].join("\n");
}

function firstLineTitle(body: string): string | null {
  const line = body.split(/\r?\n/, 1)[0]?.trim();
  if (!line) return null;
  return line.length > 80 ? `${line.slice(0, 77)}...` : line;
}
