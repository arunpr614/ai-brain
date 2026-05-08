/**
 * Shared JSONL error sink — F-050 pattern lifted for v0.4.0 reuse.
 *
 * Originally inline in `src/lib/queue/enrichment-worker.ts`; lifted here in
 * T-5 so the embed pipeline (EMBED_* errors) and generator (P-4 orphan
 * citations) write to the same sink without duplicating rotation logic.
 *
 * Two-file rotation: at 5 MB, rename errors.jsonl → errors.jsonl.1,
 * dropping whatever was previously at .1.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const ERRORS_LOG_PATH = resolve(process.cwd(), "data/errors.jsonl");
export const ERRORS_LOG_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Append a JSON-encoded entry to errors.jsonl. Swallows fs failures so a
 * disk issue never cascades into a worker crash. Caller should always
 * include a `type` field so consumers can filter.
 */
export function logError(entry: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(ERRORS_LOG_PATH), { recursive: true });
    if (existsSync(ERRORS_LOG_PATH)) {
      const { size } = statSync(ERRORS_LOG_PATH);
      if (size >= ERRORS_LOG_MAX_BYTES) {
        renameSync(ERRORS_LOG_PATH, `${ERRORS_LOG_PATH}.1`);
      }
    }
    appendFileSync(ERRORS_LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch (err) {
    console.warn(`[errors-sink] write failed: ${(err as Error).message}`);
  }
}
