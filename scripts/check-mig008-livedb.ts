/**
 * One-shot: apply migrations against the live dev DB, then assert the
 * post-migration shape. Run with BRAIN_DB_PATH already pointing at the
 * dev DB (default `data/brain.sqlite`).
 */
import { getDb } from "../src/db/client";

interface ColRow {
  name: string;
  type: string;
  notnull: number;
}
interface StateRow {
  enrichment_state: string;
  n: number;
}
interface MigRow {
  name: string;
}

async function main(): Promise<void> {
  const db = getDb(); // runs migrations
  const cols = db.prepare("PRAGMA table_info(items)").all() as ColRow[];
  console.log("items columns:");
  for (const c of cols) {
    console.log(`  ${c.name.padEnd(20)} ${c.type.padEnd(8)} notnull=${c.notnull}`);
  }
  const hasBatchId = cols.some((c) => c.name === "batch_id");
  console.log(`\nbatch_id column present: ${hasBatchId}`);

  const states = db
    .prepare("SELECT enrichment_state, COUNT(*) AS n FROM items GROUP BY enrichment_state")
    .all() as StateRow[];
  console.log(`\nenrichment_state distribution (live dev DB):`);
  for (const s of states) {
    console.log(`  ${s.enrichment_state.padEnd(10)} ${s.n}`);
  }

  const applied = db
    .prepare("SELECT name FROM _migrations ORDER BY name")
    .all() as MigRow[];
  console.log(`\napplied migrations:`);
  for (const m of applied) {
    console.log(`  ${m.name}`);
  }

  const items = db.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number };
  const fts = db.prepare("SELECT COUNT(*) AS n FROM items_fts").get() as { n: number };
  console.log(`\nFTS5 sync sanity: items=${items.n}, items_fts=${fts.n} (should be equal)`);
  if (items.n !== fts.n) {
    console.error("WARN: FTS5 row count drift after migration 008");
    process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
