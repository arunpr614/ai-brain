import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-processing-workflow-test-"));
process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
