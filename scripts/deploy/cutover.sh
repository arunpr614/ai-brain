#!/usr/bin/env bash
# scripts/deploy/cutover.sh — Phase D-12..D-14 (and rollback)
#
# Mac → Hetzner cutover for v0.6.0. Runs at 03:00 IST during the
# user-locked cutover window (memory: project_ai_brain_cutover_pacing).
#
# What this does:
#   D-12  snapshot Mac SQLite via .backup, scp to Hetzner, restore
#   D-13  flip brain.arunp.in CNAME from Mac tunnel → Hetzner tunnel,
#         stop Mac cloudflared, ensure Hetzner cloudflared is the only
#         tunnel serving brain.arunp.in
#   D-14  stop Mac brain (Next.js v0.5.6 dev process)
#
# Rollback (./cutover.sh rollback): undoes D-13 + D-14 only.
#   D-12 (DB rsync) is forward-only — Mac DB remains the source of
#   truth for ~24h post-cutover, so the rollback target is the same DB.
#
# Inputs:
#   CF_API_TOKEN          — Cloudflare API token (Phase D-10 token, expires
#                           2026-06-17). Required for DNS swap.
#   HETZNER_SSH_KEY       — defaults to ~/.ssh/ai_brain_hetzner
#   HETZNER_HOST          — defaults to brain@204.168.155.44
#
# Locked record IDs / tunnel UUIDs (captured 2026-05-19):
#   Zone:                 af88f945669d3e95174e20386a9d2feb (arunp.in)
#   brain.arunp.in CNAME: ac9ca4ca42f6c03a3e9970d4a89988d6
#   Mac tunnel UUID:      58339d22-d0be-4fab-94d6-32fd24b04a72
#   Hetzner tunnel UUID:  64fb278e-15eb-4fe2-a1e1-2ca48ee490e7
#
# Pre-cutover invariants the agent MUST verify before invoking this:
#   - All D-1..D-11 tasks green (RUNNING_LOG entry #37 + S-13 spike).
#   - 48h elapsed since D-11 (per cutover-pacing memory).
#   - Mac brain.service responding at brain.arunp.in/api/health (200).
#   - Hetzner brain.service responding at brain-staging.arunp.in/api/health (200).
#   - User on-call but allowed up to 2-3h latency (per cutover-pacing memory).

set -euo pipefail

CF_TOKEN="${CF_API_TOKEN:-}"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/ai_brain_hetzner}"
HOST="${HETZNER_HOST:-brain@204.168.155.44}"

ZONE_ID="af88f945669d3e95174e20386a9d2feb"
RECORD_ID="ac9ca4ca42f6c03a3e9970d4a89988d6"
MAC_TUNNEL_UUID="58339d22-d0be-4fab-94d6-32fd24b04a72"
HETZNER_TUNNEL_UUID="64fb278e-15eb-4fe2-a1e1-2ca48ee490e7"

CF_API="https://api.cloudflare.com/client/v4"

log() { printf '[cutover %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "FATAL: $*"; exit 1; }

require_token() {
  [[ -n "$CF_TOKEN" ]] || die "CF_API_TOKEN env var required"
}

verify_pre_cutover() {
  log "verifying pre-cutover invariants..."
  command -v sqlite3 >/dev/null || die "sqlite3 not on PATH"
  command -v jq >/dev/null || die "jq not on PATH (install via 'brew install jq')"
  command -v rsync >/dev/null || die "rsync not on PATH"
  [[ -f "$SSH_KEY" ]] || die "SSH key missing: $SSH_KEY"
  [[ -f data/brain.sqlite ]] || die "Mac DB missing: data/brain.sqlite"
  ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 "$HOST" 'true' \
    || die "SSH to $HOST failed"
  ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" 'systemctl is-active brain' \
    | grep -q '^active$' || die "Hetzner brain.service is not active"
  log "pre-cutover invariants OK"
}

#############################
# D-12 — Mac DB → Hetzner   #
#############################

d12_db_migrate() {
  local snapshot="/tmp/brain-cutover-$(date +%Y%m%d-%H%M).sqlite"
  log "D-12: sqlite3 .backup snapshot to $snapshot"
  sqlite3 data/brain.sqlite ".backup $snapshot"
  local mac_count
  mac_count=$(sqlite3 "$snapshot" "SELECT COUNT(*) FROM items;")
  log "D-12: snapshot has $mac_count items"

  log "D-12: scp snapshot to Hetzner"
  scp -i "$SSH_KEY" -o BatchMode=yes "$snapshot" "$HOST:/tmp/brain-cutover.sqlite"

  log "D-12: stopping Hetzner brain.service to swap DB"
  ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" 'sudo -n systemctl stop brain'

  log "D-12: backing up Hetzner's existing DB"
  ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" \
    'mv /opt/brain/data/brain.sqlite /opt/brain/data/brain.sqlite.pre-cutover 2>/dev/null || true; \
     mv /tmp/brain-cutover.sqlite /opt/brain/data/brain.sqlite; \
     chmod 600 /opt/brain/data/brain.sqlite'

  log "D-12: restarting Hetzner brain.service"
  ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" 'sudo -n systemctl start brain'
  sleep 3

  local hetzner_count
  hetzner_count=$(ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" \
    'sqlite3 /opt/brain/data/brain.sqlite "SELECT COUNT(*) FROM items;"')
  [[ "$mac_count" == "$hetzner_count" ]] \
    || die "D-12: row count mismatch — Mac=$mac_count Hetzner=$hetzner_count"
  log "D-12: row counts match ($mac_count items). DB cutover OK."

  rm "$snapshot"
}

#############################
# D-13 — DNS + tunnel flip  #
#############################

d13_tunnel_swap() {
  require_token
  log "D-13: flipping brain.arunp.in CNAME → Hetzner tunnel"
  local res
  res=$(curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"brain\",\"content\":\"${HETZNER_TUNNEL_UUID}.cfargotunnel.com\",\"proxied\":true,\"comment\":\"D-13 cutover $(date -u +%FT%TZ)\"}")
  echo "$res" | jq -e '.success == true' >/dev/null \
    || die "D-13: CNAME PATCH failed — $(echo "$res" | jq -c '.errors')"
  log "D-13: CNAME swap OK"

  log "D-13: stopping Mac cloudflared"
  sudo launchctl bootout system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>/dev/null \
    || sudo launchctl unload /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
  sleep 2
  ! pgrep -f '/opt/homebrew/bin/cloudflared.*config.yml.*tunnel run' >/dev/null \
    || die "D-13: Mac cloudflared still running"
  log "D-13: Mac cloudflared stopped"

  log "D-13: probing brain.arunp.in via Hetzner..."
  sleep 5  # allow CF edge to converge
  local probe
  probe=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $(grep ^BRAIN_LAN_TOKEN= .env | cut -d= -f2)" \
    https://brain.arunp.in/api/health)
  [[ "$probe" == "200" ]] || die "D-13: brain.arunp.in returned $probe (expected 200)"
  log "D-13: brain.arunp.in → Hetzner serving 200 OK"
}

#############################
# D-14 — stop Mac brain     #
#############################

d14_stop_mac_brain() {
  log "D-14: stopping Mac next-server (Next.js v0.5.6 dev process)"
  pkill -f "next-server.*v16" 2>/dev/null || true
  pkill -f "npm exec next" 2>/dev/null || true
  sleep 2
  if pgrep -f "next-server.*v16" >/dev/null; then
    log "D-14: WARNING — Mac next-server still running. Manual stop required."
  else
    log "D-14: Mac brain stopped."
  fi
}

#############################
# Rollback (D-13 + D-14)    #
#############################

rollback() {
  require_token
  log "ROLLBACK: flipping brain.arunp.in CNAME → Mac tunnel"
  local res
  res=$(curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"brain\",\"content\":\"${MAC_TUNNEL_UUID}.cfargotunnel.com\",\"proxied\":true,\"comment\":\"ROLLBACK $(date -u +%FT%TZ)\"}")
  echo "$res" | jq -e '.success == true' >/dev/null \
    || die "ROLLBACK: CNAME PATCH failed — $(echo "$res" | jq -c '.errors')"
  log "ROLLBACK: CNAME reverted to Mac tunnel"

  log "ROLLBACK: starting Mac cloudflared"
  sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>/dev/null \
    || sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
  log "ROLLBACK: Mac cloudflared started"

  log "ROLLBACK: restart Mac brain manually if needed:"
  log "  cd $(pwd) && PORT=3000 npm run start:lan"
  log ""
  log "ROLLBACK: Hetzner brain.service kept running — won't serve traffic"
  log "          until CNAME flips back. Stop with: ssh ... systemctl stop brain"
}

#############################
# Main                      #
#############################

main() {
  case "${1:-cutover}" in
    cutover)
      verify_pre_cutover
      log "All invariants OK. Starting cutover. Estimated downtime: 5-10 min."
      log "Press Ctrl-C in next 10s to abort."
      sleep 10
      d12_db_migrate
      d13_tunnel_swap
      d14_stop_mac_brain
      log "============================================"
      log "CUTOVER COMPLETE. brain.arunp.in → Hetzner."
      log "Validate D-15..D-18 over the next 24h:"
      log "  D-15: capture from APK"
      log "  D-16: Ask query in browser (streaming)"
      log "  D-17: wait for 01:00 IST batch run"
      log "  D-18: trigger backup, gpg-decrypt smoke"
      log "Rollback if needed: $0 rollback"
      log "============================================"
      ;;
    rollback)
      rollback
      ;;
    verify)
      verify_pre_cutover
      ;;
    *)
      echo "Usage: $0 [cutover|rollback|verify]" >&2
      exit 1
      ;;
  esac
}

main "$@"
