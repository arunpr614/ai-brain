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
function section(name, fn) {
  try {
    fn();
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
  section("WAL journal mode", () => {
    const mode = getDb().pragma("journal_mode", { simple: true });
    assert.equal(String(mode).toLowerCase(), "wal");
  });
  section("synchronous=NORMAL", () => {
    const sync = getDb().pragma("synchronous", { simple: true });
    assert.equal(sync, 1);
  });

  console.log("\n[2/5] items + FTS5");
  let itemId;
  section("insertCaptured + getItem", () => {
    const row = insertCaptured({
      source_type: "note",
      title: "Growth loops in consumer products",
      body: "Loops turn attention into more attention. Retention beats acquisition in the long run.",
    });
    itemId = row.id;
    assert.ok(itemId);
    assert.equal(row.title, "Growth loops in consumer products");
  });
  section("FTS5 search returns the item", () => {
    const hits = searchItems("growth loops");
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].id, itemId);
  });

  console.log("\n[3/5] tags + collections");
  let tagId, collectionId;
  section("upsertTag + attachTagToItem + listTagsForItem", () => {
    const tag = upsertTag("growth", "manual");
    tagId = tag.id;
    attachTagToItem(itemId, tagId);
    const tags = listTagsForItem(itemId);
    assert.equal(tags.length, 1);
    assert.equal(tags[0].name, "growth");
  });
  section("detachTagFromItem", () => {
    detachTagFromItem(itemId, tagId);
    assert.equal(listTagsForItem(itemId).length, 0);
  });
  section("createCollection + attach + list", () => {
    const c = createCollection("Growth reads");
    collectionId = c.id;
    attachItemToCollection(itemId, collectionId);
    const cs = listCollectionsForItem(itemId);
    assert.equal(cs.length, 1);
    assert.equal(cs[0].name, "Growth reads");
  });

  console.log("\n[4/5] auth");
  section("setPin + verifyPin", () => {
    setPin("1234");
    assert.equal(verifyPin("1234"), true);
    assert.equal(verifyPin("9999"), false);
  });
  section("session token round-trip", () => {
    const tok = issueSessionToken();
    assert.equal(verifySessionToken(tok), true);
    const [, mac] = tok.split(".");
    const tampered = `${Date.now() + 3_600_000}.${mac}`;
    assert.equal(verifySessionToken(tampered), false);
  });

  console.log("\n[5/5] teardown");
  section("deleteItem + deleteCollection", () => {
    deleteItem(itemId);
    deleteCollection(collectionId);
  });

  // ---------- F-207 / B-301 hooks (T-B-* lands these) ----------
  // When F-207 ships, import the bulk actions from src/app/actions.ts and
  // exercise bulkTagItemsAction / bulkAttachCollectionAction /
  // bulkDeleteItemsAction here. Keep the section stub so T-B-6 doesn't
  // have to rediscover where to plug in.
  //
  // When B-301 ships, import postProcessTitle from src/lib/enrich/pipeline.ts
  // and assert {"Growth-Loops-Messy-Draft" -> "Growth Loops Messy Draft",
  //            "State-of-the-Art 2026"     -> "State-of-the-Art 2026"}.
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
