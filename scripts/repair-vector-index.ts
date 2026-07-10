import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import type { VectorAuditReport } from "../src/lib/vector/audit";
import { repairVectorIndex } from "../src/lib/vector/repair";

function valueAfter(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

const dbArg = valueAfter("--db");
const auditArg = valueAfter("--audit");
const confirmAudit = valueAfter("--confirm-audit");
const outArg = valueAfter("--out");
const backupConfirmed = process.argv.includes("--backup-confirmed");

if (!dbArg || !auditArg || !confirmAudit || !outArg || !backupConfirmed) {
  throw new Error(
    "Usage: repair-vector-index --db <snapshot.sqlite> --audit <audit.json> " +
      "--confirm-audit <sha256> --backup-confirmed --out <repair-report.json>",
  );
}

const dbPath = resolve(dbArg);
const approved = JSON.parse(readFileSync(resolve(auditArg), "utf8")) as VectorAuditReport;
if (approved.auditId !== confirmAudit) throw new Error("Confirmed audit ID does not match audit file");

const db = new Database(dbPath, { fileMustExist: true });
try {
  sqliteVec.load(db);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const { after, ...repaired } = repairVectorIndex(db, approved.auditId);
  const output = {
    database: dbPath,
    approvedAuditId: approved.auditId,
    repairedAt: new Date().toISOString(),
    repaired,
    after,
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  writeFileSync(resolve(outArg), json, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(json);
} finally {
  db.close();
}
