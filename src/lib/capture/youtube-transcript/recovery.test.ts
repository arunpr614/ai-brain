import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { YoutubeCaptureError } from "../youtube";
import { classifyYoutubeCaptureError } from "./recovery";

describe("classifyYoutubeCaptureError", () => {
  it("treats unavailable videos as terminal manual-needed failures", () => {
    const result = classifyYoutubeCaptureError(
      new YoutubeCaptureError("video_unavailable", "Video is private or deleted."),
    );

    assert.equal(result.state, "manual_needed");
    assert.equal(result.retryable, false);
    assert.equal(result.errorCode, "video_unavailable");
    assert.equal(result.errorMessage, "Video is private or deleted.");
  });

  it("treats invalid YouTube URLs as terminal manual-needed failures", () => {
    const result = classifyYoutubeCaptureError(
      new YoutubeCaptureError("invalid_url", "Missing video id."),
    );

    assert.equal(result.state, "manual_needed");
    assert.equal(result.retryable, false);
    assert.equal(result.errorCode, "invalid_youtube_url");
  });

  it("treats missing captions as manual-needed instead of retryable", () => {
    const result = classifyYoutubeCaptureError(
      new YoutubeCaptureError("no_captions", "No captions were available."),
    );

    assert.equal(result.state, "manual_needed");
    assert.equal(result.retryable, false);
    assert.equal(result.errorCode, "captions_unavailable");
  });

  it("keeps live-stream caption gaps retryable", () => {
    const result = classifyYoutubeCaptureError(
      new YoutubeCaptureError("live_stream", "Try again after the stream ends."),
    );

    assert.equal(result.state, "retryable_error");
    assert.equal(result.retryable, true);
    assert.equal(result.errorCode, "live_stream_captions_pending");
  });

  it("keeps InnerTube fetch failures retryable", () => {
    const result = classifyYoutubeCaptureError(
      new YoutubeCaptureError("fetch_failed", "InnerTube returned 429."),
    );

    assert.equal(result.state, "retryable_error");
    assert.equal(result.retryable, true);
    assert.equal(result.errorCode, "innertube_fetch_failed");
  });
});
