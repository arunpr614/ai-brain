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
  capture_source?: string;
  title: string;
  body: string;
  source_platform?: string | null;
  capture_quality?: string | null;
}

function buildDeps(overrides: Partial<DispatchDeps> = {}) {
  const sent: SentMessage[] = [];
  const inserted: InsertedItem[] = [];
  const updated: InsertedItem[] = [];
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
    findTelegramDocumentByUniqueId: () => null,
    isDuplicateShare: () => false,
    insertCaptured: ((input: { source_type: string; capture_source?: string; title: string; body: string; author?: string | null; source_url?: string | null; total_pages?: number | null; total_chars?: number | null; extraction_warning?: string | null; duration_seconds?: number | null; source_platform?: string | null; capture_quality?: string | null; extraction_method?: string | null; extraction_version?: string | null; published_at?: number | null; thumbnail_url?: string | null; description?: string | null }) => {
      inserted.push({
        source_type: input.source_type,
        capture_source: input.capture_source,
        title: input.title,
        body: input.body,
        source_platform: input.source_platform ?? null,
        capture_quality: input.capture_quality ?? null,
      });
      return {
        id: "abc123",
        source_type: input.source_type,
        capture_source: "telegram",
        title: input.title,
        body: input.body,
        author: input.author ?? null,
        source_url: input.source_url ?? null,
        summary: null,
        quotes: null,
        category: null,
        captured_at: Date.now(),
        enriched_at: null,
        enrichment_state: "pending",
        total_pages: input.total_pages ?? null,
        total_chars: input.total_chars ?? input.body.length,
        extraction_warning: input.extraction_warning ?? null,
        duration_seconds: input.duration_seconds ?? null,
        source_platform: input.source_platform ?? null,
        capture_quality: input.capture_quality ?? null,
        extraction_method: input.extraction_method ?? null,
        extraction_version: input.extraction_version ?? null,
        published_at: input.published_at ?? null,
        thumbnail_url: input.thumbnail_url ?? null,
        description: input.description ?? null,
        batch_id: null,
      };
    }) as unknown as DispatchDeps["insertCaptured"],
    updateItemCaptureContent: ((id: string, input: { title: string; body: string; author?: string | null; extraction_warning?: string | null; duration_seconds?: number | null; source_platform?: string | null; capture_quality?: string | null; extraction_method?: string | null; extraction_version?: string | null; published_at?: number | null; thumbnail_url?: string | null; description?: string | null }) => {
      updated.push({
        source_type: "url",
        capture_source: "telegram",
        title: input.title,
        body: input.body,
        source_platform: input.source_platform ?? null,
        capture_quality: input.capture_quality ?? null,
      });
      return {
        id,
        source_type: "url" as const,
        capture_source: "telegram" as const,
        title: input.title,
        body: input.body,
        author: input.author ?? null,
        source_url: "https://www.linkedin.com/posts/example",
        summary: null,
        quotes: null,
        category: null,
        captured_at: Date.now(),
        enriched_at: null,
        enrichment_state: "pending" as const,
        total_pages: null,
        total_chars: input.body.length,
        extraction_warning: input.extraction_warning ?? null,
        duration_seconds: input.duration_seconds ?? null,
        source_platform: input.source_platform ?? null,
        capture_quality: input.capture_quality ?? null,
        extraction_method: input.extraction_method ?? null,
        extraction_version: input.extraction_version ?? null,
        published_at: input.published_at ?? null,
        thumbnail_url: input.thumbnail_url ?? null,
        description: input.description ?? null,
        batch_id: null,
      };
    }) as unknown as DispatchDeps["updateItemCaptureContent"],
    saveCaptureArtifacts: async () => [],
    extractUrlCapture: (async () => {
      urlExtractCalls++;
      return {
        detection: {
          platform: "generic_article",
          canonicalUrl: "https://example.com/post",
          sourceType: "url",
        },
        source_type: "url",
        content: {
          title: "An Example Article",
          body: "Body text here",
          author: null,
          source_url: "https://example.com/post",
          extraction_warning: null,
          source_platform: "generic_article",
          capture_quality: "full_text",
          extraction_method: "readability",
          extraction_version: "capture-v0.7.5",
        },
      };
    }) as DispatchDeps["extractUrlCapture"],
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
    updated,
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
    const result = await handleCaptureMessage(
      msg({
        text: "https://example.com/post",
        entities: [{ type: "url", offset: 0, length: 24 }],
      }),
      t.deps,
    );
    assert.deepEqual(result, { status: "captured", itemId: "abc123", source: "url" });
    assert.equal(t.urlExtractCalls(), 1);
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "url");
    assert.equal(t.inserted[0].capture_source, "telegram");
    assert.match(t.sent[0].text, /✅ Captured:.*An Example Article/);
    assert.match(t.sent[0].text, /brain\.arunp\.in\/items\/abc123/);
  });

  it("falls back to URL regex when entities are absent", async () => {
    const t = buildDeps();
    await handleCaptureMessage(msg({ text: "Look at this https://example.com/post please" }), t.deps);
    assert.equal(t.urlExtractCalls(), 1);
    assert.equal(t.inserted.length, 1);
  });

  it("captures YouTube anti-bot fallback as metadata-only with a clear acknowledgement", async () => {
    const t = buildDeps({
      extractUrlCapture: async () => ({
        detection: {
          platform: "youtube",
          canonicalUrl: "https://www.youtube.com/watch?v=abc12345678",
          videoId: "abc12345678",
          sourceType: "youtube",
        },
        source_type: "youtube",
        content: {
          title: "Public video from oEmbed",
          body: "[Transcript unavailable: YouTube blocked Brain's server transcript request with an anti-bot sign-in check.]",
          author: "Helpful Channel",
          source_url: "https://www.youtube.com/watch?v=abc12345678",
          extraction_warning: "youtube_antibot_metadata_only",
          duration_seconds: null,
          source_platform: "youtube",
          capture_quality: "metadata_only",
          extraction_method: "youtube_oembed_metadata",
          extraction_version: "capture-v0.7.5",
        },
      }),
    });

    const result = await handleCaptureMessage(
      msg({ text: "https://youtu.be/abc12345678" }),
      t.deps,
    );

    assert.deepEqual(result, { status: "captured", itemId: "abc123", source: "youtube" });
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "youtube");
    assert.equal(t.inserted[0].capture_source, "telegram");
    assert.match(t.sent[0].text, /Saved YouTube link as metadata only/);
    assert.match(t.sent[0].text, /Transcript extraction was blocked or unavailable/);
    assert.match(t.sent[0].text, /brain\.arunp\.in\/items\/abc123/);
  });

  it("captures LinkedIn URL plus pasted text as user-provided full text", async () => {
    const t = buildDeps({
      extractUrlCapture: async () => ({
        detection: {
          platform: "linkedin",
          canonicalUrl: "https://www.linkedin.com/posts/example",
          sourceType: "url",
        },
        source_type: "url",
        content: {
          title: "A useful LinkedIn post",
          body: "LinkedIn post text",
          author: "LinkedIn",
          source_url: "https://www.linkedin.com/posts/example",
          extraction_warning: null,
          source_platform: "linkedin",
          capture_quality: "user_provided_full_text",
          extraction_method: "user_paste",
          extraction_version: "capture-v0.7.5",
        },
      }),
    });

    const result = await handleCaptureMessage(
      msg({
        text: "https://www.linkedin.com/posts/example This is the post text with enough words to save as full text.",
      }),
      t.deps,
    );

    assert.deepEqual(result, { status: "captured", itemId: "abc123", source: "url" });
    assert.equal(t.inserted[0].source_platform, "linkedin");
    assert.equal(t.inserted[0].capture_quality, "user_provided_full_text");
    assert.match(t.sent[0].text, /Saved LinkedIn post text/);
  });

  it("upgrades an existing LinkedIn metadata-only capture when pasted text is provided", async () => {
    const existing = {
      id: "existing-linkedin",
      source_type: "url" as const,
      capture_source: "telegram" as const,
      title: "LinkedIn preview",
      body: "Preview",
      author: null,
      source_url: "https://www.linkedin.com/posts/example",
      summary: null,
      quotes: null,
      category: null,
      captured_at: 0,
      enriched_at: null,
      enrichment_state: "pending" as const,
      total_pages: null,
      total_chars: 7,
      extraction_warning: null,
      duration_seconds: null,
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: "capture-v0.7.5",
      published_at: null,
      thumbnail_url: null,
      description: null,
      batch_id: null,
    };
    const t = buildDeps({
      findItemByUrl: (() => existing) as unknown as DispatchDeps["findItemByUrl"],
      extractUrlCapture: async () => ({
        detection: {
          platform: "linkedin",
          canonicalUrl: "https://www.linkedin.com/posts/example",
          sourceType: "url",
        },
        source_type: "url",
        content: {
          title: "Complete LinkedIn post",
          body: "Complete post text",
          author: "LinkedIn",
          source_url: "https://www.linkedin.com/posts/example",
          extraction_warning: null,
          source_platform: "linkedin",
          capture_quality: "user_provided_full_text",
          extraction_method: "user_paste",
          extraction_version: "capture-v0.7.5",
        },
      }),
    });

    const result = await handleCaptureMessage(
      msg({
        text: "https://www.linkedin.com/posts/example This is complete post text with enough words to upgrade the weak existing capture.",
      }),
      t.deps,
    );

    assert.deepEqual(result, { status: "captured", itemId: "existing-linkedin", source: "url" });
    assert.equal(t.inserted.length, 0);
    assert.equal(t.updated.length, 1);
    assert.equal(t.updated[0].capture_quality, "user_provided_full_text");
    assert.match(t.sent[0].text, /Updated existing capture/);
  });

  it("replies 'already captured' on duplicate URL without inserting", async () => {
    const t = buildDeps({
      findItemByUrl: (() => ({
        id: "existing-id",
        source_type: "url" as const,
        capture_source: "telegram" as const,
        title: "Old Capture",
        body: "",
        author: null,
        source_url: "https://example.com/post",
        summary: null,
        quotes: null,
        category: null,
        captured_at: 0,
        enriched_at: null,
        enrichment_state: "pending",
        total_pages: null,
        total_chars: 0,
        extraction_warning: null,
        duration_seconds: null,
        source_platform: "generic_article",
        capture_quality: "full_text",
        extraction_method: "legacy",
        extraction_version: "legacy",
        published_at: null,
        thumbnail_url: null,
        description: null,
        batch_id: null,
      })) as unknown as DispatchDeps["findItemByUrl"],
    });
    const result = await handleCaptureMessage(
      msg({ text: "https://example.com/post", entities: [{ type: "url", offset: 0, length: 24 }] }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.equal(t.urlExtractCalls(), 0);
    assert.deepEqual(result, {
      status: "duplicate",
      itemId: "existing-id",
      reason: "url-exists",
    });
    assert.match(t.sent[0].text, /↩️ Already captured:.*Old Capture/);
  });

  it("routes plain text (no URL) to note capture", async () => {
    const t = buildDeps();
    const result = await handleCaptureMessage(msg({ text: "remember to ask Jess about offsite" }), t.deps);
    assert.equal(t.inserted.length, 1);
    assert.equal(t.inserted[0].source_type, "note");
    assert.equal(t.inserted[0].capture_source, "telegram");
    assert.equal(t.inserted[0].title, "remember to ask Jess about offsite");
    assert.deepEqual(result, { status: "captured", itemId: "abc123", source: "note" });
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
    const result = await handleCaptureMessage(msg({ text: "ok" }), t.deps);
    assert.equal(t.inserted.length, 0);
    assert.deepEqual(result, { status: "ignored", reason: "unsupported-message" });
    assert.match(t.sent[0].text, /can capture URLs, plain-text notes, and PDFs/);
  });

  it("handles /start without saving a note", async () => {
    const t = buildDeps();
    const result = await handleCaptureMessage(
      msg({
        text: "/start",
        entities: [{ type: "bot_command", offset: 0, length: 6 }],
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.deepEqual(result, { status: "ignored", reason: "command:/start" });
    assert.match(t.sent[0].text, /Send me a link/);
  });

  it("deduplicates duplicate notes inside the short share window", async () => {
    const t = buildDeps({ isDuplicateShare: () => true });
    const result = await handleCaptureMessage(msg({ text: "same note body" }), t.deps);
    assert.equal(t.inserted.length, 0);
    assert.deepEqual(result, { status: "duplicate", reason: "note-window" });
    assert.match(t.sent[0].text, /Already received/);
  });

  it("rejects non-PDF documents with explanatory message", async () => {
    const t = buildDeps();
    const result = await handleCaptureMessage(
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
    assert.deepEqual(result, { status: "ignored", reason: "unsupported-document" });
    assert.match(t.sent[0].text, /only handle PDF/);
  });

  it("rejects oversize PDF without downloading", async () => {
    const t = buildDeps();
    const result = await handleCaptureMessage(
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
    assert.deepEqual(result, { status: "failed", reason: "pdf-too-large", retryable: false });
    assert.match(t.sent[0].text, /PDF too large.*30\.0 MB/);
  });

  it("captures PDF: ack → extract → success edit", async () => {
    const t = buildDeps();
    const result = await handleCaptureMessage(
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
    assert.equal(t.inserted[0].capture_source, "telegram");
    assert.deepEqual(result, { status: "captured", itemId: "abc123", source: "pdf" });
    assert.match(t.sent[0].text, /📄 Capturing PDF/);
  });

  it("rejects PDFs whose downloaded bytes exceed the cap even without file_size", async () => {
    const t = buildDeps({
      downloadFile: async () => new ArrayBuffer(21 * 1024 * 1024),
    });
    const result = await handleCaptureMessage(
      msg({
        document: {
          file_id: "x",
          file_unique_id: "y",
          file_name: "huge.pdf",
          mime_type: "application/pdf",
        },
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.equal(result.status, "failed");
  });

  it("deduplicates PDFs by Telegram file_unique_id", async () => {
    const t = buildDeps({
      findTelegramDocumentByUniqueId: () => ({
        id: "existing-pdf",
        source_type: "pdf",
        capture_source: "telegram",
        title: "Existing PDF",
        body: "",
        author: null,
        source_url: null,
        summary: null,
        quotes: null,
        category: null,
        captured_at: 0,
        enriched_at: null,
        enrichment_state: "pending",
        total_pages: null,
        total_chars: 0,
        extraction_warning: null,
        duration_seconds: null,
        source_platform: "pdf",
        capture_quality: "full_text",
        extraction_method: "pdf",
        extraction_version: "capture-v0.7.5",
        published_at: null,
        thumbnail_url: null,
        description: null,
        batch_id: null,
      }),
    });
    const result = await handleCaptureMessage(
      msg({
        document: {
          file_id: "x",
          file_unique_id: "same-file",
          file_name: "doc.pdf",
          mime_type: "application/pdf",
        },
      }),
      t.deps,
    );
    assert.equal(t.inserted.length, 0);
    assert.deepEqual(result, {
      status: "duplicate",
      itemId: "existing-pdf",
      reason: "document-exists",
    });
  });
});
