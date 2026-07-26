import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeStage2FingerprintPreimage,
  stage2FingerprintSha256,
  type Stage2FingerprintValue,
} from "./stage2-fingerprints";

const syntheticAttachmentVectorA: readonly Stage2FingerprintValue[] = [
  "youtube_browser_transcript",
  "0000000000000000000000000000000000000000000000000000000000000000",
  "existing",
  "0123456789abcdef01234567",
  "0123456789abcdef0123456789abcdef",
  "7",
  "https://www.youtube.com/watch?v=abc123",
  "Títle",
  "alpha\nbeta",
  "test",
  "authorized_youtube_video",
  null,
  "en",
  "manual",
  "timestamped",
  "{\"fixture\":\"a\"}",
  "2000000000000",
  "60000",
  "2",
  "0",
  "0",
  "1000",
  "1000",
  "alpha",
  "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8",
  "1",
  null,
  "1",
  "1000",
  "1000",
  "2000",
  "beta",
  "f44e64e75f3948e9f73f8dfa94721c4ce8cbb4f265c4790c702b2d41cfbf2753",
  "1",
  null,
  "create_or_match",
  "**note**",
  "note",
  "edb465624291ef9a45ca15b8eab9c419704e623576de4d7f2b5ed1c91f0b6c3f",
  "0",
];

const syntheticAttachmentVectorB: readonly Stage2FingerprintValue[] = [
  "youtube_browser_transcript",
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "new",
  null,
  null,
  null,
  "https://www.youtube.com/watch?v=z",
  "",
  "",
  "development",
  "public_lab_only",
  "LAB-1",
  null,
  "unknown",
  "paragraph_only",
  "{}",
  "2000000000001",
  "0",
  "0",
  "none",
  null,
  null,
  null,
  null,
];

test("Stage 2 synthetic attachment vectors match the frozen contract", () => {
  assert.equal(
    stage2FingerprintSha256(
      "synthetic-attachment-request-v1",
      syntheticAttachmentVectorA,
    ),
    "4ed2f5f336c0642789b92296a79ffa825edbe463adc9ace561d61aece96dcba7",
  );
  assert.equal(
    stage2FingerprintSha256(
      "synthetic-attachment-request-v1",
      syntheticAttachmentVectorB,
    ),
    "020eb1f640115d8e3fdcfcc7154116c53243c5d36cb02c9c4e3f9e16738c6a50",
  );
});

test("Stage 2 framing preserves null, empty, scalar, array, and surrogate distinctions", () => {
  const preimage = encodeStage2FingerprintPreimage("vector-v1", [
    null,
    "",
    0,
    -0,
    -7,
    BigInt(9),
    false,
    true,
    ["é", "\ud800"],
  ]);
  const domainLength = Buffer.byteLength("vector-v1", "utf8") + 1;
  assert.equal(preimage.subarray(0, domainLength).toString("hex"), "766563746f722d763100");
  assert.equal(
    preimage.subarray(domainLength).toString("hex"),
    [
      "ffffffff",
      "00000000",
      "00000001", "30",
      "00000001", "30",
      "00000002", "2d37",
      "00000001", "39",
      "00000001", "30",
      "00000001", "31",
      "00000001", "32",
      "00000001", "30",
      "00000002", "c3a9",
      "00000001", "31",
      "00000003", "efbfbd",
    ].join(""),
  );
});

test("Stage 2 encoder rejects ambiguous domains and unsafe number values", () => {
  assert.throws(
    () => encodeStage2FingerprintPreimage("", []),
    /stage2_fingerprint_domain_invalid/,
  );
  assert.throws(
    () => encodeStage2FingerprintPreimage("bad\0domain", []),
    /stage2_fingerprint_domain_invalid/,
  );
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, 2 ** 53]) {
    assert.throws(
      () => encodeStage2FingerprintPreimage("number-v1", [value]),
      /stage2_fingerprint_integer_not_safe/,
    );
  }
});
