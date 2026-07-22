import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-notebooklm-auth-test-"));
export const TEST_API_TOKEN = "ab".repeat(32);

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_API_TOKEN = TEST_API_TOKEN;
