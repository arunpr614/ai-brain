import assert from "node:assert/strict";
import test from "node:test";
import { types as nodeUtilTypes } from "node:util";

import { evaluateStage2ScopeObservations } from "./scope-policy.mjs";

function observation(capabilityIds, overrides = {}) {
  return {
    path: "src/lib/processing/stage2-policy-primitive.ts",
    status: "A",
    artifact_kind: "source",
    packaging_scope: "source_only",
    product_authority: false,
    capability_ids: [...capabilityIds].sort(),
    ...overrides,
  };
}

function evaluate(capabilityIds, overrides = {}) {
  return evaluateStage2ScopeObservations([
    observation(capabilityIds, overrides),
  ]);
}

function assertForbidden(actual, reason) {
  assert.deepEqual(actual, {
    classification: "forbidden",
    reason,
  });
  assert.ok(Object.isFrozen(actual));
}

function assertRequiresAuthoritativeScan(actual) {
  assert.deepEqual(actual, {
    classification: "requires_authoritative_scan",
    reason: "stage2_scope_full_scan_required",
  });
  assert.ok(Object.isFrozen(actual));
  const serialized = JSON.stringify(actual);
  assert.equal(serialized.includes("S2-AC-15/"), false);
  assert.equal(serialized.includes("stage2_scope_absence_contract"), false);
}

test("keeps ordinary Stage 2 primitives non-authorizing", () => {
  assertRequiresAuthoritativeScan(
    evaluate([
      "stage2.evidence_protocol",
      "stage2.fingerprint_framing",
      "stage2.item_instance_allocator",
      "stage2.migration_admission_gate",
      "stage2.test_only_primitive",
    ]),
  );
});

test("classifies every deferred browser capability with one closed reason", () => {
  const capabilities = [
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
  ];
  for (const capability of capabilities) {
    assertForbidden(
      evaluate([capability]),
      "stage2_scope_browser_surface_forbidden",
    );
  }
});

test("classifies every deferred migration-029/manual capability", () => {
  const capabilities = [
    "manual029.acceptance_fixture",
    "manual029.accepted_authorization_context",
    "manual029.accepted_authorization_snapshot",
    "manual029.adapter",
    "manual029.application_reader",
    "manual029.application_writer",
    "manual029.attempt",
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
  ];
  for (const capability of capabilities) {
    assertForbidden(
      evaluate([capability]),
      "stage2_scope_manual_029_surface_forbidden",
    );
  }
});

test("rejects a migration-029 acceptance fixture even when test-only", () => {
  assertForbidden(
    evaluate(["manual029.acceptance_fixture"], {
      path: "scripts/stage2/fixtures/manual-enrichment.test.mjs",
      artifact_kind: "fixture",
      packaging_scope: "test_only",
    }),
    "stage2_scope_manual_029_surface_forbidden",
  );
});

test("classifies the remaining direct prohibition families", () => {
  const cases = [
    [
      "browser.client_cache",
      "stage2_scope_client_cache_restriction_forbidden",
    ],
    ["sqlite.native_fork", "stage2_scope_sqlite_fork_forbidden"],
    [
      "backup.general_engine_replacement",
      "stage2_scope_backup_engine_replacement_forbidden",
    ],
    [
      "os.production_containment",
      "stage2_scope_production_os_containment_forbidden",
    ],
    [
      "control.general_external_product",
      "stage2_scope_general_control_plane_forbidden",
    ],
    [
      "control.general_external_recovery",
      "stage2_scope_general_control_plane_forbidden",
    ],
    [
      "evidence.other_os_isolation_fixture",
      "stage2_scope_non_ac13_os_fixture_forbidden",
    ],
    [
      "evidence.other_native_fixture",
      "stage2_scope_non_ac17_native_fixture_forbidden",
    ],
  ];
  for (const [capability, reason] of cases) {
    assertForbidden(evaluate([capability]), reason);
  }
});

test("keeps the exact narrow native bridge subset non-authorizing", () => {
  assertRequiresAuthoritativeScan(
    evaluate(
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
        "stage2.native_bridge_proof",
      ],
      {
        path: "native/brain-s28-bridge/src/brain_s28_bridge.cpp",
        artifact_kind: "native_bridge",
      },
    ),
  );
});

test("rejects every native bridge excess-authority capability", () => {
  const capabilities = [
    "native.checkpoint_control",
    "native.extra_schema_udf",
    "native.generic_database_authority",
    "native.generic_hook_api",
    "native.schema_sql",
    "native.sqlite_modification",
    "native.stateful_schema_udf",
    "native.transaction_control",
  ];
  for (const capability of capabilities) {
    assertForbidden(
      evaluate([capability], { artifact_kind: "native_bridge" }),
      "stage2_scope_native_bridge_excess_authority_forbidden",
    );
  }
});

test("rejects every general API capability even inside an exact exception", () => {
  const capabilities = [
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
  ];
  for (const capability of capabilities) {
    assertForbidden(
      evaluate(["authority.stable_store_locator", capability], {
        artifact_kind: "authority_protocol",
      }),
      "stage2_scope_general_api_forbidden",
    );
  }
});

test("permits evidence exceptions only as non-authorizing candidates", () => {
  for (const capability of [
    "evidence.ac13_qemu_fixture",
    "evidence.ac17_darwin_fixture",
    "evidence.host_attestation_plane",
    "evidence.host_private_signing_material",
    "evidence.host_signing_handle",
    "evidence.launcher_signing_handle",
  ]) {
    assertRequiresAuthoritativeScan(
      evaluate([capability], {
        artifact_kind: "fixture",
        packaging_scope: "evidence_only",
      }),
    );
  }
});

test("rejects evidence exceptions from production packaging", () => {
  for (const capability of [
    "evidence.ac13_qemu_fixture",
    "evidence.ac17_darwin_fixture",
    "evidence.host_attestation_plane",
    "evidence.host_private_signing_material",
    "evidence.host_signing_handle",
    "evidence.launcher_signing_handle",
  ]) {
    assertForbidden(
      evaluate([capability], {
        artifact_kind: "package_entry",
        packaging_scope: "production",
      }),
      "stage2_scope_evidence_packaging_forbidden",
    );
  }
});

test("rejects evidence exceptions outside the exact evidence-only scope", () => {
  for (const packaging_scope of ["source_only", "test_only"]) {
    assertForbidden(
      evaluate(["evidence.ac13_qemu_fixture"], {
        artifact_kind: "fixture",
        packaging_scope,
      }),
      "stage2_scope_evidence_packaging_forbidden",
    );
  }
});

test("rejects product authority on evidence exceptions", () => {
  assertForbidden(
    evaluate(["evidence.host_attestation_plane"], {
      artifact_kind: "fixture",
      packaging_scope: "evidence_only",
      product_authority: true,
    }),
    "stage2_scope_evidence_product_authority_forbidden",
  );
});

test("rejects product authority on purpose-limited exceptions", () => {
  const cases = [
    ["authority.stable_store_locator", "authority_protocol"],
    ["backup.fixed_snapshot", "backup_change"],
    ["migration028.extension_capture_requests_inert", "migration"],
    [
      "native.brain_s28_bridge_present_constant_innocuous",
      "native_bridge",
    ],
  ];
  for (const [capability, artifact_kind] of cases) {
    assertForbidden(
      evaluate([capability], {
        artifact_kind,
        product_authority: true,
      }),
      "stage2_scope_exception_product_authority_forbidden",
    );
  }

  assertRequiresAuthoritativeScan(
    evaluate(["stage2.automatic_recovery"], {
      product_authority: true,
    }),
  );
});

test("keeps exact migration-028 inert exceptions non-authorizing", () => {
  assertRequiresAuthoritativeScan(
    evaluate(
      [
        "migration028.backup_content_free_intent_or_journal",
        "migration028.extension_capture_requests_inert",
        "migration028.item_artifact_cleanup_jobs_purpose_limited",
        "migration028.item_delete_commands_zero_row_view",
        "migration028.item_delete_permits_transaction_transient",
        "migration028.item_deletion_request_tombstones_five_field",
        "migration028.item_deletion_requests_item_owned",
        "migration028.item_request_tombstones_five_field",
      ],
      {
        path: "src/db/migrations/028_youtube_browser_transcript.sql",
        artifact_kind: "migration",
      },
    ),
  );
});

test("keeps exact backup and authority exceptions non-authorizing", () => {
  assertRequiresAuthoritativeScan(
    evaluate(
      [
        "authority.authenticated_chained_receipt",
        "authority.database_hash_identity_cas",
        "authority.stable_store_locator",
        "backup.fixed_snapshot",
        "backup.fresh_logical_sanitized_image_builder",
        "backup.owned_publication_recovery_shared_lock",
        "backup.physical_parser",
        "backup.zero_outbox_zero_permit_barrier",
      ],
      { artifact_kind: "backup_change" },
    ),
  );
});

test("applies a fixed deny-wins precedence independent of observation order", () => {
  const candidate = observation(["migration028.extension_capture_requests_inert"], {
    path: "src/db/migrations/028_youtube_browser_transcript.sql",
    artifact_kind: "migration",
  });
  const browser = observation(["browser.dom_integration"], {
    path: "src/lib/youtube-browser/dom.ts",
  });
  const manual = observation(["manual029.worker"], {
    path: "src/lib/manual-enrichment/worker.ts",
  });

  for (const inventory of [
    [candidate, manual, browser],
    [browser, candidate, manual],
    [manual, browser, candidate],
  ]) {
    assertForbidden(
      evaluateStage2ScopeObservations(inventory),
      "stage2_scope_browser_surface_forbidden",
    );
  }
});

test("fails closed on invalid inventory shape and an empty inventory", () => {
  for (const inventory of [null, {}, "fixture", Object.create(null)]) {
    assertForbidden(
      evaluateStage2ScopeObservations(inventory),
      "stage2_scope_inventory_invalid",
    );
  }
  assertForbidden(
    evaluateStage2ScopeObservations([]),
    "stage2_scope_inventory_empty",
  );

  const accessorInventory = [observation(["stage2.test_only_primitive"])];
  Object.defineProperty(accessorInventory, "0", {
    enumerable: true,
    get() {
      return observation(["stage2.test_only_primitive"]);
    },
  });
  assertForbidden(
    evaluateStage2ScopeObservations(accessorInventory),
    "stage2_scope_inventory_invalid",
  );
});

test("fails closed on non-plain, accessor, missing, and extra observations", () => {
  const nonPlain = Object.create(null);
  Object.assign(nonPlain, observation(["stage2.test_only_primitive"]));
  assertForbidden(
    evaluateStage2ScopeObservations([nonPlain]),
    "stage2_scope_observation_invalid",
  );

  const accessor = observation(["stage2.test_only_primitive"]);
  Object.defineProperty(accessor, "path", {
    enumerable: true,
    get() {
      return "src/lib/hidden.ts";
    },
  });
  assertForbidden(
    evaluateStage2ScopeObservations([accessor]),
    "stage2_scope_observation_invalid",
  );

  const missing = observation(["stage2.test_only_primitive"]);
  delete missing.product_authority;
  assertForbidden(
    evaluateStage2ScopeObservations([missing]),
    "stage2_scope_observation_invalid",
  );

  const extra = {
    ...observation(["stage2.test_only_primitive"]),
    assertion_id: "S2-AC-15/stage2_scope_absence_contract",
  };
  assertForbidden(
    evaluateStage2ScopeObservations([extra]),
    "stage2_scope_observation_invalid",
  );
});

test("fails closed on every unsafe path family", () => {
  for (const path of [
    "",
    "/absolute.ts",
    "C:/absolute.ts",
    "src//double.ts",
    "src/./dot.ts",
    "src/../escape.ts",
    "src\\windows.ts",
    "src/\u0000nul.ts",
    `${"a".repeat(4097)}`,
  ]) {
    assertForbidden(
      evaluate(["stage2.test_only_primitive"], { path }),
      "stage2_scope_path_invalid",
    );
  }
});

test("fails closed on duplicate observation paths", () => {
  const duplicate = observation(["stage2.test_only_primitive"]);
  assertForbidden(
    evaluateStage2ScopeObservations([duplicate, { ...duplicate }]),
    "stage2_scope_observation_duplicate",
  );
});

test("fails closed on invalid status, kind, scope, and product authority", () => {
  assertForbidden(
    evaluate(["stage2.test_only_primitive"], { status: "R" }),
    "stage2_scope_status_invalid",
  );
  assertForbidden(
    evaluate(["stage2.test_only_primitive"], {
      artifact_kind: "browser",
    }),
    "stage2_scope_artifact_kind_invalid",
  );
  assertForbidden(
    evaluate(["stage2.test_only_primitive"], {
      packaging_scope: "release",
    }),
    "stage2_scope_packaging_scope_invalid",
  );
  assertForbidden(
    evaluate(["stage2.test_only_primitive"], {
      product_authority: 0,
    }),
    "stage2_scope_product_authority_invalid",
  );
});

test("fails closed on malformed, duplicate, unsorted, and unknown capability ids", () => {
  const malformedCases = [
    "stage2.test_only_primitive",
    ["stage2.test_only_primitive", "stage2.test_only_primitive"],
    ["stage2.test_only_primitive", "stage2.evidence_protocol"],
    ["Stage2.test_only_primitive"],
    ["stage2.test only"],
    ["stage2.évidence"],
  ];
  for (const capability_ids of malformedCases) {
    assertForbidden(
      evaluateStage2ScopeObservations([
        {
          ...observation([]),
          capability_ids,
        },
      ]),
      "stage2_scope_capability_ids_invalid",
    );
  }
  assertForbidden(
    evaluate(["stage2.future_unreviewed_capability"]),
    "stage2_scope_capability_unknown",
  );

  const accessorCapabilities = [];
  Object.defineProperty(accessorCapabilities, "0", {
    enumerable: true,
    get() {
      return "stage2.test_only_primitive";
    },
  });
  accessorCapabilities.length = 1;
  assertForbidden(
    evaluateStage2ScopeObservations([
      {
        ...observation([]),
        capability_ids: accessorCapabilities,
      },
    ]),
    "stage2_scope_capability_ids_invalid",
  );
});

test("accepts frozen plain data without mutating it", () => {
  const record = Object.freeze({
    ...observation(
      Object.freeze([
        "stage2.fingerprint_framing",
        "stage2.test_only_primitive",
      ]),
    ),
    capability_ids: Object.freeze([
      "stage2.fingerprint_framing",
      "stage2.test_only_primitive",
    ]),
  });
  const inventory = Object.freeze([record]);
  assertRequiresAuthoritativeScan(
    evaluateStage2ScopeObservations(inventory),
  );
});

test("requires deleted observations to contain no surviving capability", () => {
  assertRequiresAuthoritativeScan(
    evaluate([], {
      path: "src/lib/youtube-browser/deleted.ts",
      status: "D",
    }),
  );
  assertForbidden(
    evaluate(["browser.dom_integration"], {
      path: "src/lib/youtube-browser/deleted.ts",
      status: "D",
    }),
    "stage2_scope_deleted_observation_invalid",
  );
  assertForbidden(
    evaluate([], {
      path: "src/lib/youtube-browser/deleted.ts",
      status: "D",
      product_authority: true,
    }),
    "stage2_scope_deleted_observation_invalid",
  );
});

function trapCountingProxy(target) {
  const counter = { count: 0 };
  const trap = () => {
    counter.count += 1;
    throw new Error("proxy trap must not run");
  };
  return {
    counter,
    proxy: new Proxy(target, {
      defineProperty: trap,
      deleteProperty: trap,
      get: trap,
      getOwnPropertyDescriptor: trap,
      getPrototypeOf: trap,
      has: trap,
      isExtensible: trap,
      ownKeys: trap,
      preventExtensions: trap,
      set: trap,
      setPrototypeOf: trap,
    }),
  };
}

test("rejects Proxy arrays and records without invoking any trap", () => {
  const inventoryProxy = trapCountingProxy([]);
  const recordProxy = trapCountingProxy(
    observation(["browser.dom_integration"]),
  );
  const capabilityProxy = trapCountingProxy(["browser.dom_integration"]);
  const capabilityRecord = observation([]);
  capabilityRecord.capability_ids = capabilityProxy.proxy;

  const originalIsProxy = nodeUtilTypes.isProxy;
  let inventoryResult;
  let recordResult;
  let capabilityResult;
  try {
    nodeUtilTypes.isProxy = () => false;
    inventoryResult = evaluateStage2ScopeObservations(inventoryProxy.proxy);
    recordResult = evaluateStage2ScopeObservations([recordProxy.proxy]);
    capabilityResult = evaluateStage2ScopeObservations([capabilityRecord]);
  } finally {
    nodeUtilTypes.isProxy = originalIsProxy;
  }

  assertForbidden(inventoryResult, "stage2_scope_inventory_invalid");
  assertForbidden(recordResult, "stage2_scope_observation_invalid");
  assertForbidden(
    capabilityResult,
    "stage2_scope_capability_ids_invalid",
  );
  assert.equal(inventoryProxy.counter.count, 0);
  assert.equal(recordProxy.counter.count, 0);
  assert.equal(capabilityProxy.counter.count, 0);
});

test("preserves a browser denial after Set constructor and method mutation", () => {
  const browserInventory = [
    observation(["browser.dom_integration"]),
  ];
  const nativeSet = globalThis.Set;
  const setPrototype = nativeSet.prototype;
  const originalSetHas = setPrototype.has;
  const originalSetAdd = setPrototype.add;
  let browserResult;

  try {
    setPrototype.has = () => false;
    setPrototype.add = () => undefined;
    globalThis.Set = class PoisonedSet {
      constructor() {
        throw new Error("dynamic Set construction must not run");
      }
    };
    browserResult = evaluateStage2ScopeObservations(browserInventory);
  } finally {
    globalThis.Set = nativeSet;
    setPrototype.has = originalSetHas;
    setPrototype.add = originalSetAdd;
  }

  assertForbidden(
    browserResult,
    "stage2_scope_browser_surface_forbidden",
  );
});

test("preserves a direct denial after Map iterator mutation", () => {
  const sqliteInventory = [observation(["sqlite.native_fork"])];
  const mapPrototype = globalThis.Map.prototype;
  const originalMapIterator = mapPrototype[Symbol.iterator];
  let sqliteResult;

  try {
    mapPrototype[Symbol.iterator] = function* emptyMapIterator() {};
    sqliteResult = evaluateStage2ScopeObservations(sqliteInventory);
  } finally {
    mapPrototype[Symbol.iterator] = originalMapIterator;
  }

  assertForbidden(sqliteResult, "stage2_scope_sqlite_fork_forbidden");
});

test("preserves a browser denial after other runtime intrinsic mutation", () => {
  const inventory = [observation(["browser.dom_integration"])];
  const originalArrayIsArray = Array.isArray;
  const originalArrayIncludes = Array.prototype.includes;
  const originalArrayIterator = Array.prototype[Symbol.iterator];
  const originalArrayPush = Array.prototype.push;
  const originalArraySome = Array.prototype.some;
  const originalNumberIsSafeInteger = Number.isSafeInteger;
  const originalObjectFreeze = Object.freeze;
  const originalObjectGetOwnPropertyDescriptors =
    Object.getOwnPropertyDescriptors;
  const originalObjectGetPrototypeOf = Object.getPrototypeOf;
  const originalObjectHasOwn = Object.hasOwn;
  const originalReflectApply = Reflect.apply;
  const originalReflectOwnKeys = Reflect.ownKeys;
  const originalRegExpExec = RegExp.prototype.exec;
  const originalRegExpTest = RegExp.prototype.test;
  const originalString = globalThis.String;
  const originalStringSplit = String.prototype.split;
  const originalStringStartsWith = String.prototype.startsWith;
  let actual;

  try {
    Array.isArray = () => false;
    Array.prototype.includes = () => false;
    Array.prototype[Symbol.iterator] = function* emptyArrayIterator() {};
    Array.prototype.push = () => {
      throw new Error("dynamic Array.prototype.push must not run");
    };
    Array.prototype.some = () => false;
    Number.isSafeInteger = () => false;
    Object.freeze = (value) => value;
    Object.getOwnPropertyDescriptors = () => {
      throw new Error("dynamic descriptor lookup must not run");
    };
    Object.getPrototypeOf = () => null;
    Object.hasOwn = () => false;
    Reflect.apply = () => {
      throw new Error("dynamic Reflect.apply must not run");
    };
    Reflect.ownKeys = () => [];
    RegExp.prototype.exec = () => null;
    RegExp.prototype.test = () => false;
    globalThis.String = () => "poisoned";
    originalString.prototype.split = () => [];
    originalString.prototype.startsWith = () => false;
    actual = evaluateStage2ScopeObservations(inventory);
  } finally {
    Array.isArray = originalArrayIsArray;
    Array.prototype.includes = originalArrayIncludes;
    Array.prototype[Symbol.iterator] = originalArrayIterator;
    Array.prototype.push = originalArrayPush;
    Array.prototype.some = originalArraySome;
    Number.isSafeInteger = originalNumberIsSafeInteger;
    Object.freeze = originalObjectFreeze;
    Object.getOwnPropertyDescriptors =
      originalObjectGetOwnPropertyDescriptors;
    Object.getPrototypeOf = originalObjectGetPrototypeOf;
    Object.hasOwn = originalObjectHasOwn;
    Reflect.apply = originalReflectApply;
    Reflect.ownKeys = originalReflectOwnKeys;
    RegExp.prototype.exec = originalRegExpExec;
    RegExp.prototype.test = originalRegExpTest;
    globalThis.String = originalString;
    originalString.prototype.split = originalStringSplit;
    originalString.prototype.startsWith = originalStringStartsWith;
  }

  assertForbidden(actual, "stage2_scope_browser_surface_forbidden");
});
