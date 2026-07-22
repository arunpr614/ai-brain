#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DURABLE_SCRIPTS=/opt/brain/scripts
BACKUP_DIR=/opt/brain/data/backups
INSTALL_LOCK="$BACKUP_DIR/.backup-offsite.lock"
TMPFILES_PATH=/etc/tmpfiles.d/brain-backup-staging.conf
TMPFILES_SOURCE="$SCRIPT_DIR/brain-backup-staging.tmpfiles.conf"
if [[ ! -f "$TMPFILES_SOURCE" ]]; then
  TMPFILES_SOURCE="$SCRIPT_DIR/deploy/brain-backup-staging.tmpfiles.conf"
fi
CLEANUP_SERVICE_SOURCE="$SCRIPT_DIR/brain-backup-staging-cleanup.service"
if [[ ! -f "$CLEANUP_SERVICE_SOURCE" ]]; then
  CLEANUP_SERVICE_SOURCE="$SCRIPT_DIR/deploy/brain-backup-staging-cleanup.service"
fi
CLEANUP_TIMER_SOURCE="$SCRIPT_DIR/brain-backup-staging-cleanup.timer"
if [[ ! -f "$CLEANUP_TIMER_SOURCE" ]]; then
  CLEANUP_TIMER_SOURCE="$SCRIPT_DIR/deploy/brain-backup-staging-cleanup.timer"
fi
RECALL_DROPIN_SOURCE="$SCRIPT_DIR/brain-recall-backup-staging.drop-in.conf"
if [[ ! -f "$RECALL_DROPIN_SOURCE" ]]; then
  RECALL_DROPIN_SOURCE="$SCRIPT_DIR/deploy/brain-recall-backup-staging.drop-in.conf"
fi
HELPER_STAGE=""
BACKUP_STAGE=""
STAGING_HELPER_STAGE=""
CLEANUP_HELPER_STAGE=""
TMPFILES_STAGE=""
PREFLIGHT_STAGE=""
RESTORE_STAGE=""

cleanup() {
  local status=$?
  trap - EXIT
  if [[ -n "$HELPER_STAGE" ]] && ! rm -f -- "$HELPER_STAGE"; then status=1; fi
  if [[ -n "$BACKUP_STAGE" ]] && ! rm -f -- "$BACKUP_STAGE"; then status=1; fi
  if [[ -n "$STAGING_HELPER_STAGE" ]] && ! rm -f -- "$STAGING_HELPER_STAGE"; then status=1; fi
  if [[ -n "$CLEANUP_HELPER_STAGE" ]] && ! rm -f -- "$CLEANUP_HELPER_STAGE"; then status=1; fi
  if [[ -n "$TMPFILES_STAGE" ]] && ! rm -f -- "$TMPFILES_STAGE"; then status=1; fi
  if [[ -n "$PREFLIGHT_STAGE" ]] && ! rm -f -- "$PREFLIGHT_STAGE"; then status=1; fi
  if [[ -n "$RESTORE_STAGE" ]] && ! rm -f -- "$RESTORE_STAGE"; then status=1; fi
  exit "$status"
}
trap cleanup EXIT

[[ "$(id -u)" == "0" ]] || { echo "[install-backup-tools] must run as root" >&2; exit 1; }
for command in install flock mktemp mv sha256sum cut chown chmod stat systemd-tmpfiles systemctl findmnt find readlink node runuser timeout setsid ps sleep sqlite3 lsof; do
  command -v "$command" >/dev/null || { echo "[install-backup-tools] required command missing: $command" >&2; exit 1; }
done
for source in "$SCRIPT_DIR/backup-offsite.sh" "$SCRIPT_DIR/scrub-notebooklm-backup.mjs" \
  "$SCRIPT_DIR/verified-volatile-backup-staging.sh" "$TMPFILES_SOURCE"; do
  [[ -f "$source" && ! -L "$source" ]] || { echo "[install-backup-tools] attested source tool is unavailable" >&2; exit 1; }
done
for source in "$SCRIPT_DIR/cleanup-volatile-backup-staging.mjs" "$CLEANUP_SERVICE_SOURCE" "$CLEANUP_TIMER_SOURCE" "$RECALL_DROPIN_SOURCE"; do
  [[ -f "$source" && ! -L "$source" ]] || { echo "[install-backup-tools] attested cleanup source is unavailable" >&2; exit 1; }
done
for source in "$SCRIPT_DIR/recall-first-apply-preflight.mjs" "$SCRIPT_DIR/restore-from-backup.sh"; do
  [[ -f "$source" && ! -L "$source" ]] || { echo "[install-backup-tools] attested restore/preflight source is unavailable" >&2; exit 1; }
done

install -d -o root -g brain-data -m 0750 "$DURABLE_SCRIPTS"
install -d -o brain -g brain-data -m 2770 "$BACKUP_DIR"
install -d -o root -g root -m 0755 /etc/tmpfiles.d
[[ ! -L "$INSTALL_LOCK" ]] || { echo "[install-backup-tools] lock path must not be a symlink" >&2; exit 1; }
if [[ ! -e "$INSTALL_LOCK" ]]; then
  install -o brain -g brain-data -m 0660 /dev/null "$INSTALL_LOCK"
fi
[[ -f "$INSTALL_LOCK" && ! -L "$INSTALL_LOCK" ]]
chown brain:brain-data "$INSTALL_LOCK"
chmod 0660 "$INSTALL_LOCK"

lock_identity="$(stat -Lc '%d:%i' -- "$INSTALL_LOCK")"
exec 8<>"$INSTALL_LOCK"
[[ ! -L "$INSTALL_LOCK" && "$(stat -Lc '%d:%i' -- "$INSTALL_LOCK")" == "$lock_identity" ]]
[[ "$(stat -Lc '%d:%i' -- /proc/$$/fd/8)" == "$lock_identity" ]]
flock -x 8
HELPER_STAGE="$(mktemp "$DURABLE_SCRIPTS/.scrub-notebooklm-backup.XXXXXXXX")"
BACKUP_STAGE="$(mktemp "$DURABLE_SCRIPTS/.backup-offsite.XXXXXXXX")"
STAGING_HELPER_STAGE="$(mktemp "$DURABLE_SCRIPTS/.verified-volatile-backup-staging.XXXXXXXX")"
CLEANUP_HELPER_STAGE="$(mktemp "$DURABLE_SCRIPTS/.cleanup-volatile-backup-staging.XXXXXXXX")"
TMPFILES_STAGE="$(mktemp /etc/tmpfiles.d/.brain-backup-staging.XXXXXXXX)"
PREFLIGHT_STAGE="$(mktemp "$DURABLE_SCRIPTS/.recall-first-apply-preflight.XXXXXXXX")"
RESTORE_STAGE="$(mktemp "$DURABLE_SCRIPTS/.restore-from-backup.XXXXXXXX")"
install -o root -g brain-data -m 0640 "$SCRIPT_DIR/scrub-notebooklm-backup.mjs" "$HELPER_STAGE"
install -o root -g brain-data -m 0750 "$SCRIPT_DIR/backup-offsite.sh" "$BACKUP_STAGE"
install -o root -g brain-data -m 0640 "$SCRIPT_DIR/verified-volatile-backup-staging.sh" "$STAGING_HELPER_STAGE"
install -o root -g brain-data -m 0640 "$SCRIPT_DIR/cleanup-volatile-backup-staging.mjs" "$CLEANUP_HELPER_STAGE"
install -o root -g root -m 0644 "$TMPFILES_SOURCE" "$TMPFILES_STAGE"
install -o root -g brain-data -m 0640 "$SCRIPT_DIR/recall-first-apply-preflight.mjs" "$PREFLIGHT_STAGE"
install -o root -g brain-data -m 0750 "$SCRIPT_DIR/restore-from-backup.sh" "$RESTORE_STAGE"

# Provision the volatile directory before publishing a wrapper that requires
# it. systemd recreates this tmpfs path after reboot; the app service also owns
# it through RuntimeDirectory.
mv -f -- "$TMPFILES_STAGE" "$TMPFILES_PATH"
TMPFILES_STAGE=""
systemd-tmpfiles --create "$TMPFILES_PATH"
[[ -d /run/brain-backup-staging && ! -L /run/brain-backup-staging ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-backup-staging)" == "brain:brain-data:700" ]]
[[ "$(findmnt --noheadings --target /run/brain-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
[[ -d /run/brain-recall-backup-staging && ! -L /run/brain-recall-backup-staging ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-recall-backup-staging)" == "brain-recall:brain-data:700" ]]
[[ "$(findmnt --noheadings --target /run/brain-recall-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
[[ -d /run/brain-root-backup-staging && ! -L /run/brain-root-backup-staging ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-root-backup-staging)" == "root:root:700" ]]
[[ "$(findmnt --noheadings --target /run/brain-root-backup-staging --output FSTYPE | tr -d '[:space:]')" == "tmpfs" ]]
[[ -f /run/brain-release.lock && ! -L /run/brain-release.lock ]]
[[ "$(readlink -e -- /run/brain-release.lock)" == "/run/brain-release.lock" ]]
[[ "$(stat -Lc '%U:%G:%a' /run/brain-release.lock)" == "root:root:600" ]]

# The janitor is durable and release-independent so a first-deploy SIGKILL can
# never wait for candidate activation or NotebookLM migration/timer setup.
mv -f -- "$CLEANUP_HELPER_STAGE" "$DURABLE_SCRIPTS/cleanup-volatile-backup-staging.mjs"
CLEANUP_HELPER_STAGE=""
install -o root -g root -m 0644 "$CLEANUP_SERVICE_SOURCE" /etc/systemd/system/brain-backup-staging-cleanup.service
install -o root -g root -m 0644 "$CLEANUP_TIMER_SOURCE" /etc/systemd/system/brain-backup-staging-cleanup.timer
for unit in brain-recall-sync.service brain-recall-manual-sync.service; do
  install -d -o root -g root -m 0755 "/etc/systemd/system/$unit.d"
  install -o root -g root -m 0644 "$RECALL_DROPIN_SOURCE" \
    "/etc/systemd/system/$unit.d/backup-staging.conf"
done
systemctl daemon-reload
systemctl start brain-backup-staging-cleanup.service
systemctl enable --now brain-backup-staging-cleanup.timer
systemctl is-enabled --quiet brain-backup-staging-cleanup.timer
systemctl is-active --quiet brain-backup-staging-cleanup.timer

# Restore is operator-invoked and safe to publish under the backup-tool lock.
mv -f -- "$RESTORE_STAGE" "$DURABLE_SCRIPTS/restore-from-backup.sh"
RESTORE_STAGE=""
# Recall preflight publication is allowed only while the caller holds the
# outer Recall maintenance lock. The pre-activation janitor install explicitly
# disables this; activate/switch use the default while flock holds the lock.
if [[ "${BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT:-1}" == "1" ]]; then
  mv -f -- "$PREFLIGHT_STAGE" "$DURABLE_SCRIPTS/recall-first-apply-preflight.mjs"
  PREFLIGHT_STAGE=""
else
  [[ "${BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT:-}" == "0" ]]
fi

# Publish the fail-closed wrapper first. On a first install, an invocation in
# the tiny gap exits before snapshot creation because the helper is absent;
# once the helper exists, the shared lock holds consumers back.
mv -f -- "$BACKUP_STAGE" "$DURABLE_SCRIPTS/backup-offsite.sh"
BACKUP_STAGE=""
mv -f -- "$HELPER_STAGE" "$DURABLE_SCRIPTS/scrub-notebooklm-backup.mjs"
HELPER_STAGE=""
mv -f -- "$STAGING_HELPER_STAGE" "$DURABLE_SCRIPTS/verified-volatile-backup-staging.sh"
STAGING_HELPER_STAGE=""

backup_sha="$(sha256sum "$SCRIPT_DIR/backup-offsite.sh" | cut -d' ' -f1)"
helper_sha="$(sha256sum "$SCRIPT_DIR/scrub-notebooklm-backup.mjs" | cut -d' ' -f1)"
staging_helper_sha="$(sha256sum "$SCRIPT_DIR/verified-volatile-backup-staging.sh" | cut -d' ' -f1)"
cleanup_helper_sha="$(sha256sum "$SCRIPT_DIR/cleanup-volatile-backup-staging.mjs" | cut -d' ' -f1)"
restore_sha="$(sha256sum "$SCRIPT_DIR/restore-from-backup.sh" | cut -d' ' -f1)"
[[ "$backup_sha" == "$(sha256sum "$DURABLE_SCRIPTS/backup-offsite.sh" | cut -d' ' -f1)" ]]
[[ "$helper_sha" == "$(sha256sum "$DURABLE_SCRIPTS/scrub-notebooklm-backup.mjs" | cut -d' ' -f1)" ]]
[[ "$staging_helper_sha" == "$(sha256sum "$DURABLE_SCRIPTS/verified-volatile-backup-staging.sh" | cut -d' ' -f1)" ]]
[[ "$cleanup_helper_sha" == "$(sha256sum "$DURABLE_SCRIPTS/cleanup-volatile-backup-staging.mjs" | cut -d' ' -f1)" ]]
[[ "$restore_sha" == "$(sha256sum "$DURABLE_SCRIPTS/restore-from-backup.sh" | cut -d' ' -f1)" ]]
if [[ "${BRAIN_INSTALL_RECALL_BACKUP_PREFLIGHT:-1}" == "1" ]]; then
  preflight_sha="$(sha256sum "$SCRIPT_DIR/recall-first-apply-preflight.mjs" | cut -d' ' -f1)"
  [[ "$preflight_sha" == "$(sha256sum "$DURABLE_SCRIPTS/recall-first-apply-preflight.mjs" | cut -d' ' -f1)" ]]
fi
[[ "$(stat -c '%U:%G:%a' "$DURABLE_SCRIPTS/backup-offsite.sh")" == "root:brain-data:750" ]]
[[ "$(stat -c '%U:%G:%a' "$DURABLE_SCRIPTS/scrub-notebooklm-backup.mjs")" == "root:brain-data:640" ]]
[[ "$(stat -c '%U:%G:%a' "$DURABLE_SCRIPTS/verified-volatile-backup-staging.sh")" == "root:brain-data:640" ]]
[[ "$(stat -c '%U:%G:%a' "$DURABLE_SCRIPTS/cleanup-volatile-backup-staging.mjs")" == "root:brain-data:640" ]]

printf '{"ok":true,"backupToolSha256":"%s","scrubToolSha256":"%s","stagingHelperSha256":"%s","cleanupHelperSha256":"%s","volatileStagingReady":true,"janitorReady":true,"cronPathPreserved":true}\n' \
  "$backup_sha" "$helper_sha" "$staging_helper_sha" "$cleanup_helper_sha"
