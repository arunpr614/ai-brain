import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  A1PrivateScorerError,
  A1PrivateScorerOptions,
  evaluatePrivateA1,
  parseA1PrivateScorerOptions,
  parseA1PrivateScorerOptionsBytes,
  serializeA1PrivateScore,
} from "../score-private-a1";
import {
  PrivatePreparationOptions,
  preparePrivateReference,
  serializePrivatePreparation,
} from "../prepare-private-reference";
import { sha256Hex } from "../subtitle-preflight";

const CLI_PATH = fileURLToPath(new URL("../score-private-a1.ts", import.meta.url));
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

interface Fixture {
  subtitleBytes: Buffer;
  anchorPacketBytes: Buffer;
  normalizedOutputBytes: Buffer;
  options: A1PrivateScorerOptions;
}

function makeFixture(): Fixture {
  const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
  const timestamp = (value: number): string => {
    const totalSeconds = Math.floor(value / 1_000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(value % 1_000).padStart(3, "0")}`;
  };
  const phrases = starts.map((_, index) => `private scoring phrase ${index + 1}`);
  const subtitleBytes = Buffer.from(starts.map((start, index) => [
    String(index + 1),
    `${timestamp(start)} --> ${timestamp(start + 500)}`,
    phrases[index],
  ].join("\n")).join("\n\n"), "utf8");
  const preparationOptions: PrivatePreparationOptions = {
    schema_version: "1.2",
    format: "srt",
    declared_duration_ms: 60_000,
    expected_raw_sha256: sha256Hex(subtitleBytes),
    expected_cue_count: starts.length,
    input_file_integrity_attested: true,
    content_completeness: "complete",
    content_completeness_basis: "explicit_source_assertion",
    reference_role: "a1_input_preservation_oracle",
    expected_class: "eligible_supported",
  };
  const anchorPacketBytes = Buffer.from(
    serializePrivatePreparation(preparePrivateReference(subtitleBytes, preparationOptions)),
    "utf8",
  );
  const normalizedOutput = {
    schema_version: "1.0",
    item_id: "YT-99",
    youtube_video_id: "ABCDEFGHIJK",
    source_method: "A1",
    language: "en",
    caption_type: "source_provided_unknown_authorship",
    timestamp_mode: "timestamped",
    completeness: {
      state: "complete",
      basis: "explicit_source_assertion",
      source_duration_ms: 60_000,
      last_cue_end_ms: 58_500,
      trailing_gap_ms: 1_500,
    },
    provenance: {
      source_page_url: "https://example.invalid/watch/ABCDEFGHIJK",
      source_asset_url: "https://example.invalid/captions/ABCDEFGHIJK.srt",
      input_sha256: sha256Hex(subtitleBytes),
      reference_role: "input_preservation",
      version_equivalence: "owner_verified_exact",
      acquired_at: "2026-01-01T00:00:00Z",
    },
    processing_version: "synthetic-a1-harness-1.0.0",
    segments: starts.map((start, index) => ({
      index,
      start_ms: start,
      end_ms: start + 500,
      source_start_ms: start,
      source_end_ms: start + 500,
      text: phrases[index],
      source_cue_ids: [String(index + 1)],
    })),
    errors: [],
  };
  const normalizedOutputBytes = Buffer.from(`${JSON.stringify(normalizedOutput)}\n`, "utf8");
  return {
    subtitleBytes,
    anchorPacketBytes,
    normalizedOutputBytes,
    options: {
      schema_version: "1.0",
      format: "srt",
      declared_duration_ms: 60_000,
      expected_raw_sha256: sha256Hex(subtitleBytes),
      expected_cue_count: starts.length,
      input_file_integrity_attested: true,
      content_completeness: "complete",
      content_completeness_basis: "explicit_source_assertion",
      reference_role: "a1_input_preservation_oracle",
      expected_anchor_packet_sha256: sha256Hex(anchorPacketBytes),
      expected_normalized_transcript_sha256: sha256Hex(normalizedOutputBytes),
      comparison_canonical_output_sha256: null,
    },
  };
}

function expectCode(action: () => unknown, code: A1PrivateScorerError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof A1PrivateScorerError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("evaluatePrivateA1", () => {
  it("revalidates all private artifacts and emits only publication-safe scores", () => {
    const fixture = makeFixture();
    const first = evaluatePrivateA1(
      fixture.subtitleBytes,
      fixture.anchorPacketBytes,
      fixture.normalizedOutputBytes,
      fixture.options,
    );
    const second = evaluatePrivateA1(
      fixture.subtitleBytes,
      fixture.anchorPacketBytes,
      fixture.normalizedOutputBytes,
      fixture.options,
    );

    assert.deepEqual(first, second);
    assert.equal(first.evaluator_version, "1.1.0");
    assert.equal(first.versions.scorer, "1.1.0");
    assert.equal(first.versions.subtitle_preflight, "1.0.0");
    assert.equal(first.preservation.reference_token_count, 28);
    assert.equal(first.preservation.output_token_count, 28);
    assert.equal(first.preservation.lcs_token_count, 28);
    assert.equal(first.preservation.token_preservation_rate, 1);
    assert.equal(first.timestamp_anchors.actual_count, 7);
    assert.equal(first.timestamp_anchors.base_target_count, 10);
    assert.equal(first.timestamp_anchors.matched_count, 7);
    assert.equal(first.timestamp_anchors.unmatched_count, 0);
    assert.equal(first.timestamp_anchors.ambiguous_count, 0);
    assert.equal(first.timestamp_anchors.match_rate, 1);
    assert.equal(first.timestamp_anchors.median_error_ms, 0);
    assert.equal(first.timestamp_anchors.p90_error_ms, 0);
    assert.equal(first.hashes.canonical_output_comparison, "not_requested");

    const publicJson = serializeA1PrivateScore(first);
    assert.equal(publicJson.includes("private scoring phrase"), false);
    assert.equal(publicJson.includes("source_cue_ids"), false);
    assert.equal(publicJson.includes("youtube_video_id"), false);
    assert.equal(publicJson.includes("https://"), false);
    assert.equal(publicJson.includes(".srt"), false);
    assert.equal(publicJson.includes('"text"'), false);
  });

  it("supports a fail-closed canonical output comparison for the second Gate 3 run", () => {
    const fixture = makeFixture();
    const first = evaluatePrivateA1(
      fixture.subtitleBytes,
      fixture.anchorPacketBytes,
      fixture.normalizedOutputBytes,
      fixture.options,
    );
    const comparisonOptions = {
      ...fixture.options,
      comparison_canonical_output_sha256: first.hashes.canonical_normalized_output_sha256,
    };
    assert.equal(evaluatePrivateA1(
      fixture.subtitleBytes,
      fixture.anchorPacketBytes,
      fixture.normalizedOutputBytes,
      comparisonOptions,
    ).hashes.canonical_output_comparison, "verified_equal");

    expectCode(
      () => evaluatePrivateA1(
        fixture.subtitleBytes,
        fixture.anchorPacketBytes,
        fixture.normalizedOutputBytes,
        { ...fixture.options, comparison_canonical_output_sha256: "0".repeat(64) },
      ),
      "CANONICAL_OUTPUT_HASH_MISMATCH",
    );
  });

  it("rejects a hash-locked packet whose sealed source fields were changed", () => {
    const fixture = makeFixture();
    const altered = JSON.parse(fixture.anchorPacketBytes.toString("utf8"));
    altered.private_anchor_packet.source_distinct_timed_start_count = 6;
    const alteredBytes = Buffer.from(`${JSON.stringify(altered)}\n`, "utf8");
    expectCode(
      () => evaluatePrivateA1(
        fixture.subtitleBytes,
        alteredBytes,
        fixture.normalizedOutputBytes,
        { ...fixture.options, expected_anchor_packet_sha256: sha256Hex(alteredBytes) },
      ),
      "INVALID_ANCHOR_PACKET",
    );
  });

  it("rejects invalid private output segment timing after verifying its locked file hash", () => {
    const fixture = makeFixture();
    const altered = JSON.parse(fixture.normalizedOutputBytes.toString("utf8"));
    altered.segments[0].end_ms = 60_001;
    const alteredBytes = Buffer.from(`${JSON.stringify(altered)}\n`, "utf8");
    expectCode(
      () => evaluatePrivateA1(
        fixture.subtitleBytes,
        fixture.anchorPacketBytes,
        alteredBytes,
        {
          ...fixture.options,
          expected_normalized_transcript_sha256: sha256Hex(alteredBytes),
        },
      ),
      "INVALID_NORMALIZED_OUTPUT",
    );
  });

  it("requires both source timing provenance fields on every segment", () => {
    for (const field of ["source_start_ms", "source_end_ms"] as const) {
      const fixture = makeFixture();
      const altered = JSON.parse(fixture.normalizedOutputBytes.toString("utf8"));
      delete altered.segments[0][field];
      const alteredBytes = Buffer.from(`${JSON.stringify(altered)}\n`, "utf8");
      expectCode(
        () => evaluatePrivateA1(
          fixture.subtitleBytes,
          fixture.anchorPacketBytes,
          alteredBytes,
          {
            ...fixture.options,
            expected_normalized_transcript_sha256: sha256Hex(alteredBytes),
          },
        ),
        "INVALID_NORMALIZED_OUTPUT",
      );
    }
  });

  it("rejects invalid source timing provenance values and ranges", () => {
    const invalidTimings = [
      { source_start_ms: -1 },
      { source_start_ms: 1_000.5 },
      { source_end_ms: 1_000 },
      { source_end_ms: 60_001 },
    ];
    for (const timing of invalidTimings) {
      const fixture = makeFixture();
      const altered = JSON.parse(fixture.normalizedOutputBytes.toString("utf8"));
      Object.assign(altered.segments[0], timing);
      const alteredBytes = Buffer.from(`${JSON.stringify(altered)}\n`, "utf8");
      expectCode(
        () => evaluatePrivateA1(
          fixture.subtitleBytes,
          fixture.anchorPacketBytes,
          alteredBytes,
          {
            ...fixture.options,
            expected_normalized_transcript_sha256: sha256Hex(alteredBytes),
          },
        ),
        "INVALID_NORMALIZED_OUTPUT",
      );
    }
  });

  it("rejects unequal canonical, source-provenance, and normalized A1 timing", () => {
    const mutations = [
      (segment: Record<string, unknown>) => {
        segment.start_ms = 1_001;
      },
      (segment: Record<string, unknown>) => {
        segment.start_ms = 1_001;
        segment.source_start_ms = 1_001;
      },
      (segment: Record<string, unknown>) => {
        segment.source_end_ms = 1_501;
        segment.end_ms = 1_501;
      },
    ];
    for (const mutate of mutations) {
      const fixture = makeFixture();
      const altered = JSON.parse(fixture.normalizedOutputBytes.toString("utf8"));
      mutate(altered.segments[0]);
      const alteredBytes = Buffer.from(`${JSON.stringify(altered)}\n`, "utf8");
      expectCode(
        () => evaluatePrivateA1(
          fixture.subtitleBytes,
          fixture.anchorPacketBytes,
          alteredBytes,
          {
            ...fixture.options,
            expected_normalized_transcript_sha256: sha256Hex(alteredBytes),
          },
        ),
        "INVALID_NORMALIZED_OUTPUT",
      );
    }
  });

  it("strictly parses options and rejects duplicate or additional fields", () => {
    const fixture = makeFixture();
    assert.deepEqual(
      parseA1PrivateScorerOptions(JSON.stringify(fixture.options)),
      fixture.options,
    );
    expectCode(
      () => parseA1PrivateScorerOptions('{"schema_version":"1.0","schema_version":"1.0"}'),
      "INVALID_OPTIONS",
    );
    expectCode(
      () => parseA1PrivateScorerOptions(JSON.stringify({ ...fixture.options, extra: true })),
      "INVALID_OPTIONS",
    );
    expectCode(
      () => parseA1PrivateScorerOptionsBytes(
        Uint8Array.of(0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d),
      ),
      "INVALID_OPTIONS",
    );
  });

  it("runs locally as the frozen four-file evaluator and writes one JSON document", () => {
    const fixture = makeFixture();
    const directory = mkdtempSync(join(tmpdir(), "youtube-private-a1-score-test-"));
    temporaryDirectories.push(directory);
    const optionsPath = join(directory, "options.json");
    const subtitlePath = join(directory, "DEV-reference.srt");
    const anchorsPath = join(directory, "private-anchors.json");
    const outputPath = join(directory, "private-normalized.json");
    writeFileSync(optionsPath, `${JSON.stringify(fixture.options, null, 2)}\n`, "utf8");
    writeFileSync(subtitlePath, fixture.subtitleBytes);
    writeFileSync(anchorsPath, fixture.anchorPacketBytes);
    writeFileSync(outputPath, fixture.normalizedOutputBytes);

    const stdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        CLI_PATH,
        "--options",
        optionsPath,
        "--subtitle",
        subtitlePath,
        "--anchors",
        anchorsPath,
        "--normalized-output",
        outputPath,
      ],
      { encoding: "utf8" },
    );
    const summary = JSON.parse(stdout);
    assert.equal(summary.preservation.token_preservation_rate, 1);
    assert.equal(summary.timestamp_anchors.actual_count, 7);
    assert.equal(stdout.trim().startsWith("{"), true);
    assert.equal(stdout.trim().endsWith("}"), true);
  });

  it("rejects a symlinked normalized output before reading it", () => {
    const fixture = makeFixture();
    const directory = mkdtempSync(join(tmpdir(), "youtube-private-a1-score-symlink-test-"));
    temporaryDirectories.push(directory);
    const optionsPath = join(directory, "options.json");
    const subtitlePath = join(directory, "DEV-reference.srt");
    const anchorsPath = join(directory, "private-anchors.json");
    const outputPath = join(directory, "private-normalized.json");
    const outputLink = join(directory, "linked-normalized.json");
    writeFileSync(optionsPath, JSON.stringify(fixture.options), "utf8");
    writeFileSync(subtitlePath, fixture.subtitleBytes);
    writeFileSync(anchorsPath, fixture.anchorPacketBytes);
    writeFileSync(outputPath, fixture.normalizedOutputBytes);
    symlinkSync(outputPath, outputLink);

    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        CLI_PATH,
        "--options",
        optionsPath,
        "--subtitle",
        subtitlePath,
        "--anchors",
        anchorsPath,
        "--normalized-output",
        outputLink,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).error.code, "INVALID_FILE");
  });
});
