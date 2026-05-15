/**
 * Unit tests for src/lib/outbox/pdf-hash.ts (OFFLINE-9 / plan v3 §5.2 B-2).
 *
 * Node has no Worker constructor, so these tests exercise the inline
 * fallback path (which calls hashBytes from sha256-worker.ts). The
 * worker-spawning path is exercised manually via APK build per plan §9.4.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { __resetForTests, hashPdfBlob, hashPdfBuffer } from "./pdf-hash";

describe("hashPdfBuffer (inline fallback)", () => {
  beforeEach(() => __resetForTests());

  it("matches the SHA-256 test vector for 'abc'", async () => {
    const bytes = new TextEncoder().encode("abc").buffer;
    const hex = await hashPdfBuffer(bytes);
    assert.equal(hex, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("matches the SHA-256 of empty bytes", async () => {
    const hex = await hashPdfBuffer(new ArrayBuffer(0));
    assert.equal(hex, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("returns 64-char lowercase hex", async () => {
    const bytes = new TextEncoder().encode("any input").buffer;
    const hex = await hashPdfBuffer(bytes);
    assert.equal(hex.length, 64);
    assert.match(hex, /^[0-9a-f]+$/);
  });
});

describe("hashPdfBlob (inline fallback)", () => {
  beforeEach(() => __resetForTests());

  it("produces the same digest as hashPdfBuffer for the same bytes", async () => {
    const text = "shared content";
    const blob = new Blob([new TextEncoder().encode(text)], { type: "application/pdf" });
    const fromBlob = await hashPdfBlob(blob);
    const fromBuffer = await hashPdfBuffer(new TextEncoder().encode(text).buffer);
    assert.equal(fromBlob, fromBuffer);
  });

  it("hashes a 256 KB blob without throwing", async () => {
    const big = new Uint8Array(256 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = (i * 11) & 0xff;
    const blob = new Blob([big], { type: "application/pdf" });
    const hex = await hashPdfBlob(blob);
    assert.equal(hex.length, 64);
  });
});
