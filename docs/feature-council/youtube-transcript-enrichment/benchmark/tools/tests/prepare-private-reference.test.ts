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
  PrivatePreparationError,
  PrivatePreparationOptions,
  parsePrivatePreparationOptions,
  preparePrivateReference,
  serializePrivatePreparation,
} from "../prepare-private-reference";
import { sha256Hex } from "../subtitle-preflight";

const CLI_PATH = fileURLToPath(new URL("../prepare-private-reference.ts", import.meta.url));
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function makeFixture(): { bytes: Buffer; options: PrivatePreparationOptions } {
  const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
  const timestamp = (value: number): string => {
    const totalSeconds = Math.floor(value / 1_000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(value % 1_000).padStart(3, "0")}`;
  };
  const body = starts.map((start, index) => [
    String(index + 1),
    `${timestamp(start)} --> ${timestamp(start + 500)}`,
    `private synthetic phrase ${index + 1}`,
  ].join("\n")).join("\n\n");
  const bytes = Buffer.from(body, "utf8");
  return {
    bytes,
    options: {
      schema_version: "1.2",
      format: "srt",
      declared_duration_ms: 60_000,
      expected_raw_sha256: sha256Hex(bytes),
      expected_cue_count: starts.length,
      input_file_integrity_attested: true,
      content_completeness: "complete",
      content_completeness_basis: "Synthetic DEV file was authored with declared full coverage.",
      reference_role: "a1_input_preservation_oracle",
      expected_class: "eligible_supported",
    },
  };
}

function expectCode(action: () => unknown, code: PrivatePreparationError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof PrivatePreparationError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("preparePrivateReference", () => {
  it("emits a deterministic private anchor packet and a transcript-text-free public summary", () => {
    const fixture = makeFixture();
    const first = preparePrivateReference(fixture.bytes, fixture.options);
    const second = preparePrivateReference(fixture.bytes, fixture.options);

    assert.deepEqual(first, second);
    assert.ok(first.private_anchor_packet);
    assert.equal(first.private_anchor_packet.anchor_count, 7);
    assert.equal(first.publication_safe_summary.source_distinct_timed_start_count, 7);
    assert.equal(first.publication_safe_summary.cue_count, 7);
    assert.ok(first.publication_safe_summary.normalized_text_character_count > 0);
    assert.equal(first.publication_safe_summary.observed_preparation_class, "eligible_supported");
    assert.equal(first.publication_safe_summary.raw_sha256, fixture.options.expected_raw_sha256);
    assert.ok((first.publication_safe_summary.normalized_token_count ?? 0) > 0);
    assert.equal(first.publication_safe_summary.normalized_token_count_state, "counted");
    const publicJson = JSON.stringify(first.publication_safe_summary);
    assert.equal(publicJson.includes("private synthetic phrase"), false);
    assert.equal(publicJson.includes('"utterance"'), false);
    assert.equal(publicJson.includes('"text"'), false);
    assert.equal(publicJson.includes('"basis"'), false);
    assert.equal(serializePrivatePreparation(first), serializePrivatePreparation(second));
  });

  it("summarizes a predeclared over-class safe rejection without generating anchors", () => {
    const cueCount = 7_201;
    const bytes = Buffer.from(Array.from({ length: cueCount }, (_, index) => [
      String(index + 1),
      "00:00:00,000 --> 00:00:00,001",
      `synthetic boundary cue ${index + 1} alpha beta gamma delta`,
    ].join("\n")).join("\n\n"), "utf8");
    const output = preparePrivateReference(bytes, {
      schema_version: "1.2",
      format: "srt",
      declared_duration_ms: 60_000,
      expected_raw_sha256: sha256Hex(bytes),
      expected_cue_count: cueCount,
      input_file_integrity_attested: true,
      content_completeness: "unknown",
      content_completeness_basis: "Synthetic DEV boundary intentionally has unknown coverage.",
      reference_role: "a1_input_preservation_oracle",
      expected_class: "expected_safe_rejection",
    });

    assert.equal(output.private_anchor_packet, null);
    assert.equal(output.publication_safe_summary.anchor_count, 0);
    assert.equal(output.publication_safe_summary.cue_count, cueCount);
    assert.equal(output.publication_safe_summary.normalized_token_count, null);
    assert.equal(
      output.publication_safe_summary.normalized_token_count_state,
      "not_scored_above_eligible_cap",
    );
    assert.equal(output.publication_safe_summary.source_distinct_timed_start_count, 1);
    assert.equal(output.publication_safe_summary.a1_supported_class_state, "expected_safe_rejection");
    assert.deepEqual(output.publication_safe_summary.a1_supported_class_reasons, ["cue_count"]);
    assert.equal(output.publication_safe_summary.observed_preparation_class, "expected_safe_rejection");
  });

  it("classifies unknown completeness as a safe rejection and fails a mismatched declaration", () => {
    const fixture = makeFixture();
    const safeOptions: PrivatePreparationOptions = {
      ...fixture.options,
      content_completeness: "unknown",
      content_completeness_basis: "Synthetic DEV coverage is intentionally unknown.",
      expected_class: "expected_safe_rejection",
    };
    const safeOutput = preparePrivateReference(fixture.bytes, safeOptions);
    assert.equal(safeOutput.private_anchor_packet, null);
    assert.equal(safeOutput.publication_safe_summary.a1_supported_class_state, "eligible_supported");
    assert.equal(safeOutput.publication_safe_summary.observed_preparation_class, "expected_safe_rejection");

    expectCode(
      () => preparePrivateReference(fixture.bytes, {
        ...safeOptions,
        expected_class: "eligible_supported",
      }),
      "CLASSIFICATION_MISMATCH",
    );
  });

  it("keeps the 50,000-token scoring cap fail-closed for eligible preparation", () => {
    const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
    const timestamp = (value: number): string => {
      const totalSeconds = Math.floor(value / 1_000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(value % 1_000).padStart(3, "0")}`;
    };
    const bytes = Buffer.from(starts.map((start, index) => [
      String(index + 1),
      `${timestamp(start)} --> ${timestamp(start + 500)}`,
      `${"word ".repeat(8_000)}unique${index + 1}`,
    ].join("\n")).join("\n\n"), "utf8");
    expectCode(
      () => preparePrivateReference(bytes, {
        schema_version: "1.2",
        format: "srt",
        declared_duration_ms: 60_000,
        expected_raw_sha256: sha256Hex(bytes),
        expected_cue_count: starts.length,
        input_file_integrity_attested: true,
        content_completeness: "complete",
        content_completeness_basis: "Synthetic DEV eligible scoring-limit fixture.",
        reference_role: "a1_input_preservation_oracle",
        expected_class: "eligible_supported",
      }),
      "LIMIT_EXCEEDED",
    );
  });

  it("strictly parses options and rejects duplicate or additional keys", () => {
    const fixture = makeFixture();
    assert.deepEqual(
      parsePrivatePreparationOptions(JSON.stringify(fixture.options)),
      fixture.options,
    );
    expectCode(
      () => parsePrivatePreparationOptions('{"schema_version":"1.2","schema_version":"1.2"}'),
      "INVALID_OPTIONS",
    );
    expectCode(
      () => parsePrivatePreparationOptions(JSON.stringify({ ...fixture.options, extra: true })),
      "INVALID_OPTIONS",
    );
  });

  it("runs the CLI locally and emits one JSON document on stdout", () => {
    const fixture = makeFixture();
    const directory = mkdtempSync(join(tmpdir(), "youtube-private-preparation-test-"));
    temporaryDirectories.push(directory);
    const subtitlePath = join(directory, "DEV-reference.srt");
    const optionsPath = join(directory, "options.json");
    writeFileSync(subtitlePath, fixture.bytes);
    writeFileSync(optionsPath, `${JSON.stringify(fixture.options, null, 2)}\n`, "utf8");

    const stdout = execFileSync(
      process.execPath,
      ["--import", "tsx", CLI_PATH, "--options", optionsPath, "--subtitle", subtitlePath],
      { encoding: "utf8" },
    );
    const output = JSON.parse(stdout);
    assert.equal(output.private_anchor_packet.anchor_count, 7);
    assert.equal(output.publication_safe_summary.cue_count, 7);
    assert.equal(stdout.trim().startsWith("{"), true);
    assert.equal(stdout.trim().endsWith("}"), true);
  });

  it("rejects a symlinked subtitle path before reading it", () => {
    const fixture = makeFixture();
    const directory = mkdtempSync(join(tmpdir(), "youtube-private-preparation-symlink-test-"));
    temporaryDirectories.push(directory);
    const subtitlePath = join(directory, "DEV-reference.srt");
    const symlinkPath = join(directory, "linked.srt");
    const optionsPath = join(directory, "options.json");
    writeFileSync(subtitlePath, fixture.bytes);
    symlinkSync(subtitlePath, symlinkPath);
    writeFileSync(optionsPath, JSON.stringify(fixture.options), "utf8");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", CLI_PATH, "--options", optionsPath, "--subtitle", symlinkPath],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).error.code, "INVALID_FILE");
  });
});
