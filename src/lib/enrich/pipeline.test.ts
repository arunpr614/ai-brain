/**
 * B-301 tests for postProcessTitle — the de-hyphenation helper added in
 * v0.3.1 to rewrite slug-shaped LLM titles without damaging legitimate
 * compound-adjective titles.
 *
 * Rule (tightened per self-critique P-1): fire ONLY when the title has
 * zero spaces AND at least two hyphens.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { postProcessTitle } from "./pipeline";

describe("postProcessTitle", () => {
  describe("fires on pure slug inputs (0 spaces, ≥2 hyphens)", () => {
    it("Growth-Loops-Messy-Draft → Growth Loops Messy Draft", () => {
      assert.equal(
        postProcessTitle("Growth-Loops-Messy-Draft"),
        "Growth Loops Messy Draft",
      );
    });

    it("Why-the-Best-PMs-Say-No → Why the Best PMs Say No", () => {
      assert.equal(
        postProcessTitle("Why-the-Best-PMs-Say-No"),
        "Why the Best PMs Say No",
      );
    });

    it("HYPHENATED-ALL-CAPS → Hyphenated All Caps (normalises case)", () => {
      assert.equal(
        postProcessTitle("HYPHENATED-ALL-CAPS"),
        "Hyphenated All Caps",
      );
    });
  });

  describe("does NOT fire on titles containing any space", () => {
    it("preserves State-of-the-Art 2026 (3 hyphens but 1 space)", () => {
      assert.equal(
        postProcessTitle("State-of-the-Art 2026"),
        "State-of-the-Art 2026",
      );
    });

    it("preserves Long-term thinking (1 hyphen, 1 space)", () => {
      assert.equal(
        postProcessTitle("Long-term thinking"),
        "Long-term thinking",
      );
    });
  });

  describe("does NOT fire on titles with fewer than 2 hyphens", () => {
    it("preserves Already Clean Title (0 hyphens)", () => {
      assert.equal(
        postProcessTitle("Already Clean Title"),
        "Already Clean Title",
      );
    });

    it("preserves single-word (1 hyphen, 0 spaces)", () => {
      assert.equal(postProcessTitle("single-word"), "single-word");
    });
  });

  describe("edge cases", () => {
    it("empty string round-trips", () => {
      assert.equal(postProcessTitle(""), "");
    });

    it("small-word lowercasing: the/of/a/etc are lowercased after position 0", () => {
      // Deliberately constructed slug input to trigger small-word handling.
      assert.equal(
        postProcessTitle("A-Tale-of-Two-Products"),
        "A Tale of Two Products",
      );
    });

    it("first word always title-cases even if it's a small word", () => {
      assert.equal(
        postProcessTitle("the-Only-Way-Forward"),
        "The Only Way Forward",
      );
    });
  });
});
