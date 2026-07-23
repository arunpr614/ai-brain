import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ItemRow } from "@/db/client";
import {
  NOTEBOOKLM_PAYLOAD_MAX_BYTES,
  NOTEBOOKLM_PAYLOAD_MAX_WORDS,
} from "./contracts";
import {
  mapItemToNotebookLm,
  providerTitle,
  publicQuerylessUrl,
} from "./formatter";

function item(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: "0123456789abcdef01234567",
    source_type: "note",
    capture_source: "web",
    source_url: null,
    title: "Synthetic memory",
    author: null,
    body: "Synthetic body",
    summary: null,
    quotes: null,
    category: null,
    captured_at: 1_700_000_000_000,
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: null,
    total_pages: null,
    total_chars: null,
    duration_seconds: null,
    batch_id: null,
    ...overrides,
  };
}

describe("NotebookLM copied-text mapper", () => {
  test("exports an exact safe source URL instead of copied item text", () => {
    const result = mapItemToNotebookLm(
      item({
        source_type: "url",
        capture_quality: "full_text",
        title: "  Public\u0000  article  ",
        author: "  Synthetic\tAuthor ",
        body: "First line  \r\nSecond line\t \r\n",
        published_at: Date.UTC(2025, 0, 2, 3, 4, 5),
        source_url: "https://example.com/articles/synthetic",
        summary: "SECRET SUMMARY MUST NOT LEAVE",
        quotes: '["SECRET QUOTE MUST NOT LEAVE"]',
        description: "SECRET DESCRIPTION MUST NOT LEAVE",
        thumbnail_url: "https://example.com/secret-thumbnail.png",
        category: "SECRET CATEGORY MUST NOT LEAVE",
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.sourceKind, "url");
    assert.equal(result.title, "Public article");
    assert.equal(result.text, "https://example.com/articles/synthetic");
    for (const forbidden of [
      "SECRET SUMMARY",
      "SECRET QUOTE",
      "SECRET DESCRIPTION",
      "secret-thumbnail",
      "SECRET CATEGORY",
      "0123456789abcdef01234567",
    ]) {
      assert.equal(result.text.includes(forbidden), false, `leaked ${forbidden}`);
    }
    assert.equal(result.safeSourceUrl, "https://example.com/articles/synthetic");
    assert.deepEqual(result.warnings, []);
    assert.equal(result.bytes, Buffer.byteLength(result.text, "utf8"));
    assert.equal(result.words, 1);
    assert.match(result.contentHash, /^[a-f0-9]{64}$/);
  });

  test("normalizes Unicode and line endings before hashing", () => {
    const decomposed = mapItemToNotebookLm(
      item({ title: "Cafe\u0301", body: "A\r\nCafe\u0301   \r\nB" }),
    );
    const composed = mapItemToNotebookLm(
      item({ title: "Caf\u00e9", body: "A\nCaf\u00e9\nB" }),
    );
    assert.equal(decomposed.ok, true);
    assert.equal(composed.ok, true);
    if (!decomposed.ok || !composed.ok) return;
    assert.equal(decomposed.text, composed.text);
    assert.equal(decomposed.contentHash, composed.contentHash);
  });

  test("omits an invalid optional publication date instead of failing the export", () => {
    const result = mapItemToNotebookLm(item({ published_at: Number.MAX_SAFE_INTEGER }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text.includes("Published:"), false);
    assert.deepEqual(result.warnings, ["published_date_omitted"]);
  });

  test("strips the exact Recall provenance envelope while preserving source content", () => {
    const recallBody = [
      "Imported from Recall",
      "Recall card id: internal-card-id-PRIVATE",
      "Recall created_at: 2025-01-01T00:00:00Z",
      "Original source: https://example.com/private?token=PRIVATE",
      "Content fidelity: api_chunks_unverified",
      "Imported at: 2025-01-02T00:00:00.000Z",
      "",
      "---",
      "",
      "First public-memory chunk",
      "",
      "---",
      "",
      "Second public-memory chunk",
    ].join("\n");
    const result = mapItemToNotebookLm(
      item({ capture_source: "recall", body: recallBody }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /First public-memory chunk\n\n---\n\nSecond public-memory chunk/);
    for (const forbidden of [
      "Imported from Recall",
      "internal-card-id-PRIVATE",
      "Recall created_at",
      "Original source",
      "token=PRIVATE",
      "Content fidelity",
      "Imported at",
    ]) {
      assert.equal(result.text.includes(forbidden), false, `Recall provenance leaked ${forbidden}`);
    }
  });

  test("Recall provenance with CRLF is stripped or rejected, never exported raw", () => {
    const recallBody = [
      "Imported from Recall",
      "Recall card id: private-crlf-card-id",
      "Recall created_at: unknown",
      "Original source: unknown",
      "Content fidelity: api_chunks_unverified",
      "Imported at: 2025-01-02T00:00:00.000Z",
      "",
      "---",
      "",
      "Synthetic Recall content",
    ].join("\r\n");
    const result = mapItemToNotebookLm(item({ capture_source: "recall", body: recallBody }));
    if (result.ok) {
      assert.match(result.text, /Synthetic Recall content/);
      assert.equal(result.text.includes("private-crlf-card-id"), false);
      assert.equal(result.text.includes("Imported from Recall"), false);
    } else {
      assert.equal(result.reason, "empty_body");
    }
  });

  test("malformed exact Recall provenance fails closed instead of leaking internal metadata", () => {
    const malformed = [
      "Imported from Recall",
      "Recall card id: private-malformed-card-id",
      "Recall created_at: unknown",
      "Original source: https://example.com/?private=1",
      "Content fidelity: api_chunks_unverified",
      // Imported-at line is deliberately missing.
      "",
      "---",
      "",
      "Content after malformed provenance",
    ].join("\n");
    assert.deepEqual(
      mapItemToNotebookLm(item({ capture_source: "recall", body: malformed })),
      { ok: false, reason: "empty_body" },
    );
  });

  test("non-Recall captures do not lose user-authored text that resembles provenance", () => {
    const body = "Imported from Recall\n\nThis is user-authored text, not an importer envelope.";
    const result = mapItemToNotebookLm(item({ capture_source: "web", body }));
    assert.equal(result.ok, true);
    if (result.ok) assert.match(result.text, /Imported from Recall/);
  });

  test("requires an explicit confirmation for limited captures", () => {
    const weak = item({
      source_type: "url",
      capture_quality: "metadata_only",
      body: "A preview, not the full article",
    });
    assert.deepEqual(mapItemToNotebookLm(weak), {
      ok: false,
      reason: "limited_confirmation_required",
      limitedCapture: true,
    });
    const confirmed = mapItemToNotebookLm(weak, { confirmLimitedCapture: true });
    assert.equal(confirmed.ok, true);
    if (confirmed.ok) assert.equal(confirmed.limitedCapture, true);
  });

  test("warning-only weak captures also require confirmation", () => {
    const result = mapItemToNotebookLm(
      item({
        source_type: "youtube",
        capture_quality: "unknown",
        extraction_warning: "no_transcript",
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "limited_confirmation_required");
  });

  test("does not let confirmation turn schema-only podcast, epub, or docx data into full text", () => {
    for (const source_type of ["podcast", "epub", "docx"] as const) {
      const result = mapItemToNotebookLm(
        item({ source_type, capture_quality: "metadata_only" }),
        { confirmLimitedCapture: true },
      );
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "unsupported_capture");
    }

    const fullText = mapItemToNotebookLm(
      item({ source_type: "docx", capture_quality: "full_text" }),
    );
    assert.equal(fullText.ok, true);
  });

  test("rejects empty and over-limit payloads without truncating", () => {
    assert.deepEqual(mapItemToNotebookLm(item({ body: " \r\n\t " })), {
      ok: false,
      reason: "empty_body",
    });

    const tooManyWords = mapItemToNotebookLm(
      item({ body: `${"w ".repeat(NOTEBOOKLM_PAYLOAD_MAX_WORDS)}w` }),
    );
    assert.equal(tooManyWords.ok, false);
    if (!tooManyWords.ok) {
      assert.equal(tooManyWords.reason, "payload_too_large");
      assert.ok((tooManyWords.words ?? 0) > NOTEBOOKLM_PAYLOAD_MAX_WORDS);
    }

    const tooManyBytes = mapItemToNotebookLm(
      item({ body: "\ud83d\ude80".repeat(Math.ceil(NOTEBOOKLM_PAYLOAD_MAX_BYTES / 4)) }),
    );
    assert.equal(tooManyBytes.ok, false);
    if (!tooManyBytes.ok) {
      assert.equal(tooManyBytes.reason, "payload_too_large");
      assert.ok((tooManyBytes.bytes ?? 0) > NOTEBOOKLM_PAYLOAD_MAX_BYTES);
    }
  });

  test("accepts the exact byte and word envelopes and rejects one unit over", () => {
    const oneByte = mapItemToNotebookLm(item({ title: "T", body: "x" }));
    assert.equal(oneByte.ok, true);
    if (!oneByte.ok) return;
    const byteOverhead = oneByte.bytes - 1;
    const exactBytes = mapItemToNotebookLm(
      item({ title: "T", body: "x".repeat(NOTEBOOKLM_PAYLOAD_MAX_BYTES - byteOverhead) }),
    );
    assert.equal(exactBytes.ok, true);
    if (!exactBytes.ok) return;
    assert.equal(exactBytes.bytes, NOTEBOOKLM_PAYLOAD_MAX_BYTES);
    const tooManyBytes = mapItemToNotebookLm(
      item({ title: "T", body: `${exactBytes.text.slice(exactBytes.text.lastIndexOf("\n") + 1)}x` }),
    );
    assert.equal(tooManyBytes.ok, false);
    if (!tooManyBytes.ok) assert.equal(tooManyBytes.bytes, NOTEBOOKLM_PAYLOAD_MAX_BYTES + 1);

    const oneWord = mapItemToNotebookLm(item({ title: "T", body: "w" }));
    assert.equal(oneWord.ok, true);
    if (!oneWord.ok) return;
    const wordOverhead = oneWord.words - 1;
    const exactWordsBody = Array.from(
      { length: NOTEBOOKLM_PAYLOAD_MAX_WORDS - wordOverhead },
      () => "w",
    ).join(" ");
    const exactWords = mapItemToNotebookLm(item({ title: "T", body: exactWordsBody }));
    assert.equal(exactWords.ok, true);
    if (!exactWords.ok) return;
    assert.equal(exactWords.words, NOTEBOOKLM_PAYLOAD_MAX_WORDS);
    const tooManyWords = mapItemToNotebookLm(
      item({ title: "T", body: `${exactWordsBody} w` }),
    );
    assert.equal(tooManyWords.ok, false);
    if (!tooManyWords.ok) assert.equal(tooManyWords.words, NOTEBOOKLM_PAYLOAD_MAX_WORDS + 1);
  });

  test("blocks credentialed, sensitive, fragment-bearing, local, and private-network URLs instead of falling back to text", () => {
    const unsafe = [
      "https://user:secret@example.com/article",
      "https://example.com/article?token=secret",
      "https://example.com/article#private-note",
      "file:///Users/example/private.txt",
      "http://localhost:3000/private",
      "http://service.local/private",
      "http://127.0.0.1/private",
      "http://10.0.0.1/private",
      "http://169.254.1.1/private",
      "http://172.16.0.1/private",
      "http://172.31.255.255/private",
      "http://192.168.1.1/private",
      "http://[::1]/private",
      "http://[0:0:0:0:0:0:0:1]/private",
      "http://[0:0:0:0:0:0:0:0]/private",
      "http://[fc00::1]/private",
      "http://[fd00::1]/private",
      "http://[fe80::1]/private",
      "http://[fec0::1]/private",
      "http://[::ffff:127.0.0.1]/private",
      "http://[::ffff:0:7f00:1]/private",
      "http://[64:ff9b::7f00:1]/private",
      "http://[64:ff9b:1::a00:1]/private",
      "https://example.com./trailing-dot",
      "http://private-service.onion/reference",
      "http://private-service.i2p/reference",
      "not a URL",
    ];
    for (const raw of unsafe) {
      assert.equal(publicQuerylessUrl(raw, true), null, `unsafe URL was exported: ${raw}`);
      const result = mapItemToNotebookLm(item({ source_url: raw }));
      assert.deepEqual(result, { ok: false, reason: "unsafe_source_url" });
    }
  });

  test("preserves a YouTube watch URL including its required query", () => {
    const sourceUrl = "https://www.youtube.com/watch?v=t0GiTyz4syY";
    const result = mapItemToNotebookLm(
      item({
        source_type: "youtube",
        source_url: sourceUrl,
        capture_quality: "metadata_only",
        extraction_warning: "youtube_antibot_metadata_only",
        body: "",
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.sourceKind, "url");
    assert.equal(result.safeSourceUrl, sourceUrl);
    assert.equal(result.text, sourceUrl);
    assert.equal(result.limitedCapture, false);
  });

  test("accepts an explicitly verified public HTTP(S) URL and canonicalizes the host", () => {
    assert.equal(
      publicQuerylessUrl("HTTPS://EXAMPLE.COM:443/path", true),
      "https://example.com/path",
    );
    assert.equal(
      publicQuerylessUrl("http://8.8.8.8/reference", true),
      "http://8.8.8.8/reference",
    );
    assert.equal(
      publicQuerylessUrl("https://[2606:4700:4700::1111]/reference", true),
      "https://[2606:4700:4700::1111]/reference",
    );
  });

  test("uses a network-public Drive URL as the explicit source URL", () => {
    const privateDriveUrl = "https://drive.google.com/file/d/private-document/view";
    assert.equal(publicQuerylessUrl(privateDriveUrl, true), privateDriveUrl);
    const result = mapItemToNotebookLm(item({ source_url: privateDriveUrl }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.sourceKind, "url");
    assert.equal(result.safeSourceUrl, privateDriveUrl);
    assert.equal(result.text, privateDriveUrl);
    assert.deepEqual(result.warnings, []);
  });

  test("keeps the full canonical title while shortening only the provider display title", () => {
    for (const length of [181, 500]) {
      const fullTitle = `Title-${"x".repeat(length - 6)}`;
      const result = mapItemToNotebookLm(item({ title: fullTitle }));
      assert.equal(result.ok, true);
      if (!result.ok) continue;
      assert.equal(result.title, fullTitle);
      assert.equal(result.text.startsWith(`# ${fullTitle}\n\n`), true);
      assert.deepEqual(result.warnings, ["provider_title_shortened"]);
      const display = providerTitle(fullTitle, "AI-MEM-abcdefghijklmnopqrstuv");
      assert.ok(display.length <= 180);
      assert.equal(display.endsWith(" · AI-MEM-abcdefghijklmnopqrstuv"), true);
    }

    const unicode = providerTitle("🚀".repeat(200), "AI-MEM-abcdefghijklmnopqrstuv");
    assert.ok(unicode.length <= 180);
    assert.equal(/[\ud800-\udbff]$/u.test(unicode), false);
  });

  test("provider title keeps the opaque marker inside the provider limit", () => {
    const marker = "AI-MEM-abcdefghijklmnopqrstuv";
    const title = providerTitle("x".repeat(400), marker);
    assert.ok(title.length <= 180);
    assert.equal(title.endsWith(` \u00b7 ${marker}`), true);
    assert.equal((title.match(/AI-MEM-/g) ?? []).length, 1);
  });
});
