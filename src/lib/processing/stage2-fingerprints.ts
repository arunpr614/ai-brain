import { createHash } from "node:crypto";

export type Stage2FingerprintValue =
  | null
  | string
  | number
  | bigint
  | boolean
  | readonly Stage2FingerprintValue[];

const NULL_FRAME_LENGTH = 0xffff_ffff;
const MAX_VALUE_FRAME_LENGTH = NULL_FRAME_LENGTH - 1;
const textEncoder = new TextEncoder();

function canonicalInteger(value: number | bigint): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError("stage2_fingerprint_integer_not_safe");
    }
    return Object.is(value, -0) ? "0" : String(value);
  }
  return value.toString(10);
}

function encodeScalar(value: Exclude<Stage2FingerprintValue, null | readonly Stage2FingerprintValue[]>): Uint8Array {
  if (typeof value === "string") return textEncoder.encode(value);
  if (typeof value === "boolean") return textEncoder.encode(value ? "1" : "0");
  return textEncoder.encode(canonicalInteger(value));
}

function appendFrame(chunks: Buffer[], value: null | Uint8Array): void {
  const length = Buffer.allocUnsafe(4);
  if (value === null) {
    length.writeUInt32BE(NULL_FRAME_LENGTH);
    chunks.push(length);
    return;
  }
  if (value.byteLength > MAX_VALUE_FRAME_LENGTH) {
    throw new RangeError("stage2_fingerprint_field_too_large");
  }
  length.writeUInt32BE(value.byteLength);
  chunks.push(length, Buffer.from(value));
}

function appendValue(chunks: Buffer[], value: Stage2FingerprintValue): void {
  if (value === null) {
    appendFrame(chunks, null);
    return;
  }
  if (!Array.isArray(value)) {
    appendFrame(
      chunks,
      encodeScalar(
        value as Exclude<
          Stage2FingerprintValue,
          null | readonly Stage2FingerprintValue[]
        >,
      ),
    );
    return;
  }

  appendFrame(chunks, encodeScalar(value.length));
  value.forEach((entry, index) => {
    appendFrame(chunks, encodeScalar(index));
    appendValue(chunks, entry);
  });
}

/**
 * Encode the frozen Stage 2 operation-input-fingerprint-v1 preimage.
 *
 * The domain is UTF-8 followed by one NUL. Every scalar field is framed by a
 * four-byte unsigned big-endian byte length. Null uses 0xffffffff. Arrays
 * expand to their count followed by canonical decimal index/value pairs.
 */
export function encodeStage2FingerprintPreimage(
  domain: string,
  fields: readonly Stage2FingerprintValue[],
): Buffer {
  if (domain.length === 0 || domain.includes("\0")) {
    throw new TypeError("stage2_fingerprint_domain_invalid");
  }
  const chunks = [Buffer.from(textEncoder.encode(domain)), Buffer.from([0])];
  for (const field of fields) appendValue(chunks, field);
  return Buffer.concat(chunks);
}

export function stage2FingerprintSha256(
  domain: string,
  fields: readonly Stage2FingerprintValue[],
): string {
  return createHash("sha256")
    .update(encodeStage2FingerprintPreimage(domain, fields))
    .digest("hex");
}
