/**
 * CLI utility to trigger or poll Anthropic Message Batches for AI Brain library items.
 *
 * Usage:
 *   node --import tsx scripts/batch-backfill-library.ts [--submit] [--poll] [--status] [--requeue-errors]
 *
 * Options:
 *   --submit          Submit pending items to Anthropic Message Batches (up to 100 items per run).
 *   --poll            Poll and apply results for all in-flight batch IDs.
 *   --status          Show count of items in each enrichment state + in-flight batches.
 *   --requeue-errors  Reset items in 'error' state back to 'pending' so they can be batched.
 */

import { getDb } from "../src/db/client";
import { getEnrichProvider } from "../src/lib/llm/factory";
import {
  submitDailyBatch,
  pollAllInFlightBatches,
  BATCH_SIZE_CAP,
} from "../src/lib/queue/enrichment-batch";

async function main() {
  const args = process.argv.slice(2);
  const doSubmit = args.includes("--submit");
  const doPoll = args.includes("--poll");
  const doRequeue = args.includes("--requeue-errors");
  const showStatus = args.includes("--status") || (!doSubmit && !doPoll && !doRequeue);

  const db = getDb();

  if (doRequeue) {
    const result = db.prepare(
      `UPDATE items SET enrichment_state = 'pending', batch_id = NULL WHERE enrichment_state = 'error'`
    ).run();
    db.prepare(
      `UPDATE enrichment_jobs SET state = 'pending', claimed_at = NULL, last_error = NULL, attempts = 0 WHERE state = 'error'`
    ).run();
    console.log(`[backfill] Re-queued ${result.changes} errored items back to 'pending'.`);
  }

  if (doSubmit) {
    console.log(`[backfill] Submitting pending items to Anthropic Message Batches (cap: ${BATCH_SIZE_CAP})...`);
    try {
      const provider = getEnrichProvider();
      const outcome = await submitDailyBatch(provider);
      if (outcome) {
        console.log(`[backfill] Batch submitted successfully! batch_id=${outcome.batch_id}, count=${outcome.count}`);
      } else {
        console.log(`[backfill] No eligible pending items to submit (or provider lacks batch support).`);
      }
    } catch (err) {
      console.error(`[backfill] Batch submission failed: ${(err as Error).message}`);
    }
  }

  if (doPoll) {
    console.log(`[backfill] Polling all in-flight batches...`);
    try {
      const provider = getEnrichProvider();
      await pollAllInFlightBatches(provider);
      console.log(`[backfill] Polling pass complete.`);
    } catch (err) {
      console.error(`[backfill] Polling failed: ${(err as Error).message}`);
    }
  }

  if (showStatus) {
    const stateCounts = db.prepare(
      `SELECT enrichment_state, COUNT(*) as count FROM items GROUP BY enrichment_state`
    ).all() as Array<{ enrichment_state: string; count: number }>;

    console.log("\n--- AI Brain Enrichment Status ---");
    for (const row of stateCounts) {
      console.log(`  ${row.enrichment_state.padEnd(12)} : ${row.count}`);
    }

    const inFlight = db.prepare(
      `SELECT DISTINCT batch_id, COUNT(*) as count FROM items WHERE enrichment_state = 'batched' GROUP BY batch_id`
    ).all() as Array<{ batch_id: string; count: number }>;

    if (inFlight.length > 0) {
      console.log("\nIn-Flight Batch IDs:");
      for (const row of inFlight) {
        console.log(`  ${row.batch_id} (${row.count} items)`);
      }
    } else {
      console.log("\nNo batches currently in-flight.");
    }
    console.log("----------------------------------\n");
  }
}

void main();
