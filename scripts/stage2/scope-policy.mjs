import { types as nodeUtilTypes } from "node:util";

const NativeSet = Set;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const arrayIsArray = Array.isArray;
const isProxy = nodeUtilTypes.isProxy;
const numberIsSafeInteger = Number.isSafeInteger;
const objectCreate = Object.create;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getPrototypeOf = Object.getPrototypeOf;
const objectHasOwn = Object.hasOwn;
const objectFreeze = Object.freeze;
const reflectApply = Reflect.apply;
const reflectOwnKeys = Reflect.ownKeys;
const setAdd = Set.prototype.add;
const setHas = Set.prototype.has;

function addSetValue(set, value) {
  reflectApply(setAdd, set, [value]);
}

function hasSetValue(set, value) {
  return reflectApply(setHas, set, [value]);
}

function addCapabilityGroup(set, capabilities) {
  for (let index = 0; index < capabilities.length; index += 1) {
    addSetValue(set, capabilities[index]);
  }
}

const RECORD_KEYS = objectFreeze([
  "path",
  "status",
  "artifact_kind",
  "packaging_scope",
  "product_authority",
  "capability_ids",
]);

const STATUSES = objectFreeze(["A", "D", "M"]);
const ARTIFACT_KINDS = objectFreeze(
  [
    "authority_protocol",
    "backup_change",
    "dependency",
    "fixture",
    "migration",
    "native_bridge",
    "package_entry",
    "source",
  ],
);
const PACKAGING_SCOPES = objectFreeze(
  ["evidence_only", "production", "source_only", "test_only"],
);

const BROWSER_SURFACE_CAPABILITIES = objectFreeze(
  [
    "browser.authorization_grant",
    "browser.capture_action",
    "browser.capture_intent",
    "browser.capture_route",
    "browser.chrome_extension_implementation",
    "browser.dom_integration",
    "browser.handoff",
    "browser.inspect_confirm_flow",
    "browser.link_only_action",
    "browser.link_only_route",
    "browser.live_target_access",
    "browser.private_lab_identity",
    "browser.provider_authorization",
    "browser.upload",
  ],
);

const MANUAL_029_CAPABILITIES = objectFreeze(
  [
    "manual029.acceptance_fixture",
    "manual029.accepted_authorization_context",
    "manual029.accepted_authorization_snapshot",
    "manual029.adapter",
    "manual029.application_reader",
    "manual029.application_writer",
    "manual029.column",
    "manual029.connection_factory",
    "manual029.digest_generation",
    "manual029.dual_write_transition",
    "manual029.failpoint",
    "manual029.generated_statement",
    "manual029.generation",
    "manual029.handling_terms",
    "manual029.index",
    "manual029.interactive_lane",
    "manual029.manifest",
    "manual029.migration",
    "manual029.packaged_artifact",
    "manual029.partial_success_handling",
    "manual029.production_capability",
    "manual029.provider_dispatch",
    "manual029.provider_drift_handling",
    "manual029.provider_usage",
    "manual029.receipt",
    "manual029.release_descriptor",
    "manual029.release_mutation",
    "manual029.retry",
    "manual029.run",
    "manual029.schema",
    "manual029.semantic_indexing",
    "manual029.semantic_reader_cutover",
    "manual029.table",
    "manual029.trigger",
    "manual029.ui_authorization",
    "manual029.worker",
    "manual029.attempt",
  ],
);

const NATIVE_BRIDGE_CANDIDATE_CAPABILITIES = objectFreeze(
  [
    "native.action_source",
    "native.authorizer",
    "native.binding_buffer_teardown",
    "native.binding_count",
    "native.brain_s28_bridge_present_constant_innocuous",
    "native.pragma_attestation",
    "native.prepared_role",
    "native.row_count",
    "native.transaction_outcome_observer_readonly",
    "native.transaction_state_snapshot_readonly",
  ],
);

const NATIVE_BRIDGE_FORBIDDEN_CAPABILITIES = objectFreeze(
  [
    "native.checkpoint_control",
    "native.extra_schema_udf",
    "native.generic_database_authority",
    "native.generic_hook_api",
    "native.schema_sql",
    "native.sqlite_modification",
    "native.stateful_schema_udf",
    "native.transaction_control",
  ],
);

const GENERAL_API_CAPABILITIES = objectFreeze(
  [
    "api.general_analytics",
    "api.general_backup",
    "api.general_diagnostic",
    "api.general_export",
    "api.general_janitor",
    "api.general_log",
    "api.general_product_control",
    "api.general_read",
    "api.general_recovery_control",
    "api.general_rotation",
    "api.general_signing",
  ],
);

const EVIDENCE_CAPABILITIES = objectFreeze(
  [
    "evidence.ac13_qemu_fixture",
    "evidence.ac17_darwin_fixture",
    "evidence.host_attestation_plane",
    "evidence.host_private_signing_material",
    "evidence.host_signing_handle",
    "evidence.launcher_signing_handle",
  ],
);

const ALWAYS_FORBIDDEN_CAPABILITIES = objectFreeze(
  [
    objectFreeze([
      "browser.client_cache",
      "stage2_scope_client_cache_restriction_forbidden",
    ]),
    objectFreeze([
      "sqlite.native_fork",
      "stage2_scope_sqlite_fork_forbidden",
    ]),
    objectFreeze([
      "backup.general_engine_replacement",
      "stage2_scope_backup_engine_replacement_forbidden",
    ]),
    objectFreeze([
      "os.production_containment",
      "stage2_scope_production_os_containment_forbidden",
    ]),
    objectFreeze([
      "control.general_external_product",
      "stage2_scope_general_control_plane_forbidden",
    ]),
    objectFreeze([
      "control.general_external_recovery",
      "stage2_scope_general_control_plane_forbidden",
    ]),
    objectFreeze([
      "evidence.other_os_isolation_fixture",
      "stage2_scope_non_ac13_os_fixture_forbidden",
    ]),
    objectFreeze([
      "evidence.other_native_fixture",
      "stage2_scope_non_ac17_native_fixture_forbidden",
    ]),
  ],
);

const CANDIDATE_CAPABILITIES = objectFreeze(
  [
    "authority.abort_clear_resume",
    "authority.admission_retirement_fence_bootstrap",
    "authority.authenticated_active_publication_receipt",
    "authority.authenticated_chained_receipt",
    "authority.authenticated_origin_receipt",
    "authority.authenticated_restore_disposition_receipt",
    "authority.channel_role_reclassification",
    "authority.cleanup_pin",
    "authority.create_only_candidate_key_index",
    "authority.create_only_receipt_hash_index",
    "authority.database_hash_identity_cas",
    "authority.database_identity_marker_check",
    "authority.definitive_death_epoch_takeover",
    "authority.epoch_promotion",
    "authority.exclusive_controller_operation",
    "authority.item_deletion_signing_reservation",
    "authority.marker_verification",
    "authority.metadata_integrity_key",
    "authority.monotonic_key_maxima",
    "authority.nonexportable_owner_capability",
    "authority.nonrollbackable_register_history_generation_epoch",
    "authority.pending_origin_restore_reservation",
    "authority.retention_floor",
    "authority.retirement_barrier_zero_proof",
    "authority.runtime_channel_resume_projection",
    "authority.service_private_signing_action_record",
    "authority.stable_store_locator",
    "authority.startup_recovery_latch",
    "authority.tombstone_key_retirement_control",
    "backup.bounded_enumeration",
    "backup.brain_data_ownership",
    "backup.clean_b27_bootstrap",
    "backup.cross_uid_recovery",
    "backup.descriptor_bound_hidden_publication_copy",
    "backup.external_active_database_authority_restore_barrier",
    "backup.first_visible_metadata_tool_publication",
    "backup.fixed_snapshot",
    "backup.fresh_logical_sanitized_image_builder",
    "backup.inherited_notebooklm_scrub",
    "backup.inherited_ofd_topology",
    "backup.intent_owned_volatile_scrub_staging",
    "backup.legacy_maintenance_boundary",
    "backup.owned_publication_recovery_shared_lock",
    "backup.physical_parser",
    "backup.provisioned_intents",
    "backup.staging_prefix_control",
    "backup.stopped_and_drained_control",
    "backup.tool_transition_control",
    "backup.truthful_scoped_release_locks",
    "backup.zero_outbox_zero_permit_barrier",
    "migration028.backup_content_free_intent_or_journal",
    "migration028.extension_capture_requests_inert",
    "migration028.item_artifact_cleanup_jobs_purpose_limited",
    "migration028.item_delete_commands_zero_row_view",
    "migration028.item_delete_permits_transaction_transient",
    "migration028.item_deletion_request_tombstones_five_field",
    "migration028.item_deletion_requests_item_owned",
    "migration028.item_request_tombstones_five_field",
    "stage2.automatic_recovery",
    "stage2.contract_documentation",
    "stage2.evidence_protocol",
    "stage2.fingerprint_framing",
    "stage2.item_instance_allocator",
    "stage2.migration_admission_gate",
    "stage2.native_bridge_proof",
    "stage2.ordinary_worker_control",
    "stage2.test_only_primitive",
    ...NATIVE_BRIDGE_CANDIDATE_CAPABILITIES,
    ...EVIDENCE_CAPABILITIES,
  ],
);

const knownCapabilities = new NativeSet();
addCapabilityGroup(knownCapabilities, BROWSER_SURFACE_CAPABILITIES);
addCapabilityGroup(knownCapabilities, MANUAL_029_CAPABILITIES);
addCapabilityGroup(knownCapabilities, NATIVE_BRIDGE_FORBIDDEN_CAPABILITIES);
addCapabilityGroup(knownCapabilities, GENERAL_API_CAPABILITIES);
for (
  let index = 0;
  index < ALWAYS_FORBIDDEN_CAPABILITIES.length;
  index += 1
) {
  addSetValue(knownCapabilities, ALWAYS_FORBIDDEN_CAPABILITIES[index][0]);
}
addCapabilityGroup(knownCapabilities, CANDIDATE_CAPABILITIES);
const KNOWN_CAPABILITIES = objectFreeze(knownCapabilities);

const FORBIDDEN_PRECEDENCE = objectFreeze([
  {
    reason: "stage2_scope_browser_surface_forbidden",
    capabilities: BROWSER_SURFACE_CAPABILITIES,
  },
  {
    reason: "stage2_scope_manual_029_surface_forbidden",
    capabilities: MANUAL_029_CAPABILITIES,
  },
  {
    reason: "stage2_scope_native_bridge_excess_authority_forbidden",
    capabilities: NATIVE_BRIDGE_FORBIDDEN_CAPABILITIES,
  },
  {
    reason: "stage2_scope_general_api_forbidden",
    capabilities: GENERAL_API_CAPABILITIES,
  },
]);

function result(classification, reason) {
  return objectFreeze({ classification, reason });
}

function forbidden(reason) {
  return result("forbidden", reason);
}

function arrayContains(values, expected) {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === expected) return true;
  }
  return false;
}

function hasPrefix(value, prefix) {
  if (value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  return true;
}

function hasOwnKey(keys, expected) {
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] === expected) return true;
  }
  return false;
}

function isRecordKey(key) {
  switch (key) {
    case "path":
    case "status":
    case "artifact_kind":
    case "packaging_scope":
    case "product_authority":
    case "capability_ids":
      return true;
    default:
      return false;
  }
}

function descriptorValue(descriptors, key) {
  const descriptor = descriptors[key];
  if (
    descriptor === undefined ||
    !objectHasOwn(descriptor, "value") ||
    descriptor.enumerable !== true
  ) {
    return { ok: false };
  }
  return { ok: true, value: descriptor.value };
}

function readExactRecord(record) {
  try {
    if (
      record === null ||
      typeof record !== "object" ||
      isProxy(record) ||
      getPrototypeOf(record) !== OBJECT_PROTOTYPE
    ) {
      return { reason: "stage2_scope_observation_invalid" };
    }

    const keys = reflectOwnKeys(record);
    if (keys.length !== RECORD_KEYS.length) {
      return { reason: "stage2_scope_observation_invalid" };
    }
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string" || !isRecordKey(keys[index])) {
        return { reason: "stage2_scope_observation_invalid" };
      }
    }

    const descriptors = getOwnPropertyDescriptors(record);
    const path = descriptorValue(descriptors, "path");
    const status = descriptorValue(descriptors, "status");
    const artifactKind = descriptorValue(descriptors, "artifact_kind");
    const packagingScope = descriptorValue(descriptors, "packaging_scope");
    const productAuthority = descriptorValue(
      descriptors,
      "product_authority",
    );
    const capabilityIds = descriptorValue(descriptors, "capability_ids");
    if (
      !path.ok ||
      !status.ok ||
      !artifactKind.ok ||
      !packagingScope.ok ||
      !productAuthority.ok ||
      !capabilityIds.ok
    ) {
      return { reason: "stage2_scope_observation_invalid" };
    }
    return {
      values: {
        path: path.value,
        status: status.value,
        artifact_kind: artifactKind.value,
        packaging_scope: packagingScope.value,
        product_authority: productAuthority.value,
        capability_ids: capabilityIds.value,
      },
    };
  } catch {
    return { reason: "stage2_scope_observation_invalid" };
  }
}

function readPlainArray(value, maximumLength) {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      isProxy(value) ||
      !arrayIsArray(value) ||
      getPrototypeOf(value) !== ARRAY_PROTOTYPE ||
      !numberIsSafeInteger(value.length) ||
      value.length < 0 ||
      value.length > maximumLength
    ) {
      return null;
    }

    const ownKeys = reflectOwnKeys(value);
    if (
      ownKeys.length !== value.length + 1 ||
      !hasOwnKey(ownKeys, "length")
    ) {
      return null;
    }

    const descriptors = getOwnPropertyDescriptors(value);
    for (let index = 0; index < value.length; index += 1) {
      const key = `${index}`;
      if (!hasOwnKey(ownKeys, key)) return null;
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !objectHasOwn(descriptor, "value") ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
    }
    return { length: value.length, descriptors };
  } catch {
    return null;
  }
}

function plainArrayValue(arrayData, index) {
  return arrayData.descriptors[`${index}`].value;
}

function isAsciiLetter(character) {
  return (
    (character >= "A" && character <= "Z") ||
    (character >= "a" && character <= "z")
  );
}

function isSafeRepoPath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.length > 4096 ||
    path[0] === "/" ||
    (path.length >= 3 &&
      isAsciiLetter(path[0]) &&
      path[1] === ":" &&
      path[2] === "/")
  ) {
    return false;
  }

  let segmentStart = 0;
  for (let index = 0; index <= path.length; index += 1) {
    const character = path[index];
    if (index < path.length) {
      if (
        character === "\\" ||
        character <= "\u001f" ||
        character === "\u007f"
      ) {
        return false;
      }
    }
    if (index === path.length || character === "/") {
      const segmentLength = index - segmentStart;
      if (
        segmentLength === 0 ||
        (segmentLength === 1 && path[segmentStart] === ".") ||
        (segmentLength === 2 &&
          path[segmentStart] === "." &&
          path[segmentStart + 1] === ".")
      ) {
        return false;
      }
      segmentStart = index + 1;
    }
  }
  return true;
}

function isCapabilityId(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 128
  ) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (
      !(
        (character >= "a" && character <= "z") ||
        (character >= "0" && character <= "9") ||
        character === "." ||
        character === "_" ||
        character === "-"
      )
    ) {
      return false;
    }
  }
  return true;
}

function validateCapabilityIds(value) {
  const capabilityIds = readPlainArray(value, 512);
  if (capabilityIds === null) {
    return { reason: "stage2_scope_capability_ids_invalid" };
  }

  let previous = null;
  for (let index = 0; index < capabilityIds.length; index += 1) {
    const capabilityId = plainArrayValue(capabilityIds, index);
    if (
      !isCapabilityId(capabilityId) ||
      (previous !== null && capabilityId <= previous)
    ) {
      return { reason: "stage2_scope_capability_ids_invalid" };
    }
    if (!hasSetValue(KNOWN_CAPABILITIES, capabilityId)) {
      return { reason: "stage2_scope_capability_unknown" };
    }
    previous = capabilityId;
  }

  return { capabilityIds };
}

/**
 * Evaluates already-classified synthetic scope observations. This function
 * intentionally cannot establish S2-AC-15: a non-forbidden result still
 * requires the future authoritative repository, dependency, binary, and
 * production-package scans.
 */
export function evaluateStage2ScopeObservations(observations) {
  const records = readPlainArray(observations, 4096);
  if (records === null) {
    return forbidden("stage2_scope_inventory_invalid");
  }
  if (records.length === 0) {
    return forbidden("stage2_scope_inventory_empty");
  }

  const seenPaths = new NativeSet();
  const validatedRecords = objectCreate(null);
  const observedCapabilities = new NativeSet();

  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const record = plainArrayValue(records, recordIndex);
    const parsed = readExactRecord(record);
    if (parsed.reason) return forbidden(parsed.reason);
    const values = parsed.values;

    if (!isSafeRepoPath(values.path)) {
      return forbidden("stage2_scope_path_invalid");
    }
    if (hasSetValue(seenPaths, values.path)) {
      return forbidden("stage2_scope_observation_duplicate");
    }
    addSetValue(seenPaths, values.path);

    if (
      typeof values.status !== "string" ||
      !arrayContains(STATUSES, values.status)
    ) {
      return forbidden("stage2_scope_status_invalid");
    }
    if (
      typeof values.artifact_kind !== "string" ||
      !arrayContains(ARTIFACT_KINDS, values.artifact_kind)
    ) {
      return forbidden("stage2_scope_artifact_kind_invalid");
    }
    if (
      typeof values.packaging_scope !== "string" ||
      !arrayContains(PACKAGING_SCOPES, values.packaging_scope)
    ) {
      return forbidden("stage2_scope_packaging_scope_invalid");
    }
    if (typeof values.product_authority !== "boolean") {
      return forbidden("stage2_scope_product_authority_invalid");
    }

    const validatedCapabilities = validateCapabilityIds(values.capability_ids);
    if (validatedCapabilities.reason) {
      return forbidden(validatedCapabilities.reason);
    }

    if (
      values.status === "D" &&
      (validatedCapabilities.capabilityIds.length !== 0 ||
        values.product_authority)
    ) {
      return forbidden("stage2_scope_deleted_observation_invalid");
    }

    for (
      let capabilityIndex = 0;
      capabilityIndex < validatedCapabilities.capabilityIds.length;
      capabilityIndex += 1
    ) {
      addSetValue(
        observedCapabilities,
        plainArrayValue(
          validatedCapabilities.capabilityIds,
          capabilityIndex,
        ),
      );
    }
    validatedRecords[recordIndex] = {
      packagingScope: values.packaging_scope,
      productAuthority: values.product_authority,
      capabilityIds: validatedCapabilities.capabilityIds,
    };
  }

  for (
    let ruleIndex = 0;
    ruleIndex < FORBIDDEN_PRECEDENCE.length;
    ruleIndex += 1
  ) {
    const rule = FORBIDDEN_PRECEDENCE[ruleIndex];
    for (
      let capabilityIndex = 0;
      capabilityIndex < rule.capabilities.length;
      capabilityIndex += 1
    ) {
      if (
        hasSetValue(
          observedCapabilities,
          rule.capabilities[capabilityIndex],
        )
      ) {
        return forbidden(rule.reason);
      }
    }
  }

  for (
    let index = 0;
    index < ALWAYS_FORBIDDEN_CAPABILITIES.length;
    index += 1
  ) {
    const prohibition = ALWAYS_FORBIDDEN_CAPABILITIES[index];
    if (hasSetValue(observedCapabilities, prohibition[0])) {
      return forbidden(prohibition[1]);
    }
  }

  for (
    let recordIndex = 0;
    recordIndex < records.length;
    recordIndex += 1
  ) {
    const record = validatedRecords[recordIndex];
    let hasEvidenceCapability = false;
    let hasPurposeLimitedException = false;
    for (
      let capabilityIndex = 0;
      capabilityIndex < record.capabilityIds.length;
      capabilityIndex += 1
    ) {
      const capabilityId = plainArrayValue(
        record.capabilityIds,
        capabilityIndex,
      );
      if (arrayContains(EVIDENCE_CAPABILITIES, capabilityId)) {
        hasEvidenceCapability = true;
      }
      if (
        hasPrefix(capabilityId, "authority.") ||
        hasPrefix(capabilityId, "backup.") ||
        hasPrefix(capabilityId, "migration028.") ||
        hasPrefix(capabilityId, "native.")
      ) {
        hasPurposeLimitedException = true;
      }
    }

    if (hasEvidenceCapability) {
      if (record.packagingScope !== "evidence_only") {
        return forbidden("stage2_scope_evidence_packaging_forbidden");
      }
      if (record.productAuthority) {
        return forbidden("stage2_scope_evidence_product_authority_forbidden");
      }
    }

    if (record.productAuthority && hasPurposeLimitedException) {
      return forbidden(
        "stage2_scope_exception_product_authority_forbidden",
      );
    }
  }

  return result(
    "requires_authoritative_scan",
    "stage2_scope_full_scan_required",
  );
}
