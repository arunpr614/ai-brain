import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-processing-routes-test-"));
process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_PROCESSING_HMAC_SECRET = "route-test-secret";
process.env.BRAIN_PUBLIC_ORIGIN = "https://brain.test";
process.env.PROCESSING_READ_ENABLED = "1";
process.env.PROCESSING_WRITE_ENABLED = "1";
process.env.PROCESSING_NAV_ENABLED = "1";
