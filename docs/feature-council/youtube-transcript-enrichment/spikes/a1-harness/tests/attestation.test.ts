import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLockedA1Attestation, sha256Hex } from "../attestation";
import { A1HarnessError } from "../errors";
import { validDevAttestation } from "./dev-fixture";

function encoded(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

test("DEV unit: validates the exact locked six-part A1 attestation", () => {
  const bytes = encoded(validDevAttestation());
  const result = parseLockedA1Attestation(bytes, sha256Hex(bytes));

  assert.equal(result.attestationPartCount, 6);
  assert.equal(result.attestation.schema_version, "1.2");
  assert.equal(result.attestation.item_id, "YT-99");
  assert.equal(result.attestation.input_contract.expected_class, "eligible_supported");
  assert.equal(result.attestation.content_rights.review_required, true);
  assert.equal(result.attestation.transcript_rights.review_required, true);
  assert.equal(result.attestation.claims_boundary.length, 5);
});

test("DEV unit: rejects a false provisional review-required marker", () => {
  const attestation = validDevAttestation();
  (attestation.content_rights as Record<string, unknown>).review_required = false;
  const bytes = encoded(attestation);

  assert.throws(
    () => parseLockedA1Attestation(bytes, sha256Hex(bytes)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );
});

test("DEV unit: rejects a last cue end beyond the declared duration", () => {
  const attestation = validDevAttestation();
  const contract = attestation.input_contract as Record<string, unknown>;
  contract.last_cue_end_ms = 10_001;
  const bytes = encoded(attestation);
  assert.throws(
    () => parseLockedA1Attestation(bytes, sha256Hex(bytes)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );
});

test("DEV unit: mirrors completeness/class cross-field conditions", () => {
  const invalidPartial = validDevAttestation("0".repeat(64), {
    format: "vtt",
    languageTag: "en",
    declaredDurationMs: 10_000,
    expectedCueCount: 2,
    lastCueEndMs: 9_000,
    contentCompleteness: "partial",
    contentCompletenessBasis: "user_attestation",
    expectedClass: "expected_safe_rejection",
  });
  const partialBytes = encoded(invalidPartial);
  assert.throws(
    () => parseLockedA1Attestation(partialBytes, sha256Hex(partialBytes)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );

  const invalidUnknown = validDevAttestation("0".repeat(64), {
    format: "vtt",
    languageTag: "en",
    declaredDurationMs: 10_000,
    expectedCueCount: 2,
    lastCueEndMs: 9_000,
    contentCompleteness: "unknown",
    contentCompletenessBasis: "unknown",
    expectedClass: "eligible_supported",
  });
  const unknownBytes = encoded(invalidUnknown);
  assert.throws(
    () => parseLockedA1Attestation(unknownBytes, sha256Hex(unknownBytes)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );
});

test("DEV unit: rejects an attestation lock digest mismatch", () => {
  const bytes = encoded(validDevAttestation());
  assert.throws(
    () => parseLockedA1Attestation(bytes, "f".repeat(64)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_LOCK_MISMATCH",
  );
});

test("DEV unit: rejects additional properties and duplicate JSON keys", () => {
  const extra = { ...validDevAttestation(), unexpected: true };
  const extraBytes = encoded(extra);
  assert.throws(
    () => parseLockedA1Attestation(extraBytes, sha256Hex(extraBytes)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );

  const duplicate = Buffer.from('{"schema_version":"1.0","schema_version":"1.0"}', "utf8");
  assert.throws(
    () => parseLockedA1Attestation(duplicate, sha256Hex(duplicate)),
    (error: unknown) => error instanceof A1HarnessError
      && error.code === "ATTESTATION_SCHEMA_INVALID",
  );
});
