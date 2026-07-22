#!/usr/bin/env bash
# Shared fail-closed checks for backup paths that temporarily contain an
# unsanitized SQLite image. Callers must source this file, then create all raw
# snapshots beneath the returned per-attempt directory.

# A raw stage is allowed to exist for at most three minutes. The independent
# one-minute janitor therefore still has ample room to kill/verify any writer
# and unlink the stage before NotebookLM's five-minute retention margin.
readonly VOLATILE_BACKUP_STAGE_MAX_MS=180000

verify_volatile_backup_staging() {
  local root="$1" source_db="$2" expected_owner="$3" expected_group="$4"
  local canonical fstype identity source_bytes available_bytes required_bytes

  for command in findmnt readlink stat mktemp chmod awk id chown chgrp rm rmdir date timeout bash mv ln ps tr setsid sleep find; do
    command -v "$command" >/dev/null \
      || { echo "[backup-staging] required command missing: $command" >&2; return 1; }
  done
  [[ "$root" == /* && -d "$root" && ! -L "$root" ]] \
    || { echo "[backup-staging] staging root must be an existing non-symlink directory" >&2; return 1; }
  canonical="$(readlink -e -- "$root")" \
    || { echo "[backup-staging] staging root cannot be resolved" >&2; return 1; }
  [[ "$canonical" == "$root" ]] \
    || { echo "[backup-staging] staging root must already be canonical" >&2; return 1; }
  identity="$(stat -Lc '%U:%G:%a' -- "$root")"
  [[ "$identity" == "$expected_owner:$expected_group:700" ]] \
    || { echo "[backup-staging] staging root identity must be $expected_owner:$expected_group:700 (found $identity)" >&2; return 1; }
  fstype="$(findmnt --noheadings --target "$root" --output FSTYPE | tr -d '[:space:]')"
  [[ "$fstype" == "tmpfs" ]] \
    || { echo "[backup-staging] staging root must be backed by tmpfs (found ${fstype:-unknown})" >&2; return 1; }
  [[ -f "$source_db" && ! -L "$source_db" ]] \
    || { echo "[backup-staging] source database must be a regular non-symlink file" >&2; return 1; }

  source_bytes="$(stat -Lc '%s' -- "$source_db")"
  available_bytes="$(( $(stat -fc '%a' -- "$root") * $(stat -fc '%S' -- "$root") ))"
  # The raw copy, scrub VACUUM, and restore/copy proof can coexist. The fixed
  # reserve covers SQLite journals, metadata, and growth between preflight and
  # the point-in-time copy. Insufficient RAM must fail rather than spill.
  required_bytes="$(( source_bytes * 4 + 67108864 ))"
  (( available_bytes >= required_bytes )) \
    || { echo "[backup-staging] insufficient tmpfs capacity: need $required_bytes bytes, have $available_bytes" >&2; return 1; }
}

create_verified_volatile_backup_stage() {
  local root="$1" source_db="$2" expected_owner="$3" expected_group="$4" prefix="$5"
  local stage start_time deadline_ms deadline_tmp
  [[ "$prefix" =~ ^[a-z0-9][a-z0-9-]{0,31}$ ]] \
    || { echo "[backup-staging] invalid stage prefix" >&2; return 1; }
  verify_volatile_backup_staging "$root" "$source_db" "$expected_owner" "$expected_group" || return 1
  stage="$(mktemp -d "$root/$prefix.XXXXXXXX")" || return 1
  chmod 0700 "$stage"
  deadline_ms="$(( $(date +%s%3N) + VOLATILE_BACKUP_STAGE_MAX_MS ))"
  [[ "$deadline_ms" =~ ^[0-9]{13,}$ ]] || {
    rmdir -- "$stage" 2>/dev/null || true
    echo "[backup-staging] cannot establish the raw-stage deadline" >&2
    return 1
  }
  deadline_tmp="$stage/.deadline.tmp"
  printf '%s\n' "$deadline_ms" > "$deadline_tmp"
  chmod 0600 "$deadline_tmp"
  mv -- "$deadline_tmp" "$stage/.deadline"
  start_time="$(awk '{print $22}' "/proc/$$/stat")" || {
    rm -f -- "$stage/.deadline"
    rmdir -- "$stage" 2>/dev/null || true
    echo "[backup-staging] cannot record the active process identity" >&2
    return 1
  }
  printf '%s %s\n' "$$" "$start_time" > "$stage/.owner"
  chmod 0600 "$stage/.owner"
  if [[ "$(id -u)" == "0" ]]; then
    chown -R "$expected_owner:$expected_group" "$stage" || {
      rm -f -- "$stage/.owner"
      rmdir -- "$stage" 2>/dev/null || true
      echo "[backup-staging] failed to assign the private stage owner" >&2
      return 1
    }
  else
    chgrp -R "$expected_group" "$stage" || {
      rm -f -- "$stage/.owner"
      rmdir -- "$stage" 2>/dev/null || true
      echo "[backup-staging] failed to assign the private stage group" >&2
      return 1
    }
  fi
  [[ -d "$stage" && ! -L "$stage" && \
     "$(stat -Lc '%U:%G:%a' -- "$stage")" == "$expected_owner:$expected_group:700" ]] || {
    rmdir -- "$stage" 2>/dev/null || true
    echo "[backup-staging] failed to create a private per-attempt directory" >&2
    return 1
  }
  printf '%s\n' "$stage"
}

volatile_backup_stage_deadline_ms() {
  local stage="$1" deadline
  [[ -d "$stage" && ! -L "$stage" ]] \
    || { echo "[backup-staging] volatile stage is unavailable" >&2; return 1; }
  IFS= read -r deadline < "$stage/.deadline" \
    || { echo "[backup-staging] volatile stage deadline is unavailable" >&2; return 1; }
  [[ "$deadline" =~ ^[0-9]{13,}$ ]] \
    || { echo "[backup-staging] volatile stage deadline is invalid" >&2; return 1; }
  printf '%s\n' "$deadline"
}

volatile_backup_stage_has_open_files() {
  local stage="$1" descriptor target
  for descriptor in /proc/[0-9]*/fd/*; do
    target="$(readlink -- "$descriptor" 2>/dev/null)" || continue
    if [[ "$target" == "$stage" || "$target" == "$stage/"* ]]; then
      return 0
    fi
  done
  return 1
}

# Stop the authenticated command process group and prove all stage file
# descriptors are closed before any cleanup unlinks its paths. The stage and
# janitor share one OS identity (brain, brain-recall, or root).
fence_volatile_backup_stage_writers() {
  local stage="$1" pid start_time pgid pgid_start current uid marker_identity attempt
  [[ -d "$stage" && ! -L "$stage" ]] || return 0
  if [[ -e "$stage/.writer" ]]; then
    uid="$(id -u)"
    marker_identity="$(stat -Lc '%u:%a' -- "$stage/.writer" 2>/dev/null || true)"
    if [[ "$marker_identity" != "$uid:600" ]] || \
       ! read -r pid start_time pgid pgid_start < "$stage/.writer" || \
       [[ ! "$pid" =~ ^[0-9]+$ || ! "$start_time" =~ ^[0-9]+$ || \
          ! "$pgid" =~ ^[0-9]+$ || ! "$pgid_start" =~ ^[0-9]+$ ]]; then
      if volatile_backup_stage_has_open_files "$stage"; then
        echo "[backup-staging] refusing to unlink an unauthenticated active writer" >&2
        return 1
      fi
      return 0
    fi
    current="$(awk '{print $22}' "/proc/$pgid/stat" 2>/dev/null || true)"
    if [[ "$current" == "$pgid_start" ]]; then
      kill -KILL -- "-$pgid" 2>/dev/null || true
    fi
    current="$(awk '{print $22}' "/proc/$pid/stat" 2>/dev/null || true)"
    if [[ "$current" == "$start_time" ]]; then
      kill -KILL -- "$pid" 2>/dev/null || true
    fi
  fi
  for attempt in {1..80}; do
    if ! volatile_backup_stage_has_open_files "$stage"; then
      return 0
    fi
    sleep 0.025
  done
  echo "[backup-staging] could not prove volatile writer shutdown" >&2
  return 1
}

# Run every command that can create or retain raw bytes beneath an independent
# GNU timeout process group. The inner shell records the actual command PID and
# rechecks the absolute deadline at execution time, so suspending the caller
# cannot extend the deadline. The janitor uses .writer to kill and verify the
# whole process group before unlinking an expired stage.
run_volatile_backup_stage_step() {
  local stage="$1"
  shift
  local deadline_ms now_ms remaining_ms timeout_seconds status
  (( $# > 0 )) || { echo "[backup-staging] missing deadline-bound command" >&2; return 1; }
  deadline_ms="$(volatile_backup_stage_deadline_ms "$stage")" || return 1
  now_ms="$(date +%s%3N)"
  [[ "$now_ms" =~ ^[0-9]{13,}$ ]] \
    || { echo "[backup-staging] cannot read the deadline clock" >&2; return 1; }
  remaining_ms="$(( deadline_ms - now_ms ))"
  (( remaining_ms > 0 )) \
    || { echo "[backup-staging] raw-stage deadline expired" >&2; return 124; }
  timeout_seconds="$(( (remaining_ms + 999) / 1000 ))"
  set +e
  setsid timeout --signal=KILL "${timeout_seconds}s" bash -c '
    set -euo pipefail
    stage="$1"
    expected_deadline="$2"
    shift 2
    IFS= read -r actual_deadline < "$stage/.deadline"
    [[ "$actual_deadline" == "$expected_deadline" ]]
    now_ms="$(date +%s%3N)"
    [[ "$now_ms" =~ ^[0-9]{13,}$ && "$now_ms" -lt "$actual_deadline" ]]
    export SQLITE_TMPDIR="$stage" TMPDIR="$stage"
    start_time="$(awk "{print \$22}" "/proc/$$/stat")"
    pgid="$(ps -o pgid= -p $$ | tr -d "[:space:]")"
    [[ "$pgid" =~ ^[0-9]+$ ]]
    pgid_start="$(awk "{print \$22}" "/proc/$pgid/stat")"
    writer_tmp="$stage/.writer.tmp.$$"
    printf "%s %s %s %s\n" "$$" "$start_time" "$pgid" "$pgid_start" > "$writer_tmp"
    chmod 0600 "$writer_tmp"
    mv -- "$writer_tmp" "$stage/.writer"
    exec "$@"
  ' brain-backup-deadline "$stage" "$deadline_ms" "$@"
  status=$?
  set -e
  if ! fence_volatile_backup_stage_writers "$stage"; then
    return 1
  fi
  rm -f -- "$stage/.writer" 2>/dev/null || return 1
  if (( status != 0 )); then
    if (( status == 124 || status == 137 )); then
      echo "[backup-staging] deadline-bound command timed out" >&2
      return 124
    fi
    return "$status"
  fi
  now_ms="$(date +%s%3N)"
  (( now_ms < deadline_ms )) \
    || { echo "[backup-staging] raw-stage deadline expired" >&2; return 124; }
}

mark_volatile_backup_stage_sanitized() {
  local stage="$1" deadline_ms now_ms marker_tmp
  deadline_ms="$(volatile_backup_stage_deadline_ms "$stage")" || return 1
  now_ms="$(date +%s%3N)"
  (( now_ms < deadline_ms )) \
    || { echo "[backup-staging] refusing to mark an expired stage sanitized" >&2; return 124; }
  marker_tmp="$stage/.sanitized.tmp.$$"
  printf '%s\n' "$deadline_ms" > "$marker_tmp"
  chmod 0600 "$marker_tmp"
  mv -- "$marker_tmp" "$stage/.sanitized"
}

# The final hard-link or rename is itself a deadline-bound child. It rechecks
# the sanitized fence inside the independently timed process, closing the
# suspend-between-check-and-publication race.
publish_volatile_backup_stage_file() {
  local stage="$1"
  shift
  (( $# > 0 )) || { echo "[backup-staging] missing atomic publication command" >&2; return 1; }
  run_volatile_backup_stage_step "$stage" bash -c '
    set -euo pipefail
    stage="$1"
    shift
    IFS= read -r deadline < "$stage/.deadline"
    IFS= read -r sanitized_deadline < "$stage/.sanitized"
    [[ "$sanitized_deadline" == "$deadline" ]]
    now_ms="$(date +%s%3N)"
    [[ "$now_ms" =~ ^[0-9]{13,}$ && "$now_ms" -lt "$deadline" ]]
    exec "$@"
  ' brain-backup-publish "$stage" "$@"
}

# Hidden persistent candidates contain only already-scrubbed bytes, but a
# SIGKILL must not let repeated attempts consume disk forever. Callers invoke
# this only while holding their existing backup/restore maintenance lock.
cleanup_stale_sanitized_backup_publications() {
  local root="$1" candidate name owner age_seconds now_seconds
  for command in find readlink stat id date rm; do
    command -v "$command" >/dev/null \
      || { echo "[backup-staging] required publication cleanup command missing: $command" >&2; return 1; }
  done
  [[ "$root" == /* && -d "$root" && ! -L "$root" && "$(readlink -e -- "$root")" == "$root" ]] \
    || { echo "[backup-staging] unsafe persistent publication root" >&2; return 1; }
  now_seconds="$(date +%s)"
  while IFS= read -r -d '' candidate; do
    name="${candidate##*/}"
    [[ "$name" =~ ^\.(backup|restore|restore-rollback)-publication\.[A-Za-z0-9]{6}([A-Za-z0-9]{2})?$ ]] || continue
    owner="$(stat -Lc '%u' -- "$candidate")" || return 1
    [[ "$owner" == "$(id -u)" ]] || continue
    age_seconds="$(( now_seconds - $(stat -Lc '%Y' -- "$candidate") ))"
    (( age_seconds >= 600 )) || continue
    rm -rf -- "$candidate"
  done < <(find "$root" -mindepth 1 -maxdepth 1 -type d \
    \( -name '.backup-publication.??????' -o -name '.backup-publication.????????' \
       -o -name '.restore-publication.??????' -o -name '.restore-publication.????????' \
       -o -name '.restore-rollback-publication.??????' \
       -o -name '.restore-rollback-publication.????????' \) -print0)
}
