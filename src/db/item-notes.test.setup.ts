import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-item-notes-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
process.env.OLLAMA_HOST = "http://127.0.0.1:11434";

export const TEST_DB_DIR = tmp;
