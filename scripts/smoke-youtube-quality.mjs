#!/usr/bin/env node
/**
 * YouTube transcript quality gate.
 *
 * This is intentionally separate from `smoke:youtube`, which verifies save
 * reliability. Product fallback may save metadata-only items, but release
 * validation should still notice when known public transcript fixtures collapse
 * to metadata-only.
 */
const { extractYoutubeVideo } = await import("../src/lib/capture/youtube.ts");

const gate = (process.env.YOUTUBE_QUALITY_GATE ?? "strict").toLowerCase();
const fixtures = [
  {
    name: "Me at the zoo",
    videoId: "jNQXAC9IVRw",
    url: "https://youtu.be/jNQXAC9IVRw",
    expectTranscriptPattern: /elephants/i,
  },
];

const rows = [];
for (const fixture of fixtures) {
  const started = Date.now();
  try {
    const result = await extractYoutubeVideo(fixture.videoId, fixture.url);
    const transcriptPresent =
      result.capture_quality !== "metadata_only" &&
      fixture.expectTranscriptPattern.test(result.body);
    rows.push({
      fixture: fixture.videoId,
      name: fixture.name,
      ok: transcriptPresent,
      capture_quality: result.capture_quality ?? null,
      extraction_warning: result.extraction_warning ?? null,
      elapsed_ms: Date.now() - started,
    });
  } catch (err) {
    rows.push({
      fixture: fixture.videoId,
      name: fixture.name,
      ok: false,
      capture_quality: null,
      extraction_warning: err.code ?? err.name ?? "error",
      elapsed_ms: Date.now() - started,
    });
  }
}

console.table(rows);

const failed = rows.filter((row) => !row.ok);
if (failed.length === 0) {
  console.log("\n[smoke:youtube:quality] transcript quality gate passed");
  process.exit(0);
}

const message = `[smoke:youtube:quality] ${failed.length}/${rows.length} known transcript fixture(s) failed quality expectations`;
if (gate === "warn") {
  console.warn(`\nWARN ${message}`);
  process.exit(0);
}

console.error(`\nFAIL ${message}`);
process.exit(1);

