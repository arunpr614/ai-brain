#!/usr/bin/env bash
# F-034 (v0.3.1, promoted from v0.10.0): restore data/brain.sqlite from a
# backup snapshot. Refuses to run if the Next.js dev/prod server is
# listening on 127.0.0.1:3000 (which would corrupt the live WAL).
#
# ⚠️  HETZNER-ONLY in cloud mode (v0.6.0+).
# AI Brain serves from Hetzner since v0.6.0. The live DB lives at
# /opt/brain/data/brain.sqlite on the Hetzner host, not the local Mac.
# Run this script over SSH on the Hetzner host, not on the developer Mac.
# A Mac-local invocation only restores a local-dev sandbox DB and has no
# effect on the production Brain at brain.arunp.in.
#
# Usage (Hetzner, production restore):
#   ssh hetzner 'sudo systemctl stop brain && \
#     sudo -u brain /opt/brain/scripts/restore-from-backup.sh \
#       /opt/brain/data/backups/<snapshot>.sqlite && \
#     sudo systemctl start brain'
#
# Usage (Mac, local-dev sandbox only):
#   scripts/restore-from-backup.sh data/backups/<snapshot>.sqlite
#
# Safety:
# - Refuses if the server is running.
# - Moves the current DB aside to data/brain.sqlite.pre-restore-<ts>.bak
#   instead of deleting it, so an operator mistake can be reversed.
# - Fails fast on any missing file or dir.
#
# After running, start the server and verify the library page loads.

set -euo pipefail

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "usage: scripts/restore-from-backup.sh <path-to-backup.sqlite>"
  echo ""
  echo "example: scripts/restore-from-backup.sh data/backups/brain-2026-05-08_0900.sqlite"
  exit 1
fi

BACKUP="$1"
TARGET="data/brain.sqlite"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SIDELINE="data/brain.sqlite.pre-restore-${TIMESTAMP}.bak"

if [[ ! -f "$BACKUP" ]]; then
  echo "error: backup file not found: $BACKUP" >&2
  exit 2
fi

# Refuse if the server is up — restoring while the app holds open file
# handles to the WAL corrupts both the backup read and the live DB.
if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "error: something is listening on 127.0.0.1:3000 (likely \`npm run dev\` or \`npm run start\`)." >&2
  echo "       stop the server, then re-run this script." >&2
  exit 3
fi

mkdir -p data

if [[ -f "$TARGET" ]]; then
  echo "moving existing $TARGET → $SIDELINE"
  mv "$TARGET" "$SIDELINE"
  # The WAL sidecars must go too — they belong to the pre-restore DB.
  for sidecar in "$TARGET-shm" "$TARGET-wal"; do
    if [[ -f "$sidecar" ]]; then
      mv "$sidecar" "${sidecar}.pre-restore-${TIMESTAMP}.bak"
    fi
  done
fi

echo "copying $BACKUP → $TARGET"
cp "$BACKUP" "$TARGET"

echo ""
echo "restore complete."
echo ""
echo "next steps:"
echo "  1. start brain  (Hetzner: sudo systemctl restart brain | Mac local-dev: npm run dev)"
echo "  2. unlock with your PIN"
echo "  3. verify the library page loads"
echo ""
echo "if something is wrong, the previous DB is preserved at:"
echo "  $SIDELINE"
