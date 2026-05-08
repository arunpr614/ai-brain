import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-ask-route-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
// Unreachable port — isOllamaAlive() returns false, exercising T-10.
process.env.OLLAMA_HOST = "http://127.0.0.1:1";

export const TEST_DB_DIR = tmp;
