import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-note-route-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
process.env.MANUAL_NOTES_UI_ENABLED = "1";
process.env.MANUAL_NOTES_WRITE_ENABLED = "1";
process.env.EMBED_PROVIDER = "ollama";
process.env.LLM_ASK_PROVIDER = "ollama";

export const TEST_DB_DIR = tmp;

