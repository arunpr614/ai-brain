#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPOSITORY_ROOT = process.cwd();
const IMPLEMENTATION_ROOT = path.join(
  REPOSITORY_ROOT,
  "docs/feature-council/youtube-item-recovery-implementation/implementation",
);
const FIXTURE_ROOT = path.join(IMPLEMENTATION_ROOT, "fixtures");
const OBSERVATION_SCHEMA_ROOT = path.join(
  FIXTURE_ROOT,
  "oracle-observation-schemas-v1",
);
const INVENTORY_PATH = path.join(
  FIXTURE_ROOT,
  "stage2-host-control-oracle-authoring-inventory-v1.json",
);
const INVENTORY_DOMAIN =
  "stage2-host-control-oracle-authoring-inventory-v1";
const ASSERTION_MANIFEST_DOMAIN = "stage2-assertion-manifest-v1";
const SCHEMA_DOMAIN = "stage2-host-control-oracle-observation-schema-v1";
const REGISTRY_DOMAIN =
  "stage2-host-control-oracle-observation-schema-registry-v1";
const SCHEMA_DIALECT = "stage2-closed-json-schema-subset-v1";
const PLATFORM_ORDER = ["linux", "darwin"];
const DEADLINE_PROPERTY_ORDER = Object.freeze([
  "phase",
  "startup_started_monotonic_ns",
  "startup_finished_monotonic_ns",
  "startup_elapsed_ns",
  "startup_limit_ns",
  "run_started_monotonic_ns",
  "run_finished_monotonic_ns",
  "run_elapsed_ns",
  "run_limit_ns",
]);
const DEADLINE_ENDPOINT_FIELDS = Object.freeze([
  "startup_started_monotonic_ns",
  "startup_finished_monotonic_ns",
  "run_started_monotonic_ns",
  "run_finished_monotonic_ns",
]);
const DEADLINE_ELAPSED_FIELDS = Object.freeze([
  "startup_elapsed_ns",
  "run_elapsed_ns",
]);
const DEADLINE_LIMIT_FIELDS = Object.freeze([
  "startup_limit_ns",
  "run_limit_ns",
]);
const DEADLINE_PHASE_SCHEMA = Object.freeze({
  type: "string",
  enum: ["deadline_snapshot"],
});
const DEADLINE_ENDPOINT_SCHEMA = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 19,
  pattern: "^(0|[1-9][0-9]{0,18})$",
});
const DEADLINE_ELAPSED_SCHEMA = Object.freeze({
  type: "integer",
  minimum: 0,
  maximum: 9007199254740991,
});
const DEADLINE_LIMIT_SCHEMA = Object.freeze({
  type: "integer",
  minimum: 1,
  maximum: 9007199254740991,
});
const PLATFORM_CONTRACT = {
  linux: {
    caseId: "S2-AC-01",
    observerKind: "linux_host_control_oracle_v1",
    scenarioPlanPath: "implementation/fixtures/oracle-plan-linux-v1.json",
    capabilityKinds: new Set([
      "cgroupfs_fd",
      "clock_monotonic",
      "pidfd",
      "procfs_fd",
      "socket_probe",
    ]),
    schemaSelectors: [
      "cgroup_snapshot\u0000stage2-host-control-oracle-linux-cgroup-snapshot-v1\u0000cgroupfs_fd\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/cgroup-snapshot-v1.json",
      "deadline_snapshot\u0000stage2-host-control-oracle-linux-deadline-snapshot-v1\u0000clock_monotonic\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/deadline-snapshot-v1.json",
      "pidfd_identity\u0000stage2-host-control-oracle-linux-pidfd-identity-v1\u0000pidfd\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/pidfd-identity-v1.json",
      "procfs_snapshot\u0000stage2-host-control-oracle-linux-procfs-snapshot-v1\u0000procfs_fd\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/procfs-snapshot-v1.json",
      "socket_probe\u0000stage2-host-control-oracle-linux-socket-probe-v1\u0000socket_probe\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/socket-probe-v1.json",
      "subject_exit\u0000stage2-host-control-oracle-linux-subject-exit-v1\u0000pidfd\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/subject-exit-v1.json",
      "subject_launch\u0000stage2-host-control-oracle-linux-subject-launch-v1\u0000procfs_fd\u0000implementation/fixtures/oracle-observation-schemas-v1/linux/subject-launch-v1.json",
    ],
  },
  darwin: {
    caseId: "S2-AC-17",
    observerKind: "darwin_host_control_oracle_v1",
    scenarioPlanPath: "implementation/fixtures/oracle-plan-darwin-v1.json",
    capabilityKinds: new Set([
      "clock_monotonic",
      "kqueue",
      "mach_vm_region",
      "proc_pidinfo",
      "sysctl_snapshot",
    ]),
    schemaSelectors: [
      "deadline_snapshot\u0000stage2-host-control-oracle-darwin-deadline-snapshot-v1\u0000clock_monotonic\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/deadline-snapshot-v1.json",
      "kqueue_exit\u0000stage2-host-control-oracle-darwin-kqueue-exit-v1\u0000kqueue\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/kqueue-exit-v1.json",
      "proc_pidinfo_snapshot\u0000stage2-host-control-oracle-darwin-proc-pidinfo-snapshot-v1\u0000proc_pidinfo\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/proc-pidinfo-snapshot-v1.json",
      "subject_exit\u0000stage2-host-control-oracle-darwin-subject-exit-v1\u0000kqueue\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-exit-v1.json",
      "subject_launch\u0000stage2-host-control-oracle-darwin-subject-launch-v1\u0000proc_pidinfo\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-launch-v1.json",
      "subject_process_snapshot\u0000stage2-host-control-oracle-darwin-subject-process-snapshot-v1\u0000sysctl_snapshot\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-process-snapshot-v1.json",
      "vm_region_snapshot\u0000stage2-host-control-oracle-darwin-vm-region-snapshot-v1\u0000mach_vm_region\u0000implementation/fixtures/oracle-observation-schemas-v1/darwin/vm-region-snapshot-v1.json",
    ],
  },
};
const FORBIDDEN_SOLE_EVIDENCE_POINTERS = new Set([
  "/assertion_result",
  "/phase",
  "/subject_exit_status_text",
]);
const ROOT_BLOB_VALIDATION_VECTORS = Object.freeze([
  "candidate_readonly_validation_failure",
  "fresh_final_validation_failure",
  "recovered_state3_or_state4_final_validation_failure",
]);
const ROOT_BLOB_VALIDATION_ROLES = Object.freeze({
  "S2-AC-13": Object.freeze([
    "ac13.root_destruction_journal",
    "ac13.root_destruction_receipt",
    "ac13.root_intent",
    "ac13.root_runtime_authority",
  ]),
  "S2-AC-17": Object.freeze([
    "ac17.cleanup_manifest",
    "ac17.expanded_manifest",
    "ac17.provisioning_intent",
    "ac17.root_destruction_journal",
    "ac17.root_destruction_receipt",
    "ac17.root_intent",
  ]),
});
const REQUIRED_CHILD_ASSERTIONS = Object.freeze({
  "S2-AC-13": Object.freeze(
    [
      "S2-AC-13/backup_transition_contract",
      ...ROOT_BLOB_VALIDATION_ROLES["S2-AC-13"].flatMap((role) =>
        ROOT_BLOB_VALIDATION_VECTORS.map(
          (vector) => `S2-AC-13/root_blob_validation.${role}.${vector}`,
        ),
      ),
    ].sort(unsignedByteCompare),
  ),
  "S2-AC-17": Object.freeze(
    [
      "S2-AC-17/darwin.case_contract",
      ...ROOT_BLOB_VALIDATION_ROLES["S2-AC-17"].flatMap((role) =>
        ROOT_BLOB_VALIDATION_VECTORS.map(
          (vector) => `S2-AC-17/root_blob_validation.${role}.${vector}`,
        ),
      ),
    ].sort(unsignedByteCompare),
  ),
});

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function domainDigest(domain, value) {
  return sha256(
    Buffer.concat([
      Buffer.from(domain, "ascii"),
      Buffer.from([0]),
      Buffer.from(JSON.stringify(value), "utf8"),
    ]),
  );
}

function exactCompactOneLf(filePath) {
  const identity = fs.lstatSync(filePath);
  if (!identity.isFile() || identity.isSymbolicLink()) {
    fail(`${filePath}: expected a nonsymlink ordinary file`);
  }
  const bytes = fs.readFileSync(filePath);
  if (bytes.length === 0 || bytes.at(-1) !== 0x0a) {
    fail(`${filePath}: missing final LF`);
  }
  const value = JSON.parse(bytes.toString("utf8"));
  const expected = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  if (!bytes.equals(expected)) {
    fail(`${filePath}: not exact compact JSON plus one LF`);
  }
  return { bytes, value };
}

function equalKeys(value, expected, label) {
  const actual = Object.keys(value);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label}: key order mismatch: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
  }
}

function unsignedByteCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function capsulePathToRepositoryPath(capsulePath) {
  validateCapsulePath(capsulePath);
  const prefix = "implementation/";
  const relativePath = capsulePath.slice(prefix.length);
  const resolved = path.resolve(IMPLEMENTATION_ROOT, relativePath);
  const rootPrefix = `${path.resolve(IMPLEMENTATION_ROOT)}${path.sep}`;
  if (!resolved.startsWith(rootPrefix)) {
    fail(`path escapes implementation root: ${capsulePath}`);
  }
  return resolved;
}

function validateCapsulePath(capsulePath) {
  if (
    typeof capsulePath !== "string" ||
    !/^[\x20-\x7e]+$/.test(capsulePath) ||
    !capsulePath.startsWith("implementation/") ||
    capsulePath.includes("\\") ||
    capsulePath.includes("%")
  ) {
    fail(`invalid capsule path: ${JSON.stringify(capsulePath)}`);
  }
  const components = capsulePath.split("/");
  if (
    components.some(
      (component) =>
        component.length === 0 || component === "." || component === "..",
    )
  ) {
    fail(`invalid capsule path component: ${capsulePath}`);
  }
}

function validateStrictSortedUnique(values, label) {
  for (let index = 0; index < values.length; index += 1) {
    if (
      typeof values[index] !== "string" ||
      (index > 0 &&
        unsignedByteCompare(values[index - 1], values[index]) >= 0)
    ) {
      fail(`${label}: values are not strict unsigned-byte sorted strings`);
    }
  }
}

function validateToken(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(value)
  ) {
    fail(`${label}: invalid closed token`);
  }
}

function validateSchemaNode(schemaNode, label) {
  if (
    typeof schemaNode !== "object" ||
    schemaNode === null ||
    Array.isArray(schemaNode) ||
    typeof schemaNode.type !== "string"
  ) {
    fail(`${label}: schema node must be an object with a type`);
  }

  if (schemaNode.type === "object") {
    equalKeys(
      schemaNode,
      ["type", "properties", "required", "additionalProperties"],
      label,
    );
    if (
      schemaNode.additionalProperties !== false ||
      typeof schemaNode.properties !== "object" ||
      schemaNode.properties === null ||
      Array.isArray(schemaNode.properties)
    ) {
      fail(`${label}: invalid closed object schema`);
    }
    const propertyKeys = Object.keys(schemaNode.properties);
    if (
      propertyKeys.length === 0 ||
      JSON.stringify(schemaNode.required) !== JSON.stringify(propertyKeys)
    ) {
      fail(`${label}: required keys do not byte-equal property order`);
    }
    for (const propertyKey of propertyKeys) {
      validateToken(propertyKey, `${label}.${propertyKey}`);
      validateSchemaNode(
        schemaNode.properties[propertyKey],
        `${label}.${propertyKey}`,
      );
    }
    return;
  }

  if (schemaNode.type === "array") {
    equalKeys(
      schemaNode,
      ["type", "items", "minItems", "maxItems", "uniqueItems"],
      label,
    );
    if (
      !Number.isSafeInteger(schemaNode.minItems) ||
      !Number.isSafeInteger(schemaNode.maxItems) ||
      schemaNode.minItems < 0 ||
      schemaNode.maxItems < schemaNode.minItems ||
      schemaNode.maxItems > 256 ||
      schemaNode.uniqueItems !== true
    ) {
      fail(`${label}: invalid bounded unique array schema`);
    }
    validateSchemaNode(schemaNode.items, `${label}[]`);
    return;
  }

  if (schemaNode.type === "string") {
    const allowedKeys = ["type", "minLength", "maxLength", "pattern", "enum"];
    const actualKeys = Object.keys(schemaNode);
    const projectedKeys = allowedKeys.filter((key) => key in schemaNode);
    if (JSON.stringify(actualKeys) !== JSON.stringify(projectedKeys)) {
      fail(`${label}: invalid string-schema key order or member`);
    }
    if ("enum" in schemaNode) {
      if (
        !Array.isArray(schemaNode.enum) ||
        schemaNode.enum.length === 0 ||
        schemaNode.enum.some((value) => typeof value !== "string") ||
        new Set(schemaNode.enum).size !== schemaNode.enum.length
      ) {
        fail(`${label}: invalid string enum`);
      }
    }
    if (
      "minLength" in schemaNode ||
      "maxLength" in schemaNode ||
      "pattern" in schemaNode
    ) {
      if (
        !Number.isSafeInteger(schemaNode.minLength) ||
        !Number.isSafeInteger(schemaNode.maxLength) ||
        schemaNode.minLength < 0 ||
        schemaNode.maxLength < schemaNode.minLength ||
        schemaNode.maxLength > 4096 ||
        typeof schemaNode.pattern !== "string"
      ) {
        fail(`${label}: invalid bounded string schema`);
      }
      try {
        new RegExp(schemaNode.pattern);
      } catch {
        fail(`${label}: invalid string pattern`);
      }
    }
    if (!("enum" in schemaNode) && !("pattern" in schemaNode)) {
      fail(`${label}: string schema is not closed`);
    }
    return;
  }

  if (schemaNode.type === "integer") {
    equalKeys(schemaNode, ["type", "minimum", "maximum"], label);
    if (
      !Number.isSafeInteger(schemaNode.minimum) ||
      !Number.isSafeInteger(schemaNode.maximum) ||
      schemaNode.minimum < 0 ||
      schemaNode.maximum < schemaNode.minimum
    ) {
      fail(`${label}: invalid safe unsigned integer schema`);
    }
    return;
  }

  if (schemaNode.type === "boolean" || schemaNode.type === "null") {
    equalKeys(schemaNode, ["type"], label);
    return;
  }

  fail(`${label}: unsupported schema type ${schemaNode.type}`);
}

function validateRawSchema(schemaJson, label) {
  validateSchemaNode(schemaJson, label);
}

function validateDeadlineSchema(schemaJson, label) {
  const properties = schemaJson.properties;
  if (
    JSON.stringify(Object.keys(properties)) !==
      JSON.stringify(DEADLINE_PROPERTY_ORDER) ||
    JSON.stringify(schemaJson.required) !==
      JSON.stringify(DEADLINE_PROPERTY_ORDER)
  ) {
    fail(`${label}: deadline property/required set or order mismatch`);
  }
  if (
    JSON.stringify(properties.phase) !== JSON.stringify(DEADLINE_PHASE_SCHEMA)
  ) {
    fail(`${label}: deadline phase schema mismatch`);
  }
  for (const field of DEADLINE_ENDPOINT_FIELDS) {
    if (
      JSON.stringify(properties[field]) !==
      JSON.stringify(DEADLINE_ENDPOINT_SCHEMA)
    ) {
      fail(`${label}: ${field} is not the exact bounded decimal-string schema`);
    }
  }
  for (const field of DEADLINE_ELAPSED_FIELDS) {
    if (
      JSON.stringify(properties[field]) !==
      JSON.stringify(DEADLINE_ELAPSED_SCHEMA)
    ) {
      fail(`${label}: ${field} is not the exact safe elapsed schema`);
    }
  }
  for (const field of DEADLINE_LIMIT_FIELDS) {
    if (
      JSON.stringify(properties[field]) !== JSON.stringify(DEADLINE_LIMIT_SCHEMA)
    ) {
      fail(`${label}: ${field} is not the exact positive safe limit schema`);
    }
  }
}

function decodePointerToken(token, label) {
  if (/~(?:[^01]|$)/.test(token)) {
    fail(`${label}: invalid RFC6901 escape`);
  }
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveSchemaPointer(schemaJson, pointer, label) {
  if (typeof pointer !== "string" || !pointer.startsWith("/") || pointer === "/") {
    fail(`${label}: pointer must select one schema property`);
  }
  let node = schemaJson;
  for (const encodedToken of pointer.slice(1).split("/")) {
    const token = decodePointerToken(encodedToken, label);
    if (
      node.type !== "object" ||
      !Object.prototype.hasOwnProperty.call(node.properties, token)
    ) {
      fail(`${label}: pointer does not resolve through closed properties`);
    }
    node = node.properties[token];
  }
  return node;
}

function loadInventoryAndManifest() {
  const { value: inventory } = exactCompactOneLf(INVENTORY_PATH);
  equalKeys(
    inventory,
    ["domain", "assertion_manifest_path", "platforms"],
    "authoring inventory",
  );
  if (
    inventory.domain !== INVENTORY_DOMAIN ||
    JSON.stringify(inventory.platforms.map(({ platform }) => platform)) !==
      JSON.stringify(PLATFORM_ORDER)
  ) {
    fail("authoring inventory domain/platform order mismatch");
  }
  validateCapsulePath(inventory.assertion_manifest_path);
  const assertionManifestPath = capsulePathToRepositoryPath(
    inventory.assertion_manifest_path,
  );
  const { value: assertionManifest } = exactCompactOneLf(assertionManifestPath);
  equalKeys(assertionManifest, ["domain", "cases"], "assertion manifest");
  if (
    assertionManifest.domain !== ASSERTION_MANIFEST_DOMAIN ||
    typeof assertionManifest.cases !== "object" ||
    assertionManifest.cases === null ||
    Array.isArray(assertionManifest.cases)
  ) {
    fail("assertion manifest domain/cases mismatch");
  }
  const expectedCaseIds = Array.from(
    { length: 17 },
    (_, index) => `S2-AC-${String(index + 1).padStart(2, "0")}`,
  );
  if (
    JSON.stringify(Object.keys(assertionManifest.cases)) !==
    JSON.stringify(expectedCaseIds)
  ) {
    fail("assertion manifest case set/order mismatch");
  }
  const seenAssertionIds = new Set();
  for (const caseId of expectedCaseIds) {
    const assertions = assertionManifest.cases[caseId];
    if (!Array.isArray(assertions) || assertions.length === 0) {
      fail(`${caseId}: assertion array is empty`);
    }
    let priorAssertionId = null;
    for (const [index, assertion] of assertions.entries()) {
      equalKeys(
        assertion,
        ["assertion_id", "source"],
        `${caseId} assertion ${index}`,
      );
      if (
        typeof assertion.assertion_id !== "string" ||
        !assertion.assertion_id.startsWith(`${caseId}/`) ||
        !new RegExp(`^${caseId}/[a-z0-9][a-z0-9._-]{0,127}$`).test(
          assertion.assertion_id,
        ) ||
        (priorAssertionId !== null &&
          unsignedByteCompare(priorAssertionId, assertion.assertion_id) >= 0) ||
        seenAssertionIds.has(assertion.assertion_id)
      ) {
        fail(`${caseId}: invalid, duplicate, or unordered assertion ID`);
      }
      if (
        assertion.source !== "child_event" &&
        assertion.source !== "host_control_oracle_bundle"
      ) {
        fail(`${assertion.assertion_id}: invalid assertion source`);
      }
      if (
        assertion.source === "host_control_oracle_bundle" &&
        caseId !== "S2-AC-01" &&
        caseId !== "S2-AC-17"
      ) {
        fail(`${assertion.assertion_id}: oracle source on forbidden case`);
      }
      priorAssertionId = assertion.assertion_id;
      seenAssertionIds.add(assertion.assertion_id);
    }
  }
  for (const [caseId, expectedChildAssertions] of Object.entries(
    REQUIRED_CHILD_ASSERTIONS,
  )) {
    const actualChildAssertions = assertionManifest.cases[caseId]
      .filter(({ source }) => source === "child_event")
      .map(({ assertion_id: assertionId }) => assertionId);
    if (
      JSON.stringify(actualChildAssertions) !==
      JSON.stringify(expectedChildAssertions)
    ) {
      fail(`${caseId}: exact root-blob child assertion set/order mismatch`);
    }
  }
  return {
    inventory,
    assertionManifest,
    inventoryDigest: domainDigest(INVENTORY_DOMAIN, inventory),
  };
}

function validatePlatformRecord(
  platformRecord,
  assertionManifest,
  seenGlobalPaths,
  deadlineSchemaBytesByPlatform,
) {
  equalKeys(
    platformRecord,
    [
      "platform",
      "scenario_plan_path",
      "observation_schema_registry_path",
      "observation_schemas",
      "assertion_bindings",
      "subject_profiles",
    ],
    `${platformRecord.platform} inventory platform`,
  );
  const platformContract = PLATFORM_CONTRACT[platformRecord.platform];
  if (!platformContract) {
    fail(`unsupported platform: ${platformRecord.platform}`);
  }
  if (platformRecord.scenario_plan_path !== platformContract.scenarioPlanPath) {
    fail(`${platformRecord.platform}: noncanonical scenario plan path`);
  }
  for (const selectedPath of [
    platformRecord.scenario_plan_path,
    platformRecord.observation_schema_registry_path,
  ]) {
    validateCapsulePath(selectedPath);
    if (seenGlobalPaths.has(selectedPath)) {
      fail(`duplicate global inventory path: ${selectedPath}`);
    }
    seenGlobalPaths.add(selectedPath);
  }

  const expectedRegistryPath = `implementation/fixtures/oracle-schema-registry-${platformRecord.platform}-v1.json`;
  if (platformRecord.observation_schema_registry_path !== expectedRegistryPath) {
    fail(`${platformRecord.platform}: noncanonical registry path`);
  }

  const schemaByPair = new Map();
  let priorSortKey = null;
  if (!Array.isArray(platformRecord.observation_schemas)) {
    fail(`${platformRecord.platform}: observation schemas must be an array`);
  }
  const actualSchemaSelectors = platformRecord.observation_schemas.map(
    ({
      event_kind: eventKind,
      observation_domain: observationDomain,
      observer_capability_kind: observerCapabilityKind,
      observation_schema_path: observationSchemaPath,
    }) =>
      [
        eventKind,
        observationDomain,
        observerCapabilityKind,
        observationSchemaPath,
      ].join("\u0000"),
  );
  if (
    JSON.stringify(actualSchemaSelectors) !==
    JSON.stringify(platformContract.schemaSelectors)
  ) {
    fail(`${platformRecord.platform}: exact seven-record schema set/order mismatch`);
  }
  for (const [index, source] of platformRecord.observation_schemas.entries()) {
    equalKeys(
      source,
      [
        "event_kind",
        "observation_domain",
        "observer_capability_kind",
        "observation_schema_path",
      ],
      `${platformRecord.platform} inventory schema ${index}`,
    );
    const sortKey = `${source.observation_domain}\u0000${source.event_kind}`;
    if (
      priorSortKey !== null &&
      unsignedByteCompare(priorSortKey, sortKey) >= 0
    ) {
      fail(`${platformRecord.platform}: schema inventory is not strict-sorted`);
    }
    priorSortKey = sortKey;
    validateToken(source.event_kind, `${platformRecord.platform} event kind`);
    validateToken(
      source.observation_domain,
      `${platformRecord.platform} observation domain`,
    );
    validateToken(
      source.observer_capability_kind,
      `${platformRecord.platform} observer capability kind`,
    );
    if (
      !platformContract.capabilityKinds.has(source.observer_capability_kind)
    ) {
      fail(
        `${platformRecord.platform}: unlisted observer capability kind ${source.observer_capability_kind}`,
      );
    }
    validateCapsulePath(source.observation_schema_path);
    if (seenGlobalPaths.has(source.observation_schema_path)) {
      fail(`duplicate global inventory path: ${source.observation_schema_path}`);
    }
    seenGlobalPaths.add(source.observation_schema_path);

    const schemaFilePath = capsulePathToRepositoryPath(
      source.observation_schema_path,
    );
    const { bytes: schemaBytes, value: schemaJson } =
      exactCompactOneLf(schemaFilePath);
    validateRawSchema(schemaJson, source.observation_schema_path);
    const phaseSchema = schemaJson.properties.phase;
    if (
      phaseSchema.type !== "string" ||
      JSON.stringify(phaseSchema.enum) !== JSON.stringify([source.event_kind])
    ) {
      fail(`${source.observation_schema_path}: phase enum != event kind`);
    }
    if (source.event_kind === "deadline_snapshot") {
      validateDeadlineSchema(schemaJson, source.observation_schema_path);
      if (deadlineSchemaBytesByPlatform.has(platformRecord.platform)) {
        fail(`${platformRecord.platform}: duplicate deadline schema`);
      }
      deadlineSchemaBytesByPlatform.set(platformRecord.platform, schemaBytes);
    }
    schemaByPair.set(
      `${source.observation_domain}\u0000${source.event_kind}`,
      { source, schemaJson },
    );
  }

  const manifestCase = assertionManifest.cases[platformContract.caseId];
  if (!Array.isArray(manifestCase)) {
    fail(`${platformRecord.platform}: missing manifest case`);
  }
  const expectedAssertionIds = manifestCase
    .filter(({ source }) => source === "host_control_oracle_bundle")
    .map(({ assertion_id: assertionId }) => assertionId);
  const actualAssertionIds = platformRecord.assertion_bindings.map(
    ({ assertion_id: assertionId }) => assertionId,
  );
  if (JSON.stringify(actualAssertionIds) !== JSON.stringify(expectedAssertionIds)) {
    fail(`${platformRecord.platform}: assertion binding set/order mismatch`);
  }
  validateStrictSortedUnique(
    actualAssertionIds,
    `${platformRecord.platform} assertion bindings`,
  );
  for (const [index, binding] of platformRecord.assertion_bindings.entries()) {
    equalKeys(
      binding,
      [
        "assertion_id",
        "event_kind",
        "observation_domain",
        "required_json_pointers",
      ],
      `${platformRecord.platform} assertion binding ${index}`,
    );
    const pair = `${binding.observation_domain}\u0000${binding.event_kind}`;
    const schemaRecord = schemaByPair.get(pair);
    if (!schemaRecord) {
      fail(`${platformRecord.platform}: assertion binding schema is absent`);
    }
    if (
      !Array.isArray(binding.required_json_pointers) ||
      binding.required_json_pointers.length === 0
    ) {
      fail(`${binding.assertion_id}: required pointer set is empty`);
    }
    validateStrictSortedUnique(
      binding.required_json_pointers,
      `${binding.assertion_id} required pointers`,
    );
    if (
      binding.required_json_pointers.every((pointer) =>
        FORBIDDEN_SOLE_EVIDENCE_POINTERS.has(pointer),
      )
    ) {
      fail(`${binding.assertion_id}: pointer set contains no host-observed evidence`);
    }
    for (const pointer of binding.required_json_pointers) {
      resolveSchemaPointer(
        schemaRecord.schemaJson,
        pointer,
        `${binding.assertion_id} ${pointer}`,
      );
    }
  }

  let priorProfile = null;
  for (const [index, profile] of platformRecord.subject_profiles.entries()) {
    equalKeys(
      profile,
      [
        "subject_profile",
        "subject_entrypoint_path",
        "system_runtime_manifest_path",
        "import_manifest_path",
        "native_observer_adapter_path",
        "observer_kind",
      ],
      `${platformRecord.platform} subject profile ${index}`,
    );
    validateToken(
      profile.subject_profile,
      `${platformRecord.platform} subject profile`,
    );
    if (
      priorProfile !== null &&
      unsignedByteCompare(priorProfile, profile.subject_profile) >= 0
    ) {
      fail(`${platformRecord.platform}: subject profiles not strict-sorted`);
    }
    priorProfile = profile.subject_profile;
    if (profile.observer_kind !== platformContract.observerKind) {
      fail(`${platformRecord.platform}: observer kind mismatch`);
    }
    for (const selectedPath of [
      profile.subject_entrypoint_path,
      profile.system_runtime_manifest_path,
      profile.import_manifest_path,
      profile.native_observer_adapter_path,
    ]) {
      validateCapsulePath(selectedPath);
      if (seenGlobalPaths.has(selectedPath)) {
        fail(`duplicate global inventory path: ${selectedPath}`);
      }
      seenGlobalPaths.add(selectedPath);
    }
  }
  if (platformRecord.subject_profiles.length === 0) {
    fail(`${platformRecord.platform}: subject profiles are empty`);
  }
}

function collectOrdinaryFiles(directoryPath) {
  const files = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`${entryPath}: symlink forbidden in observation schema tree`);
    }
    if (entry.isDirectory()) {
      files.push(...collectOrdinaryFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    } else {
      fail(`${entryPath}: non-ordinary observation schema entry`);
    }
  }
  return files;
}

function validateObservationSchemaTreeExact(inventory) {
  const expected = inventory.platforms
    .flatMap(({ observation_schemas: observationSchemas }) =>
      observationSchemas.map(
        ({ observation_schema_path: observationSchemaPath }) =>
          observationSchemaPath,
      ),
    )
    .sort(unsignedByteCompare);
  const actual = collectOrdinaryFiles(OBSERVATION_SCHEMA_ROOT)
    .map((filePath) => {
      const relativePath = path.relative(IMPLEMENTATION_ROOT, filePath);
      return `implementation/${relativePath.split(path.sep).join("/")}`;
    })
    .sort(unsignedByteCompare);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("observation schema tree differs from exact inventory file set");
  }
}

function constructRegistry(platformRecord, inventoryDigest) {
  const schemas = platformRecord.observation_schemas.map((source) => {
    const schemaFilePath = capsulePathToRepositoryPath(
      source.observation_schema_path,
    );
    const { value: schemaJson } = exactCompactOneLf(schemaFilePath);
    const observationSchema = {
      domain: SCHEMA_DOMAIN,
      schema_dialect: SCHEMA_DIALECT,
      schema_json: schemaJson,
    };
    return {
      event_kind: source.event_kind,
      observation_domain: source.observation_domain,
      observer_capability_kind: source.observer_capability_kind,
      observation_schema_path: source.observation_schema_path,
      observation_schema: observationSchema,
      observation_schema_sha256: domainDigest(
        SCHEMA_DOMAIN,
        observationSchema,
      ),
      required_keys: schemaJson.required,
    };
  });

  return {
    domain: REGISTRY_DOMAIN,
    platform: platformRecord.platform,
    authoring_inventory_sha256: inventoryDigest,
    schema_count: schemas.length,
    schemas,
  };
}

function registryOutputPath(platform) {
  return path.join(
    FIXTURE_ROOT,
    `oracle-schema-registry-${platform}-v1.json`,
  );
}

function expectedOutputs() {
  const { inventory, assertionManifest, inventoryDigest } =
    loadInventoryAndManifest();
  const seenGlobalPaths = new Set([inventory.assertion_manifest_path]);
  const deadlineSchemaBytesByPlatform = new Map();
  for (const platformRecord of inventory.platforms) {
    validatePlatformRecord(
      platformRecord,
      assertionManifest,
      seenGlobalPaths,
      deadlineSchemaBytesByPlatform,
    );
  }
  const linuxDeadlineSchema = deadlineSchemaBytesByPlatform.get("linux");
  const darwinDeadlineSchema = deadlineSchemaBytesByPlatform.get("darwin");
  if (
    !linuxDeadlineSchema ||
    !darwinDeadlineSchema ||
    !linuxDeadlineSchema.equals(darwinDeadlineSchema)
  ) {
    fail("Linux/Darwin deadline schema bytes differ");
  }
  validateObservationSchemaTreeExact(inventory);
  return inventory.platforms.map((platformRecord) => {
    const registry = constructRegistry(platformRecord, inventoryDigest);
    const outputPath = registryOutputPath(platformRecord.platform);
    const bytes = Buffer.from(`${JSON.stringify(registry)}\n`, "utf8");
    return { outputPath, bytes, registry, inventoryDigest };
  });
}

function generateRegistries() {
  const outputs = expectedOutputs();
  for (const { outputPath, bytes } of outputs) {
    try {
      const identity = fs.lstatSync(outputPath);
      if (!identity.isFile() || identity.isSymbolicLink()) {
        fail(`${outputPath}: refusing to replace non-ordinary registry path`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    fs.writeFileSync(outputPath, bytes, { flag: "w", mode: 0o600 });
  }
  process.stdout.write(
    `stage2-host-control-oracle-schema-registries-v1:GENERATED:${outputs[0].inventoryDigest}\n`,
  );
}

function verifyRegistries() {
  const outputs = expectedOutputs();
  for (const { outputPath, bytes } of outputs) {
    const { bytes: actual } = exactCompactOneLf(outputPath);
    if (!actual.equals(bytes)) {
      fail(`${outputPath}: registry bytes differ from independent derivation`);
    }
  }
  process.stdout.write(
    `stage2-host-control-oracle-schema-registries-v1:PASS:${outputs[0].inventoryDigest}\n`,
  );
}

const CONTRACT_FAILURE_LINE =
  "stage2-host-control-oracle-schema-registries-v1:FAIL:contract_validation_failed\n";

try {
  const [mode, ...extraArguments] = process.argv.slice(2);
  if (extraArguments.length !== 0) {
    fail(`unexpected arguments: ${extraArguments.join(" ")}`);
  }
  if (mode === "--generate-registries") {
    generateRegistries();
  } else if (mode === "--verify-registries") {
    verifyRegistries();
  } else {
    fail(
      "usage: generate-stage2-host-control-oracle-static-fixtures.mjs --generate-registries|--verify-registries",
    );
  }
} catch {
  process.exitCode = 1;
  process.stderr.write(CONTRACT_FAILURE_LINE);
}
