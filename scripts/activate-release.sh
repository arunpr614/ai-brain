#!/usr/bin/env bash
set -Eeuo pipefail

ARTIFACT="${1:-}"
MANIFEST="${2:-}"
RELEASE_ROOT="${BRAIN_RELEASE_ROOT:-/opt/brain/releases}"
CURRENT_LINK="${BRAIN_CURRENT_LINK:-/opt/brain/current}"
VERIFY_TOOL="${BRAIN_RELEASE_VERIFY_TOOL:-/opt/brain/release-tools/current/verify-release-runtime.mjs}"
ENV_FILE="${BRAIN_ENV_FILE:-/etc/brain/.env}"
MAX_EXPANDED_BYTES="${BRAIN_RELEASE_MAX_EXPANDED_BYTES:-2147483648}"
MAX_ARCHIVE_FILES="${BRAIN_RELEASE_MAX_FILES:-250000}"
STATE_DIR=""
STAGING=""
MUTATED=0
ACTIVATION_API_TOKEN=""

die() {
  echo "[activate-release] $*" >&2
  exit 1
}

cleanup() {
  [[ -z "$STAGING" ]] || rm -rf -- "$STAGING"
  [[ -z "$STATE_DIR" ]] || rm -rf -- "$STATE_DIR"
}

sha256_text() {
  printf '%s' "$1" | sha256sum | cut -d' ' -f1
}

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

timer_enabled() {
  systemctl is-enabled --quiet brain-processing-audit.timer 2>/dev/null && printf '1' || printf '0'
}

timer_active() {
  systemctl is-active --quiet brain-processing-audit.timer 2>/dev/null && printf '1' || printf '0'
}

snapshot_system_state() {
  STATE_DIR="$(mktemp -d /run/brain-release-state.XXXXXXXX)"
  chmod 0700 "$STATE_DIR"
  if [[ -e "$CURRENT_LINK" && ! -L "$CURRENT_LINK" ]]; then
    die "current release path exists but is not a symlink"
  fi
  if [[ -L "$CURRENT_LINK" ]]; then
    readlink -- "$CURRENT_LINK" > "$STATE_DIR/current-link"
  fi
  snapshot_file /etc/brain/release.env release.env
  snapshot_file /etc/systemd/system/brain.service brain.service
  snapshot_file /etc/systemd/system/brain-processing-audit.service brain-processing-audit.service
  snapshot_file /etc/systemd/system/brain-processing-audit.timer brain-processing-audit.timer
  timer_enabled > "$STATE_DIR/timer-enabled"
  timer_active > "$STATE_DIR/timer-active"
}

restore_previous_state() {
  local failed=0
  systemctl stop brain-processing-audit.timer >/dev/null 2>&1 || true
  if [[ -s "$STATE_DIR/current-link" ]]; then
    local prior_target
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
    restore_previous_state || echo "[activate-release] automatic state restoration was incomplete" >&2
  fi
  cleanup
  exit "$status"
}

write_release_env() {
  install -d -m 0755 /etc/brain
  local temporary
  temporary="$(mktemp /etc/brain/.release.env.XXXXXXXX)"
  if [[ -f /etc/brain/release.env ]]; then
    grep -Ev '^BRAIN_APP_SHA=' /etc/brain/release.env > "$temporary" || true
  fi
  printf 'BRAIN_APP_SHA=%s\n' "$APP_SHA" >> "$temporary"
  chmod 0644 "$temporary"
  chown root:root "$temporary"
  mv -f -- "$temporary" /etc/brain/release.env
}

[[ -n "$ARTIFACT" && -n "$MANIFEST" ]] || die "usage: activate-release.sh <artifact.tar.gz> <artifact.manifest.json>"
[[ -f "$ARTIFACT" && -f "$MANIFEST" ]] || die "artifact or manifest not found"
[[ "$(id -u)" == "0" ]] || die "must run as root"
for command in node tar flock runuser readlink stat sha256sum awk; do
  command -v "$command" >/dev/null || die "$command is required"
done
[[ -f "$VERIFY_TOOL" ]] || die "release verifier not installed: $VERIFY_TOOL"
[[ "$MAX_EXPANDED_BYTES" =~ ^[1-9][0-9]*$ && "$MAX_ARCHIVE_FILES" =~ ^[1-9][0-9]*$ ]] \
  || die "archive limits must be positive integers"

exec 9>/run/brain-release.lock
flock -n 9 || die "another release activation is running"
load_db_identity
if [[ -n "${BRAIN_ACTIVATION_HEALTH_URL:-}" ]]; then
  node -e 'const u=new URL(process.argv[1]); if(u.protocol!=="https:"||u.username||u.password)process.exit(1)' \
    "$BRAIN_ACTIVATION_HEALTH_URL" || die "activation health URL must be HTTPS without credentials"
  command -v curl >/dev/null || die "curl is required for activation health verification"
  VERIFIED_DB_PATH="$BRAIN_DB_PATH"
  set -a
  # shellcheck disable=SC1090 -- root-owned production EnvironmentFile
  source "$ENV_FILE"
  set +a
  ACTIVATION_API_TOKEN="${BRAIN_API_TOKEN:-}"
  [[ -n "$ACTIVATION_API_TOKEN" ]] || die "BRAIN_API_TOKEN is required for activation health verification"
  BRAIN_DB_PATH="$VERIFIED_DB_PATH"
  export BRAIN_DB_PATH
fi

APP_SHA="$(node -e 'const m=require(process.argv[1]); if(!/^[a-f0-9]{40}$/i.test(m.appSha||""))process.exit(1); process.stdout.write(m.appSha.toLowerCase())' "$MANIFEST")" \
  || die "invalid manifest app SHA"
ARTIFACT_NAME="brain-release-${APP_SHA:0:12}.tar.gz"
MANIFEST_NAME="${ARTIFACT_NAME}.manifest.json"
[[ "$(basename -- "$ARTIFACT")" == "$ARTIFACT_NAME" && "$(basename -- "$MANIFEST")" == "$MANIFEST_NAME" ]] \
  || die "artifact files do not use the exact SHA-derived names"
node -e 'const m=require(process.argv[1]); if(m.artifactName!==process.argv[2])process.exit(1)' "$MANIFEST" "$ARTIFACT_NAME" \
  || die "manifest artifact filename mismatch"

EXPECTED_SUMMARY="$(node - "$MANIFEST" "$MAX_ARCHIVE_FILES" "$MAX_EXPANDED_BYTES" <<'NODE'
const manifest = require(process.argv[2]);
const maxFiles = Number(process.argv[3]);
const maxBytes = Number(process.argv[4]);
if (!Array.isArray(manifest.files) || manifest.files.some((entry) =>
  entry.kind !== "file" || !Number.isSafeInteger(entry.size) || entry.size < 0 ||
  typeof entry.path !== "string" || !entry.path || entry.path.startsWith("/") ||
  entry.path.includes("\\") || entry.path.split("/").includes(".."))) process.exit(1);
const bytes = manifest.files.reduce((total, entry) => total + entry.size, 0);
const inner = { ...manifest };
delete inner.artifactName;
delete inner.artifactSha256;
const innerBytes = Buffer.byteLength(`${JSON.stringify(inner, null, 2)}\n`);
const totalFiles = manifest.files.length + 1;
const totalBytes = bytes + innerBytes;
if (totalFiles > maxFiles || totalBytes > maxBytes) process.exit(1);
process.stdout.write(`${totalFiles} ${totalBytes}`);
NODE
)" || die "manifest file list or expanded-size bound is invalid"

tar -tzf "$ARTIFACT" | node -e '
let input="";
process.stdin.setEncoding("utf8");
process.stdin.on("data",(chunk)=>{input+=chunk});
process.stdin.on("end",()=>{
  const unsafe=input.split("\n").filter(Boolean).find((name)=>
    !name.startsWith("runtime/") || name.startsWith("/") || name.includes("\\") || name.split("/").includes(".."));
  if(unsafe){console.error(`unsafe archive member: ${unsafe}`);process.exit(1)}
});
' || die "artifact contains an unsafe archive path"
ARCHIVE_SUMMARY="$(LC_ALL=C tar --numeric-owner --full-time -tvzf "$ARTIFACT" | awk -v maxFiles="$MAX_ARCHIVE_FILES" -v maxBytes="$MAX_EXPANDED_BYTES" '
BEGIN { files=0; bytes=0 }
{
  type=substr($1,1,1)
  if (type != "-" && type != "d") exit 40
  if (type == "-") {
    if ($3 !~ /^[0-9]+$/) exit 41
    files += 1
    bytes += $3
    if (files > maxFiles || bytes > maxBytes) exit 42
  }
}
END { printf "%d %.0f", files, bytes }
')" || die "archive contains a special entry or exceeds extraction limits"
read -r MANIFEST_FILE_COUNT MANIFEST_BYTES <<< "$EXPECTED_SUMMARY"
read -r ARCHIVE_FILE_COUNT ARCHIVE_BYTES <<< "$ARCHIVE_SUMMARY"
[[ "$ARCHIVE_FILE_COUNT" == "$MANIFEST_FILE_COUNT" && "$ARCHIVE_BYTES" == "$MANIFEST_BYTES" ]] \
  || die "archive member count/size does not match the bounded manifest"

mkdir -p "$RELEASE_ROOT"
chown root:brain-data "$RELEASE_ROOT"
chmod 0750 "$RELEASE_ROOT"
FINAL="$RELEASE_ROOT/$APP_SHA"
[[ ! -e "$FINAL" ]] || die "immutable release already exists: $APP_SHA"
STAGING="$(mktemp -d "$RELEASE_ROOT/.staging-${APP_SHA}.XXXXXXXX")"
chown brain:brain-data "$STAGING"
chmod 0700 "$STAGING"
EXTRACT_ARTIFACT="$STAGING/.artifact.tar.gz"
install -o brain -g brain-data -m 0400 "$ARTIFACT" "$EXTRACT_ARTIFACT"
runuser -u brain -g brain-data -- tar -xzf "$EXTRACT_ARTIFACT" -C "$STAGING" --no-same-owner --no-same-permissions
rm -f -- "$EXTRACT_ARTIFACT"
[[ -d "$STAGING/runtime" ]] || die "artifact does not contain runtime/"
node "$VERIFY_TOOL" "$STAGING/runtime" "$MANIFEST" "$ARTIFACT"

BETTER_EXPECTED="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.nativeDependencies.betterSqlite3)' "$MANIFEST")"
VEC_EXPECTED="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.nativeDependencies.sqliteVec)' "$MANIFEST")"
BETTER_ACTUAL="$(node -e 'process.stdout.write(require(process.argv[1]).version)' "$STAGING/runtime/node_modules/better-sqlite3/package.json")"
VEC_ACTUAL="$(node -e 'process.stdout.write(require(process.argv[1]).version)' "$STAGING/runtime/node_modules/sqlite-vec/package.json")"
[[ "$BETTER_ACTUAL" == "$BETTER_EXPECTED" && "$VEC_ACTUAL" == "$VEC_EXPECTED" ]] || die "native dependency version mismatch"
node - "$STAGING/runtime" <<'NODE' || die "native dependency ABI/load check failed"
const runtime = process.argv[2];
const Database = require(`${runtime}/node_modules/better-sqlite3`);
const sqliteVec = require(`${runtime}/node_modules/sqlite-vec`);
const db = new Database(":memory:");
sqliteVec.load(db);
db.prepare("SELECT 1 value").get();
db.close();
NODE
node - "$STAGING/runtime" "$MANIFEST" "$BRAIN_DB_PATH" "${BRAIN_ALLOW_SCHEMA_025_ROLLBACK:-0}" <<'NODE' \
  || die "migration compatibility check failed"
const runtime = process.argv[2];
const manifest = require(process.argv[3]);
const dbPath = process.argv[4];
const allowSchema025Rollback = process.argv[5] === "1";
const Database = require(`${runtime}/node_modules/better-sqlite3`);
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

chown -R root:brain-data "$STAGING/runtime"
chmod -R go-w "$STAGING/runtime"
mv -- "$STAGING" "$FINAL"
STAGING=""
install -d -o root -g brain-data -m 0750 "$FINAL/evidence"
install -o root -g brain-data -m 0640 "$ARTIFACT" "$FINAL/evidence/$ARTIFACT_NAME"
install -o root -g brain-data -m 0640 "$MANIFEST" "$FINAL/evidence/$MANIFEST_NAME"
chmod -R go-w "$FINAL"

snapshot_system_state
PREVIOUS=""
if [[ -s "$STATE_DIR/current-link" ]]; then PREVIOUS="$(readlink -f -- "$CURRENT_LINK")"; fi
trap on_error ERR
MUTATED=1
ln -s -- "$FINAL/runtime" "${CURRENT_LINK}.next"
mv -Tf -- "${CURRENT_LINK}.next" "$CURRENT_LINK"
write_release_env
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain.service" /etc/systemd/system/brain.service
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain-processing-audit.service" /etc/systemd/system/brain-processing-audit.service
install -m 0644 "$CURRENT_LINK/scripts/deploy/brain-processing-audit.timer" /etc/systemd/system/brain-processing-audit.timer
systemctl daemon-reload
if ! systemctl restart brain; then
  trap - ERR
  restore_previous_state || true
  MUTATED=0
  cleanup
  die "candidate failed to start; complete previous system state restored"
fi
if [[ "${BRAIN_SKIP_PROCESSING_AUDIT_TIMER:-0}" != "1" ]]; then
  systemctl enable --now brain-processing-audit.timer
fi
if [[ -n "${BRAIN_ACTIVATION_HEALTH_URL:-}" ]]; then
  status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --header "Authorization: Bearer $ACTIVATION_API_TOKEN" "$BRAIN_ACTIVATION_HEALTH_URL")"
  [[ "$status" == "200" ]]
fi
MUTATED=0
trap - ERR
cleanup
printf '{"ok":true,"appSha":"%s","previous":"%s","current":"%s","dbPathSha256":"%s","dbDeviceInode":"%s"}\n' \
  "$APP_SHA" "$PREVIOUS" "$FINAL/runtime" "$BRAIN_DB_PATH_SHA256_ACTUAL" "$BRAIN_DB_DEVICE_INODE_ACTUAL"
