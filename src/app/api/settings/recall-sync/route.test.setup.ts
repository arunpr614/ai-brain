import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_DIR = mkdtempSync(join(tmpdir(), "brain-recall-route-"));
process.env.BRAIN_DB_PATH = join(TEST_DIR, "test.sqlite");
process.env.BRAIN_RECALL_MANUAL_SYNC_UI_ENABLED = "1";
process.env.BRAIN_RECALL_MANUAL_WORKER_CONFIGURED = "1";
process.env.BRAIN_RECALL_SYNC_ENABLED = "1";
process.env.BRAIN_RECALL_WAKE_MARKER = join(TEST_DIR, "spool", "wake");
