#!/usr/bin/env bash
# v0.6.2 D-18: off-site SQLite backup → encrypted .gpg → Backblaze B2.
#
# ⚠️  HETZNER-ONLY. The local Mac doesn't run cron and doesn't hold the
# B2 rclone remote config. Deployed to /opt/brain/scripts/backup-offsite.sh
# and invoked every 6h by /etc/cron.d/brain-backup as user `brain`.
#
# Pipeline:
#   sqlite3 .backup → /opt/brain/data/backups/<ts>.sqlite (cleartext, kept;
#                       feeds the existing 28-snapshot in-process rotation)
#   gpg --encrypt    → /opt/brain/data/backups/<ts>.sqlite.gpg (transient)
#   rclone copyto    → b2:<bucket>/<ts>.sqlite.gpg
#   rm <ts>.sqlite.gpg (transient encrypted file removed; cleartext stays)
#
# Failure semantics: best-effort. If gpg or rclone fail, the cleartext
# local snapshot still exists — it is the authoritative backup. Off-site
# is paranoia tier. Errors logged and the script exits non-zero so cron
# email/syslog surfaces them; the next 6h tick is independent.
#
# Recipient is the public half of the keypair generated 2026-05-18.
# Private half + revocation cert + passphrase live in 1Password (escrow).
# Encryption needs only the public key — no passphrase plumbing here.
#
# Restore on Mac:
#   rclone copy b2:<bucket>/<ts>.sqlite.gpg /tmp/
#   gpg --decrypt /tmp/<ts>.sqlite.gpg > /tmp/restore.sqlite
#   sqlite3 /tmp/restore.sqlite 'select count(*) from items'

set -euo pipefail

BRAIN_DIR="/opt/brain"
DB="$BRAIN_DIR/data/brain.sqlite"
BACKUP_DIR="$BRAIN_DIR/data/backups"
GPG_RECIPIENT="BC1CCA584E82D84B"
B2_REMOTE="b2"

# Source /etc/brain/.env for B2_BUCKET_NAME (set by cutover provisioning).
# .env is owned by root:brain mode 640 — readable by the brain user.
if [[ -r /etc/brain/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/brain/.env
  set +a
fi

if [[ -z "${B2_BUCKET_NAME:-}" ]]; then
  echo "[backup-offsite] B2_BUCKET_NAME not set in /etc/brain/.env" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y-%m-%d_%H%M)"
SNAPSHOT="$BACKUP_DIR/$TS.sqlite"
ENCRYPTED="$SNAPSHOT.gpg"

# 1. WAL-safe SQLite snapshot. Same primitive used by the in-process
#    scheduler (VACUUM INTO) — `.backup` is the CLI equivalent and
#    flushes WAL into the destination.
sqlite3 "$DB" ".backup '$SNAPSHOT'"

# 2. Encrypt to the public key. --batch + --yes keeps it non-interactive
#    under cron; --trust-model always avoids "untrusted recipient" prompts
#    when the public key was imported but never explicitly trusted.
gpg --batch --yes --trust-model always \
    --encrypt --recipient "$GPG_RECIPIENT" \
    --output "$ENCRYPTED" "$SNAPSHOT"

# 3. Upload encrypted blob to B2. rclone remote `b2` is configured by
#    `rclone config` (one-shot during T-1 provisioning) using the
#    B2_KEY_ID / B2_APPLICATION_KEY / B2_ENDPOINT / B2_BUCKET_NAME
#    already present in /etc/brain/.env.
rclone copyto "$ENCRYPTED" "$B2_REMOTE:$B2_BUCKET_NAME/$(basename "$ENCRYPTED")"

# 4. Remove the transient encrypted file. The cleartext snapshot stays
#    so the existing in-process retention (28 snapshots) keeps working.
rm -f "$ENCRYPTED"

echo "[backup-offsite] uploaded $TS.sqlite.gpg to b2:$B2_BUCKET_NAME"
