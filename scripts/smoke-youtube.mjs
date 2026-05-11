#!/usr/bin/env node
/**
 * v0.5.1 T-YT-10 — real-network smoke against live YouTube.
 *
 * Opt-in. NOT part of `npm run smoke`. Run on demand via
 * `npm run smoke:youtube`. Fails if YouTube's InnerTube or timedtext
 * responses drift in a way that breaks our extractor.
 *
 * Three fixture videos:
 *   - Me at the zoo (jNQXAC9IVRw) — 19s, has auto-captions
 *   - Rickroll (dQw4w9WgXcQ)     — 3:32, iconic stable test case
 *   - Short with likely no caps  — placeholder; test the no_transcript
 *     branch without pinning a specific Short (Shorts churn constantly)
 */
import assert from "node:assert/strict";
const { extractYoutubeVideo } = await import("../src/lib/capture/youtube.ts");

let failures = 0;
async function section(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    console.log(`  ok  ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

await section("Me at the zoo — title + author + transcript", async () => {
  const result = await extractYoutubeVideo(
    "jNQXAC9IVRw",
    "https://youtu.be/jNQXAC9IVRw",
  );
  assert.equal(result.title, "Me at the zoo");
  assert.equal(result.author, "jawed");
  assert.equal(result.duration_seconds, 19);
  assert.equal(result.extraction_warning, null);
  assert.match(result.body, /elephants/i);
  assert.match(result.body, /^\[0:0\d\]/m, "at least one [0:0X] timestamp line");
});

await section("Rickroll — has captions, reasonable length", async () => {
  const result = await extractYoutubeVideo(
    "dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
  );
  assert.ok(result.title.length > 0);
  assert.ok(result.author, "author populated");
  assert.ok((result.duration_seconds ?? 0) > 30, "duration > 30s");
  // Body may be no_transcript placeholder OR real transcript; we accept
  // either because YouTube sometimes returns no captions for music.
  assert.ok(
    result.body.length > 0,
    "body is non-empty (transcript or placeholder)",
  );
});

if (failures > 0) {
  console.error(`\n[smoke:youtube] ${failures} FAILED`);
  process.exit(1);
}
console.log("\n[smoke:youtube] all checks passed");
