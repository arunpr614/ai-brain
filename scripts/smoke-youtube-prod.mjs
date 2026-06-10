#!/usr/bin/env node
/**
 * Production-host YouTube smoke.
 *
 * This is read-only: it exercises the extractor directly and creates no
 * Library items. It is intentionally tolerant of YouTube's server-side
 * behavior from hosting providers: transcript, no-transcript, truncated,
 * and anti-bot metadata-only results are all acceptable as long as Brain
 * returns saveable captured content.
 */
import assert from "node:assert/strict";

const { canonicalYoutubeUrl, extractYoutubeVideo } = await import(
  "../src/lib/capture/youtube.ts"
);

const videoId = process.env.BRAIN_YOUTUBE_SMOKE_VIDEO_ID || "jNQXAC9IVRw";
const allowedWarnings = new Set([
  null,
  "no_transcript",
  "transcript_truncated_2h",
  "youtube_antibot_metadata_only",
]);

const result = await extractYoutubeVideo(videoId, canonicalYoutubeUrl(videoId));

assert.equal(result.source_url, canonicalYoutubeUrl(videoId));
assert.ok(result.title.length > 0, "title is populated");
assert.ok(result.body.length > 0, "body is populated");
assert.ok(
  allowedWarnings.has(result.extraction_warning),
  `unexpected warning: ${result.extraction_warning}`,
);

if (result.extraction_warning === "youtube_antibot_metadata_only") {
  assert.match(result.body, /Transcript unavailable/i);
}

console.log("[smoke:youtube:prod] ok", {
  videoId,
  title: result.title,
  warning: result.extraction_warning,
});
