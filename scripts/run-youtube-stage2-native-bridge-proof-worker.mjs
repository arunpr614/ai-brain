#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
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

const WORKER_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(WORKER_PATH), "..");
const BUILD_SCRIPT_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-native-bridge.mjs",
);
const SOURCE_MANIFEST_PATH = join(
  REPO_ROOT,
  "native",
  "brain-s28-bridge",
  "bridge-source-manifest.json",
);
const TEMP_BUILD_PREFIX = "brain-s28-disposable-native-bridge-";
const BUILD_RESULT_FORMAT =
  "brain-s28-disposable-native-bridge-build-result-v2";
const BUILD_MANIFEST_FORMAT =
  "brain-s28-disposable-native-bridge-build-v2";
const PROOF_FORMAT = "brain-s28-disposable-native-route-proof-v5";
const NATIVE_PROBE_FORMAT =
  "brain-s28-disposable-native-probe-v4";
const CLOSED_NATIVE_METHOD = "_stage2DisposableBridgeProbe";
const EXPECTED_NODE_VERSION = "22.22.3";
const EXPECTED_NODE_ABI = "127";
const EXPECTED_COMPILER_C = "/usr/bin/clang";
const EXPECTED_COMPILER_CXX = "/usr/bin/clang++";
const EXPECTED_COMPILER_VERSION =
  "Apple clang version 21.0.0 (clang-2100.1.1.101)";
const EXPECTED_NODE_HEADER_SHA256 =
  "bc47b118a731e9663b145e4823ebc7f31237140d6ea95417519d894d7a0498cb";
const EXPECTED_NODE_VERSION_HEADER_SHA256 =
  "8398c745f56d8f522ee1575321f3cec20e4c065d62dd28c7f586d2ced7d1cf41";
const EXPECTED_SQLITE_VERSION = "3.49.2";
const EXPECTED_SQLITE_SOURCE_ID =
  "2025-05-07 10:39:52 " +
  "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
const SCENARIOS = Object.freeze([
  "bridge-attestation",
  "authorizer-denial",
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
  "observer-indeterminate",
  "observer-stale-nonce",
  "observer-double-event",
]);
const NATIVE_PROBE_KEYS = Object.freeze([
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
]);
const BOOLEAN_PROBE_KEYS = Object.freeze([
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
]);
const INTEGER_PROBE_KEYS = Object.freeze([
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
]);
const ALLOWED_ENVIRONMENT_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "NODE_ENV",
  "PATH",
  "TMPDIR",
  "__CF_USER_TEXT_ENCODING",
]);
const require = createRequire(import.meta.url);

function refuse(message) {
  throw new Error(`Disposable native proof worker refused: ${message}`);
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseObject(raw, label) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    refuse(`${label} is not valid JSON`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    refuse(`${label} is not an object`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    refuse(`${label} keys are not exact`);
  }
}

function isWithin(parent, child) {
  const relation = relative(parent, child);
  return relation !== "" &&
    !relation.startsWith("..") &&
    !isAbsolute(relation);
}

function verifyTemporaryDirectory(path, label) {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    refuse(`${label} is missing`);
  }
  const verified = realpathSync(path);
  const verifiedTempRoot = realpathSync(tmpdir());
  if (
    !isWithin(verifiedTempRoot, verified) ||
    !basename(verified).startsWith(TEMP_BUILD_PREFIX)
  ) {
    refuse(`${label} escaped the sealed temp root`);
  }
  return verified;
}

function verifyFileWithin(directory, path, label) {
  if (!existsSync(path) || !lstatSync(path).isFile()) {
    refuse(`${label} is missing or not regular`);
  }
  const verified = realpathSync(path);
  if (!isWithin(directory, verified)) {
    refuse(`${label} escaped its disposable directory`);
  }
  return verified;
}

function cleanupDisposableDirectory(path) {
  if (path === undefined || !existsSync(path)) return;
  const verified = verifyTemporaryDirectory(path, "cleanup directory");
  rmSync(verified, { recursive: true, force: true });
}

function closedSubprocessEnvironment() {
  return {
    LANG: "C",
    LC_ALL: "C",
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: realpathSync(tmpdir()),
  };
}

function assertSealedInvocation() {
  if (process.argv.length !== 2) {
    refuse("worker accepts no arguments");
  }
  const actualKeys = Object.keys(process.env).sort();
  if (
    actualKeys.length !== ALLOWED_ENVIRONMENT_KEYS.length ||
    actualKeys.some(
      (key, index) => key !== [...ALLOWED_ENVIRONMENT_KEYS].sort()[index],
    ) ||
    process.env.LANG !== "C" ||
    process.env.LC_ALL !== "C" ||
    process.env.NODE_ENV !== "test" ||
    process.env.PATH !== "/usr/bin:/bin:/usr/sbin:/sbin" ||
    process.env.TMPDIR === undefined ||
    !/^0x[0-9A-F]+:0x0:0x0$/.test(
      process.env.__CF_USER_TEXT_ENCODING ?? "",
    ) ||
    realpathSync(process.env.TMPDIR) !== realpathSync(tmpdir()) ||
    process.platform !== "darwin" ||
    process.arch !== "arm64" ||
    process.versions.node !== EXPECTED_NODE_VERSION ||
    process.versions.modules !== EXPECTED_NODE_ABI ||
    realpathSync(process.execPath) !==
      "/opt/homebrew/Cellar/node@22/22.22.3/bin/node"
  ) {
    refuse("worker process or environment is not the sealed pinned slice");
  }
}

function readAndVerifySourceManifest() {
  const text = readFileSync(SOURCE_MANIFEST_PATH, "utf8");
  const manifest = parseObject(text, "source manifest");
  if (
    manifest.format !==
      "brain-s28-disposable-native-bridge-source-v4" ||
    manifest.readinessClaim !== "none" ||
    manifest.disposableOnly !== true ||
    manifest.nodeVersion !== EXPECTED_NODE_VERSION ||
    manifest.nodeAbi !== EXPECTED_NODE_ABI ||
    manifest.toolchain?.c !== EXPECTED_COMPILER_C ||
    manifest.toolchain?.cxx !== EXPECTED_COMPILER_CXX ||
    manifest.toolchain?.version !== EXPECTED_COMPILER_VERSION ||
    manifest.nodeHeaders?.nodeHeaderSha256 !==
      EXPECTED_NODE_HEADER_SHA256 ||
    manifest.nodeHeaders?.nodeVersionHeaderSha256 !==
      EXPECTED_NODE_VERSION_HEADER_SHA256 ||
    !Array.isArray(manifest.supportedHosts) ||
    manifest.supportedHosts.length !== 1 ||
    manifest.supportedHosts[0] !== "darwin-arm64"
  ) {
    refuse("source manifest is outside the pinned executed slice");
  }
  const repositoryFiles = manifest.repositoryFiles;
  if (
    repositoryFiles === null ||
    typeof repositoryFiles !== "object" ||
    Array.isArray(repositoryFiles)
  ) {
    refuse("source manifest repository-file map is invalid");
  }
  for (const [relativePath, expectedHash] of Object.entries(
    repositoryFiles,
  )) {
    if (
      typeof expectedHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(expectedHash) ||
      sha256File(join(REPO_ROOT, relativePath)) !== expectedHash
    ) {
      refuse(`repository source drift for ${relativePath}`);
    }
  }
  if (
    repositoryFiles[
      "scripts/run-youtube-stage2-native-bridge-proof-worker.mjs"
    ] !== sha256File(WORKER_PATH)
  ) {
    refuse("worker self-hash is not pinned by the source manifest");
  }
  return {
    manifest,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
}

function runPinnedBuild() {
  const raw = execFileSync(process.execPath, [BUILD_SCRIPT_PATH], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: closedSubprocessEnvironment(),
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    killSignal: "SIGKILL",
  });
  const value = parseObject(raw, "build result");
  assertExactKeys(
    value,
    [
      "format",
      "readinessClaim",
      "disposableOnly",
      "outputDirectory",
      "bindingPath",
      "buildManifestPath",
      "moduleSha256",
      "sourceManifestSha256",
    ],
    "build result",
  );
  if (
    value.format !== BUILD_RESULT_FORMAT ||
    value.readinessClaim !== "none" ||
    value.disposableOnly !== true ||
    typeof value.outputDirectory !== "string" ||
    typeof value.bindingPath !== "string" ||
    typeof value.buildManifestPath !== "string" ||
    typeof value.moduleSha256 !== "string" ||
    typeof value.sourceManifestSha256 !== "string"
  ) {
    refuse("build result shape is invalid");
  }
  return value;
}

function verifyBuild(result, sourceManifestSha256, independentHash) {
  if (
    result.sourceManifestSha256 !== sourceManifestSha256 ||
    !/^[a-f0-9]{64}$/.test(result.moduleSha256)
  ) {
    refuse("build result is outside the source-manifest anchor");
  }
  const outputDirectory = verifyTemporaryDirectory(
    result.outputDirectory,
    "build directory",
  );
  const bindingPath = verifyFileWithin(
    outputDirectory,
    result.bindingPath,
    "native binding",
  );
  const manifestPath = verifyFileWithin(
    outputDirectory,
    result.buildManifestPath,
    "build manifest",
  );
  const manifest = parseObject(
    readFileSync(manifestPath, "utf8"),
    "build manifest",
  );
  if (
    manifest.format !== BUILD_MANIFEST_FORMAT ||
    manifest.readinessClaim !== "none" ||
    manifest.disposableOnly !== true ||
    manifest.bridgeFunction !== "brain_s28_bridge_present" ||
    manifest.closedNativeProbeMethod !== CLOSED_NATIVE_METHOD ||
    manifest.betterSqlite3Version !== "11.10.0" ||
    manifest.sqliteVersion !== EXPECTED_SQLITE_VERSION ||
    manifest.sqliteSourceId !== EXPECTED_SQLITE_SOURCE_ID ||
    manifest.nodeVersion !== EXPECTED_NODE_VERSION ||
    manifest.nodeAbi !== EXPECTED_NODE_ABI ||
    manifest.platform !== "darwin" ||
    manifest.arch !== "arm64" ||
    manifest.compiler?.c !== EXPECTED_COMPILER_C ||
    manifest.compiler?.cxx !== EXPECTED_COMPILER_CXX ||
    manifest.compiler?.version !== EXPECTED_COMPILER_VERSION ||
    manifest.nodeHeaders?.nodeHeaderSha256 !==
      EXPECTED_NODE_HEADER_SHA256 ||
    manifest.nodeHeaders?.nodeVersionHeaderSha256 !==
      EXPECTED_NODE_VERSION_HEADER_SHA256 ||
    manifest.sourceManifestSha256 !== sourceManifestSha256 ||
    manifest.moduleFile !== "brain_s28_bridge.node" ||
    typeof manifest.transformedBetterSqlite3Sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(
      manifest.transformedBetterSqlite3Sha256,
    ) ||
    typeof manifest.moduleSha256 !== "string" ||
    "s28Ready" in manifest ||
    "implementationGo" in manifest
  ) {
    refuse("build manifest is outside the pinned executed contract");
  }
  if (basename(bindingPath) !== manifest.moduleFile) {
    refuse("native binding filename differs from the manifest");
  }
  const moduleSha256 = sha256File(bindingPath);
  if (
    moduleSha256 !== result.moduleSha256 ||
    moduleSha256 !== manifest.moduleSha256 ||
    (independentHash !== undefined &&
      moduleSha256 !== independentHash)
  ) {
    refuse("native binding fails independent provenance");
  }
  return {
    result,
    manifest,
    bindingPath,
    moduleSha256,
  };
}

function assertIndependentBuildsMatch(first, second) {
  if (
    first.result.outputDirectory === second.result.outputDirectory ||
    first.moduleSha256 !== second.moduleSha256 ||
    first.manifest.transformedBetterSqlite3Sha256 !==
      second.manifest.transformedBetterSqlite3Sha256 ||
    first.manifest.compiler.cxx !== second.manifest.compiler.cxx ||
    first.manifest.compiler.version !==
      second.manifest.compiler.version
  ) {
    refuse("independent same-toolchain rebuilds differ");
  }
}

function exerciseSelfConsistentTamperNegative(
  source,
  independentHash,
  directory,
) {
  const bindingPath = join(directory, "brain_s28_bridge.node");
  const manifestPath = join(
    directory,
    "brain_s28_bridge.build-manifest.json",
  );
  copyFileSync(source.bindingPath, bindingPath);
  appendFileSync(
    bindingPath,
    Buffer.from("UNPINNED-DISPOSABLE-TRAILER", "utf8"),
  );
  const tamperedHash = sha256File(bindingPath);
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        ...source.manifest,
        moduleSha256: tamperedHash,
      },
      null,
      2,
    )}\n`,
  );
  const result = {
    ...source.result,
    outputDirectory: directory,
    bindingPath,
    buildManifestPath: manifestPath,
    moduleSha256: tamperedHash,
  };
  try {
    verifyBuild(
      result,
      source.result.sourceManifestSha256,
      independentHash,
    );
  } catch {
    return true;
  }
  refuse("self-consistent tampered artifact passed provenance");
}

function loadAndSealAddon(bindingPath) {
  const addon = require(bindingPath);
  assertExactKeys(
    addon,
    ["Database", "setErrorConstructor"],
    "native addon export surface",
  );
  if (
    typeof addon.Database !== "function" ||
    typeof addon.setErrorConstructor !== "function"
  ) {
    refuse("native addon export types are invalid");
  }
  addon.setErrorConstructor(Error);
  const prototype = addon.Database.prototype;
  const prototypeNames = Object.getOwnPropertyNames(prototype).sort();
  const expectedNames = [
    CLOSED_NATIVE_METHOD,
    "close",
    "constructor",
  ].sort();
  if (
    prototypeNames.length !== expectedNames.length ||
    prototypeNames.some(
      (name, index) => name !== expectedNames[index],
    )
  ) {
    refuse("native database prototype surface is not exact");
  }
  const close = Object.getOwnPropertyDescriptor(
    prototype,
    "close",
  )?.value;
  const probe = Object.getOwnPropertyDescriptor(
    prototype,
    CLOSED_NATIVE_METHOD,
  )?.value;
  if (
    typeof close !== "function" ||
    typeof probe !== "function"
  ) {
    refuse("native close/probe descriptors are invalid");
  }
  Object.freeze(prototype);
  Object.freeze(addon.Database);
  Object.freeze(addon);
  if (
    Reflect.set(prototype, CLOSED_NATIVE_METHOD, () => "") ||
    Reflect.deleteProperty(prototype, "close") ||
    Reflect.defineProperty(prototype, "open", { value: true })
  ) {
    refuse("native database surface remained mutable");
  }
  return {
    addon,
    close,
    probe,
  };
}

function exactConstructorArguments() {
  return [
    ":memory:",
    ":memory:",
    true,
    false,
    false,
    5000,
    null,
    null,
  ];
}

function openNativeOwner(sealedAddon) {
  const owner = Reflect.construct(
    sealedAddon.addon.Database,
    exactConstructorArguments(),
  );
  if (
    owner === null ||
    typeof owner !== "object" ||
    Reflect.get(owner, "open") !== true
  ) {
    refuse("exact native memory owner did not open");
  }
  const ownerKeys = Reflect.ownKeys(owner).sort();
  const expectedOwnerKeys = [
    "memory",
    "name",
    "open",
    "readonly",
  ].sort();
  if (
    ownerKeys.length !== expectedOwnerKeys.length ||
    ownerKeys.some(
      (key, index) => key !== expectedOwnerKeys[index],
    )
  ) {
    refuse("native owner instance surface is not exact");
  }
  const openDescriptor = Object.getOwnPropertyDescriptor(owner, "open");
  if (
    openDescriptor?.writable !== false ||
    openDescriptor.configurable !== false ||
    Reflect.set(owner, "open", false) ||
    Reflect.deleteProperty(owner, "open")
  ) {
    refuse("native open attestation remained mutable");
  }
  if (
    !Reflect.preventExtensions(owner) ||
    Reflect.isExtensible(owner) ||
    Reflect.defineProperty(owner, "forbidden", { value: true })
  ) {
    refuse("native owner instance remained extensible");
  }
  return owner;
}

function closeNativeOwner(sealedAddon, owner) {
  Reflect.apply(sealedAddon.close, owner, []);
  if (Reflect.get(owner, "open") !== false) {
    refuse("native owner did not attest closed");
  }
}

function requireConstructorRefusal(
  sealedAddon,
  argumentsList,
  label,
) {
  let owner;
  try {
    owner = Reflect.construct(
      sealedAddon.addon.Database,
      argumentsList,
    );
  } catch {
    return true;
  }
  try {
    closeNativeOwner(sealedAddon, owner);
  } finally {
    refuse(`${label} constructor unexpectedly opened`);
  }
}

function exerciseConstructorMatrix(sealedAddon, directory) {
  const exact = exactConstructorArguments();
  const filePath = join(directory, "forbidden.sqlite");
  const tests = {
    emptyFilenameRefused: [["", "", true, false, false, 5000, null, null]],
    whitespaceFilenameRefused: [[
      " :memory: ",
      " :memory: ",
      true,
      false,
      false,
      5000,
      null,
      null,
    ]],
    fileBackedConstructorRefused: [[
      filePath,
      filePath,
      false,
      false,
      false,
      5000,
      null,
      null,
    ]],
    uriFilenameRefused: [[
      "file::memory:",
      "file::memory:",
      true,
      false,
      false,
      5000,
      null,
      null,
    ]],
    embeddedNulFilenameRefused: [[
      ":memory:\u0000suffix",
      ":memory:\u0000suffix",
      true,
      false,
      false,
      5000,
      null,
      null,
    ]],
    mismatchedFilenameGivenRefused: [[
      ":memory:",
      "different",
      true,
      false,
      false,
      5000,
      null,
      null,
    ]],
    falseInMemoryRefused: [[...exact.slice(0, 2), false, ...exact.slice(3)]],
    readonlyRefused: [[...exact.slice(0, 3), true, ...exact.slice(4)]],
    mustExistRefused: [[...exact.slice(0, 4), true, ...exact.slice(5)]],
    timeoutOverrideRefused: [[...exact.slice(0, 5), 1, ...exact.slice(6)]],
    loggerRefused: [[...exact.slice(0, 6), () => {}, null]],
    serializedBufferConstructorRefused: [[
      ...exact.slice(0, 7),
      Buffer.from("SQLite format 3\u0000", "utf8"),
    ]],
    missingArgumentRefused: [[...exact.slice(0, 7)]],
    extraArgumentRefused: [[...exact, "ninth"]],
  };
  const result = {};
  for (const [label, [argumentsList]] of Object.entries(tests)) {
    result[label] = requireConstructorRefusal(
      sealedAddon,
      argumentsList,
      label,
    );
  }
  if (
    readdirSync(directory).length !== 0 ||
    existsSync(filePath) ||
    existsSync(`${filePath}-wal`) ||
    existsSync(`${filePath}-shm`) ||
    existsSync(`${filePath}-journal`)
  ) {
    refuse("a rejected constructor created filesystem state");
  }
  return {
    ...result,
    noConstructorNegativeCreatedAFile: true,
  };
}

function exerciseClosedSurfaceNegatives(sealedAddon) {
  const owner = openNativeOwner(sealedAddon);
  try {
    const absent = [
      "prepare",
      "exec",
      "backup",
      "serialize",
      "function",
      "aggregate",
      "table",
      "loadExtension",
      "defaultSafeIntegers",
      "unsafeMode",
      "inTransaction",
    ].every((name) => !(name in owner));
    if (!absent) {
      refuse("a generic native database capability remained reachable");
    }
    return {
      genericSqlWriteRefused: true,
      attachRefusedWithoutFile: true,
      vacuumIntoRefusedWithoutFile: true,
      backupRefusedWithoutFile: true,
      loadExtensionRefused: true,
      serializeRefused: true,
      functionRegistrationRefused: true,
      unsafeModeRefused: true,
    };
  } finally {
    closeNativeOwner(sealedAddon, owner);
  }
}

function parseNativeProbe(raw, scenario) {
  if (typeof raw !== "string" || raw.length > 16_384) {
    refuse(`native probe transport invalid for ${scenario}`);
  }
  const value = parseObject(raw, `native probe ${scenario}`);
  assertExactKeys(value, NATIVE_PROBE_KEYS, `native probe ${scenario}`);
  if (
    value.format !== NATIVE_PROBE_FORMAT ||
    value.scenario !== scenario ||
    ![
      "not_applicable",
      "open",
      "committed",
      "rolled_back",
      "indeterminate",
    ].includes(value.outcome) ||
    value.bridgePresent !== true ||
    value.sqliteVersion !== EXPECTED_SQLITE_VERSION ||
    value.sqliteSourceId !== EXPECTED_SQLITE_SOURCE_ID ||
    value.readinessClaim !== "none"
  ) {
    refuse(`native probe identity mismatch for ${scenario}`);
  }
  for (const key of BOOLEAN_PROBE_KEYS) {
    if (typeof value[key] !== "boolean") {
      refuse(`native boolean mismatch for ${scenario}.${key}`);
    }
  }
  for (const key of INTEGER_PROBE_KEYS) {
    if (
      typeof value[key] !== "number" ||
      !Number.isSafeInteger(value[key])
    ) {
      refuse(`native integer mismatch for ${scenario}.${key}`);
    }
  }
  assertNativeScenarioSemantics(value, scenario);
  return value;
}

function requireFields(value, scenario, fields) {
  for (const [key, expected] of Object.entries(fields)) {
    if (value[key] !== expected) {
      refuse(
        `native scenario semantic mismatch for ${scenario}.${key}`,
      );
    }
  }
}

function requireCommitNotAttempted(value, scenario) {
  requireFields(value, scenario, {
    commitAttempted: false,
    commitPrepareCount: 0,
    commitStepCount: 0,
    commitFinalizeCount: 0,
    commitStepCode: -1,
    commitFinalizeCode: -1,
  });
}

function assertNativeScenarioSemantics(value, scenario) {
  for (const key of INTEGER_PROBE_KEYS) {
    if (
      key !== "commitStepCode" &&
      key !== "commitFinalizeCode" &&
      key !== "roleStepCode" &&
      key !== "roleFinalizeCode" &&
      value[key] < 0
    ) {
      refuse(`negative native counter for ${scenario}.${key}`);
    }
  }
  if (
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
    refuse(`universal native semantics failed for ${scenario}`);
  }

  const terminalPragmaScenarios = new Set([
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
  ]);
  const terminalPragmaExpected = terminalPragmaScenarios.has(scenario);
  requireFields(value, scenario, {
    pragmaAfterAttempted: terminalPragmaExpected,
    pragmaAfterAttested: terminalPragmaExpected,
    postClassificationSqlCount: scenario === "observer-open" ? 8 : 0,
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

  const noLifecycleAttempts = {
    replayAttemptCount: 0,
    resetAttemptCount: 0,
    rebindAttemptCount: 0,
  };
  const bindRefusalExpectation = {
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
  const consumedRoleExpectation = {
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
  const preparedExpectations = {
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
  const prepared = preparedExpectations[scenario];
  if (prepared !== undefined) {
    requireFields(value, scenario, {
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
      ...prepared,
    });
    requireCommitNotAttempted(value, scenario);
    return;
  }

  requireFields(value, scenario, {
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
    requireFields(value, scenario, {
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
    requireCommitNotAttempted(value, scenario);
    return;
  }

  if (
    scenario === "observer-arm-refused" ||
    scenario === "observer-statement-arm-refused"
  ) {
    requireFields(value, scenario, {
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
    requireCommitNotAttempted(value, scenario);
    return;
  }

  if (scenario === "observer-open") {
    requireFields(value, scenario, {
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
    requireCommitNotAttempted(value, scenario);
    return;
  }

  if (scenario === "observer-committed") {
    requireFields(value, scenario, {
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
    requireFields(value, scenario, {
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
    requireCommitNotAttempted(value, scenario);
    return;
  }

  const indeterminateSpecific = {
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
  }[scenario];
  if (indeterminateSpecific === undefined) {
    refuse(`scenario has no semantic contract: ${scenario}`);
  }
  requireFields(value, scenario, {
    outcome: "indeterminate",
    autocommit: 0,
    transactionState: 2,
    observerArmed: true,
    observerRefused: false,
    ...indeterminateSpecific,
  });
  requireCommitNotAttempted(value, scenario);
}

function runScenarios(sealedAddon) {
  const scenarios = {};
  let closedCount = 0;
  let indeterminateCloseCount = 0;
  for (const scenario of SCENARIOS) {
    const owner = openNativeOwner(sealedAddon);
    try {
      const raw = Reflect.apply(
        sealedAddon.probe,
        owner,
        [scenario],
      );
      const result = parseNativeProbe(raw, scenario);
      if (
        result.outcome === "indeterminate" &&
        Reflect.get(owner, "open") !== true
      ) {
        refuse("indeterminate owner closed before quarantine");
      }
      scenarios[scenario] = result;
      if (result.outcome === "indeterminate") {
        indeterminateCloseCount += 1;
      }
    } finally {
      closeNativeOwner(sealedAddon, owner);
      closedCount += 1;
    }
  }
  if (
    closedCount !== SCENARIOS.length ||
    indeterminateCloseCount !== 3
  ) {
    refuse("per-scenario connection quarantine count is invalid");
  }
  return scenarios;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function runProof() {
  assertSealedInvocation();
  const source = readAndVerifySourceManifest();
  let firstResult;
  let secondResult;
  let guardDirectory;
  let tamperDirectory;
  try {
    firstResult = runPinnedBuild();
    const first = verifyBuild(
      firstResult,
      source.sha256,
      undefined,
    );
    secondResult = runPinnedBuild();
    const second = verifyBuild(
      secondResult,
      source.sha256,
      first.moduleSha256,
    );
    assertIndependentBuildsMatch(first, second);

    const sealedAddon = loadAndSealAddon(first.bindingPath);
    guardDirectory = mkdtempSync(
      join(tmpdir(), `${TEMP_BUILD_PREFIX}guards-`),
    );
    const constructorNegatives =
      exerciseConstructorMatrix(sealedAddon, guardDirectory);
    const surfaceNegatives =
      exerciseClosedSurfaceNegatives(sealedAddon);
    const scenarios = runScenarios(sealedAddon);

    tamperDirectory = mkdtempSync(
      join(tmpdir(), `${TEMP_BUILD_PREFIX}tamper-`),
    );
    const selfConsistentTamperedArtifactRefused =
      exerciseSelfConsistentTamperNegative(
        first,
        second.moduleSha256,
        tamperDirectory,
      );

    const evidence = {
      format: PROOF_FORMAT,
      readinessClaim: "none",
      disposableOnly: true,
      provenance: {
        sourceManifestSha256: source.sha256,
        proofWorkerSha256: sha256File(WORKER_PATH),
        moduleSha256: first.moduleSha256,
        independentBuildCount: 2,
        independentModuleHashesEqual: true,
        transformedWrapperHashesEqual: true,
        compilerIdentity: first.manifest.compiler.cxx,
        compilerVersion: first.manifest.compiler.version,
      },
      host: {
        platform: "darwin",
        arch: "arm64",
        nodeVersion: process.versions.node,
        nodeAbi: process.versions.modules,
      },
      bridge: {
        sqlTripwirePresent: true,
        directNativeOwnerUsed: true,
        closedAddonSurfaceAttested: true,
        immutableNativeSurfaceAttested: true,
        sealedChildProcess: true,
      },
      lifecycle: {
        scenarioConnectionCount: SCENARIOS.length,
        allScenarioConnectionsClosed: true,
        indeterminateConnectionsQuarantinedByClose: true,
        processExitIsFinalQuarantine: true,
      },
      scenarios,
      negativeControls: {
        ...surfaceNegatives,
        ...constructorNegatives,
        selfConsistentTamperedArtifactRefused,
      },
      rawDatabaseReturned: false,
      artifactPathsReturned: false,
      processIdentifiersReturned: false,
      s28ReadinessProven: false,
      implementationGoProven: false,
    };
    return deepFreeze(evidence);
  } finally {
    cleanupDisposableDirectory(tamperDirectory);
    cleanupDisposableDirectory(guardDirectory);
    cleanupDisposableDirectory(secondResult?.outputDirectory);
    cleanupDisposableDirectory(firstResult?.outputDirectory);
  }
}

try {
  const evidence = runProof();
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
} catch {
  process.stderr.write("Disposable native proof worker refused.\n");
  process.exitCode = 1;
}
