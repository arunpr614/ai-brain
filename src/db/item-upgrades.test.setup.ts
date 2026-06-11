import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-item-upgrades-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");
process.env.BRAIN_CAPTURE_ARTIFACT_ROOT = join(tmp, "artifacts");

export const TEST_DB_DIR = tmp;
