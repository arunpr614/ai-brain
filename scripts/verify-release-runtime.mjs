#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RELEASE_GATE_VERSION = 1;

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

const [runtimeArg, manifestArg, artifactArg] = process.argv.slice(2);
if (!runtimeArg || !manifestArg || !artifactArg) fail("usage: verify-release-runtime <runtime-dir> <manifest.json> <artifact.tar.gz>");
const runtime = resolve(runtimeArg);
const manifestPath = resolve(manifestArg);
const artifact = resolve(artifactArg);
if (!existsSync(runtime) || !existsSync(manifestPath) || !existsSync(artifact)) fail("runtime, manifest, or artifact is missing");

const sha256File = (path) => crypto.createHash("sha256").update(readFileSync(path)).digest("hex");
const walk = (directory = runtime) => readdirSync(directory).sort().flatMap((name) => {
  const absolute = join(directory, name);
  const info = lstatSync(absolute);
  if (info.isDirectory()) return walk(absolute);
  assert.ok(info.isFile(), `release contains a non-regular file: ${relative(runtime, absolute)}`);
  return [relative(runtime, absolute).split("\\").join("/")];
});
const digestEntry = (path) => {
  const absolute = resolve(runtime, path);
  const info = lstatSync(absolute);
  assert.ok(info.isFile(), `release manifest entry is not a regular file: ${path}`);
  return { path, kind: "file", size: info.size, sha256: sha256File(absolute) };
};

const migrationManifest = () => {
  const directory = resolve(runtime, "src/db/migrations");
  assert.ok(existsSync(directory), "runtime migration directory missing");
  const files = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()
    .map((name) => {
      const path = resolve(directory, name);
      assert.ok(lstatSync(path).isFile(), `runtime migration is not a regular file: ${name}`);
      return { name, sha256: sha256File(path) };
    });
  return {
    files,
    sha256: crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex"),
  };
};

try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(
    manifest.releaseGateVersion === undefined || manifest.releaseGateVersion === RELEASE_GATE_VERSION,
    "unsupported release gate version",
  );
  assert.match(manifest.appSha, /^[a-f0-9]{40}$/i);
  assert.match(manifest.builderSha, /^[a-f0-9]{40}$/i);
  assert.match(manifest.artifactSha256, /^[a-f0-9]{64}$/);
  assert.equal(sha256File(artifact), manifest.artifactSha256, "artifact checksum mismatch");
  assert.equal(manifest.nodeMajor, Number(process.versions.node.split(".")[0]), "Node major mismatch");
  assert.equal(String(manifest.nodeAbi), process.versions.modules, "Node ABI mismatch");
  assert.ok(!readdirSync(runtime).some((name) => name === ".env" || name.startsWith(".env.")), "release contains an environment file");
  assert.ok(!existsSync(resolve(runtime, "data")), "release contains data");
  assert.ok(existsSync(resolve(runtime, "server.js")), "server.js missing");
  assert.ok(existsSync(resolve(runtime, "release-manifest.json")), "inner release manifest missing");

  const actualPaths = walk().filter((path) => path !== "release-manifest.json");
  const expectedPaths = manifest.files.map((entry) => entry.path);
  assert.deepEqual(actualPaths, expectedPaths, "release file list mismatch");
  const actualFiles = actualPaths.map(digestEntry);
  assert.deepEqual(actualFiles, manifest.files, "release file checksum mismatch");
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(actualFiles)).digest("hex"), manifest.fileListSha256);
  const inner = JSON.parse(readFileSync(resolve(runtime, "release-manifest.json"), "utf8"));
  for (const key of ["releaseGateVersion", "appSha", "builderSha", "createdAt", "fileListSha256", "lockfileSha256", "nodeMajor", "nodeAbi"]) {
    assert.deepEqual(inner[key], manifest[key], `inner/external manifest mismatch: ${key}`);
  }
  assert.deepEqual(inner.nativeDependencies, manifest.nativeDependencies);
  assert.deepEqual(inner.migrations, manifest.migrations);
  assert.deepEqual(migrationManifest(), manifest.migrations, "runtime migration manifest mismatch");
  console.log(JSON.stringify({
    ok: true,
    appSha: manifest.appSha,
    builderSha: manifest.builderSha,
    artifactSha256: manifest.artifactSha256,
    fileCount: actualFiles.length,
  }));
} catch (error) {
  fail(error instanceof Error ? error.message : "release verification failed");
}
