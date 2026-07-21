#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BRAIN_BASE_URL:-https://brain.arunp.in}"
SSH_HOST="${BRAIN_SSH_HOST:-brain}"
REMOTE_DIR="${BRAIN_REMOTE_DIR:-/opt/brain}"
RUN_TELEGRAM_SMOKE="${TELEGRAM_RELEASE:-0}"
EXPECTED_NODE_MAJOR="${BRAIN_DEPLOY_NODE_MAJOR:-22}"
HEALTH_TOKEN_SOURCE="${BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE:-remote}"

log() {
  printf '\n=== %s ===\n' "$1"
}

die() {
  echo "[deploy] $*" >&2
  exit 1
}

RECALL_DEPLOY_GUARD_TOKEN=""

acquire_recall_deploy_guard() {
  [[ -z "$RECALL_DEPLOY_GUARD_TOKEN" ]] || die "Recall deploy guard is already held"
  RECALL_DEPLOY_GUARD_TOKEN="deploy-$$-$(date -u +%s)"
  local ready
  local ready_file
  ready_file="$(mktemp)"
  if ! ssh "${SSH_HOST}" "sudo env RECALL_GUARD_TOKEN='${RECALL_DEPLOY_GUARD_TOKEN}' bash -s" >"$ready_file" <<'REMOTE_RECALL_DEPLOY_GUARD'; then
set -euo pipefail
prefix="/run/brain-recall/${RECALL_GUARD_TOKEN}"
hold="${prefix}.hold"
ready="${prefix}.ready"
result="${prefix}.result"
holder="${prefix}.sh"
lock="/run/brain-recall/recall-sync.lock"

for service in brain-recall-sync.service brain-recall-manual-sync.service; do
  state="$(systemctl is-active "$service" 2>/dev/null || true)"
  case "$state" in
    active|activating|reloading|deactivating)
      echo "[deploy] Recall runtime replacement refused while $service is $state" >&2
      exit 1
      ;;
  esac
done
if ! id brain-recall >/dev/null 2>&1 || [[ "$(stat -c '%U %G %a' /run/brain-recall 2>/dev/null || true)" != 'brain-recall brain-recall 700' ]]; then
  if systemctl is-enabled --quiet brain-recall-sync.timer 2>/dev/null || systemctl is-active --quiet brain-recall-sync.timer 2>/dev/null; then
    echo '[deploy] first guarded identity/runtime preparation requires the automatic timer disabled and inactive' >&2
    exit 1
  fi
  getent group brain-data >/dev/null || groupadd --system brain-data
  getent group brain-recall >/dev/null || groupadd --system brain-recall
  id brain-recall >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin --gid brain-data brain-recall
  install -d -m 0700 -o brain-recall -g brain-recall /run/brain-recall
fi

install -m 0600 /dev/null "$hold"
rm -f "$ready" "$result" "$holder"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'prefix="$1"' \
  'hold="${prefix}.hold"' \
  'ready="${prefix}.ready"' \
  'result="${prefix}.result"' \
  'lock="/run/brain-recall/recall-sync.lock"' \
  'exec 9>>"$lock"' \
  'if ! flock -n 9; then' \
  "  printf 'lock_busy\\n' > \"\$result\"" \
  '  exit 1' \
  'fi' \
  'for service in brain-recall-sync.service brain-recall-manual-sync.service; do' \
  '  state="$(systemctl is-active "$service" 2>/dev/null || true)"' \
  '  case "$state" in' \
  '    active|reloading|deactivating)' \
  "      printf 'service_active:%s:%s\\n' \"\$service\" \"\$state\" > \"\$result\"" \
  '      exit 1' \
  '      ;;' \
  '  esac' \
  'done' \
  'timer_before="$(systemctl is-enabled brain-recall-sync.timer 2>/dev/null || true)|$(systemctl is-active brain-recall-sync.timer 2>/dev/null || true)"' \
  "printf 'ready|%s\\n' \"\$timer_before\" > \"\$ready\"" \
  'while [[ -e "$hold" ]]; do sleep 0.1; done' \
  'timer_after="$(systemctl is-enabled brain-recall-sync.timer 2>/dev/null || true)|$(systemctl is-active brain-recall-sync.timer 2>/dev/null || true)"' \
  'if [[ "$timer_after" != "$timer_before" ]]; then' \
  "  printf 'timer_changed|%s|%s\\n' \"\$timer_before\" \"\$timer_after\" > \"\$result\"" \
  'else' \
  "  printf 'ok|%s\\n' \"\$timer_after\" > \"\$result\"" \
  'fi' \
  'rm -f "$ready" "$0"' \
  > "$holder"
chmod 0700 "$holder"
nohup bash "$holder" "$prefix" >/dev/null 2>&1 &
for _ in $(seq 1 200); do
  if [[ -s "$ready" ]]; then
    cat "$ready"
    exit 0
  fi
  if [[ -s "$result" ]]; then
    cat "$result" >&2
    exit 1
  fi
  sleep 0.05
done
echo '[deploy] timed out acquiring continuous Recall deploy guard' >&2
rm -f "$hold"
exit 1
REMOTE_RECALL_DEPLOY_GUARD
    rm -f "$ready_file"
    RECALL_DEPLOY_GUARD_TOKEN=""
    die "continuous Recall deploy guard could not be acquired"
  fi
  ready="$(<"$ready_file")"
  rm -f "$ready_file"
  [[ "$ready" == ready\|* ]] || die "continuous Recall deploy guard returned an invalid readiness response"
  trap 'release_recall_deploy_guard false' EXIT
  echo "[deploy] continuous Recall deploy guard acquired (${ready#ready|})."
}

release_recall_deploy_guard() {
  local verify="${1:-true}"
  [[ -n "$RECALL_DEPLOY_GUARD_TOKEN" ]] || return 0
  local token="$RECALL_DEPLOY_GUARD_TOKEN"
  local outcome
  local outcome_file
  outcome_file="$(mktemp)"
  if ssh "${SSH_HOST}" "sudo env RECALL_GUARD_TOKEN='${token}' bash -s" >"$outcome_file" <<'REMOTE_RECALL_DEPLOY_RELEASE'; then
set -euo pipefail
prefix="/run/brain-recall/${RECALL_GUARD_TOKEN}"
rm -f "${prefix}.hold"
for _ in $(seq 1 200); do
  if [[ -s "${prefix}.result" ]]; then
    cat "${prefix}.result"
    rm -f "${prefix}.result" "${prefix}.ready" "${prefix}.sh"
    exit 0
  fi
  sleep 0.05
done
echo 'guard_release_timeout'
exit 1
REMOTE_RECALL_DEPLOY_RELEASE
    outcome="$(<"$outcome_file")"
  else
    outcome="guard_release_failed"
  fi
  rm -f "$outcome_file"
  RECALL_DEPLOY_GUARD_TOKEN=""
  trap - EXIT
  if [[ "$verify" == "true" && "$outcome" != ok\|* ]]; then
    die "continuous Recall deploy guard failed timer/state verification: $outcome"
  fi
  [[ "$outcome" == ok\|* ]] && echo "[deploy] continuous Recall deploy guard released (${outcome#ok|})."
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

toolchain_preflight() {
  require_command node
  require_command npm
  require_command curl
  require_command rsync
  require_command ssh

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$node_major" != "$EXPECTED_NODE_MAJOR" && "${BRAIN_ALLOW_NODE_MISMATCH:-0}" != "1" ]]; then
    die "Node ${EXPECTED_NODE_MAJOR}.x is expected for deploy; found $(node -v). Set BRAIN_ALLOW_NODE_MISMATCH=1 to override."
  fi
}

load_local_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
}

local_env_preflight() {
  case "$HEALTH_TOKEN_SOURCE" in
    remote)
      ;;
    local)
      [[ -n "${BRAIN_API_TOKEN:-}" ]] || die "BRAIN_API_TOKEN is required locally when BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE=local"
      ;;
    *)
      die "BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE must be 'remote' or 'local'; got '${HEALTH_TOKEN_SOURCE}'"
      ;;
  esac
}

remote_env_preflight() {
  ssh "${SSH_HOST}" "sudo test -f /etc/brain/.env && sudo grep -q '^BRAIN_API_TOKEN=' /etc/brain/.env" \
    || die "remote /etc/brain/.env must contain BRAIN_API_TOKEN before deploy"
}

remote_recall_timer_preflight() {
  if [[ "${BRAIN_RECALL_ALLOW_EXISTING_TIMER:-0}" == "1" ]]; then
    ssh "${SSH_HOST}" "systemctl is-enabled --quiet brain-recall-sync.timer && systemctl is-active --quiet brain-recall-sync.timer" \
      || die "Recall existing-timer override requires brain-recall-sync.timer to remain enabled and active."
    echo "[deploy] existing Recall timer verified enabled and active."
    return
  fi

  ssh "${SSH_HOST}" "if systemctl is-enabled --quiet brain-recall-sync.timer 2>/dev/null; then echo '[deploy] brain-recall-sync.timer is enabled' >&2; exit 1; fi; if systemctl is-active --quiet brain-recall-sync.timer 2>/dev/null; then echo '[deploy] brain-recall-sync.timer is active' >&2; exit 1; fi" \
    || die "brain-recall-sync.timer must be disabled and inactive before deploy. Disable it, or set BRAIN_RECALL_ALLOW_EXISTING_TIMER=1 only after scheduler approval."
}

remote_recall_env_preflight() {
  if [[ "${BRAIN_RECALL_ALLOW_ENABLED_FLAGS:-0}" == "1" ]]; then
    ssh "${SSH_HOST}" "sudo bash -s" <<'REMOTE_RECALL_ENABLED_ENV_PREFLIGHT' \
      || die "Recall enabled-flags override requires every completed scheduler flag to remain enabled."
set -euo pipefail
for key in BRAIN_RECALL_SYNC_ENABLED BRAIN_RECALL_SCHEDULER_ENABLED BRAIN_RECALL_CONFIRM_LIVE_API; do
  grep -Eq "^(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*[\"']?1[\"']?[[:space:]]*$" /etc/brain/.env || {
    echo "[deploy] ${key} is not enabled" >&2
    exit 1
  }
done
REMOTE_RECALL_ENABLED_ENV_PREFLIGHT
    echo "[deploy] completed Recall scheduler flags verified enabled."
    return
  fi

  ssh "${SSH_HOST}" "sudo bash -s" <<'REMOTE_RECALL_ENV_PREFLIGHT' || die "remote Recall enable flags must be disabled before deploy. Set BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1 only for an approved apply/scheduler window."
set -euo pipefail

for key in BRAIN_RECALL_SYNC_ENABLED BRAIN_RECALL_SCHEDULER_ENABLED BRAIN_RECALL_CONFIRM_LIVE_API; do
  if grep -Eq "^(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*[\"']?1[\"']?[[:space:]]*$" /etc/brain/.env; then
    echo "[deploy] remote /etc/brain/.env has ${key}=1" >&2
    exit 1
  fi
done
REMOTE_RECALL_ENV_PREFLIGHT
}

remote_manual_notes_env_preflight() {
  if [[ "${BRAIN_MANUAL_NOTES_ALLOW_ENABLED_FLAGS:-0}" == "1" ]]; then
    echo "[deploy] BRAIN_MANUAL_NOTES_ALLOW_ENABLED_FLAGS=1; preserving approved note rollout flags."
    return
  fi

  ssh "${SSH_HOST}" "sudo bash -s" <<'REMOTE_MANUAL_NOTES_ENV_PREFLIGHT' \
    || die "manual-note flags must be disabled for the guarded first deploy."
set -euo pipefail
for key in MANUAL_NOTES_UI_ENABLED MANUAL_NOTES_WRITE_ENABLED MANUAL_NOTES_WORKER_ENABLED; do
  if grep -Eq "^(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*[\"']?(1|true|yes|on)[\"']?[[:space:]]*$" /etc/brain/.env; then
    echo "[deploy] remote /etc/brain/.env has ${key} enabled" >&2
    exit 1
  fi
done
REMOTE_MANUAL_NOTES_ENV_PREFLIGHT
}

remote_note_focus_env_preflight() {
  if [[ "${BRAIN_NOTE_FOCUS_ALLOW_ENABLED_FLAG:-0}" == "1" ]]; then
    echo "[deploy] BRAIN_NOTE_FOCUS_ALLOW_ENABLED_FLAG=1; preserving approved Note Focus rollout flag."
    return
  fi

  ssh "${SSH_HOST}" "sudo bash -s" <<'REMOTE_NOTE_FOCUS_ENV_PREFLIGHT' \
    || die "NOTE_FOCUS_MODE_ENABLED must be disabled for the guarded first deploy."
set -euo pipefail
if grep -Eq "^(export[[:space:]]+)?NOTE_FOCUS_MODE_ENABLED[[:space:]]*=[[:space:]]*[\"']?(1|true|yes|on)[\"']?[[:space:]]*$" /etc/brain/.env; then
  echo "[deploy] remote /etc/brain/.env has NOTE_FOCUS_MODE_ENABLED enabled" >&2
  exit 1
fi
REMOTE_NOTE_FOCUS_ENV_PREFLIGHT
}

remote_database_backup() {
  local timestamp
  timestamp="$(date -u +%Y-%m-%d_%H-%M-%S)"
  ssh "${SSH_HOST}" "sudo env BRAIN_PREDEPLOY_TIMESTAMP='${timestamp}' bash -s" <<'REMOTE_DATABASE_BACKUP' \
    || die "pre-deploy database backup failed"
set -euo pipefail
source_db="/opt/brain/data/brain.sqlite"
backup_dir="/opt/brain/data/backups"
backup_file="${backup_dir}/pre-manual-notes-${BRAIN_PREDEPLOY_TIMESTAMP}.sqlite"
# The app and trusted Recall worker share this WAL-safe backup target.
install -d -o brain -g brain-data -m 2770 "$backup_dir"
if id brain-recall >/dev/null 2>&1; then
  runuser -u brain-recall -g brain-data -- bash -c \
    'probe="$(mktemp "$1/.recall-backup-write-proof.XXXXXXXX")"; rm -f -- "$probe"' \
    _ "$backup_dir"
fi
sqlite3 "$source_db" ".backup '$backup_file'"
chmod 0600 "$backup_file"
sqlite3 "$backup_file" "PRAGMA quick_check;" | grep -qx ok
printf '[deploy] database backup verified: %s\n' "$backup_file"
REMOTE_DATABASE_BACKUP
}

remote_recall_key_rotation_evidence_preflight() {
  if [[ "${BRAIN_RECALL_ALLOW_ENABLED_FLAGS:-0}" != "1" && "${BRAIN_RECALL_ALLOW_EXISTING_TIMER:-0}" != "1" ]]; then
    return
  fi

  local env_file
  local checkpoint
  local env_file_quoted
  local checkpoint_quoted

  env_file="${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}}"
  checkpoint="${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"
  env_file_quoted="$(printf '%q' "$env_file")"
  checkpoint_quoted="$(printf '%q' "$checkpoint")"

  ssh "${SSH_HOST}" "sudo env BRAIN_RECALL_KEY_ROTATION_ENV_FILE=${env_file_quoted} BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE=${env_file_quoted} BRAIN_RECALL_KEY_ROTATED_AFTER_ISO=${checkpoint_quoted} bash -s" <<'REMOTE_RECALL_KEY_EVIDENCE' \
    || die "remote Recall key rotation evidence must pass when Recall deploy overrides are used."
set -euo pipefail

file="${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}}"
checkpoint="${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"

if [[ ! -f "$file" ]]; then
  echo "[deploy] Recall key rotation evidence file is missing" >&2
  exit 1
fi

mode_octal="$(stat -c '%a' "$file")"
mode=$((8#$mode_octal))
if (((mode & 0027) != 0 || (mode & 0400) == 0)); then
  echo "[deploy] Recall key rotation evidence file permissions are not restrictive enough" >&2
  exit 1
fi

mtime_epoch="$(stat -c '%Y' "$file")"
checkpoint_epoch="$(date -u -d "$checkpoint" +%s)"
if ((mtime_epoch < checkpoint_epoch)); then
  echo "[deploy] Recall key rotation evidence file predates the required checkpoint" >&2
  exit 1
fi
REMOTE_RECALL_KEY_EVIDENCE
}

local_authenticated_health_check() {
  local token="${BRAIN_API_TOKEN:-}"
  [[ -n "$token" ]] || die "BRAIN_API_TOKEN is required locally for authenticated health check"

  local status
  status=$(curl --silent --show-error --output /dev/null --write-out "%{http_code}" \
    --header "Authorization: Bearer ${token}" \
    "${BASE_URL}/api/health")
  if [[ "$status" != "200" ]]; then
    if [[ "$status" == "401" ]]; then
      die "health check returned 401 with local token; production may be healthy but this local token is stale"
    fi
    die "health check returned ${status}, expected 200"
  fi
}

remote_authenticated_health_check() {
  local health_url
  local health_url_quoted

  health_url="${BASE_URL%/}/api/health"
  health_url_quoted="$(printf '%q' "$health_url")"

  ssh "${SSH_HOST}" "sudo env BRAIN_HEALTH_URL=${health_url_quoted} bash -s" <<'REMOTE_HEALTH_CHECK'
set -euo pipefail

set -a
source /etc/brain/.env
set +a

token="${BRAIN_API_TOKEN:-}"
if [[ -z "$token" ]]; then
  echo "[deploy] remote /etc/brain/.env did not provide BRAIN_API_TOKEN" >&2
  exit 1
fi

status=$(curl --silent --show-error --output /dev/null --write-out "%{http_code}" \
  --header "Authorization: Bearer ${token}" \
  "${BRAIN_HEALTH_URL}")

if [[ "$status" != "200" ]]; then
  echo "[deploy] health check returned ${status}, expected 200 using remote token" >&2
  exit 1
fi
REMOTE_HEALTH_CHECK
}

health_check() {
  case "$HEALTH_TOKEN_SOURCE" in
    remote)
      remote_authenticated_health_check
      ;;
    local)
      local_authenticated_health_check
      ;;
    *)
      die "BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE must be 'remote' or 'local'; got '${HEALTH_TOKEN_SOURCE}'"
      ;;
  esac
}

ai_provider_check_args() {
  if [[ "${BRAIN_AI_PROVIDER_WARN_ONLY:-0}" == "1" ]]; then
    printf '%s' "--warn-only"
  fi
}

webhook_reachability_check() {
  local status
  status=$(curl --silent --show-error --output /dev/null --write-out "%{http_code}" \
    --request POST \
    "${BASE_URL}/api/telegram/webhook")
  [[ "$status" == "401" ]] || die "telegram webhook returned ${status}, expected 401 without secret"
}

repair_remote_native_deps() {
  local better_sqlite3_version
  local sqlite_vec_version
  local remote_dir_quoted

  better_sqlite3_version="$(node -p "require('./package-lock.json').packages['node_modules/better-sqlite3'].version")"
  sqlite_vec_version="$(node -p "require('./package-lock.json').packages['node_modules/sqlite-vec'].version")"
  remote_dir_quoted="$(printf '%q' "$REMOTE_DIR")"

  ssh "${SSH_HOST}" "cd ${remote_dir_quoted} && rm -rf node_modules/better-sqlite3 node_modules/sqlite-vec node_modules/sqlite-vec-* && npm_config_engine_strict=false npm_config_build_from_source=true npm install --omit=dev --include=optional --foreground-scripts better-sqlite3@${better_sqlite3_version} sqlite-vec@${sqlite_vec_version}"
}

run_recall_local_release_gates() {
  npm run check:recall-approval-packet

  if [[ "${BRAIN_RECALL_ALLOW_EXISTING_TIMER:-0}" == "1" && "${BRAIN_RECALL_ALLOW_ENABLED_FLAGS:-0}" == "1" ]]; then
    # A clean release worktree intentionally does not carry ignored historical
    # first-apply evidence. The remote preflights above prove the completed
    # scheduler state; keep this lane to static/public packaging checks so a
    # later unrelated app release does not demand obsolete private fixtures.
    echo "[deploy] Recall is already completed in production; running completed-state static gates."
    npm run check:recall-public-docs-privacy
    npm run build:recall-cli
    npm run smoke:recall-cli:bundle
    npm run smoke:recall-scheduler-wrapper
    npm run check:recall-scheduler
  else
    npm run smoke:recall-key-rotation-env-writer
    npm run smoke:recall-key-rotation-handoff
    npm run recall:key-rotation:handoff -- --json
    npm run smoke:recall-first-apply-prepare-after-rotation
    npm run smoke:recall-first-apply-live-diagnostic
    npm run smoke:recall-first-apply-live-diagnostic-prompt-guard
    npm run smoke:recall-public-docs-privacy
    npm run check:recall-public-docs-privacy
    npm run smoke:recall-live-spikes
    npm run smoke:recall-live-spike-reports
    npm run build:recall-cli
    npm run smoke:recall-cli:bundle
    npm run smoke:recall-scheduler-wrapper
    npm run smoke:recall-second-manual-runtime-preflight
    npm run smoke:recall-second-manual-remote-runtime-preflight
    npm run smoke:recall-production-key-evidence-repair
    npm run smoke:recall-production-env-key-install
    npm run smoke:recall-second-manual-production-apply
    npm run smoke:recall-manual-verification-apply
    npm run smoke:recall-second-manual-readiness
    npm run smoke:recall-second-manual-command
    npm run check:recall-scheduler
    npm run smoke:recall-daily-sync-completion-status
    npm run smoke:recall-scheduler-enable-evidence-record
    npm run smoke:recall-scheduler-enable-command
    npm run smoke:recall-scheduler-evidence-command
    npm run recall:daily-sync:completion-status
  fi

  npm run build:vector-tools
  npm run check:ai-providers -- $(ai_provider_check_args)
}

load_local_env

log "1. Toolchain and environment preflight"
toolchain_preflight
local_env_preflight
remote_env_preflight
remote_recall_timer_preflight
remote_recall_env_preflight
remote_manual_notes_env_preflight
remote_note_focus_env_preflight
remote_recall_key_rotation_evidence_preflight
remote_database_backup

log "2. Local release gates"
npm run typecheck
npm run lint
npm test
npm run check:env
run_recall_local_release_gates

log "3. Build standalone artifact"
rm -rf .next
npm run build
npm run check:build-artifacts

if [[ "${BRAIN_RECALL_PREPARE_MANUAL_SYNC:-0}" == "1" ]]; then
  log "3a. Hold the private Recall lock across the complete runtime switch"
  acquire_recall_deploy_guard
fi

log "4. Sync artifact to Hetzner"
rsync -az --delete --exclude '/data/' .next/standalone/ "${SSH_HOST}:${REMOTE_DIR}/"
rsync -az --delete .next/static/ "${SSH_HOST}:${REMOTE_DIR}/.next/static/"
rsync -az --delete public/ "${SSH_HOST}:${REMOTE_DIR}/public/"
ssh "${SSH_HOST}" "mkdir -p '${REMOTE_DIR}/scripts' '${REMOTE_DIR}/scripts/deploy' '${REMOTE_DIR}/scripts/lib' '${REMOTE_DIR}/docs/plans/spikes'"
rsync -az scripts/check-ai-providers.mjs scripts/check-recall-key-rotation-evidence.mjs scripts/check-recall-dry-run-report.mjs scripts/check-recall-apply-report.mjs scripts/check-recall-live-spike-reports.mjs scripts/check-recall-public-privacy.mjs scripts/check-recall-public-manifest-privacy.mjs scripts/check-recall-second-manual-runtime-preflight.mjs scripts/backfill-embeddings-prod.mjs scripts/backfill-youtube-transcripts-prod.mjs scripts/restore-from-backup.sh scripts/recall-first-apply-preflight.mjs scripts/recall-second-manual-verification-apply.sh scripts/dist/audit-vector-index-prod.mjs scripts/dist/repair-vector-index-prod.mjs "${SSH_HOST}:${REMOTE_DIR}/scripts/"
rsync -az scripts/lib/recall-controlled-samples.mjs "${SSH_HOST}:${REMOTE_DIR}/scripts/lib/"
rsync -az docs/plans/spikes/SPIKE-013-recall-rest-enumeration-*.md docs/plans/spikes/SPIKE-014-recall-content-fidelity-*.md "${SSH_HOST}:${REMOTE_DIR}/docs/plans/spikes/"
rsync -az scripts/deploy/brain.service "${SSH_HOST}:${REMOTE_DIR}/scripts/deploy/"
if [[ "${BRAIN_RECALL_PREPARE_MANUAL_SYNC:-0}" == "1" ]]; then
  rsync -az scripts/dist/sync-recall-prod.mjs scripts/dist/recall-sync-lifecycle-prod.mjs scripts/dist/recall-manual-sync-worker-prod.mjs "${SSH_HOST}:${REMOTE_DIR}/scripts/"
  rsync -az --delete scripts/dist/db/ "${SSH_HOST}:${REMOTE_DIR}/scripts/db/"
  rsync -az scripts/deploy/brain-recall-sync.service scripts/deploy/brain-recall-sync.timer scripts/deploy/brain-recall-manual-sync.service scripts/deploy/brain-recall-manual-sync.path scripts/deploy/brain-recall-manual-sync.timer scripts/deploy/brain-recall-manual-sync.tmpfiles.conf "${SSH_HOST}:${REMOTE_DIR}/scripts/deploy/"
  rsync -az scripts/recall-scheduled-apply.sh "${SSH_HOST}:${REMOTE_DIR}/scripts/"
  ssh "${SSH_HOST}" "sudo env BRAIN_REMOTE_DIR='${REMOTE_DIR}' bash -s" <<'REMOTE_RECALL_MANUAL_PREPARE'
set -euo pipefail
if grep -Eq '^(export[[:space:]]+)?RECALL_API_KEY[[:space:]]*=' /etc/brain/.env; then
  echo '[deploy] shared web EnvironmentFile must not contain RECALL_API_KEY' >&2
  exit 1
fi
getent group brain-data >/dev/null || groupadd --system brain-data
getent group brain-recall >/dev/null || groupadd --system brain-recall
id brain-recall >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin --gid brain-data brain-recall
usermod -a -G brain-data brain
test "$(stat -c '%U %a' /etc/brain/recall-api-key)" = 'root 400' || {
  echo '[deploy] /etc/brain/recall-api-key must already be root-owned mode 0400' >&2
  exit 1
}
chgrp -R brain-data /opt/brain/data
find /opt/brain/data -type d -exec chmod 2770 {} +
find /opt/brain/data -type f -exec chmod 0660 {} +
runuser -u brain-recall -g brain-data -- bash -c \
  'probe="$(mktemp "$1/.recall-backup-write-proof.XXXXXXXX")"; rm -f -- "$probe"' \
  _ /opt/brain/data/backups
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain.service" /etc/systemd/system/brain.service
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-sync.service" /etc/systemd/system/brain-recall-sync.service
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-sync.timer" /etc/systemd/system/brain-recall-sync.timer
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-manual-sync.service" /etc/systemd/system/brain-recall-manual-sync.service
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-manual-sync.path" /etc/systemd/system/brain-recall-manual-sync.path
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-manual-sync.timer" /etc/systemd/system/brain-recall-manual-sync.timer
install -m 0644 "${BRAIN_REMOTE_DIR}/scripts/deploy/brain-recall-manual-sync.tmpfiles.conf" /etc/tmpfiles.d/brain-recall-manual-sync.conf
systemd-tmpfiles --create /etc/tmpfiles.d/brain-recall-manual-sync.conf
systemctl daemon-reload
systemctl is-enabled --quiet brain-recall-manual-sync.path && exit 1 || true
systemctl is-enabled --quiet brain-recall-manual-sync.timer && exit 1 || true
REMOTE_RECALL_MANUAL_PREPARE
  release_recall_deploy_guard true
else
  echo "[deploy] Recall runtime, migrations, wrapper, and units were preserved. BRAIN_RECALL_PREPARE_MANUAL_SYNC=1 plus the continuous private-lock guard is required to replace them."
fi

log "5. Repair remote native dependencies"
repair_remote_native_deps

log "6. Restart service"
ssh "${SSH_HOST}" "sudo systemctl restart brain"

log "7. Authenticated health check (${HEALTH_TOKEN_SOURCE} token)"
health_check

log "8. Remote AI provider check"
ssh "${SSH_HOST}" "cd '${REMOTE_DIR}' && sudo bash -lc 'set -a; source /etc/brain/.env; set +a; node scripts/check-ai-providers.mjs $(ai_provider_check_args)'"

log "9. Telegram webhook reachability"
webhook_reachability_check

if [[ "$RUN_TELEGRAM_SMOKE" == "1" ]]; then
  log "10. Telegram smoke"
  BRAIN_BASE_URL="$BASE_URL" npm run smoke:telegram
else
  log "10. Telegram smoke skipped"
  echo "[deploy] Set TELEGRAM_RELEASE=1 with TELEGRAM_WEBHOOK_SECRET when Telegram live validation is in scope."
fi

echo
echo "[deploy] Release candidate deployed and health-checked."
