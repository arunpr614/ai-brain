#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "scripts/dist/sync-recall-prod.mjs",
  "scripts/dist/recall-sync-lifecycle-prod.mjs",
  "scripts/dist/recall-manual-sync-worker-prod.mjs",
  "scripts/dist/db/migrations/024_recall_manual_sync.sql",
  "scripts/recall-scheduled-apply.sh",
  "scripts/deploy/brain.service",
  "scripts/deploy/brain-recall-sync.service",
  "scripts/deploy/brain-recall-sync.timer",
  "scripts/deploy/brain-recall-manual-sync.service",
  "scripts/deploy/brain-recall-manual-sync.path",
  "scripts/deploy/brain-recall-manual-sync.timer",
  "scripts/deploy/brain-recall-manual-sync.tmpfiles.conf",
];
for (const file of files) {
  if (!existsSync(file)) throw new Error(`missing Recall manual sync artifact: ${file}`);
}
const automatic = readFileSync("scripts/deploy/brain-recall-sync.service", "utf8");
const manual = readFileSync("scripts/deploy/brain-recall-manual-sync.service", "utf8");
const web = readFileSync("scripts/deploy/brain.service", "utf8");
const tmpfiles = readFileSync("scripts/deploy/brain-recall-manual-sync.tmpfiles.conf", "utf8");
const wrapper = readFileSync("scripts/recall-scheduled-apply.sh", "utf8");
const fallbackTimer = readFileSync("scripts/deploy/brain-recall-manual-sync.timer", "utf8");
const client = readFileSync("src/lib/recall/client.ts", "utf8");
const lifecycleSource = readFileSync("scripts/recall-sync-lifecycle.ts", "utf8");
const wakeService = readFileSync("src/lib/recall/manual-sync-service.ts", "utf8");
const wakePath = readFileSync("scripts/deploy/brain-recall-manual-sync.path", "utf8");
const deploy = readFileSync("scripts/deploy.sh", "utf8");
const processFixture = readFileSync("scripts/test-recall-manual-sync-process.mjs", "utf8");
for (const unit of [automatic, manual]) {
  if (!unit.includes("User=brain-recall") || !unit.includes("LoadCredential=recall-api-key:")) {
    throw new Error("Recall units must use the distinct identity and credential delivery");
  }
}
if (web.includes("LoadCredential=recall-api-key") || web.includes("/run/brain-recall")) {
  throw new Error("web service must not receive the Recall credential or private wrapper-lock access");
}
if (!tmpfiles.includes("/run/brain-recall 0700 brain-recall brain-recall")) {
  throw new Error("private Recall runtime lock directory is not mode 0700");
}
if (!wrapper.includes("BRAIN_RECALL_MANUAL_LOCK_WAIT_SECONDS:-5") || !wrapper.includes("BRAIN_RECALL_AUTOMATIC_LOCK_WAIT_SECONDS:-10800")) {
  throw new Error("trigger-aware full-wrapper lock bounds drifted");
}
if (!wrapper.includes("LastTriggerUSec") || !wrapper.includes('occurrence_key="manual:${request_id}"')) {
  throw new Error("automatic retries and manual requests must retain stable occurrence keys");
}
if (!wrapper.includes('BRAIN_RECALL_MAX_CARDS:-100') || !client.includes("options.timeoutMs ?? 30_000")) {
  throw new Error("the tested 10,800-second wrapper bound requires max-cards=100 and detail-timeout=30s");
}
if (!fallbackTimer.includes("OnUnitInactiveSec=60s")) throw new Error("lost-wake fallback must remain 60 seconds");
if (!wakePath.includes("PathChanged=/opt/brain/data/recall-manual-sync/wake") || !wakeService.includes("renameSync(temporaryMarker, marker)")) {
  throw new Error("empty wake markers must atomically replace the watched path");
}
if (lifecycleSource.includes("error.message") || lifecycleSource.includes("String(error)")) {
  throw new Error("lifecycle logs must not include raw exception or path text");
}
if (readFileSync(".env.example", "utf8").includes("BRAIN_RECALL_MANUAL_SYNC_UI_ENABLED=1")) {
  throw new Error("Recall manual UI must default off");
}
const activeGuard = deploy.indexOf("acquire_recall_deploy_guard", deploy.indexOf('log "3a.'));
const firstArtifactRsync = deploy.indexOf('rsync -az --delete --exclude \'/data/\'');
const recallBundleRsync = deploy.indexOf("scripts/dist/sync-recall-prod.mjs", firstArtifactRsync);
const permissionMutation = deploy.indexOf("chgrp -R brain-data /opt/brain/data", recallBundleRsync);
const daemonReload = deploy.indexOf("systemctl daemon-reload", permissionMutation);
const guardRelease = deploy.indexOf("release_recall_deploy_guard true", daemonReload);
if (
  activeGuard < 0 ||
  firstArtifactRsync < 0 ||
  activeGuard > firstArtifactRsync ||
  recallBundleRsync < firstArtifactRsync ||
  permissionMutation < recallBundleRsync ||
  daemonReload < permissionMutation ||
  guardRelease < daemonReload ||
  !deploy.includes("flock -n 9") ||
  !deploy.includes('while [[ -e "$hold" ]]') ||
  !deploy.includes("timer_changed|") ||
  !deploy.includes("brain-recall-manual-sync.service; do")
) {
  throw new Error("Recall runtime replacement must hold one continuous private lock and preserve timer state");
}
if (
  !processFixture.includes('runFakeSystemdActivation("path")') ||
  !processFixture.includes('runFakeSystemdActivation("fallback")') ||
  !processFixture.includes("recall-manual-sync-worker-prod.mjs") ||
  !processFixture.includes("worker did not invoke the controlled wrapper") ||
  !processFixture.includes("automatic work cannot enter during runtime switch")
) {
  throw new Error("process evidence must invoke the built worker for path/fallback and prove guarded switching");
}
console.log("[check:recall-manual-sync-artifacts] bundles, units and private lock manifest are complete");
