import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-note-provider-policy-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
process.env.EMBED_PROVIDER = "gemini";
process.env.EMBED_MODEL = "gemini-embedding-001";
process.env.LLM_ASK_PROVIDER = "openrouter";
process.env.LLM_ASK_MODEL = "anthropic/claude-sonnet-4-6";

export const TEST_DB_DIR = tmp;

