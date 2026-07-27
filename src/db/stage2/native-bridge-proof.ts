import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256,
  DISPOSABLE_BRIDGE_PROOF_WORKER_SHA256,
  DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256,
  DISPOSABLE_NATIVE_PROBE_SCENARIOS,
  type DisposableNativeBridgeProofEvidence,
  type DisposableNativeProbeResult,
  type DisposableNativeProbeScenario,
} from "./native-bridge";

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
const SOURCE_MANIFEST_PATH = join(
  REPO_ROOT,
  "native",
  "brain-s28-bridge",
  "bridge-source-manifest.json",
);
const BUILD_SCRIPT_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-native-bridge.mjs",
);
const PROOF_WORKER_PATH = join(
  REPO_ROOT,
  "scripts",
  "run-youtube-stage2-native-bridge-proof-worker.mjs",
);
const EXPECTED_NODE_EXECUTABLE =
  "/opt/homebrew/Cellar/node@22/22.22.3/bin/node";
const EXPECTED_NODE_VERSION = "22.22.3";
const EXPECTED_NODE_ABI = "127";
const PROOF_FORMAT = "brain-s28-disposable-native-route-proof-v5";
const TEMP_PROOF_PREFIX =
  `brain-s28-sealed-proof-${process.pid}-`;
const MAX_WORKER_OUTPUT_BYTES = 2 * 1024 * 1024;
const CAPTURED_SPAWN = spawn;
const CAPTURED_READ_FILE_SYNC = readFileSync;
const CAPTURED_REALPATH_SYNC = realpathSync;
const CAPTURED_MKDTEMP_SYNC = mkdtempSync;
const CAPTURED_RM_SYNC = rmSync;
const CAPTURED_EXISTS_SYNC = existsSync;
const CAPTURED_LSTAT_SYNC = lstatSync;
const CAPTURED_JSON_PARSE = JSON.parse;
const CAPTURED_JSON_STRINGIFY = JSON.stringify;
const CAPTURED_OBJECT_FREEZE = Object.freeze;
const CAPTURED_OBJECT_KEYS = Object.keys;
const CAPTURED_OBJECT_VALUES = Object.values;
const CAPTURED_HOST_TEMP_ROOT = CAPTURED_REALPATH_SYNC(tmpdir());

const TOP_LEVEL_KEYS = [
  "format",
  "readinessClaim",
  "disposableOnly",
  "provenance",
  "host",
  "bridge",
  "lifecycle",
  "scenarios",
  "negativeControls",
  "rawDatabaseReturned",
  "artifactPathsReturned",
  "processIdentifiersReturned",
  "s28ReadinessProven",
  "implementationGoProven",
] as const;
const NATIVE_PROBE_KEYS = [
  "format",
  "scenario",
  "outcome",
  "quarantineRequired",
  "bridgePresent",
  "authorizerDenied",
  "authorizerCalls",
  "authorizerDenials",
  "roleAuthorizerCalls",
  "roleAuthorizerDenials",
  "commitHookCalls",
  "rollbackHookCalls",
  "commitPrepareCount",
  "commitStepCount",
  "commitFinalizeCount",
  "postClassificationSqlCount",
  "autocommit",
  "transactionState",
  "commitStepCode",
  "commitFinalizeCode",
  "commitAttempted",
  "prepareCount",
  "bindValidationCount",
  "bindValidationDenials",
  "bindCount",
  "stepCount",
  "finalizeCount",
  "roleStepCode",
  "roleFinalizeCode",
  "replayAttemptCount",
  "replayOperationCount",
  "resetAttemptCount",
  "resetOperationCount",
  "rebindAttemptCount",
  "rebindOperationCount",
  "outerChanges",
  "roleAttested",
  "roleRefused",
  "pragmaAttested",
  "pragmaBeforeAttested",
  "pragmaAfterAttempted",
  "pragmaAfterAttested",
  "observerArmed",
  "observerRefused",
  "observerInvalid",
  "hooksPresentAtClassification",
  "nonceMatchedAtClassification",
  "cleanupRollbackAttested",
  "commitRefusalOpenClassifierAttested",
  "unfinalizedCommitClassifierRefused",
  "finalizeErrorClassifierAttested",
  "sqliteVersion",
  "sqliteSourceId",
  "readinessClaim",
] as const;
const BOOLEAN_PROBE_KEYS = [
  "quarantineRequired",
  "authorizerDenied",
  "commitAttempted",
  "roleAttested",
  "roleRefused",
  "pragmaAttested",
  "pragmaBeforeAttested",
  "pragmaAfterAttempted",
  "pragmaAfterAttested",
  "observerArmed",
  "observerRefused",
  "observerInvalid",
  "hooksPresentAtClassification",
  "nonceMatchedAtClassification",
  "cleanupRollbackAttested",
  "commitRefusalOpenClassifierAttested",
  "unfinalizedCommitClassifierRefused",
  "finalizeErrorClassifierAttested",
] as const;

function refuse(message: string): never {
  throw new Error(`Disposable native route proof refused: ${message}`);
}

function sha256File(path: string): string {
  return createHash("sha256")
    .update(CAPTURED_READ_FILE_SYNC(path))
    .digest("hex");
}

function assertPinnedControllerSources(): void {
  if (
    sha256File(SOURCE_MANIFEST_PATH) !==
      DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256 ||
    sha256File(BUILD_SCRIPT_PATH) !==
      DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256 ||
    sha256File(PROOF_WORKER_PATH) !==
      DISPOSABLE_BRIDGE_PROOF_WORKER_SHA256
  ) {
    refuse("controller, builder, manifest, or worker hash drifted");
  }
}

function isWithin(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation !== "" &&
    !relation.startsWith("..") &&
    !isAbsolute(relation);
}

function createSealedTempRoot(): string {
  const path = CAPTURED_MKDTEMP_SYNC(
    join(CAPTURED_HOST_TEMP_ROOT, TEMP_PROOF_PREFIX),
  );
  const verified = CAPTURED_REALPATH_SYNC(path);
  if (
    dirname(verified) !== CAPTURED_HOST_TEMP_ROOT ||
    !basename(verified).startsWith(TEMP_PROOF_PREFIX) ||
    !CAPTURED_LSTAT_SYNC(verified).isDirectory()
  ) {
    refuse("sealed worker temp root is invalid");
  }
  return verified;
}

function cleanupSealedTempRoot(path: string | undefined): void {
  if (path === undefined || !CAPTURED_EXISTS_SYNC(path)) return;
  const verified = CAPTURED_REALPATH_SYNC(path);
  if (
    dirname(verified) !== CAPTURED_HOST_TEMP_ROOT ||
    !basename(verified).startsWith(TEMP_PROOF_PREFIX)
  ) {
    refuse("sealed worker cleanup target escaped its boundary");
  }
  CAPTURED_RM_SYNC(verified, { recursive: true, force: true });
}

function parseWorkerEvidence(raw: string): unknown {
  if (
    Buffer.byteLength(raw, "utf8") > MAX_WORKER_OUTPUT_BYTES ||
    !raw.endsWith("\n") ||
    raw.startsWith("\n")
  ) {
    refuse("sealed worker output framing is invalid");
  }
  let value: unknown;
  try {
    value = CAPTURED_JSON_PARSE(raw);
  } catch {
    refuse("sealed worker output is not JSON");
  }
  if (`${CAPTURED_JSON_STRINGIFY(value)}\n` !== raw) {
    refuse("sealed worker output is not one canonical JSON document");
  }
  return value;
}

function killProcessGroup(pid: number | undefined): void {
  if (pid === undefined || !Number.isSafeInteger(pid) || pid <= 1) {
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The sealed process group already exited.
  }
}

async function runSealedWorker(): Promise<unknown> {
  const tempRoot = createSealedTempRoot();
  try {
    return await new Promise<unknown>((resolvePromise, rejectPromise) => {
      const child = CAPTURED_SPAWN(
        EXPECTED_NODE_EXECUTABLE,
        [PROOF_WORKER_PATH],
        {
          cwd: REPO_ROOT,
          detached: true,
          env: {
            LANG: "C",
            LC_ALL: "C",
            NODE_ENV: "test",
            PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
            TMPDIR: tempRoot,
          },
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      let outputOverflow = false;
      let timedOut = false;
      let settled = false;
      const timer = setTimeout(() => {
        timedOut = true;
        killProcessGroup(child.pid);
      }, 180_000);

      const appendBounded = (
        current: string,
        chunk: Buffer,
      ): string => {
        const next = current + chunk.toString("utf8");
        if (Buffer.byteLength(next, "utf8") > MAX_WORKER_OUTPUT_BYTES) {
          outputOverflow = true;
          killProcessGroup(child.pid);
        }
        return next;
      };
      child.stdout.on("data", (chunk: Buffer) => {
        stdout = appendBounded(stdout, chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = appendBounded(stderr, chunk);
      });
      child.once("error", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        killProcessGroup(child.pid);
        rejectPromise(
          new Error("sealed worker process could not start"),
        );
      });
      child.once("close", (status, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (
          timedOut ||
          outputOverflow ||
          status !== 0 ||
          signal !== null ||
          stderr !== ""
        ) {
          rejectPromise(
            new Error("sealed worker transport failed"),
          );
          return;
        }
        try {
          resolvePromise(parseWorkerEvidence(stdout));
        } catch (error) {
          rejectPromise(error);
        }
      });
    }).catch(() => refuse("sealed worker did not exit successfully"));
  } finally {
    cleanupSealedTempRoot(tempRoot);
  }
}

function assertObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    refuse(`${label} is not an object`);
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = CAPTURED_OBJECT_KEYS(value);
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    refuse(`${label} keys are not exact`);
  }
}

function requireFields(
  value: Record<string, unknown>,
  scenario: string,
  fields: Record<string, unknown>,
): void {
  for (const [key, expected] of Object.entries(fields)) {
    if (value[key] !== expected) {
      refuse(`scenario semantic mismatch for ${scenario}.${key}`);
    }
  }
}

function requireCommitNotAttempted(
  value: Record<string, unknown>,
  scenario: string,
): void {
  requireFields(value, scenario, {
    commitAttempted: false,
    commitPrepareCount: 0,
    commitStepCount: 0,
    commitFinalizeCount: 0,
    commitStepCode: -1,
    commitFinalizeCode: -1,
  });
}

function assertProbeSemantics(
  value: DisposableNativeProbeResult,
  scenario: DisposableNativeProbeScenario,
): void {
  assertExactKeys(
    value as unknown as Record<string, unknown>,
    NATIVE_PROBE_KEYS,
    `scenario ${scenario}`,
  );
  for (const key of BOOLEAN_PROBE_KEYS) {
    if (typeof value[key] !== "boolean") {
      refuse(`invalid boolean for ${scenario}.${key}`);
    }
  }
  const integers = [
    "authorizerCalls",
    "authorizerDenials",
    "roleAuthorizerCalls",
    "roleAuthorizerDenials",
    "commitHookCalls",
    "rollbackHookCalls",
    "commitPrepareCount",
    "commitStepCount",
    "commitFinalizeCount",
    "postClassificationSqlCount",
    "autocommit",
    "transactionState",
    "commitStepCode",
    "commitFinalizeCode",
    "prepareCount",
    "bindValidationCount",
    "bindValidationDenials",
    "bindCount",
    "stepCount",
    "finalizeCount",
    "roleStepCode",
    "roleFinalizeCode",
    "replayAttemptCount",
    "replayOperationCount",
    "resetAttemptCount",
    "resetOperationCount",
    "rebindAttemptCount",
    "rebindOperationCount",
    "outerChanges",
  ] as const;
  for (const key of integers) {
    const number = value[key];
    if (
      !Number.isSafeInteger(number) ||
      (
        key !== "commitStepCode" &&
        key !== "commitFinalizeCode" &&
        key !== "roleStepCode" &&
        key !== "roleFinalizeCode" &&
        number < 0
      )
    ) {
      refuse(`invalid integer for ${scenario}.${key}`);
    }
  }
  if (
    value.format !== "brain-s28-disposable-native-probe-v4" ||
    value.scenario !== scenario ||
    value.bridgePresent !== true ||
    value.readinessClaim !== "none" ||
    value.sqliteVersion !== "3.49.2" ||
    value.sqliteSourceId !==
      "2025-05-07 10:39:52 " +
        "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1" ||
    ![0, 1].includes(value.autocommit) ||
    ![0, 1, 2].includes(value.transactionState) ||
    value.commitStepCode < -1 ||
    value.commitFinalizeCode < -1 ||
    value.roleStepCode < -1 ||
    value.roleFinalizeCode < -1 ||
    value.quarantineRequired !==
      (value.outcome === "indeterminate") ||
    value.pragmaBeforeAttested !== true ||
    value.pragmaAttested !== true ||
    value.authorizerDenied !== (scenario === "authorizer-denial")
  ) {
    refuse(`universal scenario semantics failed for ${scenario}`);
  }

  const terminalPragma = new Set<DisposableNativeProbeScenario>([
    "prepared-role",
    "prepared-role-bind-root-key-refused",
    "prepared-role-bind-value-refused",
    "prepared-role-bind-key-type-refused",
    "prepared-role-bind-value-type-refused",
    "prepared-role-bind-count-missing-refused",
    "prepared-role-bind-count-extra-refused",
    "prepared-role-sql-refused",
    "prepared-role-trace-refused",
    "prepared-role-step-finalize-refused",
    "prepared-role-auto-reprepare-refused",
    "prepared-role-replay-refused",
    "prepared-role-reset-refused",
    "prepared-role-rebind-refused",
    "observer-arm-refused",
    "observer-statement-arm-refused",
    "observer-open",
    "observer-committed",
    "observer-rolled-back",
  ]).has(scenario);
  requireFields(value as unknown as Record<string, unknown>, scenario, {
    pragmaAfterAttempted: terminalPragma,
    pragmaAfterAttested: terminalPragma,
    postClassificationSqlCount:
      scenario === "observer-open" ? 8 : 0,
    cleanupRollbackAttested: scenario === "observer-open",
    commitRefusalOpenClassifierAttested:
      scenario === "observer-open",
    unfinalizedCommitClassifierRefused:
      scenario === "observer-open",
    finalizeErrorClassifierAttested:
      scenario === "observer-committed",
    replayOperationCount: 0,
    resetOperationCount: 0,
    rebindOperationCount: 0,
  });

  const noLifecycleAttempts: Record<string, unknown> = {
    replayAttemptCount: 0,
    resetAttemptCount: 0,
    rebindAttemptCount: 0,
  };
  const bindRefusalExpectation: Record<string, unknown> = {
    roleAttested: false,
    roleRefused: true,
    roleAuthorizerCalls: 1,
    roleAuthorizerDenials: 0,
    prepareCount: 1,
    bindValidationCount: 1,
    bindValidationDenials: 1,
    bindCount: 0,
    stepCount: 0,
    finalizeCount: 1,
    roleStepCode: -1,
    roleFinalizeCode: 0,
    ...noLifecycleAttempts,
    outerChanges: 0,
  };
  const consumedRoleExpectation: Record<string, unknown> = {
    roleAttested: true,
    roleRefused: true,
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
  };
  const prepared: Partial<
    Record<
      DisposableNativeProbeScenario,
      Record<string, unknown>
    >
  > = {
    "prepared-role": {
      ...consumedRoleExpectation,
      roleRefused: false,
      ...noLifecycleAttempts,
    },
    "prepared-role-bind-root-key-refused":
      bindRefusalExpectation,
    "prepared-role-bind-value-refused": bindRefusalExpectation,
    "prepared-role-bind-key-type-refused":
      bindRefusalExpectation,
    "prepared-role-bind-value-type-refused":
      bindRefusalExpectation,
    "prepared-role-bind-count-missing-refused":
      bindRefusalExpectation,
    "prepared-role-bind-count-extra-refused":
      bindRefusalExpectation,
    "prepared-role-sql-refused": {
      roleAttested: false,
      roleRefused: true,
      roleAuthorizerCalls: 0,
      roleAuthorizerDenials: 0,
      prepareCount: 0,
      bindValidationCount: 0,
      bindValidationDenials: 0,
      bindCount: 0,
      stepCount: 0,
      finalizeCount: 0,
      roleStepCode: -1,
      roleFinalizeCode: -1,
      ...noLifecycleAttempts,
      outerChanges: 0,
    },
    "prepared-role-trace-refused": {
      roleAttested: false,
      roleRefused: true,
      roleAuthorizerCalls: 1,
      roleAuthorizerDenials: 1,
      prepareCount: 1,
      bindValidationCount: 0,
      bindValidationDenials: 0,
      bindCount: 0,
      stepCount: 0,
      finalizeCount: 0,
      roleStepCode: -1,
      roleFinalizeCode: -1,
      ...noLifecycleAttempts,
      outerChanges: 0,
    },
    "prepared-role-step-finalize-refused": {
      roleAttested: false,
      roleRefused: true,
      roleAuthorizerCalls: 1,
      roleAuthorizerDenials: 0,
      prepareCount: 1,
      bindValidationCount: 1,
      bindValidationDenials: 0,
      bindCount: 2,
      stepCount: 1,
      finalizeCount: 1,
      roleStepCode: 1555,
      roleFinalizeCode: 1555,
      ...noLifecycleAttempts,
      outerChanges: 0,
    },
    "prepared-role-auto-reprepare-refused": {
      roleAttested: false,
      roleRefused: true,
      roleAuthorizerCalls: 2,
      roleAuthorizerDenials: 1,
      prepareCount: 1,
      bindValidationCount: 1,
      bindValidationDenials: 0,
      bindCount: 2,
      stepCount: 1,
      finalizeCount: 1,
      roleStepCode: 23,
      roleFinalizeCode: 23,
      ...noLifecycleAttempts,
      outerChanges: 0,
    },
    "prepared-role-replay-refused": {
      ...consumedRoleExpectation,
      replayAttemptCount: 1,
      resetAttemptCount: 0,
      rebindAttemptCount: 0,
    },
    "prepared-role-reset-refused": {
      ...consumedRoleExpectation,
      replayAttemptCount: 0,
      resetAttemptCount: 1,
      rebindAttemptCount: 0,
    },
    "prepared-role-rebind-refused": {
      ...consumedRoleExpectation,
      replayAttemptCount: 0,
      resetAttemptCount: 0,
      rebindAttemptCount: 1,
    },
  };
  const preparedFields = prepared[scenario];
  if (preparedFields !== undefined) {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "rolled_back",
      autocommit: 1,
      transactionState: 0,
      commitHookCalls: 0,
      rollbackHookCalls: 1,
      observerArmed: true,
      observerRefused: false,
      observerInvalid: false,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: true,
      ...preparedFields,
    });
    requireCommitNotAttempted(
      value as unknown as Record<string, unknown>,
      scenario,
    );
    return;
  }

  requireFields(value as unknown as Record<string, unknown>, scenario, {
    roleStepCode: -1,
    roleFinalizeCode: -1,
    replayAttemptCount: 0,
    resetAttemptCount: 0,
    rebindAttemptCount: 0,
  });

  if (
    scenario === "bridge-attestation" ||
    scenario === "authorizer-denial"
  ) {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "not_applicable",
      autocommit: 1,
      transactionState: 0,
      commitHookCalls: 0,
      rollbackHookCalls: 0,
      observerArmed: false,
      observerRefused: false,
      observerInvalid: false,
      hooksPresentAtClassification: false,
      nonceMatchedAtClassification: false,
      roleAttested: false,
      roleRefused: false,
    });
    requireCommitNotAttempted(
      value as unknown as Record<string, unknown>,
      scenario,
    );
    return;
  }

  if (
    scenario === "observer-arm-refused" ||
    scenario === "observer-statement-arm-refused"
  ) {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "not_applicable",
      autocommit: 1,
      transactionState: 0,
      commitHookCalls: 0,
      rollbackHookCalls: 0,
      observerArmed: false,
      observerRefused: true,
      observerInvalid: false,
      hooksPresentAtClassification: false,
      nonceMatchedAtClassification: false,
    });
    requireCommitNotAttempted(
      value as unknown as Record<string, unknown>,
      scenario,
    );
    return;
  }

  if (scenario === "observer-open") {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "open",
      autocommit: 0,
      transactionState: 2,
      commitHookCalls: 0,
      rollbackHookCalls: 0,
      observerArmed: true,
      observerRefused: false,
      observerInvalid: false,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: true,
    });
    requireCommitNotAttempted(
      value as unknown as Record<string, unknown>,
      scenario,
    );
    return;
  }

  if (scenario === "observer-committed") {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "committed",
      autocommit: 1,
      transactionState: 0,
      commitHookCalls: 1,
      rollbackHookCalls: 0,
      commitAttempted: true,
      commitPrepareCount: 1,
      commitStepCount: 1,
      commitFinalizeCount: 1,
      commitStepCode: 101,
      commitFinalizeCode: 0,
      observerArmed: true,
      observerRefused: false,
      observerInvalid: false,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: true,
    });
    return;
  }

  if (scenario === "observer-rolled-back") {
    requireFields(value as unknown as Record<string, unknown>, scenario, {
      outcome: "rolled_back",
      autocommit: 1,
      transactionState: 0,
      commitHookCalls: 0,
      rollbackHookCalls: 1,
      observerArmed: true,
      observerRefused: false,
      observerInvalid: false,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: true,
    });
    requireCommitNotAttempted(
      value as unknown as Record<string, unknown>,
      scenario,
    );
    return;
  }

  const indeterminate: Partial<
    Record<
      DisposableNativeProbeScenario,
      Record<string, unknown>
    >
  > = {
    "observer-indeterminate": {
      commitHookCalls: 0,
      rollbackHookCalls: 0,
      observerInvalid: false,
      hooksPresentAtClassification: false,
      nonceMatchedAtClassification: true,
    },
    "observer-stale-nonce": {
      commitHookCalls: 0,
      rollbackHookCalls: 0,
      observerInvalid: false,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: false,
    },
    "observer-double-event": {
      commitHookCalls: 2,
      rollbackHookCalls: 0,
      observerInvalid: true,
      hooksPresentAtClassification: true,
      nonceMatchedAtClassification: true,
    },
  };
  const indeterminateFields = indeterminate[scenario];
  if (indeterminateFields === undefined) {
    refuse(`scenario lacks a semantic contract: ${scenario}`);
  }
  requireFields(value as unknown as Record<string, unknown>, scenario, {
    outcome: "indeterminate",
    autocommit: 0,
    transactionState: 2,
    observerArmed: true,
    observerRefused: false,
    ...indeterminateFields,
  });
  requireCommitNotAttempted(
    value as unknown as Record<string, unknown>,
    scenario,
  );
}

export function assertDisposableNativeProofEvidence(
  evidence: unknown,
): asserts evidence is DisposableNativeBridgeProofEvidence {
  assertObject(evidence, "proof evidence");
  assertExactKeys(evidence, TOP_LEVEL_KEYS, "proof evidence");
  if (
    evidence.format !== PROOF_FORMAT ||
    evidence.readinessClaim !== "none" ||
    evidence.disposableOnly !== true ||
    evidence.rawDatabaseReturned !== false ||
    evidence.artifactPathsReturned !== false ||
    evidence.processIdentifiersReturned !== false ||
    evidence.s28ReadinessProven !== false ||
    evidence.implementationGoProven !== false
  ) {
    refuse("proof evidence top-level contract is invalid");
  }
  assertObject(evidence.provenance, "proof provenance");
  assertExactKeys(
    evidence.provenance,
    [
      "sourceManifestSha256",
      "proofWorkerSha256",
      "moduleSha256",
      "independentBuildCount",
      "independentModuleHashesEqual",
      "transformedWrapperHashesEqual",
      "compilerIdentity",
      "compilerVersion",
    ],
    "proof provenance",
  );
  if (
    evidence.provenance.sourceManifestSha256 !==
      DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256 ||
    evidence.provenance.proofWorkerSha256 !==
      DISPOSABLE_BRIDGE_PROOF_WORKER_SHA256 ||
    typeof evidence.provenance.moduleSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(evidence.provenance.moduleSha256) ||
    evidence.provenance.independentBuildCount !== 2 ||
    evidence.provenance.independentModuleHashesEqual !== true ||
    evidence.provenance.transformedWrapperHashesEqual !== true ||
    evidence.provenance.compilerIdentity !== "/usr/bin/clang++" ||
    evidence.provenance.compilerVersion !==
      "Apple clang version 21.0.0 (clang-2100.1.1.101)"
  ) {
    refuse("proof provenance is invalid");
  }
  assertObject(evidence.host, "proof host");
  assertExactKeys(
    evidence.host,
    ["platform", "arch", "nodeVersion", "nodeAbi"],
    "proof host",
  );
  if (
    evidence.host.platform !== "darwin" ||
    evidence.host.arch !== "arm64" ||
    evidence.host.nodeVersion !== EXPECTED_NODE_VERSION ||
    evidence.host.nodeAbi !== EXPECTED_NODE_ABI
  ) {
    refuse("proof host is outside the pinned slice");
  }
  assertObject(evidence.bridge, "proof bridge");
  assertExactKeys(
    evidence.bridge,
    [
      "sqlTripwirePresent",
      "directNativeOwnerUsed",
      "closedAddonSurfaceAttested",
      "immutableNativeSurfaceAttested",
      "sealedChildProcess",
    ],
    "proof bridge",
  );
  requireFields(evidence.bridge, "bridge", {
    sqlTripwirePresent: true,
    directNativeOwnerUsed: true,
    closedAddonSurfaceAttested: true,
    immutableNativeSurfaceAttested: true,
    sealedChildProcess: true,
  });
  assertObject(evidence.lifecycle, "proof lifecycle");
  assertExactKeys(
    evidence.lifecycle,
    [
      "scenarioConnectionCount",
      "allScenarioConnectionsClosed",
      "indeterminateConnectionsQuarantinedByClose",
      "processExitIsFinalQuarantine",
    ],
    "proof lifecycle",
  );
  requireFields(evidence.lifecycle, "lifecycle", {
    scenarioConnectionCount: DISPOSABLE_NATIVE_PROBE_SCENARIOS.length,
    allScenarioConnectionsClosed: true,
    indeterminateConnectionsQuarantinedByClose: true,
    processExitIsFinalQuarantine: true,
  });
  assertObject(evidence.scenarios, "proof scenarios");
  assertExactKeys(
    evidence.scenarios,
    DISPOSABLE_NATIVE_PROBE_SCENARIOS,
    "proof scenarios",
  );
  for (const scenario of DISPOSABLE_NATIVE_PROBE_SCENARIOS) {
    const result = evidence.scenarios[scenario];
    assertObject(result, `scenario ${scenario}`);
    assertProbeSemantics(
      result as unknown as DisposableNativeProbeResult,
      scenario,
    );
  }
  assertObject(evidence.negativeControls, "negative controls");
  const negativeKeys = [
    "genericSqlWriteRefused",
    "attachRefusedWithoutFile",
    "vacuumIntoRefusedWithoutFile",
    "backupRefusedWithoutFile",
    "loadExtensionRefused",
    "serializeRefused",
    "functionRegistrationRefused",
    "unsafeModeRefused",
    "emptyFilenameRefused",
    "whitespaceFilenameRefused",
    "fileBackedConstructorRefused",
    "uriFilenameRefused",
    "embeddedNulFilenameRefused",
    "mismatchedFilenameGivenRefused",
    "falseInMemoryRefused",
    "readonlyRefused",
    "mustExistRefused",
    "timeoutOverrideRefused",
    "loggerRefused",
    "serializedBufferConstructorRefused",
    "missingArgumentRefused",
    "extraArgumentRefused",
    "noConstructorNegativeCreatedAFile",
    "selfConsistentTamperedArtifactRefused",
  ] as const;
  assertExactKeys(
    evidence.negativeControls,
    negativeKeys,
    "negative controls",
  );
  for (const key of negativeKeys) {
    if (evidence.negativeControls[key] !== true) {
      refuse(`negative control failed: ${key}`);
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of CAPTURED_OBJECT_VALUES(value)) {
      deepFreeze(child);
    }
    CAPTURED_OBJECT_FREEZE(value);
  }
  return value;
}

/**
 * Executes the disposable native proof in a fresh pinned Node process.
 * The controller accepts no database, path, environment, SQL, callback, or
 * artifact input and returns immutable content-free evidence only.
 */
export async function runDisposableStage2NativeRouteProof(
  ...unexpectedInputs: never[]
): Promise<DisposableNativeBridgeProofEvidence> {
  if (
    (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production"
  ) {
    refuse("production NODE_ENV is forbidden and cannot be overridden");
  }
  if (unexpectedInputs.length !== 0) {
    refuse("external artifacts, databases, paths, and overrides are forbidden");
  }
  if (
    process.platform !== "darwin" ||
    process.arch !== "arm64" ||
    process.versions.node !== EXPECTED_NODE_VERSION ||
    process.versions.modules !== EXPECTED_NODE_ABI ||
    CAPTURED_REALPATH_SYNC(process.execPath) !== EXPECTED_NODE_EXECUTABLE
  ) {
    refuse("controller is outside the pinned nonproduction host slice");
  }
  assertPinnedControllerSources();
  const evidence = await runSealedWorker();
  assertDisposableNativeProofEvidence(evidence);
  return deepFreeze(evidence);
}

export const __private = {
  isWithin,
} as const;
