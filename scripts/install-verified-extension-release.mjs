#!/usr/bin/env node

import crypto from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";

const PROVENANCE_REPO = "arunpr614/ai-brain";
const PROVENANCE_HOST = "github.com";
const PROVENANCE_WORKFLOW = `${PROVENANCE_REPO}/.github/workflows/product-ci.yml`;
const MAX_ZIP_BYTES = 64 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 2_048;

function fail(message) {
  throw new Error(message);
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function safeReleasePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512 ||
      value.startsWith("/") || value.endsWith("/") || value.includes("\\") ||
      value.includes("\0") || /[\u0000-\u001f\u007f]/.test(value) ||
      value.normalize("NFC") !== value) return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function decodeZipPath(bytes, flags) {
  if ((flags & 0x800) === 0) {
    if (bytes.some((value) => value > 0x7f)) fail("extension zip uses a non-ASCII path without the UTF-8 flag");
    return bytes.toString("ascii");
  }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("extension zip contains a path that is not valid UTF-8"); }
}

function parseArgs(argv) {
  const positional = [];
  let verifyOnly = false;
  let expectedSha = null;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--verify-only") verifyOnly = true;
    else if (value === "--expected-sha") {
      expectedSha = argv[index + 1] ?? fail("missing value for --expected-sha");
      index += 1;
    } else if (value.startsWith("--")) fail(`unknown option: ${value}`);
    else positional.push(value);
  }
  if (positional.length < 1 || positional.length > (verifyOnly ? 1 : 2) || (!verifyOnly && positional.length !== 2)) {
    fail("usage: install-verified-extension-release.mjs <release-artifacts-dir> <absolute-stable-install-dir> [--expected-sha <40-hex>] [--verify-only]");
  }
  if (expectedSha !== null && !/^[a-f0-9]{40}$/i.test(expectedSha)) fail("--expected-sha must be a full 40-character Git SHA");
  return {
    artifactDirectory: resolve(positional[0]),
    stableDirectory: verifyOnly ? null : positional[1],
    verifyOnly,
    expectedSha: expectedSha?.toLowerCase() ?? null,
  };
}

function selectReleaseFiles(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) fail("release artifacts directory does not exist");
  const names = readdirSync(directory);
  const zips = names.filter((name) => name.startsWith("brain-extension-") && name.endsWith(".zip"));
  const manifests = names.filter((name) => name.startsWith("brain-extension-") && name.endsWith(".zip.manifest.json"));
  const checksums = names.filter((name) => name.startsWith("brain-extension-") && name.endsWith(".zip.sha256"));
  if (zips.length !== 1 || manifests.length !== 1 || checksums.length !== 1 ||
      !/^brain-extension-[a-f0-9]{12}\.zip$/.test(zips[0]) ||
      !/^brain-extension-[a-f0-9]{12}\.zip\.manifest\.json$/.test(manifests[0]) ||
      !/^brain-extension-[a-f0-9]{12}\.zip\.sha256$/.test(checksums[0])) {
    fail("release artifacts must contain exactly one extension zip, manifest, and checksum");
  }
  const artifactName = zips[0];
  if (manifests[0] !== `${artifactName}.manifest.json` || checksums[0] !== `${artifactName}.sha256`) {
    fail("extension zip, manifest, and checksum names do not identify the same artifact");
  }
  const selected = {
    artifact: join(directory, artifactName),
    manifest: join(directory, manifests[0]),
    checksum: join(directory, checksums[0]),
  };
  if (Object.values(selected).some((path) => {
    const entry = lstatSync(path);
    return !entry.isFile() || entry.isSymbolicLink();
  })) {
    fail("extension release inputs must be regular non-symlink files");
  }
  return selected;
}

function parseCentralDirectory(bytes) {
  if (bytes.length > MAX_ZIP_BYTES) fail("extension zip exceeds the compressed-size limit");
  const minimum = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0 || eocd + 22 + bytes.readUInt16LE(eocd + 20) !== bytes.length) fail("extension zip has an invalid end-of-central-directory record");
  const disk = bytes.readUInt16LE(eocd + 4);
  const centralDisk = bytes.readUInt16LE(eocd + 6);
  const diskEntries = bytes.readUInt16LE(eocd + 8);
  const totalEntries = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || totalEntries === 0 || totalEntries > MAX_FILES ||
      totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff ||
      centralOffset + centralSize !== eocd) fail("extension zip must be a bounded single-disk non-ZIP64 archive");

  const entries = [];
  const exactNames = new Set();
  const foldedNames = new Set();
  let expandedBytes = 0;
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > eocd || bytes.readUInt32LE(cursor) !== 0x02014b50) fail("extension zip central directory is malformed");
    const versionMadeBy = bytes.readUInt16LE(cursor + 4);
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const externalAttributes = bytes.readUInt32LE(cursor + 38);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > eocd || nameLength === 0 || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff ||
        (flags & ~0x808) !== 0 || ![0, 8].includes(method)) fail("extension zip contains an unsupported or encrypted entry");
    const name = decodeZipPath(bytes.subarray(cursor + 46, cursor + 46 + nameLength), flags);
    if (!safeReleasePath(name) || exactNames.has(name) || foldedNames.has(name.toLocaleLowerCase("en-US"))) {
      fail("extension zip contains an unsafe, duplicate, or case-colliding path");
    }
    exactNames.add(name);
    foldedNames.add(name.toLocaleLowerCase("en-US"));
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_EXPANDED_BYTES) fail("extension zip exceeds the expanded-size limit");
    const host = versionMadeBy >>> 8;
    const unixType = (externalAttributes >>> 16) & 0o170000;
    if (host === 3 && unixType !== 0 && unixType !== 0o100000) fail("extension zip contains a non-regular entry");
    if (localOffset + 30 > centralOffset || bytes.readUInt32LE(localOffset) !== 0x04034b50) fail("extension zip local header is malformed");
    const localFlags = bytes.readUInt16LE(localOffset + 6);
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localNameEnd = localOffset + 30 + localNameLength;
    if (localNameEnd + localExtraLength > centralOffset || localFlags !== flags || localMethod !== method ||
        decodeZipPath(bytes.subarray(localOffset + 30, localNameEnd), localFlags) !== name) {
      fail("extension zip local and central paths do not match");
    }
    entries.push({ name, uncompressedSize });
    cursor = recordEnd;
  }
  if (cursor !== eocd) fail("extension zip central-directory size is inconsistent");
  return entries;
}

function validateReleaseManifest(raw, artifactName, artifactSha256, expectedSha) {
  let manifest;
  try { manifest = JSON.parse(raw); } catch { fail("extension release manifest is not valid JSON"); }
  if (manifest?.schemaVersion !== 1 || !/^[a-f0-9]{40}$/i.test(manifest.appSha ?? "") ||
      !/^[a-f0-9]{40}$/i.test(manifest.builderSha ?? "") || manifest.appSha.toLowerCase() !== manifest.builderSha.toLowerCase()) {
    fail("extension release manifest must identify one main-branch application/builder SHA");
  }
  manifest.appSha = manifest.appSha.toLowerCase();
  manifest.builderSha = manifest.builderSha.toLowerCase();
  if (expectedSha !== null && manifest.appSha !== expectedSha) fail("extension release SHA does not match --expected-sha");
  if (artifactName !== `brain-extension-${manifest.appSha.slice(0, 12)}.zip` || manifest.artifactName !== artifactName ||
      manifest.artifactSha256 !== artifactSha256) fail("extension release artifact identity or digest is inconsistent");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > MAX_FILES) fail("extension release file manifest is invalid");
  const exactNames = new Set();
  const foldedNames = new Set();
  let total = 0;
  for (const entry of manifest.files) {
    if (entry?.kind !== "file" || !safeReleasePath(entry.path) || !Number.isSafeInteger(entry.size) || entry.size < 0 ||
        !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") || exactNames.has(entry.path) || foldedNames.has(entry.path.toLocaleLowerCase("en-US"))) {
      fail("extension release file manifest contains an invalid, duplicate, or unsafe entry");
    }
    exactNames.add(entry.path);
    foldedNames.add(entry.path.toLocaleLowerCase("en-US"));
    total += entry.size;
    if (total > MAX_EXPANDED_BYTES) fail("extension release file manifest exceeds the expanded-size limit");
  }
  const sorted = [...manifest.files].sort((left, right) => left.path.localeCompare(right.path));
  if (sorted.some((entry, index) => entry.path !== manifest.files[index].path) ||
      sha256Bytes(Buffer.from(JSON.stringify(manifest.files))) !== manifest.fileListSha256) {
    fail("extension release file-list order or digest is inconsistent");
  }
  return manifest;
}

async function verifyZipPayload(bytes, releaseManifest) {
  const centralEntries = parseCentralDirectory(bytes);
  const centralByName = new Map(centralEntries.map((entry) => [entry.name, entry]));
  const declaredByName = new Map(releaseManifest.files.map((entry) => [entry.path, entry]));
  if (centralByName.size !== declaredByName.size || [...centralByName.keys()].some((name) => !declaredByName.has(name))) {
    fail("extension zip entries do not exactly match the signed file manifest");
  }
  let archive;
  try { archive = await JSZip.loadAsync(bytes); } catch { fail("extension zip could not be decoded"); }
  const payloads = new Map();
  for (const [name, declared] of declaredByName) {
    const zipEntry = archive.file(name);
    if (!zipEntry || zipEntry.dir || (zipEntry.unsafeOriginalName && zipEntry.unsafeOriginalName !== name)) fail("extension zip path was rewritten or is not a regular file");
    const payload = await zipEntry.async("nodebuffer");
    if (payload.length !== declared.size || payload.length !== centralByName.get(name).uncompressedSize || sha256Bytes(payload) !== declared.sha256) {
      fail("extension zip payload does not match the signed file manifest");
    }
    payloads.set(name, payload);
  }
  let chromeManifest;
  try { chromeManifest = JSON.parse(payloads.get("manifest.json")?.toString("utf8") ?? ""); } catch { fail("packaged Chrome manifest is not valid JSON"); }
  const versionParts = typeof chromeManifest?.version === "string" && /^\d+(\.\d+){0,3}$/.test(chromeManifest.version)
    ? chromeManifest.version.split(".").map(Number)
    : null;
  if (chromeManifest?.manifest_version !== 3 || typeof chromeManifest.name !== "string" || !chromeManifest.name.trim() ||
      versionParts === null || versionParts.some((part) => !Number.isSafeInteger(part) || part < 0 || part > 65_535)) {
    fail("packaged extension is not a valid Manifest V3 release");
  }
  const worker = chromeManifest.background?.service_worker;
  if (typeof worker !== "string" || !payloads.has(worker)) fail("packaged extension service worker is missing");
  if (!Array.isArray(chromeManifest.optional_host_permissions) || chromeManifest.optional_host_permissions.length !== 1 ||
      chromeManifest.optional_host_permissions[0] !== "https://notebooklm.google.com/*") {
    fail("packaged extension lacks the exact optional NotebookLM app-host permission");
  }
  const expectedPermissions = ["activeTab", "tabs", "contextMenus", "storage", "notifications", "alarms"];
  if (!Array.isArray(chromeManifest.permissions) ||
      chromeManifest.permissions.length !== expectedPermissions.length ||
      expectedPermissions.some((permission) => !chromeManifest.permissions.includes(permission)) ||
      !Array.isArray(chromeManifest.host_permissions) || chromeManifest.host_permissions.length !== 1 ||
      chromeManifest.host_permissions[0] !== "https://brain.arunp.in/*" ||
      (Array.isArray(chromeManifest.optional_permissions) && chromeManifest.optional_permissions.length !== 0) ||
      (Array.isArray(chromeManifest.content_scripts) && chromeManifest.content_scripts.length !== 0)) {
    fail("packaged extension permission posture is invalid");
  }
  return { payloads, chromeManifest };
}

function verifyAttestations(paths, builderSha) {
  const auth = spawnSync("gh", ["auth", "status", "--hostname", PROVENANCE_HOST], { stdio: "ignore" });
  if (auth.error?.code === "ENOENT") fail("GitHub CLI is required for provenance verification");
  if (auth.status !== 0) fail("GitHub CLI authentication is required for provenance verification");
  for (const subject of [paths.artifact, paths.manifest, paths.checksum]) {
    const result = spawnSync("gh", [
      "attestation", "verify", subject,
      "--repo", PROVENANCE_REPO,
      "--signer-workflow", PROVENANCE_WORKFLOW,
      "--source-ref", "refs/heads/main",
      "--source-digest", builderSha,
      "--deny-self-hosted-runners",
    ], { stdio: "ignore" });
    if (result.status !== 0) fail("GitHub main/workflow/source provenance verification failed");
  }
}

function installStable(payloads, rawDestination, appSha) {
  if (!isAbsolute(rawDestination) || resolve(rawDestination) !== rawDestination || rawDestination === parse(rawDestination).root) {
    fail("stable install directory must be an explicit canonical absolute path, not a filesystem root");
  }
  const parent = dirname(rawDestination);
  mkdirSync(parent, { recursive: true, mode: 0o755 });
  if (realpathSync(parent) !== parent) fail("stable install directory parent must not resolve through a symlink");
  if (existsSync(rawDestination)) {
    const current = lstatSync(rawDestination);
    if (!current.isDirectory() || current.isSymbolicLink()) fail("existing stable install target must be a regular directory");
  }

  const baseName = rawDestination.slice(parent.length + 1);
  const staging = mkdtempSync(join(parent, `.${baseName}.staging-`));
  let backup = null;
  try {
    for (const [name, payload] of payloads) {
      const target = join(staging, ...name.split("/"));
      mkdirSync(dirname(target), { recursive: true, mode: 0o755 });
      writeFileSync(target, payload, { mode: 0o644, flag: "wx" });
      chmodSync(target, 0o644);
    }
    for (const [name, payload] of payloads) {
      const target = join(staging, ...name.split("/"));
      if (!lstatSync(target).isFile() || sha256Bytes(readFileSync(target)) !== sha256Bytes(payload)) fail("staged extension verification failed");
    }
    if (existsSync(rawDestination)) {
      backup = join(parent, `.${baseName}.previous-${Date.now()}-${appSha.slice(0, 12)}`);
      renameSync(rawDestination, backup);
    }
    try { renameSync(staging, rawDestination); }
    catch (error) {
      if (backup && !existsSync(rawDestination)) renameSync(backup, rawDestination);
      throw error;
    }
    return { backupCreated: backup !== null };
  } finally {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
  }
}

async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 22) fail("Node 22 is required");
  const options = parseArgs(process.argv.slice(2));
  const paths = selectReleaseFiles(options.artifactDirectory);
  const bytes = readFileSync(paths.artifact);
  const artifactSha256 = sha256Bytes(bytes);
  const releaseManifest = validateReleaseManifest(
    readFileSync(paths.manifest, "utf8"),
    paths.artifact.slice(dirname(paths.artifact).length + 1),
    artifactSha256,
    options.expectedSha,
  );
  const expectedChecksum = `${artifactSha256}  ${releaseManifest.artifactName}\n`;
  if (readFileSync(paths.checksum, "utf8") !== expectedChecksum) fail("extension checksum file is not exact or does not match the zip");
  const verified = await verifyZipPayload(bytes, releaseManifest);
  verifyAttestations(paths, releaseManifest.builderSha);
  const install = options.verifyOnly ? { backupCreated: false } : installStable(verified.payloads, options.stableDirectory, releaseManifest.appSha);
  const evidence = {
    ok: true,
    operation: options.verifyOnly ? "verified" : "installed",
    appSha: releaseManifest.appSha,
    builderSha: releaseManifest.builderSha,
    artifactSha256,
    extensionVersion: verified.chromeManifest.version,
    manifestVersion: 3,
    verifiedAt: new Date().toISOString(),
    stablePathSha256: options.stableDirectory ? sha256Bytes(Buffer.from(options.stableDirectory)) : null,
    backupCreated: install.backupCreated,
    provenance: {
      repository: PROVENANCE_REPO,
      workflow: ".github/workflows/product-ci.yml",
      sourceRef: "refs/heads/main",
    },
  };
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

main().catch((error) => {
  console.error(`[install-verified-extension-release] ${error instanceof Error ? error.message : "verification failed"}`);
  process.exit(1);
});
