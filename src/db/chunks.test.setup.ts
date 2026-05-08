/**
 * Side-effect-only setup for chunks.test.ts. Reserves a tmp DB path BEFORE
 * the client singleton is constructed. Mirrors src/lib/auth.test.setup.ts
 * — tsx's CJS output rejects top-level await in test files, so env mutation
 * has to happen in a separately-imported file.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-chunks-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");

export const TEST_DB_DIR = tmp;
