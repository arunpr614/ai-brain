#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${1:-}"
KNOWN_GOOD_DIR="${2:-}"
SSH_HOST="${BRAIN_SSH_HOST:-brain}"
BASE_URL="${BRAIN_BASE_URL:-https://brain.arunp.in}"
PROCESSING_FLAG_POLICY="${BRAIN_PROCESSING_FLAG_POLICY:-preserve}"
NOTEBOOKLM_FLAG_POLICY="${BRAIN_NOTEBOOKLM_FLAG_POLICY:-dark}"
NOTEBOOKLM_REMEDIATION_POLICY="${BRAIN_NOTEBOOKLM_REMEDIATION_POLICY:-strict}"
PROVENANCE_REPO="arunpr614/ai-brain"
PROVENANCE_HOST="github.com"
PROVENANCE_WORKFLOW="${PROVENANCE_REPO}/.github/workflows/product-ci.yml"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

die() { echo "[deploy-immutable] $*" >&2; exit 1; }
log() { printf '\n=== %s ===\n' "$1"; }
[[ -d "$ARTIFACT_DIR" ]] || die "usage: deploy-immutable-release.sh <candidate-artifact-dir> [known-good-artifact-dir]"
[[ "$PROCESSING_FLAG_POLICY" == "preserve" || "$PROCESSING_FLAG_POLICY" == "dark" ]] \
  || die "BRAIN_PROCESSING_FLAG_POLICY must be preserve or dark"
[[ "$NOTEBOOKLM_FLAG_POLICY" == "preserve" || "$NOTEBOOKLM_FLAG_POLICY" == "dark" ]] \
  || die "BRAIN_NOTEBOOKLM_FLAG_POLICY must be preserve or dark"
[[ "$NOTEBOOKLM_REMEDIATION_POLICY" == "strict" || "$NOTEBOOKLM_REMEDIATION_POLICY" == "preserve_existing_provider_block" ]] \
  || die "BRAIN_NOTEBOOKLM_REMEDIATION_POLICY must be strict or preserve_existing_provider_block"
for command in node ssh rsync curl gh; do command -v "$command" >/dev/null || die "required command missing: $command"; done
[[ "$(node -p 'process.versions.node.split(".")[0]')" == "22" ]] || die "Node 22 is required"
node -e 'const raw=process.argv[1]; const u=new URL(raw); if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash||raw!==u.origin)process.exit(1)' "$BASE_URL" \
  || die "BRAIN_BASE_URL must be a canonical HTTPS origin without credentials, path, query, or fragment"
gh auth status --hostname "$PROVENANCE_HOST" >/dev/null 2>&1 \
  || die "GitHub CLI authentication is required for provenance verification"

artifact_paths() {
  local directory="$1" artifacts manifests artifact manifest count
  artifacts="$(find "$directory" -maxdepth 1 -type f -name 'brain-release-*.tar.gz' -print)"
  manifests="$(find "$directory" -maxdepth 1 -type f -name 'brain-release-*.tar.gz.manifest.json' -print)"
  count="$(printf '%s\n' "$artifacts" | sed '/^$/d' | wc -l | tr -d ' ')"
  [[ "$count" == "1" ]] || die "artifact directory must contain exactly one release archive: $directory"
  count="$(printf '%s\n' "$manifests" | sed '/^$/d' | wc -l | tr -d ' ')"
  [[ "$count" == "1" ]] || die "artifact directory must contain exactly one release manifest: $directory"
  artifact="$artifacts"
  manifest="$manifests"
  printf '%s\n%s\n' "$artifact" "$manifest"
}

manifest_identity() {
  node - "$1" <<'NODE'
const manifest = require(process.argv[2]);
if (!/^[a-f0-9]{40}$/i.test(manifest.appSha || "") ||
    !/^[a-f0-9]{40}$/i.test(manifest.builderSha || "")) process.exit(1);
process.stdout.write(`${manifest.appSha.toLowerCase()} ${manifest.builderSha.toLowerCase()}`);
NODE
}

release_instance_id() {
  node - "$1" <<'NODE'
const manifest = require(process.argv[2]);
if (!/^[a-f0-9]{40}$/i.test(manifest.appSha || "") ||
    !/^[a-f0-9]{40}$/i.test(manifest.builderSha || "")) process.exit(1);
const appSha = manifest.appSha.toLowerCase();
const builderSha = manifest.builderSha.toLowerCase();
process.stdout.write(appSha === builderSha ? appSha : `${appSha}-${builderSha}`);
NODE
}

verify_local_artifact() {
  local artifact="$1" manifest="$2" require_app_builder_match="$3"
  node - "$artifact" "$manifest" "$require_app_builder_match" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const artifact = process.argv[2];
const manifest = require(process.argv[3]);
const requireMatch = process.argv[4] === "1";
const digest = crypto.createHash("sha256").update(fs.readFileSync(artifact)).digest("hex");
if (!/^[a-f0-9]{40}$/i.test(manifest.appSha || "") ||
    !/^[a-f0-9]{40}$/i.test(manifest.builderSha || "") ||
    digest !== manifest.artifactSha256 || path.basename(artifact) !== manifest.artifactName ||
    path.basename(artifact) !== `brain-release-${manifest.appSha.slice(0, 12).toLowerCase()}.tar.gz` ||
    path.basename(process.argv[3]) !== `${manifest.artifactName}.manifest.json` ||
    manifest.nodeMajor !== 22 || String(manifest.nodeAbi) !== "127" ||
    (requireMatch && manifest.appSha.toLowerCase() !== manifest.builderSha.toLowerCase())) process.exit(1);
NODE
}

verify_provenance() {
  local artifact="$1" manifest="$2" builder_sha="$3"
  for subject in "$artifact" "$manifest"; do
    gh attestation verify "$subject" \
      --repo "$PROVENANCE_REPO" \
      --signer-workflow "$PROVENANCE_WORKFLOW" \
      --source-ref refs/heads/main \
      --source-digest "$builder_sha" \
      --deny-self-hosted-runners >/dev/null
  done
}

verify_bootstrap_tools() {
  local manifest="$1"
  node - "$manifest" "$SCRIPT_DIR" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require(process.argv[2]);
const scripts = process.argv[3];
const expected = new Map(manifest.files.map((entry) => [entry.path, entry]));
for (const name of ["activate-release.sh", "switch-release.sh", "backup-offsite.sh", "install-durable-backup-tools.sh", "verified-volatile-backup-staging.sh", "cleanup-volatile-backup-staging.mjs", "recall-first-apply-preflight.mjs", "restore-from-backup.sh", "check-release-migration-compatibility.mjs", "scrub-notebooklm-backup.mjs", "verify-release-runtime.mjs", "wait-for-release-health.mjs", "dist/notebooklm-retention-prod.mjs"]) {
  const releasePath = `scripts/${name}`;
  const entry = expected.get(releasePath);
  const localPath = path.resolve(scripts, name);
  if (!entry || entry.kind !== "file" || !fs.statSync(localPath).isFile()) process.exit(1);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(localPath)).digest("hex");
  if (actual !== entry.sha256) process.exit(1);
}
const tmpfilesEntry = expected.get("scripts/deploy/brain-backup-staging.tmpfiles.conf");
const tmpfilesPath = path.resolve(scripts, "deploy/brain-backup-staging.tmpfiles.conf");
if (!tmpfilesEntry || tmpfilesEntry.kind !== "file" || !fs.statSync(tmpfilesPath).isFile() ||
    crypto.createHash("sha256").update(fs.readFileSync(tmpfilesPath)).digest("hex") !== tmpfilesEntry.sha256) process.exit(1);
for (const name of ["brain-backup-staging-cleanup.service", "brain-backup-staging-cleanup.timer", "brain-recall-backup-staging.drop-in.conf", "brain-notebooklm-retention.service", "brain-notebooklm-retention.timer"]) {
  const entry = expected.get(`scripts/deploy/${name}`);
  const localPath = path.resolve(scripts, `deploy/${name}`);
  if (!entry || entry.kind !== "file" || crypto.createHash("sha256").update(fs.readFileSync(localPath)).digest("hex") !== entry.sha256) process.exit(1);
}
NODE
}

remote_health() {
  local health_url="${BASE_URL%/}/api/health"
  ssh "$SSH_HOST" "sudo env BRAIN_HEALTH_URL='$health_url' TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_HEALTH'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
set -a
source /etc/brain/.env
set +a
tool="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA/wait-for-release-health.mjs"
[[ -f "$tool" ]]
BRAIN_RELEASE_HEALTH_TOKEN="${BRAIN_API_TOKEN:?}" node "$tool" "$BRAIN_HEALTH_URL" 45000
REMOTE_HEALTH
}

remote_processing_flag_snapshot() {
  ssh "$SSH_HOST" "sudo bash -s" <<'REMOTE_PROCESSING_FLAGS'
set -euo pipefail
set -a
source /etc/brain/.env
set +a
for key in PROCESSING_READ_ENABLED PROCESSING_WRITE_ENABLED PROCESSING_NAV_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]] || { echo "$key must be exactly 0 or 1" >&2; exit 1; }
  printf -v "$key" '%s' "$value"
done
[[ "$PROCESSING_WRITE_ENABLED" != "1" || "$PROCESSING_READ_ENABLED" == "1" ]]
[[ "$PROCESSING_NAV_ENABLED" != "1" || "$PROCESSING_READ_ENABLED" == "1" ]]
printf '%s:%s:%s\n' "$PROCESSING_READ_ENABLED" "$PROCESSING_WRITE_ENABLED" "$PROCESSING_NAV_ENABLED"
REMOTE_PROCESSING_FLAGS
}

remote_processing_flags_match() {
  local actual
  actual="$(remote_processing_flag_snapshot)" || return 1
  [[ "$actual" == "$TARGET_PROCESSING_FLAG_SNAPSHOT" ]]
}

remote_notebooklm_flag_snapshot() {
  ssh "$SSH_HOST" "sudo bash -s" <<'REMOTE_NOTEBOOKLM_FLAGS'
set -euo pipefail
set -a
source /etc/brain/.env
set +a
for key in BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]] || { echo "$key must be exactly 0 or 1" >&2; exit 1; }
  printf -v "$key" '%s' "$value"
done
snapshot="$BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED"
case "$snapshot" in
  0:0:0|1:0:0|1:1:0|1:1:1) ;;
  *) echo "NotebookLM flags must follow UI -> queue -> provider dependency order" >&2; exit 1;;
esac
printf '%s\n' "$snapshot"
REMOTE_NOTEBOOKLM_FLAGS
}

remote_notebooklm_flags_match() {
  local actual
  actual="$(remote_notebooklm_flag_snapshot)" || return 1
  [[ "$actual" == "$TARGET_NOTEBOOKLM_FLAG_SNAPSHOT" ]]
}

remote_notebooklm_operations_ready() {
  ssh "$SSH_HOST" "sudo env EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY='$NOTEBOOKLM_REMEDIATION_POLICY' EXPECTED_PROVIDER_WRITE_BLOCKED='$TARGET_PROVIDER_WRITE_BLOCKED' bash -s" <<'REMOTE_NOTEBOOKLM_OPERATIONS'
set -euo pipefail
set -a
source /etc/brain/.env
source /etc/brain/release.env
set +a
cd /opt/brain/current
actual_provider_write_blocked="$(sqlite3 "$BRAIN_DB_PATH" 'SELECT provider_write_blocked FROM notebooklm_runtime_control WHERE id=1;')"
[[ "$actual_provider_write_blocked" == "$EXPECTED_PROVIDER_WRITE_BLOCKED" ]]
if [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "preserve_existing_provider_block" ]]; then
  [[ "$EXPECTED_PROVIDER_WRITE_BLOCKED" == "1" ]]
  node scripts/check-notebooklm-operations.mjs --require-ready --allow-existing-provider-block >/dev/null
else
  [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "strict" && "$EXPECTED_PROVIDER_WRITE_BLOCKED" == "0" ]]
  node scripts/check-notebooklm-operations.mjs --require-ready >/dev/null
fi
systemctl is-enabled --quiet brain-notebooklm-operations.timer
systemctl is-active --quiet brain-notebooklm-operations.timer
REMOTE_NOTEBOOKLM_OPERATIONS
}

remote_notebooklm_retention_ready() {
  ssh "$SSH_HOST" "sudo bash -s" <<'REMOTE_NOTEBOOKLM_RETENTION'
set -euo pipefail
set -a
source /etc/brain/.env
source /etc/brain/release.env
set +a
release_id="${BRAIN_RELEASE_ID:-}"
[[ "$release_id" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ ]]
runtime="/opt/brain/releases/$release_id/runtime"
[[ -d "$runtime" && ! -L "$runtime" && "$(readlink -e -- "$runtime")" == "$runtime" ]]
[[ -f "$runtime/scripts/dist/notebooklm-retention-prod.mjs" && ! -L "$runtime/scripts/dist/notebooklm-retention-prod.mjs" ]]
[[ -f "$runtime/node_modules/better-sqlite3/package.json" && -f "$runtime/node_modules/sqlite-vec/package.json" ]]
for name in brain-notebooklm-retention.service brain-notebooklm-retention.timer; do
  runtime_unit="$runtime/scripts/deploy/$name"
  installed_unit="/etc/systemd/system/$name"
  [[ -f "$runtime_unit" && ! -L "$runtime_unit" && -f "$installed_unit" && ! -L "$installed_unit" ]]
  cmp --silent "$runtime_unit" "$installed_unit"
done
grep -Fq 'BRAIN_RELEASE_ID' /etc/systemd/system/brain-notebooklm-retention.service
grep -Fq '/opt/brain/releases/$release_id/runtime' /etc/systemd/system/brain-notebooklm-retention.service
! grep -Fq '/opt/brain/current' /etc/systemd/system/brain-notebooklm-retention.service
systemctl is-enabled --quiet brain-notebooklm-retention.timer
systemctl is-active --quiet brain-notebooklm-retention.timer
# This is the execution proof: the installed oneshot must resolve release.env,
# load the immutable bundle/native dependencies, and complete successfully.
systemctl start brain-notebooklm-retention.service
[[ "$(systemctl show --property=Result --value brain-notebooklm-retention.service)" == "success" ]]
! systemctl is-failed --quiet brain-notebooklm-retention.service
systemctl is-active --quiet brain-notebooklm-retention.timer
REMOTE_NOTEBOOKLM_RETENTION
}

remote_backup_tools_ready() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_BACKUP_TOOLS'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
durable=/opt/brain/scripts
for name in backup-offsite.sh scrub-notebooklm-backup.mjs verified-volatile-backup-staging.sh cleanup-volatile-backup-staging.mjs restore-from-backup.sh; do
  [[ -f "$tool_set/$name" && -f "$durable/$name" && ! -L "$durable/$name" ]]
  [[ "$(sha256sum "$tool_set/$name" | cut -d' ' -f1)" == "$(sha256sum "$durable/$name" | cut -d' ' -f1)" ]]
done
[[ "$(stat -c '%U:%G:%a' "$durable/backup-offsite.sh")" == "root:brain-data:750" ]]
[[ "$(stat -c '%U:%G:%a' "$durable/scrub-notebooklm-backup.mjs")" == "root:brain-data:640" ]]
[[ "$(stat -c '%U:%G:%a' "$durable/verified-volatile-backup-staging.sh")" == "root:brain-data:640" ]]
[[ "$(stat -c '%U:%G:%a' "$durable/cleanup-volatile-backup-staging.mjs")" == "root:brain-data:640" ]]
[[ "$(stat -c '%U:%G:%a' "$durable/restore-from-backup.sh")" == "root:brain-data:750" ]]
[[ ! -L /opt/brain/data/backups/.backup-offsite.lock ]]
[[ "$(stat -c '%U:%G:%a' /opt/brain/data/backups/.backup-offsite.lock)" == "brain:brain-data:660" ]]
grep -Fqx '0 */6 * * * brain /opt/brain/scripts/backup-offsite.sh >> /var/log/brain-backup.log 2>&1' /etc/cron.d/brain-backup
grep -Fqx 'd /run/brain-backup-staging 0700 brain brain-data - -' /etc/tmpfiles.d/brain-backup-staging.conf
grep -Fqx 'd /run/brain-recall-backup-staging 0700 brain-recall brain-data - -' /etc/tmpfiles.d/brain-backup-staging.conf
grep -Fqx 'd /run/brain-root-backup-staging 0700 root root - -' /etc/tmpfiles.d/brain-backup-staging.conf
grep -Fqx 'f /run/brain-release.lock 0600 root root - -' /etc/tmpfiles.d/brain-backup-staging.conf
[[ "$(stat -Lc '%U:%G:%a' /run/brain-backup-staging)" == "brain:brain-data:700" ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-recall-backup-staging)" == "brain-recall:brain-data:700" ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-root-backup-staging)" == "root:root:700" ]]
[[ -f /run/brain-release.lock && ! -L /run/brain-release.lock ]]
[[ "$(readlink -e -- /run/brain-release.lock)" == "/run/brain-release.lock" ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-release.lock)" == "root:root:600" ]]
[[ "$(findmnt --noheadings --target /run/brain-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
[[ "$(findmnt --noheadings --target /run/brain-recall-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
[[ "$(findmnt --noheadings --target /run/brain-root-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
for name in brain-backup-staging-cleanup.service brain-backup-staging-cleanup.timer; do
  [[ -f "$tool_set/$name" && -f "/etc/systemd/system/$name" ]]
  [[ "$(sha256sum "$tool_set/$name" | cut -d' ' -f1)" == "$(sha256sum "/etc/systemd/system/$name" | cut -d' ' -f1)" ]]
done
systemctl is-enabled --quiet brain-backup-staging-cleanup.timer
systemctl is-active --quiet brain-backup-staging-cleanup.timer
systemctl start brain-backup-staging-cleanup.service
for unit in brain-recall-sync.service brain-recall-manual-sync.service; do
  dropin="/etc/systemd/system/$unit.d/backup-staging.conf"
  [[ -f "$dropin" ]]
  [[ "$(sha256sum "$tool_set/brain-recall-backup-staging.drop-in.conf" | cut -d' ' -f1)" == "$(sha256sum "$dropin" | cut -d' ' -f1)" ]]
done
REMOTE_BACKUP_TOOLS
}

remote_recall_backup_privacy_ready() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_RECALL_BACKUP_PRIVACY'
set -euo pipefail
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
for name in recall-first-apply-preflight.mjs restore-from-backup.sh; do
  [[ -f "$tool_set/$name" && -f "/opt/brain/scripts/$name" && ! -L "/opt/brain/scripts/$name" ]]
  [[ "$(sha256sum "$tool_set/$name" | cut -d' ' -f1)" == "$(sha256sum "/opt/brain/scripts/$name" | cut -d' ' -f1)" ]]
done
for name in brain-recall-sync.service brain-recall-manual-sync.service; do
  [[ -f "/opt/brain/current/scripts/deploy/$name" && -f "/etc/systemd/system/$name" ]]
  [[ "$(sha256sum "/opt/brain/current/scripts/deploy/$name" | cut -d' ' -f1)" == "$(sha256sum "/etc/systemd/system/$name" | cut -d' ' -f1)" ]]
  grep -Fq 'BRAIN_RECALL_BACKUP_STAGING_DIR=/run/brain-recall-backup-staging' "/etc/systemd/system/$name"
  grep -Fq 'ReadWritePaths=/run/brain-recall-backup-staging' "/etc/systemd/system/$name"
done
REMOTE_RECALL_BACKUP_PRIVACY
}

remote_install_backup_tools() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_INSTALL_BACKUP_TOOLS'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT=0 bash "$tool_set/install-durable-backup-tools.sh"
REMOTE_INSTALL_BACKUP_TOOLS
}

remote_stage_artifact() {
  local artifact="$1" manifest="$2"
  local identity sha builder_sha release_id artifact_name manifest_name incoming remote_tmp
  identity="$(manifest_identity "$manifest")" || return 1
  read -r sha builder_sha <<< "$identity"
  release_id="$(release_instance_id "$manifest")" || return 1
  artifact_name="brain-release-${sha:0:12}.tar.gz"
  manifest_name="${artifact_name}.manifest.json"
  incoming="/opt/brain/release-incoming/$release_id"
  remote_tmp="$(ssh "$SSH_HOST" 'umask 077; mktemp -d /tmp/brain-release.XXXXXXXX')" || return 1
  [[ "$remote_tmp" =~ ^/tmp/brain-release\.[A-Za-z0-9]{8}$ ]] || return 1
  if ! rsync -a -- "$artifact" "$manifest" \
    "$SCRIPT_DIR/activate-release.sh" "$SCRIPT_DIR/switch-release.sh" "$SCRIPT_DIR/backup-offsite.sh" "$SCRIPT_DIR/install-durable-backup-tools.sh" "$SCRIPT_DIR/verified-volatile-backup-staging.sh" "$SCRIPT_DIR/cleanup-volatile-backup-staging.mjs" "$SCRIPT_DIR/recall-first-apply-preflight.mjs" "$SCRIPT_DIR/restore-from-backup.sh" "$SCRIPT_DIR/check-release-migration-compatibility.mjs" "$SCRIPT_DIR/verify-release-runtime.mjs" \
    "$SCRIPT_DIR/deploy/brain-backup-staging.tmpfiles.conf" "$SCRIPT_DIR/deploy/brain-backup-staging-cleanup.service" "$SCRIPT_DIR/deploy/brain-backup-staging-cleanup.timer" \
    "$SCRIPT_DIR/deploy/brain-recall-backup-staging.drop-in.conf" \
    "$SCRIPT_DIR/scrub-notebooklm-backup.mjs" "$SCRIPT_DIR/wait-for-release-health.mjs" \
    "$SSH_HOST:$remote_tmp/"; then
    ssh "$SSH_HOST" "rm -rf -- '$remote_tmp'" || true
    return 1
  fi
  if ! ssh "$SSH_HOST" "sudo env RELEASE_SHA='$sha' BUILDER_SHA='$builder_sha' RELEASE_INSTANCE_ID='$release_id' REMOTE_TMP='$remote_tmp' flock -x /run/brain-release-tools.lock bash -s" <<'REMOTE_INSTALL'
set -euo pipefail
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$RELEASE_INSTANCE_ID" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ ]]
expected_release_id="$RELEASE_SHA"
[[ "$RELEASE_SHA" == "$BUILDER_SHA" ]] || expected_release_id="$RELEASE_SHA-$BUILDER_SHA"
[[ "$RELEASE_INSTANCE_ID" == "$expected_release_id" ]]
[[ "$REMOTE_TMP" =~ ^/tmp/brain-release\.[A-Za-z0-9]{8}$ ]]
artifact_name="brain-release-${RELEASE_SHA:0:12}.tar.gz"
manifest_name="${artifact_name}.manifest.json"
incoming="/opt/brain/release-incoming/$RELEASE_INSTANCE_ID"
tools_root=/opt/brain/release-tools
tool_set="$tools_root/sets/$BUILDER_SHA"
install -d -o root -g brain-data -m 0750 "$incoming"
install -d -o root -g root -m 0750 "$tools_root" "$tools_root/sets"
install -o root -g brain-data -m 0640 "$REMOTE_TMP/$artifact_name" "$incoming/$artifact_name"
install -o root -g brain-data -m 0640 "$REMOTE_TMP/$manifest_name" "$incoming/$manifest_name"
if [[ ! -d "$tool_set" ]]; then
  tool_stage="$(mktemp -d "$tools_root/sets/.staging-${BUILDER_SHA}.XXXXXXXX")"
  trap 'rm -rf -- "${tool_stage:-}"' EXIT
  install -o root -g root -m 0750 "$REMOTE_TMP/activate-release.sh" "$tool_stage/activate-release.sh"
  install -o root -g root -m 0750 "$REMOTE_TMP/switch-release.sh" "$tool_stage/switch-release.sh"
  install -o root -g root -m 0750 "$REMOTE_TMP/backup-offsite.sh" "$tool_stage/backup-offsite.sh"
  install -o root -g root -m 0750 "$REMOTE_TMP/install-durable-backup-tools.sh" "$tool_stage/install-durable-backup-tools.sh"
  install -o root -g root -m 0644 "$REMOTE_TMP/verified-volatile-backup-staging.sh" "$tool_stage/verified-volatile-backup-staging.sh"
  install -o root -g root -m 0644 "$REMOTE_TMP/cleanup-volatile-backup-staging.mjs" "$tool_stage/cleanup-volatile-backup-staging.mjs"
  install -o root -g root -m 0644 "$REMOTE_TMP/recall-first-apply-preflight.mjs" "$tool_stage/recall-first-apply-preflight.mjs"
  install -o root -g root -m 0750 "$REMOTE_TMP/restore-from-backup.sh" "$tool_stage/restore-from-backup.sh"
  install -o root -g root -m 0644 "$REMOTE_TMP/brain-backup-staging.tmpfiles.conf" "$tool_stage/brain-backup-staging.tmpfiles.conf"
  install -o root -g root -m 0644 "$REMOTE_TMP/brain-backup-staging-cleanup.service" "$tool_stage/brain-backup-staging-cleanup.service"
  install -o root -g root -m 0644 "$REMOTE_TMP/brain-backup-staging-cleanup.timer" "$tool_stage/brain-backup-staging-cleanup.timer"
  install -o root -g root -m 0644 "$REMOTE_TMP/brain-recall-backup-staging.drop-in.conf" "$tool_stage/brain-recall-backup-staging.drop-in.conf"
  install -o root -g root -m 0644 "$REMOTE_TMP/check-release-migration-compatibility.mjs" "$tool_stage/check-release-migration-compatibility.mjs"
  install -o root -g root -m 0644 "$REMOTE_TMP/scrub-notebooklm-backup.mjs" "$tool_stage/scrub-notebooklm-backup.mjs"
  install -o root -g root -m 0644 "$REMOTE_TMP/verify-release-runtime.mjs" "$tool_stage/verify-release-runtime.mjs"
  install -o root -g root -m 0644 "$REMOTE_TMP/wait-for-release-health.mjs" "$tool_stage/wait-for-release-health.mjs"
  mv -- "$tool_stage" "$tool_set"
  tool_stage=""
  trap - EXIT
fi
node - "$REMOTE_TMP/$manifest_name" "$tool_set" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require(process.argv[2]);
const toolSet = process.argv[3];
const expected = new Map(manifest.files.map((entry) => [entry.path, entry]));
for (const name of ["activate-release.sh", "switch-release.sh", "backup-offsite.sh", "install-durable-backup-tools.sh", "verified-volatile-backup-staging.sh", "cleanup-volatile-backup-staging.mjs", "recall-first-apply-preflight.mjs", "restore-from-backup.sh", "check-release-migration-compatibility.mjs", "scrub-notebooklm-backup.mjs", "verify-release-runtime.mjs", "wait-for-release-health.mjs"]) {
  const entry = expected.get(`scripts/${name}`);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(path.resolve(toolSet, name))).digest("hex");
  if (!entry || entry.kind !== "file" || entry.sha256 !== actual) process.exit(1);
}
const tmpfilesEntry = expected.get("scripts/deploy/brain-backup-staging.tmpfiles.conf");
const tmpfilesActual = crypto.createHash("sha256").update(fs.readFileSync(path.resolve(toolSet, "brain-backup-staging.tmpfiles.conf"))).digest("hex");
if (!tmpfilesEntry || tmpfilesEntry.kind !== "file" || tmpfilesEntry.sha256 !== tmpfilesActual) process.exit(1);
for (const name of ["brain-backup-staging-cleanup.service", "brain-backup-staging-cleanup.timer", "brain-recall-backup-staging.drop-in.conf"]) {
  const entry = expected.get(`scripts/deploy/${name}`);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(path.resolve(toolSet, name))).digest("hex");
  if (!entry || entry.kind !== "file" || entry.sha256 !== actual) process.exit(1);
}
NODE
rm -rf -- "$REMOTE_TMP"
REMOTE_INSTALL
  then
    ssh "$SSH_HOST" "rm -rf -- '$remote_tmp'" || true
    return 1
  fi
}

remote_activate() {
  local artifact="$1" manifest="$2" skip_timer="$3" allow_audited_additive="$4"
  local identity sha builder_sha release_id artifact_name manifest_name incoming retention_supported
  identity="$(manifest_identity "$manifest")" || return 1
  read -r sha builder_sha <<< "$identity"
  release_id="$(release_instance_id "$manifest")" || return 1
  artifact_name="brain-release-${sha:0:12}.tar.gz"
  manifest_name="${artifact_name}.manifest.json"
  incoming="/opt/brain/release-incoming/$release_id"
  retention_supported="$(node -e 'const m=require(process.argv[1]); process.stdout.write((m.migrations?.files ?? []).some((entry)=>entry.name==="026_notebooklm_export.sql") ? "1" : "0")' "$manifest")" || return 1
  ssh "$SSH_HOST" "for service in brain-recall-sync.service brain-recall-manual-sync.service; do state=\$(systemctl is-active \"\$service\" 2>/dev/null || true); case \"\$state\" in active|activating|reloading|deactivating) echo \"\$service is \$state\" >&2; exit 1;; esac; done" || return 1
  if ssh "$SSH_HOST" "sudo test -d '/opt/brain/releases/$release_id/runtime'"; then
    if [[ "$skip_timer" == "1" ]]; then
      local retry_timer_state retry_timer_enabled retry_timer_active
      retry_timer_state="$(ssh "$SSH_HOST" 'systemctl is-enabled --quiet brain-processing-audit.timer 2>/dev/null && enabled=1 || enabled=0; systemctl is-active --quiet brain-processing-audit.timer 2>/dev/null && active=1 || active=0; printf "%s %s\n" "$enabled" "$active"')" || return 1
      read -r retry_timer_enabled retry_timer_active <<< "$retry_timer_state"
    else
      retry_timer_enabled=1
      retry_timer_active=1
    fi
    remote_switch "$release_id" "$retry_timer_enabled" "$retry_timer_active" "$allow_audited_additive" 1 1 "$retention_supported" "$retention_supported"
    return
  fi
  ssh "$SSH_HOST" "sudo env RELEASE_SHA='$sha' RELEASE_INSTANCE_ID='$release_id' TOOL_BUILDER_SHA='$builder_sha' BRAIN_DB_PATH='$TARGET_DB_PATH' BRAIN_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' BRAIN_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' BRAIN_SKIP_PROCESSING_AUDIT_TIMER='$skip_timer' BRAIN_ALLOW_AUDITED_ADDITIVE_ROLLBACK='$allow_audited_additive' BRAIN_AUDITED_SCHEMA_025_SHA256='$AUDITED_SCHEMA_025_SHA256' BRAIN_AUDITED_SCHEMA_026_SHA256='$AUDITED_SCHEMA_026_SHA256' BRAIN_ACTIVATION_HEALTH_URL='${BASE_URL%/}/api/health' bash -s" <<'REMOTE_ACTIVATE'
set -euo pipefail
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$RELEASE_INSTANCE_ID" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ ]]
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
artifact_name="brain-release-${RELEASE_SHA:0:12}.tar.gz"
manifest_name="${artifact_name}.manifest.json"
incoming="/opt/brain/release-incoming/$RELEASE_INSTANCE_ID"
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
exec env BRAIN_RELEASE_VERIFY_TOOL="$tool_set/verify-release-runtime.mjs" \
  BRAIN_RELEASE_HEALTH_TOOL="$tool_set/wait-for-release-health.mjs" \
  BRAIN_RELEASE_MIGRATION_COMPAT_TOOL="$tool_set/check-release-migration-compatibility.mjs" \
  flock -n /run/brain-recall/recall-sync.lock bash "$tool_set/activate-release.sh" \
  "$incoming/$artifact_name" "$incoming/$manifest_name"
REMOTE_ACTIVATE
}

remote_switch() {
  local release_id="$1" timer_enabled="$2" timer_active="$3" allow_audited_additive="$4" notebooklm_timer_enabled="$5" notebooklm_timer_active="$6" retention_timer_enabled="$7" retention_timer_active="$8"
  [[ "$release_id" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ && "$timer_enabled" =~ ^[01]$ && "$timer_active" =~ ^[01]$ && "$notebooklm_timer_enabled" =~ ^[01]$ && "$notebooklm_timer_active" =~ ^[01]$ && "$retention_timer_enabled" =~ ^[01]$ && "$retention_timer_active" =~ ^[01]$ ]] || return 1
  ssh "$SSH_HOST" "sudo env RELEASE_INSTANCE_ID='$release_id' TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' BRAIN_DB_PATH='$TARGET_DB_PATH' BRAIN_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' BRAIN_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' BRAIN_ALLOW_AUDITED_ADDITIVE_ROLLBACK='$allow_audited_additive' BRAIN_AUDITED_SCHEMA_025_SHA256='$AUDITED_SCHEMA_025_SHA256' BRAIN_AUDITED_SCHEMA_026_SHA256='$AUDITED_SCHEMA_026_SHA256' BRAIN_TARGET_TIMER_ENABLED='$timer_enabled' BRAIN_TARGET_TIMER_ACTIVE='$timer_active' BRAIN_TARGET_NOTEBOOKLM_TIMER_ENABLED='$notebooklm_timer_enabled' BRAIN_TARGET_NOTEBOOKLM_TIMER_ACTIVE='$notebooklm_timer_active' BRAIN_TARGET_NOTEBOOKLM_RETENTION_TIMER_ENABLED='$retention_timer_enabled' BRAIN_TARGET_NOTEBOOKLM_RETENTION_TIMER_ACTIVE='$retention_timer_active' BRAIN_ACTIVATION_HEALTH_URL='${BASE_URL%/}/api/health' bash -s" <<'REMOTE_SWITCH'
set -euo pipefail
[[ "$RELEASE_INSTANCE_ID" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ ]]
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
exec env BRAIN_RELEASE_VERIFY_TOOL="$tool_set/verify-release-runtime.mjs" \
  BRAIN_RELEASE_HEALTH_TOOL="$tool_set/wait-for-release-health.mjs" \
  BRAIN_RELEASE_MIGRATION_COMPAT_TOOL="$tool_set/check-release-migration-compatibility.mjs" \
  flock -n /run/brain-recall/recall-sync.lock bash "$tool_set/switch-release.sh" "$RELEASE_INSTANCE_ID"
REMOTE_SWITCH
}

remote_release_state() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_STATE'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
target="$(readlink -f /opt/brain/current)"
[[ "$target" =~ ^/opt/brain/releases/([a-f0-9]{40}(-[a-f0-9]{40})?)/runtime$ ]]
release_id="${BASH_REMATCH[1]}"
identity="$(node - "$target/release-manifest.json" <<'NODE'
const manifest = require(process.argv[2]);
if (!/^[a-f0-9]{40}$/i.test(manifest.appSha || "") || !/^[a-f0-9]{40}$/i.test(manifest.builderSha || "")) process.exit(1);
process.stdout.write(`${manifest.appSha.toLowerCase()} ${manifest.builderSha.toLowerCase()}`);
NODE
)"
read -r app_sha builder_sha <<< "$identity"
expected_release_id="$app_sha"
[[ "$app_sha" == "$builder_sha" ]] || expected_release_id="$app_sha-$builder_sha"
[[ "$release_id" == "$expected_release_id" ]]
release_root="$(dirname -- "$target")"
artifact_name="brain-release-${app_sha:0:12}.tar.gz"
manifest="$release_root/evidence/$artifact_name.manifest.json"
artifact="$release_root/evidence/$artifact_name"
verify_tool="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA/verify-release-runtime.mjs"
[[ -f "$manifest" && -f "$artifact" && -f "$verify_tool" && -f /etc/brain/release.env ]]
node "$verify_tool" "$target" "$manifest" "$artifact" >/dev/null
set -a
source /etc/brain/release.env
set +a
[[ "${BRAIN_APP_SHA:-}" == "$app_sha" && "${BRAIN_BUILDER_SHA:-}" == "$builder_sha" && "${BRAIN_RELEASE_ID:-}" == "$release_id" ]]
systemctl is-active --quiet brain
systemctl is-enabled --quiet brain-processing-audit.timer 2>/dev/null && enabled=1 || enabled=0
systemctl is-active --quiet brain-processing-audit.timer 2>/dev/null && active=1 || active=0
systemctl is-enabled --quiet brain-notebooklm-operations.timer 2>/dev/null && notebooklm_enabled=1 || notebooklm_enabled=0
systemctl is-active --quiet brain-notebooklm-operations.timer 2>/dev/null && notebooklm_active=1 || notebooklm_active=0
systemctl is-enabled --quiet brain-notebooklm-retention.timer 2>/dev/null && retention_enabled=1 || retention_enabled=0
systemctl is-active --quiet brain-notebooklm-retention.timer 2>/dev/null && retention_active=1 || retention_active=0
printf '%s %s %s %s %s %s %s\n' "$release_id" "$enabled" "$active" "$notebooklm_enabled" "$notebooklm_active" "$retention_enabled" "$retention_active"
REMOTE_STATE
}

promote_release_tools() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' flock -x /run/brain-release-tools.lock bash -s" <<'REMOTE_PROMOTE'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tools_root=/opt/brain/release-tools
tool_set="$tools_root/sets/$TOOL_BUILDER_SHA"
for name in activate-release.sh switch-release.sh backup-offsite.sh install-durable-backup-tools.sh verified-volatile-backup-staging.sh cleanup-volatile-backup-staging.mjs recall-first-apply-preflight.mjs restore-from-backup.sh brain-backup-staging.tmpfiles.conf brain-backup-staging-cleanup.service brain-backup-staging-cleanup.timer brain-recall-backup-staging.drop-in.conf check-release-migration-compatibility.mjs scrub-notebooklm-backup.mjs verify-release-runtime.mjs wait-for-release-health.mjs; do
  [[ -f "$tool_set/$name" ]]
done
current_tmp="$tools_root/.current-${TOOL_BUILDER_SHA}.$$.tmp"
ln -s -- "$tool_set" "$current_tmp"
mv -Tf -- "$current_tmp" "$tools_root/current"
[[ "$(readlink -f "$tools_root/current")" == "$tool_set" ]]
REMOTE_PROMOTE
}

rollback_and_die() {
  local reason="$1" current_state current_release current_enabled current_active current_notebooklm_enabled current_notebooklm_active current_retention_enabled current_retention_active
  if current_state="$(remote_release_state 2>/dev/null)"; then
    read -r current_release current_enabled current_active current_notebooklm_enabled current_notebooklm_active current_retention_enabled current_retention_active <<< "$current_state"
    if [[ "$current_release" == "$PREVIOUS_SHA" && "$current_enabled" == "$PREVIOUS_TIMER_ENABLED" && "$current_active" == "$PREVIOUS_TIMER_ACTIVE" && "$current_notebooklm_enabled" == "$PREVIOUS_NOTEBOOKLM_TIMER_ENABLED" && "$current_notebooklm_active" == "$PREVIOUS_NOTEBOOKLM_TIMER_ACTIVE" && "$current_retention_enabled" == "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ENABLED" && "$current_retention_active" == "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ACTIVE" ]] \
      && remote_health && remote_processing_flags_match && remote_notebooklm_flags_match; then
      die "$reason; previous release remained active, health-verified, and feature-flag snapshots were preserved"
    fi
  fi
  echo "[deploy-immutable] $reason; rolling back to $PREVIOUS_SHA" >&2
  if remote_switch "$PREVIOUS_SHA" "$PREVIOUS_TIMER_ENABLED" "$PREVIOUS_TIMER_ACTIVE" 1 "$PREVIOUS_NOTEBOOKLM_TIMER_ENABLED" "$PREVIOUS_NOTEBOOKLM_TIMER_ACTIVE" "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ENABLED" "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ACTIVE" \
    && remote_health && remote_processing_flags_match && remote_notebooklm_flags_match; then
    die "$reason; previous release restored, health-verified, and feature-flag snapshots were preserved"
  fi
  die "$reason; AUTOMATIC ROLLBACK FAILED"
}

CANDIDATE_LIST="$(artifact_paths "$ARTIFACT_DIR")"
CANDIDATE_ARTIFACT="$(printf '%s\n' "$CANDIDATE_LIST" | sed -n '1p')"
CANDIDATE_MANIFEST="$(printf '%s\n' "$CANDIDATE_LIST" | sed -n '2p')"
CANDIDATE_IDENTITY="$(manifest_identity "$CANDIDATE_MANIFEST")" || die "candidate manifest identity is invalid"
read -r CANDIDATE_SHA CANDIDATE_BUILDER_SHA <<< "$CANDIDATE_IDENTITY"

log "Candidate artifact integrity and provenance"
verify_local_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" 1 || die "candidate artifact checksum/runtime identity mismatch"
verify_provenance "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" "$CANDIDATE_BUILDER_SHA" \
  || die "candidate GitHub main/workflow/source provenance verification failed"
verify_bootstrap_tools "$CANDIDATE_MANIFEST" || die "local bootstrap tools do not match the attested candidate artifact"
AUDITED_MIGRATION_HASHES="$(node - "$CANDIDATE_MANIFEST" <<'NODE'
const manifest = require(process.argv[2]);
const byName = new Map((manifest.migrations?.files ?? []).map((entry) => [entry.name, entry.sha256]));
const hashes = [byName.get("025_item_workflow.sql"), byName.get("026_notebooklm_export.sql")];
if (hashes.some((hash) => !/^[a-f0-9]{64}$/.test(hash ?? ""))) process.exit(1);
process.stdout.write(hashes.join(" "));
NODE
)" || die "candidate lacks exact audited schema-025/schema-026 rollback hashes"
read -r AUDITED_SCHEMA_025_SHA256 AUDITED_SCHEMA_026_SHA256 <<< "$AUDITED_MIGRATION_HASHES"

log "Remote preflight, canonical database identity, and feature-flag policies"
# Keep this here-document outside command substitution. The macOS Bash 3.2
# parser can otherwise expand remote-only variables locally when a quoted
# here-document containing another here-document is embedded directly in $().
remote_database_preflight() {
  ssh "$SSH_HOST" "sudo env EXPECTED_PUBLIC_ORIGIN='$BASE_URL' EXPECTED_PROCESSING_FLAG_POLICY='$PROCESSING_FLAG_POLICY' EXPECTED_NOTEBOOKLM_FLAG_POLICY='$NOTEBOOKLM_FLAG_POLICY' EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY='$NOTEBOOKLM_REMEDIATION_POLICY' bash -s" <<'REMOTE_DB'
set -euo pipefail
for command in node sqlite3 readlink stat sha256sum dirname runuser; do command -v "$command" >/dev/null; done
[[ "$(uname -m)" == "x86_64" ]]
[[ "$(node -p 'process.versions.modules')" == "127" ]]
[[ -f /etc/brain/.env ]]
set -a
source /etc/brain/.env
set +a
[[ "${BRAIN_PROCESSING_HMAC_SECRET:-}" =~ ^[a-fA-F0-9]{64}$ ]]
[[ "$BRAIN_PROCESSING_HMAC_SECRET" != "${BRAIN_API_TOKEN:-}" ]]
[[ "${BRAIN_PUBLIC_ORIGIN:-}" == "$EXPECTED_PUBLIC_ORIGIN" ]]
node - <<'NODE'
const timezone = process.env.BRAIN_OWNER_TIMEZONE?.trim();
if (!timezone) process.exit(1);
try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); }
catch { process.exit(1); }
const rawOrigin = process.env.BRAIN_PUBLIC_ORIGIN?.trim();
const origin = new URL(rawOrigin);
if (origin.protocol !== "https:" || origin.username || origin.password || rawOrigin !== origin.origin) process.exit(1);
NODE
[[ "${BRAIN_DB_PATH:-}" =~ ^/[A-Za-z0-9._/-]+$ ]]
canonical="$(readlink -e -- "$BRAIN_DB_PATH")"
[[ "$canonical" == "$BRAIN_DB_PATH" && -f "$canonical" && ! -L "$canonical" ]]
data_root="$(dirname -- "$canonical")"
[[ "$data_root" != /opt/brain/releases && "$data_root" != /opt/brain/releases/* ]]
node - "$data_root" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const dataRoot = fs.realpathSync(process.argv[2]);
const canonicalProspectivePath = (raw) => {
  let existing = path.resolve(raw);
  const remainder = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return null;
    remainder.unshift(path.basename(existing));
    existing = parent;
  }
  return path.resolve(fs.realpathSync(existing), ...remainder);
};
const inside = (raw) => {
  if (!raw) return true;
  if (!path.isAbsolute(raw)) return false;
  const candidate = canonicalProspectivePath(raw);
  if (!candidate) return false;
  return candidate === dataRoot || candidate.startsWith(`${dataRoot}${path.sep}`);
};
if (!inside(process.env.BRAIN_CAPTURE_ARTIFACT_ROOT?.trim()) ||
    !inside(process.env.BRAIN_RECALL_WAKE_MARKER?.trim())) process.exit(1);
NODE
runuser -u brain -g brain-data -- test -w "$data_root"
path_hash="$(printf '%s' "$canonical" | sha256sum | cut -d' ' -f1)"
device_inode="$(stat -Lc '%d:%i' -- "$canonical")"
for key in PROCESSING_READ_ENABLED PROCESSING_WRITE_ENABLED PROCESSING_NAV_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]] || { echo "$key must be exactly 0 or 1" >&2; exit 1; }
  printf -v "$key" '%s' "$value"
done
[[ "$PROCESSING_WRITE_ENABLED" != "1" || "$PROCESSING_READ_ENABLED" == "1" ]]
[[ "$PROCESSING_NAV_ENABLED" != "1" || "$PROCESSING_READ_ENABLED" == "1" ]]
processing_snapshot="$PROCESSING_READ_ENABLED:$PROCESSING_WRITE_ENABLED:$PROCESSING_NAV_ENABLED"
if [[ "$EXPECTED_PROCESSING_FLAG_POLICY" == "dark" ]]; then
  [[ "$processing_snapshot" == "0:0:0" ]] || { echo "Processing flags are not dark" >&2; exit 1; }
else
  [[ "$EXPECTED_PROCESSING_FLAG_POLICY" == "preserve" ]]
fi
for key in BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]] || { echo "$key must be exactly 0 or 1" >&2; exit 1; }
  printf -v "$key" '%s' "$value"
done
notebooklm_snapshot="$BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED"
case "$notebooklm_snapshot" in
  0:0:0|1:0:0|1:1:0|1:1:1) ;;
  *) echo "NotebookLM flags must follow UI -> queue -> provider dependency order" >&2; exit 1;;
esac
if [[ "$EXPECTED_NOTEBOOKLM_FLAG_POLICY" == "dark" ]]; then
  [[ "$notebooklm_snapshot" == "0:0:0" ]] || { echo "NotebookLM flags are not dark" >&2; exit 1; }
else
  [[ "$EXPECTED_NOTEBOOKLM_FLAG_POLICY" == "preserve" ]]
fi
provider_write_blocked=0
control_installed="$(sqlite3 "$canonical" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notebooklm_runtime_control';")"
[[ "$control_installed" =~ ^[01]$ ]]
if [[ "$control_installed" == "1" ]]; then
  [[ "$(sqlite3 "$canonical" 'SELECT COUNT(*) FROM notebooklm_runtime_control WHERE id=1;')" == "1" ]]
  provider_write_blocked="$(sqlite3 "$canonical" 'SELECT provider_write_blocked FROM notebooklm_runtime_control WHERE id=1;')"
fi
[[ "$provider_write_blocked" =~ ^[01]$ ]]
if [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "strict" ]]; then
  [[ "$provider_write_blocked" == "0" ]] || { echo "NotebookLM provider writes are safety-blocked; use only the explicit remediation policy for a connector/protocol repair" >&2; exit 1; }
else
  [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "preserve_existing_provider_block" && "$provider_write_blocked" == "1" ]] \
    || { echo "NotebookLM remediation policy requires an already-existing provider write block" >&2; exit 1; }
fi
printf '%s %s %s %s %s %s\n' "$canonical" "$path_hash" "$device_inode" "$processing_snapshot" "$notebooklm_snapshot" "$provider_write_blocked"
REMOTE_DB
}
REMOTE_DB_INFO="$(remote_database_preflight)" \
  || die "remote runtime, environment, database identity, feature-flag, or remediation-policy preflight failed"
read -r TARGET_DB_PATH TARGET_DB_PATH_SHA256 TARGET_DB_DEVICE_INODE TARGET_PROCESSING_FLAG_SNAPSHOT TARGET_NOTEBOOKLM_FLAG_SNAPSHOT TARGET_PROVIDER_WRITE_BLOCKED <<< "$REMOTE_DB_INFO"
[[ "$TARGET_DB_PATH" =~ ^/[A-Za-z0-9._/-]+$ && "$TARGET_DB_PATH_SHA256" =~ ^[a-f0-9]{64}$ && "$TARGET_DB_DEVICE_INODE" =~ ^[0-9]+:[0-9]+$ && "$TARGET_PROCESSING_FLAG_SNAPSHOT" =~ ^[01]:[01]:[01]$ ]] \
  || die "remote database identity proof is malformed"
[[ "$TARGET_PROVIDER_WRITE_BLOCKED" =~ ^[01]$ ]] || die "remote NotebookLM provider-block proof is malformed"
case "$TARGET_NOTEBOOKLM_FLAG_SNAPSHOT" in
  0:0:0|1:0:0|1:1:0|1:1:1) ;;
  *) die "remote NotebookLM flag snapshot is malformed";;
esac
ssh "$SSH_HOST" "test \$(df -Pk /opt/brain | awk 'NR==2{print \$4}') -gt 2097152" \
  || die "remote release store requires at least 2 GiB free"

log "Stage attested candidate runtime and exact builder tool set"
remote_stage_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" \
  || die "candidate artifact/tool staging failed before runtime mutation"
remote_install_backup_tools || die "attested durable off-site backup privacy-tool installation failed"
remote_backup_tools_ready || die "durable off-site backup privacy tools or six-hour cron were not verified before backup"
remote_processing_flags_match || die "Processing feature flags changed after preflight and before release mutation"
remote_notebooklm_flags_match || die "NotebookLM feature flags changed after preflight and before release mutation"

log "Verified backup of the bound production database"
BACKUP_TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M-%S)"
ssh "$SSH_HOST" "sudo env BACKUP_TIMESTAMP='$BACKUP_TIMESTAMP' EXPECTED_DB_PATH='$TARGET_DB_PATH' EXPECTED_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' EXPECTED_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' bash -s" <<'REMOTE_BACKUP'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
umask 077
set -a
source /etc/brain/.env
set +a
canonical="$(readlink -e -- "$BRAIN_DB_PATH")"
[[ "$canonical" == "$EXPECTED_DB_PATH" ]]
path_hash="$(printf '%s' "$canonical" | sha256sum | cut -d' ' -f1)"
device_inode="$(stat -Lc '%d:%i' -- "$canonical")"
[[ "$path_hash" == "$EXPECTED_DB_PATH_SHA256" && "$device_inode" == "$EXPECTED_DB_DEVICE_INODE" ]]
source_db="$canonical"
backup_dir="$(dirname -- "$source_db")/backups"
backup=""
scratch=""
stage=""
raw_backup=""
publication_dir=""
publication_file=""
backup_verified=0
cleanup_backup_attempt() {
  local status=$? cleanup_failed=0
  trap - EXIT
  trap - HUP INT TERM
  if [[ -n "$publication_file" ]] && ! rm -f -- "$publication_file"; then cleanup_failed=1; fi
  if [[ -n "$publication_dir" ]] && ! rmdir -- "$publication_dir" 2>/dev/null; then cleanup_failed=1; fi
  if [[ -n "$stage" ]]; then
    if ! fence_volatile_backup_stage_writers "$stage"; then
      cleanup_failed=1
    else
      if ! rm -f -- "$raw_backup" "${raw_backup}-wal" "${raw_backup}-shm" \
        "${raw_backup}-journal" "$scratch" "${scratch}-wal" "${scratch}-shm" \
        "${scratch}-journal" "$stage/.owner" "$stage/.deadline" \
        "$stage/.sanitized" "$stage/.writer" "$stage"/.writer.tmp.* \
        "$stage"/.sanitized.tmp.*; then cleanup_failed=1; fi
      if ! rmdir -- "$stage" 2>/dev/null; then cleanup_failed=1; fi
    fi
  fi
  if [[ -n "$backup" ]] && ! rm -f -- "${backup}-wal" "${backup}-shm" "${backup}-journal"; then cleanup_failed=1; fi
  if [[ -n "$backup" && "$backup_verified" != "1" ]]; then
    rm -f -- "$backup" || cleanup_failed=1
    if [[ -e "$backup" ]]; then
      echo "unverified backup cleanup failed" >&2
      cleanup_failed=1
    fi
  fi
  [[ "$cleanup_failed" == "0" ]] || status=1
  exit "$status"
}
trap cleanup_backup_attempt EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
# The app and trusted Recall worker share this WAL-safe backup target.
install -d -o brain -g brain-data -m 2770 "$backup_dir"
if id brain-recall >/dev/null 2>&1; then
  runuser -u brain-recall -g brain-data -- bash -c \
    'probe="$(mktemp "$1/.recall-backup-write-proof.XXXXXXXX")"; rm -f -- "$probe"' \
    _ "$backup_dir"
fi
backup_lock="$backup_dir/.backup-offsite.lock"
[[ -f "$backup_lock" && ! -L "$backup_lock" ]]
exec 9<>"$backup_lock"
flock -x 9
staging_helper="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA/verified-volatile-backup-staging.sh"
[[ -f "$staging_helper" ]]
# shellcheck disable=SC1090 -- exact attested builder helper
source "$staging_helper"
for command in find readlink stat id date rm; do
  command -v "$command" >/dev/null
done
cleanup_stale_sanitized_backup_publications "$backup_dir"
stage="$(create_verified_volatile_backup_stage \
  /run/brain-root-backup-staging "$source_db" root root immutable-backup)"
raw_backup="$stage/raw.sqlite"
scratch="$stage/restore-proof.sqlite"
backup="$backup_dir/pre-processing-${BACKUP_TIMESTAMP}.${stage##*.}.sqlite"
[[ ! -e "$backup" ]]
run_volatile_backup_stage_step "$stage" \
  sqlite3 "$source_db" ".backup '$raw_backup'"
scrub_tool="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA/scrub-notebooklm-backup.mjs"
[[ -f "$scrub_tool" ]]
scrub_runtime=/opt/brain/current
if [[ ! -f "$scrub_runtime/package.json" ]]; then
  scrub_runtime=/opt/brain
fi
[[ -f "$scrub_runtime/package.json" ]]
run_volatile_backup_stage_step "$stage" env \
  BRAIN_SCRUB_RUNTIME_ROOT="$scrub_runtime" node "$scrub_tool" --db "$raw_backup"
chmod 0600 "$raw_backup"
[[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$raw_backup" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(run_volatile_backup_stage_step "$stage" sqlite3 "$raw_backup" 'PRAGMA foreign_key_check;')" ]]
run_volatile_backup_stage_step "$stage" cp -- "$raw_backup" "$scratch"
[[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$scratch" 'PRAGMA quick_check;')" == "ok" ]]
mark_volatile_backup_stage_sanitized "$stage"
publication_dir="$(mktemp -d "$backup_dir/.backup-publication.XXXXXXXX")"
chmod 0700 "$publication_dir"
publication_file="$publication_dir/sanitized.sqlite"
run_volatile_backup_stage_step "$stage" cp -- "$raw_backup" "$publication_file"
chmod 0600 "$publication_file"
sync -f "$publication_file"
[[ "$(sqlite3 "$publication_file" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(sqlite3 "$publication_file" 'PRAGMA foreign_key_check;')" ]]
publish_volatile_backup_stage_file "$stage" ln -- "$publication_file" "$backup"
sync -f "$backup"
rm -f -- "$publication_file"
publication_file=""
rmdir -- "$publication_dir"
publication_dir=""
checksum="$(sha256sum "$backup" | cut -d' ' -f1)"
size="$(stat -c '%s' "$backup")"
backup_verified=1
printf '{"ok":true,"backup":"%s","sha256":"%s","size":%s,"sourcePathSha256":"%s","sourceDeviceInode":"%s"}\n' \
  "$backup" "$checksum" "$size" "$path_hash" "$device_inode"
REMOTE_BACKUP

if ! ssh "$SSH_HOST" "test -L /opt/brain/current"; then
  [[ -n "$KNOWN_GOOD_DIR" && -d "$KNOWN_GOOD_DIR" ]] || die "first immutable cutover requires a known-good artifact directory"
  KNOWN_LIST="$(artifact_paths "$KNOWN_GOOD_DIR")"
  KNOWN_ARTIFACT="$(printf '%s\n' "$KNOWN_LIST" | sed -n '1p')"
  KNOWN_MANIFEST="$(printf '%s\n' "$KNOWN_LIST" | sed -n '2p')"
  KNOWN_IDENTITY="$(manifest_identity "$KNOWN_MANIFEST")" || die "known-good manifest identity is invalid"
  read -r KNOWN_SHA KNOWN_BUILDER_SHA <<< "$KNOWN_IDENTITY"
  log "Install and verify attested known-good runtime before first candidate cutover"
  verify_local_artifact "$KNOWN_ARTIFACT" "$KNOWN_MANIFEST" 0 || die "known-good artifact verification failed"
  verify_provenance "$KNOWN_ARTIFACT" "$KNOWN_MANIFEST" "$KNOWN_BUILDER_SHA" \
    || die "known-good GitHub main/workflow/source provenance verification failed"
  verify_bootstrap_tools "$KNOWN_MANIFEST" || die "local bootstrap tools do not match the attested known-good artifact"
  remote_stage_artifact "$KNOWN_ARTIFACT" "$KNOWN_MANIFEST" \
    || die "known-good artifact/tool staging failed before runtime mutation"
  remote_activate "$KNOWN_ARTIFACT" "$KNOWN_MANIFEST" 1 0 \
    || die "known-good activation failed; inspect activation output and independently verify the prior system state"
fi

PREVIOUS_STATE="$(remote_release_state)" || die "current immutable release state cannot be proven"
read -r PREVIOUS_SHA PREVIOUS_TIMER_ENABLED PREVIOUS_TIMER_ACTIVE PREVIOUS_NOTEBOOKLM_TIMER_ENABLED PREVIOUS_NOTEBOOKLM_TIMER_ACTIVE PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ENABLED PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ACTIVE <<< "$PREVIOUS_STATE"
[[ "$PREVIOUS_TIMER_ENABLED" =~ ^[01]$ && "$PREVIOUS_TIMER_ACTIVE" =~ ^[01]$ &&
   "$PREVIOUS_NOTEBOOKLM_TIMER_ENABLED" =~ ^[01]$ && "$PREVIOUS_NOTEBOOKLM_TIMER_ACTIVE" =~ ^[01]$ &&
   "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ENABLED" =~ ^[01]$ && "$PREVIOUS_NOTEBOOKLM_RETENTION_TIMER_ACTIVE" =~ ^[01]$ ]] \
  || die "current timer-state proof is malformed"
remote_processing_flags_match || die "Processing feature flags changed before candidate activation"
remote_notebooklm_flags_match || die "NotebookLM feature flags changed before candidate activation"

log "Activate immutable candidate"
remote_activate "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" 0 0 \
  || rollback_and_die "candidate activation or in-transaction health check failed"
remote_health || rollback_and_die "candidate authenticated health failed"
remote_processing_flags_match || rollback_and_die "Processing feature flags changed during candidate activation"
remote_notebooklm_flags_match || rollback_and_die "NotebookLM feature flags changed during candidate activation"
remote_notebooklm_retention_ready || rollback_and_die "independent NotebookLM retention writer or timer was not ready after candidate activation"
remote_notebooklm_operations_ready || rollback_and_die "NotebookLM operational gate or timer was not ready after candidate activation"
remote_backup_tools_ready || rollback_and_die "durable off-site backup privacy tools or six-hour cron were not verified"
remote_recall_backup_privacy_ready || rollback_and_die "durable Recall backup/restore privacy tools were not verified"

log "Durable data-path and startup-write proof"
if ! ssh "$SSH_HOST" "sudo env EXPECTED_DB_PATH='$TARGET_DB_PATH' EXPECTED_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' EXPECTED_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' bash -s" <<'REMOTE_DURABLE_PATHS'
set -euo pipefail
set -a
source /etc/brain/.env
source /etc/brain/release.env
set +a
canonical="$(readlink -e -- "$BRAIN_DB_PATH")"
[[ "$canonical" == "$EXPECTED_DB_PATH" ]]
[[ "$(printf '%s' "$canonical" | sha256sum | cut -d' ' -f1)" == "$EXPECTED_DB_PATH_SHA256" ]]
[[ "$(stat -Lc '%d:%i' -- "$canonical")" == "$EXPECTED_DB_DEVICE_INODE" ]]
data_root="$(dirname -- "$canonical")"
[[ "$data_root" != /opt/brain/releases && "$data_root" != /opt/brain/releases/* ]]
runuser -u brain -g brain-data -- bash -c 'probe="$(mktemp "$1/.release-write-proof.XXXXXXXX")"; rm -f -- "$probe"' _ "$data_root"
runtime="$(readlink -f /opt/brain/current)"
[[ "$runtime" =~ ^/opt/brain/releases/[a-f0-9]{40}(-[a-f0-9]{40})?/runtime$ ]]
[[ ! -e "$runtime/data" ]]
backup=""
for ((attempt = 1; attempt <= 45; attempt += 1)); do
  backup="$(find "$data_root/backups" -maxdepth 1 -type f -name '*.sqlite' -newer /etc/brain/release.env -print -quit 2>/dev/null || true)"
  [[ -n "$backup" ]] && break
  sleep 1
done
[[ -n "$backup" ]]
since_epoch="$(stat -c '%Y' /etc/brain/release.env)"
journal="$(journalctl -u brain --since "@$since_epoch" --no-pager)"
[[ "$journal" != *"$runtime/data"* ]]
printf '{"ok":true,"dataRootBound":true,"runtimeDataAbsent":true,"startupBackup":true}\n'
REMOTE_DURABLE_PATHS
then
  rollback_and_die "durable data-path or startup-write proof failed"
fi

log "Processing migration and deep readiness audit"
if ! ssh "$SSH_HOST" "sudo env EXPECTED_DB_PATH='$TARGET_DB_PATH' EXPECTED_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' EXPECTED_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' EXPECTED_PROCESSING_FLAG_SNAPSHOT='$TARGET_PROCESSING_FLAG_SNAPSHOT' EXPECTED_NOTEBOOKLM_FLAG_SNAPSHOT='$TARGET_NOTEBOOKLM_FLAG_SNAPSHOT' EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY='$NOTEBOOKLM_REMEDIATION_POLICY' EXPECTED_PROVIDER_WRITE_BLOCKED='$TARGET_PROVIDER_WRITE_BLOCKED' bash -s" <<'REMOTE_AUDIT'
set -euo pipefail
set -a
source /etc/brain/.env
source /etc/brain/release.env
set +a
canonical="$(readlink -e -- "$BRAIN_DB_PATH")"
[[ "$canonical" == "$EXPECTED_DB_PATH" ]]
[[ "$(printf '%s' "$canonical" | sha256sum | cut -d' ' -f1)" == "$EXPECTED_DB_PATH_SHA256" ]]
[[ "$(stat -Lc '%d:%i' -- "$canonical")" == "$EXPECTED_DB_DEVICE_INODE" ]]
for key in PROCESSING_READ_ENABLED PROCESSING_WRITE_ENABLED PROCESSING_NAV_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]]
  printf -v "$key" '%s' "$value"
done
[[ "$PROCESSING_READ_ENABLED:$PROCESSING_WRITE_ENABLED:$PROCESSING_NAV_ENABLED" == "$EXPECTED_PROCESSING_FLAG_SNAPSHOT" ]]
for key in BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED; do
  value="${!key:-0}"
  [[ "$value" =~ ^[01]$ ]]
  printf -v "$key" '%s' "$value"
done
notebooklm_snapshot="$BRAIN_NOTEBOOKLM_EXPORT_UI_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_QUEUE_ENABLED:$BRAIN_NOTEBOOKLM_EXPORT_PROVIDER_WRITE_ENABLED"
case "$notebooklm_snapshot" in
  0:0:0|1:0:0|1:1:0|1:1:1) ;;
  *) exit 1;;
esac
[[ "$notebooklm_snapshot" == "$EXPECTED_NOTEBOOKLM_FLAG_SNAPSHOT" ]]
export BRAIN_DB_PATH="$canonical"
cd /opt/brain/current
node scripts/dist/processing-readiness-prod.mjs audit --require-ready --require-production-config
actual_provider_write_blocked="$(sqlite3 "$BRAIN_DB_PATH" 'SELECT provider_write_blocked FROM notebooklm_runtime_control WHERE id=1;')"
[[ "$actual_provider_write_blocked" == "$EXPECTED_PROVIDER_WRITE_BLOCKED" ]]
if [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "preserve_existing_provider_block" ]]; then
  [[ "$EXPECTED_PROVIDER_WRITE_BLOCKED" == "1" ]]
  node scripts/check-notebooklm-operations.mjs --require-ready --allow-existing-provider-block
else
  [[ "$EXPECTED_NOTEBOOKLM_REMEDIATION_POLICY" == "strict" && "$EXPECTED_PROVIDER_WRITE_BLOCKED" == "0" ]]
  node scripts/check-notebooklm-operations.mjs --require-ready
fi
systemctl is-enabled --quiet brain-processing-audit.timer
systemctl is-active --quiet brain-processing-audit.timer
systemctl is-enabled --quiet brain-notebooklm-operations.timer
systemctl is-active --quiet brain-notebooklm-operations.timer
systemctl is-enabled --quiet brain-notebooklm-retention.timer
systemctl is-active --quiet brain-notebooklm-retention.timer
REMOTE_AUDIT
then
  rollback_and_die "processing readiness or timer verification failed"
fi

log "External boundary checks"
remote_health || rollback_and_die "final authenticated health failed"
remote_processing_flags_match || rollback_and_die "Processing feature flags changed before final release verification"
remote_notebooklm_flags_match || rollback_and_die "NotebookLM feature flags changed before final release verification"
remote_notebooklm_retention_ready || rollback_and_die "independent NotebookLM retention writer or timer failed before final release verification"
remote_notebooklm_operations_ready || rollback_and_die "NotebookLM operational gate or timer failed before final release verification"
remote_backup_tools_ready || rollback_and_die "durable off-site backup privacy tools changed before final release verification"
status="$(curl --silent --show-error --connect-timeout 2 --max-time 10 --output /dev/null --write-out '%{http_code}' --request POST "${BASE_URL%/}/api/telegram/webhook")"
[[ "$status" == "401" ]] || rollback_and_die "telegram webhook boundary returned $status, expected 401"
promote_release_tools || rollback_and_die "release-tool promotion failed"
printf '{"ok":true,"appSha":"%s","builderSha":"%s","processingFlagPolicy":"%s","processingFlags":"%s","notebookLmFlagPolicy":"%s","notebookLmFlags":"%s","notebookLmRemediationPolicy":"%s","providerWriteBlockPreserved":%s,"notebookLmOperationalGate":"ready","notebookLmTimer":"enabled_active","notebookLmRetentionWorker":"executed_immutable","notebookLmRetentionTimer":"enabled_active","backupSnapshotPolicy":"content_scrubbed","health":200,"dbPathSha256":"%s","dbDeviceInode":"%s"}\n' \
  "$CANDIDATE_SHA" "$CANDIDATE_BUILDER_SHA" "$PROCESSING_FLAG_POLICY" "$TARGET_PROCESSING_FLAG_SNAPSHOT" "$NOTEBOOKLM_FLAG_POLICY" "$TARGET_NOTEBOOKLM_FLAG_SNAPSHOT" "$NOTEBOOKLM_REMEDIATION_POLICY" "$TARGET_PROVIDER_WRITE_BLOCKED" \
  "$TARGET_DB_PATH_SHA256" "$TARGET_DB_DEVICE_INODE"
