#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_ID="${1:-}"
RELEASE_ROOT="${BRAIN_RELEASE_ROOT:-/opt/brain/releases}"
CURRENT_LINK="${BRAIN_CURRENT_LINK:-/opt/brain/current}"
VERIFY_TOOL="${BRAIN_RELEASE_VERIFY_TOOL:-/opt/brain/release-tools/current/verify-release-runtime.mjs}"
HEALTH_TOOL="${BRAIN_RELEASE_HEALTH_TOOL:-/opt/brain/release-tools/current/wait-for-release-health.mjs}"
ENV_FILE="${BRAIN_ENV_FILE:-/etc/brain/.env}"
STATE_DIR=""
MUTATED=0
ACTIVATION_API_TOKEN=""

die() { echo "[switch-release] $*" >&2; exit 1; }
cleanup() { [[ -z "$STATE_DIR" ]] || rm -rf -- "$STATE_DIR"; }
sha256_text() { printf '%s' "$1" | sha256sum | cut -d' ' -f1; }

load_db_identity() {
  if [[ -z "${BRAIN_DB_PATH:-}" ]]; then
    [[ -f "$ENV_FILE" ]] || die "environment file not found: $ENV_FILE"
    set -a
    # shellcheck disable=SC1090 -- root-owned production EnvironmentFile
    source "$ENV_FILE"
    set +a
  fi
  [[ "${BRAIN_DB_PATH:-}" =~ ^/[A-Za-z0-9._/-]+$ ]] || die "BRAIN_DB_PATH must be a sanitized absolute path"
  local canonical
  canonical="$(readlink -e -- "$BRAIN_DB_PATH")" || die "BRAIN_DB_PATH does not exist"
  [[ "$canonical" == "$BRAIN_DB_PATH" ]] || die "BRAIN_DB_PATH must already be canonical"
  [[ -f "$canonical" && ! -L "$canonical" ]] || die "BRAIN_DB_PATH must be a regular non-symlink file"
  BRAIN_DB_PATH_SHA256_ACTUAL="$(sha256_text "$canonical")"
  BRAIN_DB_DEVICE_INODE_ACTUAL="$(stat -Lc '%d:%i' -- "$canonical")"
  [[ -z "${BRAIN_DB_PATH_SHA256:-}" || "$BRAIN_DB_PATH_SHA256" == "$BRAIN_DB_PATH_SHA256_ACTUAL" ]] \
    || die "BRAIN_DB_PATH path-hash proof changed"
  [[ -z "${BRAIN_DB_DEVICE_INODE:-}" || "$BRAIN_DB_DEVICE_INODE" == "$BRAIN_DB_DEVICE_INODE_ACTUAL" ]] \
    || die "BRAIN_DB_PATH device/inode proof changed"
  BRAIN_DB_PATH="$canonical"
  export BRAIN_DB_PATH
}

snapshot_file() {
  local path="$1" key="$2"
  if [[ -e "$path" || -L "$path" ]]; then
    cp -a -- "$path" "$STATE_DIR/$key"
    : > "$STATE_DIR/$key.present"
  fi
}

restore_file() {
  local path="$1" key="$2"
  if [[ -f "$STATE_DIR/$key.present" ]]; then
    cp -a -- "$STATE_DIR/$key" "$path" || return 1
  else
    rm -f -- "$path" || return 1
  fi
}

timer_enabled() { systemctl is-enabled --quiet brain-processing-audit.timer 2>/dev/null && printf '1' || printf '0'; }
timer_active() { systemctl is-active --quiet brain-processing-audit.timer 2>/dev/null && printf '1' || printf '0'; }

snapshot_system_state() {
  STATE_DIR="$(mktemp -d /run/brain-release-state.XXXXXXXX)"
  chmod 0700 "$STATE_DIR"
  if [[ -e "$CURRENT_LINK" && ! -L "$CURRENT_LINK" ]]; then
    die "current release path exists but is not a symlink"
  fi
  if [[ -L "$CURRENT_LINK" ]]; then readlink -- "$CURRENT_LINK" > "$STATE_DIR/current-link"; fi
  snapshot_file /etc/brain/release.env release.env
  snapshot_file /etc/systemd/system/brain.service brain.service
  snapshot_file /etc/systemd/system/brain-processing-audit.service brain-processing-audit.service
  snapshot_file /etc/systemd/system/brain-processing-audit.timer brain-processing-audit.timer
  timer_enabled > "$STATE_DIR/timer-enabled"
  timer_active > "$STATE_DIR/timer-active"
}

restore_previous_state() {
  local failed=0 prior_target
  systemctl stop brain-processing-audit.timer >/dev/null 2>&1 || true
  if [[ -s "$STATE_DIR/current-link" ]]; then
    prior_target="$(<"$STATE_DIR/current-link")"
    ln -s -- "$prior_target" "${CURRENT_LINK}.rollback" || failed=1
    mv -Tf -- "${CURRENT_LINK}.rollback" "$CURRENT_LINK" || failed=1
  else
    rm -f -- "$CURRENT_LINK" || failed=1
  fi
  restore_file /etc/brain/release.env release.env || failed=1
  restore_file /etc/systemd/system/brain.service brain.service || failed=1
  restore_file /etc/systemd/system/brain-processing-audit.service brain-processing-audit.service || failed=1
  restore_file /etc/systemd/system/brain-processing-audit.timer brain-processing-audit.timer || failed=1
  systemctl daemon-reload || failed=1
  if [[ "$(<"$STATE_DIR/timer-enabled")" == "1" ]]; then
    systemctl enable brain-processing-audit.timer >/dev/null 2>&1 || failed=1
  else
    systemctl disable brain-processing-audit.timer >/dev/null 2>&1 || true
  fi
  systemctl restart brain || failed=1
  if [[ "$(<"$STATE_DIR/timer-active")" == "1" ]]; then
    systemctl start brain-processing-audit.timer || failed=1
  else
    systemctl stop brain-processing-audit.timer >/dev/null 2>&1 || true
  fi
  return "$failed"
}

on_error() {
  local status=$?
  trap - ERR
  if [[ "$MUTATED" == "1" ]]; then
    restore_previous_state || echo "[switch-release] automatic state restoration was incomplete" >&2
  fi
  cleanup
  exit "$status"
}

write_release_env() {
  install -d -m 0755 /etc/brain
  local temporary
  temporary="$(mktemp /etc/brain/.release.env.XXXXXXXX)"
  if [[ -f /etc/brain/release.env ]]; then
    grep -Ev '^(BRAIN_APP_SHA|BRAIN_BUILDER_SHA|BRAIN_RELEASE_ID)=' /etc/brain/release.env > "$temporary" || true
  fi
  printf 'BRAIN_APP_SHA=%s\n' "$APP_SHA" >> "$temporary"
  printf 'BRAIN_BUILDER_SHA=%s\n' "$BUILDER_SHA" >> "$temporary"
  printf 'BRAIN_RELEASE_ID=%s\n' "$RELEASE_ID" >> "$temporary"
  chmod 0644 "$temporary"
  chown root:root "$temporary"
  mv -f -- "$temporary" /etc/brain/release.env
}

[[ "$RELEASE_ID" =~ ^[a-fA-F0-9]{40}(-[a-fA-F0-9]{40})?$ ]] \
  || die "usage: switch-release.sh <installed-release-id>"
RELEASE_ID="${RELEASE_ID,,}"
APP_SHA="${RELEASE_ID:0:40}"
[[ "$(id -u)" == "0" ]] || die "must run as root"
for command in node flock readlink stat sha256sum; do command -v "$command" >/dev/null || die "$command is required"; done
[[ -f "$VERIFY_TOOL" ]] || die "release verifier not installed: $VERIFY_TOOL"
exec 9>/run/brain-release.lock
flock -n 9 || die "another release activation is running"
load_db_identity
if [[ -n "${BRAIN_ACTIVATION_HEALTH_URL:-}" ]]; then
  node -e 'const u=new URL(process.argv[1]); if(u.protocol!=="https:"||u.username||u.password)process.exit(1)' \
    "$BRAIN_ACTIVATION_HEALTH_URL" || die "activation health URL must be HTTPS without credentials"
  [[ -f "$HEALTH_TOOL" ]] || die "release health verifier is not installed: $HEALTH_TOOL"
  VERIFIED_DB_PATH="$BRAIN_DB_PATH"
  set -a
  # shellcheck disable=SC1090 -- root-owned production EnvironmentFile
  source "$ENV_FILE"
  set +a
  ACTIVATION_API_TOKEN="${BRAIN_API_TOKEN:-}"
  [[ -n "$ACTIVATION_API_TOKEN" ]] || die "BRAIN_API_TOKEN is required for switch health verification"
  BRAIN_DB_PATH="$VERIFIED_DB_PATH"
  export BRAIN_DB_PATH
fi

FINAL="$RELEASE_ROOT/$RELEASE_ID"
RUNTIME="$FINAL/runtime"
ARTIFACT_NAME="brain-release-${APP_SHA:0:12}.tar.gz"
MANIFEST_NAME="${ARTIFACT_NAME}.manifest.json"
MANIFEST="$FINAL/evidence/$MANIFEST_NAME"
ARTIFACT="$FINAL/evidence/$ARTIFACT_NAME"
[[ -d "$RUNTIME" && -f "$MANIFEST" && -f "$ARTIFACT" ]] || die "installed immutable release evidence is incomplete"
BUILDER_SHA="$(node - "$MANIFEST" "$RELEASE_ID" <<'NODE'
const manifest = require(process.argv[2]);
const releaseId = process.argv[3];
if (!/^[a-f0-9]{40}$/i.test(manifest.appSha || "") || !/^[a-f0-9]{40}$/i.test(manifest.builderSha || "")) process.exit(1);
const appSha = manifest.appSha.toLowerCase();
const builderSha = manifest.builderSha.toLowerCase();
const expected = appSha === builderSha ? appSha : `${appSha}-${builderSha}`;
if (releaseId !== expected) process.exit(1);
process.stdout.write(builderSha);
NODE
)" || die "installed release ID does not match manifest application/builder identity"
node "$VERIFY_TOOL" "$RUNTIME" "$MANIFEST" "$ARTIFACT"

node - "$RUNTIME" "$MANIFEST" "$BRAIN_DB_PATH" "${BRAIN_ALLOW_SCHEMA_025_ROLLBACK:-0}" <<'NODE' \
  || die "runtime/native/migration compatibility check failed"
const runtime = process.argv[2];
const manifest = require(process.argv[3]);
const dbPath = process.argv[4];
const allowSchema025Rollback = process.argv[5] === "1";
const Database = require(`${runtime}/node_modules/better-sqlite3`);
const sqliteVec = require(`${runtime}/node_modules/sqlite-vec`);
const memory = new Database(":memory:");
sqliteVec.load(memory);
memory.close();
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const applied = db.prepare("SELECT * FROM _migrations ORDER BY name").all();
const columns = new Set(db.prepare("PRAGMA table_info(_migrations)").all().map((row) => row.name));
db.close();
const packaged = new Map(manifest.migrations.files.map((entry) => [entry.name, entry.sha256]));
const unknown = applied.map((row) => row.name).filter((name) => !packaged.has(name));
const hashColumn = ["sha256", "migration_sha256", "content_sha256"].find((name) => columns.has(name));
const mismatched = hashColumn ? applied.filter((row) =>
  packaged.has(row.name) && row[hashColumn] !== packaged.get(row.name))
  .map((row) => row.name) : [];
if (mismatched.length > 0) {
  console.error(JSON.stringify({ ok: false, code: "migration_hash_mismatch", mismatched }));
  process.exit(1);
}
if (unknown.length === 0) process.exit(0);
if (allowSchema025Rollback && unknown.length === 1 && unknown[0] === "025_item_workflow.sql") process.exit(0);
console.error(JSON.stringify({ ok: false, code: "migration_incompatible", unknown }));
process.exit(1);
NODE

snapshot_system_state
TARGET_TIMER_ENABLED="${BRAIN_TARGET_TIMER_ENABLED:-$(<"$STATE_DIR/timer-enabled")}"
TARGET_TIMER_ACTIVE="${BRAIN_TARGET_TIMER_ACTIVE:-$(<"$STATE_DIR/timer-active")}"
[[ "$TARGET_TIMER_ENABLED" =~ ^[01]$ && "$TARGET_TIMER_ACTIVE" =~ ^[01]$ ]] || die "target timer state must be 0 or 1"
PREVIOUS="$(readlink -f -- "$CURRENT_LINK" 2>/dev/null || true)"
trap on_error ERR
MUTATED=1
ln -s -- "$RUNTIME" "${CURRENT_LINK}.next"
mv -Tf -- "${CURRENT_LINK}.next" "$CURRENT_LINK"
write_release_env
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain.service" /etc/systemd/system/brain.service
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain-processing-audit.service" /etc/systemd/system/brain-processing-audit.service
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain-processing-audit.timer" /etc/systemd/system/brain-processing-audit.timer
systemctl daemon-reload
systemctl restart brain
if [[ "$TARGET_TIMER_ENABLED" == "1" ]]; then
  systemctl enable brain-processing-audit.timer
else
  systemctl disable brain-processing-audit.timer >/dev/null 2>&1 || true
fi
if [[ "$TARGET_TIMER_ACTIVE" == "1" ]]; then
  systemctl start brain-processing-audit.timer
else
  systemctl stop brain-processing-audit.timer >/dev/null 2>&1 || true
fi
if [[ -n "${BRAIN_ACTIVATION_HEALTH_URL:-}" ]]; then
  BRAIN_RELEASE_HEALTH_TOKEN="$ACTIVATION_API_TOKEN" node "$HEALTH_TOOL" "$BRAIN_ACTIVATION_HEALTH_URL" 45000
fi
MUTATED=0
trap - ERR
cleanup
printf '{"ok":true,"appSha":"%s","builderSha":"%s","releaseId":"%s","previous":"%s","current":"%s","dbPathSha256":"%s","dbDeviceInode":"%s","timerEnabled":%s,"timerActive":%s}\n' \
  "$APP_SHA" "$BUILDER_SHA" "$RELEASE_ID" "$PREVIOUS" "$RUNTIME" "$BRAIN_DB_PATH_SHA256_ACTUAL" "$BRAIN_DB_DEVICE_INODE_ACTUAL" \
  "$TARGET_TIMER_ENABLED" "$TARGET_TIMER_ACTIVE"
