import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
} from "node:fs";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES,
  FILE_FACTORY_NATIVE_OPERATION_TRACE,
  FILE_FACTORY_PROOF_TEMP_PREFIX,
  FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS,
  MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES,
  type DisposableFileFactoryProofEvidence,
  type DisposableFileFactoryNativeMatrixEvidence,
  type FileFactoryTransportFixtureScenario,
} from "./file-factory";

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
const WORKER_PATH = join(
  REPO_ROOT,
  "scripts",
  "run-youtube-stage2-file-factory-proof-worker.mjs",
);
const TRANSPORT_FIXTURE_PATH = join(
  REPO_ROOT,
  "scripts",
  "fixtures",
  "youtube-stage2-file-factory-transport-fixture.mjs",
);
const SOURCE_MANIFEST_PATH = join(
  REPO_ROOT,
  "native",
  "brain-s28-file-factory",
  "file-factory-source-manifest.json",
);
const BUILD_SCRIPT_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-file-factory.mjs",
);
const PINNED_NODE_EXECUTABLE =
  "/opt/homebrew/Cellar/node@22/22.22.3/bin/node";
const PINNED_NODE_VERSION = "22.22.3";
const PINNED_NODE_ABI = "127";
const PINNED_PRIVATE_TEMP_ROOT = "/private/tmp";
const WORKER_FORMAT =
  "brain-s28-private-file-factory-worker-evidence-v1";
const PROOF_FORMAT = "brain-s28-private-file-factory-proof-v1";
const NATIVE_FORMAT =
  "brain-s28-disposable-file-factory-native-matrix-v1";
const PRODUCTION_TIMEOUT_MS = 180_000;
const FIXTURE_TIMEOUT_MS = 15_000;
const FIXTURE_HANG_TIMEOUT_MS = 2_000;
const PIPE_DRAIN_TIMEOUT_MS = 500;
const CLEANUP_FIXTURE_SCENARIO = "replace-before-remove";
const CLEANUP_FIXTURE_DISPLACED_SUFFIX =
  ".cleanup-fixture-retained";
const CLEANUP_FIXTURE_SENTINEL = "replacement-sentinel";

const CAPTURED_SPAWN = spawn;
const CAPTURED_READ_FILE_SYNC = readFileSync;
const CAPTURED_REALPATH_SYNC = realpathSync;
const CAPTURED_MKDTEMP_SYNC = mkdtempSync;
const CAPTURED_OPEN_SYNC = openSync;
const CAPTURED_CLOSE_SYNC = closeSync;
const CAPTURED_FSTAT_SYNC = fstatSync;
const CAPTURED_FSYNC_SYNC = fsyncSync;
const CAPTURED_LSTAT_SYNC = lstatSync;
const CAPTURED_READDIR_SYNC = readdirSync;
const CAPTURED_MKDIR_SYNC = mkdirSync;
const CAPTURED_RENAME_SYNC = renameSync;
const CAPTURED_RMDIR_SYNC = rmdirSync;
const CAPTURED_EXISTS_SYNC = existsSync;
const CAPTURED_JSON_PARSE = JSON.parse;
const CAPTURED_JSON_STRINGIFY = JSON.stringify;
const CAPTURED_OBJECT_KEYS = Object.keys;
const CAPTURED_OBJECT_VALUES = Object.values;
const CAPTURED_OBJECT_ENTRIES = Object.entries;
const CAPTURED_OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const CAPTURED_OBJECT_FREEZE = Object.freeze;
const CAPTURED_ARRAY_IS_ARRAY = Array.isArray;
const CAPTURED_ARRAY_PUSH = Array.prototype.push;
const CAPTURED_STRING_STARTS_WITH = String.prototype.startsWith;
const CAPTURED_STRING_TRIM = String.prototype.trim;
const CAPTURED_STRING_TO_LOWER_CASE =
  String.prototype.toLowerCase;
const CAPTURED_REGEXP_TEST = RegExp.prototype.test;
const CAPTURED_BUFFER_FROM = Buffer.from;
const CAPTURED_BUFFER_CONCAT = Buffer.concat;
const CAPTURED_NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const CAPTURED_PROCESS_KILL = process.kill;
const CAPTURED_PROCESS_GETUID = process.getuid;
const CAPTURED_REFLECT_APPLY = Reflect.apply;
const CAPTURED_HASH_PROTOTYPE = CAPTURED_OBJECT_GET_PROTOTYPE_OF(
  createHash("sha256"),
) as {
  update: (...args: unknown[]) => unknown;
  digest: (...args: unknown[]) => unknown;
};
const CAPTURED_HASH_UPDATE = CAPTURED_HASH_PROTOTYPE.update;
const CAPTURED_HASH_DIGEST = CAPTURED_HASH_PROTOTYPE.digest;
const CAPTURED_SET_TIMEOUT = setTimeout;
const CAPTURED_CLEAR_TIMEOUT = clearTimeout;
const CAPTURED_EVENT_ON = EventEmitter.prototype.on;
const CAPTURED_READABLE_ON = Readable.prototype.on;
const CAPTURED_PROMISE = Promise;
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });
const CAPTURED_TEXT_DECODE = TextDecoder.prototype.decode;
const CAPTURED_MEMORY_ONLY_PREREQUISITE_HASHES =
  CAPTURED_OBJECT_FREEZE({
    ...MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES,
  });
const CAPTURED_FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS =
  CAPTURED_OBJECT_FREEZE([
    ...FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS,
  ]);
const CAPTURED_FILE_FACTORY_NATIVE_OPERATION_TRACE =
  CAPTURED_OBJECT_FREEZE([
    ...FILE_FACTORY_NATIVE_OPERATION_TRACE,
  ]);

const MEMORY_ONLY_PREREQUISITE_PATHS = {
  sourceManifest: join(
    REPO_ROOT,
    "native",
    "brain-s28-bridge",
    "bridge-source-manifest.json",
  ),
  bridgeSource: join(
    REPO_ROOT,
    "native",
    "brain-s28-bridge",
    "src",
    "brain_s28_bridge.cpp",
  ),
  bridgeHeader: join(
    REPO_ROOT,
    "native",
    "brain-s28-bridge",
    "src",
    "brain_s28_bridge.hpp",
  ),
  buildScript: join(
    REPO_ROOT,
    "scripts",
    "build-youtube-stage2-native-bridge.mjs",
  ),
  probeCli: join(
    REPO_ROOT,
    "scripts",
    "probe-youtube-stage2-native-bridge.mjs",
  ),
  proofWorker: join(
    REPO_ROOT,
    "scripts",
    "run-youtube-stage2-native-bridge-proof-worker.mjs",
  ),
  publicTypes: join(
    REPO_ROOT,
    "src",
    "db",
    "stage2",
    "native-bridge.ts",
  ),
  proofController: join(
    REPO_ROOT,
    "src",
    "db",
    "stage2",
    "native-bridge-proof.ts",
  ),
  proofTests: join(
    REPO_ROOT,
    "src",
    "db",
    "stage2",
    "native-bridge-proof.test.ts",
  ),
} as const;

const PROOF_TOP_LEVEL_KEYS = [
  "format",
  "readinessClaim",
  "disposableOnly",
  "routeSucceeded",
  "oracleSatisfied",
  "provenance",
  "host",
  "isolation",
  "native",
  "lifecycle",
  "rawDatabaseReturned",
  "artifactPathsReturned",
  "processIdentifiersReturned",
  "reusableHandleReturned",
  "checkpointCoordinatorAuthority",
  "migration028Executed",
  "migration028Authority",
  "productionAuthority",
  "s28ReadinessProven",
  "implementationGoProven",
] as const;
const WORKER_TOP_LEVEL_KEYS = PROOF_TOP_LEVEL_KEYS;
const PROVENANCE_KEYS = [
  "memoryOnlyPrerequisitesAttested",
  "sourceManifestSha256",
  "buildScriptSha256",
  "proofWorkerSha256",
  "moduleSha256",
  "operationTraceSha256",
  "independentBuildCount",
  "independentModuleHashesEqual",
  "nativeSourceHashesEqual",
  "buildManifestInputsEqual",
  "compilerAttested",
] as const;
const HOST_KEYS = [
  "platform",
  "arch",
  "nodeVersion",
  "nodeAbi",
] as const;
const WORKER_ISOLATION_KEYS = [
  "pinnedPrivateRoot",
  "ambientTempIgnored",
  "ambientDatabasePathIgnored",
  "sealedChildProcess",
  "childReceivedNoRootDescriptor",
] as const;
const PROOF_ISOLATION_KEYS = [
  "pinnedPrivateRoot",
  "ambientTempIgnored",
  "ambientDatabasePathIgnored",
  "parentRetainedRootIdentity",
  "sealedChildProcess",
  "childReceivedNoRootDescriptor",
] as const;
const WORKER_LIFECYCLE_KEYS = [
  "independentBuildOutputsRemovedBeforeResponse",
  "nativeTargetClosedBeforeResponse",
  "nativeTargetRemovedBeforeResponse",
  "workerRootEmptyBeforeResponse",
] as const;
const PROOF_LIFECYCLE_KEYS = [
  "independentBuildOutputsRemovedBeforeResponse",
  "nativeTargetClosedBeforeResponse",
  "nativeTargetRemovedBeforeResponse",
  "workerRootEmptyBeforeResponse",
  "parentRevalidatedRootIdentity",
  "parentRemovedRetainedRoot",
] as const;
const NATIVE_KEYS = [
  "format",
  "readinessClaim",
  "disposableOnly",
  "nominalDisposableFileFactoryMatrixSatisfied",
  "routeSucceeded",
  "oracleSatisfied",
  "adversarialCoverage",
  "sqliteVersion",
  "sqliteSourceId",
  "filesystem",
  "pragmas",
  "authorizer",
  "writerLock",
  "lifecycle",
  "operationTrace",
  "faults",
  "rawDatabaseReturned",
  "artifactPathsReturned",
  "processIdentifiersReturned",
  "reusableHandleReturned",
  "checkpointCoordinatorAuthority",
  "migration028Authority",
  "productionAuthority",
  "s28ReadinessProven",
  "implementationGoProven",
] as const;
const NATIVE_FILESYSTEM_KEYS = [
  "rootMode",
  "databaseMode",
  "ownerUidAttested",
  "singleLinkAttested",
  "descriptorRelativeCreate",
  "sqliteNoFollowOpen",
  "pathAnchorIdentityStable",
  "headerAttested",
  "readOnlyReopenAttested",
  "sidecarsValidated",
  "exactOwnedObjectsRemoved",
] as const;
const NATIVE_PRAGMA_KEYS = [
  "journalMode",
  "foreignKeys",
  "recursiveTriggers",
  "trustedSchema",
  "secureDelete",
  "synchronous",
  "ignoreCheckConstraints",
  "walAutocheckpoint",
  "fullfsync",
  "checkpointFullfsync",
] as const;
const NATIVE_AUTHORIZER_KEYS = [
  "installedBeforeFirstPrepare",
  "bootstrapPragmaCount",
  "initialAttestationCount",
  "terminalAttestationCount",
  "protectedBoundaryCount",
  "protectedPragmaReadCount",
  "schemaPrepareCode",
  "pragmaMutationPrepareCode",
  "defaultDenyRestored",
] as const;
const NATIVE_ADVERSARIAL_COVERAGE_KEYS = [
  "hostileFilesystem",
  "injectedFilesystemFaults",
  "injectedSqliteFaults",
  "abruptExitRestart",
] as const;
const NATIVE_WRITER_LOCK_KEYS = [
  "ownerBeginStepCode",
  "ownerBeginFinalizeCode",
  "rivalBusyStepCode",
  "rivalBusyFinalizeCode",
  "rivalBusyResetStepCode",
  "rivalBusyResetCode",
  "rivalBusyResetFinalizeCode",
  "ownerRollbackStepCode",
  "ownerRollbackFinalizeCode",
  "postReleaseBeginStepCode",
  "postReleaseBeginFinalizeCode",
  "postReleaseRollbackStepCode",
  "postReleaseRollbackFinalizeCode",
] as const;
const NATIVE_LIFECYCLE_KEYS = [
  "connectionsOpened",
  "allStatementsFinalized",
  "ownerRolledBack",
  "rivalReleased",
  "allConnectionsClosed",
  "autocommitRestored",
  "transactionStateNone",
  "cleanupComplete",
] as const;
const NATIVE_FAULT_KEYS = [
  "activeRebindStepCode",
  "activeRebindCode",
  "activeRebindFinalizeCode",
  "closeBusyCode",
  "closeBusyFinalizeCode",
  "closeRecoveryCode",
] as const;

interface PrivateRootIdentity {
  parentPath: string;
  rootPath: string;
  parentDescriptor: number;
  rootDescriptor: number;
  parentDevice: bigint;
  parentInode: bigint;
  rootDevice: bigint;
  rootInode: bigint;
  uid: bigint;
  gid: bigint;
}

interface WorkerEvidence
  extends Omit<
    DisposableFileFactoryProofEvidence,
    "format" | "isolation" | "lifecycle"
  > {
  format: typeof WORKER_FORMAT;
  isolation: Omit<
    DisposableFileFactoryProofEvidence["isolation"],
    "parentRetainedRootIdentity"
  >;
  lifecycle: Omit<
    DisposableFileFactoryProofEvidence["lifecycle"],
    "parentRevalidatedRootIdentity" | "parentRemovedRetainedRoot"
  >;
}

type TransportErrorCode =
  | "start"
  | "timeout"
  | "overflow"
  | "signal"
  | "stderr"
  | "nonzero"
  | "held-pipe"
  | "framing";

class FileFactoryTransportError extends Error {
  constructor(
    readonly code: TransportErrorCode,
    message: string,
  ) {
    super(
      `Disposable file factory proof transport refused: ${message}`,
    );
    this.name = "FileFactoryTransportError";
  }
}

class FileFactoryProofError extends Error {
  constructor(message: string) {
    super(`Disposable file factory proof refused: ${message}`);
    this.name = "FileFactoryProofError";
  }
}

function refuse(message: string): never {
  throw new FileFactoryProofError(message);
}

function transportRefuse(
  code: TransportErrorCode,
  message: string,
): never {
  throw new FileFactoryTransportError(code, message);
}

function sha256File(path: string): string {
  return sha256Bytes(CAPTURED_READ_FILE_SYNC(path));
}

function sha256Bytes(value: string | Buffer): string {
  const hash = createHash("sha256");
  CAPTURED_REFLECT_APPLY(
    CAPTURED_HASH_UPDATE,
    hash,
    [value],
  );
  return CAPTURED_REFLECT_APPLY(
    CAPTURED_HASH_DIGEST,
    hash,
    ["hex"],
  ) as string;
}

function isDirectoryMode(value: number | bigint): boolean {
  return (
    (Number(value) & fsConstants.S_IFMT) ===
    fsConstants.S_IFDIR
  );
}

function isRegularFileMode(value: number | bigint): boolean {
  return (
    (Number(value) & fsConstants.S_IFMT) ===
    fsConstants.S_IFREG
  );
}

function stringStartsWith(value: string, prefix: string): boolean {
  return CAPTURED_REFLECT_APPLY(
    CAPTURED_STRING_STARTS_WITH,
    value,
    [prefix],
  ) as boolean;
}

function regexpTest(pattern: RegExp, value: string): boolean {
  return CAPTURED_REFLECT_APPLY(
    CAPTURED_REGEXP_TEST,
    pattern,
    [value],
  ) as boolean;
}

function exactFixtureScenario(value: string): boolean {
  for (
    let index = 0;
    index <
    CAPTURED_FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS.length;
    index += 1
  ) {
    if (
      CAPTURED_FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS[index] ===
      value
    ) {
      return true;
    }
  }
  return false;
}

function sanitizePublicError(error: unknown): never {
  if (
    error instanceof FileFactoryProofError ||
    error instanceof FileFactoryTransportError
  ) {
    throw error;
  }
  throw new FileFactoryProofError("internal proof operation failed");
}

function assertRegularRepositoryFile(path: string, label: string): void {
  if (
    !CAPTURED_EXISTS_SYNC(path) ||
    !isRegularFileMode(CAPTURED_LSTAT_SYNC(path).mode) ||
    CAPTURED_REALPATH_SYNC(path) !== path
  ) {
    refuse(`${label} is not an exact regular repository file`);
  }
}

function assertMemoryOnlyPrerequisites(): void {
  const keys = CAPTURED_OBJECT_KEYS(
    MEMORY_ONLY_PREREQUISITE_PATHS,
  ) as Array<keyof typeof MEMORY_ONLY_PREREQUISITE_PATHS>;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const path = MEMORY_ONLY_PREREQUISITE_PATHS[key];
    assertRegularRepositoryFile(path, `memory-only prerequisite ${key}`);
    if (
      sha256File(path) !==
      CAPTURED_MEMORY_ONLY_PREREQUISITE_HASHES[key]
    ) {
      refuse(`memory-only prerequisite drifted: ${key}`);
    }
  }
}

function assertPinnedHostAndSources(): void {
  if (
    process.platform !== "darwin" ||
    process.arch !== "arm64" ||
    process.versions.node !== PINNED_NODE_VERSION ||
    process.versions.modules !== PINNED_NODE_ABI ||
    CAPTURED_REALPATH_SYNC(process.execPath) !==
      PINNED_NODE_EXECUTABLE ||
    CAPTURED_REALPATH_SYNC(REPO_ROOT) !== REPO_ROOT ||
    CAPTURED_REALPATH_SYNC(PINNED_PRIVATE_TEMP_ROOT) !==
      PINNED_PRIVATE_TEMP_ROOT
  ) {
    refuse("controller is outside the pinned nonproduction host slice");
  }
  assertMemoryOnlyPrerequisites();
  assertRegularRepositoryFile(
    SOURCE_MANIFEST_PATH,
    "file-factory source manifest",
  );
  assertRegularRepositoryFile(
    BUILD_SCRIPT_PATH,
    "file-factory build script",
  );
  assertRegularRepositoryFile(WORKER_PATH, "file-factory proof worker");
}

function mode(statMode: bigint): number {
  return Number(statMode & BigInt(0o7777));
}

function createPrivateRoot(): PrivateRootIdentity {
  const parentDescriptor = CAPTURED_OPEN_SYNC(
    PINNED_PRIVATE_TEMP_ROOT,
    fsConstants.O_RDONLY |
      fsConstants.O_DIRECTORY |
      fsConstants.O_NOFOLLOW,
  );
  let rootDescriptor: number | undefined;
  let rootPath: string | undefined;
  try {
    const parentStat = CAPTURED_FSTAT_SYNC(
      parentDescriptor,
      { bigint: true },
    );
    if (
      !isDirectoryMode(parentStat.mode) ||
      parentStat.dev <= 0 ||
      parentStat.ino <= 0
    ) {
      refuse("pinned private temp parent identity is invalid");
    }
    rootPath = CAPTURED_MKDTEMP_SYNC(
      join(
        PINNED_PRIVATE_TEMP_ROOT,
        FILE_FACTORY_PROOF_TEMP_PREFIX,
      ),
    );
    if (
      dirname(rootPath) !== PINNED_PRIVATE_TEMP_ROOT ||
      !stringStartsWith(
        basename(rootPath),
        FILE_FACTORY_PROOF_TEMP_PREFIX,
      ) ||
      CAPTURED_REALPATH_SYNC(rootPath) !== rootPath
    ) {
      refuse("private root escaped the pinned parent");
    }
    rootDescriptor = CAPTURED_OPEN_SYNC(
      rootPath,
      fsConstants.O_RDONLY |
        fsConstants.O_DIRECTORY |
        fsConstants.O_NOFOLLOW,
    );
    const pathStat = CAPTURED_LSTAT_SYNC(rootPath, { bigint: true });
    const descriptorStat = CAPTURED_FSTAT_SYNC(
      rootDescriptor,
      { bigint: true },
    );
    const uid = BigInt(
      CAPTURED_PROCESS_GETUID === undefined
        ? -1
        : CAPTURED_REFLECT_APPLY(
            CAPTURED_PROCESS_GETUID,
            process,
            [],
          ) as number,
    );
    const gid = descriptorStat.gid;
    if (
      !isDirectoryMode(pathStat.mode) ||
      !isDirectoryMode(descriptorStat.mode) ||
      pathStat.dev !== descriptorStat.dev ||
      pathStat.ino !== descriptorStat.ino ||
      descriptorStat.uid !== uid ||
      mode(descriptorStat.mode) !== 0o700 ||
      descriptorStat.nlink < 2
    ) {
      refuse("private root identity or mode is invalid");
    }
    CAPTURED_FSYNC_SYNC(parentDescriptor);
    return {
      parentPath: PINNED_PRIVATE_TEMP_ROOT,
      rootPath,
      parentDescriptor,
      rootDescriptor,
      parentDevice: parentStat.dev,
      parentInode: parentStat.ino,
      rootDevice: descriptorStat.dev,
      rootInode: descriptorStat.ino,
      uid,
      gid,
    };
  } catch (error) {
    if (rootDescriptor !== undefined) {
      try {
        CAPTURED_CLOSE_SYNC(rootDescriptor);
      } catch {
        // Best-effort closure precedes the fixed public refusal.
      }
    }
    if (
      rootPath !== undefined &&
      dirname(rootPath) === PINNED_PRIVATE_TEMP_ROOT &&
      stringStartsWith(
        basename(rootPath),
        FILE_FACTORY_PROOF_TEMP_PREFIX,
      ) &&
      CAPTURED_EXISTS_SYNC(rootPath)
    ) {
      try {
        CAPTURED_RMDIR_SYNC(rootPath);
      } catch {
        // Best-effort removal precedes the fixed public refusal.
      }
    }
    try {
      CAPTURED_CLOSE_SYNC(parentDescriptor);
    } catch {
      // Best-effort closure precedes the fixed public refusal.
    }
    if (error instanceof FileFactoryProofError) throw error;
    refuse("private root creation failed");
  }
}

function sameRootIdentity(root: PrivateRootIdentity): boolean {
  const parentStat = CAPTURED_FSTAT_SYNC(
    root.parentDescriptor,
    { bigint: true },
  );
  const descriptorStat = CAPTURED_FSTAT_SYNC(
    root.rootDescriptor,
    { bigint: true },
  );
  const pathStat = CAPTURED_LSTAT_SYNC(root.rootPath, { bigint: true });
  return (
    root.parentPath === PINNED_PRIVATE_TEMP_ROOT &&
    dirname(root.rootPath) === PINNED_PRIVATE_TEMP_ROOT &&
    stringStartsWith(
      basename(root.rootPath),
      FILE_FACTORY_PROOF_TEMP_PREFIX,
    ) &&
    CAPTURED_REALPATH_SYNC(root.rootPath) === root.rootPath &&
    isDirectoryMode(parentStat.mode) &&
    parentStat.dev === root.parentDevice &&
    parentStat.ino === root.parentInode &&
    isDirectoryMode(descriptorStat.mode) &&
    descriptorStat.dev === root.rootDevice &&
    descriptorStat.ino === root.rootInode &&
    isDirectoryMode(pathStat.mode) &&
    pathStat.dev === root.rootDevice &&
    pathStat.ino === root.rootInode &&
    descriptorStat.uid === root.uid &&
    descriptorStat.gid === root.gid &&
    mode(descriptorStat.mode) === 0o700
  );
}

function cleanupPrivateRoot(
  root: PrivateRootIdentity,
  requireEmpty: boolean,
  cleanupFixture?: typeof CLEANUP_FIXTURE_SCENARIO,
): void {
  let failure: unknown;
  try {
    if (!sameRootIdentity(root)) {
      refuse("private root identity changed before cleanup");
    }
    if (
      requireEmpty &&
      CAPTURED_READDIR_SYNC(root.rootPath).length !== 0
    ) {
      refuse("successful worker left private-root residue");
    }
    if (cleanupFixture === CLEANUP_FIXTURE_SCENARIO) {
      const displacedPath =
        root.rootPath + CLEANUP_FIXTURE_DISPLACED_SUFFIX;
      if (CAPTURED_EXISTS_SYNC(displacedPath)) {
        refuse("test-only cleanup fixture target already exists");
      }
      CAPTURED_RENAME_SYNC(root.rootPath, displacedPath);
      CAPTURED_MKDIR_SYNC(root.rootPath, { mode: 0o700 });
      CAPTURED_MKDIR_SYNC(
        join(root.rootPath, CLEANUP_FIXTURE_SENTINEL),
        { mode: 0o700 },
      );
      CAPTURED_FSYNC_SYNC(root.parentDescriptor);
    }
    if (!sameRootIdentity(root)) {
      refuse("private root identity changed before cleanup");
    }
    CAPTURED_RMDIR_SYNC(root.rootPath);
    CAPTURED_FSYNC_SYNC(root.parentDescriptor);
    if (CAPTURED_EXISTS_SYNC(root.rootPath)) {
      refuse("private root removal was not durable");
    }
  } catch (error) {
    failure = error;
  }
  try {
    CAPTURED_CLOSE_SYNC(root.rootDescriptor);
  } catch (error) {
    failure ??= error;
  }
  try {
    CAPTURED_CLOSE_SYNC(root.parentDescriptor);
  } catch (error) {
    failure ??= error;
  }
  if (failure !== undefined) {
    if (failure instanceof FileFactoryProofError) throw failure;
    refuse("private root cleanup failed");
  }
}

function exactDirectoryPathIdentity(
  path: string,
  device: bigint,
  inode: bigint,
  uid: bigint,
  gid: bigint,
): boolean {
  const stat = CAPTURED_LSTAT_SYNC(path, { bigint: true });
  return (
    CAPTURED_REALPATH_SYNC(path) === path &&
    isDirectoryMode(stat.mode) &&
    stat.dev === device &&
    stat.ino === inode &&
    stat.uid === uid &&
    stat.gid === gid &&
    mode(stat.mode) === 0o700
  );
}

function teardownCleanupReplacementFixture(
  root: PrivateRootIdentity,
): void {
  const displacedPath =
    root.rootPath + CLEANUP_FIXTURE_DISPLACED_SUFFIX;
  const sentinelPath = join(
    root.rootPath,
    CLEANUP_FIXTURE_SENTINEL,
  );
  let failure: unknown;
  let parentDescriptor: number | undefined;
  try {
    parentDescriptor = CAPTURED_OPEN_SYNC(
      root.parentPath,
      fsConstants.O_RDONLY |
        fsConstants.O_DIRECTORY |
        fsConstants.O_NOFOLLOW,
    );
    const parentStat = CAPTURED_FSTAT_SYNC(
      parentDescriptor,
      { bigint: true },
    );
    if (
      parentStat.dev !== root.parentDevice ||
      parentStat.ino !== root.parentInode ||
      !isDirectoryMode(parentStat.mode)
    ) {
      refuse("test-only cleanup fixture parent identity changed");
    }

    const replacementStat = CAPTURED_LSTAT_SYNC(
      root.rootPath,
      { bigint: true },
    );
    const sentinelStat = CAPTURED_LSTAT_SYNC(
      sentinelPath,
      { bigint: true },
    );
    if (
      !exactDirectoryPathIdentity(
        root.rootPath,
        replacementStat.dev,
        replacementStat.ino,
        replacementStat.uid,
        replacementStat.gid,
      ) ||
      !exactDirectoryPathIdentity(
        sentinelPath,
        sentinelStat.dev,
        sentinelStat.ino,
        sentinelStat.uid,
        sentinelStat.gid,
      ) ||
      CAPTURED_READDIR_SYNC(sentinelPath).length !== 0 ||
      CAPTURED_READDIR_SYNC(root.rootPath).length !== 1 ||
      CAPTURED_READDIR_SYNC(root.rootPath)[0] !==
        CLEANUP_FIXTURE_SENTINEL
    ) {
      refuse("replacement sentinel did not survive cleanup refusal");
    }

    if (
      !exactDirectoryPathIdentity(
        sentinelPath,
        sentinelStat.dev,
        sentinelStat.ino,
        sentinelStat.uid,
        sentinelStat.gid,
      ) ||
      CAPTURED_READDIR_SYNC(sentinelPath).length !== 0
    ) {
      refuse("replacement sentinel identity changed before teardown");
    }
    CAPTURED_RMDIR_SYNC(sentinelPath);
    if (
      CAPTURED_EXISTS_SYNC(sentinelPath) ||
      !exactDirectoryPathIdentity(
        root.rootPath,
        replacementStat.dev,
        replacementStat.ino,
        replacementStat.uid,
        replacementStat.gid,
      ) ||
      CAPTURED_READDIR_SYNC(root.rootPath).length !== 0
    ) {
      refuse("replacement root changed before teardown");
    }
    CAPTURED_RMDIR_SYNC(root.rootPath);

    if (
      !exactDirectoryPathIdentity(
        displacedPath,
        root.rootDevice,
        root.rootInode,
        root.uid,
        root.gid,
      ) ||
      CAPTURED_READDIR_SYNC(displacedPath).length !== 0
    ) {
      refuse("retained fixture root changed before teardown");
    }
    if (
      !exactDirectoryPathIdentity(
        displacedPath,
        root.rootDevice,
        root.rootInode,
        root.uid,
        root.gid,
      )
    ) {
      refuse("retained fixture root identity changed before removal");
    }
    CAPTURED_RMDIR_SYNC(displacedPath);
    CAPTURED_FSYNC_SYNC(parentDescriptor);
    if (
      CAPTURED_EXISTS_SYNC(root.rootPath) ||
      CAPTURED_EXISTS_SYNC(displacedPath)
    ) {
      refuse("test-only cleanup fixture teardown was not durable");
    }
  } catch (error) {
    failure = error;
  }
  if (parentDescriptor !== undefined) {
    try {
      CAPTURED_CLOSE_SYNC(parentDescriptor);
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure !== undefined) {
    if (failure instanceof FileFactoryProofError) throw failure;
    refuse("test-only cleanup fixture teardown failed");
  }
}

function killProcessGroup(pid: number | undefined): void {
  if (
    pid === undefined ||
    !CAPTURED_NUMBER_IS_SAFE_INTEGER(pid) ||
    pid <= 1
  ) {
    return;
  }
  try {
    CAPTURED_REFLECT_APPLY(
      CAPTURED_PROCESS_KILL,
      process,
      [-pid, "SIGKILL"],
    );
  } catch {
    // The detached proof group already exited.
  }
}

function parseCanonicalDocument(bytes: Buffer): unknown {
  if (
    bytes.length === 0 ||
    bytes.length > FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES ||
    bytes[bytes.length - 1] !== 0x0a
  ) {
    transportRefuse("framing", "worker output framing is invalid");
  }
  let raw: string;
  try {
    raw = CAPTURED_REFLECT_APPLY(
      CAPTURED_TEXT_DECODE,
      UTF8_FATAL,
      [bytes],
    ) as string;
  } catch {
    transportRefuse("framing", "worker output framing is invalid");
  }
  let value: unknown;
  try {
    value = CAPTURED_JSON_PARSE(raw);
  } catch {
    transportRefuse("framing", "worker output framing is invalid");
  }
  if (`${CAPTURED_JSON_STRINGIFY(value)}\n` !== raw) {
    transportRefuse("framing", "worker output framing is invalid");
  }
  return value;
}

async function runSealedChild(
  root: PrivateRootIdentity,
  scriptPath: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<unknown> {
  return await new CAPTURED_PROMISE<unknown>(
    (resolvePromise, rejectPromise) => {
    const child = CAPTURED_SPAWN(
      PINNED_NODE_EXECUTABLE,
      [scriptPath, ...args],
      {
        cwd: root.rootPath,
        detached: true,
        env: {
          LANG: "C",
          LC_ALL: "C",
          NODE_ENV: "test",
          PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
          TMPDIR: root.rootPath,
        },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    if (child.stdout === null || child.stderr === null) {
      killProcessGroup(child.pid);
      rejectPromise(
        new FileFactoryTransportError(
          "start",
          "worker could not start",
        ),
      );
      return;
    }

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputOverflow = false;
    let timedOut = false;
    let exited = false;
    let exitStatus: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;
    let settled = false;
    let pipeTimer: ReturnType<typeof CAPTURED_SET_TIMEOUT> | undefined;

    const settleReject = (error: Error): void => {
      if (settled) return;
      settled = true;
      CAPTURED_CLEAR_TIMEOUT(overallTimer);
      if (pipeTimer !== undefined) {
        CAPTURED_CLEAR_TIMEOUT(pipeTimer);
      }
      killProcessGroup(child.pid);
      rejectPromise(error);
    };
    const append = (
      target: Buffer[],
      chunk: Buffer,
      stream: "stdout" | "stderr",
    ): void => {
      const copy = CAPTURED_BUFFER_FROM(chunk);
      CAPTURED_REFLECT_APPLY(
        CAPTURED_ARRAY_PUSH,
        target,
        [copy],
      );
      if (stream === "stdout") {
        stdoutBytes += copy.length;
      } else {
        stderrBytes += copy.length;
      }
      if (
        stdoutBytes > FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES ||
        stderrBytes > FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES ||
        stdoutBytes + stderrBytes >
          FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES
      ) {
        outputOverflow = true;
        killProcessGroup(child.pid);
      }
    };

    const overallTimer = CAPTURED_SET_TIMEOUT(() => {
      timedOut = true;
      settleReject(
        new FileFactoryTransportError(
          "timeout",
          "worker timed out",
        ),
      );
    }, timeoutMs);

      CAPTURED_REFLECT_APPLY(
        CAPTURED_READABLE_ON,
        child.stdout,
        ["data", (chunk: Buffer) => {
          append(stdout, chunk, "stdout");
        }],
      );
      CAPTURED_REFLECT_APPLY(
        CAPTURED_READABLE_ON,
        child.stderr,
        ["data", (chunk: Buffer) => {
          append(stderr, chunk, "stderr");
        }],
      );
      CAPTURED_REFLECT_APPLY(
        CAPTURED_EVENT_ON,
        child,
        ["error", () => {
          settleReject(
            new FileFactoryTransportError(
              "start",
              "worker could not start",
            ),
          );
        }],
      );
      CAPTURED_REFLECT_APPLY(
        CAPTURED_EVENT_ON,
        child,
        ["exit", (status: number | null, signal: NodeJS.Signals | null) => {
          exited = true;
          exitStatus = status;
          exitSignal = signal;
          if (
            !settled &&
            status === 0 &&
            signal === null &&
            !outputOverflow &&
            !timedOut
          ) {
            pipeTimer = CAPTURED_SET_TIMEOUT(() => {
              settleReject(
                new FileFactoryTransportError(
                  "held-pipe",
                  "worker output pipes remained open",
                ),
              );
            }, PIPE_DRAIN_TIMEOUT_MS);
          }
        }],
      );
      CAPTURED_REFLECT_APPLY(
        CAPTURED_EVENT_ON,
        child,
        ["close", (
          status: number | null,
          signal: NodeJS.Signals | null,
        ) => {
          if (settled) return;
          settled = true;
          CAPTURED_CLEAR_TIMEOUT(overallTimer);
          if (pipeTimer !== undefined) {
            CAPTURED_CLEAR_TIMEOUT(pipeTimer);
          }
          if (outputOverflow) {
            killProcessGroup(child.pid);
            rejectPromise(
              new FileFactoryTransportError(
                "overflow",
                "worker output exceeded cap",
              ),
            );
            return;
          }
          if (timedOut) {
            rejectPromise(
              new FileFactoryTransportError(
                "timeout",
                "worker timed out",
              ),
            );
            return;
          }
          const finalStatus = exited ? exitStatus : status;
          const finalSignal = exited ? exitSignal : signal;
          if (finalSignal !== null) {
            rejectPromise(
              new FileFactoryTransportError(
                "signal",
                "worker terminated by signal",
              ),
            );
            return;
          }
          if (stderrBytes !== 0) {
            rejectPromise(
              new FileFactoryTransportError(
                "stderr",
                "worker wrote to stderr",
              ),
            );
            return;
          }
          if (finalStatus !== 0) {
            rejectPromise(
              new FileFactoryTransportError(
                "nonzero",
                "worker exited nonzero",
              ),
            );
            return;
          }
          try {
            resolvePromise(
              parseCanonicalDocument(
                CAPTURED_BUFFER_CONCAT(stdout),
              ),
            );
          } catch (error) {
            rejectPromise(error);
          }
        }],
      );
    },
  );
}

function assertObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    CAPTURED_ARRAY_IS_ARRAY(value) ||
    CAPTURED_OBJECT_GET_PROTOTYPE_OF(value) !== Object.prototype
  ) {
    refuse(`${label} is not an exact object`);
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = CAPTURED_OBJECT_KEYS(value);
  if (keys.length !== expected.length) {
    refuse(`${label} keys are not exact`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (keys[index] !== expected[index]) {
      refuse(`${label} keys are not exact`);
    }
  }
}

function requireFields(
  value: Record<string, unknown>,
  expected: Readonly<Record<string, unknown>>,
  label: string,
): void {
  const fields = CAPTURED_OBJECT_ENTRIES(expected);
  for (let index = 0; index < fields.length; index += 1) {
    const [key, expectedValue] = fields[index];
    if (value[key] !== expectedValue) {
      refuse(`${label}.${key} is invalid`);
    }
  }
}

function assertLowerSha256(value: unknown, _label: string): void {
  if (
    typeof value !== "string" ||
    !regexpTest(/^[0-9a-f]{64}$/, value)
  ) {
    refuse("proof digest is invalid");
  }
}

function operationTraceSha256(
  value: DisposableFileFactoryNativeMatrixEvidence["operationTrace"],
): string {
  return sha256Bytes(`${CAPTURED_JSON_STRINGIFY(value)}\n`);
}

function assertNativeEvidence(
  value: unknown,
): asserts value is DisposableFileFactoryNativeMatrixEvidence {
  assertObject(value, "native evidence");
  assertExactKeys(value, NATIVE_KEYS, "native evidence");
  requireFields(
    value,
    {
      format: NATIVE_FORMAT,
      readinessClaim: "none",
      disposableOnly: true,
      nominalDisposableFileFactoryMatrixSatisfied: true,
      routeSucceeded: true,
      oracleSatisfied: true,
      sqliteVersion: "3.49.2",
      sqliteSourceId:
        "2025-05-07 10:39:52 " +
        "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1",
      rawDatabaseReturned: false,
      artifactPathsReturned: false,
      processIdentifiersReturned: false,
      reusableHandleReturned: false,
      checkpointCoordinatorAuthority: false,
      migration028Authority: false,
      productionAuthority: false,
      s28ReadinessProven: false,
      implementationGoProven: false,
    },
    "native evidence",
  );

  assertObject(
    value.adversarialCoverage,
    "native adversarial coverage evidence",
  );
  assertExactKeys(
    value.adversarialCoverage,
    NATIVE_ADVERSARIAL_COVERAGE_KEYS,
    "native adversarial coverage evidence",
  );
  requireFields(
    value.adversarialCoverage,
    {
      hostileFilesystem: false,
      injectedFilesystemFaults: false,
      injectedSqliteFaults: false,
      abruptExitRestart: false,
    },
    "native adversarial coverage evidence",
  );

  assertObject(value.filesystem, "native filesystem evidence");
  assertExactKeys(
    value.filesystem,
    NATIVE_FILESYSTEM_KEYS,
    "native filesystem evidence",
  );
  requireFields(
    value.filesystem,
    {
      rootMode: 448,
      databaseMode: 384,
      ownerUidAttested: true,
      singleLinkAttested: true,
      descriptorRelativeCreate: true,
      sqliteNoFollowOpen: true,
      pathAnchorIdentityStable: true,
      headerAttested: true,
      readOnlyReopenAttested: true,
      sidecarsValidated: true,
      exactOwnedObjectsRemoved: true,
    },
    "native filesystem evidence",
  );

  assertObject(value.pragmas, "native pragma evidence");
  assertExactKeys(
    value.pragmas,
    NATIVE_PRAGMA_KEYS,
    "native pragma evidence",
  );
  requireFields(
    value.pragmas,
    {
      journalMode: "wal",
      foreignKeys: 1,
      recursiveTriggers: 1,
      trustedSchema: 0,
      secureDelete: 1,
      synchronous: 2,
      ignoreCheckConstraints: 0,
      walAutocheckpoint: 0,
      fullfsync: 1,
      checkpointFullfsync: 1,
    },
    "native pragma evidence",
  );

  assertObject(value.authorizer, "native authorizer evidence");
  assertExactKeys(
    value.authorizer,
    NATIVE_AUTHORIZER_KEYS,
    "native authorizer evidence",
  );
  requireFields(
    value.authorizer,
    {
      installedBeforeFirstPrepare: true,
      bootstrapPragmaCount: 20,
      initialAttestationCount: 20,
      terminalAttestationCount: 20,
      protectedBoundaryCount: 20,
      protectedPragmaReadCount: 100,
      schemaPrepareCode: 23,
      pragmaMutationPrepareCode: 23,
      defaultDenyRestored: true,
    },
    "native authorizer evidence",
  );
  assertObject(value.writerLock, "native writer-lock evidence");
  assertExactKeys(
    value.writerLock,
    NATIVE_WRITER_LOCK_KEYS,
    "native writer-lock evidence",
  );
  requireFields(
    value.writerLock,
    {
      ownerBeginStepCode: 101,
      ownerBeginFinalizeCode: 0,
      rivalBusyStepCode: 5,
      rivalBusyFinalizeCode: 5,
      rivalBusyResetStepCode: 5,
      rivalBusyResetCode: 5,
      rivalBusyResetFinalizeCode: 0,
      ownerRollbackStepCode: 101,
      ownerRollbackFinalizeCode: 0,
      postReleaseBeginStepCode: 101,
      postReleaseBeginFinalizeCode: 0,
      postReleaseRollbackStepCode: 101,
      postReleaseRollbackFinalizeCode: 0,
    },
    "native writer-lock evidence",
  );
  assertObject(value.lifecycle, "native lifecycle evidence");
  assertExactKeys(
    value.lifecycle,
    NATIVE_LIFECYCLE_KEYS,
    "native lifecycle evidence",
  );
  requireFields(
    value.lifecycle,
    {
      connectionsOpened: 3,
      allStatementsFinalized: true,
      ownerRolledBack: true,
      rivalReleased: true,
      allConnectionsClosed: true,
      autocommitRestored: true,
      transactionStateNone: true,
      cleanupComplete: true,
    },
    "native lifecycle evidence",
  );
  assertObject(value.faults, "native fault evidence");
  assertExactKeys(
    value.faults,
    NATIVE_FAULT_KEYS,
    "native fault evidence",
  );
  requireFields(
    value.faults,
    {
      activeRebindStepCode: 100,
      activeRebindCode: 21,
      activeRebindFinalizeCode: 0,
      closeBusyCode: 5,
      closeBusyFinalizeCode: 0,
      closeRecoveryCode: 0,
    },
    "native fault evidence",
  );
  if (
    !CAPTURED_ARRAY_IS_ARRAY(value.operationTrace) ||
    CAPTURED_OBJECT_GET_PROTOTYPE_OF(value.operationTrace) !==
      Array.prototype ||
    CAPTURED_OBJECT_KEYS(value.operationTrace).length !==
      CAPTURED_FILE_FACTORY_NATIVE_OPERATION_TRACE.length ||
    value.operationTrace.length !==
      CAPTURED_FILE_FACTORY_NATIVE_OPERATION_TRACE.length
  ) {
    refuse("native operation trace is not the exact reviewed sequence");
  }
  for (
    let index = 0;
    index < CAPTURED_FILE_FACTORY_NATIVE_OPERATION_TRACE.length;
    index += 1
  ) {
    if (
      value.operationTrace[index] !==
      CAPTURED_FILE_FACTORY_NATIVE_OPERATION_TRACE[index]
    ) {
      refuse("native operation trace is not the exact reviewed sequence");
    }
  }

  const scalarObjects = [
    ["native authorizer evidence", value.authorizer],
    ["native writer-lock evidence", value.writerLock],
    ["native lifecycle evidence", value.lifecycle],
    ["native fault evidence", value.faults],
  ] as const;
  for (
    let objectIndex = 0;
    objectIndex < scalarObjects.length;
    objectIndex += 1
  ) {
    const [label, object] = scalarObjects[objectIndex];
    const fields = CAPTURED_OBJECT_ENTRIES(object);
    for (let index = 0; index < fields.length; index += 1) {
      const [key, field] = fields[index];
      if (
        typeof field !== "boolean" &&
        (
          !CAPTURED_NUMBER_IS_SAFE_INTEGER(field) ||
          (field as number) < 0
        )
      ) {
        refuse(`${label}.${key} has an invalid scalar`);
      }
    }
  }
}

function assertCommonEvidence(
  evidence: Record<string, unknown>,
  format: string,
  isolationKeys: readonly string[],
  lifecycleKeys: readonly string[],
): void {
  requireFields(
    evidence,
    {
      format,
      readinessClaim: "none",
      disposableOnly: true,
      routeSucceeded: true,
      oracleSatisfied: true,
      rawDatabaseReturned: false,
      artifactPathsReturned: false,
      processIdentifiersReturned: false,
      reusableHandleReturned: false,
      checkpointCoordinatorAuthority: false,
      migration028Executed: false,
      migration028Authority: false,
      productionAuthority: false,
      s28ReadinessProven: false,
      implementationGoProven: false,
    },
    "proof evidence",
  );

  assertObject(evidence.provenance, "proof provenance");
  assertExactKeys(
    evidence.provenance,
    PROVENANCE_KEYS,
    "proof provenance",
  );
  requireFields(
    evidence.provenance,
    {
      memoryOnlyPrerequisitesAttested: true,
      independentBuildCount: 2,
      independentModuleHashesEqual: true,
      nativeSourceHashesEqual: true,
      buildManifestInputsEqual: true,
      compilerAttested: true,
    },
    "proof provenance",
  );
  const provenanceHashKeys = [
    "sourceManifestSha256",
    "buildScriptSha256",
    "proofWorkerSha256",
    "moduleSha256",
    "operationTraceSha256",
  ] as const;
  for (
    let index = 0;
    index < provenanceHashKeys.length;
    index += 1
  ) {
    const key = provenanceHashKeys[index];
    assertLowerSha256(
      evidence.provenance[key],
      `proof provenance.${key}`,
    );
  }

  assertObject(evidence.host, "proof host");
  assertExactKeys(evidence.host, HOST_KEYS, "proof host");
  requireFields(
    evidence.host,
    {
      platform: "darwin",
      arch: "arm64",
      nodeVersion: PINNED_NODE_VERSION,
      nodeAbi: PINNED_NODE_ABI,
    },
    "proof host",
  );

  assertObject(evidence.isolation, "proof isolation");
  assertExactKeys(
    evidence.isolation,
    isolationKeys,
    "proof isolation",
  );
  for (let index = 0; index < isolationKeys.length; index += 1) {
    const key = isolationKeys[index];
    if (evidence.isolation[key] !== true) {
      refuse(`proof isolation.${key} is invalid`);
    }
  }

  assertNativeEvidence(evidence.native);
  if (
    evidence.provenance.operationTraceSha256 !==
      operationTraceSha256(evidence.native.operationTrace)
  ) {
    refuse(
      "proof provenance.operationTraceSha256 was not independently derived",
    );
  }

  assertObject(evidence.lifecycle, "proof lifecycle");
  assertExactKeys(
    evidence.lifecycle,
    lifecycleKeys,
    "proof lifecycle",
  );
  for (let index = 0; index < lifecycleKeys.length; index += 1) {
    const key = lifecycleKeys[index];
    if (evidence.lifecycle[key] !== true) {
      refuse(`proof lifecycle.${key} is invalid`);
    }
  }
}

function assertWorkerEvidence(
  evidence: unknown,
): asserts evidence is WorkerEvidence {
  assertObject(evidence, "worker evidence");
  assertExactKeys(
    evidence,
    WORKER_TOP_LEVEL_KEYS,
    "worker evidence",
  );
  assertCommonEvidence(
    evidence,
    WORKER_FORMAT,
    WORKER_ISOLATION_KEYS,
    WORKER_LIFECYCLE_KEYS,
  );
  if (
    evidence.provenance === null ||
    typeof evidence.provenance !== "object"
  ) {
    refuse("worker provenance is absent");
  }
  const provenance = evidence.provenance as Record<string, unknown>;
  if (
    provenance.sourceManifestSha256 !==
      sha256File(SOURCE_MANIFEST_PATH) ||
    provenance.buildScriptSha256 !== sha256File(BUILD_SCRIPT_PATH) ||
    provenance.proofWorkerSha256 !== sha256File(WORKER_PATH)
  ) {
    refuse("worker provenance does not bind the executed sources");
  }
}

function assertDisposableFileFactoryProofEvidenceInternal(
  evidence: unknown,
): asserts evidence is DisposableFileFactoryProofEvidence {
  assertObject(evidence, "proof evidence");
  assertExactKeys(
    evidence,
    PROOF_TOP_LEVEL_KEYS,
    "proof evidence",
  );
  assertCommonEvidence(
    evidence,
    PROOF_FORMAT,
    PROOF_ISOLATION_KEYS,
    PROOF_LIFECYCLE_KEYS,
  );
}

export function assertDisposableFileFactoryProofEvidence(
  evidence: unknown,
): asserts evidence is DisposableFileFactoryProofEvidence {
  try {
    assertDisposableFileFactoryProofEvidenceInternal(evidence);
  } catch {
    refuse("proof evidence is invalid");
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    const children = CAPTURED_OBJECT_VALUES(value);
    for (let index = 0; index < children.length; index += 1) {
      deepFreeze(children[index]);
    }
    CAPTURED_OBJECT_FREEZE(value);
  }
  return value;
}

function finalizeEvidence(
  worker: WorkerEvidence,
): DisposableFileFactoryProofEvidence {
  const provenance = {
    memoryOnlyPrerequisitesAttested: true,
    sourceManifestSha256: worker.provenance.sourceManifestSha256,
    buildScriptSha256: worker.provenance.buildScriptSha256,
    proofWorkerSha256: worker.provenance.proofWorkerSha256,
    moduleSha256: worker.provenance.moduleSha256,
    operationTraceSha256: operationTraceSha256(
      worker.native.operationTrace,
    ),
    independentBuildCount: 2,
    independentModuleHashesEqual: true,
    nativeSourceHashesEqual: true,
    buildManifestInputsEqual: true,
    compilerAttested: true,
  } as const;
  const evidence: DisposableFileFactoryProofEvidence = {
    format: PROOF_FORMAT,
    readinessClaim: "none",
    disposableOnly: true,
    routeSucceeded: true,
    oracleSatisfied: true,
    provenance,
    host: worker.host,
    isolation: {
      pinnedPrivateRoot: true,
      ambientTempIgnored: true,
      ambientDatabasePathIgnored: true,
      parentRetainedRootIdentity: true,
      sealedChildProcess: true,
      childReceivedNoRootDescriptor: true,
    },
    native: worker.native,
    lifecycle: {
      independentBuildOutputsRemovedBeforeResponse: true,
      nativeTargetClosedBeforeResponse: true,
      nativeTargetRemovedBeforeResponse: true,
      workerRootEmptyBeforeResponse: true,
      parentRevalidatedRootIdentity: true,
      parentRemovedRetainedRoot: true,
    },
    rawDatabaseReturned: false,
    artifactPathsReturned: false,
    processIdentifiersReturned: false,
    reusableHandleReturned: false,
    checkpointCoordinatorAuthority: false,
    migration028Executed: false,
    migration028Authority: false,
    productionAuthority: false,
    s28ReadinessProven: false,
    implementationGoProven: false,
  };
  assertDisposableFileFactoryProofEvidence(evidence);
  return deepFreeze(evidence);
}

/**
 * Runs the private file-backed factory proof. The production-facing API
 * accepts no path, database, handle, descriptor, environment, callback, SQL,
 * compiler, or cleanup authority and returns content-free immutable evidence.
 */
export async function runDisposableStage2FileFactoryProof(
  ...unexpectedInputs: never[]
): Promise<DisposableFileFactoryProofEvidence> {
  const nodeEnvironment = CAPTURED_REFLECT_APPLY(
    CAPTURED_STRING_TO_LOWER_CASE,
    CAPTURED_REFLECT_APPLY(
      CAPTURED_STRING_TRIM,
      process.env.NODE_ENV ?? "",
      [],
    ),
    [],
  ) as string;
  if (
    nodeEnvironment === "production"
  ) {
    refuse("production NODE_ENV is forbidden and cannot be overridden");
  }
  if (unexpectedInputs.length !== 0) {
    refuse("external inputs and overrides are forbidden");
  }
  try {
    assertPinnedHostAndSources();

    const root = createPrivateRoot();
    let workerEvidence: WorkerEvidence | undefined;
    let succeeded = false;
    try {
      const candidate = await runSealedChild(
        root,
        WORKER_PATH,
        [],
        PRODUCTION_TIMEOUT_MS,
      );
      assertWorkerEvidence(candidate);
      workerEvidence = candidate;
      succeeded = true;
    } finally {
      cleanupPrivateRoot(root, succeeded);
    }
    if (workerEvidence === undefined) {
      refuse("worker returned no evidence");
    }
    return finalizeEvidence(workerEvidence);
  } catch (error) {
    sanitizePublicError(error);
  }
}

/**
 * Closed-enum transport seam used only by repository tests. It returns no
 * fixture body and never accepts a caller path, command, environment, timeout,
 * descriptor, process identifier, or cleanup target.
 */
export async function __testOnlyRunFileFactoryTransportFixture(
  scenario: FileFactoryTransportFixtureScenario,
): Promise<void> {
  if (
    process.env.NODE_ENV !== "test" ||
    arguments.length !== 1 ||
    typeof scenario !== "string" ||
    !exactFixtureScenario(scenario)
  ) {
    refuse("test-only transport fixture is invalid");
  }
  try {
    assertPinnedHostAndSources();
    assertRegularRepositoryFile(
      TRANSPORT_FIXTURE_PATH,
      "test-only transport fixture",
    );

    const root = createPrivateRoot();
    let succeeded = false;
    try {
      await runSealedChild(
        root,
        TRANSPORT_FIXTURE_PATH,
        [scenario],
        scenario === "timeout"
          ? FIXTURE_HANG_TIMEOUT_MS
          : FIXTURE_TIMEOUT_MS,
      );
      succeeded = true;
    } finally {
      cleanupPrivateRoot(root, succeeded);
    }
  } catch (error) {
    sanitizePublicError(error);
  }
}

/**
 * Closed test-only cleanup-race seam. It accepts one fixed enum value, exposes
 * no path or callback, proves a non-empty replacement survives the refusal,
 * and removes only the two fixture-owned empty directory trees.
 */
export async function __testOnlyRunFileFactoryCleanupFixture(
  scenario: typeof CLEANUP_FIXTURE_SCENARIO,
): Promise<void> {
  if (
    process.env.NODE_ENV !== "test" ||
    arguments.length !== 1 ||
    scenario !== CLEANUP_FIXTURE_SCENARIO
  ) {
    refuse("test-only cleanup fixture is invalid");
  }
  try {
    assertPinnedHostAndSources();
    const root = createPrivateRoot();
    let capturedRefusal: unknown;
    try {
      cleanupPrivateRoot(root, true, scenario);
    } catch (error) {
      capturedRefusal = error;
    } finally {
      teardownCleanupReplacementFixture(root);
    }
    if (
      !(capturedRefusal instanceof FileFactoryProofError) ||
      capturedRefusal.message !==
        "Disposable file factory proof refused: " +
          "private root identity changed before cleanup"
    ) {
      refuse("test-only cleanup fixture observed the wrong refusal");
    }
    throw capturedRefusal;
  } catch (error) {
    sanitizePublicError(error);
  }
}

export const __private = CAPTURED_OBJECT_FREEZE({
  parseCanonicalDocument,
} as const);
