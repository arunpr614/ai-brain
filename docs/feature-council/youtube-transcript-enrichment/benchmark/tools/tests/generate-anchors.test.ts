import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AnchorGeneratorError,
  generateTimestampAnchors,
  parseAnchorGeneratorInputBytes,
  serializeGeneratedAnchors,
} from "../generate-anchors";
import {
  SubtitlePreflightResult,
  preflightSubtitleBytes,
  sha256Hex,
} from "../subtitle-preflight";

function makePreflight(
  texts: readonly string[],
  starts = texts.map((_, index) => 1_000 + (index * 4_000)),
  contentCompleteness: "complete" | "partial" | "unknown" = "complete",
): SubtitlePreflightResult {
  const blocks = texts.map((text, index) => {
    const startMs = starts[index];
    const endMs = startMs + 1_000;
    const format = (value: number): string => {
      const totalSeconds = Math.floor(value / 1_000);
      const hours = Math.floor(totalSeconds / 3_600);
      const minutes = Math.floor((totalSeconds % 3_600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(value % 1_000).padStart(3, "0")}`;
    };
    return `${index + 1}\n${format(startMs)} --> ${format(endMs)}\n${text}`;
  });
  const bytes = Buffer.from(blocks.join("\n\n"), "utf8");
  return preflightSubtitleBytes(bytes, {
    format: "srt",
    declaredDurationMs: 60_000,
    expectedRawSha256: sha256Hex(bytes),
    expectedCueCount: texts.length,
    inputFileIntegrityAttested: true,
    contentCompleteness,
    contentCompletenessBasis: contentCompleteness === "partial"
      ? "Synthetic DEV reference has an explicitly known trailing gap."
      : "Synthetic DEV reference state declared for generator tests.",
  });
}

function expectCode(action: () => unknown, code: AnchorGeneratorError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof AnchorGeneratorError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("generateTimestampAnchors", () => {
  it("rejects duplicate-key and malformed-UTF8 CLI input bytes before generation", () => {
    assert.throws(() => parseAnchorGeneratorInputBytes(
      Buffer.from('{"durationMs":1,"durationMs":2}', "utf8"),
    ));
    assert.throws(() => parseAnchorGeneratorInputBytes(
      Uint8Array.of(0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d),
    ));
  });

  it("selects exactly the required unique anchors deterministically over the duration", () => {
    const preflight = makePreflight(
      Array.from({ length: 14 }, (_, index) => `unique publication safe phrase ${index + 1}`),
    );
    const first = generateTimestampAnchors(preflight, {
      durationMs: 60_000,
      referenceRole: "a1_input_preservation_oracle",
    });
    const second = generateTimestampAnchors(preflight, {
      durationMs: 60_000,
      referenceRole: "a1_input_preservation_oracle",
    });

    assert.equal(first.anchor_count, 10);
    assert.equal(first.source_distinct_timed_start_count, 14);
    assert.equal(first.reference_role, "a1_input_preservation_oracle");
    assert.deepEqual(first, second);
    assert.equal(serializeGeneratedAnchors(first), serializeGeneratedAnchors(second));
    assert.doesNotThrow(() => JSON.parse(serializeGeneratedAnchors(first)));
    assert.equal(first.source_content_completeness.source, "caller_supplied_not_inferred");
    assert.ok(first.anchors.every((anchor, index) => (
      index === 0 || anchor.referenceStartMs > first.anchors[index - 1].referenceStartMs
    )));
  });

  it("expands repeated cue text until the normalized utterance is globally unique", () => {
    const texts = Array.from({ length: 14 }, (_, index) => `unique phrase ${index + 1}`);
    texts[1] = "shared";
    texts[2] = "shared";
    const result = generateTimestampAnchors(makePreflight(texts), {
      durationMs: 60_000,
      referenceRole: "a1_input_preservation_oracle",
    });

    const expanded = result.anchors.find((anchor) => anchor.utterance === "shared shared");
    assert.ok(expanded);
    assert.deepEqual(expanded.sourceCueOrdinals, [2, 3]);
  });

  it("fails when a unique distributed anchor set cannot be formed", () => {
    const preflight = makePreflight(Array.from({ length: 14 }, () => "same"));
    expectCode(
      () => generateTimestampAnchors(preflight, {
        durationMs: 60_000,
        referenceRole: "a1_input_preservation_oracle",
      }),
      "UNIQUE_DISTRIBUTED_ANCHORS_UNAVAILABLE",
    );
  });

  it("refuses A1 anchor generation for an expected-safe-rejection input class", () => {
    const eligible = makePreflight(
      Array.from({ length: 14 }, (_, index) => `unique phrase ${index + 1}`),
    );
    const overClass = {
      ...eligible,
      a1SupportedClass: {
        state: "expected_safe_rejection" as const,
        reasons: ["cue_count"],
      },
    };
    expectCode(
      () => generateTimestampAnchors(overClass, {
        durationMs: 60_000,
        referenceRole: "a1_input_preservation_oracle",
      }),
      "INVALID_INPUT",
    );
  });

  it("uses seven sparse distinct starts when they cover all three duration thirds", () => {
    const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
    const preflight = makePreflight(
      starts.map((_, index) => `sparse publication safe phrase ${index + 1}`),
      starts,
    );
    const result = generateTimestampAnchors(preflight, {
      durationMs: 60_000,
      referenceRole: "a1_input_preservation_oracle",
    });

    assert.equal(result.source_distinct_timed_start_count, 7);
    assert.equal(result.anchor_count, 7);
    assert.ok(result.anchors[0].referenceStartMs < 20_000);
    assert.ok(result.anchors.some((anchor) => (
      anchor.referenceStartMs >= 20_000 && anchor.referenceStartMs < 40_000
    )));
    assert.ok(result.anchors.at(-1)!.referenceStartMs >= 40_000);
  });

  it("allows explicitly partial A1 references but rejects unknown completeness", () => {
    const texts = Array.from({ length: 14 }, (_, index) => `unique phrase ${index + 1}`);
    const partial = makePreflight(texts, undefined, "partial");
    assert.equal(generateTimestampAnchors(partial, {
      durationMs: 60_000,
      referenceRole: "a1_input_preservation_oracle",
    }).source_content_completeness.state, "partial");

    const unknown = makePreflight(texts, undefined, "unknown");
    expectCode(
      () => generateTimestampAnchors(unknown, {
        durationMs: 60_000,
        referenceRole: "a1_input_preservation_oracle",
      }),
      "INVALID_INPUT",
    );
  });
});
