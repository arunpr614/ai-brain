import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import Database from "better-sqlite3";
import {
  assertDisposableNativeProofEvidence,
  runDisposableStage2NativeRouteProof,
} from "./native-bridge-proof";
import {
  DISPOSABLE_NATIVE_PROBE_SCENARIOS,
  type DisposableNativeBridgeProofEvidence,
} from "./native-bridge";

type UnsafeProofCall = (
  ...inputs: unknown[]
) => Promise<DisposableNativeBridgeProofEvidence>;

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
const BUILD_SCRIPT_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-native-bridge.mjs",
);
const WORKER_PATH = join(
  REPO_ROOT,
  "scripts",
  "run-youtube-stage2-native-bridge-proof-worker.mjs",
);
const PINNED_NODE =
  "/opt/homebrew/Cellar/node@22/22.22.3/bin/node";
const BUILD_TEMP_PREFIX = "brain-s28-disposable-native-bridge-";
const PROOF_TEMP_PREFIX =
  `brain-s28-sealed-proof-${process.pid}-`;
let proofPromise:
  | Promise<DisposableNativeBridgeProofEvidence>
  | undefined;

function proof(): Promise<DisposableNativeBridgeProofEvidence> {
  proofPromise ??= runDisposableStage2NativeRouteProof();
  return proofPromise;
}

function disposableSnapshot(prefixes: readonly string[]): string[] {
  return readdirSync(tmpdir(), { withFileTypes: true })
    .filter((entry) =>
      prefixes.some((prefix) => entry.name.startsWith(prefix))
    )
    .map((entry) =>
      `${entry.name}:${entry.isDirectory() ? "directory" : "non-directory"}`
    )
    .sort();
}

function restoreEnvironment(
  key: string,
  previous: string | undefined,
): void {
  if (previous === undefined) {
    Reflect.deleteProperty(process.env, key);
  } else {
    Reflect.set(process.env, key, previous);
  }
}

test("real production NODE_ENV cannot be overridden by a caller", async () => {
  const previous = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    await assert.rejects(
      (runDisposableStage2NativeRouteProof as UnsafeProofCall)({
        runtimeEnvironment: "test",
      }),
      /production NODE_ENV is forbidden and cannot be overridden/,
    );
  } finally {
    restoreEnvironment("NODE_ENV", previous);
  }
});

test("closed controller accepts no artifact, database, path, or override", async () => {
  await assert.rejects(
    (runDisposableStage2NativeRouteProof as UnsafeProofCall)({
      bindingPath: "/tmp/untrusted.node",
      database: {},
      runtimeEnvironment: "test",
    }),
    /external artifacts, databases, paths, and overrides are forbidden/,
  );
});

test("ambient compiler overrides are refused before disposable build creation", () => {
  const failed = spawnSync(process.execPath, [BUILD_SCRIPT_PATH], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      CC: process.execPath,
    },
    timeout: 120_000,
  });
  assert.equal(failed.error, undefined);
  assert.notEqual(failed.status, 0);
  assert.match(
    failed.stderr,
    /ambient build override is forbidden: CC/,
  );
  assert.equal(typeof failed.pid, "number");
  assert.deepEqual(
    disposableSnapshot([
      `${BUILD_TEMP_PREFIX}${failed.pid}-`,
    ]),
    [],
  );
});

test("proof worker rejects argv before building", () => {
  const root = mkdtempSync(
    join(tmpdir(), "brain-s28-sealed-proof-test-"),
  );
  try {
    const failed = spawnSync(PINNED_NODE, [WORKER_PATH, "forbidden"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        LANG: "C",
        LC_ALL: "C",
        NODE_ENV: "test",
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        TMPDIR: root,
      },
      timeout: 30_000,
    });
    assert.equal(failed.error, undefined);
    assert.notEqual(failed.status, 0);
    assert.equal(failed.stdout, "");
    assert.equal(
      failed.stderr,
      "Disposable native proof worker refused.\n",
    );
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("sealed child ignores parent prototype and preload poisoning", async () => {
  const before = disposableSnapshot([PROOF_TEMP_PREFIX]);
  const poisonDirectory = mkdtempSync(
    join(tmpdir(), "brain-s28-parent-poison-"),
  );
  const preloadPath = join(poisonDirectory, "preload.cjs");
  const sentinelPath = join(poisonDirectory, "sentinel");
  writeFileSync(
    preloadPath,
    `require("node:fs").writeFileSync(${JSON.stringify(
      sentinelPath,
    )}, "loaded")\n`,
  );

  const prototype = Database.prototype as unknown as Record<
    string,
    unknown
  >;
  const descriptors = new Map(
    ["close", "prepare", "exec"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(prototype, key),
    ]),
  );
  const captured: unknown[] = [];
  for (const key of descriptors.keys()) {
    Reflect.set(prototype, key, function poisoned(this: unknown) {
      captured.push(this);
      throw new Error(`parent prototype ${key} was called`);
    });
  }

  const previousNodeOptions = process.env.NODE_OPTIONS;
  const previousNodePath = process.env.NODE_PATH;
  const previousCc = process.env.CC;
  const previousCxx = process.env.CXX;
  let sentinelCreated = false;
  Reflect.set(process.env, "NODE_OPTIONS", `--require=${preloadPath}`);
  Reflect.set(process.env, "NODE_PATH", poisonDirectory);
  Reflect.set(process.env, "CC", "/tmp/poison-cc");
  Reflect.set(process.env, "CXX", "/tmp/poison-cxx");
  try {
    proofPromise = runDisposableStage2NativeRouteProof();
    const evidence = await proofPromise;
    assert.equal(evidence.bridge.sealedChildProcess, true);
    sentinelCreated = existsSync(sentinelPath);
  } finally {
    restoreEnvironment("NODE_OPTIONS", previousNodeOptions);
    restoreEnvironment("NODE_PATH", previousNodePath);
    restoreEnvironment("CC", previousCc);
    restoreEnvironment("CXX", previousCxx);
    for (const [key, descriptor] of descriptors) {
      if (descriptor !== undefined) {
        Object.defineProperty(prototype, key, descriptor);
      }
    }
    rmSync(poisonDirectory, { recursive: true, force: true });
  }
  assert.deepEqual(captured, []);
  assert.equal(sentinelCreated, false);
  assert.deepEqual(
    disposableSnapshot([PROOF_TEMP_PREFIX]),
    before,
  );
});

test("independent builds return immutable evidence without handles or paths", async () => {
  const evidence = await proof();
  assert.equal(
    evidence.format,
    "brain-s28-disposable-native-route-proof-v5",
  );
  assert.equal(evidence.readinessClaim, "none");
  assert.equal(evidence.disposableOnly, true);
  assert.equal(evidence.provenance.independentBuildCount, 2);
  assert.equal(evidence.provenance.independentModuleHashesEqual, true);
  assert.equal(evidence.provenance.transformedWrapperHashesEqual, true);
  assert.match(evidence.provenance.moduleSha256, /^[a-f0-9]{64}$/);
  assert.equal(evidence.bridge.sqlTripwirePresent, true);
  assert.equal(evidence.bridge.directNativeOwnerUsed, true);
  assert.equal(evidence.bridge.closedAddonSurfaceAttested, true);
  assert.equal(evidence.bridge.immutableNativeSurfaceAttested, true);
  assert.equal(evidence.lifecycle.allScenarioConnectionsClosed, true);
  assert.equal(
    evidence.lifecycle.scenarioConnectionCount,
    DISPOSABLE_NATIVE_PROBE_SCENARIOS.length,
  );
  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(Object.isFrozen(evidence.provenance), true);
  assert.equal("db" in evidence, false);
  assert.equal("bindingPath" in evidence, false);
  assert.equal("pid" in evidence, false);
  assert.equal(evidence.rawDatabaseReturned, false);
  assert.equal(evidence.artifactPathsReturned, false);
  assert.equal(evidence.processIdentifiersReturned, false);
});

test("native surface and constructor matrix fail closed without files", async () => {
  const evidence = await proof();
  for (const value of Object.values(evidence.negativeControls)) {
    assert.equal(value, true);
  }
  assert.equal(
    evidence.negativeControls.noConstructorNegativeCreatedAFile,
    true,
  );
  assert.equal(
    evidence.negativeControls.selfConsistentTamperedArtifactRefused,
    true,
  );
});

test("all observer classes carry exact commit and quarantine evidence", async () => {
  const evidence = await proof();
  const open = evidence.scenarios["observer-open"];
  assert.deepEqual(
    {
      outcome: open.outcome,
      autocommit: open.autocommit,
      transactionState: open.transactionState,
      commitAttempted: open.commitAttempted,
      commitPrepareCount: open.commitPrepareCount,
      commitStepCount: open.commitStepCount,
      commitFinalizeCount: open.commitFinalizeCount,
      commitStepCode: open.commitStepCode,
      commitFinalizeCode: open.commitFinalizeCode,
      postClassificationSqlCount: open.postClassificationSqlCount,
      cleanupRollbackAttested: open.cleanupRollbackAttested,
      commitRefusalOpenClassifierAttested:
        open.commitRefusalOpenClassifierAttested,
      unfinalizedCommitClassifierRefused:
        open.unfinalizedCommitClassifierRefused,
    },
    {
      outcome: "open",
      autocommit: 0,
      transactionState: 2,
      commitAttempted: false,
      commitPrepareCount: 0,
      commitStepCount: 0,
      commitFinalizeCount: 0,
      commitStepCode: -1,
      commitFinalizeCode: -1,
      postClassificationSqlCount: 8,
      cleanupRollbackAttested: true,
      commitRefusalOpenClassifierAttested: true,
      unfinalizedCommitClassifierRefused: true,
    },
  );

  const committed = evidence.scenarios["observer-committed"];
  assert.deepEqual(
    {
      outcome: committed.outcome,
      commitHookCalls: committed.commitHookCalls,
      rollbackHookCalls: committed.rollbackHookCalls,
      commitAttempted: committed.commitAttempted,
      commitPrepareCount: committed.commitPrepareCount,
      commitStepCount: committed.commitStepCount,
      commitFinalizeCount: committed.commitFinalizeCount,
      commitStepCode: committed.commitStepCode,
      commitFinalizeCode: committed.commitFinalizeCode,
      finalizeErrorClassifierAttested:
        committed.finalizeErrorClassifierAttested,
    },
    {
      outcome: "committed",
      commitHookCalls: 1,
      rollbackHookCalls: 0,
      commitAttempted: true,
      commitPrepareCount: 1,
      commitStepCount: 1,
      commitFinalizeCount: 1,
      commitStepCode: 101,
      commitFinalizeCode: 0,
      finalizeErrorClassifierAttested: true,
    },
  );
  assert.equal(
    evidence.scenarios["observer-rolled-back"].outcome,
    "rolled_back",
  );

  for (const scenario of [
    "observer-indeterminate",
    "observer-stale-nonce",
    "observer-double-event",
  ] as const) {
    const result = evidence.scenarios[scenario];
    assert.equal(result.outcome, "indeterminate");
    assert.equal(result.quarantineRequired, true);
    assert.equal(result.autocommit, 0);
    assert.equal(result.transactionState, 2);
    assert.equal(result.postClassificationSqlCount, 0);
    assert.equal(result.pragmaAfterAttempted, false);
  }
  assert.equal(
    evidence.scenarios["observer-indeterminate"]
      .hooksPresentAtClassification,
    false,
  );
  assert.equal(
    evidence.scenarios["observer-stale-nonce"]
      .nonceMatchedAtClassification,
    false,
  );
  assert.equal(
    evidence.scenarios["observer-double-event"].commitHookCalls,
    2,
  );
  assert.equal(
    evidence.scenarios["observer-double-event"].observerInvalid,
    true,
  );
  assert.equal(
    evidence.scenarios["observer-arm-refused"].observerRefused,
    true,
  );
  assert.equal(
    evidence.scenarios["observer-statement-arm-refused"]
      .observerRefused,
    true,
  );
});

test("one exact prepared role succeeds and all exercised lifecycle drift closes", async () => {
  const evidence = await proof();
  const accepted = evidence.scenarios["prepared-role"];
  assert.deepEqual(
    {
      outcome: accepted.outcome,
      roleAttested: accepted.roleAttested,
      roleRefused: accepted.roleRefused,
      roleAuthorizerCalls: accepted.roleAuthorizerCalls,
      roleAuthorizerDenials: accepted.roleAuthorizerDenials,
      prepareCount: accepted.prepareCount,
      bindValidationCount: accepted.bindValidationCount,
      bindValidationDenials: accepted.bindValidationDenials,
      bindCount: accepted.bindCount,
      stepCount: accepted.stepCount,
      finalizeCount: accepted.finalizeCount,
      roleStepCode: accepted.roleStepCode,
      roleFinalizeCode: accepted.roleFinalizeCode,
      outerChanges: accepted.outerChanges,
    },
    {
      outcome: "rolled_back",
      roleAttested: true,
      roleRefused: false,
      roleAuthorizerCalls: 1,
      roleAuthorizerDenials: 0,
      prepareCount: 1,
      bindValidationCount: 1,
      bindValidationDenials: 0,
      bindCount: 2,
      stepCount: 1,
      finalizeCount: 1,
      roleStepCode: 101,
      roleFinalizeCode: 0,
      outerChanges: 1,
    },
  );

  for (const scenario of [
    "prepared-role-bind-root-key-refused",
    "prepared-role-bind-value-refused",
    "prepared-role-bind-key-type-refused",
    "prepared-role-bind-value-type-refused",
    "prepared-role-bind-count-missing-refused",
    "prepared-role-bind-count-extra-refused",
  ] as const) {
    const bind = evidence.scenarios[scenario];
    assert.equal(bind.roleRefused, true);
    assert.equal(bind.bindValidationCount, 1);
    assert.equal(bind.bindValidationDenials, 1);
    assert.equal(bind.bindCount, 0);
    assert.equal(bind.stepCount, 0);
    assert.equal(bind.finalizeCount, 1);
    assert.equal(bind.outerChanges, 0);
  }

  const sql = evidence.scenarios["prepared-role-sql-refused"];
  assert.equal(sql.roleRefused, true);
  assert.equal(sql.prepareCount, 0);
  assert.equal(sql.finalizeCount, 0);

  const trace = evidence.scenarios["prepared-role-trace-refused"];
  assert.equal(trace.roleRefused, true);
  assert.equal(trace.roleAuthorizerCalls, 1);
  assert.equal(trace.roleAuthorizerDenials, 1);
  assert.equal(trace.stepCount, 0);

  const finalize =
    evidence.scenarios["prepared-role-step-finalize-refused"];
  assert.equal(finalize.roleRefused, true);
  assert.equal(finalize.stepCount, 1);
  assert.equal(finalize.finalizeCount, 1);
  assert.equal(finalize.roleStepCode, 1555);
  assert.equal(finalize.roleFinalizeCode, 1555);
  assert.equal(finalize.outerChanges, 0);

  const reprepare =
    evidence.scenarios["prepared-role-auto-reprepare-refused"];
  assert.equal(reprepare.roleRefused, true);
  assert.equal(reprepare.roleAuthorizerCalls, 2);
  assert.equal(reprepare.roleAuthorizerDenials, 1);
  assert.equal(reprepare.bindCount, 2);
  assert.equal(reprepare.stepCount, 1);
  assert.equal(reprepare.finalizeCount, 1);
  assert.equal(reprepare.roleStepCode, 23);
  assert.equal(reprepare.roleFinalizeCode, 23);
  assert.equal(reprepare.outerChanges, 0);

  const lifecycleExpectations = {
    "prepared-role-replay-refused": [1, 0, 0],
    "prepared-role-reset-refused": [0, 1, 0],
    "prepared-role-rebind-refused": [0, 0, 1],
  } as const;
  for (
    const [scenario, attempts] of
      Object.entries(lifecycleExpectations)
  ) {
    const result =
      evidence.scenarios[
        scenario as keyof typeof lifecycleExpectations
      ];
    assert.equal(result.roleAttested, true);
    assert.equal(result.roleRefused, true);
    assert.equal(result.prepareCount, 1);
    assert.equal(result.bindCount, 2);
    assert.equal(result.stepCount, 1);
    assert.equal(result.finalizeCount, 1);
    assert.deepEqual(
      [
        result.replayAttemptCount,
        result.resetAttemptCount,
        result.rebindAttemptCount,
      ],
      attempts,
    );
    assert.equal(result.replayOperationCount, 0);
    assert.equal(result.resetOperationCount, 0);
    assert.equal(result.rebindOperationCount, 0);
  }
});

test("controller semantic validator rejects one-field proof mutations", async () => {
  const evidence = await proof();
  const mutations: Array<
    [
      string,
      (copy: DisposableNativeBridgeProofEvidence) => void,
    ]
  > = [
    [
      "wrong outcome",
      (copy) => {
        Reflect.set(
          copy.scenarios["observer-open"],
          "outcome",
          "committed",
        );
      },
    ],
    [
      "negative counter",
      (copy) => {
        Reflect.set(
          copy.scenarios["prepared-role"],
          "bindCount",
          -1,
        );
      },
    ],
    [
      "false pragma",
      (copy) => {
        Reflect.set(
          copy.scenarios["observer-indeterminate"],
          "pragmaBeforeAttested",
          false,
        );
      },
    ],
    [
      "incoherent commit count",
      (copy) => {
        Reflect.set(
          copy.scenarios["observer-committed"],
          "commitStepCount",
          0,
        );
      },
    ],
    [
      "unfinalized COMMIT classifier accepted",
      (copy) => {
        Reflect.set(
          copy.scenarios["observer-open"],
          "unfinalizedCommitClassifierRefused",
          false,
        );
      },
    ],
    [
      "wrong prepared failure mechanism",
      (copy) => {
        Reflect.set(
          copy.scenarios[
            "prepared-role-step-finalize-refused"
          ],
          "roleStepCode",
          5,
        );
      },
    ],
    [
      "replay conflated with reset",
      (copy) => {
        Reflect.set(
          copy.scenarios["prepared-role-replay-refused"],
          "resetAttemptCount",
          1,
        );
      },
    ],
    [
      "wrong quarantine",
      (copy) => {
        Reflect.set(
          copy.scenarios["observer-stale-nonce"],
          "quarantineRequired",
          false,
        );
      },
    ],
    [
      "extra evidence field",
      (copy) => {
        Reflect.set(copy, "bindingPath", "/tmp/forbidden");
      },
    ],
  ];
  for (const [label, mutate] of mutations) {
    const copy = structuredClone(evidence);
    mutate(copy);
    assert.throws(
      () => assertDisposableNativeProofEvidence(copy),
      label,
    );
  }
});
