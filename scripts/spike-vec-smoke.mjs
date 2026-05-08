#!/usr/bin/env node
// R-VEC S-1 smoke test — verify sqlite-vec loads via better-sqlite3 and returns ordered neighbours.
// Run: node scripts/spike-vec-smoke.mjs

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const db = new Database(":memory:");
db.loadExtension(sqliteVec.getLoadablePath());

const { vec_version } = db.prepare("select vec_version() as vec_version").get();
console.log(`sqlite-vec version: ${vec_version}`);

db.exec("create virtual table vec_test using vec0(embedding float[4])");

const insert = db.prepare("insert into vec_test(rowid, embedding) values (?, ?)");
const toys = [
  [1, [0.1, 0.1, 0.1, 0.1]],
  [2, [0.2, 0.2, 0.2, 0.2]],
  [3, [0.9, 0.9, 0.9, 0.9]],
  [4, [-0.1, -0.1, -0.1, -0.1]],
];
for (const [rowid, v] of toys) {
  insert.run(BigInt(rowid), Buffer.from(new Float32Array(v).buffer));
}

const query = [0.15, 0.15, 0.15, 0.15];
const rows = db
  .prepare(
    "select rowid, distance from vec_test where embedding match ? order by distance limit 3"
  )
  .all(Buffer.from(new Float32Array(query).buffer));

console.log("top-3 neighbours for", query);
for (const row of rows) {
  console.log(`  rowid=${row.rowid}  distance=${row.distance.toFixed(6)}`);
}

if (rows.length !== 3) {
  console.error("FAIL: expected 3 rows");
  process.exit(1);
}
if (rows[0].rowid !== 1 && rows[0].rowid !== 2) {
  console.error("FAIL: nearest neighbour should be rowid 1 or 2");
  process.exit(1);
}

console.log("\nS-1 PASS: sqlite-vec loads and returns ordered neighbours.");
