import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatTimestampLabel,
  matchQuoteToTranscript,
  type TimestampedSegment,
} from "./quote-matcher";

test("formatTimestampLabel formats milliseconds into MM:SS and HH:MM:SS", () => {
  assert.equal(formatTimestampLabel(0), "00:00");
  assert.equal(formatTimestampLabel(65_000), "01:05");
  assert.equal(formatTimestampLabel(3_725_000), "1:02:05");
});

test("matchQuoteToTranscript matches exact single segment quotes", () => {
  const segments: TimestampedSegment[] = [
    { start_ms: 0, end_ms: 4000, text: "Welcome everyone to today's deep dive session." },
    { start_ms: 4000, end_ms: 9500, text: "Neural networks are fundamentally function approximators." },
    { start_ms: 9500, end_ms: 15000, text: "We will demonstrate backpropagation from scratch." },
  ];

  const match = matchQuoteToTranscript("Neural networks are fundamentally function approximators.", segments);
  assert.ok(match);
  assert.equal(match.startMs, 4000);
  assert.equal(match.timestampLabel, "00:04");
  assert.equal(match.confidence, 1.0);
});

test("matchQuoteToTranscript matches quotes spanning multiple adjacent segments", () => {
  const segments: TimestampedSegment[] = [
    { start_ms: 10_000, end_ms: 14_000, text: "When we scale up compute," },
    { start_ms: 14_000, end_ms: 18_000, text: "the loss curves follow predictable power laws." },
    { start_ms: 18_000, end_ms: 22_000, text: "This is the core insight behind modern foundation models." },
  ];

  const match = matchQuoteToTranscript("When we scale up compute, the loss curves follow predictable power laws.", segments);
  assert.ok(match);
  assert.equal(match.startMs, 10_000);
  assert.equal(match.timestampLabel, "00:10");
});

test("matchQuoteToTranscript falls back to fuzzy token overlap", () => {
  const segments: TimestampedSegment[] = [
    { start_ms: 30_000, end_ms: 35_000, text: "In practice, backprop with gradient descent" },
    { start_ms: 35_000, end_ms: 40_000, text: "iteratively updates weights using the chain rule of calculus." },
  ];

  const match = matchQuoteToTranscript("backprop with gradient descent updates weights with chain rule", segments);
  assert.ok(match);
  assert.equal(match.startMs, 30_000);
});

test("matchQuoteToTranscript returns null for non-matching quotes or empty segments", () => {
  const segments: TimestampedSegment[] = [
    { start_ms: 0, end_ms: 5000, text: "Hello world" },
  ];
  assert.equal(matchQuoteToTranscript("completely unrelated quantum mechanics discussion", segments), null);
  assert.equal(matchQuoteToTranscript("", segments), null);
  assert.equal(matchQuoteToTranscript("Hello", []), null);
});
