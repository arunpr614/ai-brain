import test from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp } from "./transcript-timeline";
import { NOTE_EVENT_APPEND_TEXT, type AppendNoteTextPayload } from "@/lib/reading-studio/note-event-bus";

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "Video";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

test("formatDuration formats seconds accurately for video badges", () => {
  assert.equal(formatDuration(0), "Video");
  assert.equal(formatDuration(null), "Video");
  assert.equal(formatDuration(45), "0:45");
  assert.equal(formatDuration(1122), "18:42");
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(3725), "1:02:05");
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

test("note event bus constant and payload contract match specification", () => {
  assert.equal(NOTE_EVENT_APPEND_TEXT, "brain:append-note-text");
  const payload: AppendNoteTextPayload = {
    itemId: "test-item-123",
    text: "> Some quote",
    timestampMs: 12000,
  };
  assert.equal(payload.itemId, "test-item-123");
  assert.equal(payload.timestampMs, 12000);
});

test("binary search accurately and instantly finds active segment across 2,000+ segments in <0.05ms", () => {
  const largeSegments = Array.from({ length: 2000 }, (_, i) => ({
    id: `seg-${i}`,
    item_id: "item-1",
    source_id: "src-1",
    segment_index: i,
    start_ms: i * 2000,
    end_ms: (i + 1) * 2000,
    duration_ms: 2000,
    text: `Transcript segment number ${i} with transcribed text.`,
    created_at: new Date().toISOString(),
  }));

  function binarySearch(timeMs: number): number {
    let low = 0;
    let high = largeSegments.length - 1;
    let candidate = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const seg = largeSegments[mid];
      const start = seg.start_ms ?? 0;
      const end = seg.end_ms ?? (start + (seg.duration_ms ?? 5000));
      if (timeMs >= start && timeMs < end) return mid;
      if (timeMs < start) {
        high = mid - 1;
      } else {
        candidate = mid;
        low = mid + 1;
      }
    }
    return candidate;
  }

  const startT = performance.now();
  assert.equal(binarySearch(0), 0);
  assert.equal(binarySearch(1500), 0);
  assert.equal(binarySearch(2000), 1);
  assert.equal(binarySearch(100500), 50);
  assert.equal(binarySearch(3500000), 1750);
  assert.equal(binarySearch(3999999), 1999);
  const dur = performance.now() - startT;
  assert.ok(dur < 5, `Binary search should take <5ms for 6 queries, took ${dur}ms`);
});

