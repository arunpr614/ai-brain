import { createHash } from "node:crypto";

export const CONTROL_FRAME_PREFIX_BYTES = 4;
export const STRUCTURED_EVENT_MAX_PAYLOAD_BYTES = 4_096;
export const STRUCTURED_EVENT_TOTAL_CAP_BYTES = 8_388_608;
export const STRUCTURED_EVENT_MAX_EVENTS = 10_000;
export const COMMAND_OUTPUT_DOMAIN = "stage2-command-output-v1";
export const RUN_BINDING_DOMAIN = "stage2-run-binding-v2";
export const FROZEN_ACCEPTANCE_REGISTRY_SHA256 =
  "7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45";
export const FROZEN_ASSERTION_MANIFEST_SHA256 =
  "9879195bd25647c569147c11953df194051d0302469bc5fa870cc36db5231e42";

export const STRUCTURED_EVENT_KEYS = Object.freeze([
  "case_id",
  "assertion_id",
  "status",
]);

export const STRUCTURED_EVENT_STATUSES = Object.freeze([
  "PASS",
  "SKIP",
  "TODO",
  "CANCELLED",
  "FAIL",
]);

export const ASSERTION_MANIFEST_RECORD_KEYS = Object.freeze([
  "assertion_id",
  "source",
]);

export const ASSERTION_MANIFEST_SOURCES = Object.freeze([
  "child_event",
  "host_control_oracle_bundle",
]);

export const ASSERTION_MANIFEST_KEYS = Object.freeze([
  "domain",
  "cases",
]);

export const RUN_BINDING_KEYS = Object.freeze([
  "case_id",
  "contract_sha256",
  "registry_sha256",
  "shared_run_binding_sha256",
  "aggregation_binding_sha256",
  "platform",
  "platform_descriptor_sha256",
  "host_control_oracle_bundle_sha256",
  "git_commit",
  "migration_sha256",
  "fixture_sha256",
  "schema_manifest_sha256",
  "failpoint_registry_sha256",
  "generated_migration_failpoints_sha256",
  "binary_artifact_sha256",
  "assertion_manifest_sha256",
  "evidence_runner_sha256",
  "operation_matrix_sha256",
  "command",
  "timeout_seconds",
]);

export const ACCEPTANCE_REGISTRY_CASE_KEYS = Object.freeze([
  "id",
  "platform",
  "owner",
  "tier",
  "command",
  "timeout_seconds",
  "oracle",
  "evidence_path",
]);

export const ACCEPTANCE_REGISTRY_KEYS = Object.freeze([
  "contract_version",
  "migration_filename",
  "status",
  "failpoint_registry_sha256",
  "failpoint_registry_fixed_name_count",
  "evidence_manifest_required_fields",
  "evidence_field_schema",
  "evidence_serialization",
  "failpoint_registries",
  "private_stage_operation_registry",
  "cases",
]);

const ACCEPTANCE_CASE_IDS = Object.freeze(
  Array.from(
    { length: 17 },
    (_, index) => `S2-AC-${String(index + 1).padStart(2, "0")}`,
  ),
);

const RUN_BINDING_HASH_KEYS = Object.freeze([
  "contract_sha256",
  "registry_sha256",
  "shared_run_binding_sha256",
  "aggregation_binding_sha256",
  "platform_descriptor_sha256",
  "migration_sha256",
  "fixture_sha256",
  "schema_manifest_sha256",
  "failpoint_registry_sha256",
  "generated_migration_failpoints_sha256",
  "binary_artifact_sha256",
  "assertion_manifest_sha256",
  "evidence_runner_sha256",
  "operation_matrix_sha256",
]);

const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const LOWER_GIT_COMMIT = /^[0-9a-f]{40}$/;
const CASE_ID = /^S2-AC-(0[1-9]|1[0-7])$/;
const ASSERTION_ID = /^S2-AC-[0-9]{2}\/[a-z0-9][a-z0-9._-]{0,127}$/;
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });

export class Stage2EvidenceProtocolError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "Stage2EvidenceProtocolError";
    this.code = code;
  }
}

function refuse(code, message) {
  throw new Stage2EvidenceProtocolError(code, message);
}

function asBytes(value, label) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  refuse("invalid_bytes", `${label} must be bytes`);
}

function assertPositiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    refuse("invalid_integer", `${label} must be a positive safe integer`);
  }
}

function assertNonnegativeSafeInteger(value, label) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    refuse(
      "invalid_canonical_integer",
      `${label} must be a nonnegative safe integer`,
    );
  }
}

function assertPrintableAscii(value, label, { allowEmpty = true } = {}) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    !PRINTABLE_ASCII.test(value)
  ) {
    refuse("invalid_ascii", `${label} must be printable ASCII`);
  }
}

function assertExpectedKeys(value, expectedKeys, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    refuse("invalid_object", `${label} must be a plain JSON object`);
  }

  const keys = Object.keys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    refuse(
      "invalid_keys",
      `${label} key membership or insertion order does not match the contract`,
    );
  }
}

function arrayDataDescriptors(value, label) {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    refuse("invalid_object", `${label} must be a plain JSON array`);
  }

  const enumerableKeys = Object.keys(value);
  const expectedIndexKeys = Array.from(
    { length: value.length },
    (_, index) => String(index),
  );
  const ownKeys = Reflect.ownKeys(value);
  if (
    enumerableKeys.length !== expectedIndexKeys.length ||
    enumerableKeys.some((key, index) => key !== expectedIndexKeys[index]) ||
    ownKeys.length !== expectedIndexKeys.length + 1 ||
    ownKeys.some(
      (key, index) =>
        key !==
        (index < expectedIndexKeys.length
          ? expectedIndexKeys[index]
          : "length"),
    )
  ) {
    refuse(
      "noncanonical_property",
      `${label} contains a hole, symbol, or non-index property`,
    );
  }

  return expectedIndexKeys.map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      refuse(
        "noncanonical_property",
        `${label}[${key}] must be a data property`,
      );
    }
    return descriptor;
  });
}

function assertCanonicalJsonValue(value, label, ancestors = new Set()) {
  if (value === null || typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    assertPrintableAscii(value, label);
    return;
  }
  if (typeof value === "number") {
    assertNonnegativeSafeInteger(value, label);
    return;
  }
  if (typeof value !== "object") {
    refuse("invalid_json_value", `${label} is not a canonical JSON value`);
  }
  if (ancestors.has(value)) {
    refuse("cyclic_json_value", `${label} contains a cycle`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (const [index, descriptor] of arrayDataDescriptors(
        value,
        label,
      ).entries()) {
        assertCanonicalJsonValue(
          descriptor.value,
          `${label}[${index}]`,
          ancestors,
        );
      }
      return;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      refuse("invalid_object", `${label} must be a plain JSON object`);
    }

    const enumerableKeys = Object.keys(value);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== enumerableKeys.length ||
      ownKeys.some(
        (key, index) =>
          typeof key !== "string" || key !== enumerableKeys[index],
      )
    ) {
      refuse(
        "noncanonical_property",
        `${label} contains a symbol or non-enumerable property`,
      );
    }

    for (const key of enumerableKeys) {
      assertPrintableAscii(key, `${label} key`, { allowEmpty: false });
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        refuse(
          "noncanonical_property",
          `${label}.${key} must be a data property`,
        );
      }
      assertCanonicalJsonValue(descriptor.value, `${label}.${key}`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function assertExpectedKeyList(expectedKeys) {
  if (
    !Array.isArray(expectedKeys) ||
    expectedKeys.length === 0 ||
    new Set(expectedKeys).size !== expectedKeys.length
  ) {
    refuse(
      "invalid_expected_keys",
      "expectedKeys must be a nonempty array of unique strings",
    );
  }
  for (const key of expectedKeys) {
    assertPrintableAscii(key, "expected key", { allowEmpty: false });
  }
}

function quoteJsonString(value) {
  let result = '"';
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    switch (codeUnit) {
      case 0x08:
        result += "\\b";
        break;
      case 0x09:
        result += "\\t";
        break;
      case 0x0a:
        result += "\\n";
        break;
      case 0x0c:
        result += "\\f";
        break;
      case 0x0d:
        result += "\\r";
        break;
      case 0x22:
        result += '\\"';
        break;
      case 0x5c:
        result += "\\\\";
        break;
      default:
        if (
          codeUnit < 0x20 ||
          (codeUnit >= 0xd800 && codeUnit <= 0xdfff)
        ) {
          const nextCodeUnit =
            index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
          if (
            codeUnit >= 0xd800 &&
            codeUnit <= 0xdbff &&
            nextCodeUnit >= 0xdc00 &&
            nextCodeUnit <= 0xdfff
          ) {
            result += value[index] + value[index + 1];
            index += 1;
          } else {
            result += `\\u${codeUnit.toString(16).padStart(4, "0")}`;
          }
        } else {
          result += value[index];
        }
    }
  }
  return `${result}"`;
}

/**
 * Serialize only data properties accepted by one of the validators above.
 * This intentionally does not call JSON.stringify on an object or array:
 * inherited Object.prototype.toJSON or Array.prototype.toJSON must never
 * influence authority-bearing bytes.
 */
function serializeCanonicalJsonValue(value) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return quoteJsonString(value);
  }
  if (Array.isArray(value)) {
    const entries = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(
        value,
        String(index),
      );
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        refuse(
          "noncanonical_property",
          "canonical JSON changed after array data-property validation",
        );
      }
      entries.push(serializeCanonicalJsonValue(descriptor.value));
    }
    return `[${entries.join(",")}]`;
  }

  return `{${Object.keys(value)
    .map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        refuse(
          "noncanonical_property",
          "canonical JSON changed after data-property validation",
        );
      }
      return `${quoteJsonString(key)}:${serializeCanonicalJsonValue(descriptor.value)}`;
    })
    .join(",")}}`;
}

/**
 * Serialize a closed-schema object using the Stage 2 JSON rules.
 *
 * This helper deliberately requires an exact top-level key list. Nested
 * closed schemas must be validated by their owning protocol before calling
 * this function.
 */
export function canonicalJsonBytes(
  value,
  expectedKeys,
  { trailingLf = true, label = "canonical JSON" } = {},
) {
  assertExpectedKeyList(expectedKeys);
  assertExpectedKeys(value, expectedKeys, label);
  assertCanonicalJsonValue(value, label);

  const compact = Buffer.from(serializeCanonicalJsonValue(value), "ascii");
  return trailingLf
    ? Buffer.concat([compact, Buffer.from("\n", "ascii")])
    : compact;
}

/**
 * Parse and byte-revalidate a closed-schema canonical JSON object.
 *
 * Re-serialization is intentional: it rejects duplicate keys, reordered
 * keys, alternate escapes, insignificant whitespace, and values that JSON
 * would otherwise normalize.
 */
export function parseCanonicalJsonBytes(
  input,
  expectedKeys,
  { trailingLf = true, label = "canonical JSON" } = {},
) {
  const bytes = asBytes(input, label);
  assertExpectedKeyList(expectedKeys);

  let compact;
  if (trailingLf) {
    if (
      bytes.length < 3 ||
      bytes.at(-1) !== 0x0a ||
      bytes.at(-2) === 0x0a
    ) {
      refuse(
        "invalid_trailing_lf",
        `${label} must end in exactly one LF`,
      );
    }
    compact = bytes.subarray(0, bytes.length - 1);
  } else {
    compact = bytes;
  }

  if (
    compact.length === 0 ||
    compact.includes(0x0a) ||
    compact.includes(0x0d) ||
    (compact.length >= 3 &&
      compact[0] === 0xef &&
      compact[1] === 0xbb &&
      compact[2] === 0xbf)
  ) {
    refuse(
      "invalid_canonical_bytes",
      `${label} contains a forbidden BOM, CR, LF, or empty payload`,
    );
  }

  let text;
  try {
    text = UTF8_FATAL.decode(compact);
  } catch {
    refuse("invalid_utf8", `${label} is not valid UTF-8`);
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch {
    refuse("invalid_json", `${label} is not valid JSON`);
  }

  const canonical = canonicalJsonBytes(value, expectedKeys, {
    trailingLf,
    label,
  });
  if (!canonical.equals(bytes)) {
    refuse(
      "noncanonical_json",
      `${label} is not the exact ECMAScript canonical encoding`,
    );
  }
  return value;
}

function parseFrozenRegistryJsonBytes(input) {
  const label = "acceptance registry";
  const bytes = asBytes(input, `${label} bytes`);

  let text;
  try {
    text = UTF8_FATAL.decode(bytes);
  } catch {
    refuse("invalid_utf8", `${label} is not valid UTF-8`);
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch {
    refuse("invalid_json", `${label} is not valid JSON`);
  }
  return value;
}

export function encodeLengthFrame(
  payload,
  { maxPayloadBytes = 0xffff_ffff, label = "frame" } = {},
) {
  const bytes = asBytes(payload, `${label} payload`);
  assertPositiveSafeInteger(maxPayloadBytes, `${label} maxPayloadBytes`);
  if (maxPayloadBytes > 0xffff_ffff) {
    refuse(
      "invalid_frame_cap",
      `${label} maxPayloadBytes exceeds uint32`,
    );
  }
  if (bytes.length === 0 || bytes.length > maxPayloadBytes) {
    refuse(
      "invalid_frame_length",
      `${label} payload length is outside 1..${maxPayloadBytes}`,
    );
  }

  const prefix = Buffer.alloc(CONTROL_FRAME_PREFIX_BYTES);
  prefix.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([prefix, bytes]);
}

/**
 * Incrementally drains a bounded frame stream without releasing authority-
 * bearing payloads before exact EOF. A caller receives frames only from a
 * successful finish(); any earlier protocol error permanently poisons the
 * decoder.
 */
export class LengthFrameDecoder {
  #buffer = Buffer.alloc(0);
  #failed = false;
  #finished = false;
  #frameCount = 0;
  #frames = [];
  #totalBytes = 0;

  constructor({
    maxPayloadBytes,
    totalCapBytes,
    minFrames = 1,
    maxFrames = 1,
    label = "framed stream",
  }) {
    assertPositiveSafeInteger(maxPayloadBytes, `${label} maxPayloadBytes`);
    assertPositiveSafeInteger(totalCapBytes, `${label} totalCapBytes`);
    if (maxPayloadBytes > 0xffff_ffff) {
      refuse(
        "invalid_frame_cap",
        `${label} maxPayloadBytes exceeds uint32`,
      );
    }
    if (
      !Number.isSafeInteger(minFrames) ||
      minFrames < 0 ||
      !Number.isSafeInteger(maxFrames) ||
      maxFrames < 1 ||
      minFrames > maxFrames
    ) {
      refuse("invalid_frame_count", `${label} frame bounds are invalid`);
    }

    this.maxPayloadBytes = maxPayloadBytes;
    this.totalCapBytes = totalCapBytes;
    this.minFrames = minFrames;
    this.maxFrames = maxFrames;
    this.label = label;
  }

  push(chunk) {
    if (this.#finished) {
      refuse("decoder_finished", `${this.label} received bytes after EOF`);
    }
    if (this.#failed) {
      refuse(
        "decoder_failed",
        `${this.label} cannot resume after a protocol error`,
      );
    }

    try {
      const bytes = asBytes(chunk, this.label);
      if (bytes.length === 0) {
        return;
      }

      this.#totalBytes += bytes.length;
      if (this.#totalBytes > this.totalCapBytes) {
        refuse(
          "frame_total_cap_exceeded",
          `${this.label} exceeds its total byte cap`,
        );
      }

      this.#buffer =
        this.#buffer.length === 0
          ? Buffer.from(bytes)
          : Buffer.concat([this.#buffer, bytes]);

      while (this.#buffer.length >= CONTROL_FRAME_PREFIX_BYTES) {
        const payloadLength = this.#buffer.readUInt32BE(0);
        if (
          payloadLength === 0 ||
          payloadLength > this.maxPayloadBytes
        ) {
          refuse(
            "invalid_frame_length",
            `${this.label} declared length is outside 1..${this.maxPayloadBytes}`,
          );
        }

        const frameLength = CONTROL_FRAME_PREFIX_BYTES + payloadLength;
        if (this.#buffer.length < frameLength) {
          break;
        }
        if (this.#frameCount === this.maxFrames) {
          refuse(
            "too_many_frames",
            `${this.label} contains more than ${this.maxFrames} frames`,
          );
        }

        this.#frames.push(
          Buffer.from(
            this.#buffer.subarray(CONTROL_FRAME_PREFIX_BYTES, frameLength),
          ),
        );
        this.#frameCount += 1;
        this.#buffer = Buffer.from(this.#buffer.subarray(frameLength));
      }
    } catch (error) {
      this.#failed = true;
      throw error;
    }
  }

  finish() {
    if (this.#finished) {
      refuse("decoder_finished", `${this.label} received EOF twice`);
    }
    this.#finished = true;
    if (this.#failed) {
      refuse(
        "decoder_failed",
        `${this.label} cannot accept EOF after a protocol error`,
      );
    }

    if (this.#buffer.length > 0) {
      if (this.#buffer.length < CONTROL_FRAME_PREFIX_BYTES) {
        refuse(
          "truncated_frame_prefix",
          `${this.label} ended inside a frame prefix`,
        );
      }
      refuse(
        "truncated_frame_payload",
        `${this.label} ended inside a frame payload`,
      );
    }
    if (this.#frameCount < this.minFrames) {
      refuse(
        "too_few_frames",
        `${this.label} contains fewer than ${this.minFrames} frames`,
      );
    }

    return Object.freeze({
      frames: Object.freeze(this.#frames.map((frame) => Buffer.from(frame))),
      frameCount: this.#frameCount,
      totalBytes: this.#totalBytes,
    });
  }
}

export function decodeLengthFrames(
  carrier,
  {
    maxPayloadBytes,
    totalCapBytes,
    minFrames = 1,
    maxFrames = 1,
    label = "framed stream",
  },
) {
  const decoder = new LengthFrameDecoder({
    maxPayloadBytes,
    totalCapBytes,
    minFrames,
    maxFrames,
    label,
  });
  decoder.push(carrier);
  return decoder.finish().frames;
}

export function encodeControlFrame(
  value,
  expectedKeys,
  { maxPayloadBytes, label = "control frame" },
) {
  const payload = canonicalJsonBytes(value, expectedKeys, {
    trailingLf: false,
    label: `${label} payload`,
  });
  return encodeLengthFrame(payload, { maxPayloadBytes, label });
}

export function parseControlFrame(
  carrier,
  expectedKeys,
  { maxPayloadBytes, label = "control frame" },
) {
  const bytes = asBytes(carrier, label);
  const [payload] = decodeLengthFrames(bytes, {
    maxPayloadBytes,
    totalCapBytes: CONTROL_FRAME_PREFIX_BYTES + maxPayloadBytes,
    minFrames: 1,
    maxFrames: 1,
    label,
  });
  const value = parseCanonicalJsonBytes(payload, expectedKeys, {
    trailingLf: false,
    label: `${label} payload`,
  });
  return Object.freeze({
    value,
    payload: Buffer.from(payload),
    frameSha256: sha256Hex(bytes),
  });
}

function assertCaseId(caseId, label = "case_id") {
  if (typeof caseId !== "string" || !CASE_ID.test(caseId)) {
    refuse("invalid_case_id", `${label} is not a Stage 2 case ID`);
  }
}

function caseNumber(caseId) {
  return Number.parseInt(caseId.slice(-2), 10);
}

function assertAssertionId(assertionId, caseId, label = "assertion_id") {
  if (
    typeof assertionId !== "string" ||
    !ASSERTION_ID.test(assertionId) ||
    !assertionId.startsWith(`${caseId}/`)
  ) {
    refuse(
      "invalid_assertion_id",
      `${label} is not bound to the expected case`,
    );
  }
}

function unsignedByteCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function validateAssertionManifestCase(
  records,
  caseId,
) {
  if (
    !Array.isArray(records) ||
    records.length === 0 ||
    records.length > STRUCTURED_EVENT_MAX_EVENTS
  ) {
    refuse(
      "invalid_assertion_manifest_case",
      "assertion manifest case must contain 1..10000 records",
    );
  }
  const assertionIds = [];
  const childAssertionIds = [];
  const oracleAssertionIds = [];
  for (const [index, record] of records.entries()) {
    assertExpectedKeys(
      record,
      ASSERTION_MANIFEST_RECORD_KEYS,
      `assertion manifest record ${index + 1}`,
    );
    assertCanonicalJsonValue(
      record,
      `assertion manifest record ${index + 1}`,
    );
    assertAssertionId(
      record.assertion_id,
      caseId,
      "assertion manifest assertion_id",
    );
    if (!ASSERTION_MANIFEST_SOURCES.includes(record.source)) {
      refuse(
        "unknown_assertion_source",
        "assertion manifest record has an unknown source",
      );
    }
    assertionIds.push(record.assertion_id);
    if (record.source === "child_event") {
      childAssertionIds.push(record.assertion_id);
    } else {
      oracleAssertionIds.push(record.assertion_id);
    }
  }

  if (new Set(assertionIds).size !== assertionIds.length) {
    refuse(
      "duplicate_manifest_assertion",
      "assertion manifest case contains a duplicate ID",
    );
  }
  const sorted = [...assertionIds].sort(unsignedByteCompare);
  if (sorted.some((assertionId, index) => assertionId !== assertionIds[index])) {
    refuse(
      "unordered_manifest_assertions",
      "assertion manifest case is not in unsigned-byte order",
    );
  }

  if (childAssertionIds.length === 0) {
    refuse(
      "missing_child_assertion",
      "assertion manifest case has no child_event record",
    );
  }
  const oracleCase = caseId === "S2-AC-01" || caseId === "S2-AC-17";
  if (oracleCase && oracleAssertionIds.length === 0) {
    refuse(
      "missing_oracle_assertion",
      "oracle case has no host_control_oracle_bundle record",
    );
  }
  if (!oracleCase && oracleAssertionIds.length !== 0) {
    refuse(
      "oracle_source_forbidden",
      "non-oracle case contains a host_control_oracle_bundle record",
    );
  }

  const actualAssertionIdsSha256 = sha256Hex(
    Buffer.from(serializeCanonicalJsonValue(assertionIds), "ascii"),
  );

  return Object.freeze({
    assertionCount: records.length,
    assertionIds: Object.freeze(assertionIds),
    assertionIdsSha256: actualAssertionIdsSha256,
    childAssertionIds: Object.freeze(childAssertionIds),
    oracleAssertionIds: Object.freeze(oracleAssertionIds),
  });
}

function validateAssertionManifest(manifest) {
  assertExpectedKeys(
    manifest,
    ASSERTION_MANIFEST_KEYS,
    "assertion manifest",
  );
  assertCanonicalJsonValue(manifest, "assertion manifest");
  if (manifest.domain !== "stage2-assertion-manifest-v1") {
    refuse(
      "unexpected_assertion_manifest_domain",
      "assertion manifest domain does not match the frozen contract",
    );
  }
  assertExpectedKeys(
    manifest.cases,
    ACCEPTANCE_CASE_IDS,
    "assertion manifest cases",
  );
  for (const caseId of ACCEPTANCE_CASE_IDS) {
    validateAssertionManifestCase(manifest.cases[caseId], caseId);
  }
  return manifest;
}

export function authenticateFrozenAssertionManifest(
  assertionManifestBytes,
) {
  const bytes = asBytes(
    assertionManifestBytes,
    "assertion manifest bytes",
  );
  if (sha256Hex(bytes) !== FROZEN_ASSERTION_MANIFEST_SHA256) {
    refuse(
      "assertion_manifest_hash_mismatch",
      "assertion manifest bytes do not match the frozen SHA-256",
    );
  }
  const manifest = parseCanonicalJsonBytes(bytes, ASSERTION_MANIFEST_KEYS, {
    trailingLf: true,
    label: "assertion manifest",
  });
  return deepFreezeJson(validateAssertionManifest(manifest));
}

function readStructuredEventValidationOptions(options) {
  const requiredKeys = [
    "caseId",
    "assertionManifestBytes",
    "expectedAssertionManifestSha256",
  ];
  const optionalKeys = [
    "expectedAssertionCount",
    "expectedAssertionIdsSha256",
  ];
  const allowedKeys = [...requiredKeys, ...optionalKeys];
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    refuse(
      "invalid_object",
      "structured-event validation options must be a plain object",
    );
  }

  const expectedKeys = allowedKeys.filter(
    (key) => requiredKeys.includes(key) || Object.hasOwn(options, key),
  );
  const keys = Object.keys(options);
  const ownKeys = Reflect.ownKeys(options);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    ownKeys.length !== keys.length ||
    ownKeys.some(
      (key, index) =>
        typeof key !== "string" || key !== keys[index],
    )
  ) {
    refuse(
      "invalid_keys",
      "structured-event validation option keys do not match the contract",
    );
  }

  const values = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      refuse(
        "noncanonical_property",
        `structured-event validation option ${key} must be a data property`,
      );
    }
    values[key] = descriptor.value;
  }
  return values;
}

function validateStructuredEvent(event, expectedCaseId) {
  assertExpectedKeys(event, STRUCTURED_EVENT_KEYS, "structured event");
  assertCanonicalJsonValue(event, "structured event");
  if (event.case_id !== expectedCaseId) {
    refuse("foreign_case_event", "structured event has a foreign case_id");
  }
  assertAssertionId(event.assertion_id, expectedCaseId);
  if (!STRUCTURED_EVENT_STATUSES.includes(event.status)) {
    refuse("unknown_event_status", "structured event status is unknown");
  }
}

export function encodeStructuredEvent(event) {
  assertCaseId(event?.case_id);
  validateStructuredEvent(event, event.case_id);
  const payload = canonicalJsonBytes(event, STRUCTURED_EVENT_KEYS, {
    trailingLf: false,
    label: "structured event",
  });
  return encodeLengthFrame(payload, {
    maxPayloadBytes: STRUCTURED_EVENT_MAX_PAYLOAD_BYTES,
    label: "structured event",
  });
}

export function validateStructuredChildEvents(
  carrier,
  options,
) {
  const {
    caseId,
    assertionManifestBytes,
    expectedAssertionManifestSha256,
    expectedAssertionCount,
    expectedAssertionIdsSha256,
  } = readStructuredEventValidationOptions(options);
  assertCaseId(caseId);
  assertSha256(
    expectedAssertionManifestSha256,
    "expectedAssertionManifestSha256",
  );
  if (
    expectedAssertionManifestSha256 !==
    FROZEN_ASSERTION_MANIFEST_SHA256
  ) {
    refuse(
      "unexpected_assertion_manifest_sha256",
      "expected assertion-manifest SHA-256 is not the frozen accepted value",
    );
  }
  const assertionManifest = authenticateFrozenAssertionManifest(
    assertionManifestBytes,
  );
  const manifestCase = validateAssertionManifestCase(
    assertionManifest.cases[caseId],
    caseId,
  );
  if (expectedAssertionCount !== undefined) {
    assertPositiveSafeInteger(
      expectedAssertionCount,
      "expectedAssertionCount",
    );
    if (expectedAssertionCount !== manifestCase.assertionCount) {
      refuse(
        "assertion_count_mismatch",
        "evidence assertion count does not match the frozen manifest case",
      );
    }
  }
  if (expectedAssertionIdsSha256 !== undefined) {
    assertSha256(
      expectedAssertionIdsSha256,
      "expectedAssertionIdsSha256",
    );
    if (
      expectedAssertionIdsSha256 !== manifestCase.assertionIdsSha256
    ) {
      refuse(
        "assertion_ids_hash_mismatch",
        "evidence assertion IDs hash does not match the frozen manifest case",
      );
    }
  }

  const payloads = decodeLengthFrames(carrier, {
    maxPayloadBytes: STRUCTURED_EVENT_MAX_PAYLOAD_BYTES,
    totalCapBytes: STRUCTURED_EVENT_TOTAL_CAP_BYTES,
    minFrames: 1,
    maxFrames: STRUCTURED_EVENT_MAX_EVENTS,
    label: "structured event stream",
  });
  const expected = new Set(manifestCase.childAssertionIds);
  const oracleOwned = new Set(manifestCase.oracleAssertionIds);
  const observed = new Set();
  const events = [];

  for (const [index, payload] of payloads.entries()) {
    const event = parseCanonicalJsonBytes(payload, STRUCTURED_EVENT_KEYS, {
      trailingLf: false,
      label: `structured event ${index + 1}`,
    });
    validateStructuredEvent(event, caseId);

    if (oracleOwned.has(event.assertion_id)) {
      refuse(
        "oracle_assertion_from_child",
        "child emitted an oracle-owned assertion ID",
      );
    }
    if (!expected.has(event.assertion_id)) {
      refuse(
        "unexpected_assertion",
        "structured event contains an unexpected assertion ID",
      );
    }
    if (observed.has(event.assertion_id)) {
      refuse(
        "duplicate_assertion",
        "structured event contains a duplicate assertion ID",
      );
    }
    if (event.status !== "PASS") {
      refuse(
        "nonpass_assertion",
        "structured event contains a non-PASS terminal status",
      );
    }

    observed.add(event.assertion_id);
    events.push(Object.freeze({ ...event }));
  }

  if (observed.size !== expected.size) {
    refuse(
      "missing_assertion",
      "structured event stream is missing an expected assertion ID",
    );
  }

  return Object.freeze({
    events: Object.freeze(events),
    assertionManifestSha256: FROZEN_ASSERTION_MANIFEST_SHA256,
    assertionCount: manifestCase.assertionCount,
    assertionIds: manifestCase.assertionIds,
    assertionIdsSha256: manifestCase.assertionIdsSha256,
    childAssertionCount: manifestCase.childAssertionIds.length,
    childAssertionIds: manifestCase.childAssertionIds,
    oracleAssertionCount: manifestCase.oracleAssertionIds.length,
    oracleAssertionIds: manifestCase.oracleAssertionIds,
    nonpassAssertionCount: 0,
  });
}

function uint64be(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    refuse("invalid_uint64_length", `${label} is not a safe byte length`);
  }
  const encoded = Buffer.alloc(8);
  encoded.writeBigUInt64BE(BigInt(value), 0);
  return encoded;
}

export function commandOutputPreimage(stdout, stderr) {
  const stdoutBytes = asBytes(stdout, "stdout");
  const stderrBytes = asBytes(stderr, "stderr");
  return Buffer.concat([
    Buffer.from(COMMAND_OUTPUT_DOMAIN, "ascii"),
    Buffer.from([0]),
    uint64be(stdoutBytes.length, "stdout length"),
    stdoutBytes,
    uint64be(stderrBytes.length, "stderr length"),
    stderrBytes,
  ]);
}

export function commandOutputSha256(stdout, stderr) {
  return sha256Hex(commandOutputPreimage(stdout, stderr));
}

export function assertCommandOutputSha256(stdout, stderr, expectedSha256) {
  assertSha256(expectedSha256, "expected output_sha256");
  const actual = commandOutputSha256(stdout, stderr);
  if (actual !== expectedSha256) {
    refuse(
      "command_output_hash_mismatch",
      "command output does not match output_sha256",
    );
  }
  return actual;
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !LOWER_SHA256.test(value)) {
    refuse("invalid_sha256", `${label} must be 64 lowercase hexadecimal`);
  }
}

function assertRunBindingRecord(record) {
  assertExpectedKeys(record, RUN_BINDING_KEYS, "run binding");
  assertCanonicalJsonValue(record, "run binding");
  assertCaseId(record.case_id);

  for (const key of RUN_BINDING_HASH_KEYS) {
    assertSha256(record[key], key);
  }
  if (
    typeof record.git_commit !== "string" ||
    !LOWER_GIT_COMMIT.test(record.git_commit)
  ) {
    refuse(
      "invalid_git_commit",
      "git_commit must be 40 lowercase hexadecimal",
    );
  }

  const number = caseNumber(record.case_id);
  const expectedPlatform = number === 17 ? "darwin" : "linux";
  if (record.platform !== expectedPlatform) {
    refuse(
      "platform_case_mismatch",
      "platform does not match the frozen case partition",
    );
  }

  const requiresOracle = number === 1 || number === 17;
  if (requiresOracle) {
    assertSha256(
      record.host_control_oracle_bundle_sha256,
      "host_control_oracle_bundle_sha256",
    );
  } else if (record.host_control_oracle_bundle_sha256 !== null) {
    refuse(
      "unexpected_oracle_hash",
      "host_control_oracle_bundle_sha256 must be null for this case",
    );
  }

  assertPrintableAscii(record.command, "command", { allowEmpty: false });
  assertPositiveSafeInteger(record.timeout_seconds, "timeout_seconds");
}

function assertAcceptanceRegistryCase(registryCase) {
  assertExpectedKeys(
    registryCase,
    ACCEPTANCE_REGISTRY_CASE_KEYS,
    "acceptance registry case",
  );
  assertCaseId(registryCase.id, "acceptance registry case id");

  const expectedPlatform =
    caseNumber(registryCase.id) === 17 ? "darwin" : "linux";
  if (registryCase.platform !== expectedPlatform) {
    refuse(
      "registry_platform_case_mismatch",
      "registry platform does not match the frozen case partition",
    );
  }
  for (const key of ["owner", "tier", "command", "evidence_path"]) {
    assertPrintableAscii(registryCase[key], `acceptance registry case ${key}`, {
      allowEmpty: false,
    });
  }
  if (
    typeof registryCase.oracle !== "string" ||
    registryCase.oracle.length === 0
  ) {
    refuse(
      "invalid_registry_oracle",
      "acceptance registry case oracle must be a nonempty string",
    );
  }
  assertPositiveSafeInteger(
    registryCase.timeout_seconds,
    "acceptance registry case timeout_seconds",
  );
}

function validateAcceptanceRegistry(registry) {
  assertExpectedKeys(
    registry,
    ACCEPTANCE_REGISTRY_KEYS,
    "acceptance registry",
  );
  if (
    registry.contract_version !==
      "youtube-item-recovery-stage2-acceptance-v2" ||
    registry.migration_filename !==
      "028_youtube_browser_transcript.sql" ||
    registry.status !== "required_before_stage2_implementation_go" ||
    registry.failpoint_registry_fixed_name_count !== 145
  ) {
    refuse(
      "unexpected_registry_identity",
      "acceptance registry identity fields do not match the frozen contract",
    );
  }
  assertSha256(
    registry.failpoint_registry_sha256,
    "acceptance registry failpoint_registry_sha256",
  );

  if (
    !Array.isArray(registry.evidence_manifest_required_fields) ||
    registry.evidence_manifest_required_fields.length === 0 ||
    new Set(registry.evidence_manifest_required_fields).size !==
      registry.evidence_manifest_required_fields.length
  ) {
    refuse(
      "invalid_registry_evidence_fields",
      "acceptance registry evidence fields are missing or duplicated",
    );
  }
  for (const field of registry.evidence_manifest_required_fields) {
    assertPrintableAscii(field, "acceptance registry evidence field", {
      allowEmpty: false,
    });
  }

  if (
    !Array.isArray(registry.cases) ||
    registry.cases.length !== ACCEPTANCE_CASE_IDS.length
  ) {
    refuse(
      "invalid_registry_cases",
      "acceptance registry must contain exactly 17 cases",
    );
  }
  for (const [index, registryCase] of registry.cases.entries()) {
    assertAcceptanceRegistryCase(registryCase);
    const expectedCaseId = ACCEPTANCE_CASE_IDS[index];
    if (registryCase.id !== expectedCaseId) {
      refuse(
        "invalid_registry_case_order",
        "acceptance registry cases are missing, duplicated, or reordered",
      );
    }
    if (
      !registryCase.command.includes(`--platform ${registryCase.platform} `) ||
      !registryCase.command.includes(`--case ${registryCase.id} --`) ||
      !registryCase.evidence_path.endsWith(
        `/platforms/${registryCase.platform}/${registryCase.id}.json`,
      )
    ) {
      refuse(
        "invalid_registry_case_binding",
        "acceptance registry case command or evidence path is not self-bound",
      );
    }
  }
  return registry;
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      refuse(
        "noncanonical_property",
        "authenticated registry contains a non-data property",
      );
    }
    deepFreezeJson(descriptor.value);
  }
  return Object.freeze(value);
}

export function authenticateFrozenAcceptanceRegistry(registryBytes) {
  const bytes = asBytes(registryBytes, "acceptance registry bytes");
  if (sha256Hex(bytes) !== FROZEN_ACCEPTANCE_REGISTRY_SHA256) {
    refuse(
      "registry_hash_mismatch",
      "acceptance registry bytes do not match the frozen SHA-256",
    );
  }
  const registry = parseFrozenRegistryJsonBytes(bytes);
  return deepFreezeJson(validateAcceptanceRegistry(registry));
}

/**
 * Deterministically project the exact run-binding fields from a larger,
 * already validated evidence record. This is the safe bridge from the
 * evidence-manifest key order to the distinct run-binding key order.
 */
export function projectRunBindingRecord(source) {
  if (
    source === null ||
    typeof source !== "object" ||
    Array.isArray(source) ||
    Object.getPrototypeOf(source) !== Object.prototype
  ) {
    refuse("invalid_object", "run-binding source must be a plain object");
  }

  const record = {};
  for (const key of RUN_BINDING_KEYS) {
    if (!Object.hasOwn(source, key)) {
      refuse(
        "missing_run_binding_field",
        "run-binding source is missing a required field",
      );
    }
    record[key] = source[key];
  }
  assertRunBindingRecord(record);
  return Object.freeze(record);
}

function assertRunBindingMatchesRegistryCase(record, registryCase) {
  assertRunBindingRecord(record);
  assertAcceptanceRegistryCase(registryCase);

  if (
    record.case_id !== registryCase.id ||
    record.platform !== registryCase.platform ||
    record.command !== registryCase.command ||
    record.timeout_seconds !== registryCase.timeout_seconds
  ) {
    refuse(
      "run_binding_registry_mismatch",
      "run binding does not match its frozen acceptance-registry case",
    );
  }
  return record;
}

export function canonicalRunBindingPayload(record) {
  assertRunBindingRecord(record);
  return canonicalJsonBytes(record, RUN_BINDING_KEYS, {
    trailingLf: false,
    label: "run binding",
  });
}

export function parseRunBindingPayload(input) {
  const record = parseCanonicalJsonBytes(input, RUN_BINDING_KEYS, {
    trailingLf: false,
    label: "run binding",
  });
  assertRunBindingRecord(record);
  return record;
}

export function runBindingPreimage(record) {
  return Buffer.concat([
    Buffer.from(RUN_BINDING_DOMAIN, "ascii"),
    Buffer.from([0]),
    canonicalRunBindingPayload(record),
  ]);
}

export function runBindingSha256(record) {
  return sha256Hex(runBindingPreimage(record));
}

export function assertRunBindingSha256(record, expectedSha256) {
  assertSha256(expectedSha256, "expected run_binding_sha256");
  const actual = runBindingSha256(record);
  if (actual !== expectedSha256) {
    refuse(
      "run_binding_hash_mismatch",
      "run binding does not match run_binding_sha256",
    );
  }
  return actual;
}

export function registryBoundRunBindingSha256(source, options) {
  assertExpectedKeys(
    options,
    ["registryBytes", "expectedRegistrySha256"],
    "registry-bound run-binding options",
  );
  const { registryBytes, expectedRegistrySha256 } = options;
  assertSha256(expectedRegistrySha256, "expectedRegistrySha256");
  if (expectedRegistrySha256 !== FROZEN_ACCEPTANCE_REGISTRY_SHA256) {
    refuse(
      "unexpected_registry_sha256",
      "expected registry SHA-256 is not the frozen accepted value",
    );
  }

  const registry = authenticateFrozenAcceptanceRegistry(registryBytes);
  const record = projectRunBindingRecord(source);
  if (record.registry_sha256 !== FROZEN_ACCEPTANCE_REGISTRY_SHA256) {
    refuse(
      "run_binding_registry_hash_mismatch",
      "run binding registry_sha256 does not match the frozen registry",
    );
  }
  const registryCase = registry.cases.find(
    (candidate) => candidate.id === record.case_id,
  );
  if (!registryCase) {
    refuse(
      "registry_case_missing",
      "run binding case is absent from the authenticated registry",
    );
  }
  assertRunBindingMatchesRegistryCase(record, registryCase);
  return runBindingSha256(record);
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(asBytes(bytes, "SHA-256 input")).digest(
    "hex",
  );
}
