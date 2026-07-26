import { randomBytes as nodeRandomBytes } from "node:crypto";

const ITEM_INSTANCE_BYTES = 16;
const ITEM_INSTANCE_MAX_CANDIDATES = 8;
const ITEM_INSTANCE_ALLOCATION_EXHAUSTED =
  "item_instance_allocation_exhausted";
const ITEM_INSTANCE_ENTROPY_INVALID = "item_instance_entropy_invalid";
const LOWER_HEX = "0123456789abcdef";

// Capture the native entropy function once when this module is initialized.
// Callers cannot replace candidates between attempts by mutating the writable
// default `node:crypto` export.
const trustedRandomBytes = nodeRandomBytes;
const trustedIsBuffer = Buffer.isBuffer;

export type GeneratedItemInstancePersistResult<T> =
  | {
      readonly kind: "accepted";
      readonly value: T;
    }
  | {
      readonly kind: "live_uniqueness_collision";
    };

export interface GeneratedItemInstanceAllocation<T> {
  readonly itemInstanceId: string;
  readonly value: T;
}

export class ItemInstanceAllocationExhaustedError extends Error {
  readonly code = ITEM_INSTANCE_ALLOCATION_EXHAUSTED;

  constructor() {
    super(ITEM_INSTANCE_ALLOCATION_EXHAUSTED);
    this.name = "ItemInstanceAllocationExhaustedError";
  }
}

function generateItemInstanceCandidate(): string {
  const bytes = trustedRandomBytes(ITEM_INSTANCE_BYTES);
  if (!trustedIsBuffer(bytes) || bytes.length !== ITEM_INSTANCE_BYTES) {
    throw new Error(ITEM_INSTANCE_ENTROPY_INVALID);
  }

  let encoded = "";
  for (let index = 0; index < ITEM_INSTANCE_BYTES; index += 1) {
    const byte = bytes[index];
    encoded += LOWER_HEX[byte >>> 4] + LOWER_HEX[byte & 0x0f];
  }
  return encoded;
}

function invalidPersistResult(result: never): never {
  void result;
  throw new TypeError("item_instance_allocation_invalid_persist_result");
}

/**
 * Generates item-instance candidates internally and gives a fixed persistence
 * adapter at most eight opportunities to accept one. The adapter may classify
 * only the live-instance uniqueness conflict as retryable; every thrown error
 * propagates unchanged.
 */
export function allocateGeneratedItemInstance<T>(
  tryPersist: (
    generatedCandidate: string,
  ) => GeneratedItemInstancePersistResult<T>,
): GeneratedItemInstanceAllocation<T> {
  for (
    let attempt = 0;
    attempt < ITEM_INSTANCE_MAX_CANDIDATES;
    attempt += 1
  ) {
    const generatedCandidate = generateItemInstanceCandidate();
    const result = tryPersist(generatedCandidate);

    switch (result.kind) {
      case "accepted":
        return {
          itemInstanceId: generatedCandidate,
          value: result.value,
        };
      case "live_uniqueness_collision":
        break;
      default:
        invalidPersistResult(result);
    }
  }

  throw new ItemInstanceAllocationExhaustedError();
}
