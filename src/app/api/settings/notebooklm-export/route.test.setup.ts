import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "brain-notebooklm-settings-route-test-"));

process.env.BRAIN_DB_PATH = join(TEST_DB_DIR, "test.sqlite");
process.env.BRAIN_API_TOKEN = "34".repeat(32);
process.env.BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED = "1";
process.env.BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED = "1";
process.env.BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED = "1";
