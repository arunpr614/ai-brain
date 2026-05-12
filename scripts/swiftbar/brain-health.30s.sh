#!/bin/bash
#
# SwiftBar plugin — AI Brain local-stack health indicator
#
# Filename convention: `brain-health.30s.sh` → the `30s` tells SwiftBar
# to run this script every 30 seconds. Rename to `.10s.sh` for faster
# refresh or `.1m.sh` for slower.
#
# Output protocol (SwiftBar / xbar compatible):
#   Line 1          = menu bar text (+ optional color/image attributes)
#   "---" separator = start of dropdown menu
#   Subsequent lines = dropdown items
#
# Icon colors used:
#   🟢 green   — all three required layers healthy
#   🟠 orange  — capture works, but Ollama is down (enrichment will queue)
#   🟡 yellow  — tunnel reachable externally but local daemons misbehaving
#   🔴 red     — tunnel unreachable — extension and APK WILL fail
#   ⚪ grey    — still probing (first 1–2 seconds after launch)
#
# Pitfalls handled:
#   - SwiftBar runs with a minimal PATH; we use absolute /usr/bin/curl
#   - 5-second timeout per probe so slow Wi-Fi doesn't hang the icon
#   - Silent failures fall through to red with a descriptive dropdown

CURL="/usr/bin/curl"

# Layer endpoints — adjust if you changed ports or tunnel hostname.
NEXTJS_URL="http://127.0.0.1:3000"
CLOUDFLARED_READY_URL="http://127.0.0.1:20241/ready"
TUNNEL_HEALTH_URL="https://brain.arunp.in/api/health"
OLLAMA_URL="http://127.0.0.1:11434"

# --- Probe helpers ---------------------------------------------------

# Returns HTTP status code, or "000" on network failure / timeout.
# curl's `-w "%{http_code}"` emits "000" on connection refused; if
# curl itself errors out before that (rare), we still want a 3-digit
# fallback. Using `|| true` lets the `|| echo` fire only on total
# failure without concatenating to the 000 curl already emitted.
probe_status() {
  local code
  code=$("$CURL" -s -o /dev/null -m 5 -w "%{http_code}" "$1" 2>/dev/null)
  if [ -z "$code" ] || [ "${#code}" -ne 3 ]; then
    echo "000"
  else
    echo "$code"
  fi
}

# Returns 0 if response body is non-empty, 1 otherwise.
probe_body_nonempty() {
  local body
  body=$("$CURL" -s -m 5 "$1" 2>/dev/null)
  [ -n "$body" ]
}

# --- Run the four probes --------------------------------------------

nextjs_code=$(probe_status "$NEXTJS_URL")
cloudflared_code=$(probe_status "$CLOUDFLARED_READY_URL")
tunnel_code=$(probe_status "$TUNNEL_HEALTH_URL")

if probe_body_nonempty "$OLLAMA_URL"; then
  ollama_ok=1
else
  ollama_ok=0
fi

# --- Classify overall state ------------------------------------------
# Priority: red > yellow > orange > green.
#
# "Up" = ANY HTTP response in 1xx–4xx (the server reached us and said
# something — a 307 redirect or 401 auth challenge still proves the
# process is alive and listening). "Down" = 000 (connection refused /
# timeout) OR 5xx (upstream bad gateway, internal error). This is
# intentionally forgiving: we only want to light up red when the
# extension / APK will genuinely fail, not when an auth-gated route
# correctly challenges an unauthed probe.

is_reachable() {
  local code="$1"
  # 000 = no connection at all. 5xx = server errors (incl. 502 = tunnel
  # can't reach origin). Everything else (1xx-4xx) = the layer responded.
  case "$code" in
    000|5*) return 1 ;;
    *) return 0 ;;
  esac
}

if ! is_reachable "$tunnel_code"; then
  icon="🔴"
  label="Brain DOWN"
elif ! is_reachable "$nextjs_code" || ! is_reachable "$cloudflared_code"; then
  # Tunnel is reachable externally, but a local daemon is misbehaving
  # (cached response from Cloudflare edge, or weird state). Rare.
  icon="🟡"
  label="Brain degraded"
elif [ "$ollama_ok" -eq 0 ]; then
  # Capture works but enrichment queue will stall.
  icon="🟠"
  label="Brain (no AI)"
else
  icon="🟢"
  label="Brain"
fi

# --- Emit SwiftBar output --------------------------------------------

echo "$icon $label"
echo "---"
echo "Last check: $(date '+%H:%M:%S') | font=Menlo size=11"
echo "---"

# Per-layer breakdown for the dropdown. Users don't read it often but
# when something is red, this tells them which layer failed.
if is_reachable "$nextjs_code"; then
  echo "✅ Next.js server (127.0.0.1:3000) — HTTP $nextjs_code | font=Menlo size=11"
else
  echo "❌ Next.js server (127.0.0.1:3000) — HTTP $nextjs_code | color=red font=Menlo size=11"
fi

if is_reachable "$cloudflared_code"; then
  echo "✅ cloudflared daemon (127.0.0.1:20241) | font=Menlo size=11"
else
  echo "❌ cloudflared daemon (127.0.0.1:20241) — HTTP $cloudflared_code | color=red font=Menlo size=11"
fi

if is_reachable "$tunnel_code"; then
  echo "✅ Tunnel end-to-end (brain.arunp.in) — HTTP $tunnel_code | font=Menlo size=11"
else
  echo "❌ Tunnel end-to-end (brain.arunp.in) — HTTP $tunnel_code | color=red font=Menlo size=11"
fi

if [ "$ollama_ok" -eq 1 ]; then
  echo "✅ Ollama (127.0.0.1:11434) | font=Menlo size=11"
else
  echo "⚠️  Ollama (127.0.0.1:11434) — not responding | color=orange font=Menlo size=11"
fi

echo "---"
echo "Open Brain Library | href=https://brain.arunp.in"
echo "Refresh now | refresh=true"
