import assert from "node:assert/strict";
import { test } from "node:test";
import type { ItemRow } from "@/db/client";
import {
  buildAttentionReasons,
  summarizeAttentionItems,
  type ReviewItem,
} from "./attention";

function item(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: "item-1",
    source_type: "url",
    capture_source: "web",
    source_url: "https://example.com/a",
    title: "Example",
    author: null,
    body: "Body",
    summary: null,
    quotes: null,
    category: null,
    captured_at: Date.now(),
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: null,
    total_pages: null,
    total_chars: 4,
    duration_seconds: null,
    source_platform: "generic_article",
    capture_quality: "full_text",
    extraction_method: null,
    extraction_version: null,
    published_at: null,
    thumbnail_url: null,
    description: null,
    batch_id: null,
    ...overrides,
  };
}

test("YouTube metadata-only captures are routed to pasted text upgrade", () => {
  const reasons = buildAttentionReasons(
    item({
      source_type: "youtube",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      total_chars: 180,
    }),
  );

  assert.equal(reasons[0]?.code, "add_text");
  assert.match(reasons[0]?.detail ?? "", /transcript|notes|selected text/i);
});

test("Substack previews stay reviewable without exposing pasted-text upgrade", () => {
  const reasons = buildAttentionReasons(
    item({
      source_platform: "substack",
      capture_quality: "paywall_preview",
      total_chars: 1200,
    }),
  );

  assert.deepEqual(
    reasons.map((reason) => reason.code),
    ["substack_preview"],
  );
  assert.match(reasons[0]?.detail ?? "", /newsletter text/i);
});

test("review reasons include duplicate and processing/indexing problems", () => {
  const reasons = buildAttentionReasons(
    item({
      enrichment_state: "error",
      capture_quality: "full_text",
      total_chars: 900,
    }),
    { duplicateCount: 2, embeddingState: "error" },
  );

  assert.deepEqual(
    reasons.map((reason) => reason.code),
    ["summary_failed", "semantic_failed", "duplicate_source"],
  );
});

test("retryable transcript recovery reasons show the provider result", () => {
  const reasons = buildAttentionReasons(
    item({
      source_type: "youtube",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      total_chars: 180,
    }),
    {
      transcriptJobState: "retryable_error",
      transcriptJobAttempts: 1,
      transcriptJobMaxAttempts: 5,
      transcriptJobNextRunAt: Date.now() + 60_000,
      transcriptJobLastErrorMessage: "Timed-text returned 429.",
    },
  );

  const transcriptReason = reasons.find((reason) => reason.code === "transcript_recovery");
  assert.match(transcriptReason?.detail ?? "", /Timed-text returned 429/);
  assert.match(transcriptReason?.detail ?? "", /Next retry/);
});

test("full-text done items without chunks are flagged as missing semantic search", () => {
  const reasons = buildAttentionReasons(
    item({
      enrichment_state: "done",
      capture_quality: "full_text",
      total_chars: 1200,
    }),
    { chunkCount: 0, embeddingState: null },
  );

  assert.deepEqual(
    reasons.map((reason) => reason.code),
    ["semantic_missing"],
  );
});

test("strong fully indexed captures do not need attention", () => {
  const reasons = buildAttentionReasons(
    item({
      enrichment_state: "done",
      capture_quality: "user_provided_full_text",
      total_chars: 1200,
    }),
    { chunkCount: 3, embeddingState: "done", duplicateCount: 1 },
  );

  assert.deepEqual(reasons, []);
});

test("summarizeAttentionItems counts every reason on review rows", () => {
  const reviewItem = {
    ...item(),
    duplicate_count: 2,
    chunk_count: 0,
    embedding_state: null,
    attention_reasons: [
      {
        code: "add_text",
        label: "Add text",
        detail: "Needs text",
        actionLabel: "Add text",
        priority: 10,
      },
      {
        code: "duplicate_source",
        label: "Possible duplicate",
        detail: "Duplicate URL",
        actionLabel: "Compare",
        priority: 80,
      },
    ],
  } satisfies ReviewItem;

  const summary = summarizeAttentionItems([reviewItem]);
  assert.equal(summary.add_text, 1);
  assert.equal(summary.duplicate_source, 1);
  assert.equal(summary.capture_failed, 0);
});
