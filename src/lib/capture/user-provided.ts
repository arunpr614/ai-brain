import { platformLabel } from "./quality";
import type { CapturePlatform, CaptureQuality } from "./types";

export const USER_PROVIDED_MIN_WORDS = 8;
export const USER_PROVIDED_MAX_CHARS = 100_000;

export interface UserProvidedTextAnalysis {
  text: string;
  wordCount: number;
  charCount: number;
  isMeaningful: boolean;
  tooLong: boolean;
}

export interface UserProvidedBodyInput {
  title: string;
  platform: CapturePlatform | string | null | undefined;
  sourceUrl: string;
  text: string;
  captureQuality?: CaptureQuality;
}

export function analyzeUserProvidedText(
  rawText: string | null | undefined,
  sourceUrl: string,
  canonicalUrl?: string | null,
): UserProvidedTextAnalysis {
  const text = removeSourceUrls(rawText ?? "", sourceUrl, canonicalUrl);
  const wordCount = countWords(text);
  const tooLong = text.length > USER_PROVIDED_MAX_CHARS;
  return {
    text,
    wordCount,
    charCount: text.length,
    isMeaningful: wordCount >= USER_PROVIDED_MIN_WORDS && !tooLong,
    tooLong,
  };
}

export function meaningfulUserText(
  rawText: string | null | undefined,
  sourceUrl: string,
  canonicalUrl?: string | null,
): string | null {
  const analysis = analyzeUserProvidedText(rawText, sourceUrl, canonicalUrl);
  return analysis.isMeaningful ? analysis.text : null;
}

export function buildUserProvidedBody(input: UserProvidedBodyInput): string {
  const quality = input.captureQuality ?? "user_provided_full_text";
  return [
    `Title: ${input.title}`,
    `Source: ${platformLabel(input.platform)}`,
    `URL: ${input.sourceUrl}`,
    `Capture quality: ${quality}`,
    "Provided by: user paste",
    "",
    "Pasted text:",
    input.text.trim(),
  ].join("\n");
}

function removeSourceUrls(
  rawText: string,
  sourceUrl: string,
  canonicalUrl?: string | null,
): string {
  let cleaned = normalizeLineEndings(rawText);
  for (const url of urlVariants(sourceUrl, canonicalUrl)) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(url), "gi"), " ");
  }
  return cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, USER_PROVIDED_MAX_CHARS + 1);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function urlVariants(sourceUrl: string, canonicalUrl?: string | null): string[] {
  const values = new Set<string>();
  for (const candidate of [sourceUrl, canonicalUrl]) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    values.add(trimmed);
    try {
      const parsed = new URL(trimmed);
      const withoutTrailingSlash = parsed.toString().replace(/\/$/, "");
      values.add(withoutTrailingSlash);
      if (parsed.hostname.startsWith("www.")) {
        parsed.hostname = parsed.hostname.slice(4);
        values.add(parsed.toString());
        values.add(parsed.toString().replace(/\/$/, ""));
      }
    } catch {
      // Non-URL values are still removed by exact string above.
    }
  }
  return Array.from(values).sort((a, b) => b.length - a.length);
}

function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
