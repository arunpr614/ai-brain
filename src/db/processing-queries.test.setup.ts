import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-processing-query-test-"));
process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_PROCESSING_HMAC_SECRET = "query-test-secret";
