import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { auditVectorIndex } from "../src/lib/vector/audit";

function valueAfter(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

const dbPath = resolve(valueAfter("--db") ?? process.env.BRAIN_DB_PATH ?? "data/brain.sqlite");
const outPath = valueAfter("--out");
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  sqliteVec.load(db);
  const report = auditVectorIndex(db);
  const json = `${JSON.stringify({ database: dbPath, ...report }, null, 2)}\n`;
  if (outPath) writeFileSync(resolve(outPath), json, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(json);
  if (!report.safeToEnableWriters) process.exitCode = 2;
} finally {
  db.close();
}

