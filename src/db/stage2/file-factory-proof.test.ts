import assert from "node:assert/strict";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  lstatSync,
  mkdtempSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { test } from "node:test";
import {
  __testOnlyRunFileFactoryCleanupFixture,
  __testOnlyRunFileFactoryTransportFixture,
  assertDisposableFileFactoryProofEvidence,
  runDisposableStage2FileFactoryProof,
} from "./file-factory-proof";
import {
  FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES,
  FILE_FACTORY_NATIVE_OPERATION_TRACE,
  FILE_FACTORY_PROOF_TEMP_PREFIX,
  FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS,
  MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES,
  type DisposableFileFactoryProofEvidence,
} from "./file-factory";

type UnknownProofCall = (
  ...inputs: unknown[]
) => Promise<DisposableFileFactoryProofEvidence>;
type UnknownFixtureCall = (
  ...inputs: unknown[]
) => Promise<void>;
type UnknownCleanupFixtureCall = (
  ...inputs: unknown[]
) => Promise<void>;
type EvidencePath = readonly (string | number)[];

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
const PRIVATE_TEMP_ROOT = "/private/tmp";
const BUILD_TEMP_PREFIX = "brain-s28-file-factory-build-";
const BUILD_RETAINED_SUFFIX = ".cleanup-fixture-retained";
const BUILD_REPLACEMENT_SENTINEL = "replacement-sentinel";
const BUILD_OUTPUT_LEAF_NAMES = [
  "brain_s28_file_factory.build-manifest.json",
  "brain_s28_file_factory.node",
  "brain_s28_file_factory.o",
  "sqlite3.o",
] as const;
const WORKER_REFUSAL =
  "Disposable file factory proof worker refused.\n";
const EXPECTED_OPERATION_TRACE_SHA256 =
  "36788309bf3ebb3fea845ef4136c71e1886f8232b40364d4eb2b2d3516077117";
const FIXTURE_PATH = join(
  REPO_ROOT,
  "scripts",
  "fixtures",
  "youtube-stage2-file-factory-transport-fixture.mjs",
);
const FILE_FACTORY_CONTROLLER_PATH = join(
  REPO_ROOT,
  "src",
  "db",
  "stage2",
  "file-factory-proof.ts",
);
const FILE_FACTORY_BUILD_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-file-factory.mjs",
);
const FILE_FACTORY_WORKER_PATH = join(
  REPO_ROOT,
  "scripts",
  "run-youtube-stage2-file-factory-proof-worker.mjs",
);
const EXPECTED_TRANSPORT_SCENARIOS = [
  "valid",
  "timeout",
  "cap-equality",
  "cap-plus-one",
  "signal",
  "truncated-json",
  "trailing-byte",
  "stderr",
  "nonzero",
  "held-pipe",
] as const;
const EXPECTED_PREREQUISITE_HASHES = {
  sourceManifest:
    "50db75350d3fba0bb5c2661481c216769d6cebcc87ee7e76c4f30705c5486ee0",
  bridgeSource:
    "fde48c0ae02591c7b9f51ea8042ef247a70f20d60cc0ebb9a0452baf9ef4ac43",
  bridgeHeader:
    "31f50b68119724917aad4134164d23deed028a878782ebf4dea06cf2fb2550c8",
  buildScript:
    "fe999b9e17e449289f5ccc3cdcd367a47934437e096f712d73e0cc32ac16df1b",
  probeCli:
    "2d5ef8857505d4cb4d2debcb9bebd564dd3f88c8a3e058090cb5b1bd2e8a785a",
  proofWorker:
    "74f5e4dbb9613c52f2668cbc8e803624fa6e9a3a04f4792baab6a191c836b316",
  publicTypes:
    "4f6cd925ee90b9cea61f08c3a29437b36802e8f281a30eefe777bf3a7aa02cdb",
  proofController:
    "da5f68468828af15cf0598fa7508108fe8cc91da30e1b74154a65022850ff120",
  proofTests:
    "78ede99752b948fa247f6b6b60ca6bd78948c730d11eec3fbdb51a7fba40a6bc",
} as const;
const PREREQUISITE_PATHS = {
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

function currentProcessUid(): bigint {
  const getuid = process.getuid;
  assert.ok(getuid !== undefined, "POSIX uid is required");
  return BigInt(getuid());
}

const PROCESS_UID = currentProcessUid();

let proofPromise:
  | Promise<DisposableFileFactoryProofEvidence>
  | undefined;

function proof(): Promise<DisposableFileFactoryProofEvidence> {
  proofPromise ??= runDisposableStage2FileFactoryProof();
  return proofPromise;
}

function sha256File(path: string): string {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

function privateRootSnapshot(): string[] {
  return readdirSync(PRIVATE_TEMP_ROOT, {
    withFileTypes: true,
  })
    .filter((entry) =>
      entry.name.startsWith(FILE_FACTORY_PROOF_TEMP_PREFIX)
    )
    .map((entry) =>
      `${entry.name}:${entry.isDirectory() ? "directory" : "non-directory"}`
    )
    .sort();
}

function buildOutputSnapshot(): string[] {
  return readdirSync(realpathSync(tmpdir()), {
    withFileTypes: true,
  })
    .filter((entry) => entry.name.startsWith(BUILD_TEMP_PREFIX))
    .map((entry) =>
      `${entry.name}:${entry.isDirectory() ? "directory" : "non-directory"}`
    )
    .sort();
}

function sealedWorkerEnvironment(
  root: string,
): NodeJS.ProcessEnv {
  return {
    LANG: "C",
    LC_ALL: "C",
    NODE_ENV: "test",
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: root,
    __CF_USER_TEXT_ENCODING:
      process.env.__CF_USER_TEXT_ENCODING?.match(
        /^0x[0-9A-F]+:0x0:0x0$/,
      )?.[0] ?? "0x1F5:0x0:0x0",
  };
}

function assertFixedWorkerRefusal(
  result: SpawnSyncReturns<string>,
  label: string,
): void {
  assert.equal(result.error, undefined, `${label}: spawn error`);
  assert.equal(result.status, 1, `${label}: status`);
  assert.equal(result.signal, null, `${label}: signal`);
  assert.equal(result.stdout, "", `${label}: stdout`);
  assert.equal(result.stderr, WORKER_REFUSAL, `${label}: stderr`);
  assertContentFreeFailure(
    new Error(result.stderr.trim()),
    label,
  );
}

function assertFixedBuilderRefusal(
  result: SpawnSyncReturns<string>,
  expected: string,
  label: string,
): void {
  assert.equal(result.error, undefined, `${label}: spawn error`);
  assert.equal(result.status, 1, `${label}: status`);
  assert.equal(result.signal, null, `${label}: signal`);
  assert.equal(result.stdout, "", `${label}: stdout`);
  assert.equal(result.stderr, `${expected}\n`, `${label}: stderr`);
  assertContentFreeFailure(
    new Error(result.stderr.trim()),
    label,
  );
}

function createWorkerFixtureRoot(
  dirty: boolean,
): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(
    join(PRIVATE_TEMP_ROOT, FILE_FACTORY_PROOF_TEMP_PREFIX),
  );
  const rootIdentity = lstatSync(root, { bigint: true });
  const sentinelPath = join(root, "dirty-root-sentinel");
  let sentinelIdentity:
    | ReturnType<typeof lstatSync>
    | undefined;
  if (dirty) {
    writeFileSync(sentinelPath, "sentinel\n", {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    sentinelIdentity = lstatSync(sentinelPath, { bigint: true });
  }
  return {
    root,
    cleanup: () => {
      const currentRoot = lstatSync(root, { bigint: true });
      assert.equal(currentRoot.dev, rootIdentity.dev);
      assert.equal(currentRoot.ino, rootIdentity.ino);
      assert.equal(currentRoot.uid, rootIdentity.uid);
      assert.equal(
        Number(currentRoot.mode & BigInt(0o7777)),
        0o700,
      );
      if (sentinelIdentity !== undefined) {
        const currentSentinel = lstatSync(
          sentinelPath,
          { bigint: true },
        );
        assert.equal(currentSentinel.dev, sentinelIdentity.dev);
        assert.equal(currentSentinel.ino, sentinelIdentity.ino);
        assert.equal(currentSentinel.nlink, BigInt(1));
        assert.equal(
          readFileSync(sentinelPath, "utf8"),
          "sentinel\n",
        );
        unlinkSync(sentinelPath);
      }
      assert.deepEqual(readdirSync(root), []);
      rmdirSync(root);
    },
  };
}

function bigintLstat(path: string) {
  return lstatSync(path, { bigint: true });
}

type BigIntStat = ReturnType<typeof bigintLstat>;

function assertSamePathIdentity(
  path: string,
  expected: BigIntStat,
): BigIntStat {
  const actual = bigintLstat(path);
  assert.equal(actual.dev, expected.dev, `${path}: device`);
  assert.equal(actual.ino, expected.ino, `${path}: inode`);
  assert.equal(actual.uid, expected.uid, `${path}: owner`);
  assert.equal(
    Number(actual.mode & BigInt(0o7777)),
    Number(expected.mode & BigInt(0o7777)),
    `${path}: mode`,
  );
  return actual;
}

function assertExactOwnedDirectory(
  path: string,
  expectedEntries: readonly string[],
): BigIntStat {
  const identity = bigintLstat(path);
  assert.equal(identity.isDirectory(), true, `${path}: directory`);
  assert.equal(identity.uid, PROCESS_UID, `${path}: owner`);
  assert.equal(
    Number(identity.mode & BigInt(0o7777)),
    0o700,
    `${path}: mode`,
  );
  assert.equal(realpathSync(path), path, `${path}: canonical path`);
  assert.deepEqual(
    readdirSync(path).sort(),
    [...expectedEntries].sort(),
    `${path}: entries`,
  );
  return identity;
}

function assertExactOwnedBuildLeaf(path: string): BigIntStat {
  const identity = bigintLstat(path);
  assert.equal(identity.isFile(), true, `${path}: regular file`);
  assert.equal(identity.uid, PROCESS_UID, `${path}: owner`);
  assert.equal(identity.nlink, BigInt(1), `${path}: one link`);
  assert.equal(realpathSync(path), path, `${path}: canonical path`);
  return identity;
}

function verifyAndRemoveWorkerCleanupReplacementRoot(
  root: string,
  rootIdentity: BigIntStat,
): void {
  const currentRoot = assertSamePathIdentity(root, rootIdentity);
  assert.equal(currentRoot.isDirectory(), true);
  assert.equal(
    Number(currentRoot.mode & BigInt(0o7777)),
    0o700,
  );
  assert.equal(realpathSync(root), root);

  const rootEntries = readdirSync(root).sort();
  assert.equal(rootEntries.length, 3, "worker root entry count");
  const retainedEntries = rootEntries.filter((entry) =>
    entry.endsWith(BUILD_RETAINED_SUFFIX)
  );
  assert.equal(
    retainedEntries.length,
    1,
    "one retained original build directory",
  );
  const retainedName = retainedEntries[0];
  const replacementName = retainedName.slice(
    0,
    -BUILD_RETAINED_SUFFIX.length,
  );
  assert.equal(
    rootEntries.includes(replacementName),
    true,
    "replacement directory retained at the checked path",
  );
  const untouchedEntries = rootEntries.filter(
    (entry) =>
      entry !== retainedName && entry !== replacementName,
  );
  assert.equal(
    untouchedEntries.length,
    1,
    "one untouched first build directory",
  );
  const untouchedName = untouchedEntries[0];
  for (const name of [replacementName, untouchedName]) {
    assert.equal(
      name.startsWith(BUILD_TEMP_PREFIX),
      true,
      `${name}: build prefix`,
    );
  }

  const retainedPath = join(root, retainedName);
  const replacementPath = join(root, replacementName);
  const untouchedPath = join(root, untouchedName);
  const sentinelPath = join(
    replacementPath,
    BUILD_REPLACEMENT_SENTINEL,
  );
  const retainedIdentity = assertExactOwnedDirectory(
    retainedPath,
    [],
  );
  const replacementIdentity = assertExactOwnedDirectory(
    replacementPath,
    [BUILD_REPLACEMENT_SENTINEL],
  );
  const sentinelIdentity = assertExactOwnedDirectory(
    sentinelPath,
    [],
  );
  const untouchedIdentity = assertExactOwnedDirectory(
    untouchedPath,
    BUILD_OUTPUT_LEAF_NAMES,
  );
  const untouchedLeafIdentities = new Map<string, BigIntStat>();
  for (const leaf of BUILD_OUTPUT_LEAF_NAMES) {
    const leafPath = join(untouchedPath, leaf);
    untouchedLeafIdentities.set(
      leaf,
      assertExactOwnedBuildLeaf(leafPath),
    );
  }

  assertSamePathIdentity(sentinelPath, sentinelIdentity);
  assert.deepEqual(readdirSync(sentinelPath), []);
  rmdirSync(sentinelPath);
  assertSamePathIdentity(replacementPath, replacementIdentity);
  assert.deepEqual(readdirSync(replacementPath), []);
  rmdirSync(replacementPath);

  assertSamePathIdentity(retainedPath, retainedIdentity);
  assert.deepEqual(readdirSync(retainedPath), []);
  rmdirSync(retainedPath);

  for (const leaf of BUILD_OUTPUT_LEAF_NAMES) {
    const leafPath = join(untouchedPath, leaf);
    const expectedIdentity = untouchedLeafIdentities.get(leaf);
    assert.ok(expectedIdentity !== undefined);
    const currentLeaf = assertSamePathIdentity(
      leafPath,
      expectedIdentity,
    );
    assert.equal(currentLeaf.isFile(), true);
    assert.equal(currentLeaf.nlink, BigInt(1));
    assert.equal(realpathSync(leafPath), leafPath);
    unlinkSync(leafPath);
  }
  assertSamePathIdentity(untouchedPath, untouchedIdentity);
  assert.deepEqual(readdirSync(untouchedPath), []);
  rmdirSync(untouchedPath);

  assertSamePathIdentity(root, rootIdentity);
  assert.deepEqual(readdirSync(root), []);
  rmdirSync(root);
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

function assertExactKeyOrder(
  value: object,
  expected: readonly string[],
  label: string,
): void {
  assert.deepEqual(Object.keys(value), expected, label);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function valueAtPath(
  root: unknown,
  path: EvidencePath,
): unknown {
  let value = root;
  for (const segment of path) {
    assert.ok(
      (isRecord(value) || Array.isArray(value)) &&
        segment in value,
      `missing evidence path ${path.join(".")}`,
    );
    value = value[segment as keyof typeof value];
  }
  return value;
}

function replaceAtPath(
  root: unknown,
  path: EvidencePath,
  replacement: unknown,
): unknown {
  if (path.length === 0) return replacement;
  const parent = valueAtPath(root, path.slice(0, -1));
  assert.ok(isRecord(parent) || Array.isArray(parent));
  Reflect.set(parent, path[path.length - 1], replacement);
  return root;
}

function assertDeepFrozen(
  value: unknown,
  path = "evidence",
): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

async function captureRejection(
  promise: Promise<unknown>,
  label: string,
): Promise<Error> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error, `${label} did not reject`);
  return caught;
}

function assertContentFreeFailure(
  error: Error,
  label: string,
): void {
  const message = error.message;
  assert.doesNotMatch(message, /\//, `${label}: path separator`);
  assert.doesNotMatch(message, /file:/i, `${label}: file URL`);
  assert.doesNotMatch(
    message,
    new RegExp(FILE_FACTORY_PROOF_TEMP_PREFIX, "i"),
    `${label}: temp prefix`,
  );
  assert.doesNotMatch(
    message,
    /\b(?:pid|fd|descriptor|process identifier)\b/i,
    `${label}: process or descriptor authority`,
  );
  assert.doesNotMatch(
    message,
    /(?:Users|Documents|repo|clang|compiler|SQLITE_[A-Z_]+|database is locked|not a database|database disk image is malformed)/i,
    `${label}: repository, compiler, or SQLite detail`,
  );
  assert.doesNotMatch(
    message,
    /\b\d{3,}\b/,
    `${label}: dynamic numeric detail`,
  );
}

function collectEvidencePaths(
  value: unknown,
  path: EvidencePath,
  objectPaths: Array<EvidencePath>,
  arrayPaths: Array<EvidencePath>,
  leafPaths: Array<EvidencePath>,
): void {
  if (Array.isArray(value)) {
    arrayPaths.push(path);
    for (let index = 0; index < value.length; index += 1) {
      collectEvidencePaths(
        value[index],
        [...path, index],
        objectPaths,
        arrayPaths,
        leafPaths,
      );
    }
    return;
  }
  if (isRecord(value)) {
    objectPaths.push(path);
    for (const [key, child] of Object.entries(value)) {
      collectEvidencePaths(
        child,
        [...path, key],
        objectPaths,
        arrayPaths,
        leafPaths,
      );
    }
    return;
  }
  leafPaths.push(path);
}

function wrongType(value: unknown): unknown {
  switch (typeof value) {
    case "boolean":
      return "not-a-boolean";
    case "number":
      return "not-a-number";
    case "string":
      return null;
    default:
      return { unexpected: true };
  }
}

function wrongExactValue(value: unknown): unknown {
  switch (typeof value) {
    case "boolean":
      return !value;
    case "number":
      return value + 1;
    case "string":
      return value === "mutated" ? "mutated-again" : "mutated";
    default:
      return value;
  }
}

function captureSynchronousFailure(
  operation: () => void,
  label: string,
): Error {
  let caught: unknown;
  try {
    operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error, `${label} was accepted`);
  assertContentFreeFailure(caught, label);
  return caught;
}

function assertValidatorRejects(
  mutant: unknown,
  label: string,
): void {
  captureSynchronousFailure(
    () => assertDisposableFileFactoryProofEvidence(mutant),
    label,
  );
}

function assertContentFreeEvidence(
  value: unknown,
  path = "evidence",
): void {
  if (typeof value === "string") {
    assert.doesNotMatch(value, /\//, `${path}: path`);
    assert.doesNotMatch(value, /file:/i, `${path}: file URL`);
    assert.doesNotMatch(
      value,
      new RegExp(FILE_FACTORY_PROOF_TEMP_PREFIX, "i"),
      `${path}: private-root name`,
    );
    return;
  }
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path}: nonfinite`);
    return;
  }
  if (
    value === null ||
    typeof value === "boolean"
  ) {
    return;
  }
  assert.ok(
    value !== null && typeof value === "object",
    `${path}: executable or opaque authority`,
  );

  const forbiddenKeys = new Set([
    "db",
    "database",
    "databasePath",
    "rootPath",
    "path",
    "fd",
    "pid",
    "handle",
    "descriptor",
    "connection",
    "statement",
    "artifactPath",
    "bindingPath",
    "command",
    "environment",
    "cleanup",
  ]);
  for (const [key, child] of Object.entries(value)) {
    assert.equal(
      forbiddenKeys.has(key),
      false,
      `${path}.${key}: reusable authority`,
    );
    assertContentFreeEvidence(child, `${path}.${key}`);
  }
}

test("public factory proof refuses production and every input before mutation", async () => {
  const before = privateRootSnapshot();
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  let productionError: Error | undefined;
  try {
    productionError = await captureRejection(
      runDisposableStage2FileFactoryProof(),
      "production refusal",
    );
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }
  assert.ok(productionError);
  assert.match(
    productionError.message,
    /production NODE_ENV is forbidden and cannot be overridden/,
  );
  assertContentFreeFailure(productionError, "production refusal");
  assert.deepEqual(privateRootSnapshot(), before);

  const inputError = await captureRejection(
    (runDisposableStage2FileFactoryProof as UnknownProofCall)({
      rootPath: "/private/tmp/caller-root",
      databasePath: "/private/tmp/caller.sqlite3",
      descriptor: 7,
      processIdentifier: 42,
      cleanup: () => undefined,
    }),
    "input refusal",
  );
  assert.match(
    inputError.message,
    /external inputs and overrides are forbidden/,
  );
  assertContentFreeFailure(inputError, "input refusal");
  assert.deepEqual(privateRootSnapshot(), before);
});

test("builder refuses caller arguments and compiler overrides before mutation", () => {
  const before = buildOutputSnapshot();
  const cleanEnvironment: NodeJS.ProcessEnv = {
    LANG: "C",
    LC_ALL: "C",
    NODE_ENV: "test",
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: realpathSync(tmpdir()),
  };
  for (const {
    label,
    args,
    environment,
    expected,
  } of [
    {
      label: "builder extra argument",
      args: [FILE_FACTORY_BUILD_PATH, "unexpected"],
      environment: cleanEnvironment,
      expected:
        "Disposable file factory build refused: " +
        "builder accepts zero arguments",
    },
    {
      label: "builder compiler override",
      args: [FILE_FACTORY_BUILD_PATH],
      environment: {
        ...cleanEnvironment,
        CC: "/private/tmp/caller-compiler",
      },
      expected:
        "Disposable file factory build refused: " +
        "ambient build overrides are forbidden",
    },
  ]) {
    const result = spawnSync(
      process.execPath,
      args,
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: environment,
      },
    );
    assertFixedBuilderRefusal(result, expected, label);
    assert.deepEqual(buildOutputSnapshot(), before, label);
  }
});

test("worker refuses wrong argv, env, cwd, and dirty root before build", () => {
  const beforeRoots = privateRootSnapshot();
  const beforeBuilds = buildOutputSnapshot();

  assertFixedWorkerRefusal(
    spawnSync(
      process.execPath,
      [FILE_FACTORY_WORKER_PATH, "unexpected"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      },
    ),
    "worker extra argument",
  );

  assertFixedWorkerRefusal(
    spawnSync(
      process.execPath,
      [FILE_FACTORY_WORKER_PATH],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: sealedWorkerEnvironment(REPO_ROOT),
      },
    ),
    "worker wrong cwd",
  );

  const wrongEnvironment = createWorkerFixtureRoot(false);
  try {
    assertFixedWorkerRefusal(
      spawnSync(
        process.execPath,
        [FILE_FACTORY_WORKER_PATH],
        {
          cwd: wrongEnvironment.root,
          encoding: "utf8",
          env: {
            ...sealedWorkerEnvironment(wrongEnvironment.root),
            CALLER_OVERRIDE: "forbidden",
          },
        },
      ),
      "worker wrong environment",
    );
  } finally {
    wrongEnvironment.cleanup();
  }

  const dirtyRoot = createWorkerFixtureRoot(true);
  try {
    assertFixedWorkerRefusal(
      spawnSync(
        process.execPath,
        [FILE_FACTORY_WORKER_PATH],
        {
          cwd: dirtyRoot.root,
          encoding: "utf8",
          env: sealedWorkerEnvironment(dirtyRoot.root),
        },
      ),
      "worker dirty root",
    );
  } finally {
    dirtyRoot.cleanup();
  }

  assert.deepEqual(privateRootSnapshot(), beforeRoots);
  assert.deepEqual(buildOutputSnapshot(), beforeBuilds);
});

test("static imports have no build, temp-root, stdout, or stderr side effects", () => {
  const beforeRoots = privateRootSnapshot();
  const beforeBuilds = buildOutputSnapshot();
  const importSource = [
    FILE_FACTORY_CONTROLLER_PATH,
    join(REPO_ROOT, "src", "db", "stage2", "file-factory.ts"),
  ]
    .map((path) =>
      `await import(${JSON.stringify(pathToFileURL(path).href)})`
    )
    .join(";");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      importSource,
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.deepEqual(privateRootSnapshot(), beforeRoots);
  assert.deepEqual(buildOutputSnapshot(), beforeBuilds);
});

test("the old nine memory-only prerequisites remain byte-exact", () => {
  assert.equal(
    Object.isFrozen(MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES),
    true,
  );
  assert.deepEqual(
    MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES,
    EXPECTED_PREREQUISITE_HASHES,
  );
  for (
    const key of Object.keys(PREREQUISITE_PATHS) as Array<
      keyof typeof PREREQUISITE_PATHS
    >
  ) {
    assert.equal(
      sha256File(PREREQUISITE_PATHS[key]),
      EXPECTED_PREREQUISITE_HASHES[key],
      key,
    );
  }
});

test("identity-checked cleanup never falls back to recursive path deletion", () => {
  for (const [label, path] of [
    ["controller", FILE_FACTORY_CONTROLLER_PATH],
    ["builder", FILE_FACTORY_BUILD_PATH],
    ["worker", FILE_FACTORY_WORKER_PATH],
  ] as const) {
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /\brecursive\s*:\s*true\b/,
      `${label} cleanup can delete a replacement tree after its identity check`,
    );
  }
});

test("worker build cleanup refuses a replacement tree and preserves its sentinel", () => {
  const beforeRoots = privateRootSnapshot();
  const beforeBuilds = buildOutputSnapshot();
  const root = mkdtempSync(
    join(PRIVATE_TEMP_ROOT, FILE_FACTORY_PROOF_TEMP_PREFIX),
  );
  const rootIdentity = assertExactOwnedDirectory(root, []);
  try {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        FIXTURE_PATH,
        FILE_FACTORY_WORKER_PATH,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: sealedWorkerEnvironment(root),
        maxBuffer: FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES,
        timeout: 120_000,
      },
    );
    assertFixedWorkerRefusal(
      result,
      "worker build cleanup replacement",
    );
  } finally {
    verifyAndRemoveWorkerCleanupReplacementRoot(
      root,
      rootIdentity,
    );
  }
  assert.deepEqual(privateRootSnapshot(), beforeRoots);
  assert.deepEqual(buildOutputSnapshot(), beforeBuilds);
});

test("cleanup replacement sentinel survives refusal before exact teardown", async () => {
  const before = privateRootSnapshot();
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  try {
    const error = await captureRejection(
      __testOnlyRunFileFactoryCleanupFixture(
        "replace-before-remove",
      ),
      "cleanup replacement fixture",
    );
    assert.equal(
      error.message,
      "Disposable file factory proof refused: " +
        "private root identity changed before cleanup",
    );
    assertContentFreeFailure(
      error,
      "cleanup replacement fixture",
    );
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }
  assert.deepEqual(privateRootSnapshot(), before);
});

test("cleanup replacement seam refuses external authority before mutation", async () => {
  const before = privateRootSnapshot();
  const unsafe =
    __testOnlyRunFileFactoryCleanupFixture as
      UnknownCleanupFixtureCall;
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  try {
    for (const inputs of [
      [],
      ["replace-before-remove", "extra"],
      ["unknown"],
      ["/private/tmp/caller-root"],
      [{ scenario: "replace-before-remove", descriptor: 7 }],
    ]) {
      const error = await captureRejection(
        unsafe(...inputs),
        `cleanup fixture input ${JSON.stringify(inputs)}`,
      );
      assert.equal(
        error.message,
        "Disposable file factory proof refused: " +
          "test-only cleanup fixture is invalid",
      );
      assertContentFreeFailure(
        error,
        `cleanup fixture input ${JSON.stringify(inputs)}`,
      );
      assert.deepEqual(privateRootSnapshot(), before);
    }
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }
});

test("closed transport fixture has exact scenarios and byte boundaries", () => {
  assert.equal(
    Object.isFrozen(FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS),
    true,
  );
  assert.deepEqual(
    FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS,
    EXPECTED_TRANSPORT_SCENARIOS,
  );
  assert.equal(FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES, 2_097_152);

  const valid = spawnSync(
    process.execPath,
    [FIXTURE_PATH, "valid"],
    { encoding: null },
  );
  assert.equal(valid.status, 0);
  assert.equal(valid.signal, null);
  assert.equal(valid.stderr.length, 0);
  assert.equal(valid.stdout.toString("utf8"), '{"fixture":"valid"}\n');

  for (const [scenario, expectedBytes] of [
    ["cap-equality", FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES],
    ["cap-plus-one", FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES + 1],
  ] as const) {
    const result: SpawnSyncReturns<Buffer> = spawnSync(
      process.execPath,
      [FIXTURE_PATH, scenario],
      {
        encoding: null,
        maxBuffer: FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES + 4096,
      },
    );
    assert.equal(result.status, 0, scenario);
    assert.equal(result.signal, null, scenario);
    assert.equal(result.stderr.length, 0, scenario);
    assert.equal(result.stdout.length, expectedBytes, scenario);
    assert.equal(result.stdout.at(-1), 0x0a, scenario);
    const decoded = result.stdout.toString("utf8");
    assert.equal(
      `${JSON.stringify(JSON.parse(decoded))}\n`,
      decoded,
      scenario,
    );
  }

  for (const args of [
    [],
    ["unknown"],
    ["valid", "extra"],
    ["/private/tmp/caller-controlled"],
    [String(process.pid)],
    ["7"],
    ['{"path":"/private/tmp/caller-controlled"}'],
  ]) {
    const refused = spawnSync(
      process.execPath,
      [FIXTURE_PATH, ...args],
      { encoding: "utf8" },
    );
    assert.equal(refused.status, 64, JSON.stringify(args));
    assert.equal(refused.signal, null, JSON.stringify(args));
    assert.equal(refused.stdout, "", JSON.stringify(args));
    assert.equal(
      refused.stderr,
      "File-factory transport fixture refused.\n",
      JSON.stringify(args),
    );
  }
});

test("native-result and outer transport caps remain distinct exact bounds", () => {
  const workerSource = readFileSync(
    FILE_FACTORY_WORKER_PATH,
    "utf8",
  );
  assert.deepEqual(
    [
      ...workerSource.matchAll(
        /^const MAX_NATIVE_OUTPUT_BYTES = ([^;]+);$/gm,
      ),
    ].map((match) => match[1]),
    ["65_536"],
  );
  assert.deepEqual(
    [
      ...workerSource.matchAll(
        /^const MAX_WORKER_OUTPUT_BYTES = ([^;]+);$/gm,
      ),
    ].map((match) => match[1]),
    ["2 * 1024 * 1024"],
  );
  assert.equal(FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES, 2_097_152);
});

test("transport seam separates a successful route from proof-oracle satisfaction", async () => {
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  try {
    await __testOnlyRunFileFactoryTransportFixture("valid");
    await __testOnlyRunFileFactoryTransportFixture("cap-equality");
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }

  const error = captureSynchronousFailure(
    () =>
      assertDisposableFileFactoryProofEvidence({
        fixture: "valid",
      }),
    "valid transport body is not proof evidence",
  );
  assert.equal(
    error.message,
    "Disposable file factory proof refused: " +
      "proof evidence is invalid",
  );
});

test("ambient path, database, module, and compiler overrides cannot steer transport", async () => {
  const before = privateRootSnapshot();
  const overrides = {
    NODE_ENV: "test",
    TMPDIR: "/private/tmp/caller-temp",
    TMP: "/private/tmp/caller-tmp",
    TEMP: "/private/tmp/caller-temp",
    SQLITE_TMPDIR: "/private/tmp/caller-sqlite-temp",
    AI_BRAIN_DB_PATH: "/private/tmp/caller.sqlite3",
    DATABASE_URL: "file:/private/tmp/caller.sqlite3",
    NODE_OPTIONS: "--require=/private/tmp/caller-hook.js",
    NODE_PATH: "/private/tmp/caller-modules",
    CC: "/private/tmp/caller-cc",
    CXX: "/private/tmp/caller-cxx",
  } as const;
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    Reflect.set(process.env, key, value);
  }
  try {
    await __testOnlyRunFileFactoryTransportFixture("valid");
  } finally {
    for (const [key, value] of previous) {
      restoreEnvironment(key, value);
    }
  }
  assert.deepEqual(privateRootSnapshot(), before);
});

test("transport seam rejects every closed negative and cleans its root", async () => {
  const failures = {
    timeout: "worker timed out",
    "cap-plus-one": "worker output exceeded cap",
    signal: "worker terminated by signal",
    "truncated-json": "worker output framing is invalid",
    "trailing-byte": "worker output framing is invalid",
    stderr: "worker wrote to stderr",
    nonzero: "worker exited nonzero",
    "held-pipe": "worker output pipes remained open",
  } as const;
  const before = privateRootSnapshot();
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  try {
    for (
      const [scenario, suffix] of Object.entries(failures) as Array<
        [keyof typeof failures, string]
      >
    ) {
      const error = await captureRejection(
        __testOnlyRunFileFactoryTransportFixture(scenario),
        scenario,
      );
      assert.equal(
        error.message,
        `Disposable file factory proof transport refused: ${suffix}`,
        scenario,
      );
      assertContentFreeFailure(error, scenario);
      assert.deepEqual(privateRootSnapshot(), before, scenario);
    }
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }
});

test("transport seam accepts one enum only and refuses before root creation", async () => {
  const before = privateRootSnapshot();
  const unsafe =
    __testOnlyRunFileFactoryTransportFixture as UnknownFixtureCall;
  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "test");
  try {
    for (const inputs of [
      [],
      ["valid", "extra"],
      ["/private/tmp/caller-root"],
      [String(process.pid)],
      ["7"],
      [{ scenario: "valid", descriptor: 7 }],
    ]) {
      const error = await captureRejection(
        unsafe(...inputs),
        JSON.stringify(inputs),
      );
      assert.equal(
        error.message,
        "Disposable file factory proof refused: " +
          "test-only transport fixture is invalid",
      );
      assertContentFreeFailure(
        error,
        `fixture input ${JSON.stringify(inputs)}`,
      );
      assert.deepEqual(privateRootSnapshot(), before);
    }
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnvironment);
  }
});

test("proof output is exact, deeply frozen, content-free, and authority-free", async () => {
  const evidence = await proof();
  assertExactKeyOrder(
    evidence,
    [
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
    ],
    "proof top-level order",
  );
  assert.equal(
    evidence.format,
    "brain-s28-private-file-factory-proof-v1",
  );
  assert.equal(evidence.readinessClaim, "none");
  assert.equal(evidence.disposableOnly, true);
  assert.equal(evidence.routeSucceeded, true);
  assert.equal(evidence.oracleSatisfied, true);
  assert.deepEqual(
    evidence.native.operationTrace,
    FILE_FACTORY_NATIVE_OPERATION_TRACE,
  );
  assert.equal(
    Object.isFrozen(FILE_FACTORY_NATIVE_OPERATION_TRACE),
    true,
  );
  assert.notStrictEqual(
    evidence.native.operationTrace,
    FILE_FACTORY_NATIVE_OPERATION_TRACE,
  );
  for (const key of [
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
  ] as const) {
    assert.equal(evidence[key], false, key);
  }
  for (const key of [
    "rawDatabaseReturned",
    "artifactPathsReturned",
    "processIdentifiersReturned",
    "reusableHandleReturned",
    "checkpointCoordinatorAuthority",
    "migration028Authority",
    "productionAuthority",
    "s28ReadinessProven",
    "implementationGoProven",
  ] as const) {
    assert.equal(evidence.native[key], false, `native.${key}`);
  }
  assertDeepFrozen(evidence);
  assertContentFreeEvidence(evidence);
});

test("native file, pragma, AUTH, writer-lock, fault, and cleanup receipts are exact", async () => {
  const evidence = await proof();
  const native = evidence.native;
  assertExactKeyOrder(
    native,
    [
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
    ],
    "native top-level order",
  );
  assert.equal(
    native.format,
    "brain-s28-disposable-file-factory-native-matrix-v1",
  );
  assert.equal(
    native.nominalDisposableFileFactoryMatrixSatisfied,
    true,
  );
  assert.equal(
    Object.hasOwn(native, "fileBackedFactoryProven"),
    false,
  );
  assert.deepEqual(native.adversarialCoverage, {
    hostileFilesystem: false,
    injectedFilesystemFaults: false,
    injectedSqliteFaults: false,
    abruptExitRestart: false,
  });
  assert.deepEqual(native.filesystem, {
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
  });
  assert.deepEqual(native.pragmas, {
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
  });
  assert.deepEqual(native.authorizer, {
    installedBeforeFirstPrepare: true,
    bootstrapPragmaCount: 20,
    initialAttestationCount: 20,
    terminalAttestationCount: 20,
    protectedBoundaryCount: 20,
    protectedPragmaReadCount: 100,
    schemaPrepareCode: 23,
    pragmaMutationPrepareCode: 23,
    defaultDenyRestored: true,
  });
  assert.deepEqual(native.writerLock, {
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
  });
  assert.deepEqual(native.lifecycle, {
    connectionsOpened: 3,
    allStatementsFinalized: true,
    ownerRolledBack: true,
    rivalReleased: true,
    allConnectionsClosed: true,
    autocommitRestored: true,
    transactionStateNone: true,
    cleanupComplete: true,
  });
  assert.deepEqual(native.faults, {
    activeRebindStepCode: 100,
    activeRebindCode: 21,
    activeRebindFinalizeCode: 0,
    closeBusyCode: 5,
    closeBusyFinalizeCode: 0,
    closeRecoveryCode: 0,
  });
  assert.equal(
    evidence.provenance.operationTraceSha256,
    EXPECTED_OPERATION_TRACE_SHA256,
  );
  assert.equal(
    evidence.provenance.operationTraceSha256,
    createHash("sha256")
      .update(`${JSON.stringify(native.operationTrace)}\n`)
      .digest("hex"),
  );
});

test("operation trace proves exact PRAGMA order, default-deny boundaries, real file cleanup, and read-only reopen", async () => {
  const trace: readonly string[] =
    (await proof()).native.operationTrace;
  const ownerProfileSet = [
    "owner.pragma.set.01.SQLITE_PRAGMA.fullfsync.ON",
    "owner.pragma.set.02.SQLITE_PRAGMA.checkpoint_fullfsync.ON",
    "owner.pragma.set.03.SQLITE_PRAGMA.journal_mode.WAL",
    "owner.pragma.set.04.SQLITE_PRAGMA.synchronous.FULL",
    "owner.pragma.set.05.SQLITE_PRAGMA.foreign_keys.ON",
    "owner.pragma.set.06.SQLITE_PRAGMA.recursive_triggers.ON",
    "owner.pragma.set.07.SQLITE_PRAGMA.trusted_schema.OFF",
    "owner.pragma.set.08.SQLITE_PRAGMA.secure_delete.ON",
    "owner.pragma.set.09.SQLITE_PRAGMA.ignore_check_constraints.OFF",
    "owner.pragma.set.10.SQLITE_PRAGMA.wal_autocheckpoint.0",
  ] as const;
  const ownerBootstrapIndex = trace.indexOf(
    "owner.authorizer.bootstrap.install",
  );
  assert.ok(ownerBootstrapIndex >= 0);
  assert.deepEqual(
    trace.slice(
      ownerBootstrapIndex + 1,
      ownerBootstrapIndex + 1 + ownerProfileSet.length,
    ),
    ownerProfileSet,
  );
  assert.ok(
    ownerBootstrapIndex <
      trace.indexOf(
        "owner.schema.prepare.SQLITE_INSERT.sqlite_master.null.AUTH",
      ),
  );

  const protectedSuffixes = [
    "authorizer.install",
    "01.SQLITE_PRAGMA.foreign_keys.null",
    "02.SQLITE_PRAGMA.recursive_triggers.null",
    "03.SQLITE_PRAGMA.trusted_schema.null",
    "04.SQLITE_PRAGMA.secure_delete.null",
    "05.SQLITE_PRAGMA.ignore_check_constraints.null",
    "authorizer.default",
  ] as const;
  const protectedBoundaries = [
    ["owner", "before-schema-auth"],
    ["owner", "after-schema-auth"],
    ["owner", "before-pragma-auth"],
    ["owner", "after-pragma-auth"],
    ["rival", "before-rebind"],
    ["rival", "after-rebind"],
    ["owner", "before-begin"],
    ["owner", "after-begin"],
    ["rival", "before-busy-finalize"],
    ["rival", "after-busy-finalize"],
    ["rival", "before-busy-reset"],
    ["rival", "after-busy-reset"],
    ["owner", "before-rollback"],
    ["owner", "after-rollback"],
    ["rival", "before-post-release-begin"],
    ["rival", "after-post-release-begin"],
    ["rival", "before-post-release-rollback"],
    ["rival", "after-post-release-rollback"],
    ["rival", "before-close-busy"],
    ["rival", "after-close-busy"],
  ] as const;
  for (const [owner, boundary] of protectedBoundaries) {
    const expected = protectedSuffixes.map(
      (suffix) => `${owner}.protected.${boundary}.${suffix}`,
    );
    const start = trace.indexOf(expected[0]);
    assert.ok(start >= 0, `${owner}.${boundary}`);
    assert.deepEqual(
      trace.slice(start, start + expected.length),
      expected,
      `${owner}.${boundary}`,
    );
  }

  for (const tuple of [
    "owner.schema.prepare.SQLITE_INSERT.sqlite_master.null.AUTH",
    "owner.pragma-mutation.prepare.SQLITE_PRAGMA.foreign_keys.OFF.AUTH",
    "owner.transaction.SQLITE_TRANSACTION.BEGIN.null.done",
    "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.step",
    "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.step",
    "owner.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done",
    "rival.post-release.transaction.SQLITE_TRANSACTION.BEGIN.null.done",
    "rival.post-release.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done",
    "rival.close.busy",
    "rival.close.recovery",
  ]) {
    assert.equal(trace.includes(tuple), true, tuple);
  }

  const rootEmpty = trace.indexOf("root.empty.precreate");
  const databaseCreate = trace.indexOf("database.create.exclusive");
  const databaseHeader = trace.indexOf("database.header.attest");
  const readOnlyOpen = trace.indexOf("readonly.sqlite.open");
  const readOnlyZeroChange = trace.indexOf(
    "readonly.zero-change.attest",
  );
  const readOnlyClose = trace.indexOf("readonly.close");
  const databaseUnlink = trace.indexOf("database.unlink");
  const directoryFsync = trace.indexOf("directory.fsync");
  const finalEmpty = trace.indexOf("owned.empty.scan");
  assert.ok(rootEmpty >= 0 && rootEmpty < databaseCreate);
  assert.ok(
    databaseHeader >= 0 &&
      databaseHeader < readOnlyOpen &&
      readOnlyOpen < readOnlyZeroChange &&
      readOnlyZeroChange < readOnlyClose,
  );
  assert.ok(
    readOnlyClose < databaseUnlink &&
      databaseUnlink < directoryFsync &&
      directoryFsync < finalEmpty,
  );
  assert.deepEqual(trace, FILE_FACTORY_NATIVE_OPERATION_TRACE);
});

test("pure validator rejects every key, order, leaf, trace, and swapped body mutation", async () => {
  const evidence = await proof();
  const objectPaths: Array<EvidencePath> = [];
  const arrayPaths: Array<EvidencePath> = [];
  const leafPaths: Array<EvidencePath> = [];
  collectEvidencePaths(
    evidence,
    [],
    objectPaths,
    arrayPaths,
    leafPaths,
  );

  {
    const legacy = structuredClone(evidence) as unknown;
    const native = valueAtPath(legacy, ["native"]);
    assert.ok(isRecord(native));
    Reflect.set(native, "fileBackedFactoryProven", true);
    assertValidatorRejects(
      legacy,
      "legacy fileBackedFactoryProven claim",
    );
  }

  for (const key of [
    "hostileFilesystem",
    "injectedFilesystemFaults",
    "injectedSqliteFaults",
    "abruptExitRestart",
  ] as const) {
    const mutant = structuredClone(evidence) as unknown;
    const coverage = valueAtPath(
      mutant,
      ["native", "adversarialCoverage"],
    );
    assert.ok(isRecord(coverage));
    Reflect.set(coverage, key, true);
    assertValidatorRejects(
      mutant,
      `adversarial coverage overclaim ${key}`,
    );
  }

  for (const path of leafPaths) {
    let mutant: unknown = structuredClone(evidence);
    const original = valueAtPath(mutant, path);
    mutant = replaceAtPath(mutant, path, wrongType(original));
    assertValidatorRejects(
      mutant,
      `wrong type at ${path.join(".")}`,
    );
  }

  for (const path of leafPaths) {
    if (
      path[0] === "provenance" &&
      typeof valueAtPath(evidence, path) === "string"
    ) {
      continue;
    }
    let mutant: unknown = structuredClone(evidence);
    const original = valueAtPath(mutant, path);
    mutant = replaceAtPath(
      mutant,
      path,
      wrongExactValue(original),
    );
    assertValidatorRejects(
      mutant,
      `wrong exact value at ${path.join(".")}`,
    );
  }

  for (const objectPath of objectPaths) {
    const originalObject = valueAtPath(evidence, objectPath);
    assert.ok(isRecord(originalObject));
    for (const key of Object.keys(originalObject)) {
      const mutant = structuredClone(evidence) as unknown;
      const target = valueAtPath(mutant, objectPath);
      assert.ok(isRecord(target));
      assert.equal(Reflect.deleteProperty(target, key), true);
      assertValidatorRejects(
        mutant,
        `missing key ${[...objectPath, key].join(".")}`,
      );
    }

    {
      const mutant = structuredClone(evidence) as unknown;
      const target = valueAtPath(mutant, objectPath);
      assert.ok(isRecord(target));
      Reflect.set(target, "unexpectedEvidenceAuthority", true);
      assertValidatorRejects(
        mutant,
        `extra key at ${objectPath.join(".") || "root"}`,
      );
    }

    if (Object.keys(originalObject).length > 1) {
      let mutant: unknown = structuredClone(evidence);
      const target = valueAtPath(mutant, objectPath);
      assert.ok(isRecord(target));
      const reversed = Object.fromEntries(
        Object.entries(target).reverse(),
      );
      mutant = replaceAtPath(mutant, objectPath, reversed);
      assertValidatorRejects(
        mutant,
        `reordered keys at ${objectPath.join(".") || "root"}`,
      );
    }
  }

  for (const arrayPath of arrayPaths) {
    const originalArray = valueAtPath(evidence, arrayPath);
    assert.ok(Array.isArray(originalArray));
    assert.ok(originalArray.length > 1);

    const missing: unknown = structuredClone(evidence);
    const missingArray = valueAtPath(missing, arrayPath);
    assert.ok(Array.isArray(missingArray));
    missingArray.splice(0, 1);
    assertValidatorRejects(
      missing,
      `missing array entry at ${arrayPath.join(".")}`,
    );

    const extra: unknown = structuredClone(evidence);
    const extraArray = valueAtPath(extra, arrayPath);
    assert.ok(Array.isArray(extraArray));
    extraArray.push("unexpected.trace.entry");
    assertValidatorRejects(
      extra,
      `extra array entry at ${arrayPath.join(".")}`,
    );

    const swapped: unknown = structuredClone(evidence);
    const swappedArray = valueAtPath(swapped, arrayPath);
    assert.ok(Array.isArray(swappedArray));
    [swappedArray[0], swappedArray[1]] = [
      swappedArray[1],
      swappedArray[0],
    ];
    assertValidatorRejects(
      swapped,
      `swapped array entries at ${arrayPath.join(".")}`,
    );
  }

  for (const [leftPath, rightPath, label] of [
    [
      ["provenance"],
      ["host"],
      "swapped provenance and host bodies",
    ],
    [
      ["native", "filesystem"],
      ["native", "pragmas"],
      "swapped filesystem and pragma bodies",
    ],
    [
      ["native", "writerLock"],
      ["native", "faults"],
      "swapped writer-lock and fault bodies",
    ],
  ] as Array<[EvidencePath, EvidencePath, string]>) {
    let mutant: unknown = structuredClone(evidence);
    const left = valueAtPath(mutant, leftPath);
    const right = valueAtPath(mutant, rightPath);
    mutant = replaceAtPath(mutant, leftPath, right);
    mutant = replaceAtPath(mutant, rightPath, left);
    assertValidatorRejects(mutant, label);
  }

  for (const [path, value, label] of [
    [
      ["routeSucceeded"],
      false,
      "top route false while oracle true",
    ],
    [
      ["oracleSatisfied"],
      false,
      "top oracle false while route true",
    ],
    [
      ["native", "routeSucceeded"],
      false,
      "native route false while oracle true",
    ],
    [
      ["native", "oracleSatisfied"],
      false,
      "native oracle false while route true",
    ],
  ] as Array<[EvidencePath, boolean, string]>) {
    let mutant: unknown = structuredClone(evidence);
    mutant = replaceAtPath(mutant, path, value);
    assertValidatorRejects(mutant, label);
  }
});

test("concurrent proofs isolate roots, builds, native targets, and cleanup", async () => {
  const before = privateRootSnapshot();
  const [first, second] = await Promise.all([
    runDisposableStage2FileFactoryProof(),
    runDisposableStage2FileFactoryProof(),
  ]);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.provenance, second.provenance);
  assert.notStrictEqual(first.native, second.native);
  assert.equal(
    first.provenance.moduleSha256,
    second.provenance.moduleSha256,
  );
  assert.equal(
    first.provenance.operationTraceSha256,
    second.provenance.operationTraceSha256,
  );
  assert.deepEqual(
    first.native.operationTrace,
    second.native.operationTrace,
  );
  assertDeepFrozen(first, "first evidence");
  assertDeepFrozen(second, "second evidence");
  assert.deepEqual(privateRootSnapshot(), before);
});

test.skip(
  "GAP(P1): abrupt child exit after private-file creation lacks a restart cleanup oracle",
  () => assert.fail("native abrupt-exit coordinate is unavailable"),
);

test.skip(
  "GAP(P1): abrupt child exit while BEGIN IMMEDIATE is held lacks a restart cleanup oracle",
  () => assert.fail("native abrupt-exit coordinate is unavailable"),
);

test.skip(
  "GAP(P2): synthetic native prepare/finalize faults beyond real AUTH, BUSY, and close-BUSY are unavailable",
  () => assert.fail("native synthetic-fault coordinate is unavailable"),
);
