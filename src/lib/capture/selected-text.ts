import type { ItemRow } from "@/db/client";
import { CAPTURE_EXTRACTION_VERSION, platformLabel } from "./quality";
import { buildUserProvidedBody } from "./user-provided";
import type { CapturedContent, CapturePlatform } from "./types";

export interface BrowserSelectedTextInput {
  canonicalUrl: string;
  platform: CapturePlatform;
  selectedText: string;
  title?: string | null;
  existingItem?: ItemRow | null;
}

export function buildBrowserSelectedTextCapture(
  input: BrowserSelectedTextInput,
): CapturedContent {
  const existing = input.existingItem ?? null;
  const text = input.selectedText.trim();
  const title =
    existing?.title ||
    cleanTitle(input.title) ||
    firstLineTitle(text) ||
    `${platformLabel(input.platform)} selection`;

  return {
    title,
    author: existing?.author ?? null,
    source_url: input.canonicalUrl,
    body: buildUserProvidedBody({
      title,
      platform: input.platform,
      sourceUrl: input.canonicalUrl,
      text,
      captureQuality: "client_dom",
      providedBy: "browser selection",
      bodyHeading: "Selected text",
    }),
    extraction_warning: null,
    duration_seconds: existing?.duration_seconds ?? null,
    source_platform: input.platform,
    capture_quality: "client_dom",
    extraction_method: "browser_selected_text",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: existing?.published_at ?? null,
    thumbnail_url: existing?.thumbnail_url ?? null,
    description: existing?.description ?? "User-selected browser text.",
    artifacts: [
      {
        kind: "browser_selected_text",
        content_type: "text/plain",
        suggested_filename: "browser-selected-text.txt",
        body: text,
      },
    ],
  };
}

function cleanTitle(value: string | null | undefined): string | null {
  const title = value?.trim();
  if (!title) return null;
  return title.length > 200 ? `${title.slice(0, 197)}...` : title;
}

function firstLineTitle(body: string): string | null {
  const line = body.split(/\r?\n/, 1)[0]?.trim();
  if (!line) return null;
  return line.length > 80 ? `${line.slice(0, 77)}...` : line;
}
