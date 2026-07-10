import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-rotate-token-route-test-"));
mkdirSync(tmp, { recursive: true });
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");

export const TEST_DB_DIR = tmp;

export function cleanupTmpDb(): void {
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
}
