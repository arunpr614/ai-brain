import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TranscriptScorerError,
  normalizeTranscript,
  requiredTimestampAnchorCount,
  scoreTimestampAnchors,
  scoreTokenPreservation,
  scoreWer,
  wilson95,
} from "../transcript-scorer";

function expectCode(action: () => unknown, code: TranscriptScorerError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof TranscriptScorerError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("normalizeTranscript", () => {
  it("applies the frozen Unicode whitespace profile without deleting repetitions, negation, names, or numbers", () => {
    const result = normalizeTranscript("  DON’T stop—stop! Café 42; Arun's.  ");

    assert.equal(result.profile, "unicode-whitespace-v1");
    assert.equal(result.text, "dont stop stop café 42 aruns");
    assert.deepEqual(result.tokens, ["dont", "stop", "stop", "café", "42", "aruns"]);
  });

  it("uses NFKC deterministically", () => {
    assert.equal(normalizeTranscript("ＡＢＣ ﬁle").text, "abc file");
  });

  it("rejects prohibited control characters", () => {
    expectCode(() => normalizeTranscript("safe\u0000unsafe"), "INVALID_INPUT");
  });

  it("rejects unpaired UTF-16 surrogates", () => {
    expectCode(() => normalizeTranscript("unsafe\ud800"), "INVALID_INPUT");
  });
});

describe("scoreTokenPreservation", () => {
  it("uses exact LCS tokens and keeps repeated reference tokens in the denominator", () => {
    const result = scoreTokenPreservation(
      "alpha beta beta gamma",
      "alpha beta gamma",
      "a1_input_preservation_oracle",
    );

    assert.equal(result.referenceTokenCount, 4);
    assert.equal(result.candidateTokenCount, 3);
    assert.equal(result.commonPrefixTokenCount, 2);
    assert.equal(result.commonSuffixTokenCount, 1);
    assert.equal(result.comparedReferenceMiddleTokenCount, 1);
    assert.equal(result.comparedCandidateMiddleTokenCount, 0);
    assert.equal(result.lcsTokenCount, 3);
    assert.equal(result.tokenPreservationRate, 0.75);
  });

  it("rejects an empty normalized reference", () => {
    expectCode(
      () => scoreTokenPreservation("...", "alpha", "a1_input_preservation_oracle"),
      "EMPTY_REFERENCE",
    );
  });

  it("scores long near-identical inputs exactly after trimming the common edges", () => {
    const referenceTokens = Array.from({ length: 6_000 }, (_, index) => `token${index}`);
    const candidateTokens = [...referenceTokens];
    candidateTokens[3_000] = "changedtoken";
    const result = scoreTokenPreservation(
      referenceTokens.join(" "),
      candidateTokens.join(" "),
      "a1_input_preservation_oracle",
    );

    assert.equal(result.commonPrefixTokenCount, 3_000);
    assert.equal(result.commonSuffixTokenCount, 2_999);
    assert.equal(result.comparedReferenceMiddleTokenCount, 1);
    assert.equal(result.comparedCandidateMiddleTokenCount, 1);
    assert.equal(result.lcsTokenCount, 5_999);
  });

  it("still rejects a divergent LCS middle above the exact DP bound", () => {
    expectCode(
      () => scoreTokenPreservation(
        "x ".repeat(5_001),
        "y ".repeat(5_001),
        "a1_input_preservation_oracle",
      ),
      "LIMIT_EXCEEDED",
    );
  });
});

describe("scoreWer", () => {
  it("reports deterministic substitutions, insertions, deletions, and WER", () => {
    const result = scoreWer(
      "alpha beta gamma",
      "alpha delta gamma extra",
      "a3_independent_speech_reference",
    );

    assert.equal(result.substitutions, 1);
    assert.equal(result.deletions, 0);
    assert.equal(result.insertions, 1);
    assert.equal(result.errors, 2);
    assert.equal(result.wer, 2 / 3);
  });

  it("counts an empty hypothesis as reference-word deletions", () => {
    const result = scoreWer("one two three", "", "a3_independent_speech_reference");

    assert.equal(result.deletions, 3);
    assert.equal(result.wer, 1);
  });

  it("rejects A1 preservation input as a WER reference", () => {
    expectCode(
      () => scoreWer(
        "one two",
        "one two",
        "a1_input_preservation_oracle" as unknown as "a3_independent_speech_reference",
      ),
      "INVALID_INPUT",
    );
  });

  it("rejects comparisons above the frozen dynamic-programming bound", () => {
    const reference = "x ".repeat(5_001);
    const hypothesis = "y ".repeat(5_001);
    expectCode(
      () => scoreWer(reference, hypothesis, "a3_independent_speech_reference"),
      "LIMIT_EXCEEDED",
    );
  });
});

describe("scoreTimestampAnchors", () => {
  const durationMs = 60_000;
  const starts = [1_000, 5_000, 10_000, 15_000, 22_000, 30_000, 38_000, 42_000, 50_000, 58_000];
  const anchors = starts.map((referenceStartMs, index) => ({
    id: `A-${index + 1}`,
    referenceStartMs,
    utterance: `unique anchor ${index + 1}`,
  }));

  it("matches unique contiguous utterances across segment boundaries and retains unmatched anchors in the denominator", () => {
    const segments = starts.map((startMs, index) => ({
      startMs: startMs + 500,
      endMs: Math.min(durationMs, startMs + 1_500),
      text: index === 9 ? "different final words" : `unique anchor ${index + 1}`,
    }));
    segments[3] = { startMs: 15_500, endMs: 16_000, text: "unique" };
    segments.splice(4, 0, { startMs: 16_000, endMs: 17_000, text: "anchor 4" });

    const result = scoreTimestampAnchors(
      anchors,
      segments,
      durationMs,
      "a1_input_preservation_oracle",
      10,
    );

    assert.equal(result.requiredAnchorCount, 10);
    assert.equal(result.baseAnchorCount, 10);
    assert.equal(result.sealedDistinctNonemptyReferenceStartCount, 10);
    assert.equal(result.referenceRole, "a1_input_preservation_oracle");
    assert.equal(result.matchedCount, 9);
    assert.equal(result.unmatchedCount, 1);
    assert.equal(result.matchRate, 0.9);
    assert.equal(result.medianErrorMs, 500);
    assert.equal(result.p90ErrorMs, 500);
    assert.equal(result.results[9].status, "not_found");
  });

  it("fails ambiguous repeated utterances closed", () => {
    const segments = starts.map((startMs, index) => ({
      startMs,
      endMs: Math.min(durationMs, startMs + 500),
      text: `unique anchor ${index + 1}`,
    }));
    segments[9] = { startMs: 58_000, endMs: 59_000, text: "unique anchor 1" };

    const result = scoreTimestampAnchors(
      anchors,
      segments,
      durationMs,
      "a3_independent_speech_reference",
      10,
    );
    assert.equal(result.results[0].status, "ambiguous");
    assert.equal(result.ambiguousCount, 1);
    assert.equal(result.matchedCount, 8);
  });

  it("requires exactly the protocol anchor count and coverage of all duration thirds", () => {
    assert.equal(requiredTimestampAnchorCount(60_000, 10), 10);
    assert.equal(requiredTimestampAnchorCount(60_000, 7), 7);
    assert.equal(requiredTimestampAnchorCount(3_000_001, 20), 11);
    expectCode(
      () => scoreTimestampAnchors(
        anchors.slice(0, 9),
        [{ startMs: 0, endMs: 1, text: "x" }],
        durationMs,
        "a1_input_preservation_oracle",
        10,
      ),
      "INVALID_ANCHORS",
    );

    const firstThirdOnly = anchors.map((anchor, index) => ({
      ...anchor,
      referenceStartMs: 1_000 + index,
    }));
    expectCode(
      () => scoreTimestampAnchors(
        firstThirdOnly,
        [{ startMs: 0, endMs: 1, text: "x" }],
        durationMs,
        "a1_input_preservation_oracle",
        10,
      ),
      "INVALID_ANCHORS",
    );

    expectCode(() => requiredTimestampAnchorCount(durationMs, 2), "INVALID_ANCHORS");
  });

  it("accepts seven sealed sparse starts when they span all duration thirds", () => {
    const sparseStarts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
    const sparseAnchors = sparseStarts.map((referenceStartMs, index) => ({
      id: `S-${index + 1}`,
      referenceStartMs,
      utterance: `sparse unique ${index + 1}`,
    }));
    const sparseSegments = sparseStarts.map((startMs, index) => ({
      startMs,
      endMs: Math.min(durationMs, startMs + 500),
      text: `sparse unique ${index + 1}`,
    }));

    const result = scoreTimestampAnchors(
      sparseAnchors,
      sparseSegments,
      durationMs,
      "a1_input_preservation_oracle",
      7,
    );
    assert.equal(result.baseAnchorCount, 10);
    assert.equal(result.requiredAnchorCount, 7);
    assert.equal(result.matchedCount, 7);

    expectCode(
      () => scoreTimestampAnchors(
        sparseAnchors,
        sparseSegments,
        durationMs,
        "a1_input_preservation_oracle",
        6,
      ),
      "INVALID_ANCHORS",
    );
  });
});

describe("wilson95", () => {
  it("returns the standard bounded 95% Wilson score interval", () => {
    const interval = wilson95(8, 10);

    assert.ok(Math.abs(interval.lower - 0.4901624715366418) < 1e-12);
    assert.ok(Math.abs(interval.upper - 0.9433178485456247) < 1e-12);
    assert.equal(interval.confidence, 0.95);
  });

  it("rejects a zero denominator", () => {
    expectCode(() => wilson95(0, 0), "INVALID_INPUT");
  });
});
