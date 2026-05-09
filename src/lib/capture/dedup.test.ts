/**
 * Unit tests for src/lib/capture/dedup.ts (v0.5.0 T-12 / F-041).
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  DEDUP_WINDOW_MS,
  __resetDedupForTests,
  isDuplicateShare,
  shareDedupKey,
} from "./dedup";

describe("shareDedupKey", () => {
  it("composes source type + primary", () => {
    assert.equal(shareDedupKey("url", "https://x.com"), "url:https://x.com");
    assert.equal(shareDedupKey("note", "abc"), "note:abc");
    assert.equal(shareDedupKey("pdf", "doc.pdf"), "pdf:doc.pdf");
  });

  it("prevents collisions across source types", () => {
    assert.notEqual(
      shareDedupKey("url", "https://example.com"),
      shareDedupKey("note", "https://example.com"),
    );
  });
});

describe("isDuplicateShare", () => {
  beforeEach(() => __resetDedupForTests());

  it("returns false for a fresh key", () => {
    assert.equal(isDuplicateShare("k1"), false);
  });

  it("returns true for the same key within DEDUP_WINDOW_MS", () => {
    const t0 = 1_000_000;
    assert.equal(isDuplicateShare("k1", { now: t0 }), false);
    assert.equal(isDuplicateShare("k1", { now: t0 + 500 }), true);
    assert.equal(isDuplicateShare("k1", { now: t0 + DEDUP_WINDOW_MS - 1 }), true);
  });

  it("returns false once the window passes", () => {
    const t0 = 2_000_000;
    assert.equal(isDuplicateShare("k1", { now: t0 }), false);
    assert.equal(isDuplicateShare("k1", { now: t0 + DEDUP_WINDOW_MS + 1 }), false);
  });

  it("isolates distinct keys", () => {
    const t0 = 3_000_000;
    assert.equal(isDuplicateShare("a", { now: t0 }), false);
    assert.equal(isDuplicateShare("b", { now: t0 + 10 }), false);
    assert.equal(isDuplicateShare("a", { now: t0 + 20 }), true);
    assert.equal(isDuplicateShare("b", { now: t0 + 30 }), true);
  });

  it("uses a provided store independently of the global one", () => {
    const local = new Map<string, number>();
    assert.equal(isDuplicateShare("x", { now: 0, store: local }), false);
    assert.equal(isDuplicateShare("x", { now: 100, store: local }), true);
    // Global store is untouched — separate call returns false.
    assert.equal(isDuplicateShare("x", { now: 100 }), false);
  });
});
