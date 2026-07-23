/**
 * Local-only batch correlation and unresolved-dispatch containment.
 *
 * Provider-visible aliases are fresh random values created by the caller.
 * These encodings never cross the provider boundary; they let every local
 * claimant distinguish a reconciled provider batch from an ambiguous submit
 * whose acceptance is unknown.
 */

const BATCH_ALIAS_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const BATCH_BINDING_PREFIX = "opaque-v1:";
const BATCH_RESERVATION_PREFIX = "opaque-reservation-v1:";

export interface DecodedBatchBinding {
  readonly providerBatchId: string;
  readonly alias: string | null;
}

export class UnresolvedBatchReservationError extends Error {
  readonly code = "batch_submit_outcome_unknown";

  constructor() {
    super("batch_submit_outcome_unknown");
    this.name = "UnresolvedBatchReservationError";
  }
}

export function encodeBatchReservation(alias: string): string {
  if (!BATCH_ALIAS_PATTERN.test(alias)) {
    throw new UnresolvedBatchReservationError();
  }
  return `${BATCH_RESERVATION_PREFIX}${alias}`;
}

export function encodeBatchBinding(
  providerBatchId: string,
  alias: string,
): string {
  if (
    !isValidProviderBatchId(providerBatchId) ||
    !BATCH_ALIAS_PATTERN.test(alias)
  ) {
    throw new UnresolvedBatchReservationError();
  }
  return `${BATCH_BINDING_PREFIX}${Buffer.from(
    JSON.stringify([providerBatchId, alias]),
    "utf8",
  ).toString("base64url")}`;
}

/**
 * Provider acceptance is unknown while this marker is present. Clearing it
 * without a separately reviewed reconciliation/abandon operation could resend
 * the same private body after an accepted-but-lost response.
 */
export function isUnresolvedBatchReservation(value: unknown): boolean {
  return (
    typeof value === "string" && value.startsWith(BATCH_RESERVATION_PREFIX)
  );
}

export function assertNoUnresolvedBatchReservation(value: unknown): void {
  if (isUnresolvedBatchReservation(value)) {
    throw new UnresolvedBatchReservationError();
  }
}

export function decodeBatchBinding(stored: string): DecodedBatchBinding {
  if (isUnresolvedBatchReservation(stored)) {
    const alias = stored.slice(BATCH_RESERVATION_PREFIX.length);
    return {
      providerBatchId: "",
      alias: BATCH_ALIAS_PATTERN.test(alias) ? alias : null,
    };
  }
  if (!stored.startsWith(BATCH_BINDING_PREFIX)) {
    return { providerBatchId: stored, alias: null };
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(
        stored.slice(BATCH_BINDING_PREFIX.length),
        "base64url",
      ).toString("utf8"),
    );
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      isValidProviderBatchId(parsed[0]) &&
      typeof parsed[1] === "string" &&
      BATCH_ALIAS_PATTERN.test(parsed[1])
    ) {
      return { providerBatchId: parsed[0], alias: parsed[1] };
    }
  } catch {
    // Malformed local state is never provider authority.
  }
  return { providerBatchId: "", alias: null };
}

export function isValidProviderBatchId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}
