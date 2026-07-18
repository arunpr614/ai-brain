export type A1HarnessErrorCode =
  | "ARGUMENT_INVALID"
  | "BOOTSTRAP_FLAGS_REQUIRED"
  | "BRAIN_DB_PATH_REQUIRED"
  | "BRAIN_DB_NOT_FRESH"
  | "PRIVATE_OUTPUT_INVALID"
  | "BENCHMARK_LOCK_INVALID"
  | "ATTESTATION_LOCK_MISMATCH"
  | "ATTESTATION_SCHEMA_INVALID"
  | "ATTESTATION_CONTRACT_MISMATCH"
  | "SCHEMA_FILE_MISMATCH"
  | "INPUT_LOCK_MISMATCH"
  | "VIDEO_ID_LOCK_MISMATCH"
  | "PREFLIGHT_REJECTED"
  | "SEEDED_ITEM_MISMATCH"
  | "PERSISTED_SEGMENT_MISMATCH"
  | "PROVIDER_ATTEMPT_DETECTED"
  | "NETWORK_ATTEMPT_BLOCKED"
  | "DATABASE_EVIDENCE_FINALIZATION_FAILED"
  | "PRIVATE_OUTPUT_WRITE_FAILED"
  | "UNEXPECTED_FAILURE";

/**
 * Messages carried by this error are never printed by the CLI. They are for
 * local debugging only; the process boundary emits the stable code.
 */
export class A1HarnessError extends Error {
  constructor(
    readonly code: A1HarnessErrorCode,
    message: string,
    readonly detailCode?: string,
  ) {
    super(message);
    this.name = "A1HarnessError";
  }
}
