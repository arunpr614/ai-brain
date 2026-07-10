import { createHash } from "node:crypto";

export const NOTE_MAX_BYTES = 102_400;
export const NOTE_WARNING_BYTES = 92_160;
export const NOTE_MAX_URL_BYTES = 2_048;

export class NoteMarkdownError extends Error {
  constructor(
    readonly code: "NOTE_TOO_LARGE" | "NOTE_LINE_TOO_LONG" | "NOTE_URL_TOO_LONG",
    message: string,
  ) {
    super(message);
    this.name = "NoteMarkdownError";
  }
}

export interface NormalizedNoteMarkdown {
  markdown: string;
  plainText: string;
  contentHash: string;
  bytes: number;
  meaningful: boolean;
}

const DISALLOWED_CONTROL = /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MARKDOWN_LINK = /!?\[([^\]]*)\]\(([^)]+)\)/g;
const AUTOLINK = /<((?:https?:\/\/|mailto:)[^>]+)>/gi;

function assertBoundedMarkdown(markdown: string): void {
  for (const line of markdown.split("\n")) {
    if (new TextEncoder().encode(line).byteLength > NOTE_MAX_BYTES) {
      throw new NoteMarkdownError(
        "NOTE_LINE_TOO_LONG",
        "A single note line cannot exceed 100 KiB.",
      );
    }
  }

  for (const match of markdown.matchAll(MARKDOWN_LINK)) {
    const destination = match[2]?.trim() ?? "";
    if (new TextEncoder().encode(destination).byteLength > NOTE_MAX_URL_BYTES) {
      throw new NoteMarkdownError(
        "NOTE_URL_TOO_LONG",
        "A note link destination cannot exceed 2,048 bytes.",
      );
    }
  }
}

/**
 * Derive searchable text without retaining Markdown punctuation, raw HTML, or
 * link destinations. Preview rendering independently treats raw HTML as text.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(MARKDOWN_LINK, "$1")
    .replace(AUTOLINK, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
    .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, " ")
    .replace(/\[(?: |x|X)\]\s*/g, "")
    .replace(/[*_~\\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeMarkdown(input: string): NormalizedNoteMarkdown {
  const markdown = input
    .replace(/\r\n?/g, "\n")
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(DISALLOWED_CONTROL, "");
  const bytes = new TextEncoder().encode(markdown).byteLength;
  if (bytes > NOTE_MAX_BYTES) {
    throw new NoteMarkdownError(
      "NOTE_TOO_LARGE",
      "My notes can contain up to 100 KiB of text.",
    );
  }
  assertBoundedMarkdown(markdown);
  const plainText = markdownToPlainText(markdown);
  return {
    markdown,
    plainText,
    contentHash: createHash("sha256").update(markdown, "utf8").digest("hex"),
    bytes,
    meaningful: plainText.trim().length > 0,
  };
}

export function isSafeNoteUrl(value: string): boolean {
  const url = value.trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

