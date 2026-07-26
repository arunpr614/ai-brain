#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GENERATOR_PATH =
  "docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/verify-stage2-control-frame-boundary-fixtures.mjs";
export const STATE_REGISTRY_PATH =
  "docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-control-frame-state-registry-v1.json";
export const INDEX_PATH =
  "docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-control-frame-boundary-fixtures-v1.json";
export const FIXTURE_DIRECTORY =
  "docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/control-frame-boundary-v1";

const INDEX_DOMAIN = "stage2-control-frame-boundary-fixture-index-v1";
const FIXTURE_DOMAIN = "stage2-control-frame-boundary-fixture-v1";
const CLASS_SET_DOMAIN = "stage2-control-frame-cap-class-set-v1";
const BODY_OCTET_HEX = "41";
const ALLOWED_CARRIER_TRANSPORTS = new Map([
  ["bounded_pipe_frame", "bounded_pipe"],
  ["durable_file_bytes", "durable_file"],
  ["nested_envelope_bytes", "nested_json"],
  ["raw_pipe_bytes", "raw_pipe"],
]);
const ALLOWED_SERIALIZATION_SCOPES = new Set([
  "canonical_json_one_lf\u0000canonical_bytes_including_lf",
  "compact_json_no_lf\u0000payload_without_prefix",
  "compact_json_no_lf\u0000raw_bytes",
]);
const SIGNED_SCHEMA_DOMAINS = new Set([
  "stage2-aggregate-scratch-destruction-receipt-v1",
  "stage2-host-supervisor-run-request-v1",
  "stage2-launcher-host-attestation-v1",
  "stage2-linux-scratch-broker-destroy-request-v1",
  "stage2-package-admission-v1",
  "stage2-platform-gate-admission-v1",
  "stage2-platform-gate-phase-ack-v1",
]);
const EXPECTED_SIGNED_SELECTORS = Object.freeze([
  Object.freeze([
    "aggregate_receipt.aggregator_to_durable_store.durable_receipt",
    "linux",
    "stage2-aggregate-scratch-destruction-receipt-v1",
  ]),
  Object.freeze([
    "aggregate_receipt.launcher_to_aggregator.signed_receipt_frame",
    "linux",
    "stage2-aggregate-scratch-destruction-receipt-v1",
  ]),
  Object.freeze([
    "controller_supervisor.controller_to_supervisor.signed_request",
    "darwin",
    "stage2-host-supervisor-run-request-v1",
  ]),
  Object.freeze([
    "controller_supervisor.controller_to_supervisor.signed_request",
    "linux",
    "stage2-host-supervisor-run-request-v1",
  ]),
  Object.freeze([
    "host_attestation.keystore_to_bootstrap.host_attestation",
    "darwin",
    "stage2-launcher-host-attestation-v1",
  ]),
  Object.freeze([
    "host_attestation.keystore_to_bootstrap.host_attestation",
    "linux",
    "stage2-launcher-host-attestation-v1",
  ]),
  Object.freeze([
    "package_admission.launcher_to_durable_store.durable_admission",
    "linux",
    "stage2-package-admission-v1",
  ]),
  Object.freeze([
    "platform_admission.launcher_to_durable_store.durable_admission",
    "darwin",
    "stage2-platform-gate-admission-v1",
  ]),
  Object.freeze([
    "platform_admission.launcher_to_durable_store.durable_admission",
    "linux",
    "stage2-platform-gate-admission-v1",
  ]),
  Object.freeze([
    "platform_gate.launcher_to_gate.phase_ack",
    "darwin",
    "stage2-platform-gate-phase-ack-v1",
  ]),
  Object.freeze([
    "platform_gate.launcher_to_gate.phase_ack",
    "linux",
    "stage2-platform-gate-phase-ack-v1",
  ]),
  Object.freeze([
    "scratch_broker.launcher_to_broker.signed_destroy_request",
    "linux",
    "stage2-linux-scratch-broker-destroy-request-v1",
  ]),
]);
const EXPECTED_TUPLES = Object.freeze([
  Object.freeze({
    payload_cap: 4096,
    serialization: "compact_json_no_lf",
    cap_scope: "payload_without_prefix",
    frame_prefix_bytes: 4,
  }),
  Object.freeze({
    payload_cap: 16384,
    serialization: "compact_json_no_lf",
    cap_scope: "payload_without_prefix",
    frame_prefix_bytes: 4,
  }),
  Object.freeze({
    payload_cap: 65536,
    serialization: "compact_json_no_lf",
    cap_scope: "payload_without_prefix",
    frame_prefix_bytes: 4,
  }),
  Object.freeze({
    payload_cap: 131072,
    serialization: "compact_json_no_lf",
    cap_scope: "payload_without_prefix",
    frame_prefix_bytes: 4,
  }),
  Object.freeze({
    payload_cap: 131072,
    serialization: "compact_json_no_lf",
    cap_scope: "raw_bytes",
    frame_prefix_bytes: 0,
  }),
  Object.freeze({
    payload_cap: 262144,
    serialization: "canonical_json_one_lf",
    cap_scope: "canonical_bytes_including_lf",
    frame_prefix_bytes: 0,
  }),
  Object.freeze({
    payload_cap: 262144,
    serialization: "canonical_json_one_lf",
    cap_scope: "canonical_bytes_including_lf",
    frame_prefix_bytes: 4,
  }),
  Object.freeze({
    payload_cap: 262144,
    serialization: "compact_json_no_lf",
    cap_scope: "payload_without_prefix",
    frame_prefix_bytes: 4,
  }),
]);

const STATE_REGISTRY_KEYS = [
  "domain",
  "record_count",
  "records",
  "exclusions",
  "collapse_rules",
];
const STATE_RECORD_KEYS = [
  "frame_id",
  "platform",
  "protocol",
  "direction",
  "state",
  "carrier_kind",
  "transport",
  "schema_domain",
  "frame_class",
  "semantic_payload_cap",
  "serialization",
  "cap_scope",
  "frame_prefix_bytes",
  "rights_count",
  "signature_profile",
];
const STATE_RECORD_SORT_KEYS = [
  "frame_id",
  "platform",
  "state",
  "schema_domain",
  "frame_class",
  "transport",
  "serialization",
  "cap_scope",
  "carrier_kind",
  "protocol",
  "direction",
  "semantic_payload_cap",
  "frame_prefix_bytes",
  "rights_count",
  "signature_profile",
];
const INDEX_KEYS = [
  "domain",
  "generator_path",
  "generator_sha256",
  "state_registry_path",
  "state_registry_sha256",
  "classes",
  "class_set_sha256",
  "tuple_count",
  "tuples",
];
const TUPLE_KEYS = [
  "payload_cap",
  "serialization",
  "cap_scope",
  "frame_prefix_bytes",
  "equality_fixture_path",
  "equality_fixture_sha256",
  "equality_carrier_length",
  "equality_carrier_sha256",
  "plus_one_fixture_path",
  "plus_one_fixture_sha256",
  "plus_one_carrier_length",
  "plus_one_carrier_sha256",
];
const FIXTURE_KEYS = [
  "domain",
  "payload_cap",
  "serialization",
  "cap_scope",
  "frame_prefix_bytes",
  "relation",
  "body_length",
  "body_octet_hex",
  "body_sha256",
  "carrier_length",
  "carrier_sha256",
];

export const CLASSES = Object.freeze([
  Object.freeze({
    frame_class: "launcher_request_release",
    payload_cap: 4096,
  }),
  Object.freeze({
    frame_class: "bounded_control_4k",
    payload_cap: 4096,
  }),
  Object.freeze({
    frame_class: "launcher_exec_ready",
    payload_cap: 16384,
  }),
  Object.freeze({
    frame_class: "bounded_control_16k",
    payload_cap: 16384,
  }),
  Object.freeze({
    frame_class: "local_channel_init",
    payload_cap: 65536,
  }),
  Object.freeze({
    frame_class: "launcher_commitment",
    payload_cap: 65536,
  }),
  Object.freeze({
    frame_class: "broker_control_or_session",
    payload_cap: 131072,
  }),
  Object.freeze({
    frame_class: "keystore_service_control_or_result",
    payload_cap: 131072,
  }),
  Object.freeze({
    frame_class: "cgroup_or_oracle_service_control",
    payload_cap: 131072,
  }),
  Object.freeze({
    frame_class: "launch_offer_or_signed_request_or_bootstrap",
    payload_cap: 262144,
  }),
  Object.freeze({
    frame_class: "activation_or_launcher_context",
    payload_cap: 262144,
  }),
  Object.freeze({
    frame_class: "signed_admission_or_receipt",
    payload_cap: 262144,
  }),
  Object.freeze({
    frame_class: "final_supervisor_acceptance",
    payload_cap: 262144,
  }),
]);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compactJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function exactKeys(value, expected, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(expected)
  ) {
    fail(`${label}: key order or membership mismatch`);
  }
}

function parseCanonicalJson(bytes, label) {
  if (
    bytes.length < 2 ||
    bytes[bytes.length - 1] !== 0x0a ||
    bytes[bytes.length - 2] === 0x0a
  ) {
    fail(`${label}: expected exactly one final LF`);
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.subarray(0, bytes.length - 1).toString("utf8"));
  } catch {
    fail(`${label}: invalid JSON`);
  }
  if (!compactJsonBytes(parsed).equals(bytes)) {
    fail(`${label}: JSON is not exact compact canonical JSON plus one LF`);
  }
  return parsed;
}

function unsignedByteCompare(left, right) {
  return Buffer.compare(
    Buffer.from(String(left), "utf8"),
    Buffer.from(String(right), "utf8"),
  );
}

function compareRecords(left, right, keys) {
  for (const key of keys) {
    const leftValue = left[key];
    const rightValue = right[key];
    const comparison =
      typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : unsignedByteCompare(leftValue, rightValue);
    if (comparison !== 0) {
      return comparison < 0 ? -1 : 1;
    }
  }
  return 0;
}

function assertSafeInteger(value, minimum, maximum, label) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(`${label}: expected safe integer in ${minimum}..${maximum}`);
  }
}

function assertToken(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(value)
  ) {
    fail(`${label}: invalid token`);
  }
}

function classSetSha256() {
  return sha256(
    Buffer.concat([
      Buffer.from(CLASS_SET_DOMAIN, "ascii"),
      Buffer.from([0]),
      Buffer.from(JSON.stringify(CLASSES), "utf8"),
    ]),
  );
}

async function assertOrdinaryFile(filePath, label) {
  let identity;
  try {
    identity = await lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`${label}: missing`);
    }
    throw error;
  }
  if (!identity.isFile() || identity.isSymbolicLink()) {
    fail(`${label}: expected nonsymlink ordinary file`);
  }
}

function ancillaryCapacity(record) {
  if (record.transport === "linux_seqpacket") {
    return 16 + Math.ceil((4 * record.rights_count) / 8) * 8;
  }
  if (record.transport === "darwin_stream") {
    return 12 + Math.ceil((4 * record.rights_count) / 4) * 4;
  }
  return 0;
}

function validateStateRegistry(registry) {
  exactKeys(registry, STATE_REGISTRY_KEYS, "state registry");
  if (registry.domain !== "stage2-control-frame-state-registry-v1") {
    fail("state registry: wrong domain");
  }
  if (!Array.isArray(registry.records) || registry.records.length !== 93) {
    fail("state registry: expected exactly 93 records");
  }
  if (registry.record_count !== registry.records.length) {
    fail("state registry: record_count mismatch");
  }
  const platformCounts = { linux: 0, darwin: 0 };
  const identifiers = new Set();
  const classMap = new Map(
    CLASSES.map(({ frame_class, payload_cap }) => [frame_class, payload_cap]),
  );
  const frameGroups = new Map();
  for (const [index, record] of registry.records.entries()) {
    exactKeys(record, STATE_RECORD_KEYS, `state registry record ${index}`);
    for (const key of [
      "frame_id",
      "protocol",
      "direction",
      "state",
      "carrier_kind",
      "transport",
      "schema_domain",
      "frame_class",
      "serialization",
      "cap_scope",
      "signature_profile",
    ]) {
      assertToken(record[key], `state registry record ${index}.${key}`);
    }
    if (!(record.platform in platformCounts)) {
      fail(`state registry record ${index}: invalid platform`);
    }
    platformCounts[record.platform] += 1;
    if (!classMap.has(record.frame_class)) {
      fail(`state registry record ${index}: unknown frame class`);
    }
    if (
      !ALLOWED_SERIALIZATION_SCOPES.has(
        `${record.serialization}\u0000${record.cap_scope}`,
      )
    ) {
      fail(`state registry record ${index}: invalid serialization/cap scope`);
    }
    if (
      record.signature_profile !==
        (SIGNED_SCHEMA_DOMAINS.has(record.schema_domain)
          ? "fixture_ed25519_top_level_envelope"
          : "none")
    ) {
      fail(`state registry record ${index}: signature profile/domain mismatch`);
    }
    if (record.carrier_kind === "socket_frame") {
      const expectedTransport =
        record.platform === "linux" ? "linux_seqpacket" : "darwin_stream";
      if (record.transport !== expectedTransport) {
        fail(`state registry record ${index}: socket platform/transport mismatch`);
      }
    } else if (
      ALLOWED_CARRIER_TRANSPORTS.get(record.carrier_kind) !== record.transport
    ) {
      fail(`state registry record ${index}: carrier/transport mismatch`);
    }
    assertSafeInteger(
      record.semantic_payload_cap,
      1,
      classMap.get(record.frame_class),
      `state registry record ${index}.semantic_payload_cap`,
    );
    if (![0, 4].includes(record.frame_prefix_bytes)) {
      fail(`state registry record ${index}: invalid frame prefix`);
    }
    const expectedPrefix =
      record.carrier_kind === "socket_frame" ||
      record.carrier_kind === "bounded_pipe_frame"
        ? 4
        : 0;
    if (record.frame_prefix_bytes !== expectedPrefix) {
      fail(`state registry record ${index}: carrier/prefix mismatch`);
    }
    assertSafeInteger(
      record.rights_count,
      0,
      15,
      `state registry record ${index}.rights_count`,
    );
    if (record.carrier_kind !== "socket_frame" && record.rights_count !== 0) {
      fail(`state registry record ${index}: rights on non-socket carrier`);
    }
    assertSafeInteger(
      ancillaryCapacity(record),
      0,
      record.transport === "linux_seqpacket" ? 80 : 72,
      `state registry record ${index}.ancillary_capacity`,
    );
    const groupKey = JSON.stringify([
      record.platform,
      record.protocol,
      record.direction,
      record.state,
    ]);
    const group = frameGroups.get(groupKey) ?? [];
    group.push(record);
    frameGroups.set(groupKey, group);
    const identifier = JSON.stringify([
      record.frame_id,
      record.platform,
      record.state,
    ]);
    if (identifiers.has(identifier)) {
      fail(`state registry record ${index}: duplicate frame identity`);
    }
    identifiers.add(identifier);
    if (
      index > 0 &&
      compareRecords(
        registry.records[index - 1],
        record,
        STATE_RECORD_SORT_KEYS,
      ) >= 0
    ) {
      fail(`state registry record ${index}: noncanonical order`);
    }
  }
  if (platformCounts.linux !== 62 || platformCounts.darwin !== 31) {
    fail("state registry: expected 62 Linux and 31 Darwin records");
  }
  const signedSelectors = registry.records
    .filter(
      ({ signature_profile: signatureProfile }) =>
        signatureProfile === "fixture_ed25519_top_level_envelope",
    )
    .map(({ frame_id: frameId, platform, schema_domain: schemaDomain }) => [
      frameId,
      platform,
      schemaDomain,
    ]);
  if (
    JSON.stringify(signedSelectors) !==
    JSON.stringify(EXPECTED_SIGNED_SELECTORS)
  ) {
    fail("state registry: exact 12-record signed selector set/order mismatch");
  }
  for (const records of frameGroups.values()) {
    const base = `${records[0].protocol}.${records[0].direction}.${records[0].state}`;
    for (const record of records) {
      const expectedFrameId =
        records.length === 1 ? base : `${base}.${record.carrier_kind}`;
      if (record.frame_id !== expectedFrameId) {
        fail(`state registry: noncanonical frame ID ${record.frame_id}`);
      }
    }
  }
  const expectedExclusions = [
    "read_only_input_descriptions_without_an_independent_payload_parser",
    "raw_one_byte_or_signal_barriers",
    "transport_shutdown_and_eof",
  ];
  const expectedCollapseRules = [
    "byte_identical_copies_with_the_same_schema_serialization_cap_and_carrier_collapse",
    "candidate_and_final_durable_copies_collapse",
    "different_carrier_serialization_or_semantic_cap_requires_a_separate_record",
    "launcher_host_attestation_has_one_nested_envelope_record",
    "nested_or_copied_envelopes_otherwise_collapse_into_their_owning_logical_record",
  ];
  if (
    JSON.stringify(registry.exclusions) !== JSON.stringify(expectedExclusions)
  ) {
    fail("state registry: exclusions mismatch");
  }
  if (
    JSON.stringify(registry.collapse_rules) !==
    JSON.stringify(expectedCollapseRules)
  ) {
    fail("state registry: collapse rules mismatch");
  }
}

function tupleCompare(left, right) {
  if (left.payload_cap !== right.payload_cap) {
    return left.payload_cap - right.payload_cap;
  }
  for (const key of ["serialization", "cap_scope"]) {
    const comparison = unsignedByteCompare(left[key], right[key]);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return left.frame_prefix_bytes - right.frame_prefix_bytes;
}

function deriveTuples(registry) {
  const classMap = new Map(
    CLASSES.map(({ frame_class, payload_cap }) => [frame_class, payload_cap]),
  );
  const byIdentity = new Map();
  for (const record of registry.records) {
    const tuple = {
      payload_cap: classMap.get(record.frame_class),
      serialization: record.serialization,
      cap_scope: record.cap_scope,
      frame_prefix_bytes: record.frame_prefix_bytes,
    };
    const identity = JSON.stringify(Object.values(tuple));
    byIdentity.set(identity, tuple);
  }
  const tuples = [...byIdentity.values()].sort(tupleCompare);
  if (JSON.stringify(tuples) !== JSON.stringify(EXPECTED_TUPLES)) {
    fail("state registry: exact eight boundary tuples mismatch");
  }
  return tuples;
}

function carrierBytes(bodyLength, framePrefixBytes) {
  const body = Buffer.alloc(bodyLength, 0x41);
  if (framePrefixBytes === 0) {
    return body;
  }
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(bodyLength, 0);
  return Buffer.concat([prefix, body]);
}

function fixturePath(tuple, suffix) {
  return `${FIXTURE_DIRECTORY}/${tuple.payload_cap}.${tuple.serialization}.${tuple.cap_scope}.${tuple.frame_prefix_bytes}.${suffix}.json`;
}

function buildFixture(tuple, relation) {
  const bodyLength =
    relation === "cap_equality"
      ? tuple.payload_cap
      : tuple.payload_cap + 1;
  const body = Buffer.alloc(bodyLength, 0x41);
  const carrier = carrierBytes(bodyLength, tuple.frame_prefix_bytes);
  return {
    domain: FIXTURE_DOMAIN,
    payload_cap: tuple.payload_cap,
    serialization: tuple.serialization,
    cap_scope: tuple.cap_scope,
    frame_prefix_bytes: tuple.frame_prefix_bytes,
    relation,
    body_length: bodyLength,
    body_octet_hex: BODY_OCTET_HEX,
    body_sha256: sha256(body),
    carrier_length: carrier.length,
    carrier_sha256: sha256(carrier),
  };
}

export async function buildArtifacts(repositoryRoot = process.cwd()) {
  await assertOrdinaryFile(
    path.resolve(repositoryRoot, STATE_REGISTRY_PATH),
    "state registry",
  );
  const registryBytes = await readFile(
    path.resolve(repositoryRoot, STATE_REGISTRY_PATH),
  );
  const registry = parseCanonicalJson(registryBytes, "state registry");
  validateStateRegistry(registry);
  await assertOrdinaryFile(
    path.resolve(repositoryRoot, GENERATOR_PATH),
    "boundary generator",
  );
  const generatorBytes = await readFile(
    path.resolve(repositoryRoot, GENERATOR_PATH),
  );
  const fixtures = new Map();
  const tuples = [];
  for (const tuple of deriveTuples(registry)) {
    const equalityFixture = buildFixture(tuple, "cap_equality");
    const plusOneFixture = buildFixture(tuple, "cap_plus_one");
    const equalityPath = fixturePath(tuple, "equal");
    const plusOnePath = fixturePath(tuple, "plus-one");
    const equalityBytes = compactJsonBytes(equalityFixture);
    const plusOneBytes = compactJsonBytes(plusOneFixture);
    fixtures.set(equalityPath, equalityBytes);
    fixtures.set(plusOnePath, plusOneBytes);
    tuples.push({
      payload_cap: tuple.payload_cap,
      serialization: tuple.serialization,
      cap_scope: tuple.cap_scope,
      frame_prefix_bytes: tuple.frame_prefix_bytes,
      equality_fixture_path: equalityPath,
      equality_fixture_sha256: sha256(equalityBytes),
      equality_carrier_length: equalityFixture.carrier_length,
      equality_carrier_sha256: equalityFixture.carrier_sha256,
      plus_one_fixture_path: plusOnePath,
      plus_one_fixture_sha256: sha256(plusOneBytes),
      plus_one_carrier_length: plusOneFixture.carrier_length,
      plus_one_carrier_sha256: plusOneFixture.carrier_sha256,
    });
  }
  const index = {
    domain: INDEX_DOMAIN,
    generator_path: GENERATOR_PATH,
    generator_sha256: sha256(generatorBytes),
    state_registry_path: STATE_REGISTRY_PATH,
    state_registry_sha256: sha256(registryBytes),
    classes: CLASSES,
    class_set_sha256: classSetSha256(),
    tuple_count: tuples.length,
    tuples,
  };
  exactKeys(index, INDEX_KEYS, "generated index");
  for (const [indexPosition, tuple] of tuples.entries()) {
    exactKeys(tuple, TUPLE_KEYS, `generated tuple ${indexPosition}`);
  }
  for (const [fixtureName, fixtureBytes] of fixtures) {
    const fixture = parseCanonicalJson(fixtureBytes, fixtureName);
    exactKeys(fixture, FIXTURE_KEYS, fixtureName);
  }
  const indexBytes = compactJsonBytes(index);
  return {
    index,
    indexBytes,
    indexSha256: sha256(indexBytes),
    fixtures,
  };
}

async function verify(repositoryRoot) {
  const expected = await buildArtifacts(repositoryRoot);
  await assertOrdinaryFile(
    path.resolve(repositoryRoot, INDEX_PATH),
    "boundary index",
  );
  const indexBytes = await readFile(path.resolve(repositoryRoot, INDEX_PATH));
  const index = parseCanonicalJson(indexBytes, "boundary index");
  exactKeys(index, INDEX_KEYS, "boundary index");
  if (!indexBytes.equals(expected.indexBytes)) {
    fail("boundary index: content does not match deterministic derivation");
  }
  const fixtureDirectory = path.resolve(repositoryRoot, FIXTURE_DIRECTORY);
  const directoryEntries = await readdir(fixtureDirectory, {
    withFileTypes: true,
  });
  const expectedBasenames = [...expected.fixtures.keys()]
    .map((fixtureName) => path.basename(fixtureName))
    .sort(unsignedByteCompare);
  const actualBasenames = [];
  for (const entry of directoryEntries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      fail(`${FIXTURE_DIRECTORY}/${entry.name}: unexpected non-ordinary entry`);
    }
    actualBasenames.push(entry.name);
  }
  actualBasenames.sort(unsignedByteCompare);
  if (JSON.stringify(actualBasenames) !== JSON.stringify(expectedBasenames)) {
    fail("boundary fixture directory: exact file set mismatch");
  }
  for (const [fixtureName, expectedBytes] of expected.fixtures) {
    await assertOrdinaryFile(
      path.resolve(repositoryRoot, fixtureName),
      fixtureName,
    );
    const fixtureBytes = await readFile(
      path.resolve(repositoryRoot, fixtureName),
    );
    const fixture = parseCanonicalJson(fixtureBytes, fixtureName);
    exactKeys(fixture, FIXTURE_KEYS, fixtureName);
    if (!fixtureBytes.equals(expectedBytes)) {
      fail(`${fixtureName}: content does not match deterministic derivation`);
    }
  }
  process.stdout.write(
    `stage2-control-frame-boundary-fixtures-v1:PASS:${sha256(indexBytes)}\n`,
  );
}

async function generate(repositoryRoot, outputRoot) {
  if (!path.isAbsolute(outputRoot)) {
    fail("generation output root must be absolute");
  }
  try {
    await lstat(outputRoot);
    fail("generation output root must be absent");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  const generated = await buildArtifacts(repositoryRoot);
  await mkdir(outputRoot, { mode: 0o700 });
  for (const [fixtureName, fixtureBytes] of generated.fixtures) {
    const destination = path.join(outputRoot, fixtureName);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, fixtureBytes, {
      encoding: null,
      flag: "wx",
      mode: 0o600,
    });
  }
  const indexDestination = path.join(outputRoot, INDEX_PATH);
  await mkdir(path.dirname(indexDestination), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(indexDestination, generated.indexBytes, {
    encoding: null,
    flag: "wx",
    mode: 0o600,
  });
  process.stdout.write(
    `stage2-control-frame-boundary-fixtures-v1:GENERATED:${generated.indexSha256}\n`,
  );
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (
    arguments_.length === 5 &&
    arguments_[0] === "--verify" &&
    arguments_[1] === "--index" &&
    arguments_[2] === INDEX_PATH &&
    arguments_[3] === "--state-registry" &&
    arguments_[4] === STATE_REGISTRY_PATH
  ) {
    await verify(process.cwd());
    return;
  }
  if (
    arguments_.length === 5 &&
    arguments_[0] === "--generate" &&
    arguments_[1] === "--output-root" &&
    arguments_[3] === "--state-registry" &&
    arguments_[4] === STATE_REGISTRY_PATH
  ) {
    await generate(process.cwd(), arguments_[2]);
    return;
  }
  fail(
    "usage: --verify --index <exact-index-path> --state-registry <exact-state-registry-path> | --generate --output-root <fresh-absolute-root> --state-registry <exact-state-registry-path>",
  );
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`stage2-control-frame-boundary-fixtures-v1:FAIL:${error.message}\n`);
    process.exitCode = 1;
  });
}
