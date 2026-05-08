import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-chat-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");

export const TEST_DB_DIR = tmp;
