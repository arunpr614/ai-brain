import "../../../db/transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { existsSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { beforeEach, describe, it } from "node:test";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { TEST_DB_DIR } from "@/db/transcript-jobs.test.setup";

const SCRIPT = resolve(process.cwd(), "scripts/backfill-youtube-transcripts-prod.mjs");
const RUN_DIR = join(TEST_DB_DIR, "operator-runs", "youtube-transcript-backfill");
const ERRORS_LOG = join(TEST_DB_DIR, "errors.jsonl");

function clearTables(): void {
  const db = getDb();
  db.prepare("DELETE FROM transcript_attempts").run();
  db.prepare("DELETE FROM transcript_jobs").run();
  db.prepare("DELETE FROM items").run();
  db.prepare("DELETE FROM settings").run();
  rmSync(RUN_DIR, { recursive: true, force: true });
  rmSync(ERRORS_LOG, { force: true });
}

function insertWeakYoutube(title: string, videoId = randomVideoId()) {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  getDb().prepare("DELETE FROM transcript_jobs WHERE item_id = ?").run(item.id);
  return item;
}

function insertInvalidYoutube() {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: "https://www.youtube.com/watch?v=short",
    title: "Invalid video",
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  getDb().prepare("DELETE FROM transcript_jobs WHERE item_id = ?").run(item.id);
  return item;
}

function insertLookalikeYoutubeHost() {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: "https://notyoutube.com/watch?v=aaaaaaaaaaa",
    title: "Lookalike host",
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  getDb().prepare("DELETE FROM transcript_jobs WHERE item_id = ?").run(item.id);
  return item;
}

function setCooldown(cooldownUntil = Date.now() + 60_000): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('provider_health.youtube_timedtext', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(
      JSON.stringify({
        providerKey: "youtube_timedtext",
        providerName: "youtube_innertube_timedtext",
        cooldownUntil,
        failureCount: 1,
        lastFailureAt: Date.now(),
        lastFailureCode: "timedtext_http_429",
        lastStatusCode: 429,
        lastSuccessAt: null,
        updatedAt: Date.now(),
      }),
      Date.now(),
    );
}

function runScript(args: string[] = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_DB_PATH: join(TEST_DB_DIR, "test.sqlite"),
      BRAIN_OPERATOR_RUNS_DIR: RUN_DIR,
      BRAIN_ERRORS_LOG_PATH: ERRORS_LOG,
    },
    encoding: "utf8",
  });
}

function parseFinalJson(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  const start = trimmed.lastIndexOf("\n{");
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  return JSON.parse(jsonText) as Record<string, unknown>;
}

function transcriptJobCount(): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS count FROM transcript_jobs")
      .get() as { count: number }
  ).count;
}

function randomVideoId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 11);
}

describe("production YouTube transcript backfill script", () => {
  beforeEach(clearTables);

  it("defaults to dry-run and writes a summary without enqueueing jobs", () => {
    insertWeakYoutube("Dry run from prod script");

    const result = runScript(["--limit=10"]);
    assert.equal(result.status, 0, result.stderr);
    const body = parseFinalJson(result.stdout);

    assert.equal(body.dryRun, true);
    assert.equal(body.scanned, 1);
    assert.equal(body.eligible, 1);
    assert.equal(body.enqueued, 0);
    assert.equal(transcriptJobCount(), 0);
    assert.equal(typeof body.summaryPath, "string");
    assert.equal(existsSync(body.summaryPath as string), true);
  });

  it("requires an explicit small limit for real enqueue mode", () => {
    insertWeakYoutube("Real run guard");

    const missingLimit = runScript(["--run"]);
    assert.notEqual(missingLimit.status, 0);
    assert.match(missingLimit.stderr, /requires an explicit --limit/);

    const highLimit = runScript(["--run", "--limit=26"]);
    assert.notEqual(highLimit.status, 0);
    assert.match(highLimit.stderr, /limit must be 25 or less/);
  });

  it("enqueues at most the requested real-run limit", () => {
    insertWeakYoutube("Limited run 1", "aaaaaaaaaaa");
    insertWeakYoutube("Limited run 2", "bbbbbbbbbbb");

    const result = runScript(["--run", "--limit=1"]);
    assert.equal(result.status, 0, result.stderr);
    const body = parseFinalJson(result.stdout);

    assert.equal(body.dryRun, false);
    assert.equal(body.enqueued, 1);
    assert.equal(transcriptJobCount(), 1);
  });

  it("skips existing active jobs and terminal jobs", () => {
    const active = insertWeakYoutube("Active job", "ccccccccccc");
    const terminal = insertWeakYoutube("Terminal job", "ddddddddddd");
    getDb()
      .prepare(
        `INSERT INTO transcript_jobs (item_id, source_platform, video_id, state, priority)
         VALUES (?, 'youtube', 'ccccccccccc', 'retryable_error', 10)`,
      )
      .run(active.id);
    getDb()
      .prepare(
        `INSERT INTO transcript_jobs (item_id, source_platform, video_id, state, priority)
         VALUES (?, 'youtube', 'ddddddddddd', 'ignored', 10)`,
      )
      .run(terminal.id);

    const result = runScript(["--run", "--limit=10"]);
    assert.equal(result.status, 0, result.stderr);
    const body = parseFinalJson(result.stdout);

    assert.equal(body.skippedExisting, 1);
    assert.equal(body.skippedTerminal, 1);
    assert.equal(body.enqueued, 0);
  });

  it("respects provider cooldown unless explicitly overridden", () => {
    insertWeakYoutube("Cooldown one", "eeeeeeeeeee");
    setCooldown();

    const cooled = runScript(["--run", "--limit=10"]);
    assert.equal(cooled.status, 0, cooled.stderr);
    const cooledBody = parseFinalJson(cooled.stdout);
    assert.equal(cooledBody.cooldownActive, true);
    assert.equal(cooledBody.skippedCooldown, 1);
    assert.equal(cooledBody.enqueued, 0);

    const ignored = runScript(["--run", "--limit=10", "--ignore-cooldown"]);
    assert.equal(ignored.status, 0, ignored.stderr);
    const ignoredBody = parseFinalJson(ignored.stdout);
    assert.equal(ignoredBody.cooldownActive, false);
    assert.equal(ignoredBody.enqueued, 1);
  });

  it("does not enqueue rows with invalid YouTube video ids", () => {
    insertInvalidYoutube();
    insertLookalikeYoutubeHost();

    const result = runScript(["--run", "--limit=10"]);
    assert.equal(result.status, 0, result.stderr);
    const body = parseFinalJson(result.stdout);

    assert.equal(body.skippedInvalidVideoId, 2);
    assert.equal(body.enqueued, 0);
    assert.equal(transcriptJobCount(), 0);
  });

  it("lists and clears only old summary json files", () => {
    insertWeakYoutube("Summary cleanup", "fffffffffff");
    const first = runScript(["--limit=10"]);
    assert.equal(first.status, 0, first.stderr);
    const body = parseFinalJson(first.stdout);
    const summaryPath = body.summaryPath as string;
    const keepPath = join(RUN_DIR, "do-not-delete.txt");
    writeFileSync(keepPath, "keep", "utf8");

    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    utimesSync(summaryPath, old, old);
    utimesSync(keepPath, old, old);

    const listed = runScript(["--list-runs"]);
    assert.equal(listed.status, 0, listed.stderr);
    const listedBody = parseFinalJson(listed.stdout);
    assert.equal(listedBody.count, 1);

    const cleared = runScript(["--clear-runs", "--older-than-days=1"]);
    assert.equal(cleared.status, 0, cleared.stderr);
    const clearedBody = parseFinalJson(cleared.stdout);
    assert.equal(clearedBody.deleted, 1);
    assert.equal(existsSync(summaryPath), false);
    assert.equal(existsSync(keepPath), true);
    assert.deepEqual(
      readdirSync(RUN_DIR).filter((name) => name.endsWith(".json")),
      [],
    );
  });
});
