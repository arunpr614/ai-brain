import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_ERROR_SINK_DIR = mkdtempSync(
  join(tmpdir(), "brain-error-sink-test-"),
);
process.env.BRAIN_DB_PATH = join(TEST_ERROR_SINK_DIR, "test.sqlite");
