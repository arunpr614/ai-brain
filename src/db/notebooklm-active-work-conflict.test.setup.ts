import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(
  join(tmpdir(), "brain-notebooklm-active-work-conflict-test-"),
);

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_API_TOKEN = "cd".repeat(32);
