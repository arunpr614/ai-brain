/**
 * Telegram message → capture dispatch (v0.6.5).
 *
 * Inspects an incoming TelegramMessage and routes it to the right
 * capture path: URL, note, or PDF. Sends an acknowledgement back via
 * the Telegram API.
 *
 * The owner allowlist check happens upstream in the webhook route —
 * by the time we get here, the message is from the owner.
 *
 * Design note: we call the existing capture helpers DIRECTLY (the
 * same `extractArticleFromUrl`, `extractYoutubeVideo`, `extractPdf`,
 * `insertCaptured` that the HTTP capture endpoints use). No internal
 * HTTP round-trip, no proxy hop. The webhook is just another caller
 * of the capture pipeline.
 *
 * Dependencies are injected via the `deps` parameter so the unit
 * tests can swap them out without ESM module-namespace mocking
 * gymnastics. Production callers omit the parameter and get the
 * real wiring.
 */

import { findItemByUrl as realFindItemByUrl, insertCaptured as realInsertCaptured } from "@/db/items";
import { extractPdf as realExtractPdf, PdfCaptureError } from "@/lib/capture/pdf";
import { extractArticleFromUrl as realExtractArticleFromUrl, UrlCaptureError } from "@/lib/capture/url";
import type { CapturedContent } from "@/lib/capture/types";
import {
  canonicalYoutubeUrl,
  extractVideoId,
  extractYoutubeVideo as realExtractYoutubeVideo,
  YoutubeCaptureError,
} from "@/lib/capture/youtube";
import { logError } from "@/lib/errors/sink";
import {
  downloadFile as realDownloadFile,
  editMessageText as realEditMessageText,
  getFile as realGetFile,
  sendMessage as realSendMessage,
} from "./client";
import type { TelegramMessage } from "./types";

const PUBLIC_BASE_URL = "https://brain.arunp.in";
const PDF_MAX_BYTES = 20 * 1024 * 1024; // Telegram's bot API caps document download at 20 MB.
const NOTE_MIN_CHARS = 3;

export interface DispatchDeps {
  sendMessage: typeof realSendMessage;
  editMessageText: typeof realEditMessageText;
  getFile: typeof realGetFile;
  downloadFile: typeof realDownloadFile;
  findItemByUrl: typeof realFindItemByUrl;
  insertCaptured: typeof realInsertCaptured;
  extractArticleFromUrl: typeof realExtractArticleFromUrl;
  extractYoutubeVideo: typeof realExtractYoutubeVideo;
  extractPdf: typeof realExtractPdf;
}

const defaultDeps: DispatchDeps = {
  sendMessage: realSendMessage,
  editMessageText: realEditMessageText,
  getFile: realGetFile,
  downloadFile: realDownloadFile,
  findItemByUrl: realFindItemByUrl,
  insertCaptured: realInsertCaptured,
  extractArticleFromUrl: realExtractArticleFromUrl,
  extractYoutubeVideo: realExtractYoutubeVideo,
  extractPdf: realExtractPdf,
};

function itemUrl(id: string): string {
  return `${PUBLIC_BASE_URL}/items/${id}`;
}

/**
 * Find the first URL in the message — checks `entities` and
 * `caption_entities` for type='url' or 'text_link'. Falls back to a
 * loose regex on the text body for plain pastes that Telegram's
 * client didn't auto-annotate.
 */
function extractFirstUrl(msg: TelegramMessage): string | null {
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities ?? msg.caption_entities ?? [];

  for (const e of entities) {
    if (e.type === "text_link" && e.url) return e.url;
    if (e.type === "url") return text.slice(e.offset, e.offset + e.length);
  }

  const match = text.match(/https?:\/\/[^\s<>"]+/i);
  return match ? match[0] : null;
}

export async function handleCaptureMessage(
  msg: TelegramMessage,
  deps: DispatchDeps = defaultDeps,
): Promise<void> {
  const chatId = msg.chat.id;

  // 1. Document (PDF) — most specific, check first.
  if (msg.document) {
    await captureDocument(msg, deps);
    return;
  }

  // 2. URL in text or caption.
  const url = extractFirstUrl(msg);
  if (url) {
    await captureUrl(chatId, url, deps);
    return;
  }

  // 3. Plain text → note.
  const text = msg.text ?? msg.caption ?? "";
  if (text.trim().length >= NOTE_MIN_CHARS) {
    await captureNote(chatId, text, deps);
    return;
  }

  // 4. Anything else (very-short text, sticker, photo, etc.) — gentle nudge.
  await deps.sendMessage(
    chatId,
    "🤔 I can capture URLs, plain-text notes, and PDFs. Photos and voice messages aren't supported yet.",
  );
}

async function captureUrl(chatId: number, rawUrl: string, deps: DispatchDeps): Promise<void> {
  const videoId = extractVideoId(rawUrl);
  const url = videoId ? canonicalYoutubeUrl(videoId) : rawUrl;

  const existing = deps.findItemByUrl(url);
  if (existing) {
    await deps.sendMessage(
      chatId,
      `↩️ Already captured: ${existing.title || "(untitled)"}\n${itemUrl(existing.id)}`,
    );
    return;
  }

  try {
    const content: CapturedContent = videoId
      ? await deps.extractYoutubeVideo(videoId, rawUrl)
      : await deps.extractArticleFromUrl(url);

    const item = deps.insertCaptured({
      source_type: videoId ? "youtube" : "url",
      title: content.title,
      body: content.body,
      author: content.author,
      source_url: content.source_url,
      extraction_warning: content.extraction_warning,
      duration_seconds: videoId ? content.duration_seconds ?? null : null,
    });

    await deps.sendMessage(
      chatId,
      `✅ Captured: ${item.title || "(untitled)"}\n${itemUrl(item.id)}`,
    );
  } catch (err) {
    if (err instanceof UrlCaptureError || err instanceof YoutubeCaptureError) {
      logError({
        type: "telegram.capture.url-failed",
        url,
        message: err.message,
        ts: Date.now(),
      });
      await deps.sendMessage(chatId, `⚠️ Couldn't capture: ${err.message}`);
      return;
    }
    throw err;
  }
}

async function captureNote(chatId: number, text: string, deps: DispatchDeps): Promise<void> {
  const trimmed = text.trim();
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? trimmed;
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  const body = trimmed;

  const item = deps.insertCaptured({
    source_type: "note",
    title,
    body,
  });

  await deps.sendMessage(chatId, `✅ Saved as note\n${itemUrl(item.id)}`);
}

async function captureDocument(msg: TelegramMessage, deps: DispatchDeps): Promise<void> {
  const chatId = msg.chat.id;
  const doc = msg.document!;

  if (doc.mime_type !== "application/pdf") {
    await deps.sendMessage(
      chatId,
      `⚠️ I only handle PDF documents right now. (Got: ${doc.mime_type ?? "unknown type"})`,
    );
    return;
  }

  if (typeof doc.file_size === "number" && doc.file_size > PDF_MAX_BYTES) {
    await deps.sendMessage(
      chatId,
      `⚠️ PDF too large (${(doc.file_size / 1024 / 1024).toFixed(1)} MB). Max is 20 MB.`,
    );
    return;
  }

  let ackMessageId: number | null = null;
  try {
    const ack = await deps.sendMessage(chatId, "📄 Capturing PDF…");
    ackMessageId = ack.message_id;
  } catch {
    // sendMessage failed; proceed without progress feedback.
  }

  try {
    const file = await deps.getFile(doc.file_id);
    if (!file.file_path) {
      throw new PdfCaptureError("extract_failed", "Telegram returned no file_path");
    }
    const buf = await deps.downloadFile(file.file_path);
    const bytes = new Uint8Array(buf);
    const extracted = await deps.extractPdf({
      bytes,
      filename: doc.file_name ?? "telegram.pdf",
    });

    const item = deps.insertCaptured({
      source_type: "pdf",
      title: extracted.title,
      body: extracted.body,
      author: extracted.author,
      total_pages: extracted.total_pages,
      total_chars: extracted.total_chars,
      extraction_warning: extracted.extraction_warning,
      captured_at: extracted.created_at ?? undefined,
    });

    const successMsg = `✅ Captured: ${item.title || "(untitled)"}\n${itemUrl(item.id)}`;
    if (ackMessageId !== null) {
      await deps.editMessageText(chatId, ackMessageId, successMsg).catch(() => {
        return deps.sendMessage(chatId, successMsg);
      });
    } else {
      await deps.sendMessage(chatId, successMsg);
    }
  } catch (err) {
    const message = err instanceof PdfCaptureError ? err.message : "PDF extraction failed";
    logError({
      type: "telegram.capture.pdf-failed",
      file_name: doc.file_name,
      file_size: doc.file_size,
      message: (err as Error).message,
      ts: Date.now(),
    });
    const failMsg = `⚠️ Couldn't capture PDF: ${message}`;
    if (ackMessageId !== null) {
      await deps.editMessageText(chatId, ackMessageId, failMsg).catch(() => {
        return deps.sendMessage(chatId, failMsg);
      });
    } else {
      await deps.sendMessage(chatId, failMsg);
    }
  }
}
