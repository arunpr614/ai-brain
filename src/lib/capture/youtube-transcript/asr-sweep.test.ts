import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/db/client";
import {
  enqueueAsrRefinementSweep,
  getAsrPipelineDashboardData,
} from "@/db/transcript-jobs";

describe("Autonomous Dual-Daily ASR Refinement Sweeps (TICKET-ASR-SWEEP-01..04)", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM transcript_jobs").run();
    db.prepare("DELETE FROM items WHERE id LIKE 'test_sweep_%'").run();
  });

  it("enqueues un-transcribed older YouTube items up to batch limit with priority 15 and sweep tags", () => {
    const db = getDb();
    const now = Date.now();
    const testIds: string[] = [];

    // Seed 5 candidate items
    for (let i = 1; i <= 5; i++) {
      const id = `test_sweep_yt_${i}`;
      testIds.push(id);
      db.prepare(`
        INSERT INTO items (
          id, source_type, title, body, source_platform, source_url, capture_quality, extraction_warning, captured_at
        ) VALUES (
          ?, 'youtube', ?, 'Sample body', 'youtube', ?, 'metadata_only', 'no_transcript', ?
        )
      `).run(
        id,
        `Candidate Video ${i}`,
        `https://www.youtube.com/watch?v=dQw4w9WgXc${i}`,
        now - i * 10000,
      );
    }

    // Run sweep with limit = 3 on targeted test set
    const result = enqueueAsrRefinementSweep({ limit: 3, batchId: "sweep_20260819_0300", now, itemIds: testIds });
    assert.equal(result.enqueuedCount, 3);
    assert.equal(result.batchId, "sweep_20260819_0300");
    assert.equal(result.itemIds.length, 3);

    // Verify transcript_jobs table state
    const jobs = db.prepare("SELECT * FROM transcript_jobs WHERE origin = 'autonomous_sweep' ORDER BY id ASC").all() as Array<{
      item_id: string;
      priority: number;
      origin: string;
      sweep_batch_id: string;
      sweep_timestamp: number;
      state: string;
    }>;

    assert.equal(jobs.length, 3);
    for (const job of jobs) {
      assert.equal(job.priority, 15);
      assert.equal(job.origin, "autonomous_sweep");
      assert.equal(job.sweep_batch_id, "sweep_20260819_0300");
      assert.equal(job.sweep_timestamp, now);
      assert.equal(job.state, "pending");
    }
  });

  it("is idempotent and does not create duplicates on repeated sweep runs", () => {
    const db = getDb();
    const now = Date.now();
    const itemId = "test_sweep_idem";

    db.prepare(`
      INSERT INTO items (
        id, source_type, title, body, source_platform, source_url, capture_quality, extraction_warning, captured_at
      ) VALUES (
        ?, 'youtube', 'Idempotent Video', 'Sample body', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'metadata_only', 'no_transcript', ?
      )
    `).run(itemId, now);

    const firstRun = enqueueAsrRefinementSweep({ limit: 10, batchId: "sweep_run_1", now, itemIds: [itemId] });
    assert.equal(firstRun.enqueuedCount, 1);

    const secondRun = enqueueAsrRefinementSweep({ limit: 10, batchId: "sweep_run_2", now: now + 5000, itemIds: [itemId] });
    assert.equal(secondRun.enqueuedCount, 1);

    // Same item is updated, not duplicated
    const totalJobs = db.prepare("SELECT COUNT(*) AS count FROM transcript_jobs WHERE item_id = ?").get(itemId) as { count: number };
    assert.equal(totalJobs.count, 1);
  });

  it("dashboard data queries return origin, sweep_batch_id, and sweep_timestamp across backlog and history", () => {
    const db = getDb();
    const now = Date.now();
    const itemId = "test_sweep_dash";

    db.prepare(`
      INSERT INTO items (
        id, source_type, title, body, source_platform, source_url, capture_quality, extraction_warning, captured_at
      ) VALUES (
        ?, 'youtube', 'Dashboard Video', 'Sample body', 'youtube', 'https://www.youtube.com/watch?v=dash123', 'metadata_only', 'no_transcript', ?
      )
    `).run(itemId, now);

    enqueueAsrRefinementSweep({ limit: 10, batchId: "sweep_dash_01", now, itemIds: [itemId] });

    const data = getAsrPipelineDashboardData("mac-m5-pro", now);
    const item = data.backlog.find((j) => j.item_id === itemId);
    assert.ok(item, "Item should exist in backlog");
    assert.equal(item.origin, "autonomous_sweep");
    assert.equal(item.sweep_batch_id, "sweep_dash_01");
    assert.equal(item.sweep_timestamp, now);
  });
});
