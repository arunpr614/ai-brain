import "./user-provided.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./user-provided.test.setup";
import { getDb } from "@/db/client";
import { getItem, insertCaptured, listItems, listNeedsUpgradeItems, searchItems } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listCapturePolicyDecisionsForItem,
  listTranscriptSegmentsForSource,
  listTranscriptSourcesForItem,
} from "@/db/transcripts";
import {
  attachUploadedTranscriptFileToYoutubeItem,
  attachUserProvidedTranscriptToYoutubeItem,
  MAX_PASTED_TRANSCRIPT_CHARS,
  normalizePastedTranscriptText,
  UserProvidedTranscriptError,
} from "./user-provided";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function transcriptText(): string {
  return [
    "This is a complete user-provided transcript for the video.",
    "It has enough detail about customer workflows, product tradeoffs, implementation choices, and decisions.",
    "The transcript is plain text in Phase 1A, so timestamps are not claimed as verified segment metadata.",
    "Search and Ask should use this text after the repair pipeline resets enrichment and indexing state.",
  ].join(" ");
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function uploadedVttText(): string {
  return `WEBVTT

intro
00:00:01.000 --> 00:00:04.000
This uploaded VTT transcript explains customer workflows, product tradeoffs, implementation sequencing, validation, rollout risks, and follow-up decisions.

00:00:05.000 --> 00:00:08.000
The second timestamped cue adds enough detail about search, Ask, indexing, policy provenance, rollback behavior, and transcript panel rendering.
`;
}

function uploadedTxtText(): string {
  return [
    "The first paragraph of this uploaded transcript describes user-provided evidence, customer goals, implementation constraints, and validation details.",
    "The second paragraph explains source provenance, replacement cleanup, enrichment queueing, and why timestamps are intentionally absent.",
  ].join("\n\n");
}

test("attaches a pasted transcript to a YouTube metadata-only item with policy provenance", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=abc123",
    title: "Metadata-only video",
    body: "Old metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });

  const result = attachUserProvidedTranscriptToYoutubeItem({
    itemId: item.id,
    title: "User transcript video",
    text: `<script>alert("x")</script>\n${transcriptText()}`,
    languageCode: "EN-US",
  });

  const updated = getItem(item.id)!;
  assert.equal(result.repair.item.id, item.id);
  assert.equal(updated.title, "User transcript video");
  assert.equal(updated.capture_quality, "user_provided_full_text");
  assert.equal(updated.extraction_method, "manual_repair_transcript");
  assert.equal(updated.extraction_warning, null);
  assert.equal(updated.body.includes("<script>"), false);
  assert.match(updated.body, /customer workflows/);
  assert.equal(listNeedsUpgradeItems({ limit: 20 }).some((row) => row.id === item.id), false);
  assert.equal(listItems({ quality: "transcript" }).some((row) => row.id === item.id), true);
  assert.equal(searchItems("customer workflows").some((row) => row.id === item.id), true);

  const policies = listCapturePolicyDecisionsForItem(item.id);
  assert.equal(policies.length, 1);
  assert.equal(policies[0].method, "user_paste");
  assert.equal(policies[0].retention_class, "full_text_allowed");

  const sources = listTranscriptSourcesForItem(item.id);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].policy_decision_id, result.policyDecisionId);
  assert.equal(sources[0].source_kind, "user_paste");
  assert.equal(sources[0].language_code, "en-us");
  assert.equal(sources[0].caption_source_class, "user_provided");
  assert.equal(sources[0].timestamp_mode, "paragraph_only");
  assert.equal(sources[0].segment_count, 0);
  assert.match(sources[0].text_sha256, /^[0-9a-f]{64}$/);
});

test("rolls back item repair when transcript source provenance cannot be recorded", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=rollback123",
    title: "Rollback video",
    body: "Original metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });
  const db = getDb();
  db.exec(`
    CREATE TEMP TRIGGER fail_transcript_source_insert
    BEFORE INSERT ON transcript_sources
    BEGIN
      SELECT RAISE(ABORT, 'forced transcript source failure');
    END;
  `);

  try {
    assert.throws(() =>
      attachUserProvidedTranscriptToYoutubeItem({
        itemId: item.id,
        title: "Should not persist",
        text: transcriptText(),
      }),
    );
  } finally {
    db.exec("DROP TRIGGER IF EXISTS fail_transcript_source_insert;");
  }

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "Rollback video");
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(updated.extraction_warning, "no_transcript");
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("attaches an uploaded VTT transcript with timestamped segments", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=vtt123",
    title: "VTT metadata-only video",
    body: "Metadata placeholder",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });

  const result = attachUploadedTranscriptFileToYoutubeItem({
    itemId: item.id,
    title: "VTT transcript video",
    filename: "transcript.vtt",
    contentType: "text/vtt",
    bytes: bytes(uploadedVttText()),
    languageCode: "en",
  });

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "VTT transcript video");
  assert.equal(updated.capture_quality, "user_provided_full_text");
  assert.equal(updated.extraction_method, "manual_repair_transcript");
  assert.equal(updated.extraction_warning, null);
  assert.match(updated.body, /uploaded VTT transcript/);

  const activeSource = getActiveTranscriptSourceForItem(item.id)!;
  assert.equal(activeSource.id, result.transcriptSource.id);
  assert.equal(activeSource.source_kind, "uploaded_file");
  assert.equal(activeSource.timestamp_mode, "timestamped");
  assert.equal(activeSource.segment_count, 2);

  const segments = listTranscriptSegmentsForSource(activeSource.id);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].idx, 0);
  assert.equal(segments[0].start_ms, 1000);
  assert.equal(segments[0].end_ms, 4000);
  assert.match(segments[0].text, /customer workflows/);
  assert.equal(result.transcriptSegments.length, 2);
});

test("attaches uploaded TXT transcript as paragraph-only segments", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=txt123",
    title: "TXT metadata-only video",
    body: "Metadata placeholder",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });

  const result = attachUploadedTranscriptFileToYoutubeItem({
    itemId: item.id,
    filename: "transcript.txt",
    contentType: "text/plain",
    bytes: bytes(uploadedTxtText()),
  });

  assert.equal(result.transcriptSource.timestamp_mode, "paragraph_only");
  assert.equal(result.transcriptSource.segment_count, 2);
  const segments = listTranscriptSegmentsForSource(result.transcriptSource.id);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].start_ms, null);
  assert.equal(segments[0].end_ms, null);
});

test("replacing an uploaded transcript supersedes old source and removes old segments", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=replace123",
    title: "Replace metadata-only video",
    body: "Metadata placeholder",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });

  const first = attachUploadedTranscriptFileToYoutubeItem({
    itemId: item.id,
    filename: "first.vtt",
    contentType: "text/vtt",
    bytes: bytes(uploadedVttText()),
  });
  const second = attachUploadedTranscriptFileToYoutubeItem({
    itemId: item.id,
    filename: "second.txt",
    contentType: "text/plain",
    bytes: bytes(uploadedTxtText()),
  });

  const sources = listTranscriptSourcesForItem(item.id);
  assert.equal(sources.length, 2);
  assert.equal(sources.find((source) => source.id === first.transcriptSource.id)?.status, "superseded");
  assert.equal(sources.find((source) => source.id === second.transcriptSource.id)?.status, "active");
  assert.equal(listTranscriptSegmentsForSource(first.transcriptSource.id).length, 0);
  assert.equal(listTranscriptSegmentsForSource(second.transcriptSource.id).length, 2);
});

test("rolls back uploaded transcript repair when segment insertion fails", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=segrollback123",
    title: "Segment rollback video",
    body: "Original metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });
  const db = getDb();
  db.exec(`
    CREATE TEMP TRIGGER fail_transcript_segment_insert
    BEFORE INSERT ON transcript_segments
    BEGIN
      SELECT RAISE(ABORT, 'forced transcript segment failure');
    END;
  `);

  try {
    assert.throws(() =>
      attachUploadedTranscriptFileToYoutubeItem({
        itemId: item.id,
        title: "Should not persist",
        filename: "rollback.vtt",
        contentType: "text/vtt",
        bytes: bytes(uploadedVttText()),
      }),
    );
  } finally {
    db.exec("DROP TRIGGER IF EXISTS fail_transcript_segment_insert;");
  }

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "Segment rollback video");
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(updated.extraction_warning, "no_transcript");
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("rejects non-YouTube items in the YouTube transcript flow", () => {
  const item = insertCaptured({
    source_type: "url",
    title: "Article",
    body: "Preview",
    source_platform: "generic_article",
    capture_quality: "metadata_only",
  });

  assert.throws(
    () =>
      attachUserProvidedTranscriptToYoutubeItem({
        itemId: item.id,
        text: transcriptText(),
      }),
    (err) =>
      err instanceof UserProvidedTranscriptError &&
      err.code === "not_youtube_item",
  );
});

test("normalizes pasted transcript text and enforces size limits", () => {
  assert.equal(
    normalizePastedTranscriptText("one\r\ntwo\n\n\n\n<style>.x{}</style><b>three</b>"),
    "one\ntwo\n\n three",
  );

  const item = insertCaptured({
    source_type: "youtube",
    title: "Large",
    body: "Metadata",
    source_platform: "youtube",
    capture_quality: "metadata_only",
  });

  assert.throws(
    () =>
      attachUserProvidedTranscriptToYoutubeItem({
        itemId: item.id,
        text: "a".repeat(MAX_PASTED_TRANSCRIPT_CHARS + 1),
      }),
    (err) =>
      err instanceof UserProvidedTranscriptError &&
      err.code === "text_too_large",
  );
});
