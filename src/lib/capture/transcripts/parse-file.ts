import { MIN_REPAIR_TEXT_CHARS } from "@/lib/repair/item-repair";

export const MAX_TRANSCRIPT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TRANSCRIPT_FILE_TEXT_CHARS = 500_000;
export const MAX_TRANSCRIPT_FILE_SEGMENTS = 7_200;
export const TRANSCRIPT_FILE_PARSER_VERSION = "transcript-file-v1";

const ALLOWED_EXTENSIONS = [".vtt", ".srt", ".txt", ".md"] as const;
const ALLOWED_CONTENT_TYPES = new Set([
  "text/vtt",
  "application/x-subrip",
  "text/plain",
  "text/markdown",
]);

export type TranscriptFileExtension = (typeof ALLOWED_EXTENSIONS)[number];
export type ParsedTranscriptTimestampMode = "timestamped" | "paragraph_only";

export type TranscriptFileParseErrorCode =
  | "unsupported_transcript_file"
  | "transcript_file_too_large"
  | "text_too_short"
  | "text_too_large"
  | "too_many_segments"
  | "malformed_transcript_file";

export class TranscriptFileParseError extends Error {
  constructor(
    readonly code: TranscriptFileParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TranscriptFileParseError";
  }
}

export interface ParseTranscriptFileInput {
  filename: string;
  contentType?: string | null;
  bytes: Uint8Array;
}

export interface ParsedTranscriptSegment {
  idx: number;
  startMs: number | null;
  endMs: number | null;
  durationMs: number | null;
  text: string;
}

export interface ParsedTranscriptFile {
  originalFilename: string;
  extension: TranscriptFileExtension;
  contentType: string | null;
  normalizedText: string;
  timestampMode: ParsedTranscriptTimestampMode;
  segments: ParsedTranscriptSegment[];
}

export function parseTranscriptFile(input: ParseTranscriptFileInput): ParsedTranscriptFile {
  if (input.bytes.byteLength > MAX_TRANSCRIPT_FILE_BYTES) {
    throw new TranscriptFileParseError(
      "transcript_file_too_large",
      "Transcript files must be 2 MB or smaller.",
    );
  }

  const extension = extensionForFilename(input.filename);
  const contentType = normalizeContentType(input.contentType);
  if (!extension || !isAllowedContentType(contentType)) {
    throw new TranscriptFileParseError(
      "unsupported_transcript_file",
      "Use a .vtt, .srt, .txt, or .md transcript file.",
    );
  }

  const rawText = decodeUtf8(input.bytes);
  const parsed =
    extension === ".vtt"
      ? parseVtt(rawText)
      : extension === ".srt"
        ? parseSrt(rawText)
        : parsePlainParagraphs(rawText);

  const normalizedText = parsed.segments.map((segment) => segment.text).join("\n\n").trim();
  if (normalizedText.length > MAX_TRANSCRIPT_FILE_TEXT_CHARS) {
    throw new TranscriptFileParseError(
      "text_too_large",
      "Transcript text is too large.",
    );
  }
  if (usefulTextLength(normalizedText) < MIN_REPAIR_TEXT_CHARS) {
    throw new TranscriptFileParseError(
      "text_too_short",
      "Transcript needs more useful text.",
    );
  }
  if (parsed.segments.length > MAX_TRANSCRIPT_FILE_SEGMENTS) {
    throw new TranscriptFileParseError(
      "too_many_segments",
      "Transcript has too many segments for this version.",
    );
  }

  return {
    originalFilename: input.filename,
    extension,
    contentType,
    normalizedText,
    timestampMode: parsed.timestampMode,
    segments: parsed.segments,
  };
}

function extensionForFilename(filename: string): TranscriptFileExtension | null {
  const lower = filename.trim().toLowerCase();
  return ALLOWED_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? null;
}

function normalizeContentType(contentType: string | null | undefined): string | null {
  const cleaned = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return cleaned || null;
}

function isAllowedContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  return ALLOWED_CONTENT_TYPES.has(contentType) || contentType === "application/octet-stream";
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

function parseVtt(text: string): Pick<ParsedTranscriptFile, "timestampMode" | "segments"> {
  const segments: ParsedTranscriptSegment[] = [];
  for (const block of splitBlocks(text)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const first = lines[0].toUpperCase();
    if (
      first === "WEBVTT" ||
      first.startsWith("WEBVTT ") ||
      first === "NOTE" ||
      first.startsWith("NOTE ") ||
      first === "STYLE" ||
      first === "REGION"
    ) {
      continue;
    }

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) continue;
    const timing = parseTimingLine(lines[timeLineIndex], "vtt");
    if (!timing) continue;

    const cueText = cleanTranscriptText(lines.slice(timeLineIndex + 1).join("\n"));
    if (!cueText) continue;
    segments.push({
      idx: segments.length,
      startMs: timing.startMs,
      endMs: timing.endMs,
      durationMs: timing.endMs - timing.startMs,
      text: cueText,
    });
  }
  if (segments.length === 0) {
    throw new TranscriptFileParseError(
      "malformed_transcript_file",
      "This transcript file could not be parsed.",
    );
  }
  return { timestampMode: "timestamped", segments };
}

function parseSrt(text: string): Pick<ParsedTranscriptFile, "timestampMode" | "segments"> {
  const segments: ParsedTranscriptSegment[] = [];
  for (const block of splitBlocks(text)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) continue;
    const timing = parseTimingLine(lines[timeLineIndex], "srt");
    if (!timing) continue;
    const cueText = cleanTranscriptText(lines.slice(timeLineIndex + 1).join("\n"));
    if (!cueText) continue;
    segments.push({
      idx: segments.length,
      startMs: timing.startMs,
      endMs: timing.endMs,
      durationMs: timing.endMs - timing.startMs,
      text: cueText,
    });
  }
  if (segments.length === 0) {
    throw new TranscriptFileParseError(
      "malformed_transcript_file",
      "This transcript file could not be parsed.",
    );
  }
  return { timestampMode: "timestamped", segments };
}

function parsePlainParagraphs(
  text: string,
): Pick<ParsedTranscriptFile, "timestampMode" | "segments"> {
  const paragraphs = cleanTranscriptText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    throw new TranscriptFileParseError(
      "malformed_transcript_file",
      "This transcript file could not be parsed.",
    );
  }
  return {
    timestampMode: "paragraph_only",
    segments: paragraphs.map((text, idx) => ({
      idx,
      startMs: null,
      endMs: null,
      durationMs: null,
      text,
    })),
  };
}

function splitBlocks(text: string): string[] {
  return text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

function parseTimingLine(
  line: string,
  format: "vtt" | "srt",
): { startMs: number; endMs: number } | null {
  const [startRaw, endAndSettingsRaw] = line.split(/\s+-->\s+/);
  if (!startRaw || !endAndSettingsRaw) return null;
  const endRaw = endAndSettingsRaw.trim().split(/\s+/)[0];
  const startMs = parseTimestampMs(startRaw.trim(), format);
  const endMs = parseTimestampMs(endRaw.trim(), format);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return { startMs, endMs };
}

function parseTimestampMs(raw: string, format: "vtt" | "srt"): number | null {
  const normalized = format === "srt" ? raw.replace(",", ".") : raw;
  const parts = normalized.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;

  const [hours, minutes, secondsRaw] =
    parts.length === 3 ? parts : ["0", parts[0], parts[1]];
  const secondsParts = secondsRaw.split(".");
  if (secondsParts.length > 2) return null;
  const h = parseInteger(hours);
  const m = parseInteger(minutes);
  const s = parseInteger(secondsParts[0]);
  if (h === null || m === null || s === null || m > 59 || s > 59) return null;

  const fraction = secondsParts[1] ?? "0";
  if (!/^\d{1,3}$/.test(fraction)) return null;
  const ms = Number(fraction.padEnd(3, "0"));
  return h * 3_600_000 + m * 60_000 + s * 1_000 + ms;
}

function parseInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function cleanTranscriptText(text: string): string {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function usefulTextLength(text: string): number {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, "")
    .length;
}
