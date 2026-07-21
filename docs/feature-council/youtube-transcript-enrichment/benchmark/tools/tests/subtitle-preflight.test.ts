import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  SUBTITLE_HANDLING_POLICY,
  SUBTITLE_LIMITS,
  SubtitlePreflightError,
  preflightSubtitleBytes,
  sha256Hex,
} from "../subtitle-preflight";

const fixture = (name: string): Buffer => readFileSync(
  fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)),
);

function options(
  bytes: Uint8Array,
  format: "srt" | "vtt",
  expectedCueCount: number,
  declaredDurationMs = 4_000_000,
) {
  return {
    format,
    declaredDurationMs,
    expectedRawSha256: sha256Hex(bytes),
    expectedCueCount,
    inputFileIntegrityAttested: true as const,
    contentCompleteness: "complete" as const,
    contentCompletenessBasis: "Publication-safe DEV fixture authored as a complete file.",
  };
}

function expectCode(action: () => unknown, code: SubtitlePreflightError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof SubtitlePreflightError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("preflightSubtitleBytes", () => {
  it("preserves SRT order, overlaps, exact duplicates, multiline Unicode, and hours-long timing", () => {
    const bytes = fixture("DEV-valid.srt");
    const result = preflightSubtitleBytes(bytes, options(bytes, "srt", 4));

    assert.equal(result.cueCount, 4);
    assert.equal(result.a1SupportedClass.state, "eligible_supported");
    assert.equal(result.overlapCount, 2);
    assert.equal(result.exactDuplicateCount, 1);
    assert.equal(result.cues[1].text, "Unicode café line one.\nLine two.");
    assert.equal(result.cues[1].sourceTiming, "00:00:02,500 --> 00:00:04,000");
    assert.equal(result.cues[3].startMs, 3_723_000);
    assert.match(result.rawSha256, /^[0-9a-f]{64}$/);
    assert.match(result.normalizedSha256, /^[0-9a-f]{64}$/);
    assert.equal(result.inputFileIntegrity, "attested_locked_hash_and_cue_count_verified");
    assert.deepEqual(result.contentCompletenessDeclaration, {
      state: "complete",
      basis: "Publication-safe DEV fixture authored as a complete file.",
      source: "caller_supplied_not_inferred",
    });
    assert.deepEqual(SUBTITLE_HANDLING_POLICY, {
      overlaps: "preserve",
      exactDuplicates: "preserve",
      sourceOrder: "preserve",
      decreasingStartTime: "reject",
      transforms: "never-sort-merge-deduplicate-or-drop-cues",
    });
  });

  it("parses VTT identifiers and preserves cue settings", () => {
    const bytes = fixture("DEV-valid.vtt");
    const result = preflightSubtitleBytes(bytes, options(bytes, "vtt", 2, 10_000));

    assert.equal(result.cues[0].identifier, "alpha-id");
    assert.equal(result.cues[0].settings, "align:start");
    assert.equal(result.cues[1].text, "Unicode café line one.\nLine two.");
  });

  it("accepts hours-long VTT timestamps within the declared duration", () => {
    const bytes = Buffer.from(
      "WEBVTT\n\n01:02:03.000 --> 01:02:04.000\nHours-long VTT fixture.\n",
      "utf8",
    );
    const result = preflightSubtitleBytes(bytes, options(bytes, "vtt", 1, 4_000_000));
    assert.equal(result.cues[0].startMs, 3_723_000);
  });

  it("normalizes line endings for the canonical hash while retaining distinct raw hashes", () => {
    const lf = fixture("DEV-valid.vtt");
    const crlf = Buffer.from(lf.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    const first = preflightSubtitleBytes(lf, options(lf, "vtt", 2, 10_000));
    const second = preflightSubtitleBytes(crlf, options(crlf, "vtt", 2, 10_000));

    assert.notEqual(first.rawSha256, second.rawSha256);
    assert.equal(first.normalizedSha256, second.normalizedSha256);
  });

  it("rejects invalid UTF-8 rather than replacement-decoding it", () => {
    const bytes = Uint8Array.from([0x31, 0x0a, 0xff, 0x0a]);
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "srt", 1, 1_000)),
      "INVALID_UTF8",
    );
  });

  it("fails the entire file when a later cue is malformed", () => {
    const bytes = fixture("DEV-malformed-mixed.srt");
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "srt", 2, 10_000)),
      "INVALID_TIMESTAMP",
    );
  });

  it("rejects an empty cue and a truncated file without returning a partial result", () => {
    const emptyCue = Buffer.from("1\n00:00:01,000 --> 00:00:02,000\n   \n", "utf8");
    expectCode(
      () => preflightSubtitleBytes(emptyCue, options(emptyCue, "srt", 1, 3_000)),
      "INVALID_STRUCTURE",
    );

    const truncated = Buffer.from("1\n00:00:01,000 --> 00:00:02,000\nfirst\n", "utf8");
    expectCode(
      () => preflightSubtitleBytes(truncated, options(truncated, "srt", 2, 3_000)),
      "CUE_COUNT_MISMATCH",
    );
  });

  it("rejects a locked hash or cue-count mismatch", () => {
    const bytes = fixture("DEV-valid.vtt");
    expectCode(
      () => preflightSubtitleBytes(bytes, {
        ...options(bytes, "vtt", 2, 10_000),
        expectedRawSha256: "0".repeat(64),
      }),
      "RAW_HASH_MISMATCH",
    );
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "vtt", 1, 10_000)),
      "CUE_COUNT_MISMATCH",
    );
  });

  it("requires explicit file integrity and never infers content completeness", () => {
    const bytes = fixture("DEV-valid.vtt");
    expectCode(
      () => preflightSubtitleBytes(bytes, {
        ...options(bytes, "vtt", 2, 10_000),
        inputFileIntegrityAttested: false,
      } as unknown as Parameters<typeof preflightSubtitleBytes>[1]),
      "INVALID_OPTIONS",
    );

    const partial = preflightSubtitleBytes(bytes, {
      ...options(bytes, "vtt", 2, 10_000),
      contentCompleteness: "partial",
      contentCompletenessBasis: "Known trailing coverage gap in the source sidecar.",
    });
    assert.equal(partial.contentCompletenessDeclaration.state, "partial");
    assert.equal(partial.contentCompletenessDeclaration.source, "caller_supplied_not_inferred");
  });

  it("rejects decreasing starts and timing beyond the declared duration", () => {
    const decreasing = Buffer.from([
      "1",
      "00:00:05,000 --> 00:00:06,000",
      "first",
      "",
      "2",
      "00:00:04,000 --> 00:00:05,000",
      "second",
    ].join("\n"));
    expectCode(
      () => preflightSubtitleBytes(decreasing, options(decreasing, "srt", 2, 10_000)),
      "NON_MONOTONIC_ORDER",
    );

    const bytes = fixture("DEV-valid.vtt");
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "vtt", 2, 3_500)),
      "CUE_OUT_OF_BOUNDS",
    );
  });

  it("rejects oversized input before decoding", () => {
    const bytes = new Uint8Array(SUBTITLE_LIMITS.maxBytes + 1);
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "srt", 1, 1_000)),
      "INPUT_TOO_LARGE",
    );
  });

  it("rejects an excessive declared cue count before parsing", () => {
    const bytes = fixture("DEV-valid.srt");
    expectCode(
      () => preflightSubtitleBytes(bytes, {
        ...options(bytes, "srt", 4),
        expectedCueCount: SUBTITLE_LIMITS.maxCues + 1,
      }),
      "INVALID_OPTIONS",
    );
  });

  it("rejects an actual file with more than the frozen cue limit", () => {
    const blocks = Array.from(
      { length: SUBTITLE_LIMITS.maxCues + 1 },
      (_, index) => `${index + 1}\n00:00:00,000 --> 00:00:00,001\nx`,
    );
    const bytes = Buffer.from(blocks.join("\n\n"), "utf8");
    expectCode(
      () => preflightSubtitleBytes(
        bytes,
        options(bytes, "srt", SUBTITLE_LIMITS.maxCues, 1_000),
      ),
      "TOO_MANY_CUES",
    );
  });

  it("parses an over-class cue count only to classify the cell for expected safe rejection", () => {
    const supportedClassLimit = 7_200;
    const blocks = Array.from(
      { length: supportedClassLimit + 1 },
      (_, index) => `${index + 1}\n00:00:00,000 --> 00:00:00,001\nx`,
    );
    const bytes = Buffer.from(blocks.join("\n\n"), "utf8");
    const result = preflightSubtitleBytes(
      bytes,
      options(bytes, "srt", supportedClassLimit + 1, 1_000),
    );

    assert.equal(result.a1SupportedClass.state, "expected_safe_rejection");
    assert.deepEqual(result.a1SupportedClass.reasons, ["cue_count"]);
  });

  it("rejects unsupported VTT blocks instead of silently dropping them", () => {
    const bytes = Buffer.from("WEBVTT\n\nNOTE hidden\nmetadata\n", "utf8");
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "vtt", 1, 1_000)),
      "INVALID_STRUCTURE",
    );
  });

  it("rejects unknown or invalid VTT settings rather than preserving them opaquely", () => {
    const bytes = Buffer.from(
      "WEBVTT\n\n00:00.000 --> 00:01.000 align:sideways\ntext\n",
      "utf8",
    );
    expectCode(
      () => preflightSubtitleBytes(bytes, options(bytes, "vtt", 1, 1_000)),
      "INVALID_TIMESTAMP",
    );
  });
});
