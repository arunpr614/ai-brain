import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
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
import Database from "better-sqlite3";
import {
  DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256,
  DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256,
  DISPOSABLE_NATIVE_PROBE_SCENARIOS,
  type DisposableNativeBridgeProofEvidence,
  type DisposableNativeProbeResult,
  type DisposableNativeProbeScenario,
} from "./native-bridge";

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
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
const BUILD_RESULT_FORMAT =
  "brain-s28-disposable-native-bridge-build-result-v1";
const BUILD_MANIFEST_FORMAT =
  "brain-s28-disposable-native-bridge-build-v1";
const NATIVE_PROBE_FORMAT =
  "brain-s28-disposable-native-probe-v1";
const EXPECTED_SQLITE_VERSION = "3.49.2";
const EXPECTED_SQLITE_SOURCE_ID =
  "2025-05-07 10:39:52 " +
  "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
const CLOSED_NATIVE_METHOD = "_stage2DisposableBridgeProbe";
const TEMP_BUILD_PREFIX = "brain-s28-disposable-native-bridge-";
const require = createRequire(import.meta.url);

interface BuildResult {
  format: typeof BUILD_RESULT_FORMAT;
  readinessClaim: "none";
  disposableOnly: true;
  outputDirectory: string;
  bindingPath: string;
  buildManifestPath: string;
  moduleSha256: string;
  sourceManifestSha256: string;
}

interface BuildManifest {
  format: typeof BUILD_MANIFEST_FORMAT;
  readinessClaim: "none";
  disposableOnly: true;
  bridgeFunction: "brain_s28_bridge_present";
  closedNativeProbeMethod: typeof CLOSED_NATIVE_METHOD;
  betterSqlite3Version: "11.10.0";
  sqliteVersion: typeof EXPECTED_SQLITE_VERSION;
  sqliteSourceId: string;
  nodeVersion: string;
  nodeAbi: string;
  platform: string;
  arch: string;
  compiler: {
    c: string;
    cxx: string;
    version: string;
  };
  sourceManifestSha256: string;
  transformedBetterSqlite3Sha256: string;
  moduleFile: "brain_s28_bridge.node";
  moduleSha256: string;
}

interface VerifiedBuild {
  result: BuildResult;
  manifest: BuildManifest;
  bindingPath: string;
  moduleSha256: string;
}

type RawProbeOwner = Record<
  typeof CLOSED_NATIVE_METHOD,
  (scenario: DisposableNativeProbeScenario) => string
>;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function refuse(message: string): never {
  throw new Error(`Disposable native route proof refused: ${message}`);
}

function assertPinnedControllerSources(): void {
  if (
    sha256File(SOURCE_MANIFEST_PATH) !==
    DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256
  ) {
    refuse("source manifest hash does not match the internal anchor");
  }
  if (
    sha256File(BUILD_SCRIPT_PATH) !==
    DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256
  ) {
    refuse("build script hash does not match the internal anchor");
  }
}

function parseObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} is not valid JSON`, { cause: error });
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    refuse(`${label} is not an object`);
  }
  return parsed as Record<string, unknown>;
}

function runPinnedBuild(): BuildResult {
  const raw = execFileSync(process.execPath, [BUILD_SCRIPT_PATH], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  });
  const value = parseObject(raw, "build result");
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
  return value as unknown as BuildResult;
}

function isWithin(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation !== "" && !relation.startsWith("..") &&
    !isAbsolute(relation);
}

function verifyTemporaryBuildDirectory(path: string): string {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    refuse("build output directory is missing");
  }
  const verified = realpathSync(path);
  const verifiedTempRoot = realpathSync(tmpdir());
  if (
    !isWithin(verifiedTempRoot, verified) ||
    !basename(verified).startsWith(TEMP_BUILD_PREFIX)
  ) {
    refuse("build output directory is outside the disposable temp boundary");
  }
  return verified;
}

function verifyFileWithin(
  directory: string,
  path: string,
  label: string,
): string {
  if (!existsSync(path) || !lstatSync(path).isFile()) {
    refuse(`${label} is missing or is not a regular file`);
  }
  const verified = realpathSync(path);
  if (!isWithin(directory, verified)) {
    refuse(`${label} is outside its disposable build directory`);
  }
  return verified;
}

function assertBuildManifest(
  value: Record<string, unknown>,
): asserts value is Record<string, unknown> & BuildManifest {
  const compiler = value.compiler as Record<string, unknown> | undefined;
  if (
    value.format !== BUILD_MANIFEST_FORMAT ||
    value.readinessClaim !== "none" ||
    value.disposableOnly !== true ||
    value.bridgeFunction !== "brain_s28_bridge_present" ||
    value.closedNativeProbeMethod !== CLOSED_NATIVE_METHOD ||
    value.betterSqlite3Version !== "11.10.0" ||
    value.sqliteVersion !== EXPECTED_SQLITE_VERSION ||
    value.sqliteSourceId !== EXPECTED_SQLITE_SOURCE_ID ||
    value.nodeAbi !== process.versions.modules ||
    value.platform !== process.platform ||
    value.arch !== process.arch ||
    value.sourceManifestSha256 !==
      DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256 ||
    value.moduleFile !== "brain_s28_bridge.node" ||
    typeof value.moduleSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.moduleSha256) ||
    typeof value.transformedBetterSqlite3Sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.transformedBetterSqlite3Sha256) ||
    compiler === undefined ||
    typeof compiler.cxx !== "string" ||
    typeof compiler.version !== "string"
  ) {
    refuse("build manifest does not match the internal proof contract");
  }
  if ("s28Ready" in value || "implementationGo" in value) {
    refuse("build manifest contains a forbidden readiness field");
  }
}

function verifyBuild(
  result: BuildResult,
  independentlyExpectedModuleSha256?: string,
): VerifiedBuild {
  if (
    result.format !== BUILD_RESULT_FORMAT ||
    result.readinessClaim !== "none" ||
    result.disposableOnly !== true ||
    result.sourceManifestSha256 !==
      DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256
  ) {
    refuse("build result does not match the internal proof contract");
  }
  const outputDirectory = verifyTemporaryBuildDirectory(
    result.outputDirectory,
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
  const manifestValue = parseObject(
    readFileSync(manifestPath, "utf8"),
    "build manifest",
  );
  assertBuildManifest(manifestValue);
  const manifest = manifestValue as unknown as BuildManifest;
  if (basename(bindingPath) !== manifest.moduleFile) {
    refuse("native binding filename does not match the build manifest");
  }
  const actualModuleSha256 = sha256File(bindingPath);
  if (
    actualModuleSha256 !== manifest.moduleSha256 ||
    actualModuleSha256 !== result.moduleSha256
  ) {
    refuse("native binding is not self-consistent with the build result");
  }
  if (
    independentlyExpectedModuleSha256 !== undefined &&
    actualModuleSha256 !== independentlyExpectedModuleSha256
  ) {
    refuse("native binding differs from the independent pinned rebuild");
  }
  return {
    result,
    manifest,
    bindingPath,
    moduleSha256: actualModuleSha256,
  };
}

function assertIndependentBuildsMatch(
  first: VerifiedBuild,
  second: VerifiedBuild,
): void {
  if (first.result.outputDirectory === second.result.outputDirectory) {
    refuse("independent builds reused an output directory");
  }
  if (
    first.moduleSha256 !== second.moduleSha256 ||
    first.manifest.transformedBetterSqlite3Sha256 !==
      second.manifest.transformedBetterSqlite3Sha256 ||
    first.manifest.compiler.cxx !== second.manifest.compiler.cxx ||
    first.manifest.compiler.version !== second.manifest.compiler.version ||
    first.manifest.nodeVersion !== second.manifest.nodeVersion ||
    first.manifest.nodeAbi !== second.manifest.nodeAbi
  ) {
    refuse("independent same-toolchain rebuilds are not identical");
  }
}

function exactCppdbSymbol(): symbol {
  const packageRoot = dirname(
    require.resolve("better-sqlite3/package.json"),
  );
  const util = require(join(packageRoot, "lib", "util.js")) as {
    cppdb?: unknown;
  };
  if (typeof util.cppdb !== "symbol") {
    refuse("pinned better-sqlite3 cppdb symbol is unavailable");
  }
  return util.cppdb;
}

function parseNativeProbe(
  raw: string,
  scenario: DisposableNativeProbeScenario,
): DisposableNativeProbeResult {
  const value = parseObject(raw, "native probe result");
  if (
    value.format !== NATIVE_PROBE_FORMAT ||
    value.scenario !== scenario ||
    value.bridgePresent !== true ||
    value.sqliteVersion !== EXPECTED_SQLITE_VERSION ||
    value.sqliteSourceId !== EXPECTED_SQLITE_SOURCE_ID ||
    value.readinessClaim !== "none"
  ) {
    refuse(`native probe attestation mismatch for ${scenario}`);
  }
  return value as unknown as DisposableNativeProbeResult;
}

function nativeProbeOwner(
  db: Database.Database,
  cppdb: symbol,
): RawProbeOwner {
  const owner = (db as unknown as Record<symbol, unknown>)[cppdb];
  if (owner === null || typeof owner !== "object") {
    refuse("exact better-sqlite3 cppdb owner is absent");
  }
  const method = (owner as Record<string, unknown>)[CLOSED_NATIVE_METHOD];
  if (typeof method !== "function") {
    refuse("closed native probe is absent from the exact cppdb owner");
  }
  return owner as RawProbeOwner;
}

function runNativeScenario(
  owner: RawProbeOwner,
  scenario: DisposableNativeProbeScenario,
): DisposableNativeProbeResult {
  return parseNativeProbe(owner[CLOSED_NATIVE_METHOD](scenario), scenario);
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function exerciseFileRouteNegatives(
  db: Database.Database,
  directory: string,
): Promise<
  Pick<
    DisposableNativeBridgeProofEvidence["negativeControls"],
    | "genericSqlWriteRefused"
    | "attachRefusedWithoutFile"
    | "vacuumIntoRefusedWithoutFile"
    | "backupRefusedWithoutFile"
    | "loadExtensionRefused"
  >
> {
  let genericSqlWriteRefused = false;
  try {
    db.exec("CREATE TEMP TABLE forbidden_public_write(value INTEGER)");
  } catch {
    genericSqlWriteRefused = true;
  }

  const attachPath = join(directory, "forbidden-attach.sqlite");
  let attachRefused = false;
  try {
    db.exec(`ATTACH DATABASE ${sqlString(attachPath)} AS forbidden_attach`);
  } catch {
    attachRefused = true;
  }

  const vacuumPath = join(directory, "forbidden-vacuum.sqlite");
  let vacuumIntoRefused = false;
  try {
    db.exec(`VACUUM INTO ${sqlString(vacuumPath)}`);
  } catch {
    vacuumIntoRefused = true;
  }

  const backupPath = join(directory, "forbidden-backup.sqlite");
  let backupRefused = false;
  try {
    await db.backup(backupPath);
  } catch {
    backupRefused = true;
  }

  const sqliteVec = require("sqlite-vec") as {
    getLoadablePath(): string;
  };
  let loadExtensionRefused = false;
  try {
    db.loadExtension(sqliteVec.getLoadablePath());
  } catch {
    loadExtensionRefused = true;
  }

  if (
    !genericSqlWriteRefused ||
    !attachRefused ||
    existsSync(attachPath) ||
    !vacuumIntoRefused ||
    existsSync(vacuumPath) ||
    !backupRefused ||
    existsSync(backupPath) ||
    !loadExtensionRefused
  ) {
    refuse("a public database or filesystem route escaped the native guards");
  }
  return {
    genericSqlWriteRefused: true,
    attachRefusedWithoutFile: true,
    vacuumIntoRefusedWithoutFile: true,
    backupRefusedWithoutFile: true,
    loadExtensionRefused: true,
  };
}

function exerciseSelfConsistentTamperNegative(
  source: VerifiedBuild,
  independentModuleSha256: string,
  directory: string,
): true {
  const tamperedBindingPath = join(directory, "brain_s28_bridge.node");
  const tamperedManifestPath = join(
    directory,
    "brain_s28_bridge.build-manifest.json",
  );
  copyFileSync(source.bindingPath, tamperedBindingPath);
  appendFileSync(
    tamperedBindingPath,
    Buffer.from("UNPINNED-DISPOSABLE-TRAILER", "utf8"),
  );
  const tamperedHash = sha256File(tamperedBindingPath);
  writeFileSync(
    tamperedManifestPath,
    `${JSON.stringify(
      {
        ...source.manifest,
        moduleSha256: tamperedHash,
      },
      null,
      2,
    )}\n`,
  );
  const tamperedResult: BuildResult = {
    ...source.result,
    outputDirectory: directory,
    bindingPath: tamperedBindingPath,
    buildManifestPath: tamperedManifestPath,
    moduleSha256: tamperedHash,
  };
  try {
    verifyBuild(tamperedResult, independentModuleSha256);
  } catch {
    return true;
  }
  refuse("self-consistent tampered artifact passed independent provenance");
}

function cleanupDisposableDirectory(path: string | undefined): void {
  if (path === undefined || !existsSync(path)) return;
  const resolvedPath = realpathSync(path);
  const resolvedTempRoot = realpathSync(tmpdir());
  if (
    !isWithin(resolvedTempRoot, resolvedPath) ||
    !basename(resolvedPath).startsWith(TEMP_BUILD_PREFIX)
  ) {
    refuse("cleanup target escaped the disposable temp boundary");
  }
  rmSync(resolvedPath, { recursive: true, force: true });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Builds and probes a disposable native route without accepting artifacts,
 * database handles, paths, runtime overrides, SQL, callbacks, or role policy.
 * The returned value is immutable evidence only.
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

  assertPinnedControllerSources();
  let firstResult: BuildResult | undefined;
  let secondResult: BuildResult | undefined;
  let guardDirectory: string | undefined;
  let tamperDirectory: string | undefined;
  let db: Database.Database | undefined;
  try {
    firstResult = runPinnedBuild();
    const first = verifyBuild(firstResult);
    secondResult = runPinnedBuild();
    const second = verifyBuild(
      secondResult,
      first.moduleSha256,
    );
    assertIndependentBuildsMatch(first, second);

    db = new Database(":memory:", {
      nativeBinding: first.bindingPath,
    });
    const cppdb = exactCppdbSymbol();
    const injectedSymbol = Symbol("untrusted-native-probe-owner");
    const injectedOwner = {
      [CLOSED_NATIVE_METHOD]: () =>
        JSON.stringify({
          format: NATIVE_PROBE_FORMAT,
          scenario: "bridge-attestation",
          bridgePresent: true,
          sqliteVersion: EXPECTED_SQLITE_VERSION,
          sqliteSourceId: EXPECTED_SQLITE_SOURCE_ID,
          readinessClaim: "none",
        }),
    };
    Object.defineProperty(db, injectedSymbol, {
      value: injectedOwner,
      enumerable: false,
    });
    const owner = nativeProbeOwner(db, cppdb);
    if (owner === injectedOwner) {
      refuse("injected Symbol owner displaced the exact cppdb owner");
    }

    const tripwire = db
      .prepare(
        "SELECT brain_s28_bridge_present() AS bridge_present, " +
          "sqlite_version() AS sqlite_version, " +
          "sqlite_source_id() AS sqlite_source_id",
      )
      .get() as {
        bridge_present: number;
        sqlite_version: string;
        sqlite_source_id: string;
      };
    if (
      tripwire.bridge_present !== 1 ||
      tripwire.sqlite_version !== EXPECTED_SQLITE_VERSION ||
      tripwire.sqlite_source_id !== EXPECTED_SQLITE_SOURCE_ID
    ) {
      refuse("SQL bridge tripwire does not match the pinned native module");
    }

    const scenarios = {} as Record<
      DisposableNativeProbeScenario,
      DisposableNativeProbeResult
    >;
    for (const scenario of DISPOSABLE_NATIVE_PROBE_SCENARIOS) {
      scenarios[scenario] = runNativeScenario(owner, scenario);
    }

    guardDirectory = mkdtempSync(
      join(tmpdir(), `${TEMP_BUILD_PREFIX}guards-`),
    );
    const fileRouteNegatives = await exerciseFileRouteNegatives(
      db,
      guardDirectory,
    );

    tamperDirectory = mkdtempSync(
      join(tmpdir(), `${TEMP_BUILD_PREFIX}tamper-`),
    );
    const selfConsistentTamperedArtifactRefused =
      exerciseSelfConsistentTamperNegative(
        first,
        second.moduleSha256,
        tamperDirectory,
      );

    const evidence: DisposableNativeBridgeProofEvidence = {
      format: "brain-s28-disposable-native-route-proof-v2",
      readinessClaim: "none",
      disposableOnly: true,
      provenance: {
        sourceManifestSha256:
          DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256,
        moduleSha256: first.moduleSha256,
        independentBuildCount: 2,
        independentModuleHashesEqual: true,
        transformedWrapperHashesEqual: true,
        compilerIdentity: first.manifest.compiler.cxx,
        compilerVersion: first.manifest.compiler.version,
      },
      host: {
        platform: first.manifest.platform,
        arch: first.manifest.arch,
        nodeVersion: first.manifest.nodeVersion,
        nodeAbi: first.manifest.nodeAbi,
      },
      bridge: {
        sqlTripwirePresent: true,
        exactCppdbOwnerUsed: true,
        injectedSymbolOwnerIgnored: true,
      },
      scenarios,
      negativeControls: {
        ...fileRouteNegatives,
        selfConsistentTamperedArtifactRefused,
      },
      rawDatabaseReturned: false,
      artifactPathsReturned: false,
      s28ReadinessProven: false,
      implementationGoProven: false,
    };
    return deepFreeze(evidence);
  } finally {
    if (db?.open) db.close();
    cleanupDisposableDirectory(tamperDirectory);
    cleanupDisposableDirectory(guardDirectory);
    cleanupDisposableDirectory(secondResult?.outputDirectory);
    cleanupDisposableDirectory(firstResult?.outputDirectory);
  }
}
