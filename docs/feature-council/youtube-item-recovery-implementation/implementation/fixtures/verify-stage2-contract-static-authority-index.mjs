#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";

const DOMAIN = "stage2-contract-static-authority-index-v1";
const IMPLEMENTATION_ROOT =
  "docs/feature-council/youtube-item-recovery-implementation/implementation";
const INDEX_PATH =
  "implementation/fixtures/stage2-contract-static-authority-index-v1.json";
const BOUNDARY_DESCRIPTOR_BASENAMES = [
  "131072.compact_json_no_lf.payload_without_prefix.4.equal.json",
  "131072.compact_json_no_lf.payload_without_prefix.4.plus-one.json",
  "131072.compact_json_no_lf.raw_bytes.0.equal.json",
  "131072.compact_json_no_lf.raw_bytes.0.plus-one.json",
  "16384.compact_json_no_lf.payload_without_prefix.4.equal.json",
  "16384.compact_json_no_lf.payload_without_prefix.4.plus-one.json",
  "262144.canonical_json_one_lf.canonical_bytes_including_lf.0.equal.json",
  "262144.canonical_json_one_lf.canonical_bytes_including_lf.0.plus-one.json",
  "262144.canonical_json_one_lf.canonical_bytes_including_lf.4.equal.json",
  "262144.canonical_json_one_lf.canonical_bytes_including_lf.4.plus-one.json",
  "262144.compact_json_no_lf.payload_without_prefix.4.equal.json",
  "262144.compact_json_no_lf.payload_without_prefix.4.plus-one.json",
  "4096.compact_json_no_lf.payload_without_prefix.4.equal.json",
  "4096.compact_json_no_lf.payload_without_prefix.4.plus-one.json",
  "65536.compact_json_no_lf.payload_without_prefix.4.equal.json",
  "65536.compact_json_no_lf.payload_without_prefix.4.plus-one.json",
];
const ORACLE_SCHEMA_PATHS = [
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/deadline-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/kqueue-exit-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/proc-pidinfo-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-exit-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-launch-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/subject-process-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/darwin/vm-region-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/cgroup-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/deadline-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/pidfd-identity-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/procfs-snapshot-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/socket-probe-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/subject-exit-v1.json",
  "implementation/fixtures/oracle-observation-schemas-v1/linux/subject-launch-v1.json",
];

function unsignedByteCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

const EXPECTED_PATHS = Object.freeze(
  [
    ...BOUNDARY_DESCRIPTOR_BASENAMES.map(
      (basename) =>
        `implementation/fixtures/control-frame-boundary-v1/${basename}`,
    ),
    ...ORACLE_SCHEMA_PATHS,
    "implementation/fixtures/generate-stage2-host-control-oracle-static-fixtures.mjs",
    "implementation/fixtures/oracle-schema-registry-darwin-v1.json",
    "implementation/fixtures/oracle-schema-registry-linux-v1.json",
    "implementation/fixtures/stage2-assertion-manifest-v1.json",
    "implementation/fixtures/stage2-control-frame-boundary-fixtures-v1.json",
    "implementation/fixtures/stage2-control-frame-state-registry-v1.json",
    "implementation/fixtures/stage2-host-control-oracle-authoring-inventory-v1.json",
    "implementation/fixtures/verify-stage2-contract-static-authority-index.mjs",
    "implementation/fixtures/verify-stage2-control-frame-boundary-fixtures.mjs",
  ].sort(unsignedByteCompare),
);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, expected, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(expected)
  ) {
    fail(`${label}: key order or membership mismatch`);
  }
}

function compactOneLf(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function parseCompactOneLf(bytes, label) {
  if (bytes.length < 2 || bytes.at(-1) !== 0x0a || bytes.at(-2) === 0x0a) {
    fail(`${label}: expected exactly one final LF`);
  }
  let value;
  try {
    value = JSON.parse(bytes.subarray(0, bytes.length - 1).toString("utf8"));
  } catch {
    fail(`${label}: invalid JSON`);
  }
  if (!compactOneLf(value).equals(bytes)) {
    fail(`${label}: not exact compact JSON plus one LF`);
  }
  return value;
}

function validateCapsulePath(capsulePath) {
  if (
    typeof capsulePath !== "string" ||
    !/^[\x20-\x7e]+$/.test(capsulePath) ||
    !capsulePath.startsWith("implementation/") ||
    capsulePath.includes("\\") ||
    capsulePath.includes("%")
  ) {
    fail(`invalid capsule path: ${JSON.stringify(capsulePath)}`);
  }
  if (
    capsulePath
      .split("/")
      .some(
        (component) =>
          component.length === 0 || component === "." || component === "..",
      )
  ) {
    fail(`invalid capsule path component: ${capsulePath}`);
  }
}

function repositoryPath(repositoryRoot, capsulePath) {
  validateCapsulePath(capsulePath);
  const implementationRoot = path.resolve(repositoryRoot, IMPLEMENTATION_ROOT);
  const resolved = path.resolve(
    implementationRoot,
    capsulePath.slice("implementation/".length),
  );
  if (!resolved.startsWith(`${implementationRoot}${path.sep}`)) {
    fail(`capsule path escapes implementation root: ${capsulePath}`);
  }
  return resolved;
}

function sameFilesystemIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFilesystemSnapshot(left, right) {
  return (
    sameFilesystemIdentity(left, right) &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.rdev === right.rdev &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

async function relstatPrecheckedPath(record, capsulePath) {
  let identity;
  try {
    identity = await lstat(record.resolved, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`${record.label}: disappeared while reading ${capsulePath}`);
    }
    throw error;
  }
  if (
    identity.isSymbolicLink() ||
    (record.isLeaf ? !identity.isFile() : !identity.isDirectory()) ||
    !sameFilesystemSnapshot(identity, record.identity) ||
    (record.isLeaf && identity.nlink !== 1n)
  ) {
    fail(`${record.label}: identity changed while reading ${capsulePath}`);
  }
}

async function relstatPrecheckedPaths(records) {
  for (const record of records) {
    await relstatPrecheckedPath(record, record.capsulePath);
  }
}

async function precheckOrdinaryFile(repositoryRoot, capsulePath) {
  const resolved = repositoryPath(repositoryRoot, capsulePath);
  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
  const relative = path.relative(resolvedRepositoryRoot, resolved);
  if (
    relative.length === 0 ||
    path.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  ) {
    fail(`capsule path escapes repository root: ${capsulePath}`);
  }

  let repositoryRootIdentity;
  try {
    repositoryRootIdentity = await lstat(resolvedRepositoryRoot, {
      bigint: true,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail("repository root: missing");
    }
    throw error;
  }
  if (
    repositoryRootIdentity.isSymbolicLink() ||
    !repositoryRootIdentity.isDirectory()
  ) {
    fail("repository root: expected a nonsymlink directory");
  }
  const precheckedPaths = [
    {
      resolved: resolvedRepositoryRoot,
      label: "repository root",
      identity: repositoryRootIdentity,
      isLeaf: false,
      capsulePath,
    },
  ];

  const components = relative.split(path.sep);
  let current = resolvedRepositoryRoot;
  for (const [position, component] of components.entries()) {
    current = path.join(current, component);
    let identity;
    try {
      identity = await lstat(current, { bigint: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        fail(`${capsulePath}: missing`);
      }
      throw error;
    }

    const isLeaf = position === components.length - 1;
    if (identity.isSymbolicLink()) {
      fail(
        `${capsulePath}: symlink path component: ${components
          .slice(0, position + 1)
          .join("/")}`,
      );
    }
    if (!isLeaf && !identity.isDirectory()) {
      fail(
        `${capsulePath}: expected a directory path component: ${components
          .slice(0, position + 1)
          .join("/")}`,
      );
    }
    if (isLeaf && !identity.isFile()) {
      fail(`${capsulePath}: expected a nonsymlink ordinary file`);
    }
    if (isLeaf && identity.nlink !== 1n) {
      fail(`${capsulePath}: expected an unaliased link-count-one file`);
    }
    precheckedPaths.push({
      resolved: current,
      label: isLeaf
        ? capsulePath
        : `${capsulePath}: ${components.slice(0, position + 1).join("/")}`,
      identity,
      isLeaf,
      capsulePath,
    });
  }

  if (
    !Number.isInteger(fsConstants.O_NOFOLLOW) ||
    fsConstants.O_NOFOLLOW === 0
  ) {
    fail("verifier defect: O_NOFOLLOW is unavailable");
  }

  return { resolved, capsulePath, precheckedPaths };
}

async function readPrecheckedOrdinaryFile(precheck) {
  const { resolved, capsulePath, precheckedPaths } = precheck;
  const precheckedLeaf = precheckedPaths.at(-1).identity;
  let handle;
  try {
    try {
      handle = await open(
        resolved,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
    } catch (error) {
      if (error?.code === "ELOOP" || error?.code === "ENOENT") {
        fail(`${capsulePath}: leaf changed before no-follow open`);
      }
      throw error;
    }

    const openedLeaf = await handle.stat({ bigint: true });
    if (
      !openedLeaf.isFile() ||
      openedLeaf.nlink !== 1n ||
      !sameFilesystemSnapshot(openedLeaf, precheckedLeaf)
    ) {
      fail(`${capsulePath}: opened leaf differs from prechecked identity`);
    }

    const bytes = await handle.readFile();
    const readLeaf = await handle.stat({ bigint: true });
    if (
      !readLeaf.isFile() ||
      readLeaf.nlink !== 1n ||
      !sameFilesystemSnapshot(readLeaf, precheckedLeaf)
    ) {
      fail(`${capsulePath}: opened leaf changed while reading`);
    }
    for (const record of precheckedPaths) {
      await relstatPrecheckedPath(record, capsulePath);
    }
    return { bytes, precheckedPaths };
  } finally {
    if (handle !== undefined) {
      await handle.close();
    }
  }
}

async function readOrdinaryFile(repositoryRoot, capsulePath) {
  return readPrecheckedOrdinaryFile(
    await precheckOrdinaryFile(repositoryRoot, capsulePath),
  );
}

async function buildIndexOnce(repositoryRoot) {
  if (EXPECTED_PATHS.length !== 39) {
    fail("verifier defect: expected exactly 39 static authority leaves");
  }
  if (new Set(EXPECTED_PATHS).size !== EXPECTED_PATHS.length) {
    fail("verifier defect: duplicate expected static authority path");
  }
  const files = [];
  const precheckedPaths = [];
  const prechecks = [];
  for (const capsulePath of EXPECTED_PATHS) {
    prechecks.push(await precheckOrdinaryFile(repositoryRoot, capsulePath));
  }
  for (const precheck of prechecks) {
    const read = await readPrecheckedOrdinaryFile(precheck);
    if (read.bytes.length === 0) {
      fail(`${precheck.capsulePath}: expected a nonempty authority file`);
    }
    precheckedPaths.push(...read.precheckedPaths);
    files.push({
      path: precheck.capsulePath,
      size: read.bytes.length,
      sha256: sha256(read.bytes),
    });
  }
  return {
    index: {
      domain: DOMAIN,
      file_count: files.length,
      files,
    },
    precheckedPaths,
  };
}

async function buildStableIndex(repositoryRoot) {
  const first = await buildIndexOnce(repositoryRoot);
  const second = await buildIndexOnce(repositoryRoot);
  if (!compactOneLf(first.index).equals(compactOneLf(second.index))) {
    fail("static authority changed across consecutive complete reads");
  }
  await relstatPrecheckedPaths([
    ...first.precheckedPaths,
    ...second.precheckedPaths,
  ]);
  return second;
}

async function verifyIndex(repositoryRoot) {
  const expected = await buildStableIndex(repositoryRoot);
  const indexRead = await readOrdinaryFile(repositoryRoot, INDEX_PATH);
  const index = parseCompactOneLf(indexRead.bytes, INDEX_PATH);
  exactKeys(index, ["domain", "file_count", "files"], "static authority index");
  if (index.domain !== DOMAIN || index.file_count !== 39) {
    fail("static authority index: domain or file count mismatch");
  }
  if (!Array.isArray(index.files) || index.files.length !== 39) {
    fail("static authority index: expected exactly 39 file records");
  }
  for (const [position, record] of index.files.entries()) {
    exactKeys(record, ["path", "size", "sha256"], `index file ${position}`);
    validateCapsulePath(record.path);
    if (
      !Number.isSafeInteger(record.size) ||
      record.size <= 0 ||
      typeof record.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(record.sha256)
    ) {
      fail(`index file ${position}: invalid size or SHA-256`);
    }
  }
  await relstatPrecheckedPaths([
    ...expected.precheckedPaths,
    ...indexRead.precheckedPaths,
  ]);
  if (!indexRead.bytes.equals(compactOneLf(expected.index))) {
    fail(
      "static authority index: content differs from exact 39-leaf authority",
    );
  }
  process.stdout.write(
    `stage2-contract-static-authority-index-v1:PASS:${sha256(indexRead.bytes)}\n`,
  );
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (
    arguments_.length === 2 &&
    arguments_[0] === "--verify-index" &&
    arguments_[1] === INDEX_PATH
  ) {
    await verifyIndex(process.cwd());
    return;
  }
  if (arguments_.length === 1 && arguments_[0] === "--print-index") {
    const generated = await buildStableIndex(process.cwd());
    await relstatPrecheckedPaths(generated.precheckedPaths);
    process.stdout.write(compactOneLf(generated.index));
    return;
  }
  fail(`usage: --verify-index ${INDEX_PATH} | --print-index`);
}

main().catch((error) => {
  process.stderr.write(
    `stage2-contract-static-authority-index-v1:FAIL:${error.message}\n`,
  );
  process.exitCode = 1;
});
