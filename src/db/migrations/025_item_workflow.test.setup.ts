import { cpSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-processing-migration-test-"));
export const PRE_025_DIR = join(TEST_DB_DIR, "migrations-pre-025");
export const THROUGH_025_DIR = join(TEST_DB_DIR, "migrations-through-025");
export const ALL_MIGRATIONS_DIR = resolve(process.cwd(), "src/db/migrations");
mkdirSync(PRE_025_DIR);
mkdirSync(THROUGH_025_DIR);
for (const file of readdirSync(ALL_MIGRATIONS_DIR)) {
  if (file.endsWith(".sql") && file.localeCompare("025_item_workflow.sql") < 0) {
    cpSync(join(ALL_MIGRATIONS_DIR, file), join(PRE_025_DIR, basename(file)));
  }
  if (file.endsWith(".sql") && file.localeCompare("025_item_workflow.sql") <= 0) {
    cpSync(join(ALL_MIGRATIONS_DIR, file), join(THROUGH_025_DIR, basename(file)));
  }
}
process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_MIGRATIONS_DIR = PRE_025_DIR;
process.env.BRAIN_PROCESSING_HMAC_SECRET = "migration-test-secret";
