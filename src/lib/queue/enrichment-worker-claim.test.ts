import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./enrichment-worker-claim.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { claimNext } from "./enrichment-worker";
import { resetProviderCache } from "@/lib/llm/factory";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetProviderCache();
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetProviderCache();
  }
}

test("claimNext: in batch mode, returns null so items accumulate for batch", () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  getDb().prepare("UPDATE enrichment_jobs SET state = 'done'").run();
  const item = insertCaptured({ source_type: "note", title: "batch note", body: "x".repeat(300) });

  withEnv({ LLM_ENRICH_MODE: "batch" }, () => {
    const claimed = claimNext();
    assert.equal(claimed, null);

    const check = getDb()
      .prepare("SELECT enrichment_state FROM items WHERE id = ?")
      .get(item.id) as { enrichment_state: string };
    assert.equal(check.enrichment_state, "pending");
  });
});

test("claimNext: in realtime mode, claims pending item and transitions to running", () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  getDb().prepare("UPDATE enrichment_jobs SET state = 'done'").run();
  const item = insertCaptured({ source_type: "note", title: "realtime note", body: "x".repeat(300) });

  withEnv({ LLM_ENRICH_MODE: "realtime" }, () => {
    const claimed = claimNext();
    assert.ok(claimed);
    assert.equal(claimed?.item_id, item.id);
    assert.equal(claimed?.state, "running");

    const check = getDb()
      .prepare("SELECT enrichment_state FROM items WHERE id = ?")
      .get(item.id) as { enrichment_state: string };
    assert.equal(check.enrichment_state, "running");
  });
});

test("claimNext: in hybrid mode, claims short items but leaves long items pending", () => {
  getDb().prepare("UPDATE items SET enrichment_state = 'done'").run();
  getDb().prepare("UPDATE enrichment_jobs SET state = 'done'").run();
  const longItem = insertCaptured({ source_type: "note", title: "long note", body: "x".repeat(600) });
  const shortItem = insertCaptured({ source_type: "note", title: "short note", body: "short" });

  withEnv({ LLM_ENRICH_MODE: "hybrid" }, () => {
    const claimed = claimNext();
    assert.ok(claimed);
    assert.equal(claimed?.item_id, shortItem.id);

    // Second claimNext finds no short items, leaving longItem pending
    const secondClaim = claimNext();
    assert.equal(secondClaim, null);

    const longCheck = getDb()
      .prepare("SELECT enrichment_state FROM items WHERE id = ?")
      .get(longItem.id) as { enrichment_state: string };
    assert.equal(longCheck.enrichment_state, "pending");
  });
});
