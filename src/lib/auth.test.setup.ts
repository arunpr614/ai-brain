/**
 * Side-effect setup for auth tests: reserve a tmp SQLite path and set
 * BRAIN_DB_PATH before any DB-reaching module is loaded. Must be
 * imported as the first line of the test file.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmpRoot = mkdtempSync(join(tmpdir(), "ai-brain-auth-test-"));
const tmpDbPath = join(tmpRoot, "brain.sqlite");
mkdirSync(tmpRoot, { recursive: true });
process.env.BRAIN_DB_PATH = tmpDbPath;

export function cleanupTmpDb(): void {
  rmSync(tmpRoot, { recursive: true, force: true });
}
