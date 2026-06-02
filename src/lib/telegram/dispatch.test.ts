/**
 * Unit tests for src/lib/telegram/dispatch.ts (v0.6.5).
 *
 * Uses dependency injection (DispatchDeps) to swap stubs in for the
 * downstream capture helpers + Telegram client. We're NOT testing the
 * underlying capture pipeline here — those have their own coverage.
 * We're testing that the dispatcher routes correctly and produces the
 * right ack messages.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleCaptureMessage, type DispatchDeps } from "./dispatch";
import type { TelegramMessage } from "./types";

const CHAT_ID = 1;

interface SentMessage {
  chatId: number;
  text: string;
}

interface InsertedItem {
  source_type: string;
  title: string;
  body: string;
}

function buildDeps(overrides: Partial<DispatchDeps> = {}) {
  const sent: SentMessage[] = [];
  const inserted: InsertedItem[] = [];
  let urlExtractCalls = 0;

  const deps: DispatchDeps = {
    sendMessage: async (chatId, text) => {
      sent.push({ chatId, text });
      return {
        message_id: 99,
        chat: { id: chatId, type: "private" as const },
        date: 0,
      };
    },
    editMessageText: async () => true,
    getFile: async () => ({ file_id: "x", file_unique_id: "y", file_path: "documents/foo.pdf" }),
    downloadFile: async () => new ArrayBuffer(8),
    findItemByUrl: () => null,
    insertCaptured: ((input: { source_type: string; title: string; body: string; author?: string | null; source_url?: string | null; total_pages?: number | null; total_chars?: number | null; extraction_warning?: string | null; duration_seconds?: number | null }) => {
      inserted.push({ source_type: input.source_type, title: input.title, body: input.body });
      return {
        id: "abc123",
        source_type: input.source_type,
        title: input.title,
        body: input.body,
        author: input.author ?? null,
        source_url: input.source_url ?? null,
        summary: null,
        quotes: null,
        category: null,
        captured_at: Date.now(),
        enriched_at: null,
        total_pages: input.total_pages ?? null,
        total_chars: input.total_chars ?? input.body.length,
        extraction_warning: input.extraction_warning ?? null,
        duration_seconds: input.duration_seconds ?? null,
      };
    }) as unknown as DispatchDeps["insertCaptured"],
    extractArticleFromUrl: (async () => {
      urlExtractCalls++;
      return {
        title: "An Example Article",
        body: "Body text here",
        author: null,
        source_url: "https://example.com/post",
        excerpt: null,
        html_length: 100,
        extraction_warning: null,
      };
    }) as DispatchDeps["extractArticleFromUrl"],
    extractYoutubeVideo: async () => ({
      title: "YT Title",
      body: "transcript",
      author: "Channel",
      source_url: "https://www.youtube.com/watch?v=abc",
      extraction_warning: null,
      duration_seconds: 120,
    }),
    extractPdf: async () => ({
      title: "PDF Title",
      body: "pdf body",
      author: null,
      total_pages: 3,
      total_chars: 8,
      extraction_warning: null,
      created_at: Date.now(),
    }) as never,
    ...overrides,
  };

  return {
    deps,
    sent,
    inserted,
    urlExtractCalls: () => urlExtractCalls,
  };
}

function msg(extra: Partial<TelegramMessage>): TelegramMessage {
  return {
    message_id: 1,
    chat: { id: CHAT_ID, type: "private" },
    date: 0,
    ...extra,
  };
}

describe("telegram/dispatch.handleCaptureMessage", () => {
  it("routes URL in entities to URL capture", async () => {
    const t = buildDeps();
    await handleCaptureMessage(
      msg({
        text: "https://example.com/post",
        entities: [{ type: "url", offset: 0, length: 24 }],
      }),
      t.deps,
    );
    assert.equal(t.urlExtractCalls(), 1);
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "url");
    assert.match(t.sent[0].text, /✅ Captured:.*An Example Article/);
    assert.match(t.sent[0].text, /brain\.arunp\.in\/items\/abc123/);
  });

  it("falls back to URL regex when entities are absent", async () => {
    const t = buildDeps();
    await handleCaptureMessage(msg({ text: "Look at this https://example.com/post please" }), t.deps);
    assert.equal(t.urlExtractCalls(), 1);
    assert.equal(t.inserted.length, 1);
  });

  it("replies 'already captured' on duplicate URL without inserting", async () => {
    const t = buildDeps({
      findItemByUrl: (() => ({
        id: "existing-id",
        source_type: "url" as const,
        title: "Old Capture",
        body: "",
        author: null,
        source_url: "https://example.com/post",
        summary: null,
        quotes: null,
        category: null,
        captured_at: 0,
        enriched_at: null,
        total_pages: null,
        total_chars: 0,
        extraction_warning: null,
        duration_seconds: null,
      })) as unknown as DispatchDeps["findItemByUrl"],
    });
    await handleCaptureMessage(
      msg({ text: "https://example.com/post", entities: [{ type: "url", offset: 0, length: 24 }] }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.equal(t.urlExtractCalls(), 0);
    assert.match(t.sent[0].text, /↩️ Already captured:.*Old Capture/);
  });

  it("routes plain text (no URL) to note capture", async () => {
    const t = buildDeps();
    await handleCaptureMessage(msg({ text: "remember to ask Jess about offsite" }), t.deps);
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "note");
    assert.equal(t.inserted[0].title, "remember to ask Jess about offsite");
    assert.match(t.sent[0].text, /✅ Saved as note/);
  });

  it("uses first line as title for multi-line notes", async () => {
    const t = buildDeps();
    await handleCaptureMessage(msg({ text: "First line title\n\nlonger body content here" }), t.deps);
    assert.equal(t.inserted[0].title, "First line title");
    assert.match(t.inserted[0].body, /First line title\n\nlonger body/);
  });

  it("nudges back instead of capturing very short text", async () => {
    const t = buildDeps();
    await handleCaptureMessage(msg({ text: "ok" }), t.deps);
    assert.equal(t.inserted.length, 0);
    assert.match(t.sent[0].text, /can capture URLs, plain-text notes, and PDFs/);
  });

  it("rejects non-PDF documents with explanatory message", async () => {
    const t = buildDeps();
    await handleCaptureMessage(
      msg({
        document: {
          file_id: "x",
          file_unique_id: "y",
          file_name: "image.png",
          mime_type: "image/png",
          file_size: 1024,
        },
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.match(t.sent[0].text, /only handle PDF/);
  });

  it("rejects oversize PDF without downloading", async () => {
    const t = buildDeps();
    await handleCaptureMessage(
      msg({
        document: {
          file_id: "x",
          file_unique_id: "y",
          file_name: "huge.pdf",
          mime_type: "application/pdf",
          file_size: 30 * 1024 * 1024,
        },
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.match(t.sent[0].text, /PDF too large.*30\.0 MB/);
  });

  it("captures PDF: ack → extract → success edit", async () => {
    const t = buildDeps();
    await handleCaptureMessage(
      msg({
        document: {
          file_id: "x",
          file_unique_id: "y",
          file_name: "doc.pdf",
          mime_type: "application/pdf",
          file_size: 50_000,
        },
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "pdf");
    assert.match(t.sent[0].text, /📄 Capturing PDF/);
  });
});
