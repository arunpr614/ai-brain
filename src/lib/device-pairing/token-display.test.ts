import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTokenVisibleInText,
  maskTokenForDisplay,
} from "./token-display";

describe("device pairing token display", () => {
  it("masks valid tokens without returning the raw value", () => {
    const token = `${"a".repeat(32)}${"b".repeat(32)}`;
    const masked = maskTokenForDisplay(token);

    assert.equal(masked, "aaaaaa...bbbb");
    assert.notEqual(masked, token);
  });

  it("uses a safe placeholder for missing or short values", () => {
    assert.equal(maskTokenForDisplay(null), "Token hidden");
    assert.equal(maskTokenForDisplay(undefined), "Token hidden");
    assert.equal(maskTokenForDisplay("short"), "Token hidden");
  });

  it("detects accidental raw token visibility in text", () => {
    const token = `${"c".repeat(32)}${"d".repeat(32)}`;
    assert.equal(isTokenVisibleInText(`value ${token}`, token), true);
    assert.equal(isTokenVisibleInText(`value ${maskTokenForDisplay(token)}`, token), false);
  });
});
