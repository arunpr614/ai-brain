import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDisposableStage2NativeRouteProof,
} from "./native-bridge-proof";
import type {
  DisposableNativeBridgeProofEvidence,
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
const TEMP_BUILD_PREFIX = "brain-s28-disposable-native-bridge-";

let proofPromise:
  | Promise<DisposableNativeBridgeProofEvidence>
  | undefined;

function proof(): Promise<DisposableNativeBridgeProofEvidence> {
  proofPromise ??= runDisposableStage2NativeRouteProof();
  return proofPromise;
}

function disposablePrefixSnapshot(): string[] {
  return readdirSync(tmpdir(), { withFileTypes: true })
    .filter((entry) => entry.name.startsWith(TEMP_BUILD_PREFIX))
    .map((entry) =>
      `${entry.name}:${entry.isDirectory() ? "directory" : "non-directory"}`
    )
    .sort();
}

test("real production NODE_ENV cannot be overridden by a caller", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    await assert.rejects(
      (runDisposableStage2NativeRouteProof as UnsafeProofCall)({
        runtimeEnvironment: "test",
      }),
      /production NODE_ENV is forbidden and cannot be overridden/,
    );
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    }
  }
});

test("closed proof accepts no external artifact, database, Symbol, or path", async () => {
  const spoofedOwner = {
    _stage2DisposableBridgeProbe: () =>
      JSON.stringify({ bridgePresent: true }),
  };
  await assert.rejects(
    (runDisposableStage2NativeRouteProof as UnsafeProofCall)({
      bindingPath: "/tmp/untrusted.node",
      buildManifestPath: "/tmp/self-edited.json",
      database: {
        [Symbol("spoofed-cppdb")]: spoofedOwner,
      },
      runtimeEnvironment: "test",
    }),
    /external artifacts, databases, paths, and overrides are forbidden/,
  );
});

test("a compiler exit after mkdtemp leaves no disposable build residue", () => {
  const before = disposablePrefixSnapshot();
  const failedBuild = spawnSync(
    process.execPath,
    [BUILD_SCRIPT_PATH],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        CC: process.execPath,
      },
      timeout: 120_000,
    },
  );
  assert.equal(failedBuild.error, undefined);
  assert.notEqual(failedBuild.status, 0);
  assert.match(
    failedBuild.stderr,
    /Disposable native bridge build refused: [^\n]+ exited \d+/,
  );
  assert.deepEqual(disposablePrefixSnapshot(), before);
});

test("independent pinned builds and exact cppdb owner produce evidence only", async () => {
  const evidence = await proof();
  assert.equal(evidence.format, "brain-s28-disposable-native-route-proof-v2");
  assert.equal(evidence.readinessClaim, "none");
  assert.equal(evidence.disposableOnly, true);
  assert.equal(evidence.provenance.independentBuildCount, 2);
  assert.equal(evidence.provenance.independentModuleHashesEqual, true);
  assert.equal(evidence.provenance.transformedWrapperHashesEqual, true);
  assert.match(evidence.provenance.moduleSha256, /^[a-f0-9]{64}$/);
  assert.equal(evidence.bridge.sqlTripwirePresent, true);
  assert.equal(evidence.bridge.exactCppdbOwnerUsed, true);
  assert.equal(evidence.bridge.injectedSymbolOwnerIgnored, true);
  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(Object.isFrozen(evidence.provenance), true);
  assert.equal("db" in evidence, false);
  assert.equal("bindingPath" in evidence, false);
  assert.equal("buildManifestPath" in evidence, false);
  assert.equal(evidence.rawDatabaseReturned, false);
  assert.equal(evidence.artifactPathsReturned, false);
});

test("native public surface cannot attach, vacuum, back up, or load extensions", async () => {
  const evidence = await proof();
  assert.deepEqual(
    {
      genericSqlWriteRefused:
        evidence.negativeControls.genericSqlWriteRefused,
      attachRefusedWithoutFile:
        evidence.negativeControls.attachRefusedWithoutFile,
      vacuumIntoRefusedWithoutFile:
        evidence.negativeControls.vacuumIntoRefusedWithoutFile,
      backupRefusedWithoutFile:
        evidence.negativeControls.backupRefusedWithoutFile,
      loadExtensionRefused:
        evidence.negativeControls.loadExtensionRefused,
    },
    {
      genericSqlWriteRefused: true,
      attachRefusedWithoutFile: true,
      vacuumIntoRefusedWithoutFile: true,
      backupRefusedWithoutFile: true,
      loadExtensionRefused: true,
    },
  );
});

test("self-edited manifest and appended binary trailer fail the rebuild anchor", async () => {
  const evidence = await proof();
  assert.equal(
    evidence.negativeControls.selfConsistentTamperedArtifactRefused,
    true,
  );
});

test("closed native probes exercise denial and all four observer outcomes", async () => {
  const evidence = await proof();
  assert.equal(
    evidence.scenarios["authorizer-denial"].authorizerDenied,
    true,
  );
  assert.equal(evidence.scenarios["observer-open"].outcome, "open");
  assert.equal(
    evidence.scenarios["observer-committed"].outcome,
    "committed",
  );
  assert.equal(
    evidence.scenarios["observer-committed"].commitStepCode,
    101,
  );
  assert.equal(
    evidence.scenarios["observer-rolled-back"].outcome,
    "rolled_back",
  );
  assert.equal(
    evidence.scenarios["observer-indeterminate"].outcome,
    "indeterminate",
  );
  assert.equal(evidence.s28ReadinessProven, false);
  assert.equal(evidence.implementationGoProven, false);
});
