/**
 * F-051 (v0.3.1): first test file in the project. Uses Node 20's built-in
 * `node:test` runner via `tsx` so TS + path aliases work without extra
 * tooling. See package.json `test` script and docs/plans/v0.3.1-polish.md
 * §T-A-7.
 *
 * Target: the pure `shouldSweep(now, lastSweepAt)` helper introduced by
 * F-045 so the worker loop's rolling sweep has coverage.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSweep } from "./enrichment-worker";

// STALE_CLAIM_MS is not exported (intentional — it's a worker-internal
// constant). Tests exercise the function at known boundaries instead.
const STALE_CLAIM_MS = 90_000;

describe("shouldSweep", () => {
  it("returns true on first call when lastSweepAt = 0", () => {
    assert.equal(shouldSweep(1_000_000, 0), true);
  });

  it("returns false when less than STALE_CLAIM_MS has elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - (STALE_CLAIM_MS - 1)), false);
  });

  it("returns true exactly at STALE_CLAIM_MS elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - STALE_CLAIM_MS), true);
  });

  it("returns true when more than STALE_CLAIM_MS has elapsed", () => {
    const now = 1_000_000;
    assert.equal(shouldSweep(now, now - (STALE_CLAIM_MS + 1)), true);
  });

  it("is monotonic — once it fires at T, it keeps firing at T + delta", () => {
    const base = 1_000_000;
    const lastSweep = base - STALE_CLAIM_MS;
    for (let d = 0; d < 10; d++) {
      assert.equal(shouldSweep(base + d * 1000, lastSweep), true);
    }
  });
});
