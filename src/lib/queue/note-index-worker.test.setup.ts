import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-note-index-worker-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
process.env.MANUAL_NOTES_UI_ENABLED = "1";
process.env.MANUAL_NOTES_WRITE_ENABLED = "1";
process.env.MANUAL_NOTES_WORKER_ENABLED = "1";
process.env.EMBED_PROVIDER = "ollama";
process.env.LLM_ASK_PROVIDER = "ollama";
delete process.env.BRAIN_BACKGROUND_WORKERS_MODE;
delete process.env.BRAIN_DEPLOYMENT_ENV;
delete process.env.BRAIN_PRODUCTION_RUNTIME;
delete process.env.BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE;
delete process.env.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED;
delete process.env.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED;
delete process.env.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED;

export const TEST_DB_DIR = tmp;
