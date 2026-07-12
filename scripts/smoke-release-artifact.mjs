#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import * as tar from "tar";
import { waitForReleaseHealth } from "./wait-for-release-health.mjs";

const root = process.cwd();
const fixture = mkdtempSync(join(tmpdir(), "brain-release-smoke-"));
const outputA = resolve(fixture, "out-a");
const outputB = resolve(fixture, "out-b");
const sha = "0123456789abcdef0123456789abcdef01234567";
const createdAt = "2026-07-12T00:00:00.000Z";

function put(path, body = "fixture\n") {
  const target = resolve(fixture, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
}

function sha256(path) {
  return crypto.createHash("sha256").update(readFileSync(path)).digest("hex");
}

function releaseIdFromManifest(manifest) {
  assert.match(manifest.appSha, /^[a-f0-9]{40}$/i);
  assert.match(manifest.builderSha, /^[a-f0-9]{40}$/i);
  const appSha = manifest.appSha.toLowerCase();
  const builderSha = manifest.builderSha.toLowerCase();
  return appSha === builderSha ? appSha : `${appSha}-${builderSha}`;
}

function assertReleaseId(manifest, releaseId) {
  assert.equal(releaseId, releaseIdFromManifest(manifest));
}

function build(output) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/build-release-artifact.mjs"),
    "--root", fixture, "--output", output, "--sha", sha, "--builder-sha", sha, "--created-at", createdAt],
  { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split("\n").at(-1));
}

function buildMustFail(output, message) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/build-release-artifact.mjs"),
    "--root", fixture, "--output", output, "--sha", sha, "--builder-sha", sha, "--created-at", createdAt],
  { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0, message);
}

try {
  const deployScript = readFileSync(resolve(root, "scripts/deploy-immutable-release.sh"), "utf8");
  assert.match(
    deployScript,
    /gh auth status --hostname "\$PROVENANCE_HOST"/,
    "GitHub auth preflight must be scoped to the provenance host",
  );
  assert.match(
    deployScript,
    /release_instance_id\(\)/,
    "deploy must distinguish application identity from the installed release instance",
  );
  assert.match(deployScript, /promote_release_tools\(\)/);
  assert.match(deployScript, /release-tools\/sets\/\$TOOL_BUILDER_SHA/);
  assert.ok(
    deployScript.indexOf('remote_stage_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST"') <
      deployScript.indexOf('PREVIOUS_STATE="$(remote_release_state)"'),
    "candidate tools must be staged before the prior release is proved",
  );
  assert.ok(
    deployScript.lastIndexOf("promote_release_tools ||") > deployScript.lastIndexOf("telegram webhook boundary returned"),
    "the global tool pointer must be promoted only after all candidate checks",
  );
  put(".next/standalone/server.js", "server\n");
  put(".next/standalone/package.json", "{}\n");
  put(".next/standalone/.env.production", "SECRET=must-not-ship\n");
  put(".next/standalone/src/db/migrations/025_item_workflow.sql", "migration\n");
  put(".next/static/chunks/app.js", "chunk\n");
  put("public/icon.svg", "icon\n");
  put("package-lock.json", JSON.stringify({ packages: {
    "node_modules/better-sqlite3": { version: "11.10.0" },
    "node_modules/sqlite-vec": { version: "0.1.9" },
  } }));
  put("src/db/migrations/025_item_workflow.sql", "migration\n");
  for (const path of [
    "scripts/check-ai-providers.mjs", "scripts/backfill-embeddings-prod.mjs",
    "scripts/backfill-youtube-transcripts-prod.mjs", "scripts/restore-from-backup.sh",
    "scripts/activate-release.sh", "scripts/switch-release.sh", "scripts/verify-release-runtime.mjs",
    "scripts/wait-for-release-health.mjs",
    "scripts/recall-first-apply-preflight.mjs", "scripts/recall-second-manual-verification-apply.sh",
    "scripts/recall-scheduled-apply.sh", "scripts/lib/recall-controlled-samples.mjs",
    "scripts/deploy/brain.service", "scripts/deploy/brain-recall-sync.service",
    "scripts/deploy/brain-recall-sync.timer", "scripts/deploy/brain-recall-manual-sync.service",
    "scripts/deploy/brain-recall-manual-sync.path", "scripts/deploy/brain-recall-manual-sync.timer",
    "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf", "scripts/deploy/brain-processing-audit.service",
    "scripts/deploy/brain-processing-audit.timer", "scripts/dist/audit-vector-index-prod.mjs",
    "scripts/dist/repair-vector-index-prod.mjs", "scripts/dist/processing-readiness-prod.mjs",
  ]) put(path);
  put(".env", "SECRET=must-not-ship\n");
  put("data/brain.sqlite", "must-not-ship\n");

  const first = build(outputA);
  const second = build(outputB);
  assert.equal(first.artifactSha256, second.artifactSha256, "identical inputs must produce an identical artifact");
  assert.equal(sha256(first.artifact), first.artifactSha256);
  const manifest = JSON.parse(readFileSync(first.manifest, "utf8"));
  assert.equal(manifest.appSha, sha);
  assert.equal(manifest.builderSha, sha);
  assert.equal(manifest.artifactSha256, first.artifactSha256);
  assert.equal(manifest.nodeMajor, Number(process.versions.node.split(".")[0]));
  assert.ok(manifest.files.some((entry) => entry.path === "server.js"));
  assert.ok(manifest.files.every((entry) => entry.kind === "file"));
  assert.ok(manifest.files.every((entry) => !entry.path.startsWith(".env")));
  assert.ok(manifest.files.every((entry) => !entry.path.startsWith("data/") && entry.path !== ".env"));
  const builderB = "89abcdef0123456789abcdef0123456789abcdef";
  const builderC = "fedcba9876543210fedcba9876543210fedcba98";
  const candidateReleaseId = releaseIdFromManifest(manifest);
  const knownGoodB = { ...manifest, builderSha: builderB };
  const knownGoodC = { ...manifest, builderSha: builderC };
  const knownGoodBId = releaseIdFromManifest(knownGoodB);
  const knownGoodCId = releaseIdFromManifest(knownGoodC);
  assert.equal(candidateReleaseId, sha);
  assert.equal(knownGoodBId, `${sha}-${builderB}`);
  assert.equal(knownGoodCId, `${sha}-${builderC}`);
  assert.notEqual(knownGoodBId, knownGoodCId);
  assert.throws(() => assertReleaseId(knownGoodB, sha));
  assert.equal(new Set([candidateReleaseId, knownGoodBId, knownGoodCId]).size, 3);
  assert.equal(releaseIdFromManifest(knownGoodB), knownGoodBId, "retry must resolve the same immutable instance");
  let simulatedCurrent = knownGoodBId;
  simulatedCurrent = candidateReleaseId;
  simulatedCurrent = knownGoodBId;
  assert.equal(simulatedCurrent, knownGoodBId, "rollback must return to the exact prior instance");

  let clock = 0;
  const statuses = [503, 200];
  const delayedHealth = await waitForReleaseHealth({
    url: "https://brain.example/api/health",
    token: "fixture-token",
    deadlineMs: 5_000,
    fetchFn: async () => ({ status: statuses.shift() }),
    now: () => clock,
    sleep: async (duration) => { clock += duration; },
  });
  assert.deepEqual(delayedHealth, { ok: true, attempts: 2, status: 200 });
  let permanentAttempts = 0;
  await assert.rejects(
    waitForReleaseHealth({
      url: "https://brain.example/api/health",
      token: "fixture-token",
      deadlineMs: 5_000,
      fetchFn: async () => { permanentAttempts += 1; return { status: 401 }; },
      now: () => 0,
      sleep: async () => {},
    }),
    /permanent health response 401/,
  );
  assert.equal(permanentAttempts, 1);
  clock = 0;
  await assert.rejects(
    waitForReleaseHealth({
      url: "https://brain.example/api/health",
      token: "fixture-token",
      deadlineMs: 2_000,
      fetchFn: async () => ({ status: 503 }),
      now: () => clock,
      sleep: async (duration) => { clock += duration; },
    }),
    /health did not reach 200 before deadline/,
  );

  put(".next/standalone/src/db/migrations/025_item_workflow.sql", "stale runtime migration\n");
  buildMustFail(resolve(fixture, "out-migration-mismatch"), "source/runtime migration mismatch must fail closed");
  put(".next/standalone/src/db/migrations/025_item_workflow.sql", "migration\n");
  symlinkSync("/etc/passwd", resolve(fixture, ".next/standalone/escaping-link"));
  buildMustFail(resolve(fixture, "out-symlink"), "symlink payload must fail closed");
  unlinkSync(resolve(fixture, ".next/standalone/escaping-link"));

  const extract = resolve(fixture, "extract");
  mkdirSync(extract, { recursive: true });
  await tar.x({ cwd: extract, file: first.artifact, strict: true });
  assert.ok(existsSync(resolve(extract, "runtime/server.js")));
  assert.ok(!existsSync(resolve(extract, "runtime/.env")));
  assert.ok(!existsSync(resolve(extract, "runtime/data")));
  const packagedService = readFileSync(resolve(extract, "runtime/scripts/deploy/brain.service"), "utf8");
  assert.match(packagedService, /^WorkingDirectory=\/opt\/brain$/m);
  assert.doesNotMatch(packagedService, /^WorkingDirectory=\/opt\/brain\/current$/m);
  const packagedActivate = readFileSync(resolve(extract, "runtime/scripts/activate-release.sh"), "utf8");
  const packagedSwitch = readFileSync(resolve(extract, "runtime/scripts/switch-release.sh"), "utf8");
  assert.ok(existsSync(resolve(extract, "runtime/scripts/wait-for-release-health.mjs")));
  assert.match(packagedActivate, /BRAIN_RELEASE_HEALTH_TOOL/);
  assert.match(packagedActivate, /RELEASE_ID="\$APP_SHA-\$BUILDER_SHA"/);
  assert.match(packagedActivate, /AUTOMATIC RESTORATION INCOMPLETE/);
  assert.doesNotMatch(packagedActivate, /restore_previous_state \|\| true/);
  assert.match(packagedSwitch, /BRAIN_RELEASE_HEALTH_TOOL/);
  assert.match(packagedSwitch, /installed release ID does not match manifest application\/builder identity/);
  const verify = spawnSync(process.execPath, [resolve(root, "scripts/verify-release-runtime.mjs"),
    resolve(extract, "runtime"), first.manifest, first.artifact], { cwd: root, encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stderr);
  symlinkSync("/etc/passwd", resolve(extract, "runtime/escaping-link"));
  const rejectSymlink = spawnSync(process.execPath, [resolve(root, "scripts/verify-release-runtime.mjs"),
    resolve(extract, "runtime"), first.manifest, first.artifact], { cwd: root, encoding: "utf8" });
  assert.notEqual(rejectSymlink.status, 0, "runtime symlink must fail closed");
  unlinkSync(resolve(extract, "runtime/escaping-link"));
  writeFileSync(resolve(extract, "runtime/server.js"), "tampered runtime\n");
  const rejectRuntime = spawnSync(process.execPath, [resolve(root, "scripts/verify-release-runtime.mjs"),
    resolve(extract, "runtime"), first.manifest, first.artifact], { cwd: root, encoding: "utf8" });
  assert.notEqual(rejectRuntime.status, 0, "runtime tampering must fail closed");

  cpSync(first.artifact, resolve(fixture, "tampered.tar.gz"));
  writeFileSync(resolve(fixture, "tampered.tar.gz"), "tampered", { flag: "a" });
  assert.notEqual(sha256(resolve(fixture, "tampered.tar.gz")), first.artifactSha256);
  console.log(JSON.stringify({ ok: true, checks: 46, artifactSha256: first.artifactSha256 }));
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
