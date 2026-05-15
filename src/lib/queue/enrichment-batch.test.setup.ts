/**
 * Mirrors src/db/migrations/008_batch_id.test.setup.ts — sets BRAIN_DB_PATH
 * to a tmp directory BEFORE getDb() is first called so the test exercises
 * a clean SQLite file with all migrations applied.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-enrich-batch-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");

export const TEST_DB_DIR = tmp;
