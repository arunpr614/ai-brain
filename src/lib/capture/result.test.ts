import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ItemRow } from "@/db/client";
import {
  inferCaptureResultState,
  isCaptureResultPayload,
  parseCaptureResultState,
  toCaptureResultPayload,
  toDuplicateCaptureResultPayload,
  toFailedCaptureResultPayload,
} from "./result";

function item(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: "item_1",
    source_type: "url",
    capture_source: "web",
    source_url: "https://example.com",
    title: "Example",
    author: null,
    body: "Readable body",
    summary: null,
    quotes: null,
    category: null,
    captured_at: 1,
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: null,
    total_pages: null,
    total_chars: 13,
    duration_seconds: null,
    batch_id: null,
    source_platform: "generic_article",
    capture_quality: "full_text",
    extraction_method: "readability",
    extraction_version: "capture-v0.7.5",
    published_at: null,
    thumbnail_url: null,
    description: null,
    ...overrides,
  };
}

describe("capture result payloads", () => {
  it("infers created states from DB item trust fields", () => {
    assert.equal(inferCaptureResultState(item({ capture_quality: "full_text" })), "created_full_text");
    assert.equal(inferCaptureResultState(item({ capture_quality: "transcript" })), "created_transcript");
    assert.equal(inferCaptureResultState(item({ capture_quality: "paywall_preview" })), "created_preview_only");
    assert.equal(inferCaptureResultState(item({ capture_quality: "metadata_only" })), "created_metadata_only");
    assert.equal(inferCaptureResultState(item({ capture_quality: "failed" })), "created_needs_upgrade");
    assert.equal(
      inferCaptureResultState(item({ capture_quality: "full_text", extraction_warning: "no_transcript" })),
      "created_needs_upgrade",
    );
  });

  it("builds canonical payloads from saved item data", () => {
    const payload = toCaptureResultPayload(item({ capture_source: "android" }));
    assert.equal(payload.state, "created_full_text");
    assert.equal(payload.itemId, "item_1");
    assert.equal(payload.existingItemId, null);
    assert.equal(payload.sourcePlatform, "generic_article");
    assert.equal(payload.capturedVia, "android");
    assert.equal(payload.quality, "full_text");
    assert.equal(payload.recommendedAction, "open_item");
    assert.match(payload.message, /ready for search and Ask/);
  });

  it("distinguishes duplicate, updated, error-with-save, and failed-without-save", () => {
    const existing = item({ id: "existing_1", capture_quality: "metadata_only" });
    const duplicate = toDuplicateCaptureResultPayload(existing);
    assert.equal(duplicate.state, "duplicate_existing");
    assert.equal(duplicate.itemId, "existing_1");
    assert.equal(duplicate.existingItemId, "existing_1");
    assert.equal(duplicate.recommendedAction, "open_existing");

    const updated = toCaptureResultPayload(existing, { state: "updated_existing" });
    assert.equal(updated.state, "updated_existing");
    assert.match(updated.message, /No duplicate was created/);

    const partial = toCaptureResultPayload(existing, {
      state: "error_with_saved_item",
      errorMessage: "artifact write failed",
    });
    assert.equal(partial.recommendedAction, "upgrade");
    assert.match(partial.message, /post-save capture step failed/);
    assert.doesNotMatch(partial.message, /artifact write failed/);

    const failed = toFailedCaptureResultPayload("Could not fetch the URL.");
    assert.equal(failed.state, "failed_without_saved_item");
    assert.equal(failed.itemId, null);
    assert.equal(failed.recommendedAction, "retry");
  });

  it("parses and validates capture result payloads defensively", () => {
    assert.equal(parseCaptureResultState("created_full_text"), "created_full_text");
    assert.equal(parseCaptureResultState("nope"), null);
    assert.equal(isCaptureResultPayload(toFailedCaptureResultPayload("Failed")), true);
    assert.equal(isCaptureResultPayload({ state: "created_full_text", message: "x" }), false);
  });
});
