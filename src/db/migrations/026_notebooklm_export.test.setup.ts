import { cpSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-notebooklm-migration-test-"));
export const PRE_026_DIR = join(TEST_DB_DIR, "migrations-pre-026");
export const ALL_MIGRATIONS_DIR = resolve(process.cwd(), "src/db/migrations");

mkdirSync(PRE_026_DIR);
for (const file of readdirSync(ALL_MIGRATIONS_DIR)) {
  if (file.endsWith(".sql") && file.localeCompare("026_notebooklm_export.sql") < 0) {
    cpSync(join(ALL_MIGRATIONS_DIR, file), join(PRE_026_DIR, basename(file)));
  }
}

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_MIGRATIONS_DIR = PRE_026_DIR;
