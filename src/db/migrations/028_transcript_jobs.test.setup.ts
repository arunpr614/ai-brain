import { cpSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-transcript-jobs-migration-test-"));
export const PRE_028_DIR = join(TEST_DB_DIR, "migrations-pre-028");
export const ALL_MIGRATIONS_DIR = resolve(process.cwd(), "src/db/migrations");

mkdirSync(PRE_028_DIR);
for (const file of readdirSync(ALL_MIGRATIONS_DIR)) {
  if (file.endsWith(".sql") && file.localeCompare("028_transcript_jobs.sql") < 0) {
    cpSync(join(ALL_MIGRATIONS_DIR, file), join(PRE_028_DIR, basename(file)));
  }
}

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_MIGRATIONS_DIR = PRE_028_DIR;
