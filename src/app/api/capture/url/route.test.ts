/**
 * Tests for POST /api/capture/url (v0.5.0 T-12).
 *
 * The 201 happy path would require a live HTTP endpoint for Readability
 * to fetch — covered at T-21 AVD smoke. This file exercises the pre-
 * extraction guards (Origin, schema, dedup, historical duplicate) that
 * fail before any network call.
 */
import "./route.test.setup";

import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { __resetDedupForTests } from "@/lib/capture/dedup";
import { getDb } from "@/db/client";
import { getItem, insertCaptured } from "@/db/items";
import { getTranscriptJobForItem, listTranscriptAttemptsForItem } from "@/db/transcript-jobs";

function mkReq(
  body: unknown,
  opts: { origin?: string | null; rawBody?: string; captureSource?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.origin !== null && opts.origin !== undefined) {
    headers.set("origin", opts.origin);
  }
  if (opts.captureSource) {
    headers.set("x-brain-capture-source", opts.captureSource);
  }
  return new NextRequest("http://localhost/api/capture/url", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

describe("/api/capture/url", () => {
  beforeEach(() => __resetDedupForTests());
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("rejects a disallowed Origin with 403", async () => {
    const res = await POST(
      mkReq({ url: "https://example.com" }, { origin: "http://evil.example" }),
    );
    assert.equal(res.status, 403);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(mkReq({}, { rawBody: "{nope" }));
    assert.equal(res.status, 400);
  });

  it("rejects missing or malformed url with 400 validation_failed", async () => {
    const r1 = await POST(mkReq({ url: "" }));
    assert.equal(r1.status, 400);
    const r2 = await POST(mkReq({ url: "not-a-url" }));
    assert.equal(r2.status, 400);
    const r3 = await POST(mkReq({ url: "https://" + "a".repeat(3000) }));
    assert.equal(r3.status, 400);
  });

  it("second POST of the same URL within 2s returns {duplicate, reason:'window'}", async () => {
    // Seed the DB with an existing item at this URL so the path short-
    // circuits on the historical-duplicate branch (we return before any
    // network call) — but the FIRST POST hits the dedup window first
    // and should return reason:'window'.
    const url = "https://example.com/post-1";
    // First POST: dedup doesn't fire (fresh) → hits findItemByUrl → no
    // match → would try to extract. To avoid a network call we seed the
    // item first so the historical-duplicate branch triggers.
    insertCaptured({ source_type: "url", title: "seed", body: "x", source_url: url });

    const r1 = await POST(mkReq({ url }));
    assert.equal(r1.status, 200);
    const d1 = await r1.json();
    assert.equal(d1.duplicate, true);
    // First call: dedup miss, historical hit → reason:'exists'.
    assert.equal(d1.reason, "exists");

    // Second call within 2s: dedup fires first → reason:'window'.
    const r2 = await POST(mkReq({ url }));
    assert.equal(r2.status, 200);
    const d2 = await r2.json();
    assert.equal(d2.duplicate, true);
    assert.equal(d2.reason, "window");
  });

  it("upgrades an existing LinkedIn metadata-only item when pasted text is provided", async () => {
    const url = "https://www.linkedin.com/posts/example";
    const existing = insertCaptured({
      source_type: "url",
      title: "LinkedIn link",
      body: "Preview only",
      source_url: url,
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: "capture-v0.7.5",
    });

    const res = await POST(mkReq({
      url,
      note: `${url}

This is the complete post body with enough useful words to save as user provided full text.

- It keeps a bullet.
- It keeps this secondary link https://example.com/context`,
    }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, existing.id);
    const rowsForUrl = getDb()
      .prepare("SELECT COUNT(*) AS count FROM items WHERE source_url = ?")
      .get(url) as { count: number };
    assert.equal(rowsForUrl.count, 1);

    const updated = getItem(existing.id)!;
    assert.equal(updated.capture_quality, "user_provided_full_text");
    assert.match(updated.body, /It keeps a bullet/);
    assert.match(updated.body, /https:\/\/example\.com\/context/);
  });

  it("upgrades an existing YouTube metadata-only item with pasted transcript text", async () => {
    const canonical = "https://www.youtube.com/watch?v=abc12345678";
    const existing = insertCaptured({
      source_type: "youtube",
      title: "Saved YouTube metadata",
      body: "old metadata body",
      author: "Saved Channel",
      source_url: canonical,
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_version: "capture-v0.7.5",
      duration_seconds: 321,
      thumbnail_url: "https://i.ytimg.com/example.jpg",
      description: "Saved description",
    });

    const res = await POST(mkReq({
      url: "https://youtu.be/abc12345678",
      note: `https://youtu.be/abc12345678

[00:01] This transcript text has enough useful words to upgrade the existing weak capture.

- Keep this bullet
- Keep this secondary URL https://example.com/context`,
    }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, existing.id);
    const rowsForUrl = getDb()
      .prepare("SELECT COUNT(*) AS count FROM items WHERE source_url = ?")
      .get(canonical) as { count: number };
    assert.equal(rowsForUrl.count, 1);

    const updated = getItem(existing.id)!;
    assert.equal(updated.title, "Saved YouTube metadata");
    assert.equal(updated.author, "Saved Channel");
    assert.equal(updated.duration_seconds, 321);
    assert.equal(updated.thumbnail_url, "https://i.ytimg.com/example.jpg");
    assert.equal(updated.capture_quality, "user_provided_full_text");
    assert.equal(updated.extraction_method, "youtube_user_provided_text");
    assert.equal(updated.enrichment_state, "pending");
    assert.equal(updated.batch_id, null);
    assert.match(updated.body, /Provided by: user paste/);
    assert.match(updated.body, /Keep this bullet/);
    assert.match(updated.body, /https:\/\/example\.com\/context/);
    assert.doesNotMatch(updated.body, /youtu\.be\/abc12345678/);

    const job = getTranscriptJobForItem(existing.id);
    assert.equal(job?.state, "done");
    assert.equal(job?.last_provider, "manual_user_text");
    assert.ok((job?.last_attempt_id ?? 0) > 0);
    const attempts = listTranscriptAttemptsForItem(existing.id);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0]?.provider, "manual_user_text");
    assert.equal(attempts[0]?.state, "success");
    assert.equal(attempts[0]?.retryable, 0);
  });

  it("queues transcript recovery when the same weak YouTube URL is posted again", async () => {
    const canonical = "https://www.youtube.com/watch?v=dupe1234567";
    const existing = insertCaptured({
      source_type: "youtube",
      title: "Duplicate weak YouTube",
      body: "metadata only",
      source_url: canonical,
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });

    __resetDedupForTests();
    const res = await POST(mkReq({ url: "https://youtu.be/dupe1234567" }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.duplicate, true);
    assert.equal(body.itemId, existing.id);
    assert.equal(body.reason, "transcript-recovery-queued");
    assert.equal(body.action, "transcript_recovery_queued");
    assert.equal(body.reviewPath, `/review?focus=${existing.id}`);

    const job = getTranscriptJobForItem(existing.id);
    assert.equal(job?.state, "pending");
    assert.equal(job?.video_id, "dupe1234567");
    assert.ok((job?.priority ?? 0) >= 20);
  });

  it("creates a new YouTube item from pasted text without requiring transcript extraction", async () => {
    const oldKey = process.env.YOUTUBE_DATA_API_KEY;
    process.env.YOUTUBE_DATA_API_KEY = "";
    try {
      const res = await POST(mkReq({
        url: "https://youtu.be/newtext1234",
        note: `https://youtu.be/newtext1234

These pasted notes have enough words to become the remembered content for this new YouTube capture.`,
      }));

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.action, "created");
      const item = getItem(body.id)!;
      assert.equal(item.source_type, "youtube");
      assert.equal(item.source_url, "https://www.youtube.com/watch?v=newtext1234");
      assert.equal(item.capture_quality, "user_provided_full_text");
      assert.equal(item.extraction_method, "youtube_user_provided_text");
      assert.match(item.body, /Provided by: user paste/);
      assert.match(item.body, /remembered content for this new YouTube capture/);
    } finally {
      if (oldKey === undefined) delete process.env.YOUTUBE_DATA_API_KEY;
      else process.env.YOUTUBE_DATA_API_KEY = oldKey;
    }
  });

  it("creates a browser selected-text capture without fetching the page", async () => {
    const url = "https://example.com/selected-article";
    const res = await POST(
      mkReq(
        {
          url,
          title: "Selected article",
          selected_text:
            "This selected passage has enough useful words to save as the remembered browser capture.",
        },
        { captureSource: "extension" },
      ),
    );

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.action, "created");

    const item = getItem(body.id)!;
    assert.equal(item.source_url, url);
    assert.equal(item.capture_source, "extension");
    assert.equal(item.capture_quality, "client_dom");
    assert.equal(item.extraction_method, "browser_selected_text");
    assert.match(item.body, /Provided by: browser selection/);
    assert.match(item.body, /Selected text:/);
    assert.match(item.body, /remembered browser capture/);
  });

  it("upgrades an existing Substack preview with selected browser text", async () => {
    const url = "https://example.substack.com/p/paid-preview";
    const existing = insertCaptured({
      source_type: "url",
      title: "Substack preview",
      body: "Preview only",
      source_url: url,
      source_platform: "substack",
      capture_quality: "paywall_preview",
      extraction_method: "substack_readability",
      extraction_version: "capture-v0.7.5",
    });

    const res = await POST(
      mkReq({
        url,
        title: "Full Substack selection",
        selected_text:
          "This selected Substack article text has enough words to upgrade the existing preview capture safely.",
      }),
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, existing.id);
    const updated = getItem(existing.id)!;
    assert.equal(updated.capture_quality, "client_dom");
    assert.equal(updated.extraction_method, "browser_selected_text");
    assert.equal(updated.enrichment_state, "pending");
    assert.match(updated.body, /This selected Substack article text/);
  });

  it("rejects too-short selected text without creating an item", async () => {
    const url = "https://example.com/short-selection";
    const res = await POST(mkReq({ url, selected_text: "too short" }));

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.action, "rejected_too_short");
    assert.equal(body.error, "text_too_short");
    const rowsForUrl = getDb()
      .prepare("SELECT COUNT(*) AS count FROM items WHERE source_url = ?")
      .get(url) as { count: number };
    assert.equal(rowsForUrl.count, 0);
  });

  it("rejects too-short pasted text without overwriting a weak item", async () => {
    const url = "https://www.linkedin.com/posts/short-text";
    const existing = insertCaptured({
      source_type: "url",
      title: "LinkedIn link",
      body: "Preview only",
      source_url: url,
      source_platform: "linkedin",
      capture_quality: "metadata_only",
      extraction_method: "linkedin_opengraph",
      extraction_version: "capture-v0.7.5",
    });

    const res = await POST(mkReq({ url, note: `${url}\ntoo short` }));

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.action, "rejected_too_short");
    assert.equal(getItem(existing.id)?.body, "Preview only");
  });

  it("does not overwrite an existing strong capture with pasted text", async () => {
    const url = "https://www.youtube.com/watch?v=strong12345";
    const existing = insertCaptured({
      source_type: "youtube",
      title: "Strong YouTube",
      body: "existing transcript body",
      source_url: url,
      source_platform: "youtube",
      capture_quality: "metadata_plus_transcript",
      extraction_method: "youtube_innertube_timedtext",
      extraction_version: "capture-v0.7.5",
    });

    const res = await POST(mkReq({
      url,
      note: `${url}\nThese are extra notes with enough words but should not overwrite a strong capture.`,
    }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "duplicate");
    assert.equal(body.itemId, existing.id);
    assert.equal(getItem(existing.id)?.body, "existing transcript body");
  });
});
