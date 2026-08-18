import test from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp } from "./transcript-timeline";

test("formatTimestamp handles various millisecond durations accurately", () => {
  assert.equal(formatTimestamp(0), "00:00");
  assert.equal(formatTimestamp(null), "00:00");
  assert.equal(formatTimestamp(-100), "00:00");
  assert.equal(formatTimestamp(5000), "00:05");
  assert.equal(formatTimestamp(65000), "01:05");
  assert.equal(formatTimestamp(599000), "09:59");
  assert.equal(formatTimestamp(3600000), "1:00:00");
  assert.equal(formatTimestamp(3665000), "1:01:05");
  assert.equal(formatTimestamp(7325000), "2:02:05");
});

test("segment active index lookup accurately identifies segment by timecode", () => {
  const segments = [
    { id: "seg-1", start_ms: 0, end_ms: 5000, duration_ms: 5000, text: "Hello world" },
    { id: "seg-2", start_ms: 5000, end_ms: 12000, duration_ms: 7000, text: "Welcome to AI Brain" },
    { id: "seg-3", start_ms: 12000, end_ms: 20000, duration_ms: 8000, text: "Let's explore MLX Whisper" },
  ];

  function findActiveIndex(timeMs: number): number {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const start = seg.start_ms;
      const end = seg.end_ms;
      if (timeMs >= start && timeMs < end) return i;
    }
    return -1;
  }

  assert.equal(findActiveIndex(0), 0);
  assert.equal(findActiveIndex(2500), 0);
  assert.equal(findActiveIndex(5000), 1);
  assert.equal(findActiveIndex(11999), 1);
  assert.equal(findActiveIndex(12000), 2);
  assert.equal(findActiveIndex(19999), 2);
  assert.equal(findActiveIndex(25000), -1);
});

test("quote citation pin format creates markdown quote with timestamp link", () => {
  const segment = {
    id: "seg-10",
    start_ms: 185000,
    text: "Neural networks operate as loss-minimization engines over latent parameter spaces.",
  };

  const timeFormatted = formatTimestamp(segment.start_ms);
  const formattedQuote = `> "${segment.text}"\n> — *[⏱ ${timeFormatted}](?t=${segment.start_ms})*`;

  assert.equal(
    formattedQuote,
    `> "Neural networks operate as loss-minimization engines over latent parameter spaces."\n> — *[⏱ 03:05](?t=185000)*`,
  );
});
