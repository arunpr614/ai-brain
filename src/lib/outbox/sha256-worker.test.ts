/**
 * Unit tests for src/lib/outbox/sha256-worker.ts (OFFLINE-2 / plan v3 §5.2).
 *
 * Tests run in Node — there is no `self` global, so the addEventListener
 * branch in the worker file is skipped at import time. We exercise the
 * pure `hashBytes` helper directly, which is what the worker calls
 * internally.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashBytes } from "./sha256-worker";

describe("hashBytes", () => {
  it("matches the known SHA-256 of 'abc' (single-block test vector)", async () => {
    const bytes = new TextEncoder().encode("abc");
    const hex = await hashBytes(bytes);
    assert.equal(
      hex,
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches SHA-256 of empty input", async () => {
    const hex = await hashBytes(new ArrayBuffer(0));
    assert.equal(
      hex,
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("accepts both ArrayBuffer and Uint8Array", async () => {
    const bytes = new TextEncoder().encode("hello");
    const fromUint = await hashBytes(bytes);
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const fromArrayBuffer = await hashBytes(ab);
    assert.equal(fromUint, fromArrayBuffer);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await hashBytes(new TextEncoder().encode("a"));
    const b = await hashBytes(new TextEncoder().encode("b"));
    assert.notEqual(a, b);
  });

  it("returns 64 lowercase hex characters", async () => {
    const hex = await hashBytes(new TextEncoder().encode("anything"));
    assert.equal(hex.length, 64);
    assert.match(hex, /^[0-9a-f]+$/);
  });

  it("hashes a 1 MB buffer without throwing", async () => {
    const big = new Uint8Array(1024 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
    const hex = await hashBytes(big);
    assert.equal(hex.length, 64);
  });
});
