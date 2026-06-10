import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectCapturePlatform } from "./platform";

describe("detectCapturePlatform", () => {
  it("detects YouTube Shorts while canonicalizing to watch URL", () => {
    const result = detectCapturePlatform("https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share");
    assert.equal(result.platform, "youtube_short");
    assert.equal(result.videoId, "dQw4w9WgXcQ");
    assert.equal(result.canonicalUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(result.sourceType, "youtube");
  });

  it("detects LinkedIn and strips common tracking params", () => {
    const result = detectCapturePlatform(
      "https://www.linkedin.com/posts/example?utm_source=x&trk=public_post#comments",
    );
    assert.equal(result.platform, "linkedin");
    assert.equal(result.canonicalUrl, "https://www.linkedin.com/posts/example");
  });

  it("detects Substack hosts", () => {
    const result = detectCapturePlatform("https://example.substack.com/p/hello?utm_campaign=post");
    assert.equal(result.platform, "substack");
    assert.equal(result.canonicalUrl, "https://example.substack.com/p/hello");
  });

  it("falls back to generic articles", () => {
    const result = detectCapturePlatform("https://example.com/p/ordinary-post");
    assert.equal(result.platform, "generic_article");
  });
});
