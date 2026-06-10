import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildYoutubeUserTextCapture } from "./youtube-user-text";
import type { ItemRow } from "@/db/client";

function existingYoutubeItem(): ItemRow {
  return {
    id: "yt",
    source_type: "youtube",
    capture_source: "telegram",
    source_url: "https://www.youtube.com/watch?v=abc12345678",
    title: "Existing YouTube Title",
    author: "Existing Channel",
    body: "Metadata body",
    summary: null,
    quotes: null,
    category: null,
    captured_at: 0,
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: "youtube_antibot_metadata_only",
    total_pages: null,
    total_chars: 13,
    duration_seconds: 123,
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_version: "capture-v0.7.5",
    published_at: Date.parse("2025-01-01T00:00:00.000Z"),
    thumbnail_url: "https://i.ytimg.com/example.jpg",
    description: "Existing description",
    batch_id: null,
  };
}

describe("YouTube user-provided text capture", () => {
  it("preserves existing YouTube metadata while replacing weak body text", async () => {
    const result = await buildYoutubeUserTextCapture({
      canonicalUrl: "https://www.youtube.com/watch?v=abc12345678",
      platform: "youtube",
      videoId: "abc12345678",
      userText: "This is the pasted transcript with enough useful words to save.",
      existingItem: existingYoutubeItem(),
    });

    assert.equal(result.title, "Existing YouTube Title");
    assert.equal(result.author, "Existing Channel");
    assert.equal(result.duration_seconds, 123);
    assert.equal(result.thumbnail_url, "https://i.ytimg.com/example.jpg");
    assert.equal(result.capture_quality, "user_provided_full_text");
    assert.equal(result.extraction_method, "youtube_user_provided_text");
    assert.match(result.body, /Provided by: user paste/);
    assert.match(result.body, /This is the pasted transcript/);
    assert.deepEqual(result.artifacts?.map((artifact) => artifact.kind), ["user_provided_text"]);
  });
});
