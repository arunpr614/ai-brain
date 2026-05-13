/**
 * Unit tests for src/lib/outbox/dedup.ts (OFFLINE-2 / plan v3 §5.2).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STRIP_PARAM_NAMES,
  STRIP_PARAM_PREFIXES,
  computeContentHash,
  noteContentHash,
  normalizeUrlForDedup,
  pdfContentHashFromBytes,
  sha256Hex,
  urlContentHash,
} from "./dedup";

describe("normalizeUrlForDedup", () => {
  it("strips utm_* params", () => {
    const out = normalizeUrlForDedup(
      "https://example.com/post?utm_source=newsletter&utm_medium=email&utm_campaign=q1&keep=yes",
    );
    assert.equal(out, "https://example.com/post?keep=yes");
  });

  it("strips named tracking params (fbclid, gclid, ref, source, etc.)", () => {
    for (const name of STRIP_PARAM_NAMES) {
      const out = normalizeUrlForDedup(`https://x.com/?${name}=abc&keep=1`);
      assert.equal(out, "https://x.com/?keep=1", `${name} should be stripped`);
    }
  });

  it("strips the fragment", () => {
    const out = normalizeUrlForDedup("https://example.com/post?a=1#section");
    assert.equal(out, "https://example.com/post?a=1");
  });

  it("lowercases the host", () => {
    const out = normalizeUrlForDedup("https://Example.COM/Post");
    assert.equal(out, "https://example.com/Post");
  });

  it("preserves path case", () => {
    const out = normalizeUrlForDedup("https://example.com/CamelPath");
    assert.equal(out, "https://example.com/CamelPath");
  });

  it("strips trailing slash on non-root paths", () => {
    assert.equal(normalizeUrlForDedup("https://x.com/foo/"), "https://x.com/foo");
  });

  it("preserves trailing slash on the root path", () => {
    assert.equal(normalizeUrlForDedup("https://x.com/"), "https://x.com/");
  });

  it("sorts retained query params by name for stability", () => {
    const a = normalizeUrlForDedup("https://x.com/?b=2&a=1&c=3");
    const b = normalizeUrlForDedup("https://x.com/?c=3&a=1&b=2");
    assert.equal(a, b);
    assert.equal(a, "https://x.com/?a=1&b=2&c=3");
  });

  it("keeps repeated values in original order within a key", () => {
    const out = normalizeUrlForDedup("https://x.com/?a=1&a=2");
    assert.equal(out, "https://x.com/?a=1&a=2");
  });

  it("treats the same URL with utm_* tracking and without as equal", async () => {
    const a = await urlContentHash("https://example.com/post");
    const b = await urlContentHash(
      "https://example.com/post?utm_source=tw&utm_medium=share",
    );
    assert.equal(a, b);
  });

  it("treats fragments as cosmetic", async () => {
    const a = await urlContentHash("https://example.com/post");
    const b = await urlContentHash("https://example.com/post#deep-link");
    assert.equal(a, b);
  });

  it("STRIP_PARAM_PREFIXES contains utm_", () => {
    assert.ok(STRIP_PARAM_PREFIXES.includes("utm_"));
  });

  it("rejects unparseable URLs", () => {
    assert.throws(() => normalizeUrlForDedup("not a url"));
  });

  describe("YouTube canonicalization", () => {
    const CANONICAL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    it("collapses youtu.be/<id> to canonical watch?v=", () => {
      assert.equal(
        normalizeUrlForDedup("https://youtu.be/dQw4w9WgXcQ"),
        CANONICAL,
      );
    });

    it("collapses youtube.com/shorts/<id> to canonical watch?v=", () => {
      assert.equal(
        normalizeUrlForDedup("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
        CANONICAL,
      );
    });

    it("collapses youtube.com/embed/<id> to canonical watch?v=", () => {
      assert.equal(
        normalizeUrlForDedup("https://www.youtube.com/embed/dQw4w9WgXcQ"),
        CANONICAL,
      );
    });

    it("collapses watch?v= already-canonical form (idempotent)", () => {
      assert.equal(normalizeUrlForDedup(CANONICAL), CANONICAL);
    });

    it("ignores tracking params on YouTube URLs (covered by canonical collapse)", () => {
      assert.equal(
        normalizeUrlForDedup("https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=tw&t=42"),
        CANONICAL,
      );
    });

    it("yields the same dedup key for every recognized variant of the same video", async () => {
      const variants = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      ];
      const hashes = await Promise.all(variants.map((v) => urlContentHash(v)));
      // All variants must produce identical hashes.
      for (let i = 1; i < hashes.length; i++) {
        assert.equal(hashes[i], hashes[0], `variant index ${i} diverged`);
      }
    });

    it("does not collapse different video IDs", async () => {
      const a = await urlContentHash("https://youtu.be/aaaaaaaaaaa");
      const b = await urlContentHash("https://youtu.be/bbbbbbbbbbb");
      assert.notEqual(a, b);
    });

    it("non-YouTube URLs follow the generic param-stripping path", () => {
      assert.equal(
        normalizeUrlForDedup("https://example.com/post?utm_source=x"),
        "https://example.com/post",
      );
    });
  });
});

describe("sha256Hex", () => {
  it("returns 64-char lowercase hex for any input", async () => {
    const h = await sha256Hex("hello world");
    assert.equal(h.length, 64);
    assert.match(h, /^[0-9a-f]+$/);
  });

  it("matches known SHA-256 of 'abc'", async () => {
    const h = await sha256Hex("abc");
    assert.equal(
      h,
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("produces different hashes for different inputs", async () => {
    const a = await sha256Hex("a");
    const b = await sha256Hex("b");
    assert.notEqual(a, b);
  });
});

describe("urlContentHash", () => {
  it("normalizes before hashing", async () => {
    const a = await urlContentHash("https://Example.com/post?utm_source=x");
    const b = await urlContentHash("https://example.com/post");
    assert.equal(a, b);
  });

  it("differentiates legitimately different URLs", async () => {
    const a = await urlContentHash("https://example.com/post-1");
    const b = await urlContentHash("https://example.com/post-2");
    assert.notEqual(a, b);
  });
});

describe("noteContentHash", () => {
  it("differentiates {title='A B', body=''} from {title='A', body=' B'}", async () => {
    // The unit-separator inside the function makes these distinct.
    const a = await noteContentHash("A B", "");
    const b = await noteContentHash("A", " B");
    assert.notEqual(a, b);
  });

  it("is stable for identical inputs", async () => {
    const a = await noteContentHash("title", "body");
    const b = await noteContentHash("title", "body");
    assert.equal(a, b);
  });
});

describe("pdfContentHashFromBytes", () => {
  it("is the identity function (worker-computed hash passes through)", () => {
    assert.equal(
      pdfContentHashFromBytes("abc123def456"),
      "abc123def456",
    );
  });
});

describe("computeContentHash", () => {
  it("dispatches to urlContentHash for kind='url'", async () => {
    const direct = await urlContentHash("https://example.com/x");
    const via = await computeContentHash({ kind: "url", url: "https://example.com/x" });
    assert.equal(direct, via);
  });

  it("dispatches to noteContentHash for kind='note'", async () => {
    const direct = await noteContentHash("t", "b");
    const via = await computeContentHash({ kind: "note", title: "t", body: "b" });
    assert.equal(direct, via);
  });

  it("returns the worker hash unchanged for kind='pdf'", async () => {
    const via = await computeContentHash({ kind: "pdf", bytesSha256: "deadbeef" });
    assert.equal(via, "deadbeef");
  });
});
