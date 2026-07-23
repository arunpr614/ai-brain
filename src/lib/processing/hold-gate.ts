import type Database from "better-sqlite3";
import { getDb } from "@/db/client";
import { getYouTubeBrowserSchemaCapability } from "@/db/schema-capabilities";

export type BodyProcessingGate =
  | {
      readonly allowed: true;
      readonly basis: "legacy_schema_absent" | "clear";
    }
  | {
      readonly allowed: false;
      readonly basis: "held" | "schema_incompatible";
      readonly code:
        | "processing_hold_active"
        | "processing_schema_incompatible";
    };

export type BodyProcessingBlockedGate = Extract<
  BodyProcessingGate,
  { readonly allowed: false }
>;

/**
 * Stable internal no-effect signal for legacy APIs that cannot add a blocked
 * result without breaking their schema-026 contract. The message contains no
 * item identifier or provider detail.
 */
export class ItemBodyProcessingBlockedError extends Error {
  readonly code: BodyProcessingBlockedGate["code"];
  readonly basis: BodyProcessingBlockedGate["basis"];

  constructor(decision: BodyProcessingBlockedGate) {
    super(decision.code);
    this.name = "ItemBodyProcessingBlockedError";
    this.code = decision.code;
    this.basis = decision.basis;
  }
}

const LEGACY_ALLOWED: BodyProcessingGate = Object.freeze({
  allowed: true,
  basis: "legacy_schema_absent",
});
const CLEAR: BodyProcessingGate = Object.freeze({
  allowed: true,
  basis: "clear",
});
const HELD: BodyProcessingGate = Object.freeze({
  allowed: false,
  basis: "held",
  code: "processing_hold_active",
});
const INCOMPATIBLE: BodyProcessingGate = Object.freeze({
  allowed: false,
  basis: "schema_incompatible",
  code: "processing_schema_incompatible",
});

/**
 * Resolve authority for item-body/transcript processing.
 *
 * The schema capability is always obtained from the fixed packaged attestor;
 * callers cannot inject a ready verdict. Hold state is queried on every ready
 * invocation and is never cached. Apply-time callers must pass the transaction
 * handle that owns their write.
 */
export function resolveItemBodyProcessingGate(
  itemId: string,
  db: Database.Database = getDb(),
): BodyProcessingGate {
  const capability = getYouTubeBrowserSchemaCapability(db);
  if (capability.kind === "absent") return LEGACY_ALLOWED;
  if (capability.kind === "incompatible") return INCOMPATIBLE;

  try {
    const activeHold = db
      .prepare(
        `SELECT 1 AS held
         FROM content_processing_holds
         WHERE item_id = ?
           AND state = 'held'
         LIMIT 1`,
      )
      .get(itemId) as { held: number } | undefined;
    return activeHold ? HELD : CLEAR;
  } catch {
    // A ready attestation and a failing hold query cannot both be trusted.
    return INCOMPATIBLE;
  }
}

/**
 * Assert body-processing authority for APIs whose existing return type cannot
 * represent a blocked no-effect result. Callers must not treat this exception
 * as a provider failure or ordinary retry condition.
 */
export function assertItemBodyProcessingAllowed(
  itemId: string,
  db: Database.Database = getDb(),
): Extract<BodyProcessingGate, { readonly allowed: true }> {
  const decision = resolveItemBodyProcessingGate(itemId, db);
  if (!decision.allowed) {
    throw new ItemBodyProcessingBlockedError(decision);
  }
  return decision;
}
