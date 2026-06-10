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

load_local_env

log "1. Toolchain and environment preflight"
toolchain_preflight
local_env_preflight
remote_env_preflight

log "2. Local release gates"
npm run typecheck
npm run lint
npm test
npm run check:env
npm run check:ai-providers -- $(ai_provider_check_args)

log "3. Build standalone artifact"
rm -rf .next
npm run build
npm run check:build-artifacts

log "4. Sync artifact to Hetzner"
rsync -az --delete --exclude '/data/' .next/standalone/ "${SSH_HOST}:${REMOTE_DIR}/"
rsync -az --delete .next/static/ "${SSH_HOST}:${REMOTE_DIR}/.next/static/"
rsync -az --delete public/ "${SSH_HOST}:${REMOTE_DIR}/public/"
ssh "${SSH_HOST}" "mkdir -p '${REMOTE_DIR}/scripts'"
rsync -az scripts/check-ai-providers.mjs scripts/backfill-embeddings-prod.mjs "${SSH_HOST}:${REMOTE_DIR}/scripts/"

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
