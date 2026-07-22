#!/usr/bin/env bash
# v0.6.2 D-18: off-site SQLite backup → encrypted .gpg → Backblaze B2.
#
# ⚠️  HETZNER-ONLY. The local Mac doesn't run cron and doesn't hold the
# B2 rclone remote config. Deployed to /opt/brain/scripts/backup-offsite.sh
# and invoked every 6h by /etc/cron.d/brain-backup as user `brain`.
#
# Pipeline:
#   sqlite3 .backup → verified tmpfs /run/brain-backup-staging (raw, transient)
#   scrub + verify  → same volatile per-attempt directory
#   atomic publish  → /opt/brain/data/backups/<ts>.<unique>.sqlite (sanitized)
#   gpg --encrypt    → same volatile per-attempt directory (transient)
#   rclone copyto    → b2:<bucket>/<ts>.<unique>.sqlite.gpg
#   rm volatile attempt directory (sanitized cleartext backup stays)
#
# Failure semantics: raw bytes never land on persistent backup storage. The
# wrapper proves tmpfs, ownership, mode, and capacity before copying; low RAM
# fails closed. Normal exits and signals remove the volatile attempt. SIGKILL
# or host failure can orphan bytes only in /run, which reboot clears. A local
# filename becomes visible only after scrub and integrity checks complete.
#
# Recipient is the public half of the keypair generated 2026-05-18.
# Private half + revocation cert + passphrase live in 1Password (escrow).
# Encryption needs only the public key — no passphrase plumbing here.
#
# Restore on Mac:
#   rclone copy b2:<bucket>/<snapshot>.sqlite.gpg /tmp/
#   gpg --decrypt /tmp/<snapshot>.sqlite.gpg > /tmp/restore.sqlite
#   sqlite3 /tmp/restore.sqlite 'select count(*) from items'

set -euo pipefail
umask 077

BRAIN_DIR="/opt/brain"
DB="$BRAIN_DIR/data/brain.sqlite"
BACKUP_DIR="$BRAIN_DIR/data/backups"
SCRUB_HELPER="$BRAIN_DIR/scripts/scrub-notebooklm-backup.mjs"
STAGING_HELPER="$BRAIN_DIR/scripts/verified-volatile-backup-staging.sh"
RUNTIME_ROOT="$BRAIN_DIR/current"
BACKUP_LOCK="$BACKUP_DIR/.backup-offsite.lock"
STAGING_ROOT="${BRAIN_BACKUP_STAGING_DIR:-/run/brain-backup-staging}"
GPG_RECIPIENT="BC1CCA584E82D84B"
B2_REMOTE="b2"

for command in sqlite3 node gpg rclone flock mktemp cp ln sync chmod rm rmdir timeout date bash find; do
  command -v "$command" >/dev/null || { echo "[backup-offsite] required command missing: $command" >&2; exit 1; }
done
[[ -f "$DB" && ! -L "$DB" ]] || { echo "[backup-offsite] canonical database file is unavailable" >&2; exit 1; }
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
[[ -f "$BACKUP_LOCK" && ! -L "$BACKUP_LOCK" ]] \
  || { echo "[backup-offsite] verified shared lock is unavailable" >&2; exit 1; }
exec 9<>"$BACKUP_LOCK"
flock -x 9
# The installer publishes the wrapper and both helpers under this same lock.
# Resolve/source them only after acquiring it so no invocation can retain stale
# definitions while waiting for an upgrade to finish.
[[ -f "$SCRUB_HELPER" && -f "$STAGING_HELPER" && -f "$RUNTIME_ROOT/package.json" ]] \
  || { echo "[backup-offsite] verified scrub/staging helper or runtime is unavailable" >&2; exit 1; }
# shellcheck disable=SC1090 -- durable, attested root-owned helper
source "$STAGING_HELPER"
cleanup_stale_sanitized_backup_publications "$BACKUP_DIR"

TS="$(date -u +%Y-%m-%d_%H%M)"
STAGE_DIR="$(create_verified_volatile_backup_stage \
  "$STAGING_ROOT" "$DB" brain brain-data offsite-backup)"
RAW_SNAPSHOT="$STAGE_DIR/raw.sqlite"
ENCRYPTED="$STAGE_DIR/sanitized.sqlite.gpg"
SNAPSHOT="$BACKUP_DIR/$TS.${STAGE_DIR##*.}.sqlite"
PUBLICATION_DIR=""
PUBLICATION_FILE=""
SNAPSHOT_VERIFIED=0

cleanup_backup_attempt() {
  local status=$? cleanup_failed=0
  trap - EXIT
  trap - HUP INT TERM
  if [[ -n "$PUBLICATION_FILE" ]] && ! rm -f -- "$PUBLICATION_FILE"; then cleanup_failed=1; fi
  if [[ -n "$PUBLICATION_DIR" ]] && ! rmdir -- "$PUBLICATION_DIR" 2>/dev/null; then cleanup_failed=1; fi
  if [[ -n "$STAGE_DIR" ]]; then
    if ! fence_volatile_backup_stage_writers "$STAGE_DIR"; then
      cleanup_failed=1
    else
      if ! rm -f -- "$RAW_SNAPSHOT" "${RAW_SNAPSHOT}-wal" "${RAW_SNAPSHOT}-shm" \
        "${RAW_SNAPSHOT}-journal" "$ENCRYPTED" "$STAGE_DIR/.owner" \
        "$STAGE_DIR/.deadline" "$STAGE_DIR/.sanitized" "$STAGE_DIR/.writer" \
        "$STAGE_DIR"/.writer.tmp.* "$STAGE_DIR"/.sanitized.tmp.*; then cleanup_failed=1; fi
      if ! rmdir -- "$STAGE_DIR" 2>/dev/null; then cleanup_failed=1; fi
    fi
  fi
  if [[ "$SNAPSHOT_VERIFIED" != "1" ]]; then
    rm -f -- "$SNAPSHOT" || cleanup_failed=1
    if [[ -e "$SNAPSHOT" ]]; then
      echo "[backup-offsite] CRITICAL: unverified snapshot cleanup failed" >&2
      cleanup_failed=1
    fi
  fi
  [[ "$cleanup_failed" == "0" ]] || status=1
  exit "$status"
}
trap cleanup_backup_attempt EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# 1. WAL-safe SQLite snapshot. This is the same online-backup primitive used
#    by the in-process scheduler. The raw
#    destination is verified tmpfs; persistent backup storage is untouched.
run_volatile_backup_stage_step "$STAGE_DIR" \
  sqlite3 "$DB" ".backup '$RAW_SNAPSHOT'"

# A backup must never extend NotebookLM's short-lived frozen-content window.
# This attested helper removes title/text snapshots, clears lease material, and
# VACUUMs the copy so prior content bytes are absent from database pages.
run_volatile_backup_stage_step "$STAGE_DIR" env \
  BRAIN_SCRUB_RUNTIME_ROOT="$RUNTIME_ROOT" node "$SCRUB_HELPER" --db "$RAW_SNAPSHOT"
[[ "$(run_volatile_backup_stage_step "$STAGE_DIR" sqlite3 "$RAW_SNAPSHOT" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(run_volatile_backup_stage_step "$STAGE_DIR" sqlite3 "$RAW_SNAPSHOT" 'PRAGMA foreign_key_check;')" ]]
if [[ "$(run_volatile_backup_stage_step "$STAGE_DIR" sqlite3 "$RAW_SNAPSHOT" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notebooklm_export_requests';")" == "1" ]]; then
  [[ "$(run_volatile_backup_stage_step "$STAGE_DIR" sqlite3 "$RAW_SNAPSHOT" 'SELECT COUNT(*) FROM notebooklm_export_requests WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL;')" == "0" ]]
fi
chmod 0600 "$RAW_SNAPSHOT"
mark_volatile_backup_stage_sanitized "$STAGE_DIR"

# Copy only the verified, scrubbed image to a hidden same-filesystem candidate,
# fsync it, recheck the copy, then publish via an exclusive hard link. Readers
# never observe a partially copied or raw snapshot under a backup filename.
PUBLICATION_DIR="$(mktemp -d "$BACKUP_DIR/.backup-publication.XXXXXXXX")"
chmod 0700 "$PUBLICATION_DIR"
PUBLICATION_FILE="$PUBLICATION_DIR/sanitized.sqlite"
run_volatile_backup_stage_step "$STAGE_DIR" cp -- "$RAW_SNAPSHOT" "$PUBLICATION_FILE"
chmod 0600 "$PUBLICATION_FILE"
sync -f "$PUBLICATION_FILE"
[[ "$(sqlite3 "$PUBLICATION_FILE" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(sqlite3 "$PUBLICATION_FILE" 'PRAGMA foreign_key_check;')" ]]
[[ ! -e "$SNAPSHOT" ]]
publish_volatile_backup_stage_file "$STAGE_DIR" ln -- "$PUBLICATION_FILE" "$SNAPSHOT"
sync -f "$SNAPSHOT"
rm -f -- "$PUBLICATION_FILE"
PUBLICATION_FILE=""
rmdir -- "$PUBLICATION_DIR"
PUBLICATION_DIR=""
SNAPSHOT_VERIFIED=1

# 2. Encrypt to the public key. --batch + --yes keeps it non-interactive
#    under cron; --trust-model always avoids "untrusted recipient" prompts
#    when the public key was imported but never explicitly trusted.
run_volatile_backup_stage_step "$STAGE_DIR" gpg --batch --yes --trust-model always \
    --encrypt --recipient "$GPG_RECIPIENT" \
    --output "$ENCRYPTED" "$SNAPSHOT"

# 3. Upload encrypted blob to B2. rclone remote `b2` is configured by
#    `rclone config` (one-shot during T-1 provisioning) using the
#    B2_KEY_ID / B2_APPLICATION_KEY / B2_ENDPOINT / B2_BUCKET_NAME
#    already present in /etc/brain/.env.
REMOTE_NAME="$(basename "$SNAPSHOT").gpg"
run_volatile_backup_stage_step "$STAGE_DIR" \
  rclone copyto "$ENCRYPTED" "$B2_REMOTE:$B2_BUCKET_NAME/$REMOTE_NAME"

# 4. EXIT cleanup removes the volatile raw/encrypted files. The verified,
#    scrubbed cleartext snapshot stays for existing local retention.

echo "[backup-offsite] uploaded $REMOTE_NAME to b2:$B2_BUCKET_NAME"
