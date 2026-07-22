#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import JSZip from "jszip";
import * as tar from "tar";
import {
  AUDITED_ADDITIVE_ROLLBACK_MIGRATIONS,
  evaluateMigrationCompatibility,
} from "./check-release-migration-compatibility.mjs";
import { waitForReleaseHealth } from "./wait-for-release-health.mjs";

const root = process.cwd();
const fixture = mkdtempSync(join(tmpdir(), "brain-release-smoke-"));
const outputA = resolve(fixture, "out-a");
const outputB = resolve(fixture, "out-b");
const outputServerOnly = resolve(fixture, "out-server-only");
const sha = "0123456789abcdef0123456789abcdef01234567";
const createdAt = "2026-07-12T00:00:00.000Z";
const instrumentation = readFileSync(resolve(root, "src/instrumentation.ts"), "utf8");
assert.ok(
  instrumentation.indexOf("getDb();") < instrumentation.indexOf("startNotebookLmRetentionWorker();") &&
    instrumentation.indexOf("startNotebookLmRetentionWorker();") <
      instrumentation.indexOf("resumeProcessingEnrollmentJobs();") &&
    instrumentation.indexOf("startNotebookLmRetentionWorker();") <
      instrumentation.indexOf("startBackupScheduler();"),
  "the retention sweep must be armed immediately after migrations and before any backup or other worker",
);

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

function build(output, includeExtension = true) {
  const args = [resolve(root, "scripts/build-release-artifact.mjs"),
    "--root", fixture, "--output", output, "--sha", sha, "--builder-sha", sha, "--created-at", createdAt];
  if (includeExtension) args.push("--extension-dist", resolve(fixture, "extension-dist"));
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split("\n").at(-1));
}

function buildMustFail(output, message) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/build-release-artifact.mjs"),
    "--root", fixture, "--output", output, "--sha", sha, "--builder-sha", sha, "--created-at", createdAt,
    "--extension-dist", resolve(fixture, "extension-dist")],
  { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0, message);
}

let migrationCompatibilityCase = 0;
function runMigrationCompatibilityCli(
  applied,
  packaged,
  allowAuditedAdditiveRollback,
  notebookLmState = {},
  expectedProviderWriteBlocked = "",
) {
  migrationCompatibilityCase += 1;
  const caseRoot = resolve(fixture, `migration-compat-${migrationCompatibilityCase}`);
  mkdirSync(caseRoot, { recursive: true });
  const databasePath = resolve(caseRoot, "brain.sqlite");
  const database = new Database(databasePath);
  database.exec("CREATE TABLE _migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)");
  const insert = database.prepare("INSERT INTO _migrations (name, sha256) VALUES (?, ?)");
  const insertAll = database.transaction((entries) => {
    for (const entry of entries) insert.run(entry.name, entry.sha256);
  });
  insertAll(applied);
  if (applied.some((entry) => entry.name === "026_notebooklm_export.sql")) {
    database.exec(`
      CREATE TABLE notebooklm_connector_pairing_codes (id TEXT PRIMARY KEY);
      CREATE TABLE notebooklm_connectors (id TEXT PRIMARY KEY);
      CREATE TABLE notebooklm_targets (id TEXT PRIMARY KEY);
      CREATE TABLE notebooklm_operational_events (
        id TEXT PRIMARY KEY,
        event_type TEXT,
        connector_id TEXT,
        target_id TEXT,
        safe_reason TEXT
      );
      CREATE TABLE notebooklm_export_requests (
        id TEXT PRIMARY KEY,
        phase TEXT NOT NULL,
        payload_title TEXT,
        payload_text TEXT
      );
      CREATE TABLE notebooklm_export_events (id TEXT PRIMARY KEY);
      CREATE TABLE notebooklm_runtime_control (
        id INTEGER PRIMARY KEY,
        provider_write_blocked INTEGER NOT NULL,
        protocol_failure_streak INTEGER NOT NULL,
        block_reason TEXT,
        last_protocol_failure_at INTEGER,
        retention_last_success_at INTEGER,
        retention_last_failure_at INTEGER,
        retention_failure_streak INTEGER NOT NULL,
        retention_last_error_code TEXT,
        retention_last_expired_count INTEGER NOT NULL,
        retention_last_purged_count INTEGER NOT NULL,
        retention_overdue_snapshot_count INTEGER NOT NULL,
        retention_physical_purge_pending INTEGER NOT NULL,
        retention_physical_purge_generation INTEGER NOT NULL,
        unresolved_over_24h_count INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    const runtimeOverrides = notebookLmState.runtimeOverrides ?? {};
    database.prepare(
      `INSERT INTO notebooklm_runtime_control
       (id, provider_write_blocked, protocol_failure_streak, block_reason,
        last_protocol_failure_at, retention_last_success_at, retention_last_failure_at,
        retention_failure_streak, retention_last_error_code,
        retention_last_expired_count, retention_last_purged_count,
        retention_overdue_snapshot_count, retention_physical_purge_pending,
        retention_physical_purge_generation, unresolved_over_24h_count, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      runtimeOverrides.provider_write_blocked ?? 0,
      runtimeOverrides.protocol_failure_streak ?? 0,
      runtimeOverrides.block_reason ?? null,
      runtimeOverrides.last_protocol_failure_at ?? null,
      runtimeOverrides.retention_last_success_at ?? null,
      runtimeOverrides.retention_last_failure_at ?? null,
      runtimeOverrides.retention_failure_streak ?? 0,
      runtimeOverrides.retention_last_error_code ?? null,
      runtimeOverrides.retention_last_expired_count ?? 0,
      runtimeOverrides.retention_last_purged_count ?? 0,
      runtimeOverrides.retention_overdue_snapshot_count ?? 0,
      notebookLmState.physicalPurgePending ? 1 : (runtimeOverrides.retention_physical_purge_pending ?? 0),
      notebookLmState.physicalPurgePending ? 1 : (runtimeOverrides.retention_physical_purge_generation ?? 0),
      runtimeOverrides.unresolved_over_24h_count ?? 0,
      Date.now(),
    );
    for (const table of [
      ["notebooklm_connector_pairing_codes", notebookLmState.pairingCodeCount ?? 0],
      ["notebooklm_connectors", notebookLmState.connectorCount ?? 0],
      ["notebooklm_targets", notebookLmState.targetCount ?? 0],
      ["notebooklm_export_events", notebookLmState.exportEventCount ?? 0],
    ]) {
      const [name, count] = table;
      const insertState = database.prepare(`INSERT INTO ${name} (id) VALUES (?)`);
      for (let index = 0; index < count; index += 1) insertState.run(`${name}-${index}`);
    }
    const insertOperationalEvent = database.prepare(
      `INSERT INTO notebooklm_operational_events
       (id, event_type, connector_id, target_id, safe_reason) VALUES (?, ?, ?, ?, ?)`,
    );
    for (let index = 0; index < (notebookLmState.operationalEventCount ?? 0); index += 1) {
      insertOperationalEvent.run(`operator-event-${index}`, "notebooklm.setup_started", null, null, null);
    }
    for (let index = 0; index < (notebookLmState.retentionHeartbeatCount ?? 0); index += 1) {
      insertOperationalEvent.run(
        `retention-heartbeat-${index}`,
        "notebooklm.retention_sweep_succeeded",
        null,
        null,
        "expired=0,purged=0,overdue=0,unresolved24h=0",
      );
    }
    const insertRequest = database.prepare(
      `INSERT INTO notebooklm_export_requests
       (id, phase, payload_title, payload_text) VALUES (?, ?, ?, ?)`,
    );
    for (const [index, request] of (notebookLmState.requests ?? []).entries()) {
      insertRequest.run(
        `request-${index}`,
        request.phase ?? "terminal",
        request.payloadTitle ?? null,
        request.payloadText ?? null,
      );
    }
  }
  database.close();
  const manifestPath = resolve(caseRoot, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ migrations: { files: packaged } }));
  return spawnSync(process.execPath, [
    resolve(root, "scripts/check-release-migration-compatibility.mjs"),
    root,
    manifestPath,
    databasePath,
    allowAuditedAdditiveRollback ? "1" : "0",
    "b".repeat(64),
    "c".repeat(64),
    expectedProviderWriteBlocked === "" ? "" : String(expectedProviderWriteBlocked),
  ], { cwd: root, encoding: "utf8" });
}

try {
  const deployScript = readFileSync(resolve(root, "scripts/deploy-immutable-release.sh"), "utf8");
  const retiredMutableDeploy = readFileSync(resolve(root, "scripts/deploy.sh"), "utf8");
  const retiredCutover = readFileSync(resolve(root, "scripts/deploy/cutover.sh"), "utf8");
  assert.ok(
    retiredMutableDeploy.indexOf('die "legacy mutable deploy is retired') < retiredMutableDeploy.indexOf("acquire_recall_deploy_guard()"),
    "legacy mutable deploy must refuse before any production action",
  );
  assert.doesNotMatch(retiredMutableDeploy, /\.backup '\$backup_file'/);
  assert.match(retiredCutover, /historical cutover is decommissioned/);
  assert.doesNotMatch(retiredCutover, /sqlite3 data\/brain\.sqlite "\.backup/);
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
  assert.match(
    deployScript,
    /node "\$verify_tool" "\$target" "\$manifest" "\$artifact" >\/dev\/null/,
    "release-state capture must suppress verifier diagnostics and emit only the parseable state tuple",
  );
  assert.match(
    deployScript,
    /node scripts\/dist\/processing-readiness-prod\.mjs audit --require-ready --require-production-config/,
    "deep readiness must execute the packaged generated tool path",
  );
  assert.match(
    deployScript,
    /install -d -o brain -g brain-data -m 2770 "\$backup_dir"/,
    "immutable deploy must preserve Recall worker access to the shared backup directory",
  );
  assert.doesNotMatch(
    deployScript,
    /install -d[^\n]*-m\s+0?700[^\n]*"\$backup_dir"/,
    "immutable deploy must not make the shared backup directory owner-only",
  );
  assert.match(
    deployScript,
    /\.recall-backup-write-proof\.XXXXXXXX/,
    "immutable deploy must prove backup creation as the Recall worker identity",
  );
  assert.match(
    deployScript,
    /PROCESSING_FLAG_POLICY="\$\{BRAIN_PROCESSING_FLAG_POLICY:-preserve\}"/,
    "an existing production deployment must preserve its validated Processing flags by default",
  );
  assert.match(deployScript, /remote_processing_flags_match\(\)/);
  assert.match(
    deployScript,
    /NOTEBOOKLM_FLAG_POLICY="\$\{BRAIN_NOTEBOOKLM_FLAG_POLICY:-dark\}"/,
    "NotebookLM rollout must remain dark unless an operator explicitly selects preserve",
  );
  assert.match(deployScript, /remote_notebooklm_flags_match\(\)/);
  assert.match(deployScript, /0:0:0\|1:0:0\|1:1:0\|1:1:1/);
  assert.match(deployScript, /TARGET_NOTEBOOKLM_FLAG_SNAPSHOT/);
  assert.match(
    deployScript,
    /NOTEBOOKLM_REMEDIATION_POLICY="\$\{BRAIN_NOTEBOOKLM_REMEDIATION_POLICY:-strict\}"/,
    "provider-block remediation must require an explicit deployment policy",
  );
  assert.match(deployScript, /preserve_existing_provider_block/);
  assert.match(deployScript, /--allow-existing-provider-block/);
  assert.match(deployScript, /actual_provider_write_blocked.*EXPECTED_PROVIDER_WRITE_BLOCKED/s);
  assert.match(deployScript, /remote_notebooklm_operations_ready\(\)/);
  assert.match(deployScript, /remote_notebooklm_retention_ready\(\)/);
  assert.match(deployScript, /systemctl start brain-notebooklm-retention\.service/);
  assert.match(deployScript, /Result --value brain-notebooklm-retention\.service/);
  assert.match(deployScript, /\/opt\/brain\/releases\/\$release_id\/runtime/);
  const remoteRetentionProof = deployScript.slice(
    deployScript.indexOf("remote_notebooklm_retention_ready()"),
    deployScript.indexOf("\nremote_backup_tools_ready()"),
  );
  assert.match(remoteRetentionProof, /! grep -Fq '\/opt\/brain\/current'/);
  assert.doesNotMatch(remoteRetentionProof, /(?:runtime|tool)=[^\n]*\/opt\/brain\/current/);
  assert.doesNotMatch(remoteRetentionProof, /(?:cd|node) \/opt\/brain\/current/);
  assert.match(deployScript, /PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ENABLED/);
  assert.match(deployScript, /PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ACTIVE/);
  assert.match(deployScript, /notebookLmRetentionWorker":"executed_immutable"/);
  assert.match(deployScript, /notebookLmRetentionTimer":"enabled_active"/);
  const candidateActivationIndex = deployScript.lastIndexOf(
    'remote_activate "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" 0 0',
  );
  const firstRetentionProofIndex = deployScript.indexOf(
    'remote_notebooklm_retention_ready || rollback_and_die',
    candidateActivationIndex,
  );
  const firstOperationsProofIndex = deployScript.indexOf(
    'remote_notebooklm_operations_ready || rollback_and_die',
    candidateActivationIndex,
  );
  assert.ok(
    candidateActivationIndex >= 0 &&
      candidateActivationIndex < firstRetentionProofIndex &&
      firstRetentionProofIndex < firstOperationsProofIndex,
    "candidate deployment must execution-prove the immutable mutating retention writer before the read-only gate",
  );
  assert.ok(
    deployScript.lastIndexOf('remote_notebooklm_retention_ready || rollback_and_die') <
      deployScript.lastIndexOf("promote_release_tools ||"),
    "final immutable retention execution proof must precede release-tool promotion",
  );
  assert.match(deployScript, /remote_backup_tools_ready\(\)/);
  assert.match(deployScript, /remote_recall_backup_privacy_ready\(\)/);
  assert.match(deployScript, /remote_install_backup_tools\(\)/);
  assert.match(deployScript, /BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT=0 bash "\$tool_set\/install-durable-backup-tools\.sh"/);
  assert.match(deployScript, /grep -Fqx '0 \*\/6 \* \* \* brain \/opt\/brain\/scripts\/backup-offsite\.sh >> \/var\/log\/brain-backup\.log 2>&1'/);
  assert.match(
    deployScript,
    /for name in activate-release\.sh switch-release\.sh backup-offsite\.sh install-durable-backup-tools\.sh verified-volatile-backup-staging\.sh cleanup-volatile-backup-staging\.mjs recall-first-apply-preflight\.mjs restore-from-backup\.sh/,
    "the backup, staging, janitor, Recall preflight, and restore tools must come from the attested builder tool set",
  );
  assert.ok(
    deployScript.indexOf('remote_stage_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST"') <
      deployScript.indexOf('sqlite3 "$source_db" ".backup'),
    "the attested candidate scrub tool must be staged before the physical backup",
  );
  assert.ok(
    deployScript.indexOf("remote_install_backup_tools ||") >
      deployScript.indexOf('remote_stage_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST"') &&
      deployScript.indexOf("remote_install_backup_tools ||") <
        deployScript.indexOf('sqlite3 "$source_db" ".backup'),
    "the attested durable backup tools must be installed after staging and before the physical backup",
  );
  assert.ok(
    deployScript.indexOf('BRAIN_SCRUB_RUNTIME_ROOT="$scrub_runtime" node "$scrub_tool" --db "$raw_backup"') <
      deployScript.indexOf("PRAGMA quick_check"),
    "the physical backup must be scrubbed before integrity and evidence are recorded",
  );
  assert.match(
    deployScript,
    /scrub_runtime=\/opt\/brain\/current[\s\S]*scrub_runtime=\/opt\/brain[\s\S]*BRAIN_SCRUB_RUNTIME_ROOT="\$scrub_runtime"/,
    "the first immutable cutover must be able to scrub with the legacy runtime dependency root",
  );
  assert.match(
    deployScript,
    /if \[\[ -n "\$backup" && "\$backup_verified" != "1" \]\]; then\s+rm -f -- "\$backup"/,
    "a failed scrub or verification must remove the unverified physical backup",
  );
  assert.match(deployScript, /stage="\$\(create_verified_volatile_backup_stage[\s\S]*\/run\/brain-root-backup-staging[\s\S]*root root immutable-backup\)"/);
  assert.match(deployScript, /sqlite3 "\$source_db" "\.backup '\$raw_backup'"/);
  assert.doesNotMatch(deployScript, /sqlite3 "\$source_db" "\.backup '\$backup'"/);
  assert.ok(
    deployScript.indexOf('node "$scrub_tool" --db "$raw_backup"') <
      deployScript.indexOf('cp -- "$raw_backup" "$publication_file"') &&
      deployScript.indexOf('cp -- "$raw_backup" "$publication_file"') <
        deployScript.indexOf('ln -- "$publication_file" "$backup"'),
    "immutable backup must scrub on tmpfs before atomically publishing sanitized bytes",
  );
  assert.ok(
    deployScript.indexOf("remote_install_backup_tools ||") <
      deployScript.indexOf('sqlite3 "$source_db" ".backup'),
    "the durable one-minute janitor must be installed before the first raw snapshot",
  );
  assert.match(deployScript, /BRAIN_ALLOW_AUDITED_ADDITIVE_ROLLBACK/);
  assert.doesNotMatch(deployScript, /BRAIN_ALLOW_SCHEMA_025_ROLLBACK/);
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
  put(".next/standalone/src/db/migrations/026_notebooklm_export.sql", "notebooklm migration\n");
  put(".next/static/chunks/app.js", "chunk\n");
  put("public/icon.svg", "icon\n");
  put("extension-dist/manifest.json", JSON.stringify({
    manifest_version: 3,
    name: "Brain",
    version: "1.0.0",
    background: { service_worker: "assets/background.js" },
    permissions: ["activeTab", "tabs", "contextMenus", "storage", "notifications", "alarms"],
    host_permissions: ["https://brain.arunp.in/*"],
    optional_host_permissions: ["https://notebooklm.google.com/*"],
  }));
  put("extension-dist/assets/background.js", "console.log('fixture');\n");
  put("package-lock.json", JSON.stringify({ packages: {
    "node_modules/better-sqlite3": { version: "11.10.0" },
    "node_modules/sqlite-vec": { version: "0.1.9" },
  } }));
  put("src/db/migrations/025_item_workflow.sql", "migration\n");
  put("src/db/migrations/026_notebooklm_export.sql", "notebooklm migration\n");
  for (const path of [
    "scripts/check-ai-providers.mjs", "scripts/backup-offsite.sh", "scripts/install-durable-backup-tools.sh",
    "scripts/verified-volatile-backup-staging.sh", "scripts/cleanup-volatile-backup-staging.mjs",
    "scripts/backfill-embeddings-prod.mjs",
    "scripts/backfill-youtube-transcripts-prod.mjs", "scripts/restore-from-backup.sh",
    "scripts/activate-release.sh", "scripts/switch-release.sh", "scripts/verify-release-runtime.mjs",
    "scripts/check-notebooklm-operations.mjs", "scripts/scrub-notebooklm-backup.mjs",
    "scripts/check-release-migration-compatibility.mjs",
    "scripts/wait-for-release-health.mjs",
    "scripts/recall-first-apply-preflight.mjs", "scripts/recall-second-manual-verification-apply.sh",
    "scripts/recall-scheduled-apply.sh", "scripts/lib/recall-controlled-samples.mjs",
    "scripts/deploy/brain.service", "scripts/deploy/brain-recall-sync.service",
    "scripts/deploy/brain-backup-staging.tmpfiles.conf",
    "scripts/deploy/brain-backup-staging-cleanup.service",
    "scripts/deploy/brain-backup-staging-cleanup.timer",
    "scripts/deploy/brain-recall-backup-staging.drop-in.conf",
    "scripts/deploy/brain-recall-sync.timer", "scripts/deploy/brain-recall-manual-sync.service",
    "scripts/deploy/brain-recall-manual-sync.path", "scripts/deploy/brain-recall-manual-sync.timer",
    "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf", "scripts/deploy/brain-notebooklm-operations.service",
    "scripts/deploy/brain-notebooklm-operations.timer", "scripts/deploy/brain-notebooklm-retention.service",
    "scripts/deploy/brain-notebooklm-retention.timer", "scripts/deploy/brain-processing-audit.service",
    "scripts/deploy/brain-processing-audit.timer", "scripts/dist/audit-vector-index-prod.mjs",
    "scripts/dist/repair-vector-index-prod.mjs", "scripts/dist/processing-readiness-prod.mjs",
    "scripts/dist/notebooklm-retention-prod.mjs",
  ]) put(path);
  put(
    "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf",
    readFileSync(resolve(root, "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf"), "utf8"),
  );
  put(".env", "SECRET=must-not-ship\n");
  put("data/brain.sqlite", "must-not-ship\n");

  const first = build(outputA);
  const second = build(outputB);
  const serverOnly = build(outputServerOnly, false);
  assert.equal(first.artifactSha256, second.artifactSha256, "identical inputs must produce an identical artifact");
  assert.equal(serverOnly.artifactSha256, first.artifactSha256);
  assert.equal(serverOnly.extension, null);
  assert.ok(first.extension);
  assert.ok(second.extension);
  assert.equal(
    first.extension.artifactSha256,
    second.extension.artifactSha256,
    "identical extension inputs must produce an identical zip",
  );
  assert.equal(sha256(first.extension.artifact), first.extension.artifactSha256);
  assert.equal(
    readFileSync(first.extension.checksum, "utf8"),
    `${first.extension.artifactSha256}  brain-extension-${sha.slice(0, 12)}.zip\n`,
  );
  const extensionReleaseManifest = JSON.parse(readFileSync(first.extension.manifest, "utf8"));
  assert.equal(extensionReleaseManifest.artifactName, `brain-extension-${sha.slice(0, 12)}.zip`);
  assert.equal(extensionReleaseManifest.artifactSha256, first.extension.artifactSha256);
  assert.deepEqual(
    extensionReleaseManifest.files.map((entry) => entry.path),
    ["assets/background.js", "manifest.json"],
  );
  const extensionZip = await JSZip.loadAsync(readFileSync(first.extension.artifact));
  assert.deepEqual(Object.keys(extensionZip.files).sort(), ["assets/background.js", "manifest.json"]);
  assert.equal(await extensionZip.file("assets/background.js").async("string"), "console.log('fixture');\n");
  assert.equal(sha256(first.artifact), first.artifactSha256);
  const manifest = JSON.parse(readFileSync(first.manifest, "utf8"));
  assert.equal(manifest.appSha, sha);
  assert.equal(manifest.builderSha, sha);
  assert.equal(manifest.artifactSha256, first.artifactSha256);
  assert.equal(manifest.nodeMajor, Number(process.versions.node.split(".")[0]));
  assert.ok(manifest.files.some((entry) => entry.path === "server.js"));
  for (const path of [
    "scripts/deploy/brain-notebooklm-retention.service",
    "scripts/deploy/brain-notebooklm-retention.timer",
    "scripts/dist/notebooklm-retention-prod.mjs",
  ]) {
    assert.ok(manifest.files.some((entry) => entry.path === path), `${path} must be attested in the artifact`);
  }
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
  const packagedProcessingAuditService = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-processing-audit.service"),
    "utf8",
  );
  const packagedNotebookLmOperationsService = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-notebooklm-operations.service"),
    "utf8",
  );
  const packagedNotebookLmOperationsTimer = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-notebooklm-operations.timer"),
    "utf8",
  );
  const packagedNotebookLmRetentionServicePath = resolve(
    extract,
    "runtime/scripts/deploy/brain-notebooklm-retention.service",
  );
  const packagedNotebookLmRetentionService = readFileSync(
    packagedNotebookLmRetentionServicePath,
    "utf8",
  );
  const packagedNotebookLmRetentionTimer = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-notebooklm-retention.timer"),
    "utf8",
  );
  const packagedNotebookLmRetentionBundlePath = resolve(
    extract,
    "runtime/scripts/dist/notebooklm-retention-prod.mjs",
  );
  const packagedNotebookLmRetentionBundle = readFileSync(
    packagedNotebookLmRetentionBundlePath,
    "utf8",
  );
  const packagedOffsiteBackup = readFileSync(resolve(extract, "runtime/scripts/backup-offsite.sh"), "utf8");
  const packagedBackupScrub = readFileSync(
    resolve(extract, "runtime/scripts/scrub-notebooklm-backup.mjs"),
    "utf8",
  );
  const packagedBackupInstaller = readFileSync(
    resolve(extract, "runtime/scripts/install-durable-backup-tools.sh"),
    "utf8",
  );
  const packagedStagingHelper = readFileSync(
    resolve(extract, "runtime/scripts/verified-volatile-backup-staging.sh"), "utf8",
  );
  const packagedCleanup = readFileSync(
    resolve(extract, "runtime/scripts/cleanup-volatile-backup-staging.mjs"), "utf8",
  );
  const packagedCleanupService = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-backup-staging-cleanup.service"), "utf8",
  );
  const packagedCleanupTimer = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-backup-staging-cleanup.timer"), "utf8",
  );
  const packagedStagingTmpfiles = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-backup-staging.tmpfiles.conf"), "utf8",
  );
  const packagedRecallSyncService = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-recall-sync.service"), "utf8",
  );
  const packagedRecallManualService = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-recall-manual-sync.service"), "utf8",
  );
  const packagedRestore = readFileSync(resolve(extract, "runtime/scripts/restore-from-backup.sh"), "utf8");
  const packagedRecallTmpfiles = readFileSync(
    resolve(extract, "runtime/scripts/deploy/brain-recall-manual-sync.tmpfiles.conf"),
    "utf8",
  );
  assert.match(packagedService, /^WorkingDirectory=\/opt\/brain$/m);
  assert.doesNotMatch(packagedService, /^WorkingDirectory=\/opt\/brain\/current$/m);
  assert.match(
    packagedProcessingAuditService,
    /^ExecStart=\/usr\/bin\/node \/opt\/brain\/current\/scripts\/dist\/processing-readiness-prod\.mjs audit --require-ready --require-production-config$/m,
  );
  assert.match(packagedNotebookLmOperationsService, /^EnvironmentFile=\/etc\/brain\/\.env$/m);
  assert.match(
    packagedNotebookLmOperationsService,
    /^ExecStart=\/usr\/bin\/node \/opt\/brain\/current\/scripts\/check-notebooklm-operations\.mjs --require-ready$/m,
  );
  assert.doesNotMatch(packagedNotebookLmOperationsService, /payload_title|payload_text|SELECT \*/);
  assert.match(packagedNotebookLmOperationsTimer, /^OnUnitActiveSec=1m$/m);
  assert.match(packagedNotebookLmOperationsTimer, /^Unit=brain-notebooklm-operations\.service$/m);
  assert.doesNotMatch(packagedNotebookLmOperationsService, /ReadWritePaths=.*brain-backup-staging/);
  assert.match(packagedNotebookLmRetentionService, /^EnvironmentFile=-\/etc\/brain\/release\.env$/m);
  assert.match(packagedNotebookLmRetentionService, /BRAIN_RELEASE_ID/);
  assert.match(packagedNotebookLmRetentionService, /runtime="\/opt\/brain\/releases\/\$release_id\/runtime"/);
  assert.match(packagedNotebookLmRetentionService, /scripts\/dist\/notebooklm-retention-prod\.mjs/);
  assert.match(packagedNotebookLmRetentionService, /node_modules\/better-sqlite3\/package\.json/);
  assert.match(packagedNotebookLmRetentionService, /node_modules\/sqlite-vec\/package\.json/);
  assert.doesNotMatch(packagedNotebookLmRetentionService, /\/opt\/brain\/current/);
  assert.match(packagedNotebookLmRetentionTimer, /^OnUnitActiveSec=1m$/m);
  assert.match(packagedNotebookLmRetentionTimer, /^Persistent=true$/m);
  assert.match(packagedNotebookLmRetentionTimer, /^Unit=brain-notebooklm-retention\.service$/m);
  assert.equal(
    packagedNotebookLmRetentionBundle,
    readFileSync(resolve(root, "scripts/dist/notebooklm-retention-prod.mjs"), "utf8"),
    "artifact must package the exact built immutable retention bundle",
  );
  const retentionSyntax = spawnSync(process.execPath, ["--check", packagedNotebookLmRetentionBundlePath], {
    cwd: resolve(extract, "runtime"),
    encoding: "utf8",
  });
  assert.equal(retentionSyntax.status, 0, retentionSyntax.stderr);
  const packagedNodeModules = resolve(extract, "runtime/node_modules");
  symlinkSync(resolve(root, "node_modules"), packagedNodeModules, "dir");
  try {
    const retentionExecution = spawnSync(process.execPath, [packagedNotebookLmRetentionBundlePath], {
      cwd: resolve(extract, "runtime"),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        BRAIN_DB_PATH: resolve(extract, "does-not-exist.sqlite"),
      },
    });
    assert.equal(retentionExecution.status, 1, retentionExecution.stderr);
    assert.deepEqual(JSON.parse(retentionExecution.stdout), {
      ok: false,
      error: "database_unavailable",
    });
  } finally {
    unlinkSync(packagedNodeModules);
  }
  assert.match(packagedService, /^RuntimeDirectory=brain-backup-staging$/m);
  assert.match(packagedService, /^RuntimeDirectoryPreserve=yes$/m);
  assert.match(packagedOffsiteBackup, /SCRUB_HELPER="\$BRAIN_DIR\/scripts\/scrub-notebooklm-backup\.mjs"/);
  assert.match(packagedBackupScrub, /journal_mode = DELETE/);
  assert.match(packagedBackupScrub, /sqlite_sidecar_remained_after_scrub/);
  assert.match(packagedBackupScrub, /sqlite_temp_boundary_not_pinned/);
  assert.match(packagedBackupScrub, /state IN \('sending', 'leased'\) AND phase IN \('create', 'reconcile'\)/);
  assert.match(packagedBackupScrub, /WHEN state = 'leased' AND phase = 'poll' THEN 'processing'/);
  assert.match(packagedOffsiteBackup, /BRAIN_SCRUB_RUNTIME_ROOT="\$RUNTIME_ROOT" node "\$SCRUB_HELPER" --db "\$RAW_SNAPSHOT"/);
  assert.match(packagedOffsiteBackup, /flock -x 9/);
  assert.match(packagedOffsiteBackup, /\[\[ -f "\$BACKUP_LOCK" && ! -L "\$BACKUP_LOCK" \]\]/);
  assert.match(packagedOffsiteBackup, /exec 9<>"\$BACKUP_LOCK"/);
  assert.match(packagedOffsiteBackup, /STAGE_DIR="\$\(create_verified_volatile_backup_stage/);
  assert.match(packagedOffsiteBackup, /sqlite3 "\$DB" "\.backup '\$RAW_SNAPSHOT'"/);
  assert.doesNotMatch(packagedOffsiteBackup, /\.backup '\$SNAPSHOT'/);
  assert.match(packagedOffsiteBackup, /REMOTE_NAME="\$\(basename "\$SNAPSHOT"\)\.gpg"/);
  assert.ok(
    packagedOffsiteBackup.indexOf('flock -x 9') < packagedOffsiteBackup.indexOf('source "$STAGING_HELPER"'),
    "off-site backup must acquire the installer lock before sourcing durable helpers",
  );
  assert.match(packagedOffsiteBackup, /if \[\[ "\$SNAPSHOT_VERIFIED" != "1" \]\]; then\s+rm -f -- "\$SNAPSHOT"/);
  assert.match(packagedOffsiteBackup, /"\$\{RAW_SNAPSHOT\}-wal" "\$\{RAW_SNAPSHOT\}-shm"/);
  assert.doesNotMatch(packagedOffsiteBackup, /UPDATE notebooklm_export_requests/);
  assert.match(
    packagedRecallTmpfiles,
    /^d \/opt\/brain\/data\/backups 2770 brain brain-data - -$/m,
  );
  assert.match(packagedStagingTmpfiles, /^d \/run\/brain-backup-staging 0700 brain brain-data - -$/m);
  assert.match(packagedStagingTmpfiles, /^d \/run\/brain-recall-backup-staging 0700 brain-recall brain-data - -$/m);
  assert.match(packagedStagingTmpfiles, /^d \/run\/brain-root-backup-staging 0700 root root - -$/m);
  assert.match(packagedStagingTmpfiles, /^f \/run\/brain-release\.lock 0600 root root - -$/m);
  assert.match(packagedStagingHelper, /source_bytes \* 4 \+ 67108864/);
  assert.match(packagedStagingHelper, /VOLATILE_BACKUP_STAGE_MAX_MS=180000/);
  assert.match(packagedStagingHelper, /setsid timeout --signal=KILL/);
  assert.match(packagedStagingHelper, /export SQLITE_TMPDIR="\$stage" TMPDIR="\$stage"/);
  assert.match(packagedStagingHelper, /publish_volatile_backup_stage_file\(\)/);
  assert.match(packagedStagingHelper, /cleanup_stale_sanitized_backup_publications\(\)/);
  assert.match(packagedStagingHelper, /age_seconds >= 600/);
  assert.match(packagedCleanup, /ORPHAN_REMOVAL_BOUND_MS = 123_000/);
  assert.match(packagedCleanup, /ACTIVE_STAGE_REMOVAL_BOUND_MS = 244_000/);
  assert.match(packagedCleanup, /process\.kill\(-writer\.pgid, "SIGKILL"\)/);
  assert.match(packagedCleanup, /process\.kill\(owner\.pid, "SIGKILL"\)/);
  assert.match(packagedCleanupService, /\/opt\/brain\/scripts\/cleanup-volatile-backup-staging\.mjs/);
  assert.match(packagedCleanupService, /root_pid=\$!/);
  assert.match(packagedCleanupService, /brain_pid=\$!/);
  assert.match(packagedCleanupService, /recall_pid=\$!/);
  assert.match(packagedCleanupTimer, /^OnUnitActiveSec=1m$/m);
  assert.match(packagedRecallSyncService, /BRAIN_RECALL_BACKUP_STAGING_DIR=\/run\/brain-recall-backup-staging/);
  assert.match(packagedRecallManualService, /ReadWritePaths=\/run\/brain-recall-backup-staging/);
  assert.match(packagedRestore, /flock -n 9/);
  assert.match(packagedRestore, /if \[\[ -f \/etc\/brain\/\.env \]\]; then\s+PRODUCTION_RESTORE=1/);
  assert.match(packagedRestore, /production restore cannot downgrade safety mode/);
  assert.match(packagedRestore, /exec 7<"\$release_lock"/);
  assert.match(packagedRestore, /\/proc\/\$\$\/fd\/7/);
  assert.match(packagedRestore, /\/proc\/\$\$\/fd\/8/);
  assert.match(packagedRestore, /\/proc\/\$\$\/fd\/9/);
  assert.doesNotMatch(packagedRestore, /exec [789]>/);
  assert.match(packagedRestore, /BRAIN_ROOT_BACKUP_STAGING_DIR:-\/run\/brain-root-backup-staging/);
  assert.match(packagedRestore, /for command in sqlite3 node mktemp[\s\S]*lsof/);
  assert.match(packagedRestore, /publish_volatile_backup_stage_file "\$stage" mv -f/);
  assert.match(packagedRestore, /BRAIN_SCRUB_RUNTIME_ROOT="\$RUNTIME_ROOT" node "\$SCRUB_HELPER" --db "\$TARGET"/);
  assert.doesNotMatch(packagedRestore, /\.pre-restore-\$\{TIMESTAMP\}\.bak/);
  assert.ok(
    [...packagedRestore.matchAll(/brain-notebooklm-retention\.service brain-notebooklm-retention\.timer/g)].length >= 2,
    "restore must prove the mutating retention timer and oneshot inactive both before and after locking",
  );
  assert.match(packagedRestore, /NOTEBOOKLM_RESTORE_BLOCK_REASON=restore_reconciliation_required/);
  assert.match(packagedRestore, /notebooklm\.restore_write_block_latched/);
  assert.match(packagedRestore, /ordinary protocol-reset API/);
  assert.match(packagedRestore, /node -e 'process\.stdout\.write\(String\(Date\.now\(\)\)\)'/);
  assert.doesNotMatch(packagedRestore, /date \+%s%3N/);
  assert.match(
    packagedRestore,
    /systemctl enable --now brain-notebooklm-retention\.timer brain-notebooklm-operations\.timer/,
  );
  assert.match(
    packagedRestore,
    /systemctl is-enabled brain-notebooklm-retention\.timer brain-notebooklm-operations\.timer/,
  );
  assert.match(
    packagedRestore,
    /systemctl is-active brain-notebooklm-retention\.timer brain-notebooklm-operations\.timer/,
  );
  assert.match(packagedRestore, /systemctl start brain-notebooklm-retention\.service/);
  assert.match(packagedRestore, /show --property=Result --value brain-notebooklm-retention\.service/);
  assert.match(packagedRestore, /this does not clear the provider-write latch/);
  assert.match(
    packagedRestore,
    /"\$candidate" 0 "" "" \\\s+"\$restore_block_latched" >\/dev\/null/,
  );

  // Execute the packaged restore control flow with a deliberately minimal
  // staging adapter. The staging/fencing implementation has its own focused
  // tests; this harness proves the restore script itself rejects a pre-026
  // candidate before persistent mutation and publishes an 026 candidate only
  // after installing the durable provider-write latch. Command shims cover
  // GNU option spelling so the same proof runs on macOS and Linux.
  const restoreHarness = resolve(fixture, "restore-execution");
  const restoreHarnessScripts = resolve(restoreHarness, "scripts");
  const restoreHarnessShims = resolve(restoreHarness, "shims");
  const restoreHarnessStage = resolve(restoreHarness, "volatile-stage");
  const restoreHarnessData = resolve(restoreHarness, "data");
  mkdirSync(restoreHarnessScripts, { recursive: true });
  mkdirSync(restoreHarnessShims, { recursive: true });
  mkdirSync(restoreHarnessStage, { recursive: true, mode: 0o700 });
  mkdirSync(restoreHarnessData, { recursive: true });
  chmodSync(restoreHarnessStage, 0o700);
  writeFileSync(resolve(restoreHarness, "package.json"), "{}\n");
  symlinkSync(resolve(root, "node_modules"), resolve(restoreHarness, "node_modules"), "dir");
  cpSync(resolve(extract, "runtime/scripts/restore-from-backup.sh"), resolve(restoreHarnessScripts, "restore-from-backup.sh"));
  cpSync(resolve(extract, "runtime/scripts/scrub-notebooklm-backup.mjs"), resolve(restoreHarnessScripts, "scrub-notebooklm-backup.mjs"));
  writeFileSync(
    resolve(restoreHarnessScripts, "verified-volatile-backup-staging.sh"),
    `create_verified_volatile_backup_stage() {
  local root="$1" prefix="$5" stage="$1/$5.$$.$RANDOM"
  mkdir "$stage"
  chmod 0700 "$stage"
  printf '9999999999999\\n' > "$stage/.deadline"
  printf '%s 1\\n' "$$" > "$stage/.owner"
  printf '%s\\n' "$stage"
}
run_volatile_backup_stage_step() {
  local stage="$1"
  shift
  SQLITE_TMPDIR="$stage" TMPDIR="$stage" "$@"
}
fence_volatile_backup_stage_writers() { return 0; }
mark_volatile_backup_stage_sanitized() { printf '9999999999999\\n' > "$1/.sanitized"; }
publish_volatile_backup_stage_file() { shift; "$@"; }
cleanup_stale_sanitized_backup_publications() { return 0; }
`,
  );
  const readlinkShim = resolve(restoreHarnessShims, "readlink");
  writeFileSync(
    readlinkShim,
    `#!/usr/bin/env node
const fs = require("node:fs");
const value = process.argv.at(-1);
try { process.stdout.write(fs.realpathSync(value) + "\\n"); } catch { process.exit(1); }
`,
  );
  const statShim = resolve(restoreHarnessShims, "stat");
  writeFileSync(
    statShim,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const formatIndex = args.findIndex((value) => value === "-c" || value === "-Lc");
if (formatIndex < 0 || args[formatIndex + 1] !== "%s") process.exit(2);
process.stdout.write(String(fs.statSync(args.at(-1)).size) + "\\n");
`,
  );
  for (const [name, body] of [
    ["findmnt", "#!/bin/sh\nexit 0\n"],
    ["flock", "#!/bin/sh\nexit 0\n"],
    ["timeout", "#!/bin/sh\nexit 0\n"],
    ["sync", "#!/bin/sh\nexit 0\n"],
    ["lsof", "#!/bin/sh\nexit 1\n"],
  ]) {
    const path = resolve(restoreHarnessShims, name);
    writeFileSync(path, body);
    chmodSync(path, 0o755);
  }
  chmodSync(readlinkShim, 0o755);
  chmodSync(statShim, 0o755);
  const restoreHarnessScript = resolve(restoreHarnessScripts, "restore-from-backup.sh");
  const restoreHarnessTarget = resolve(restoreHarnessData, "brain.sqlite");
  const liveBeforeRestore = new Database(restoreHarnessTarget);
  liveBeforeRestore.exec("CREATE TABLE live_sentinel (value TEXT NOT NULL); INSERT INTO live_sentinel VALUES ('unchanged');");
  liveBeforeRestore.close();
  const pre026BackupPath = resolve(restoreHarnessData, "pre026.sqlite");
  const pre026Backup = new Database(pre026BackupPath);
  pre026Backup.exec("CREATE TABLE _migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)");
  pre026Backup.close();
  const restoreHarnessEnv = {
    ...process.env,
    PATH: `${restoreHarnessShims}:${process.env.PATH}`,
    NODE_ENV: "test",
    BRAIN_UNSAFE_TEST_SKIP_BACKUP_STAGING_TMPFS_PROOF: "1",
    BRAIN_ROOT_BACKUP_STAGING_DIR: realpathSync(restoreHarnessStage),
    BRAIN_DB_PATH: realpathSync(restoreHarnessTarget),
  };
  const liveBeforeHash = sha256(restoreHarnessTarget);
  const pre026Restore = spawnSync("bash", [restoreHarnessScript, pre026BackupPath], {
    cwd: restoreHarness,
    encoding: "utf8",
    env: restoreHarnessEnv,
  });
  assert.equal(pre026Restore.status, 6, pre026Restore.stderr);
  assert.match(pre026Restore.stderr, /predates NotebookLM migration 026/);
  assert.equal(sha256(restoreHarnessTarget), liveBeforeHash, "pre-026 rejection must not mutate the live target");
  assert.equal(
    readdirSync(restoreHarnessData).some((name) => name.includes(".pre-restore-")),
    false,
    "pre-026 rejection must not publish a rollback or replacement file",
  );

  const migration026BackupPath = resolve(restoreHarnessData, "migration026.sqlite");
  const migration026Backup = new Database(migration026BackupPath);
  migration026Backup.exec(`
    CREATE TABLE _migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL);
    INSERT INTO _migrations VALUES ('026_notebooklm_export.sql', '${"c".repeat(64)}');
    CREATE TABLE notebooklm_export_requests (
      state TEXT NOT NULL, phase TEXT NOT NULL, safe_reason TEXT,
      payload_title TEXT, payload_text TEXT, snapshot_purge_at INTEGER NOT NULL,
      snapshot_purged_at INTEGER, completed_at INTEGER, create_dispatched_at INTEGER,
      lease_token_hash TEXT, lease_until INTEGER, updated_at INTEGER NOT NULL
    );
    CREATE TABLE notebooklm_runtime_control (
      id INTEGER PRIMARY KEY, provider_write_blocked INTEGER NOT NULL,
      block_reason TEXT, updated_at INTEGER NOT NULL
    );
    INSERT INTO notebooklm_runtime_control VALUES (1, 0, NULL, 0);
    CREATE TABLE notebooklm_operational_events (
      event_type TEXT NOT NULL, safe_reason TEXT, created_at INTEGER NOT NULL
    );
  `);
  migration026Backup.close();
  const migration026Restore = spawnSync("bash", [restoreHarnessScript, migration026BackupPath], {
    cwd: restoreHarness,
    encoding: "utf8",
    env: restoreHarnessEnv,
  });
  assert.equal(migration026Restore.status, 0, migration026Restore.stderr);
  assert.match(migration026Restore.stdout, /restore_reconciliation_required/);
  const restored026 = new Database(restoreHarnessTarget, { readonly: true });
  assert.deepEqual(
    restored026.prepare(
      "SELECT provider_write_blocked, block_reason FROM notebooklm_runtime_control WHERE id=1",
    ).get(),
    { provider_write_blocked: 1, block_reason: "restore_reconciliation_required" },
  );
  assert.deepEqual(
    restored026.prepare(
      "SELECT event_type, safe_reason FROM notebooklm_operational_events ORDER BY rowid DESC LIMIT 1",
    ).get(),
    {
      event_type: "notebooklm.restore_write_block_latched",
      safe_reason: "restore_reconciliation_required",
    },
  );
  restored026.close();
  const packagedActivate = readFileSync(resolve(extract, "runtime/scripts/activate-release.sh"), "utf8");
  const packagedSwitch = readFileSync(resolve(extract, "runtime/scripts/switch-release.sh"), "utf8");
  assert.ok(existsSync(resolve(extract, "runtime/scripts/wait-for-release-health.mjs")));
  assert.match(packagedActivate, /BRAIN_RELEASE_HEALTH_TOOL/);
  assert.match(packagedActivate, /BRAIN_RELEASE_MIGRATION_COMPAT_TOOL/);
  assert.match(packagedActivate, /BRAIN_ALLOW_AUDITED_ADDITIVE_ROLLBACK/);
  assert.match(packagedActivate, /systemctl enable --now brain-notebooklm-operations\.timer/);
  assert.match(packagedActivate, /notebooklm-timer-enabled/);
  assert.match(packagedActivate, /BRAIN_TARGET_NOTEBOOKLM_RETENTION_TIMER_ENABLED/);
  assert.match(packagedActivate, /026_notebooklm_export\.sql/);
  assert.match(packagedActivate, /stop_notebooklm_retention_writer\(\)/);
  assert.match(packagedActivate, /brain-notebooklm-retention\.service/);
  assert.match(packagedActivate, /brain-notebooklm-retention\.timer/);
  assert.match(packagedActivate, /scripts\/dist\/notebooklm-retention-prod\.mjs/);
  assert.ok(
    packagedActivate.indexOf("write_release_env\n") <
      packagedActivate.lastIndexOf("systemctl start brain-notebooklm-retention.timer"),
    "activation must publish the immutable release identity before starting the retention timer",
  );
  assert.match(packagedActivate, /install_backup_tools\(\)/);
  assert.match(packagedActivate, /bash "\$SCRIPT_DIR\/install-durable-backup-tools\.sh"/);
  assert.ok(
    packagedActivate.indexOf("install_backup_tools\n") < packagedActivate.indexOf("snapshot_system_state\nPREVIOUS"),
    "activation must harden the durable cron tools before release mutation",
  );
  assert.match(packagedActivate, /RELEASE_ID="\$APP_SHA-\$BUILDER_SHA"/);
  assert.match(packagedActivate, /AUTOMATIC RESTORATION INCOMPLETE/);
  assert.doesNotMatch(packagedActivate, /restore_previous_state \|\| true/);
  assert.match(packagedSwitch, /BRAIN_RELEASE_HEALTH_TOOL/);
  assert.match(packagedSwitch, /BRAIN_RELEASE_MIGRATION_COMPAT_TOOL/);
  assert.match(packagedSwitch, /BRAIN_ALLOW_AUDITED_ADDITIVE_ROLLBACK/);
  assert.match(packagedSwitch, /BRAIN_TARGET_NOTEBOOKLM_TIMER_ENABLED/);
  assert.match(packagedSwitch, /brain-notebooklm-operations\.timer/);
  assert.match(packagedSwitch, /BRAIN_TARGET_NOTEBOOKLM_RETENTION_TIMER_ENABLED/);
  assert.match(packagedSwitch, /stop_notebooklm_retention_writer\(\)/);
  assert.match(packagedSwitch, /brain-notebooklm-retention\.service/);
  assert.match(packagedSwitch, /brain-notebooklm-retention\.timer/);
  assert.match(packagedSwitch, /scripts\/dist\/notebooklm-retention-prod\.mjs/);
  assert.ok(
    packagedSwitch.indexOf("write_release_env\n") <
      packagedSwitch.lastIndexOf("systemctl start brain-notebooklm-retention.timer"),
    "switching must publish the immutable release identity before starting the retention timer",
  );
  assert.match(packagedSwitch, /install_backup_tools\(\)/);
  assert.match(packagedSwitch, /bash "\$SCRIPT_DIR\/install-durable-backup-tools\.sh"/);
  assert.ok(
    packagedSwitch.indexOf("install_backup_tools\n") < packagedSwitch.indexOf("snapshot_system_state\nTARGET_TIMER_ENABLED"),
    "switching must retain the durable backup privacy hardening before release mutation",
  );
  assert.ok(
    packagedBackupInstaller.indexOf("flock -x 8") < packagedBackupInstaller.indexOf('mv -f -- "$BACKUP_STAGE"'),
    "the durable installer must hold the shared cron lock before publishing backup tools",
  );
  assert.match(packagedBackupInstaller, /\[\[ ! -L "\$INSTALL_LOCK" \]\]/);
  assert.match(packagedBackupInstaller, /exec 8<>"\$INSTALL_LOCK"/);
  assert.match(packagedBackupInstaller, /\/proc\/\$\$\/fd\/8/);
  assert.ok(
    packagedBackupInstaller.indexOf('mv -f -- "$BACKUP_STAGE"') < packagedBackupInstaller.indexOf('mv -f -- "$HELPER_STAGE"'),
    "the durable installer must publish the fail-closed wrapper before the helper",
  );
  assert.match(packagedBackupInstaller, /backupToolSha256/);
  assert.ok(
    packagedBackupInstaller.indexOf("systemctl start brain-backup-staging-cleanup.service") <
      packagedBackupInstaller.indexOf('mv -f -- "$BACKUP_STAGE"'),
    "installer must execute-prove the durable janitor before publishing any raw-producing wrapper",
  );
  assert.match(packagedBackupInstaller, /BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT:-1/);
  assert.match(packagedBackupInstaller, /"\$DURABLE_SCRIPTS\/restore-from-backup\.sh"/);
  for (const [name, body] of [["activate", packagedActivate], ["switch", packagedSwitch]]) {
    assert.doesNotMatch(
      body.slice(body.indexOf("restore_previous_state()"), body.indexOf("\non_error()")),
      /\/opt\/brain\/scripts\/backup-offsite\.sh/,
      `${name} rollback must not restore a privacy-unsafe durable backup wrapper`,
    );
  }
  assert.match(packagedSwitch, /installed release ID does not match manifest application\/builder identity/);
  const activateRestore = packagedActivate.slice(
    packagedActivate.indexOf("restore_previous_state()"),
    packagedActivate.indexOf("\non_error()"),
  );
  const switchRestore = packagedSwitch.slice(
    packagedSwitch.indexOf("restore_previous_state()"),
    packagedSwitch.indexOf("\non_error()"),
  );
  for (const [name, body] of [["activate", activateRestore], ["switch", switchRestore]]) {
    assert.match(body, /verify_migration_compatibility/, `${name} restoration must recheck the live migration ledger`);
    assert.match(body, /prior runtime is incompatible with the live migration ledger/);
    assert.match(body, /stop_notebooklm_retention_writer/, `${name} restoration must stop the mutating retention writer`);
    assert.match(body, /restore_file \/etc\/brain\/release\.env release\.env/);
    assert.ok(
      body.indexOf("restore_file /etc/brain/release.env release.env") <
        body.indexOf("systemctl start brain-notebooklm-retention.timer"),
      `${name} restoration must restore release identity before restarting the retention timer`,
    );
    assert.ok(
      body.indexOf("systemctl stop brain") < body.indexOf("verify_migration_compatibility") &&
        body.indexOf("verify_migration_compatibility") < body.indexOf('ln -s -- "$prior_target"'),
      `${name} restoration must reject an incompatible prior runtime before changing the current link`,
    );
  }
  for (const [name, body, link] of [
    ["activate", packagedActivate, 'ln -s -- "$FINAL/runtime"'],
    ["switch", packagedSwitch, 'ln -s -- "$RUNTIME"'],
  ]) {
    const mutation = body.slice(body.lastIndexOf("MUTATED=1"));
    assert.ok(
      mutation.indexOf("systemctl stop brain") < mutation.indexOf("verify_migration_compatibility") &&
        mutation.indexOf("verify_migration_compatibility") < mutation.indexOf(link),
      `${name} must stop application writers and repeat the migration/empty-NotebookLM proof before switching`,
    );
  }
  assert.deepEqual(AUDITED_ADDITIVE_ROLLBACK_MIGRATIONS, [
    "025_item_workflow.sql",
    "026_notebooklm_export.sql",
  ]);
  const migrationEntry = (name, digit) => ({ name, sha256: digit.repeat(64) });
  const migration024 = migrationEntry("024_recall_manual_sync.sql", "a");
  const migration025 = migrationEntry("025_item_workflow.sql", "b");
  const migration026 = migrationEntry("026_notebooklm_export.sql", "c");
  const migration027 = migrationEntry("027_unreviewed.sql", "d");
  const pre026CannotProveRestoreLatch = runMigrationCompatibilityCli(
    [migration024],
    [migration024],
    false,
    {},
    1,
  );
  assert.notEqual(pre026CannotProveRestoreLatch.status, 0);
  assert.match(pre026CannotProveRestoreLatch.stderr, /provider_write_block_state_mismatch/);
  const migration026ProvesRestoreLatch = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024, migration026],
    false,
    {
      runtimeOverrides: {
        provider_write_blocked: 1,
        block_reason: "restore_reconciliation_required",
      },
    },
    1,
  );
  assert.equal(migration026ProvesRestoreLatch.status, 0, migration026ProvesRestoreLatch.stderr);
  const migration026RejectsMissingRestoreLatch = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024, migration026],
    false,
    {},
    1,
  );
  assert.notEqual(migration026RejectsMissingRestoreLatch.status, 0);
  assert.match(migration026RejectsMissingRestoreLatch.stderr, /provider_write_block_state_mismatch/);
  const auditedRollbackHashes = new Map([
    [migration025.name, migration025.sha256],
    [migration026.name, migration026.sha256],
  ]);
  const evaluate = (applied, packaged, allowAuditedAdditiveRollback = true) =>
    evaluateMigrationCompatibility({
      applied,
      packaged,
      allowAuditedAdditiveRollback,
      auditedRollbackHashes,
    });
  assert.equal(evaluate([migration024, migration025], [migration024, migration025], false).ok, true);
  assert.deepEqual(evaluate([migration024, migration025], [migration024], true), {
    ok: true,
    auditedRollback: true,
    unknown: ["025_item_workflow.sql"],
  });
  assert.deepEqual(evaluate([migration024, migration026], [migration024], true), {
    ok: true,
    auditedRollback: true,
    unknown: ["026_notebooklm_export.sql"],
  });
  assert.deepEqual(evaluate([migration024, migration025, migration026], [migration024], true), {
    ok: true,
    auditedRollback: true,
    unknown: ["025_item_workflow.sql", "026_notebooklm_export.sql"],
  });
  assert.equal(evaluate([migration024, migration026], [migration024], false).code, "migration_incompatible");
  assert.equal(evaluate([migration024, migration027], [migration024], true).code, "migration_incompatible");
  assert.equal(
    evaluate([migration024, migration025, migration027], [migration024], true).code,
    "migration_incompatible",
  );
  assert.equal(
    evaluate([{ ...migration024, sha256: "e".repeat(64) }, migration026], [migration024], true).code,
    "migration_hash_mismatch",
  );
  assert.equal(
    evaluateMigrationCompatibility({
      applied: [migration024, { ...migration026, sha256: "e".repeat(64) }],
      packaged: [migration024],
      allowAuditedAdditiveRollback: true,
      auditedRollbackHashes,
    }).code,
    "migration_incompatible",
  );
  assert.equal(runMigrationCompatibilityCli([migration024, migration025], [migration024], true).status, 0);
  assert.equal(runMigrationCompatibilityCli([migration024, migration026], [migration024], true).status, 0);
  const cliAllowsFirstDarkRetentionHeartbeat = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    {
      retentionHeartbeatCount: 1,
      runtimeOverrides: { retention_last_success_at: Date.now() },
    },
  );
  assert.equal(
    cliAllowsFirstDarkRetentionHeartbeat.status,
    0,
    cliAllowsFirstDarkRetentionHeartbeat.stderr,
  );
  assert.equal(
    runMigrationCompatibilityCli([migration024, migration025, migration026], [migration024], true).status,
    0,
  );
  const cliRejectsFrozenPayload = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    { requests: [{ phase: "terminal", payloadTitle: "frozen", payloadText: "content" }] },
  );
  assert.notEqual(cliRejectsFrozenPayload.status, 0);
  assert.match(cliRejectsFrozenPayload.stderr, /notebooklm_rollback_unsafe/);
  assert.match(cliRejectsFrozenPayload.stderr, /frozen_payload_present/);
  const cliRejectsUnresolvedRequest = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    { requests: [{ phase: "reconcile" }] },
  );
  assert.notEqual(cliRejectsUnresolvedRequest.status, 0);
  assert.match(cliRejectsUnresolvedRequest.stderr, /unresolved_request_present/);
  const cliRejectsTerminalHistory = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    { requests: [{ phase: "terminal" }] },
  );
  assert.notEqual(cliRejectsTerminalHistory.status, 0);
  assert.match(cliRejectsTerminalHistory.stderr, /request_history_present/);
  const cliRejectsPendingPhysicalPurge = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    { physicalPurgePending: true },
  );
  assert.notEqual(cliRejectsPendingPhysicalPurge.status, 0);
  assert.match(cliRejectsPendingPhysicalPurge.stderr, /physical_purge_pending/);
  const cliRejectsConnectorAndEventState = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    {
      pairingCodeCount: 1,
      connectorCount: 1,
      targetCount: 1,
      operationalEventCount: 1,
      exportEventCount: 1,
    },
  );
  assert.notEqual(cliRejectsConnectorAndEventState.status, 0);
  for (const reason of [
    "pairing_code_state_present",
    "connector_state_present",
    "target_state_present",
    "operational_event_state_present",
    "export_event_state_present",
  ]) {
    assert.match(cliRejectsConnectorAndEventState.stderr, new RegExp(reason));
  }
  const cliRejectsNonPristineRuntime = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    true,
    { runtimeOverrides: { retention_last_success_at: Date.now() } },
  );
  assert.notEqual(cliRejectsNonPristineRuntime.status, 0);
  assert.match(cliRejectsNonPristineRuntime.stderr, /runtime_control_not_pristine/);
  const cliRejects026WithoutRollback = runMigrationCompatibilityCli(
    [migration024, migration026],
    [migration024],
    false,
  );
  assert.notEqual(cliRejects026WithoutRollback.status, 0);
  assert.match(cliRejects026WithoutRollback.stderr, /migration_incompatible/);
  const cliRejects027 = runMigrationCompatibilityCli([migration024, migration027], [migration024], true);
  assert.notEqual(cliRejects027.status, 0);
  assert.match(cliRejects027.stderr, /migration_incompatible/);
  assert.match(cliRejects027.stderr, /027_unreviewed\.sql/);
  const cliRejectsUntrusted026 = runMigrationCompatibilityCli(
    [migration024, { ...migration026, sha256: "e".repeat(64) }],
    [migration024],
    true,
  );
  assert.notEqual(cliRejectsUntrusted026.status, 0);
  assert.match(cliRejectsUntrusted026.stderr, /migration_incompatible/);
  const scrubDatabasePath = resolve(fixture, "scrub-backup.sqlite");
  const scrubDatabase = new Database(scrubDatabasePath);
  scrubDatabase.exec(`CREATE TABLE notebooklm_export_requests (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    phase TEXT NOT NULL,
    safe_reason TEXT,
    payload_title TEXT,
    payload_text TEXT,
    snapshot_purge_at INTEGER NOT NULL,
    snapshot_purged_at INTEGER,
    completed_at INTEGER,
    create_dispatched_at INTEGER,
    lease_token_hash TEXT,
    lease_until INTEGER,
    updated_at INTEGER NOT NULL,
    opaque_marker TEXT NOT NULL,
    source_alias TEXT
  )`);
  const scrubNow = Date.now();
  const insertScrubRequest = scrubDatabase.prepare(`INSERT INTO notebooklm_export_requests
    (id, state, phase, safe_reason, payload_title, payload_text, snapshot_purge_at,
     snapshot_purged_at, completed_at, create_dispatched_at, lease_token_hash, lease_until,
     updated_at, opaque_marker, source_alias)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`);
  insertScrubRequest.run(
    "pre-create",
    "queued",
    "pre_create",
    "queued",
    "UNIQUE_FROZEN_TITLE_PRE_CREATE_DO_NOT_RETAIN",
    "UNIQUE_FROZEN_BODY_PRE_CREATE_DO_NOT_RETAIN",
    scrubNow + 1_000,
    null,
    "lease-pre-create",
    scrubNow + 1_000,
    scrubNow,
    "opaque-marker-pre-create",
    null,
  );
  insertScrubRequest.run(
    "sending-create",
    "sending",
    "create",
    "connector_claimed",
    "UNIQUE_FROZEN_TITLE_SENDING_DO_NOT_RETAIN",
    "UNIQUE_FROZEN_BODY_SENDING_DO_NOT_RETAIN",
    scrubNow + 1_000,
    scrubNow - 10,
    "lease-sending",
    scrubNow + 1_000,
    scrubNow,
    "opaque-marker-sending-create",
    null,
  );
  insertScrubRequest.run(
    "leased-reconcile",
    "leased",
    "reconcile",
    "provider_state_unknown",
    "UNIQUE_FROZEN_TITLE_RECONCILE_DO_NOT_RETAIN",
    "UNIQUE_FROZEN_BODY_RECONCILE_DO_NOT_RETAIN",
    scrubNow + 1_000,
    scrubNow - 10,
    "lease-reconcile",
    scrubNow + 1_000,
    scrubNow,
    "opaque-marker-leased-reconcile",
    null,
  );
  insertScrubRequest.run(
    "leased-poll",
    "leased",
    "poll",
    "status_pending",
    "UNIQUE_FROZEN_TITLE_POLL_DO_NOT_RETAIN",
    "UNIQUE_FROZEN_BODY_POLL_DO_NOT_RETAIN",
    scrubNow + 1_000,
    scrubNow - 10,
    "lease-poll",
    scrubNow + 1_000,
    scrubNow,
    "opaque-marker-leased-poll",
    "a".repeat(64),
  );
  scrubDatabase.close();
  const scrubTempBoundary = resolve(realpathSync(fixture), "scrub-tmp");
  mkdirSync(scrubTempBoundary, { mode: 0o700 });
  chmodSync(scrubTempBoundary, 0o700);
  const scrubBackup = spawnSync(process.execPath, [
    resolve(root, "scripts/scrub-notebooklm-backup.mjs"), "--db", scrubDatabasePath,
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "test",
      BRAIN_SCRUB_RUNTIME_ROOT: root,
      BRAIN_UNSAFE_TEST_SKIP_BACKUP_STAGING_TMPFS_PROOF: "1",
      SQLITE_TMPDIR: scrubTempBoundary,
      TMPDIR: scrubTempBoundary,
    },
  });
  assert.equal(scrubBackup.status, 0, scrubBackup.stderr);
  assert.doesNotMatch(scrubBackup.stdout, /UNIQUE_FROZEN/);
  const scrubbedDatabase = new Database(scrubDatabasePath, { readonly: true });
  assert.deepEqual(
    scrubbedDatabase.prepare(`SELECT id, state, phase, safe_reason,
      payload_title, payload_text, lease_token_hash, lease_until, opaque_marker, source_alias
      FROM notebooklm_export_requests ORDER BY id`).all(),
    [
      {
        id: "leased-poll",
        state: "processing",
        phase: "poll",
        safe_reason: "status_pending",
        payload_title: null,
        payload_text: null,
        lease_token_hash: null,
        lease_until: null,
        opaque_marker: "opaque-marker-leased-poll",
        source_alias: "a".repeat(64),
      },
      {
        id: "leased-reconcile",
        state: "reconciling",
        phase: "reconcile",
        safe_reason: "provider_state_unknown",
        payload_title: null,
        payload_text: null,
        lease_token_hash: null,
        lease_until: null,
        opaque_marker: "opaque-marker-leased-reconcile",
        source_alias: null,
      },
      {
        id: "pre-create",
        state: "expired",
        phase: "terminal",
        safe_reason: "backup_snapshot_omitted",
        payload_title: null,
        payload_text: null,
        lease_token_hash: null,
        lease_until: null,
        opaque_marker: "opaque-marker-pre-create",
        source_alias: null,
      },
      {
        id: "sending-create",
        state: "reconciling",
        phase: "reconcile",
        safe_reason: "connector_claimed",
        payload_title: null,
        payload_text: null,
        lease_token_hash: null,
        lease_until: null,
        opaque_marker: "opaque-marker-sending-create",
        source_alias: null,
      },
    ],
  );
  scrubbedDatabase.close();
  const scrubbedBytes = readFileSync(scrubDatabasePath);
  assert.equal(scrubbedBytes.includes(Buffer.from("UNIQUE_FROZEN_")), false);
  const operationsDatabasePath = resolve(fixture, "notebooklm-operations.sqlite");
  const operationsDatabase = new Database(operationsDatabasePath);
  operationsDatabase.exec(`
    CREATE TABLE notebooklm_runtime_control (
      id INTEGER PRIMARY KEY,
      provider_write_blocked INTEGER NOT NULL,
      protocol_failure_streak INTEGER NOT NULL,
      retention_last_success_at INTEGER,
      retention_last_failure_at INTEGER,
      retention_failure_streak INTEGER NOT NULL,
      retention_last_error_code TEXT,
      retention_physical_purge_pending INTEGER NOT NULL,
      retention_physical_purge_generation INTEGER NOT NULL
    );
    CREATE TABLE notebooklm_export_requests (
      snapshot_purged_at INTEGER,
      snapshot_purge_at INTEGER NOT NULL,
      create_dispatched_at INTEGER,
      state TEXT NOT NULL
    );
  `);
  operationsDatabase.prepare(`INSERT INTO notebooklm_runtime_control
    (id, provider_write_blocked, protocol_failure_streak, retention_last_success_at,
     retention_last_failure_at, retention_failure_streak, retention_last_error_code,
     retention_physical_purge_pending, retention_physical_purge_generation)
    VALUES (1, 1, 3, ?, NULL, 0, NULL, 0, 0)`).run(Date.now());
  operationsDatabase.close();
  const operationsChecker = resolve(root, "scripts/check-notebooklm-operations.mjs");
  const strictBlockedOperations = spawnSync(process.execPath, [
    operationsChecker, "--db", operationsDatabasePath, "--require-ready",
  ], { cwd: root, encoding: "utf8" });
  assert.notEqual(strictBlockedOperations.status, 0, "default operational readiness must fail on a provider safety block");
  assert.match(strictBlockedOperations.stdout, /provider_write_blocked/);
  const remediationOperations = spawnSync(process.execPath, [
    operationsChecker, "--db", operationsDatabasePath, "--require-ready", "--allow-existing-provider-block",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(remediationOperations.status, 0, remediationOperations.stderr);
  assert.deepEqual(
    (({ code, providerWriteBlocked, providerBlockAllowanceApplied, failures }) =>
      ({ code, providerWriteBlocked, providerBlockAllowanceApplied, failures }))(JSON.parse(remediationOperations.stdout)),
    {
      code: "ready_provider_block_preserved",
      providerWriteBlocked: true,
      providerBlockAllowanceApplied: true,
      failures: [],
    },
  );
  const staleOperationsDatabase = new Database(operationsDatabasePath);
  staleOperationsDatabase.prepare("UPDATE notebooklm_runtime_control SET retention_last_success_at=? WHERE id=1")
    .run(Date.now() - 10 * 60 * 1_000);
  staleOperationsDatabase.close();
  const remediationRejectsStaleRetention = spawnSync(process.execPath, [
    operationsChecker, "--db", operationsDatabasePath, "--require-ready", "--allow-existing-provider-block",
  ], { cwd: root, encoding: "utf8" });
  assert.notEqual(remediationRejectsStaleRetention.status, 0);
  assert.match(remediationRejectsStaleRetention.stdout, /retention_sweep_stale/);
  const pendingPurgeOperationsDatabase = new Database(operationsDatabasePath);
  pendingPurgeOperationsDatabase.prepare(`UPDATE notebooklm_runtime_control
    SET retention_last_success_at=?, retention_physical_purge_pending=1,
        retention_physical_purge_generation=1 WHERE id=1`).run(Date.now());
  pendingPurgeOperationsDatabase.close();
  const remediationRejectsPendingPurge = spawnSync(process.execPath, [
    operationsChecker, "--db", operationsDatabasePath, "--require-ready", "--allow-existing-provider-block",
  ], { cwd: root, encoding: "utf8" });
  assert.notEqual(remediationRejectsPendingPurge.status, 0);
  assert.match(remediationRejectsPendingPurge.stdout, /physical_purge_pending/);
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

  const fakeBin = resolve(realpathSync(fixture), "fake-bin");
  const ghLog = resolve(realpathSync(fixture), "fake-gh.log");
  mkdirSync(fakeBin, { recursive: true });
  const fakeGh = resolve(fakeBin, "gh");
  writeFileSync(fakeGh, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$FAKE_GH_LOG"\nexit 0\n');
  chmodSync(fakeGh, 0o755);
  const installer = resolve(root, "scripts/install-verified-extension-release.mjs");
  const installerEnv = { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, FAKE_GH_LOG: ghLog };
  const verifyExtension = spawnSync(process.execPath, [
    installer, outputA, "--expected-sha", sha, "--verify-only",
  ], { cwd: root, encoding: "utf8", env: installerEnv });
  assert.equal(verifyExtension.status, 0, verifyExtension.stderr);
  assert.equal(JSON.parse(verifyExtension.stdout).operation, "verified");
  const stableExtension = resolve(realpathSync(fixture), "stable", "brain-extension");
  const installExtension = spawnSync(process.execPath, [
    installer, outputA, stableExtension, "--expected-sha", sha,
  ], { cwd: root, encoding: "utf8", env: installerEnv });
  assert.equal(installExtension.status, 0, installExtension.stderr);
  const installEvidence = JSON.parse(installExtension.stdout);
  assert.equal(installEvidence.operation, "installed");
  assert.equal(installEvidence.backupCreated, false);
  assert.equal(installEvidence.appSha, sha);
  assert.equal(readFileSync(resolve(stableExtension, "assets/background.js"), "utf8"), "console.log('fixture');\n");
  const reinstallExtension = spawnSync(process.execPath, [installer, outputA, stableExtension], {
    cwd: root, encoding: "utf8", env: installerEnv,
  });
  assert.equal(reinstallExtension.status, 0, reinstallExtension.stderr);
  assert.equal(JSON.parse(reinstallExtension.stdout).backupCreated, true);
  const ghCalls = readFileSync(ghLog, "utf8");
  assert.match(ghCalls, /auth status --hostname github\.com/);
  assert.match(ghCalls, /--repo arunpr614\/ai-brain/);
  assert.match(ghCalls, /--signer-workflow arunpr614\/ai-brain\/\.github\/workflows\/product-ci\.yml/);
  assert.match(ghCalls, /--source-ref refs\/heads\/main/);
  assert.match(ghCalls, new RegExp(`--source-digest ${sha}`));
  const symlinkedExtensionArtifacts = resolve(fixture, "symlinked-extension-artifacts");
  mkdirSync(symlinkedExtensionArtifacts);
  for (const source of [first.extension.artifact, first.extension.manifest, first.extension.checksum]) {
    symlinkSync(source, resolve(symlinkedExtensionArtifacts, source.slice(dirname(source).length + 1)));
  }
  const rejectSymlinkedExtensionInputs = spawnSync(process.execPath, [
    installer, symlinkedExtensionArtifacts, "--verify-only",
  ], { cwd: root, encoding: "utf8", env: installerEnv });
  assert.notEqual(rejectSymlinkedExtensionInputs.status, 0, "symlinked extension release inputs must fail closed");
  const safeExtensionManifest = readFileSync(resolve(fixture, "extension-dist/manifest.json"), "utf8");
  const unsafeExtensionManifest = JSON.parse(safeExtensionManifest);
  unsafeExtensionManifest.permissions.push("cookies");
  writeFileSync(resolve(fixture, "extension-dist/manifest.json"), JSON.stringify(unsafeExtensionManifest));
  const unsafePermissionRelease = build(resolve(fixture, "out-unsafe-extension-permissions"));
  writeFileSync(resolve(fixture, "extension-dist/manifest.json"), safeExtensionManifest);
  const rejectUnsafeExtensionPermissions = spawnSync(process.execPath, [
    installer, dirname(unsafePermissionRelease.extension.artifact), "--verify-only",
  ], { cwd: root, encoding: "utf8", env: installerEnv });
  assert.notEqual(rejectUnsafeExtensionPermissions.status, 0, "unreviewed extension permissions must fail closed");
  const extraExtensionZip = resolve(outputA, "brain-extension-deadbeefdead.zip");
  cpSync(first.extension.artifact, extraExtensionZip);
  const rejectMultipleExtensionZips = spawnSync(process.execPath, [installer, outputA, "--verify-only"], {
    cwd: root, encoding: "utf8", env: installerEnv,
  });
  assert.notEqual(rejectMultipleExtensionZips.status, 0, "multiple extension zips must fail closed");
  unlinkSync(extraExtensionZip);
  const originalExtensionChecksum = readFileSync(first.extension.checksum, "utf8");
  writeFileSync(first.extension.checksum, `${"0".repeat(64)}  ${extensionReleaseManifest.artifactName}\n`);
  const rejectBadExtensionChecksum = spawnSync(process.execPath, [installer, outputA, "--verify-only"], {
    cwd: root, encoding: "utf8", env: installerEnv,
  });
  assert.notEqual(rejectBadExtensionChecksum.status, 0, "tampered extension checksum must fail closed");
  writeFileSync(first.extension.checksum, originalExtensionChecksum);

  cpSync(first.artifact, resolve(fixture, "tampered.tar.gz"));
  writeFileSync(resolve(fixture, "tampered.tar.gz"), "tampered", { flag: "a" });
  assert.notEqual(sha256(resolve(fixture, "tampered.tar.gz")), first.artifactSha256);
  console.log(JSON.stringify({
    ok: true,
    checks: 325,
    restoreExecutionProof: "pre026_rejected_026_latched",
    retentionExecutionProof: "immutable_bundle_executed",
    artifactSha256: first.artifactSha256,
    extensionArtifactSha256: first.extension.artifactSha256,
  }));
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
