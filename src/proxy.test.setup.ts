import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "brain-proxy-test-"));
process.env.BRAIN_DB_PATH = join(tmp, "test.sqlite");

export function cleanupProxyTestDb(): void {
  rmSync(tmp, { recursive: true, force: true });
}
