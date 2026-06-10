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

import crypto from "node:crypto";
import {
  findItemByUrl as realFindItemByUrl,
  insertCaptured as realInsertCaptured,
  updateItemCaptureContent as realUpdateItemCaptureContent,
} from "@/db/items";
import { findTelegramDocumentByUniqueId as realFindTelegramDocumentByUniqueId } from "@/db/telegram-updates";
import { saveCaptureArtifacts as realSaveCaptureArtifacts } from "@/lib/capture/artifacts";
import { extractUrlCapture as realExtractUrlCapture, meaningfulUserText } from "@/lib/capture/capture-url";
import { isDuplicateShare as realIsDuplicateShare, shareDedupKey } from "@/lib/capture/dedup";
import { extractPdf as realExtractPdf, PdfCaptureError } from "@/lib/capture/pdf";
import { UrlCaptureError } from "@/lib/capture/url";
import { YoutubeCaptureError } from "@/lib/capture/youtube";
import { detectCapturePlatform } from "@/lib/capture/platform";
import { logError } from "@/lib/errors/sink";
import {
  downloadFile as realDownloadFile,
  editMessageText as realEditMessageText,
  getFile as realGetFile,
  sendMessage as realSendMessage,
  TelegramTimeoutError,
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
  findTelegramDocumentByUniqueId: typeof realFindTelegramDocumentByUniqueId;
  isDuplicateShare: typeof realIsDuplicateShare;
  insertCaptured: typeof realInsertCaptured;
  updateItemCaptureContent: typeof realUpdateItemCaptureContent;
  saveCaptureArtifacts: typeof realSaveCaptureArtifacts;
  extractUrlCapture: typeof realExtractUrlCapture;
  extractPdf: typeof realExtractPdf;
}

const defaultDeps: DispatchDeps = {
  sendMessage: realSendMessage,
  editMessageText: realEditMessageText,
  getFile: realGetFile,
  downloadFile: realDownloadFile,
  findItemByUrl: realFindItemByUrl,
  findTelegramDocumentByUniqueId: realFindTelegramDocumentByUniqueId,
  isDuplicateShare: realIsDuplicateShare,
  insertCaptured: realInsertCaptured,
  updateItemCaptureContent: realUpdateItemCaptureContent,
  saveCaptureArtifacts: realSaveCaptureArtifacts,
  extractUrlCapture: realExtractUrlCapture,
  extractPdf: realExtractPdf,
};

function itemUrl(id: string): string {
  return `${PUBLIC_BASE_URL}/items/${id}`;
}

export type TelegramCaptureResult =
  | { status: "captured"; itemId: string; source: "url" | "youtube" | "note" | "pdf" }
  | { status: "duplicate"; itemId?: string; reason: string }
  | { status: "ignored"; reason: string }
  | { status: "failed"; reason: string; retryable: boolean };

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
): Promise<TelegramCaptureResult> {
  const chatId = msg.chat.id;

  // 1. Document (PDF) — most specific, check first.
  if (msg.document) {
    return captureDocument(msg, deps);
  }

  const command = extractBotCommand(msg);
  if (command) {
    await handleCommand(chatId, command, deps);
    return { status: "ignored", reason: `command:${command}` };
  }

  // 2. URL in text or caption.
  const url = extractFirstUrl(msg);
  if (url) {
    return captureUrl(chatId, url, msg.text ?? msg.caption ?? "", deps);
  }

  // 3. Plain text → note.
  const text = msg.text ?? msg.caption ?? "";
  if (text.trim().length >= NOTE_MIN_CHARS) {
    return captureNote(chatId, text, deps);
  }

  // 4. Anything else (very-short text, sticker, photo, etc.) — gentle nudge.
  await deps.sendMessage(
    chatId,
    "I can capture URLs, plain-text notes, and PDFs. Photos and voice messages aren't supported yet.",
  );
  return { status: "ignored", reason: "unsupported-message" };
}

function extractBotCommand(msg: TelegramMessage): string | null {
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities ?? msg.caption_entities ?? [];
  const entityCommand = entities.find((entity) => entity.type === "bot_command" && entity.offset === 0);
  if (entityCommand) {
    return text.slice(entityCommand.offset, entityCommand.offset + entityCommand.length).split("@", 1)[0];
  }
  const match = text.trimStart().match(/^\/[A-Za-z0-9_]+(?:@[A-Za-z0-9_]+)?/);
  return match ? match[0].split("@", 1)[0] : null;
}

async function handleCommand(
  chatId: number,
  command: string,
  deps: DispatchDeps,
): Promise<void> {
  if (command === "/start" || command === "/help") {
    await deps.sendMessage(
      chatId,
      "Send me a link, plain-text note, or PDF and I will save it to Brain.",
    );
    return;
  }
  await deps.sendMessage(
    chatId,
    "That command is not supported. Send a link, plain-text note, or PDF to capture it.",
  );
}

async function captureUrl(
  chatId: number,
  rawUrl: string,
  fullText: string,
  deps: DispatchDeps,
): Promise<TelegramCaptureResult> {
  const detection = detectCapturePlatform(rawUrl);
  const url = detection.canonicalUrl;
  const userText = meaningfulUserText(fullText, rawUrl);

  const existing = deps.findItemByUrl(url);
  if (existing && !userText) {
    await deps.sendMessage(
      chatId,
      `↩️ Already captured: ${existing.title || "(untitled)"}\n${itemUrl(existing.id)}`,
    );
    return { status: "duplicate", itemId: existing.id, reason: "url-exists" };
  }

  try {
    const extracted = await deps.extractUrlCapture({ url: rawUrl, userText: fullText });
    const { content } = extracted;

    if (existing && shouldUpgradeWeakCapture(existing.capture_quality, content.capture_quality)) {
      const item = deps.updateItemCaptureContent(existing.id, {
        title: content.title,
        body: content.body,
        author: content.author,
        extraction_warning: content.extraction_warning,
        duration_seconds: extracted.source_type === "youtube" ? content.duration_seconds ?? null : null,
        source_platform: content.source_platform ?? extracted.detection.platform,
        capture_quality: content.capture_quality ?? null,
        extraction_method: content.extraction_method ?? null,
        extraction_version: content.extraction_version ?? null,
        published_at: content.published_at ?? null,
        thumbnail_url: content.thumbnail_url ?? null,
        description: content.description ?? null,
      }) ?? existing;
      try {
        await deps.saveCaptureArtifacts(existing.id, content.artifacts);
      } catch (err) {
        logError({
          type: "capture.artifact-save-failed",
          item_id: existing.id,
          message: (err as Error).message,
          ts: Date.now(),
        });
      }
      await deps.sendMessage(chatId, `✅ Updated existing capture: ${item.title || "(untitled)"}\n${itemUrl(item.id)}`).catch((err) => {
        logError({
          type: "telegram.ack.failed",
          item_id: item.id,
          message: (err as Error).message,
          ts: Date.now(),
        });
      });
      return { status: "captured", itemId: item.id, source: extracted.source_type === "youtube" ? "youtube" : "url" };
    }

    const item = deps.insertCaptured({
      source_type: extracted.source_type,
      capture_source: "telegram",
      title: content.title,
      body: content.body,
      author: content.author,
      source_url: content.source_url,
      extraction_warning: content.extraction_warning,
      duration_seconds: extracted.source_type === "youtube" ? content.duration_seconds ?? null : null,
      source_platform: content.source_platform ?? extracted.detection.platform,
      capture_quality: content.capture_quality ?? null,
      extraction_method: content.extraction_method ?? null,
      extraction_version: content.extraction_version ?? null,
      published_at: content.published_at ?? null,
      thumbnail_url: content.thumbnail_url ?? null,
      description: content.description ?? null,
    });
    try {
      await deps.saveCaptureArtifacts(item.id, content.artifacts);
    } catch (err) {
      logError({
        type: "capture.artifact-save-failed",
        item_id: item.id,
        message: (err as Error).message,
        ts: Date.now(),
      });
    }

    const ackMessage = captureAckMessage(item.title, item.id, content.capture_quality, content.source_platform);

    await deps.sendMessage(chatId, ackMessage).catch((err) => {
      logError({
        type: "telegram.ack.failed",
        item_id: item.id,
        message: (err as Error).message,
        ts: Date.now(),
      });
    });
    return { status: "captured", itemId: item.id, source: extracted.source_type === "youtube" ? "youtube" : "url" };
  } catch (err) {
    if (err instanceof UrlCaptureError || err instanceof YoutubeCaptureError) {
      logError({
        type: "telegram.capture.url-failed",
        url,
        message: err.message,
        ts: Date.now(),
      });
      await deps.sendMessage(chatId, `Couldn't capture: ${err.message}`).catch(() => {});
      return { status: "failed", reason: err.message, retryable: false };
    }
    throw err;
  }
}

function shouldUpgradeWeakCapture(
  existingQuality: string | null | undefined,
  incomingQuality: string | null | undefined,
): boolean {
  return existingQuality === "metadata_only" &&
    incomingQuality === "user_provided_full_text";
}

function captureAckMessage(
  title: string,
  id: string,
  quality: string | null | undefined,
  platform: string | null | undefined,
): string {
  const link = itemUrl(id);
  if (platform === "youtube" || platform === "youtube_short") {
    if (quality === "metadata_only") {
      return `✅ Saved YouTube link as metadata only: ${title || "(untitled)"}\nTranscript extraction was blocked or unavailable.\n${link}`;
    }
  }
  if (platform === "linkedin") {
    if (quality === "metadata_only") {
      return `✅ Saved LinkedIn link as metadata only: ${title || "(untitled)"}\nFor full text, paste the post text with the link.\n${link}`;
    }
    if (quality === "user_provided_full_text") {
      return `✅ Saved LinkedIn post text: ${title || "(untitled)"}\n${link}`;
    }
  }
  if (platform === "substack" && quality === "paywall_preview") {
    return `✅ Saved Substack preview: ${title || "(untitled)"}\nFull text was not available from the public page.\n${link}`;
  }
  return `✅ Captured: ${title || "(untitled)"}\n${link}`;
}

async function captureNote(
  chatId: number,
  text: string,
  deps: DispatchDeps,
): Promise<TelegramCaptureResult> {
  const trimmed = text.trim();
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? trimmed;
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  const body = trimmed;
  const hash = crypto.createHash("sha256").update(`${title}\n${body}`).digest("hex").slice(0, 32);
  if (deps.isDuplicateShare(shareDedupKey("note", hash))) {
    await deps.sendMessage(chatId, "Already received that note.").catch(() => {});
    return { status: "duplicate", reason: "note-window" };
  }

  const item = deps.insertCaptured({
    source_type: "note",
    capture_source: "telegram",
    title,
    body,
    source_platform: "note",
    capture_quality: "user_provided_full_text",
    extraction_method: "manual_note",
    extraction_version: "capture-v0.7.5",
  });

  await deps.sendMessage(chatId, `✅ Saved as note\n${itemUrl(item.id)}`).catch((err) => {
    logError({
      type: "telegram.ack.failed",
      item_id: item.id,
      message: (err as Error).message,
      ts: Date.now(),
    });
  });
  return { status: "captured", itemId: item.id, source: "note" };
}

async function captureDocument(
  msg: TelegramMessage,
  deps: DispatchDeps,
): Promise<TelegramCaptureResult> {
  const chatId = msg.chat.id;
  const doc = msg.document!;

  if (doc.mime_type !== "application/pdf") {
    await deps.sendMessage(
      chatId,
      `⚠️ I only handle PDF documents right now. (Got: ${doc.mime_type ?? "unknown type"})`,
    );
    return { status: "ignored", reason: "unsupported-document" };
  }

  if (typeof doc.file_size === "number" && doc.file_size > PDF_MAX_BYTES) {
    await deps.sendMessage(
      chatId,
      `⚠️ PDF too large (${(doc.file_size / 1024 / 1024).toFixed(1)} MB). Max is 20 MB.`,
    );
    return { status: "failed", reason: "pdf-too-large", retryable: false };
  }

  const existing = deps.findTelegramDocumentByUniqueId(doc.file_unique_id);
  if (existing) {
    await deps.sendMessage(
      chatId,
      `↩️ Already captured: ${existing.title || "(untitled)"}\n${itemUrl(existing.id)}`,
    );
    return { status: "duplicate", itemId: existing.id, reason: "document-exists" };
  }

  let ackMessageId: number | null = null;
  let downloadedSha256: string | null = null;
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
    if (bytes.byteLength > PDF_MAX_BYTES) {
      throw new PdfCaptureError(
        "extract_failed",
        `PDF too large (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB). Max is 20 MB.`,
      );
    }
    downloadedSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const extracted = await deps.extractPdf({
      bytes,
      filename: doc.file_name ?? "telegram.pdf",
    });

    const item = deps.insertCaptured({
      source_type: "pdf",
      capture_source: "telegram",
      title: extracted.title,
      body: extracted.body,
      author: extracted.author,
      total_pages: extracted.total_pages,
      total_chars: extracted.total_chars,
      extraction_warning: extracted.extraction_warning,
      captured_at: extracted.created_at ?? undefined,
      source_platform: "pdf",
      capture_quality: "full_text",
      extraction_method: "pdf",
      extraction_version: "capture-v0.7.5",
    });

    const successMsg = `✅ Captured: ${item.title || "(untitled)"}\n${itemUrl(item.id)}`;
    if (ackMessageId !== null) {
      await deps.editMessageText(chatId, ackMessageId, successMsg).catch(() => {
        return deps.sendMessage(chatId, successMsg);
      });
    } else {
      await deps.sendMessage(chatId, successMsg);
    }
    return { status: "captured", itemId: item.id, source: "pdf" };
  } catch (err) {
    const retryable = err instanceof TelegramTimeoutError;
    const message = err instanceof PdfCaptureError ? err.message : "PDF extraction failed";
    logError({
      type: "telegram.capture.pdf-failed",
      file_name: doc.file_name,
      file_size: doc.file_size,
      sha256: downloadedSha256,
      message: (err as Error).message,
      retryable,
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
    return { status: "failed", reason: message, retryable };
  }
}
