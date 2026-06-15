import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAndroidCaptureHeaders } from "./share-handler";

describe("share-handler Android capture headers", () => {
  it("marks APK capture requests as android while preserving request-specific headers", () => {
    const headers = buildAndroidCaptureHeaders("tok_123", {
      "content-type": "application/json",
    });

    assert.equal(headers.authorization, "Bearer tok_123");
    assert.equal(headers["x-brain-capture-source"], "android");
    assert.equal(headers["content-type"], "application/json");
  });
});
