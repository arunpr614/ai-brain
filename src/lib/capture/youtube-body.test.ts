import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildYoutubeBody, extractChapters } from "./youtube-body";

describe("youtube body builder", () => {
  it("builds retrieval-friendly metadata plus transcript text", () => {
    const body = buildYoutubeBody({
      title: "Demo",
      channel: "Channel",
      publishedAt: Date.parse("2026-01-01T00:00:00Z"),
      durationSeconds: 125,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      description: "00:00 Intro\n01:00 Main idea",
      transcript: "[0:00] hello",
      captureQuality: "metadata_plus_transcript",
    });
    assert.match(body, /^Title: Demo/);
    assert.match(body, /Duration: 2:05/);
    assert.match(body, /Chapters:\n00:00 Intro\n01:00 Main idea/);
    assert.match(body, /Transcript:\n\[0:00\] hello/);
  });

  it("extracts timestamp chapter lines", () => {
    assert.deepEqual(extractChapters("hello\n0:00 Intro\n10:15 Deep dive"), [
      "0:00 Intro",
      "10:15 Deep dive",
    ]);
  });
});
