import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTranscriptCardState } from "./youtube-transcript-card-badge";

describe("YouTubeTranscriptCardBadge State Machine", () => {
  it("returns null for non-YouTube items", () => {
    const state = computeTranscriptCardState({
      isYouTube: false,
      hasTranscript: false,
    });
    assert.equal(state, null);
  });

  it("returns 'attached' when item has a transcript", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: true,
      jobState: "done",
    });
    assert.equal(state, "attached");
  });

  it("returns 'transcribing' when job is actively running on Mac", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: false,
      jobState: "running",
      isMacOnline: true,
    });
    assert.equal(state, "transcribing");
  });

  it("returns 'queued_online' when job is pending and Mac is online", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: false,
      jobState: "pending",
      isMacOnline: true,
    });
    assert.equal(state, "queued_online");
  });

  it("returns 'queued_offline' when job is pending and Mac is offline", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: false,
      jobState: "pending",
      isMacOnline: false,
    });
    assert.equal(state, "queued_offline");
  });

  it("returns 'error' when job failed and needs retry", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: false,
      jobState: "retryable_error",
    });
    assert.equal(state, "error");
  });

  it("returns 'needs_transcript' when metadata-only and no active job", () => {
    const state = computeTranscriptCardState({
      isYouTube: true,
      hasTranscript: false,
      jobState: null,
    });
    assert.equal(state, "needs_transcript");
  });
});
