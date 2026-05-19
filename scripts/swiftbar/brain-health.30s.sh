#!/bin/bash
#
# SwiftBar plugin — AI Brain cloud health indicator
#
# Filename convention: `brain-health.30s.sh` → the `30s` tells SwiftBar
# to run this script every 30 seconds.
#
# v0.6.1 T-15: trimmed to a single bearer-authed probe of the production
# tunnel. Local-stack probes (Next.js / cloudflared / Ollama on the Mac)
# were retired in the v0.6.0 cutover when serving moved to Hetzner.
#
# Output protocol (SwiftBar / xbar compatible):
#   Line 1          = menu bar text (+ optional color/image attributes)
#   "---" separator = start of dropdown menu
#
# Icon colors:
#   🟢 green   — tunnel returns HTTP 200 (Brain is up and bearer is valid)
#   🟡 yellow  — tunnel returns HTTP 401/403 (auth issue; rotate token)
#   🔴 red     — anything else (000 / 5xx / 4xx other than 401/403)
#
# Bearer token: read from BRAIN_API_TOKEN in env, or fall back to
# BRAIN_LAN_TOKEN (legacy name; v0.6.1 T-11). If neither is present the
# probe runs anonymously and you'll see yellow.

CURL="/usr/bin/curl"
TUNNEL_HEALTH_URL="https://brain.arunp.in/api/health"

TOKEN="${BRAIN_API_TOKEN:-${BRAIN_LAN_TOKEN:-}}"

if [ -n "$TOKEN" ]; then
  code=$("$CURL" -s -o /dev/null -m 5 -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" "$TUNNEL_HEALTH_URL" 2>/dev/null)
else
  code=$("$CURL" -s -o /dev/null -m 5 -w "%{http_code}" "$TUNNEL_HEALTH_URL" 2>/dev/null)
fi

if [ -z "$code" ] || [ "${#code}" -ne 3 ]; then
  code="000"
fi

case "$code" in
  200)     icon="🟢" ; label="Brain" ;;
  401|403) icon="🟡" ; label="Brain (auth)" ;;
  *)       icon="🔴" ; label="Brain DOWN" ;;
esac

echo "$icon $label"
echo "---"
echo "Last check: $(date '+%H:%M:%S') | font=Menlo size=11"
echo "Tunnel: $TUNNEL_HEALTH_URL — HTTP $code | font=Menlo size=11"
echo "---"
echo "Open Brain Library | href=https://brain.arunp.in"
echo "Refresh now | refresh=true"
