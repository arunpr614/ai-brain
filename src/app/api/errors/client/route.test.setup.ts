import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_CLIENT_ERROR_DIR = mkdtempSync(
  join(tmpdir(), "brain-client-error-route-test-"),
);
process.env.BRAIN_DB_PATH = join(TEST_CLIENT_ERROR_DIR, "test.sqlite");
