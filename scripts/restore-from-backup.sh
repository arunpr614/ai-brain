#!/usr/bin/env bash
# F-034 (v0.3.1, promoted from v0.10.0): restore data/brain.sqlite from a
# backup snapshot. Refuses to run if the Next.js dev/prod server is
# listening on 127.0.0.1:3000 (which would corrupt the live WAL).
#
# ⚠️  HETZNER-ONLY in cloud mode (v0.6.0+).
# AI Brain serves from Hetzner since v0.6.0. The live DB lives at
# /opt/brain/data/brain.sqlite on the Hetzner host, not the local Mac.
# Run this script over SSH on the Hetzner host, not on the developer Mac.
#
# Usage (Hetzner, production restore): stop the app, both NotebookLM timers
# and the retention oneshot, Processing audit, and all Recall units listed by
# the script; then run:
#   sudo /opt/brain/scripts/restore-from-backup.sh \
#     /opt/brain/data/backups/<snapshot>.sqlite
#
# Safety:
# - Refuses if the server is running.
# - Copies the selected backup into verified tmpfs, removes frozen NotebookLM
#   export snapshots there, and verifies integrity before persistent mutation.
# - Publishes a scrubbed, verified `.pre-restore` rollback copy, then scrubs the
#   stopped live file in place before atomically replacing it. No persistent
#   file or deleted-file blocks preserve frozen NotebookLM payload snapshots.
# - Rejects pre-026 snapshots. A schema-026 restore is durably provider-write
#   blocked until a separately reviewed exact-target reconciliation exists.
#
# After running, start the server and verify the library page loads.

set -euo pipefail

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "usage: scripts/restore-from-backup.sh <path-to-backup.sqlite>"
  echo ""
  echo "example: scripts/restore-from-backup.sh data/backups/brain-2026-05-08_0900.sqlite"
  exit 1
fi

# Prove every safety command before its first use. In particular, a missing
# lsof must never turn the listener check into a false "idle" result.
for command in sqlite3 node mktemp cp mv sync stat readlink findmnt flock lsof \
  id timeout date bash ln chmod chown rm rmdir dirname find; do
  command -v "$command" >/dev/null || { echo "error: required command missing: $command" >&2; exit 4; }
done

if [[ -r /etc/brain/.env ]]; then
  set -a
  # shellcheck disable=SC1091 -- root-owned production environment
  source /etc/brain/.env
  set +a
fi
BACKUP="$(readlink -e -- "$1" 2>/dev/null || true)"
TARGET="${BRAIN_DB_PATH:-/opt/brain/data/brain.sqlite}"
[[ "$TARGET" == /* ]] || { echo "error: BRAIN_DB_PATH must be absolute" >&2; exit 2; }
if [[ -e "$TARGET" ]]; then
  [[ ! -L "$TARGET" && "$(readlink -e -- "$TARGET")" == "$TARGET" ]] \
    || { echo "error: live database must be canonical and non-symlink" >&2; exit 2; }
else
  target_parent="$(dirname -- "$TARGET")"
  [[ -d "$target_parent" && ! -L "$target_parent" && "$(readlink -e -- "$target_parent")" == "$target_parent" ]] \
    || { echo "error: live database parent must be canonical and non-symlink" >&2; exit 2; }
fi
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SIDELINE="${TARGET}.pre-restore-${TIMESTAMP}.sanitized.bak"
STAGING_ROOT="${BRAIN_ROOT_BACKUP_STAGING_DIR:-/run/brain-root-backup-staging}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
STAGING_HELPER="$SCRIPT_DIR/verified-volatile-backup-staging.sh"
SCRUB_HELPER="$SCRIPT_DIR/scrub-notebooklm-backup.mjs"
NOTEBOOKLM_RESTORE_BLOCK_REASON=restore_reconciliation_required
RUNTIME_ROOT="/opt/brain/current"
PRODUCTION_RESTORE=0
if [[ -f /etc/brain/.env ]]; then
  PRODUCTION_RESTORE=1
fi
if [[ "$PRODUCTION_RESTORE" == "1" && ! -f "$RUNTIME_ROOT/package.json" ]]; then
  echo "error: attested current runtime is unavailable; production restore cannot downgrade safety mode" >&2
  exit 2
elif [[ ! -f "$RUNTIME_ROOT/package.json" ]]; then
  RUNTIME_ROOT="$(dirname -- "$SCRIPT_DIR")"
fi

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

staging_owner="$(id -un)"
staging_group="$(id -gn)"
if [[ "$PRODUCTION_RESTORE" == "1" ]]; then
  command -v systemctl >/dev/null \
    || { echo "error: required production command missing: systemctl" >&2; exit 4; }
  [[ "$(id -u)" == "0" ]] || { echo "error: production restore must run as root" >&2; exit 3; }
  staging_owner=root
  staging_group=root
  for unit in \
    brain.service brain-notebooklm-operations.service brain-notebooklm-operations.timer \
    brain-notebooklm-retention.service brain-notebooklm-retention.timer \
    brain-processing-audit.service brain-processing-audit.timer \
    brain-recall-sync.service brain-recall-sync.timer \
    brain-recall-manual-sync.service brain-recall-manual-sync.path brain-recall-manual-sync.timer; do
    state="$(systemctl is-active "$unit" 2>/dev/null || true)"
    case "$state" in
      active|activating|reloading|deactivating)
        echo "error: $unit is $state; stop all restore writer/timer units first" >&2
        exit 3
        ;;
    esac
  done
  release_lock=/run/brain-release.lock
  backup_lock=/opt/brain/data/backups/.backup-offsite.lock
  recall_lock=/run/brain-recall/recall-sync.lock
  for lock_path in "$release_lock" "$backup_lock" "$recall_lock"; do
    [[ -f "$lock_path" && ! -L "$lock_path" ]] \
      || { echo "error: required maintenance lock is unavailable or unsafe: $lock_path" >&2; exit 3; }
  done
  [[ "$(stat -Lc '%U:%G:%a' -- "$release_lock")" == "root:root:600" ]] \
    || { echo "error: release maintenance lock identity is unsafe" >&2; exit 3; }
  [[ "$(stat -Lc '%U:%G:%a' -- "$backup_lock")" == "brain:brain-data:660" ]] \
    || { echo "error: backup maintenance lock identity is unsafe" >&2; exit 3; }
  [[ "$(stat -Lc '%U:%G:%a' -- "$recall_lock")" == "brain-recall:brain-recall:600" ]] \
    || { echo "error: Recall maintenance lock identity is unsafe" >&2; exit 3; }
  release_lock_identity="$(stat -Lc '%d:%i' -- "$release_lock")"
  backup_lock_identity="$(stat -Lc '%d:%i' -- "$backup_lock")"
  recall_lock_identity="$(stat -Lc '%d:%i' -- "$recall_lock")"
  exec 7<"$release_lock"
  [[ ! -L "$release_lock" && "$(stat -Lc '%d:%i' -- "$release_lock")" == "$release_lock_identity" && \
     "$(stat -Lc '%d:%i' -- /proc/$$/fd/7)" == "$release_lock_identity" ]] \
    || { echo "error: release maintenance lock identity changed" >&2; exit 3; }
  flock -n 7 || { echo "error: release maintenance lock is busy" >&2; exit 3; }
  exec 8<"$backup_lock"
  [[ ! -L "$backup_lock" && "$(stat -Lc '%d:%i' -- "$backup_lock")" == "$backup_lock_identity" && \
     "$(stat -Lc '%d:%i' -- /proc/$$/fd/8)" == "$backup_lock_identity" ]] \
    || { echo "error: backup maintenance lock identity changed" >&2; exit 3; }
  flock -n 8 || { echo "error: backup maintenance lock is busy" >&2; exit 3; }
  exec 9<"$recall_lock"
  [[ ! -L "$recall_lock" && "$(stat -Lc '%d:%i' -- "$recall_lock")" == "$recall_lock_identity" && \
     "$(stat -Lc '%d:%i' -- /proc/$$/fd/9)" == "$recall_lock_identity" ]] \
    || { echo "error: Recall maintenance lock identity changed" >&2; exit 3; }
  flock -n 9 || { echo "error: Recall maintenance lock is busy" >&2; exit 3; }
  # Close the check-to-lock race: all writers/timers must still be stopped
  # after the three maintenance locks have been acquired.
  for unit in \
    brain.service brain-notebooklm-operations.service brain-notebooklm-operations.timer \
    brain-notebooklm-retention.service brain-notebooklm-retention.timer \
    brain-processing-audit.service brain-processing-audit.timer \
    brain-recall-sync.service brain-recall-sync.timer \
    brain-recall-manual-sync.service brain-recall-manual-sync.path brain-recall-manual-sync.timer; do
    state="$(systemctl is-active "$unit" 2>/dev/null || true)"
    case "$state" in
      active|activating|reloading|deactivating)
        echo "error: $unit became $state while acquiring restore locks" >&2
        exit 3
        ;;
    esac
  done
fi
[[ -f "$STAGING_HELPER" && ! -L "$STAGING_HELPER" && -f "$SCRUB_HELPER" && ! -L "$SCRUB_HELPER" ]] \
  || { echo "error: verified volatile-staging or scrub helper is unavailable" >&2; exit 4; }
# Installer publication uses the backup lock above; resolve/source only after
# holding it so this process cannot retain stale helper definitions.
# shellcheck disable=SC1090 -- packaged, attested helper
source "$STAGING_HELPER"
cleanup_stale_sanitized_backup_publications "$(dirname -- "$TARGET")"

capacity_source="$BACKUP"
if [[ -f "$TARGET" && "$(stat -c '%s' "$TARGET")" -gt "$(stat -c '%s' "$BACKUP")" ]]; then
  capacity_source="$TARGET"
fi
stage="$(create_verified_volatile_backup_stage \
  "$STAGING_ROOT" "$capacity_source" "$staging_owner" "$staging_group" restore-backup)"
candidate="$stage/restore.sqlite"
previous="$stage/previous.sqlite"
publication_dir=""
publication_file=""
rollback_publication=""
rollback_publication_file=""
restore_block_latched=0
cleanup_restore() {
  local status=$?
  trap - EXIT HUP INT TERM
  [[ -z "$publication_file" ]] || rm -f -- "$publication_file"
  [[ -z "$publication_dir" ]] || rmdir -- "$publication_dir" 2>/dev/null || status=1
  [[ -z "$rollback_publication_file" ]] || rm -f -- "$rollback_publication_file"
  [[ -z "$rollback_publication" ]] || rmdir -- "$rollback_publication" 2>/dev/null || status=1
  if ! fence_volatile_backup_stage_writers "$stage"; then
    status=1
  else
    rm -f -- "$candidate" "${candidate}-wal" "${candidate}-shm" "${candidate}-journal" \
      "$previous" "${previous}-wal" "${previous}-shm" "${previous}-journal" \
      "$stage/.owner" "$stage/.deadline" "$stage/.sanitized" "$stage/.writer" \
      "$stage"/.writer.tmp.* "$stage"/.sanitized.tmp.* || status=1
    rmdir -- "$stage" 2>/dev/null || status=1
  fi
  exit "$status"
}
trap cleanup_restore EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

run_volatile_backup_stage_step "$stage" \
  sqlite3 "$BACKUP" ".backup '$candidate'"
run_volatile_backup_stage_step "$stage" env \
  BRAIN_SCRUB_RUNTIME_ROOT="$RUNTIME_ROOT" node "$SCRUB_HELPER" --db "$candidate" >/dev/null
[[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" 'PRAGMA quick_check;')" == "ok" ]]
[[ -z "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" 'PRAGMA foreign_key_check;')" ]]
if [[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notebooklm_export_requests';")" == "1" ]]; then
  [[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" 'SELECT COUNT(*) FROM notebooklm_export_requests WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL;')" == "0" ]]
fi
# Restoring an older local ledger cannot prove that the private NotebookLM
# target contains no sources created after the backup. Persistently stop all
# future provider creates before publication. The ordinary protocol-reset API
# explicitly refuses this distinct reason; only a separately reviewed,
# evidence-based restore reconciliation command may clear it.
has_migration_026=0
if [[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" \
  "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='_migrations';")" == "1" ]]; then
  has_migration_026="$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" \
    "SELECT COUNT(*) FROM _migrations WHERE name='026_notebooklm_export.sql';")"
fi
if [[ "$has_migration_026" != "1" ]]; then
  echo "error: restore candidate predates NotebookLM migration 026 and cannot carry the required post-restore provider-write latch" >&2
  echo "use a separately reviewed feature-aware migration and remote reconciliation procedure before restoring this snapshot" >&2
  exit 6
fi
[[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('notebooklm_runtime_control','notebooklm_operational_events');")" == "2" ]]
# Date's nanosecond formatting is GNU-specific. Node is already a required
# restore dependency and gives the same millisecond epoch on Linux and macOS.
restore_latched_at="$(node -e 'process.stdout.write(String(Date.now()))')"
[[ "$restore_latched_at" =~ ^[0-9]{13}$ ]]
latch_changes="$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" \
  "BEGIN IMMEDIATE;
   UPDATE notebooklm_runtime_control
   SET provider_write_blocked=1,
       block_reason='$NOTEBOOKLM_RESTORE_BLOCK_REASON',
       updated_at=MAX(updated_at,$restore_latched_at)
   WHERE id=1;
   SELECT changes();
   INSERT INTO notebooklm_operational_events(event_type,safe_reason,created_at)
   VALUES('notebooklm.restore_write_block_latched','$NOTEBOOKLM_RESTORE_BLOCK_REASON',$restore_latched_at);
   COMMIT;")"
[[ "$latch_changes" == "1" ]]
[[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$candidate" \
  "SELECT provider_write_blocked || ':' || COALESCE(block_reason,'') FROM notebooklm_runtime_control WHERE id=1;")" \
  == "1:$NOTEBOOKLM_RESTORE_BLOCK_REASON" ]]
restore_block_latched=1
if [[ "$PRODUCTION_RESTORE" == "1" ]]; then
  migration_check="$RUNTIME_ROOT/scripts/check-release-migration-compatibility.mjs"
  [[ -f "$migration_check" && -f "$RUNTIME_ROOT/release-manifest.json" ]] \
    || { echo "error: current attested migration-compatibility evidence is unavailable" >&2; exit 5; }
  run_volatile_backup_stage_step "$stage" node "$migration_check" \
    "$RUNTIME_ROOT" "$RUNTIME_ROOT/release-manifest.json" "$candidate" 0 "" "" "" \
    "$restore_block_latched" >/dev/null
fi

if [[ -f "$TARGET" ]]; then
  [[ ! -e "$SIDELINE" ]]
  run_volatile_backup_stage_step "$stage" \
    sqlite3 "$TARGET" ".backup '$previous'"
  run_volatile_backup_stage_step "$stage" env \
    BRAIN_SCRUB_RUNTIME_ROOT="$RUNTIME_ROOT" node "$SCRUB_HELPER" --db "$previous" >/dev/null
  [[ "$(run_volatile_backup_stage_step "$stage" sqlite3 "$previous" 'PRAGMA quick_check;')" == "ok" ]]
  mark_volatile_backup_stage_sanitized "$stage"
  rollback_publication="$(mktemp -d "$(dirname -- "$SIDELINE")/.restore-rollback-publication.XXXXXXXX")"
  chmod 0700 "$rollback_publication"
  rollback_publication_file="$rollback_publication/sanitized.sqlite"
  cp -- "$previous" "$rollback_publication_file"
  if [[ "$PRODUCTION_RESTORE" == "1" ]]; then chown brain:brain-data "$rollback_publication_file"; fi
  chmod 0660 "$rollback_publication_file"
  sync -f "$rollback_publication_file"
  [[ "$(sqlite3 "$rollback_publication_file" 'PRAGMA quick_check;')" == "ok" ]]
  publish_volatile_backup_stage_file "$stage" \
    ln -- "$rollback_publication_file" "$SIDELINE"
  sync -f "$SIDELINE"
  rm -f -- "$rollback_publication_file"
  rollback_publication_file=""
  rmdir -- "$rollback_publication"
  rollback_publication=""

  # Before unlinking/replacing the stopped live file, physically remove its
  # short-lived snapshot bytes so deleted filesystem blocks cannot become a
  # second retention channel.
  run_volatile_backup_stage_step "$stage" env \
    BRAIN_SCRUB_RUNTIME_ROOT="$RUNTIME_ROOT" node "$SCRUB_HELPER" --db "$TARGET" >/dev/null
  [[ "$(sqlite3 "$TARGET" 'PRAGMA quick_check;')" == "ok" ]]
else
  mark_volatile_backup_stage_sanitized "$stage"
fi

publication_dir="$(mktemp -d "$(dirname -- "$TARGET")/.restore-publication.XXXXXXXX")"
chmod 0700 "$publication_dir"
publication_file="$publication_dir/sanitized.sqlite"
run_volatile_backup_stage_step "$stage" cp -- "$candidate" "$publication_file"
if [[ "$PRODUCTION_RESTORE" == "1" ]]; then chown brain:brain-data "$publication_file"; fi
chmod 0660 "$publication_file"
sync -f "$publication_file"
[[ "$(sqlite3 "$publication_file" 'PRAGMA quick_check;')" == "ok" ]]

if [[ -f "$TARGET" ]]; then
  # The app is stopped, so consolidate any final WAL pages before replacing the
  # main file. Until the atomic rename below, the previous database stays live.
  sqlite3 "$TARGET" 'PRAGMA wal_checkpoint(TRUNCATE);' >/dev/null
  rm -f -- "$TARGET-wal" "$TARGET-shm" "$TARGET-journal"
fi

echo "atomically restoring sanitized $BACKUP → $TARGET"
publish_volatile_backup_stage_file "$stage" mv -f -- "$publication_file" "$TARGET"
publication_file=""
sync -f "$TARGET"
rmdir -- "$publication_dir"
publication_dir=""
[[ "$(sqlite3 "$TARGET" 'PRAGMA quick_check;')" == "ok" ]]
if [[ "$restore_block_latched" == "1" ]]; then
  [[ "$(sqlite3 "$TARGET" "SELECT provider_write_blocked || ':' || COALESCE(block_reason,'') FROM notebooklm_runtime_control WHERE id=1;")" \
    == "1:$NOTEBOOKLM_RESTORE_BLOCK_REASON" ]]
fi

echo ""
echo "restore complete."
echo ""
echo "next steps:"
echo "  1. start brain  (Hetzner: sudo systemctl restart brain | Mac local-dev: npm run dev)"
next_step=2
if [[ "$PRODUCTION_RESTORE" == "1" ]]; then
  echo "  2. resume both independent NotebookLM timers; this does not clear the provider-write latch:"
  echo "     sudo systemctl enable --now brain-notebooklm-retention.timer brain-notebooklm-operations.timer"
  echo "  3. verify both timers and execution-prove the mutating fallback:"
  echo "     sudo systemctl is-enabled brain-notebooklm-retention.timer brain-notebooklm-operations.timer"
  echo "     sudo systemctl is-active brain-notebooklm-retention.timer brain-notebooklm-operations.timer"
  echo "     sudo systemctl start brain-notebooklm-retention.service"
  echo "     test \"\$(sudo systemctl show --property=Result --value brain-notebooklm-retention.service)\" = success"
  next_step=4
fi
echo "  $next_step. unlock with your PIN"
next_step=$((next_step + 1))
echo "  $next_step. verify the library page loads"
if [[ "$restore_block_latched" == "1" ]]; then
  next_step=$((next_step + 1))
  echo "  $next_step. confirm NotebookLM provider writes remain intentionally blocked: $NOTEBOOKLM_RESTORE_BLOCK_REASON"
  echo "     reconcile the private target against post-backup markers/sources; the ordinary reset cannot clear this block"
fi
echo ""
echo "if something is wrong, stop the server and restore another verified snapshot."
if [[ -f "$SIDELINE" ]]; then
  echo "the scrubbed previous database is preserved at:"
  echo "  $SIDELINE"
fi
