import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANDROID_CAPTURE_SOURCE_HEADER,
  androidCaptureSourceHeaders,
  androidJsonCaptureHeaders,
  androidPdfCaptureHeaders,
} from "./request";

describe("Android share capture request headers", () => {
  it("marks native share captures as Android", () => {
    assert.deepEqual(androidCaptureSourceHeaders(), {
      [ANDROID_CAPTURE_SOURCE_HEADER]: "android",
    });
  });

  it("keeps JSON capture auth and content-type headers", () => {
    assert.deepEqual(androidJsonCaptureHeaders("token-123"), {
      "content-type": "application/json",
      authorization: "Bearer token-123",
      [ANDROID_CAPTURE_SOURCE_HEADER]: "android",
    });
  });

  it("keeps PDF upload auth and checksum headers", () => {
    assert.deepEqual(androidPdfCaptureHeaders("token-123", "sha256-abc"), {
      authorization: "Bearer token-123",
      "x-expected-sha256": "sha256-abc",
      [ANDROID_CAPTURE_SOURCE_HEADER]: "android",
    });
  });
});
