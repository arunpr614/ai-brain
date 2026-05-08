#!/usr/bin/env node
/**
 * F-052 (v0.3.1): end-to-end smoke that exits non-zero if the hardening
 * invariants regress. Runs against a throwaway SQLite file so it leaves
 * the real data/brain.sqlite untouched.
 *
 * Covers:
 *   - Migrations apply cleanly on a fresh DB (F-000)
 *   - WAL + synchronous=NORMAL pragmas stick (F-048)
 *   - Items INSERT + FTS5 search round-trip (v0.2.0 regression check)
 *   - Tags + collections CRUD + per-item attach/detach (v0.3.0 regression)
 *   - PIN set + session token issue + verify + reject tamper (F-043)
 *
 * TODOs (wired in but assert-off until implemented):
 *   - F-207 bulk-tag / bulk-collection / bulk-delete (T-B-5)
 *   - B-301 postProcessTitle (T-B-4)
 *
 * Usage:
 *   npm run smoke    # added in T-B-6 release prep
 *   node scripts/smoke-v0.3.1.mjs
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmpRoot = mkdtempSync(join(tmpdir(), "ai-brain-smoke-"));
const tmpDbPath = join(tmpRoot, "brain.sqlite");
process.env.BRAIN_DB_PATH = tmpDbPath;

console.log(`[smoke] tmp DB at ${tmpDbPath}`);

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
  // Imports after BRAIN_DB_PATH is set — DB singleton opens against tmp file.
  const { getDb } = await import("../src/db/client.ts");
  const { insertCaptured, searchItems, deleteItem } = await import(
    "../src/db/items.ts"
  );
  const {
    upsertTag,
    attachTagToItem,
    listTagsForItem,
    detachTagFromItem,
  } = await import("../src/db/tags.ts");
  const {
    createCollection,
    attachItemToCollection,
    listCollectionsForItem,
    deleteCollection,
  } = await import("../src/db/collections.ts");
  const { setPin, verifyPin, issueSessionToken, verifySessionToken } =
    await import("../src/lib/auth.ts");

  console.log("\n[1/5] schema + pragmas");
  await section("WAL journal mode", () => {
    const mode = getDb().pragma("journal_mode", { simple: true });
    assert.equal(String(mode).toLowerCase(), "wal");
  });
  await section("synchronous=NORMAL", () => {
    const sync = getDb().pragma("synchronous", { simple: true });
    assert.equal(sync, 1);
  });

  console.log("\n[2/5] items + FTS5");
  let itemId;
  await section("insertCaptured + getItem", () => {
    const row = insertCaptured({
      source_type: "note",
      title: "Growth loops in consumer products",
      body: "Loops turn attention into more attention. Retention beats acquisition in the long run.",
    });
    itemId = row.id;
    assert.ok(itemId);
    assert.equal(row.title, "Growth loops in consumer products");
  });
  await section("FTS5 search returns the item", () => {
    const hits = searchItems("growth loops");
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].id, itemId);
  });

  console.log("\n[3/5] tags + collections");
  let tagId, collectionId;
  await section("upsertTag + attachTagToItem + listTagsForItem", () => {
    const tag = upsertTag("growth", "manual");
    tagId = tag.id;
    attachTagToItem(itemId, tagId);
    const tags = listTagsForItem(itemId);
    assert.equal(tags.length, 1);
    assert.equal(tags[0].name, "growth");
  });
  await section("detachTagFromItem", () => {
    detachTagFromItem(itemId, tagId);
    assert.equal(listTagsForItem(itemId).length, 0);
  });
  await section("createCollection + attach + list", () => {
    const c = createCollection("Growth reads");
    collectionId = c.id;
    attachItemToCollection(itemId, collectionId);
    const cs = listCollectionsForItem(itemId);
    assert.equal(cs.length, 1);
    assert.equal(cs[0].name, "Growth reads");
  });

  console.log("\n[4/5] auth");
  await section("setPin + verifyPin", () => {
    setPin("1234");
    assert.equal(verifyPin("1234"), true);
    assert.equal(verifyPin("9999"), false);
  });
  await section("session token round-trip", () => {
    const tok = issueSessionToken();
    assert.equal(verifySessionToken(tok), true);
    const [, mac] = tok.split(".");
    const tampered = `${Date.now() + 3_600_000}.${mac}`;
    assert.equal(verifySessionToken(tampered), false);
  });

  console.log("\n[5/5] teardown");
  await section("deleteItem + deleteCollection", () => {
    deleteItem(itemId);
    deleteCollection(collectionId);
  });

  // ---------- B-301 postProcessTitle (T-B-4 landed) ----------
  console.log("\n[bonus] B-301 postProcessTitle");
  const { postProcessTitle } = await import("../src/lib/enrich/pipeline.ts");
  await section("slug input is de-hyphenated + title-cased", () => {
    assert.equal(
      postProcessTitle("Growth-Loops-Messy-Draft"),
      "Growth Loops Messy Draft",
    );
  });
  await section("compound-adjective titles with spaces survive untouched", () => {
    assert.equal(
      postProcessTitle("State-of-the-Art 2026"),
      "State-of-the-Art 2026",
    );
  });

  // ---------- F-207 bulk actions (T-B-5 landed) ----------
  console.log("\n[bonus] F-207 bulk actions");
  const {
    bulkTagItemsAction,
    bulkAttachCollectionAction,
    bulkDeleteItemsAction,
  } = await import("../src/app/actions.ts");

  // Seed three items.
  const seedIds = [];
  for (const title of ["Bulk A", "Bulk B", "Bulk C"]) {
    const row = insertCaptured({
      source_type: "note",
      title,
      body: `Body for ${title} — enough text to survive the 200-char guard is not required here because enrichment never runs in the smoke`,
    });
    seedIds.push(row.id);
  }

  await section("bulkTagItemsAction attaches to all 3 items", async () => {
    const res = await bulkTagItemsAction(seedIds, "bulk-smoke");
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.count, 3);
    for (const id of seedIds) {
      const names = listTagsForItem(id).map((t) => t.name);
      assert.ok(names.includes("bulk-smoke"));
    }
  });

  let smokeCollectionId;
  await section("bulkAttachCollectionAction attaches all 3 items", async () => {
    const c = createCollection("Bulk smoke collection");
    smokeCollectionId = c.id;
    const res = await bulkAttachCollectionAction(seedIds, smokeCollectionId);
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.count, 3);
    for (const id of seedIds) {
      const cs = listCollectionsForItem(id).map((x) => x.id);
      assert.ok(cs.includes(smokeCollectionId));
    }
  });

  await section("bulkDeleteItemsAction removes all 3 items", async () => {
    const res = await bulkDeleteItemsAction(seedIds);
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.count, 3);
    const { getItem } = await import("../src/db/items.ts");
    for (const id of seedIds) {
      assert.equal(getItem(id), null);
    }
  });

  await section("bulk actions reject empty input with {ok: false}", async () => {
    const res = await bulkDeleteItemsAction([]);
    assert.equal(res.ok, false);
  });
}

try {
  await run();
} catch (err) {
  console.error(`[smoke] fatal: ${err.stack ?? err.message}`);
  failures++;
}

rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n[smoke] ${failures} FAILED`);
  process.exit(1);
}
console.log("\n[smoke] all checks passed");
