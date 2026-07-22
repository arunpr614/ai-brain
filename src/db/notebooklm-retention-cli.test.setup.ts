import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const NOTEBOOKLM_RETENTION_CLI_TEST_DIR = mkdtempSync(
  join(tmpdir(), "brain-notebooklm-retention-cli-test-"),
);

process.env.BRAIN_DB_PATH = join(
  NOTEBOOKLM_RETENTION_CLI_TEST_DIR,
  "brain.sqlite",
);
process.env.BRAIN_API_TOKEN = "ef".repeat(32);
