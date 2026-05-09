#!/usr/bin/env bash
# v0.5.0 T-8 / F-037 — rotate BRAIN_LAN_TOKEN from the CLI.
#
# Thin wrapper around POST /api/settings/rotate-token. The server owns the
# .env write so the running process stays in sync with disk; this script
# exists so an operator can rotate without opening the web UI (e.g., after
# a suspected token leak they want to close fast).
#
# Requires the server to be running AND a valid session cookie — since
# this is CLI, we use a shared setup: the operator runs `npm run dev:lan`
# in another terminal, signs in via /unlock, exports the session cookie
# value as BRAIN_SESSION_COOKIE, and then runs this script.
#
# The QR rendered in the terminal after rotation is a convenience for
# pairing a fresh APK over a shell (when the web UI isn't handy).
#
# Usage:
#   BRAIN_SESSION_COOKIE=<cookie-value> ./scripts/rotate-token.sh
#   BRAIN_BASE_URL=http://127.0.0.1:3000 ./scripts/rotate-token.sh

set -euo pipefail

BASE_URL="${BRAIN_BASE_URL:-http://127.0.0.1:3000}"
COOKIE="${BRAIN_SESSION_COOKIE:-}"

if [[ -z "${COOKIE}" ]]; then
  echo "[rotate-token] BRAIN_SESSION_COOKIE not set." >&2
  echo "  1. Open ${BASE_URL}/unlock in your browser and sign in." >&2
  echo "  2. Copy the value of the 'brain-session' cookie." >&2
  echo "  3. Re-run:  BRAIN_SESSION_COOKIE=<value> $0" >&2
  exit 1
fi

echo "[rotate-token] POST ${BASE_URL}/api/settings/rotate-token"

response=$(
  curl --silent --show-error --fail \
    --request POST \
    --cookie "brain-session=${COOKIE}" \
    "${BASE_URL}/api/settings/rotate-token" \
  || { echo "[rotate-token] request failed" >&2; exit 2; }
)

if [[ "${response}" != *'"ok":true'* ]]; then
  echo "[rotate-token] unexpected response: ${response}" >&2
  exit 3
fi

echo "[rotate-token] Token rotated. All paired APKs and the Chrome extension must re-pair."
echo "[rotate-token] Fetching new QR from /api/settings/lan-info for terminal display..."

info=$(
  curl --silent --show-error --fail \
    --cookie "brain-session=${COOKIE}" \
    "${BASE_URL}/api/settings/lan-info" \
  || { echo "[rotate-token] lan-info fetch failed" >&2; exit 4; }
)

# Prefer a server-side QR printed via qrcode-terminal so the operator can
# scan it from the shell without opening the browser. Pipe the setup_uri
# (not the token alone) through qrcode-terminal; fall back to printing
# the URI if qrcode-terminal isn't available.
setup_uri=$(echo "${info}" | sed -n 's/.*"setup_uri":"\([^"]*\)".*/\1/p')
if [[ -z "${setup_uri}" ]]; then
  echo "[rotate-token] could not parse setup_uri from response" >&2
  exit 5
fi

if command -v npx >/dev/null 2>&1; then
  npx --no-install qrcode-terminal "${setup_uri}" 2>/dev/null \
    || echo "[rotate-token] setup URI: ${setup_uri}"
else
  echo "[rotate-token] setup URI: ${setup_uri}"
fi
