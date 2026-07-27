#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const FACTORY_ROOT = join(
  REPO_ROOT,
  "native",
  "brain-s28-file-factory",
);
const SOURCE_PATH = join(
  FACTORY_ROOT,
  "src",
  "brain_s28_file_factory.cpp",
);
const SOURCE_MANIFEST_PATH = join(
  FACTORY_ROOT,
  "file-factory-source-manifest.json",
);
const TEMP_BUILD_PREFIX = "brain-s28-file-factory-build-";
const FAILED_BUILD_LEAF_NAMES = [
  "sqlite3.o",
  "brain_s28_file_factory.o",
  "brain_s28_file_factory.node",
  "brain_s28_file_factory.build-manifest.json",
];
const require = createRequire(import.meta.url);
const FORBIDDEN_BUILD_ENVIRONMENT_KEYS = [
  "AR",
  "AS",
  "BRAIN_S28_NODE_INCLUDE_DIR",
  "CCC_OVERRIDE_OPTIONS",
  "CC",
  "CFLAGS",
  "CLANG_CONFIG_FILE",
  "COMPILER_PATH",
  "CPATH",
  "CPPFLAGS",
  "CPLUS_INCLUDE_PATH",
  "CXX",
  "CXXFLAGS",
  "DEVELOPER_DIR",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "GCC_EXEC_PREFIX",
  "LD",
  "LD_PRELOAD",
  "LDFLAGS",
  "LIBRARY_PATH",
  "MACOSX_DEPLOYMENT_TARGET",
  "NM",
  "NODE_OPTIONS",
  "NODE_PATH",
  "OBJC",
  "RANLIB",
  "RC_ARCHS",
  "SDKROOT",
  "SOURCE_DATE_EPOCH",
  "STRIP",
  "TOOLCHAINS",
  "ZERO_AR_DATE",
];

const REFUSAL_REASONS = Object.freeze({
  zeroArguments: "builder accepts zero arguments",
  ambientOverrides: "ambient build overrides are forbidden",
  sourceManifest: "source manifest validation failed",
  pinnedInput: "pinned input validation failed",
  disposableSlice: "source manifest is outside the pinned disposable slice",
  nodeExecutable: "Node executable differs from the source manifest",
  nodeHeaders: "Node headers differ from the pinned source manifest",
  compilerIdentity: "compiler identity differs from the source manifest",
  compilerStart: "pinned compiler could not start",
  compilerInvocation: "pinned compiler invocation failed",
  sqliteDefines: "pinned SQLite define set is incomplete",
  compiledAddon: "compiled native addon validation failed",
  internal: "internal build failure",
});

class BuildRefusal {
  constructor(reason) {
    this.reason = reason;
  }
}

function refuse(reason) {
  throw new BuildRefusal(reason);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function assertPlainObject(value, reason) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    refuse(reason);
  }
}

function assertExactRegularFile(path, reason) {
  if (!existsSync(path)) refuse(reason);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    refuse(reason);
  }
}

function verifyHashMap(base, values) {
  assertPlainObject(values, REFUSAL_REASONS.pinnedInput);
  const verifiedBase = realpathSync(base);
  for (const [relativePath, expectedHash] of Object.entries(values)) {
    if (
      typeof relativePath !== "string" ||
      relativePath.length === 0 ||
      relativePath.includes("\0") ||
      relativePath.includes("\\") ||
      isAbsolute(relativePath) ||
      relativePath
        .split("/")
        .some(
          (segment) =>
            segment.length === 0 ||
            segment === "." ||
            segment === "..",
        ) ||
      typeof expectedHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(expectedHash)
    ) {
      refuse(REFUSAL_REASONS.pinnedInput);
    }
    const joinedPath = resolve(verifiedBase, relativePath);
    const joinedRelative = relative(verifiedBase, joinedPath);
    if (
      joinedRelative.length === 0 ||
      joinedRelative === ".." ||
      joinedRelative.startsWith(`..${sep}`) ||
      isAbsolute(joinedRelative)
    ) {
      refuse(REFUSAL_REASONS.pinnedInput);
    }
    assertExactRegularFile(
      joinedPath,
      REFUSAL_REASONS.pinnedInput,
    );
    const verifiedPath = realpathSync(joinedPath);
    const verifiedRelative = relative(verifiedBase, verifiedPath);
    if (
      verifiedRelative.length === 0 ||
      verifiedRelative === ".." ||
      verifiedRelative.startsWith(`..${sep}`) ||
      isAbsolute(verifiedRelative)
    ) {
      refuse(REFUSAL_REASONS.pinnedInput);
    }
    if (sha256File(verifiedPath) !== expectedHash) {
      refuse(REFUSAL_REASONS.pinnedInput);
    }
  }
}

function run(command, argumentsList) {
  const result = spawnSync(command, argumentsList, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
      TMPDIR: realpathSync(tmpdir()),
    },
  });
  if (result.error) refuse(REFUSAL_REASONS.compilerStart);
  if (result.status !== 0 || result.signal !== null) {
    refuse(REFUSAL_REASONS.compilerInvocation);
  }
  return result.stdout.trim();
}

function sameIdentity(actual, expected) {
  return (
    actual.dev === expected.dev &&
    actual.ino === expected.ino &&
    actual.uid === expected.uid
  );
}

function cleanupFailedBuild(path, expectedIdentity) {
  try {
    if (!existsSync(path)) return true;
    const verifiedTempRoot = realpathSync(tmpdir());
    const verifyDirectory = () => {
      const stat = lstatSync(path);
      const verified = realpathSync(path);
      return (
        stat.isDirectory() &&
        !stat.isSymbolicLink() &&
        (stat.mode & 0o7777) === 0o700 &&
        sameIdentity(stat, expectedIdentity) &&
        verified === path &&
        dirname(verified) === verifiedTempRoot &&
        basename(verified).startsWith(TEMP_BUILD_PREFIX)
      );
    };
    if (!verifyDirectory()) return false;
    for (const name of FAILED_BUILD_LEAF_NAMES) {
      if (!verifyDirectory()) return false;
      const leafPath = join(path, name);
      if (!existsSync(leafPath)) continue;
      const leaf = lstatSync(leafPath);
      if (
        !leaf.isFile() ||
        leaf.isSymbolicLink() ||
        leaf.uid !== expectedIdentity.uid ||
        leaf.nlink !== 1
      ) {
        return false;
      }
      unlinkSync(leafPath);
    }
    if (!verifyDirectory()) return false;
    rmdirSync(path);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (process.argv.length !== 2) {
    refuse(REFUSAL_REASONS.zeroArguments);
  }
  const ambientOverrides = FORBIDDEN_BUILD_ENVIRONMENT_KEYS.filter(
    (key) => Object.hasOwn(process.env, key),
  );
  if (ambientOverrides.length !== 0) {
    refuse(REFUSAL_REASONS.ambientOverrides);
  }

  assertExactRegularFile(
    SOURCE_MANIFEST_PATH,
    REFUSAL_REASONS.sourceManifest,
  );
  const sourceManifestText = readFileSync(
    SOURCE_MANIFEST_PATH,
    "utf8",
  );
  let sourceManifest;
  try {
    sourceManifest = JSON.parse(sourceManifestText);
  } catch {
    refuse(REFUSAL_REASONS.sourceManifest);
  }
  assertPlainObject(
    sourceManifest,
    REFUSAL_REASONS.sourceManifest,
  );
  if (
    sourceManifest.format !==
      "brain-s28-disposable-file-factory-source-v1" ||
    sourceManifest.readinessClaim !== "none" ||
    sourceManifest.disposableOnly !== true ||
    sourceManifest.fileBackedFactoryOnly !== true ||
    sourceManifest.productionAuthority !== false ||
    sourceManifest.migration028Authority !== false ||
    sourceManifest.nodeVersion !== process.versions.node ||
    sourceManifest.nodeAbi !== process.versions.modules ||
    process.platform !== "darwin" ||
    process.arch !== "arm64" ||
    !Array.isArray(sourceManifest.supportedHosts) ||
    sourceManifest.supportedHosts.length !== 1 ||
    sourceManifest.supportedHosts[0] !== "darwin-arm64"
  ) {
    refuse(REFUSAL_REASONS.disposableSlice);
  }

  const pinnedNode = realpathSync(process.execPath);
  if (pinnedNode !== sourceManifest.nodeExecutable) {
    refuse(REFUSAL_REASONS.nodeExecutable);
  }

  const betterSqlitePackagePath =
    require.resolve("better-sqlite3/package.json");
  const upstreamRoot = realpathSync(
    dirname(betterSqlitePackagePath),
  );
  verifyHashMap(upstreamRoot, sourceManifest.upstreamFiles);
  verifyHashMap(REPO_ROOT, sourceManifest.repositoryFiles);
  verifyHashMap(
    REPO_ROOT,
    sourceManifest.immutablePrerequisiteFiles,
  );

  const nodeIncludeDirectory =
    sourceManifest.nodeHeaders?.directory;
  if (
    typeof nodeIncludeDirectory !== "string" ||
    realpathSync(nodeIncludeDirectory) !== nodeIncludeDirectory ||
    sha256File(join(nodeIncludeDirectory, "node.h")) !==
      sourceManifest.nodeHeaders.nodeHeaderSha256 ||
    sha256File(join(nodeIncludeDirectory, "node_version.h")) !==
      sourceManifest.nodeHeaders.nodeVersionHeaderSha256
  ) {
    refuse(REFUSAL_REASONS.nodeHeaders);
  }

  const cCompiler = realpathSync(sourceManifest.toolchain?.c);
  const cppCompiler = realpathSync(sourceManifest.toolchain?.cxx);
  if (
    cCompiler !== sourceManifest.toolchain.c ||
    cppCompiler !== sourceManifest.toolchain.cxx ||
    run(cppCompiler, ["--version"]).split("\n")[0] !==
      sourceManifest.toolchain.version
  ) {
    refuse(REFUSAL_REASONS.compilerIdentity);
  }

  const outputDirectory = mkdtempSync(
    join(realpathSync(tmpdir()), TEMP_BUILD_PREFIX),
  );
  chmodSync(outputDirectory, 0o700);
  const outputDirectoryIdentity = lstatSync(outputDirectory);
  try {
  const sqliteDirectory = join(upstreamRoot, "deps", "sqlite3");
  const sqliteSource = join(sqliteDirectory, "sqlite3.c");
  const sqliteObject = join(outputDirectory, "sqlite3.o");
  const factoryObject = join(
    outputDirectory,
    "brain_s28_file_factory.o",
  );
  const bindingPath = join(
    outputDirectory,
    "brain_s28_file_factory.node",
  );
  const buildManifestPath = join(
    outputDirectory,
    "brain_s28_file_factory.build-manifest.json",
  );
  const definesText = readFileSync(
    join(upstreamRoot, "deps", "defines.gypi"),
    "utf8",
  );
  const sqliteDefines = Array.from(
    definesText.matchAll(/^\s*'([^']+)',?\s*$/gm),
    (match) => `-D${match[1]}`,
  );
  if (sqliteDefines.length < 20) {
    refuse(REFUSAL_REASONS.sqliteDefines);
  }

  const commonFlags = [
    "-O3",
    "-fPIC",
    "-fvisibility=hidden",
    "-DNDEBUG",
    "-DBUILDING_NODE_EXTENSION",
    "-DNODE_GYP_MODULE_NAME=brain_s28_file_factory",
  ];
  const nativeSourceSha256 = sha256File(SOURCE_PATH);
  const buildInputDescriptor = {
    format: "brain-s28-disposable-file-factory-build-input-v1",
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    nodeAbi: process.versions.modules,
    sqliteVersion: sourceManifest.sqliteVersion,
    sqliteSourceId: sourceManifest.sqliteSourceId,
    toolchain: {
      c: cCompiler,
      cxx: cppCompiler,
      version: sourceManifest.toolchain.version,
    },
    flags: {
      common: commonFlags,
      sqlite: ["-std=c99", "-w"],
      factory: ["-std=c++20", "-stdlib=libc++"],
      link: ["-bundle", "-undefined", "dynamic_lookup", "-stdlib=libc++"],
    },
    sqliteDefines,
    inputs: {
      nativeSourceSha256,
      sqliteSourceSha256:
        sourceManifest.upstreamFiles["deps/sqlite3/sqlite3.c"],
      sqliteHeaderSha256:
        sourceManifest.upstreamFiles["deps/sqlite3/sqlite3.h"],
      sqliteExtensionHeaderSha256:
        sourceManifest.upstreamFiles["deps/sqlite3/sqlite3ext.h"],
      sqliteDefinesFileSha256:
        sourceManifest.upstreamFiles["deps/defines.gypi"],
      nodeHeaderSha256:
        sourceManifest.nodeHeaders.nodeHeaderSha256,
      nodeVersionHeaderSha256:
        sourceManifest.nodeHeaders.nodeVersionHeaderSha256,
    },
  };
  const buildInputSha256 = sha256Bytes(
    JSON.stringify(buildInputDescriptor),
  );
  const sqliteArguments = [
    "-c",
    sqliteSource,
    "-o",
    sqliteObject,
    "-std=c99",
    "-w",
    ...commonFlags,
    ...sqliteDefines,
  ];
  const factoryArguments = [
    "-c",
    SOURCE_PATH,
    "-o",
    factoryObject,
    "-std=c++20",
    ...commonFlags,
    "-I",
    nodeIncludeDirectory,
    "-I",
    sqliteDirectory,
    "-stdlib=libc++",
  ];
  const linkArguments = [
    "-bundle",
    "-undefined",
    "dynamic_lookup",
    "-stdlib=libc++",
    factoryObject,
    sqliteObject,
    "-o",
    bindingPath,
  ];

  run(cCompiler, sqliteArguments);
  run(cppCompiler, factoryArguments);
  run(cppCompiler, linkArguments);
  assertExactRegularFile(
    bindingPath,
    REFUSAL_REASONS.compiledAddon,
  );

  const moduleSha256 = sha256File(bindingPath);
  const sourceManifestSha256 = sha256Bytes(sourceManifestText);
  const buildManifest = {
    format: "brain-s28-disposable-file-factory-build-v1",
    readinessClaim: "none",
    disposableOnly: true,
    fileBackedFactoryOnly: true,
    productionAuthority: false,
    migration028Authority: false,
    addonExport: "runDisposableFileFactoryMatrix",
    moduleFile: "brain_s28_file_factory.node",
    nodeVersion: process.versions.node,
    nodeAbi: process.versions.modules,
    sqliteVersion: sourceManifest.sqliteVersion,
    sqliteSourceId: sourceManifest.sqliteSourceId,
    platform: process.platform,
    arch: process.arch,
    compiler: {
      c: cCompiler,
      cxx: cppCompiler,
      version: sourceManifest.toolchain.version,
    },
    nodeHeaders: sourceManifest.nodeHeaders,
    sourceManifestSha256,
    nativeSourceSha256,
    buildInputSha256,
    commands: {
      sqliteCompile: {
        command: cCompiler,
        arguments: sqliteArguments,
      },
      factoryCompile: {
        command: cppCompiler,
        arguments: factoryArguments,
      },
      link: {
        command: cppCompiler,
        arguments: linkArguments,
      },
    },
    moduleSha256,
    localArtifactReleaseProvenance: false,
  };
  writeFileSync(
    buildManifestPath,
    `${JSON.stringify(buildManifest, null, 2)}\n`,
    { mode: 0o600 },
  );

  process.stdout.write(
    `${JSON.stringify({
      format:
        "brain-s28-disposable-file-factory-build-result-v1",
      readinessClaim: "none",
      disposableOnly: true,
      outputDirectory,
      bindingPath,
      buildManifestPath,
      moduleSha256,
      sourceManifestSha256,
    })}\n`,
  );
  } catch (error) {
    cleanupFailedBuild(outputDirectory, outputDirectoryIdentity);
    throw error;
  }
}

try {
  main();
} catch (error) {
  const reason =
    error instanceof BuildRefusal
      ? error.reason
      : REFUSAL_REASONS.internal;
  process.stderr.write(
    `Disposable file factory build refused: ${reason}\n`,
  );
  process.exitCode = 1;
}
