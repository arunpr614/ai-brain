import { cpSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-notebooklm-url-migration-test-"));
export const PRE_027_DIR = join(TEST_DB_DIR, "migrations-pre-027");
export const ALL_MIGRATIONS_DIR = resolve(process.cwd(), "src/db/migrations");

mkdirSync(PRE_027_DIR);
for (const file of readdirSync(ALL_MIGRATIONS_DIR)) {
  if (file.endsWith(".sql") && file.localeCompare("027_notebooklm_url_sources.sql") < 0) {
    cpSync(join(ALL_MIGRATIONS_DIR, file), join(PRE_027_DIR, basename(file)));
  }
}

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_MIGRATIONS_DIR = PRE_027_DIR;
