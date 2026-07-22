#!/usr/bin/env node

import crypto from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import * as tar from "tar";

const SCRIPT_ALLOWLIST = [
  "scripts/check-ai-providers.mjs",
  "scripts/backup-offsite.sh",
  "scripts/install-durable-backup-tools.sh",
  "scripts/verified-volatile-backup-staging.sh",
  "scripts/cleanup-volatile-backup-staging.mjs",
  "scripts/check-notebooklm-operations.mjs",
  "scripts/scrub-notebooklm-backup.mjs",
  "scripts/backfill-embeddings-prod.mjs",
  "scripts/backfill-youtube-transcripts-prod.mjs",
  "scripts/restore-from-backup.sh",
  "scripts/activate-release.sh",
  "scripts/switch-release.sh",
  "scripts/check-release-migration-compatibility.mjs",
  "scripts/verify-release-runtime.mjs",
  "scripts/wait-for-release-health.mjs",
  "scripts/recall-first-apply-preflight.mjs",
  "scripts/recall-second-manual-verification-apply.sh",
  "scripts/recall-scheduled-apply.sh",
  "scripts/lib/recall-controlled-samples.mjs",
  "scripts/deploy/brain.service",
  "scripts/deploy/brain-backup-staging.tmpfiles.conf",
  "scripts/deploy/brain-backup-staging-cleanup.service",
  "scripts/deploy/brain-backup-staging-cleanup.timer",
  "scripts/deploy/brain-recall-backup-staging.drop-in.conf",
  "scripts/deploy/brain-recall-sync.service",
  "scripts/deploy/brain-recall-sync.timer",
  "scripts/deploy/brain-recall-manual-sync.service",
  "scripts/deploy/brain-recall-manual-sync.path",
  "scripts/deploy/brain-recall-manual-sync.timer",
  "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf",
  "scripts/deploy/brain-notebooklm-operations.service",
  "scripts/deploy/brain-notebooklm-operations.timer",
  "scripts/deploy/brain-notebooklm-retention.service",
  "scripts/deploy/brain-notebooklm-retention.timer",
  "scripts/deploy/brain-processing-audit.service",
  "scripts/deploy/brain-processing-audit.timer",
  "scripts/dist/audit-vector-index-prod.mjs",
  "scripts/dist/repair-vector-index-prod.mjs",
  "scripts/dist/processing-readiness-prod.mjs",
  "scripts/dist/notebooklm-retention-prod.mjs",
];
const TOOL_OVERLAYS = new Set([
  "scripts/activate-release.sh",
  "scripts/switch-release.sh",
  "scripts/backup-offsite.sh",
  "scripts/install-durable-backup-tools.sh",
  "scripts/verified-volatile-backup-staging.sh",
  "scripts/cleanup-volatile-backup-staging.mjs",
  "scripts/recall-first-apply-preflight.mjs",
  "scripts/restore-from-backup.sh",
  "scripts/check-release-migration-compatibility.mjs",
  "scripts/check-notebooklm-operations.mjs",
  "scripts/scrub-notebooklm-backup.mjs",
  "scripts/verify-release-runtime.mjs",
  "scripts/wait-for-release-health.mjs",
  "scripts/deploy/brain.service",
  "scripts/deploy/brain-backup-staging.tmpfiles.conf",
  "scripts/deploy/brain-backup-staging-cleanup.service",
  "scripts/deploy/brain-backup-staging-cleanup.timer",
  "scripts/deploy/brain-recall-backup-staging.drop-in.conf",
  "scripts/deploy/brain-recall-sync.service",
  "scripts/deploy/brain-recall-manual-sync.service",
  "scripts/deploy/brain-notebooklm-operations.service",
  "scripts/deploy/brain-notebooklm-operations.timer",
  "scripts/deploy/brain-notebooklm-retention.service",
  "scripts/deploy/brain-notebooklm-retention.timer",
  "scripts/deploy/brain-processing-audit.service",
  "scripts/deploy/brain-processing-audit.timer",
  "scripts/dist/processing-readiness-prod.mjs",
  "scripts/dist/notebooklm-retention-prod.mjs",
]);

function fail(message) {
  console.error(`[build-release-artifact] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    toolsRoot: process.cwd(),
    output: null,
    sha: null,
    builderSha: null,
    createdAt: null,
    extensionDist: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (["--root", "--tools-root", "--output", "--sha", "--builder-sha", "--created-at", "--extension-dist"].includes(value) && !next) fail(`missing value for ${value}`);
    if (value === "--root") { options.root = resolve(next); index += 1; }
    else if (value === "--tools-root") { options.toolsRoot = resolve(next); index += 1; }
    else if (value === "--output") { options.output = resolve(next); index += 1; }
    else if (value === "--sha") { options.sha = next; index += 1; }
    else if (value === "--builder-sha") { options.builderSha = next; index += 1; }
    else if (value === "--created-at") { options.createdAt = next; index += 1; }
    else if (value === "--extension-dist") { options.extensionDist = resolve(next); index += 1; }
    else fail(`unknown argument: ${value}`);
  }
  options.output ??= resolve(options.root, "release-artifacts");
  if (!options.sha) {
    try { options.sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: options.root, encoding: "utf8" }).trim(); }
    catch { fail("--sha is required outside a git checkout"); }
  }
  if (!/^[a-f0-9]{40}$/i.test(options.sha)) fail("release SHA must be a full 40-character Git SHA");
  options.builderSha ??= options.sha;
  if (!/^[a-f0-9]{40}$/i.test(options.builderSha)) fail("builder SHA must be a full 40-character Git SHA");
  const createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
  if (Number.isNaN(createdAt.valueOf())) fail("--created-at must be an ISO timestamp");
  return { ...options, createdAt };
}

function sha256File(path) {
  return crypto.createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copyRequired(source, destination) {
  if (!existsSync(source)) fail(`required release input missing: ${source}`);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, dereference: false, preserveTimestamps: false });
}

function walk(root, directory = root) {
  const entries = [];
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name);
    const info = lstatSync(absolute);
    if (info.isDirectory()) entries.push(...walk(root, absolute));
    else if (info.isFile()) entries.push(relative(root, absolute).split("\\").join("/"));
    else fail(`release payload contains a non-regular file: ${relative(root, absolute)}`);
  }
  return entries;
}

function fileManifest(root, paths) {
  return paths.map((path) => {
    const absolute = resolve(root, path);
    const info = lstatSync(absolute);
    if (!info.isFile()) fail(`release manifest entry is not a regular file: ${path}`);
    return { path, kind: "file", size: info.size, sha256: sha256File(absolute) };
  });
}

function packageMetadata(root) {
  const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
  const version = (name) => lock.packages?.[`node_modules/${name}`]?.version ?? fail(`lockfile package missing: ${name}`);
  return {
    lockfileSha256: sha256File(resolve(root, "package-lock.json")),
    nodeMajor: Number(process.versions.node.split(".")[0]),
    nodeAbi: process.versions.modules,
    nativeDependencies: {
      betterSqlite3: version("better-sqlite3"),
      sqliteVec: version("sqlite-vec"),
    },
  };
}

function migrationManifest(directory) {
  if (!existsSync(directory)) fail("migration source directory missing");
  const files = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()
    .map((name) => ({ name, sha256: sha256File(resolve(directory, name)) }));
  return {
    files,
    sha256: crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex"),
  };
}

async function packageExtension(options, shortSha) {
  if (!options.extensionDist) return null;
  if (!existsSync(options.extensionDist) || !statSync(options.extensionDist).isDirectory()) {
    fail(`extension dist directory missing: ${options.extensionDist}`);
  }
  const paths = walk(options.extensionDist);
  if (paths.length === 0 || !paths.includes("manifest.json")) {
    fail("extension dist must contain manifest.json and at least one regular file");
  }
  let extensionManifest;
  try {
    extensionManifest = JSON.parse(readFileSync(resolve(options.extensionDist, "manifest.json"), "utf8"));
  } catch {
    fail("extension dist manifest.json is invalid JSON");
  }
  if (extensionManifest?.manifest_version !== 3) fail("extension release must be Manifest V3");

  const files = fileManifest(options.extensionDist, paths);
  const fileListSha256 = crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex");
  const zip = new JSZip();
  // JSZip encodes UTC date fields. Pin the minimum portable DOS timestamp so
  // the extension archive remains byte-stable across runner timezones.
  const fixedDate = new Date(Date.UTC(1980, 0, 1, 0, 0, 0, 0));
  for (const path of paths) {
    zip.file(path, readFileSync(resolve(options.extensionDist, path)), {
      createFolders: false,
      date: fixedDate,
      unixPermissions: 0o100644,
    });
  }
  const bytes = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
    streamFiles: true,
  });
  const artifactName = `brain-extension-${shortSha}.zip`;
  const artifact = resolve(options.output, artifactName);
  writeFileSync(artifact, bytes, { mode: 0o600 });
  const artifactSha256 = sha256File(artifact);
  const manifest = {
    schemaVersion: 1,
    appSha: options.sha,
    builderSha: options.builderSha,
    createdAt: options.createdAt.toISOString(),
    artifactName,
    artifactSha256,
    fileListSha256,
    files,
  };
  const manifestPath = resolve(options.output, `${artifactName}.manifest.json`);
  const checksumPath = resolve(options.output, `${artifactName}.sha256`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(checksumPath, `${artifactSha256}  ${artifactName}\n`, { mode: 0o600 });
  return {
    artifact,
    manifest: manifestPath,
    checksum: checksumPath,
    artifactSha256,
    size: statSync(artifact).size,
    fileCount: files.length,
  };
}

const options = parseArgs(process.argv.slice(2));
const stagingParent = mkdtempSync(join(tmpdir(), "brain-release-artifact-"));
const staging = resolve(stagingParent, "runtime");
mkdirSync(staging, { recursive: true });
mkdirSync(options.output, { recursive: true });

try {
  copyRequired(resolve(options.root, ".next/standalone"), staging);
  copyRequired(resolve(options.root, ".next/static"), resolve(staging, ".next/static"));
  copyRequired(resolve(options.root, "public"), resolve(staging, "public"));
  for (const path of SCRIPT_ALLOWLIST) {
    const preferred = TOOL_OVERLAYS.has(path) ? options.toolsRoot : options.root;
    const fallback = preferred === options.root ? options.toolsRoot : options.root;
    const source = existsSync(resolve(preferred, path)) ? resolve(preferred, path) : resolve(fallback, path);
    copyRequired(source, resolve(staging, path));
  }

  for (const name of readdirSync(staging).filter((name) => name === ".env" || name.startsWith(".env."))) {
    rmSync(resolve(staging, name), { force: true });
  }

  for (const forbidden of [".env", "data", "release-artifacts"]) {
    if (existsSync(resolve(staging, forbidden))) fail(`forbidden path entered release: ${forbidden}`);
  }

  const payloadPaths = walk(staging);
  const files = fileManifest(staging, payloadPaths);
  const fileListSha256 = crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex");
  const metadata = packageMetadata(options.root);
  const sourceMigrations = migrationManifest(resolve(options.root, "src/db/migrations"));
  const runtimeMigrations = migrationManifest(resolve(staging, "src/db/migrations"));
  if (JSON.stringify(runtimeMigrations) !== JSON.stringify(sourceMigrations)) {
    fail("runtime migrations do not exactly match source migrations");
  }
  const migrations = runtimeMigrations;
  const innerManifest = {
    schemaVersion: 1,
    appSha: options.sha,
    builderSha: options.builderSha,
    createdAt: options.createdAt.toISOString(),
    fileListSha256,
    files,
    ...metadata,
    migrations,
  };
  writeFileSync(resolve(staging, "release-manifest.json"), `${JSON.stringify(innerManifest, null, 2)}\n`, { mode: 0o600 });

  const shortSha = options.sha.slice(0, 12).toLowerCase();
  const artifactName = `brain-release-${shortSha}.tar.gz`;
  const artifact = resolve(options.output, artifactName);
  const archivePaths = walk(staging);
  await tar.c({
    cwd: staging,
    file: artifact,
    gzip: { mtime: 0 },
    portable: true,
    noMtime: true,
    prefix: "runtime/",
  }, archivePaths);
  const artifactSha256 = sha256File(artifact);
  const externalManifest = { ...innerManifest, artifactName, artifactSha256 };
  const manifestPath = resolve(options.output, `${artifactName}.manifest.json`);
  const checksumPath = resolve(options.output, `${artifactName}.sha256`);
  writeFileSync(manifestPath, `${JSON.stringify(externalManifest, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(checksumPath, `${artifactSha256}  ${artifactName}\n`, { mode: 0o600 });
  const extension = await packageExtension(options, shortSha);
  const size = statSync(artifact).size;
  console.log(JSON.stringify({ ok: true, artifact, manifest: manifestPath, checksum: checksumPath, artifactSha256, size, fileCount: files.length, extension }));
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
