#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${1:-}"
KNOWN_GOOD_DIR="${2:-}"
SSH_HOST="${BRAIN_SSH_HOST:-brain}"
BASE_URL="${BRAIN_BASE_URL:-https://brain.arunp.in}"
PROVENANCE_REPO="arunpr614/ai-brain"
PROVENANCE_HOST="github.com"
PROVENANCE_WORKFLOW="${PROVENANCE_REPO}/.github/workflows/product-ci.yml"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

die() { echo "[deploy-immutable] $*" >&2; exit 1; }
log() { printf '\n=== %s ===\n' "$1"; }
[[ -d "$ARTIFACT_DIR" ]] || die "usage: deploy-immutable-release.sh <candidate-artifact-dir> [known-good-artifact-dir]"
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
for (const name of ["activate-release.sh", "switch-release.sh", "verify-release-runtime.mjs", "wait-for-release-health.mjs"]) {
  const releasePath = `scripts/${name}`;
  const entry = expected.get(releasePath);
  const localPath = path.resolve(scripts, name);
  if (!entry || entry.kind !== "file" || !fs.statSync(localPath).isFile()) process.exit(1);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(localPath)).digest("hex");
  if (actual !== entry.sha256) process.exit(1);
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
    "$SCRIPT_DIR/activate-release.sh" "$SCRIPT_DIR/switch-release.sh" "$SCRIPT_DIR/verify-release-runtime.mjs" \
    "$SCRIPT_DIR/wait-for-release-health.mjs" \
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
for (const name of ["activate-release.sh", "switch-release.sh", "verify-release-runtime.mjs", "wait-for-release-health.mjs"]) {
  const entry = expected.get(`scripts/${name}`);
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
  local artifact="$1" manifest="$2" skip_timer="$3" allow_025="$4"
  local identity sha builder_sha release_id artifact_name manifest_name incoming
  identity="$(manifest_identity "$manifest")" || return 1
  read -r sha builder_sha <<< "$identity"
  release_id="$(release_instance_id "$manifest")" || return 1
  artifact_name="brain-release-${sha:0:12}.tar.gz"
  manifest_name="${artifact_name}.manifest.json"
  incoming="/opt/brain/release-incoming/$release_id"
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
    remote_switch "$release_id" "$retry_timer_enabled" "$retry_timer_active" "$allow_025"
    return
  fi
  ssh "$SSH_HOST" "sudo env RELEASE_SHA='$sha' RELEASE_INSTANCE_ID='$release_id' TOOL_BUILDER_SHA='$builder_sha' BRAIN_DB_PATH='$TARGET_DB_PATH' BRAIN_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' BRAIN_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' BRAIN_SKIP_PROCESSING_AUDIT_TIMER='$skip_timer' BRAIN_ALLOW_SCHEMA_025_ROLLBACK='$allow_025' BRAIN_ACTIVATION_HEALTH_URL='${BASE_URL%/}/api/health' bash -s" <<'REMOTE_ACTIVATE'
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
  flock -n /run/brain-recall/recall-sync.lock bash "$tool_set/activate-release.sh" \
  "$incoming/$artifact_name" "$incoming/$manifest_name"
REMOTE_ACTIVATE
}

remote_switch() {
  local release_id="$1" timer_enabled="$2" timer_active="$3" allow_025="$4"
  [[ "$release_id" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ && "$timer_enabled" =~ ^[01]$ && "$timer_active" =~ ^[01]$ ]] || return 1
  ssh "$SSH_HOST" "sudo env RELEASE_INSTANCE_ID='$release_id' TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' BRAIN_DB_PATH='$TARGET_DB_PATH' BRAIN_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' BRAIN_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' BRAIN_ALLOW_SCHEMA_025_ROLLBACK='$allow_025' BRAIN_TARGET_TIMER_ENABLED='$timer_enabled' BRAIN_TARGET_TIMER_ACTIVE='$timer_active' BRAIN_ACTIVATION_HEALTH_URL='${BASE_URL%/}/api/health' bash -s" <<'REMOTE_SWITCH'
set -euo pipefail
[[ "$RELEASE_INSTANCE_ID" =~ ^[a-f0-9]{40}(-[a-f0-9]{40})?$ ]]
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tool_set="/opt/brain/release-tools/sets/$TOOL_BUILDER_SHA"
exec env BRAIN_RELEASE_VERIFY_TOOL="$tool_set/verify-release-runtime.mjs" \
  BRAIN_RELEASE_HEALTH_TOOL="$tool_set/wait-for-release-health.mjs" \
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
printf '%s %s %s\n' "$release_id" "$enabled" "$active"
REMOTE_STATE
}

promote_release_tools() {
  ssh "$SSH_HOST" "sudo env TOOL_BUILDER_SHA='$CANDIDATE_BUILDER_SHA' flock -x /run/brain-release-tools.lock bash -s" <<'REMOTE_PROMOTE'
set -euo pipefail
[[ "$TOOL_BUILDER_SHA" =~ ^[a-f0-9]{40}$ ]]
tools_root=/opt/brain/release-tools
tool_set="$tools_root/sets/$TOOL_BUILDER_SHA"
for name in activate-release.sh switch-release.sh verify-release-runtime.mjs wait-for-release-health.mjs; do
  [[ -f "$tool_set/$name" ]]
done
current_tmp="$tools_root/.current-${TOOL_BUILDER_SHA}.$$.tmp"
ln -s -- "$tool_set" "$current_tmp"
mv -Tf -- "$current_tmp" "$tools_root/current"
[[ "$(readlink -f "$tools_root/current")" == "$tool_set" ]]
REMOTE_PROMOTE
}

rollback_and_die() {
  local reason="$1" current_state current_release current_enabled current_active
  if current_state="$(remote_release_state 2>/dev/null)"; then
    read -r current_release current_enabled current_active <<< "$current_state"
    if [[ "$current_release" == "$PREVIOUS_SHA" && "$current_enabled" == "$PREVIOUS_TIMER_ENABLED" && "$current_active" == "$PREVIOUS_TIMER_ACTIVE" ]] \
      && remote_health; then
      die "$reason; previous release remained active and health-verified"
    fi
  fi
  echo "[deploy-immutable] $reason; rolling back to $PREVIOUS_SHA" >&2
  if remote_switch "$PREVIOUS_SHA" "$PREVIOUS_TIMER_ENABLED" "$PREVIOUS_TIMER_ACTIVE" 1 && remote_health; then
    die "$reason; previous release restored and health-verified"
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

log "Remote preflight, canonical database identity, and dark flags"
REMOTE_DB_INFO="$(ssh "$SSH_HOST" "sudo env EXPECTED_PUBLIC_ORIGIN='$BASE_URL' bash -s" <<'REMOTE_DB'
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
  [[ "${!key:-0}" != "1" ]] || { echo "$key is enabled" >&2; exit 1; }
done
printf '%s %s %s\n' "$canonical" "$path_hash" "$device_inode"
REMOTE_DB
)" || die "remote runtime, environment, database identity, or dark-flag preflight failed"
read -r TARGET_DB_PATH TARGET_DB_PATH_SHA256 TARGET_DB_DEVICE_INODE <<< "$REMOTE_DB_INFO"
[[ "$TARGET_DB_PATH" =~ ^/[A-Za-z0-9._/-]+$ && "$TARGET_DB_PATH_SHA256" =~ ^[a-f0-9]{64}$ && "$TARGET_DB_DEVICE_INODE" =~ ^[0-9]+:[0-9]+$ ]] \
  || die "remote database identity proof is malformed"
ssh "$SSH_HOST" "test \$(df -Pk /opt/brain | awk 'NR==2{print \$4}') -gt 2097152" \
  || die "remote release store requires at least 2 GiB free"

log "Verified backup of the bound production database"
BACKUP_TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M-%S)"
ssh "$SSH_HOST" "sudo env BACKUP_TIMESTAMP='$BACKUP_TIMESTAMP' EXPECTED_DB_PATH='$TARGET_DB_PATH' EXPECTED_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' EXPECTED_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' bash -s" <<'REMOTE_BACKUP'
set -euo pipefail
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
backup="$backup_dir/pre-processing-${BACKUP_TIMESTAMP}.sqlite"
scratch="$(mktemp "$(dirname -- "$source_db")/.restore-proof.XXXXXXXX.sqlite")"
trap 'rm -f -- "$scratch"' EXIT
install -d -m 0700 "$backup_dir"
sqlite3 "$source_db" ".backup '$backup'"
chmod 0600 "$backup"
[[ "$(sqlite3 "$backup" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(sqlite3 "$backup" 'PRAGMA foreign_key_check;')" ]]
cp -- "$backup" "$scratch"
[[ "$(sqlite3 "$scratch" 'PRAGMA quick_check;')" == "ok" ]]
checksum="$(sha256sum "$backup" | cut -d' ' -f1)"
size="$(stat -c '%s' "$backup")"
printf '{"ok":true,"backup":"%s","sha256":"%s","size":%s,"sourcePathSha256":"%s","sourceDeviceInode":"%s"}\n' \
  "$backup" "$checksum" "$size" "$path_hash" "$device_inode"
REMOTE_BACKUP

log "Stage attested candidate runtime and exact builder tool set"
remote_stage_artifact "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" \
  || die "candidate artifact/tool staging failed before runtime mutation"

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
read -r PREVIOUS_SHA PREVIOUS_TIMER_ENABLED PREVIOUS_TIMER_ACTIVE <<< "$PREVIOUS_STATE"

log "Activate immutable candidate"
remote_activate "$CANDIDATE_ARTIFACT" "$CANDIDATE_MANIFEST" 0 0 \
  || rollback_and_die "candidate activation or in-transaction health check failed"
remote_health || rollback_and_die "candidate authenticated health failed"

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
if ! ssh "$SSH_HOST" "sudo env EXPECTED_DB_PATH='$TARGET_DB_PATH' EXPECTED_DB_PATH_SHA256='$TARGET_DB_PATH_SHA256' EXPECTED_DB_DEVICE_INODE='$TARGET_DB_DEVICE_INODE' bash -s" <<'REMOTE_AUDIT'
set -euo pipefail
set -a
source /etc/brain/.env
source /etc/brain/release.env
set +a
canonical="$(readlink -e -- "$BRAIN_DB_PATH")"
[[ "$canonical" == "$EXPECTED_DB_PATH" ]]
[[ "$(printf '%s' "$canonical" | sha256sum | cut -d' ' -f1)" == "$EXPECTED_DB_PATH_SHA256" ]]
[[ "$(stat -Lc '%d:%i' -- "$canonical")" == "$EXPECTED_DB_DEVICE_INODE" ]]
export BRAIN_DB_PATH="$canonical"
cd /opt/brain/current
node scripts/dist/processing-readiness-prod.mjs audit --require-ready --require-production-config
systemctl is-enabled --quiet brain-processing-audit.timer
systemctl is-active --quiet brain-processing-audit.timer
REMOTE_AUDIT
then
  rollback_and_die "processing readiness or timer verification failed"
fi

log "External boundary checks"
remote_health || rollback_and_die "final authenticated health failed"
status="$(curl --silent --show-error --connect-timeout 2 --max-time 10 --output /dev/null --write-out '%{http_code}' --request POST "${BASE_URL%/}/api/telegram/webhook")"
[[ "$status" == "401" ]] || rollback_and_die "telegram webhook boundary returned $status, expected 401"
promote_release_tools || rollback_and_die "release-tool promotion failed"
printf '{"ok":true,"appSha":"%s","builderSha":"%s","flags":"dark","health":200,"dbPathSha256":"%s","dbDeviceInode":"%s"}\n' \
  "$CANDIDATE_SHA" "$CANDIDATE_BUILDER_SHA" "$TARGET_DB_PATH_SHA256" "$TARGET_DB_DEVICE_INODE"
