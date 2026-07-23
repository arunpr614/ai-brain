/**
 * Content-free diagnostics for containment decisions.
 *
 * This is intentionally not a generic logging helper. It accepts a closed
 * typed object, rejects unknown fields at runtime, and never copies arbitrary
 * caller input or errors into the returned record.
 */

export const CONTAINMENT_DIAGNOSTIC_EVENTS = [
  "deployment_classified",
  "configured_origin_checked",
  "schema_capability_checked",
  "worker_plan_resolved",
  "claimant_guarded",
  "restricted_capability_denied",
] as const;

export const CONTAINMENT_DIAGNOSTIC_OUTCOMES = [
  "allowed",
  "denied",
  "disabled",
  "started",
  "skipped",
  "valid",
  "invalid",
  "conflict",
  "absent",
  "ready",
  "incompatible",
  "failed_closed",
] as const;

export const DIAGNOSTIC_DEPLOYMENTS = [
  "production",
  "lab",
  "development",
  "test",
  "unknown",
] as const;

export const DIAGNOSTIC_CONFIGURATION_STATES = [
  "valid",
  "missing",
  "invalid",
  "conflict",
] as const;

export const DIAGNOSTIC_WORKER_MODES = [
  "disabled",
  "standard",
  "manual-transcript-lab",
  "legacy_default_standard",
  "invalid",
] as const;

export const DIAGNOSTIC_CLAIMANTS = [
  "scheduled_enrichment",
  "transcript_recovery",
  "batch_submit",
  "batch_poll",
  "note_index",
  "generic_embedding",
  "manual_transcript",
  "maintenance_backfill",
] as const;

export const DIAGNOSTIC_PHASES = [
  "startup",
  "candidate",
  "claim",
  "dispatch",
  "apply",
  "terminal",
  "retry",
] as const;

export const DIAGNOSTIC_SCHEMA_STATES = [
  "absent",
  "ready",
  "incompatible",
] as const;

export const DIAGNOSTIC_ELAPSED_BUCKETS = [
  "not_measured",
  "lt_10ms",
  "lt_100ms",
  "lt_1s",
  "lt_10s",
  "gte_10s",
] as const;

export const DIAGNOSTIC_PAYLOAD_SIZE_BUCKETS = [
  "not_measured",
  "zero",
  "lt_1kib",
  "lt_16kib",
  "lt_256kib",
  "gte_256kib",
] as const;

export const DIAGNOSTIC_CONTRACT_VERSIONS = [
  "deployment-classifier-v1",
  "configured-origin-v1",
  "schema-capabilities-v1",
  "content-worker-mode-v1",
  "containment-diagnostics-v1",
] as const;

export const DIAGNOSTIC_STOP_DECISIONS = [
  "go",
  "stop",
  "not_applicable",
] as const;

type TupleValue<T extends readonly string[]> = T[number];

export interface ContainmentDiagnosticInput {
  readonly event: TupleValue<typeof CONTAINMENT_DIAGNOSTIC_EVENTS>;
  readonly outcome: TupleValue<typeof CONTAINMENT_DIAGNOSTIC_OUTCOMES>;
  readonly deployment?: TupleValue<typeof DIAGNOSTIC_DEPLOYMENTS>;
  readonly configurationState?: TupleValue<
    typeof DIAGNOSTIC_CONFIGURATION_STATES
  >;
  readonly workerMode?: TupleValue<typeof DIAGNOSTIC_WORKER_MODES>;
  readonly claimant?: TupleValue<typeof DIAGNOSTIC_CLAIMANTS>;
  readonly phase?: TupleValue<typeof DIAGNOSTIC_PHASES>;
  readonly schemaState?: TupleValue<typeof DIAGNOSTIC_SCHEMA_STATES>;
  readonly aggregateCount?: number;
  readonly guardrailTriggered?: boolean;
  readonly workStarted?: boolean;
  readonly providerContacted?: boolean;
  readonly elapsedBucket?: TupleValue<typeof DIAGNOSTIC_ELAPSED_BUCKETS>;
  readonly payloadSizeBucket?: TupleValue<
    typeof DIAGNOSTIC_PAYLOAD_SIZE_BUCKETS
  >;
  readonly contractVersion?: TupleValue<
    typeof DIAGNOSTIC_CONTRACT_VERSIONS
  >;
  readonly stopDecision?: TupleValue<typeof DIAGNOSTIC_STOP_DECISIONS>;
  readonly timestamp?: string;
}

export type ContainmentDiagnostic = Readonly<ContainmentDiagnosticInput>;

export class ContainmentDiagnosticValidationError extends Error {
  readonly code = "invalid_containment_diagnostic";

  constructor() {
    super("invalid_containment_diagnostic");
    this.name = "ContainmentDiagnosticValidationError";
  }
}

const ALLOWED_KEYS = new Set<keyof ContainmentDiagnosticInput>([
  "event",
  "outcome",
  "deployment",
  "configurationState",
  "workerMode",
  "claimant",
  "phase",
  "schemaState",
  "aggregateCount",
  "guardrailTriggered",
  "workStarted",
  "providerContacted",
  "elapsedBucket",
  "payloadSizeBucket",
  "contractVersion",
  "stopDecision",
  "timestamp",
]);

const ENUM_FIELDS = {
  event: new Set<string>(CONTAINMENT_DIAGNOSTIC_EVENTS),
  outcome: new Set<string>(CONTAINMENT_DIAGNOSTIC_OUTCOMES),
  deployment: new Set<string>(DIAGNOSTIC_DEPLOYMENTS),
  configurationState: new Set<string>(DIAGNOSTIC_CONFIGURATION_STATES),
  workerMode: new Set<string>(DIAGNOSTIC_WORKER_MODES),
  claimant: new Set<string>(DIAGNOSTIC_CLAIMANTS),
  phase: new Set<string>(DIAGNOSTIC_PHASES),
  schemaState: new Set<string>(DIAGNOSTIC_SCHEMA_STATES),
  elapsedBucket: new Set<string>(DIAGNOSTIC_ELAPSED_BUCKETS),
  payloadSizeBucket: new Set<string>(DIAGNOSTIC_PAYLOAD_SIZE_BUCKETS),
  contractVersion: new Set<string>(DIAGNOSTIC_CONTRACT_VERSIONS),
  stopDecision: new Set<string>(DIAGNOSTIC_STOP_DECISIONS),
} as const;

const BOOLEAN_FIELDS = [
  "guardrailTriggered",
  "workStarted",
  "providerContacted",
] as const;

const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function createContainmentDiagnostic(
  input: ContainmentDiagnosticInput,
): ContainmentDiagnostic {
  try {
    return createValidatedDiagnostic(input);
  } catch (error) {
    if (error instanceof ContainmentDiagnosticValidationError) throw error;
    throw new ContainmentDiagnosticValidationError();
  }
}

function createValidatedDiagnostic(
  input: ContainmentDiagnosticInput,
): ContainmentDiagnostic {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new ContainmentDiagnosticValidationError();
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ContainmentDiagnosticValidationError();
  }

  const keys = Reflect.ownKeys(input);
  if (
    keys.some(
      (key) => typeof key !== "string" || !ALLOWED_KEYS.has(
        key as keyof ContainmentDiagnosticInput,
      ),
    )
  ) {
    throw new ContainmentDiagnosticValidationError();
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const key of keys) {
    if (typeof key !== "string") {
      throw new ContainmentDiagnosticValidationError();
    }
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new ContainmentDiagnosticValidationError();
    }
  }

  const values = Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      descriptor.value,
    ]),
  ) as Record<string, unknown>;

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const value = values[field];
    if (value !== undefined && (
      typeof value !== "string" ||
      !allowed.has(value)
    )) {
      throw new ContainmentDiagnosticValidationError();
    }
  }
  if (values.event === undefined || values.outcome === undefined) {
    throw new ContainmentDiagnosticValidationError();
  }

  for (const field of BOOLEAN_FIELDS) {
    const value = values[field];
    if (value !== undefined && typeof value !== "boolean") {
      throw new ContainmentDiagnosticValidationError();
    }
  }

  if (
    values.aggregateCount !== undefined &&
    (
      typeof values.aggregateCount !== "number" ||
      !Number.isSafeInteger(values.aggregateCount) ||
      values.aggregateCount < 0
    )
  ) {
    throw new ContainmentDiagnosticValidationError();
  }

  if (
    values.timestamp !== undefined &&
    (
      typeof values.timestamp !== "string" ||
      !UTC_TIMESTAMP_PATTERN.test(values.timestamp) ||
      !isNormalizedTimestamp(values.timestamp)
    )
  ) {
    throw new ContainmentDiagnosticValidationError();
  }

  const diagnostic: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    const value = values[key];
    if (value !== undefined) diagnostic[key] = value;
  }
  return Object.freeze(
    diagnostic,
  ) as unknown as ContainmentDiagnostic;
}

function isNormalizedTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}
