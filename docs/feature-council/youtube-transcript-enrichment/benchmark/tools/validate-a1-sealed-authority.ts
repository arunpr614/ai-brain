import { extname } from "node:path";

import type { A1Attestation } from "../../spikes/a1-harness/attestation";

export const A1_SEALED_AUTHORITY_VALIDATOR_VERSION = "1.0.0";

const POSITIVE_IDS = new Set(["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"]);
const STRUCTURAL_IDS = new Set(["YT-03", "YT-05", "YT-06"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export interface A1AuthorityLedgerSemantics {
  item_id: string;
  state: "ready" | "expected_structural_rejection" | "expected_supported_class_rejection";
  reference_role: "a1_input_preservation_oracle" | "a1_safe_rejection_record";
  attestation_sha256: string;
  source_raw_sha256: string;
  source_canonical_sha256: string | null;
  source_bytes: number;
  normalized_text_character_count: number | null;
  cue_count: number;
  declared_duration_ms: number;
  last_cue_end_ms: number;
  actual_anchor_count: number;
  base_anchor_target: number;
  preparation_document_sha256: string | null;
  preparation_private_relative_path: string | null;
  expected_class: "eligible_supported" | "expected_safe_rejection";
  content_completeness_state: "complete" | "partial" | "unknown";
}

export class A1SealedAuthoritySemanticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "A1SealedAuthoritySemanticsError";
  }
}

export function validateA1SealedAuthoritySemantics(input: {
  expectedItemId: string;
  ledger: A1AuthorityLedgerSemantics;
  attestation: A1Attestation;
}): void {
  const { expectedItemId, ledger, attestation } = input;
  if (
    !POSITIVE_IDS.has(expectedItemId)
    && !STRUCTURAL_IDS.has(expectedItemId)
    && expectedItemId !== "YT-04"
  ) fail("item is outside the fixed nine-item A1 denominator");
  if (
    ledger.item_id !== expectedItemId
    || attestation.item_id !== expectedItemId
    || attestation.source.sidecar_sha256 !== ledger.source_raw_sha256
    || attestation.input_contract.format !== "vtt"
    || extname(attestation.source.private_relative_path) !== ".vtt"
    || attestation.input_contract.expected_cue_count !== ledger.cue_count
    || attestation.input_contract.declared_duration_ms !== ledger.declared_duration_ms
    || attestation.input_contract.last_cue_end_ms !== ledger.last_cue_end_ms
    || attestation.input_contract.expected_class !== ledger.expected_class
    || attestation.input_contract.content_completeness.state !== ledger.content_completeness_state
  ) fail("attestation and ledger identity/input contract differ");

  const positive = POSITIVE_IDS.has(expectedItemId);
  if (positive) {
    if (
      ledger.state !== "ready"
      || ledger.expected_class !== "eligible_supported"
      || ledger.reference_role !== "a1_input_preservation_oracle"
      || ledger.source_canonical_sha256 === null
      || ledger.normalized_text_character_count === null
      || ledger.actual_anchor_count < 1
      || !validPrivatePreparation(ledger)
    ) fail("eligible authority lacks its fixed preservation role or preparation contract");
    return;
  }

  if (
    ledger.expected_class !== "expected_safe_rejection"
    || ledger.reference_role !== "a1_safe_rejection_record"
    || ledger.actual_anchor_count !== 0
  ) fail("rejection authority has an invalid role or anchor state");
  if (expectedItemId === "YT-04") {
    if (
      ledger.state !== "expected_supported_class_rejection"
      || ledger.source_canonical_sha256 === null
      || ledger.normalized_text_character_count === null
      || !validPrivatePreparation(ledger)
    ) fail("YT-04 does not preserve the fixed supported-class rejection contract");
    return;
  }
  if (
    ledger.state !== "expected_structural_rejection"
    || ledger.source_canonical_sha256 !== null
    || ledger.normalized_text_character_count !== null
    || ledger.preparation_document_sha256 !== null
    || ledger.preparation_private_relative_path !== null
  ) fail("structural rejection authority has scoreable or canonical evidence");
}

function validPrivatePreparation(ledger: A1AuthorityLedgerSemantics): boolean {
  return typeof ledger.preparation_private_relative_path === "string"
    && ledger.preparation_private_relative_path.length > 0
    && !ledger.preparation_private_relative_path.startsWith("/")
    && !ledger.preparation_private_relative_path.includes("\\")
    && ledger.preparation_private_relative_path.split("/").every((segment) => (
      segment !== "" && segment !== "." && segment !== ".."
    ))
    && typeof ledger.preparation_document_sha256 === "string"
    && SHA256_PATTERN.test(ledger.preparation_document_sha256);
}

function fail(message: string): never {
  throw new A1SealedAuthoritySemanticsError(message);
}
