#!/usr/bin/env node
/**
 * v0.5.1 YouTube capture smoke — code-only assertions.
 *
 * No DB boot; no network. Statically verifies the pivot invariants:
 *   - Migration 007 exists with the right ADD COLUMN clause
 *   - items.source_type CHECK already accepts 'youtube' (inherited)
 *   - extractVideoId covers all 5 positive URL shapes + 3 negative cases
 *   - InsertCapturedInput includes duration_seconds
 *   - Zero new npm dependencies vs v0.5.0 (SC-10) — only version bumped
 *   - package.json version is 0.5.1
 *   - extension/ and android/ unchanged vs v0.5.0 (SC-9)
 *
 * Opt-in real-network smoke (`scripts/smoke-youtube.mjs`) covers the
 * live InnerTube + timedtext path.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");

let failures = 0;
async function section(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

async function run() {
  // 1) Migration 007 exists with the right DDL
  await section("migration 007 adds duration_seconds column", () => {
    const sql = readFileSync(
      join(repoRoot, "src/db/migrations/007_youtube_duration.sql"),
      "utf8",
    );
    assert.match(
      sql,
      /ALTER\s+TABLE\s+items\s+ADD\s+COLUMN\s+duration_seconds\s+INTEGER/i,
      "expected ALTER TABLE items ADD COLUMN duration_seconds INTEGER",
    );
  });

  // 2) source_type CHECK accepts youtube (unchanged since 001; guard it)
  await section("items.source_type CHECK accepts 'youtube'", () => {
    const sql = readFileSync(
      join(repoRoot, "src/db/migrations/001_initial_schema.sql"),
      "utf8",
    );
    assert.match(sql, /source_type[^;]*CHECK[^)]*'youtube'/i);
  });

  // 3) URL detection covers 5 positive shapes + 3 negative cases
  await section("extractVideoId: 5 positive + 3 negative URL shapes", async () => {
    const { extractVideoId, canonicalYoutubeUrl } = await import(
      "../src/lib/capture/youtube.ts"
    );
    const positives = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];
    for (const u of positives) {
      assert.equal(extractVideoId(u), "dQw4w9WgXcQ", `positive: ${u}`);
    }
    const negatives = [
      "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
      "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxx",
      "https://youtu.be/",
    ];
    for (const u of negatives) {
      assert.equal(extractVideoId(u), null, `negative: ${u}`);
    }
    assert.equal(
      canonicalYoutubeUrl("dQw4w9WgXcQ"),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  // 4) InsertCapturedInput has duration_seconds threaded through
  await section("InsertCapturedInput signature includes duration_seconds", () => {
    const src = readFileSync(join(repoRoot, "src/db/items.ts"), "utf8");
    assert.match(
      src,
      /duration_seconds\?\s*:\s*number\s*\|\s*null/,
      "InsertCapturedInput must declare duration_seconds",
    );
    assert.match(
      src,
      /duration_seconds/,
      "insertCaptured INSERT must reference duration_seconds",
    );
  });

  // 5) SC-10: no new runtime dependencies vs v0.5.0
  await section("no new npm dependencies vs v0.5.0 (SC-10)", () => {
    const v051 = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    );
    const v050Raw = execSync("git show v0.5.0:package.json", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const v050 = JSON.parse(v050Raw);
    const deps051 = Object.keys(v051.dependencies ?? {}).sort();
    const deps050 = Object.keys(v050.dependencies ?? {}).sort();
    assert.deepEqual(
      deps051,
      deps050,
      `dependencies changed between v0.5.0 and current:\n  +${deps051.filter((d) => !deps050.includes(d)).join(", ") || "-"}\n  -${deps050.filter((d) => !deps051.includes(d)).join(", ") || "-"}`,
    );
  });

  // 6) package.json version bumped to 0.5.1
  await section("package.json version is 0.5.1", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    );
    assert.equal(pkg.version, "0.5.1");
  });

  // 7) SC-9: extension/ and android/ unchanged vs v0.5.0
  await section("extension/ + android/ unchanged vs v0.5.0 (SC-9)", () => {
    const diff = execSync(
      "git diff v0.5.0..HEAD -- extension/ android/",
      { cwd: repoRoot, encoding: "utf8" },
    ).trim();
    assert.equal(
      diff,
      "",
      `extension/ or android/ changed since v0.5.0:\n${diff.slice(0, 500)}`,
    );
  });

  // 8) Fixture files exist
  await section("YouTube fixtures committed", () => {
    const dir = join(repoRoot, "src/lib/capture/__fixtures__");
    assert.ok(existsSync(join(dir, "youtube-player-response.json")));
    assert.ok(existsSync(join(dir, "youtube-timedtext.xml")));
    assert.ok(existsSync(join(dir, "README.md")));
  });
}

await run();

if (failures > 0) {
  console.error(`\n[smoke v0.5.1] ${failures} FAILED`);
  process.exit(1);
}
console.log("\n[smoke v0.5.1] all checks passed");
