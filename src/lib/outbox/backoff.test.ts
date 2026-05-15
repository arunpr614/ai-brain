/**
 * Unit tests for src/lib/outbox/backoff.ts (OFFLINE-2 / plan v3 §5.3).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_DELAY_MS,
  JITTER_RATIO,
  MAX_DELAY_MS,
  applyJitter,
  baseDelayMs,
  nextRetryAt,
  parseRetryAfterMs,
} from "./backoff";

describe("baseDelayMs", () => {
  it("matches the plan §5.3 schedule for attempts 1..9", () => {
    const expected = [
      [1, 10_000],
      [2, 20_000],
      [3, 40_000],
      [4, 80_000],
      [5, 160_000],
      [6, 320_000],
      [7, 640_000],
      [8, 1_280_000],
      [9, MAX_DELAY_MS], // capped
    ] as const;
    for (const [attempts, ms] of expected) {
      assert.equal(baseDelayMs(attempts), ms, `attempts=${attempts}`);
    }
  });

  it("caps at MAX_DELAY_MS for very high attempt counts", () => {
    assert.equal(baseDelayMs(100), MAX_DELAY_MS);
    assert.equal(baseDelayMs(10_000), MAX_DELAY_MS);
  });

  it("clamps zero / negative attempts to attempt-1 behavior", () => {
    assert.equal(baseDelayMs(0), BASE_DELAY_MS);
    assert.equal(baseDelayMs(-5), BASE_DELAY_MS);
  });

  it("floors fractional attempts", () => {
    assert.equal(baseDelayMs(2.7), 20_000);
  });
});

describe("applyJitter", () => {
  it("returns delay * (1 - JITTER_RATIO) when rng() = 0", () => {
    const delay = 1000;
    const out = applyJitter(delay, () => 0);
    assert.equal(out, Math.round(delay * (1 - JITTER_RATIO)));
  });

  it("returns delay * (1 + JITTER_RATIO * (2 * 0.999... - 1)) when rng() ≈ 1", () => {
    const delay = 1000;
    const out = applyJitter(delay, () => 0.999_999);
    // rng→0.999... gives jitter approaching +JITTER_RATIO
    const approx = delay * (1 + JITTER_RATIO);
    assert.ok(Math.abs(out - approx) <= 1, `got ${out}, expected near ${approx}`);
  });

  it("returns delay unchanged when rng() = 0.5 (jitter = 0)", () => {
    const delay = 12345;
    const out = applyJitter(delay, () => 0.5);
    assert.equal(out, delay);
  });

  it("never returns a negative value", () => {
    const out = applyJitter(0, () => 0);
    assert.equal(out, 0);
  });
});

describe("nextRetryAt", () => {
  it("composes baseDelayMs(attempts) + jitter and adds to now", () => {
    const now = 1_000_000;
    const out = nextRetryAt(1, { now, rng: () => 0.5 });
    assert.equal(out, now + 10_000);
  });

  it("respects the 1-hour cap at high attempts", () => {
    const now = 0;
    const out = nextRetryAt(20, { now, rng: () => 0.5 });
    assert.equal(out, MAX_DELAY_MS);
  });

  it("uses Date.now() and Math.random() when args omitted", () => {
    const before = Date.now();
    const out = nextRetryAt(1);
    const after = Date.now();
    // Output should be within [before + 7.5s, after + 12.5s] given ±25% jitter
    assert.ok(out >= before + 7_500 && out <= after + 12_500, `got ${out}`);
  });
});

describe("parseRetryAfterMs", () => {
  it("returns null for null/empty/whitespace", () => {
    assert.equal(parseRetryAfterMs(null), null);
    assert.equal(parseRetryAfterMs(""), null);
    assert.equal(parseRetryAfterMs("   "), null);
  });

  it("parses integer seconds", () => {
    assert.equal(parseRetryAfterMs("60"), 60_000);
    assert.equal(parseRetryAfterMs("0"), 0);
    assert.equal(parseRetryAfterMs("3600"), 3_600_000);
  });

  it("parses fractional seconds", () => {
    assert.equal(parseRetryAfterMs("1.5"), 1_500);
  });

  it("parses an HTTP-date relative to `now`", () => {
    const now = Date.parse("2026-05-13T10:00:00Z");
    const future = "Wed, 13 May 2026 10:01:00 GMT";
    assert.equal(parseRetryAfterMs(future, now), 60_000);
  });

  it("clamps a past HTTP-date to 0", () => {
    const now = Date.parse("2026-05-13T10:00:00Z");
    const past = "Wed, 13 May 2026 09:00:00 GMT";
    assert.equal(parseRetryAfterMs(past, now), 0);
  });

  it("returns null for unparseable input", () => {
    assert.equal(parseRetryAfterMs("nonsense"), null);
  });

  it("rejects negative seconds", () => {
    assert.equal(parseRetryAfterMs("-5"), null);
  });
});
