#!/usr/bin/env bash
set -euo pipefail

cd "${BRAIN_DIR:-/opt/brain}"

manual_env_override_keys=(
  BRAIN_RECALL_MANUAL_VERIFICATION_MODE
  BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL
  BRAIN_RECALL_SYNC_ENABLED
  BRAIN_RECALL_CONFIRM_LIVE_API
  BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF
  BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH
  BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH
  BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH
  BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES
  BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK
  BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT
  BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT
  BRAIN_RECALL_WARNING_UI_AVAILABLE
  BRAIN_RECALL_MAX_IMPORTS
  BRAIN_RECALL_MAX_CARDS
  BRAIN_RECALL_MAX_TOTAL_CHARS
  BRAIN_RECALL_MAX_TOTAL_CHUNKS
  BRAIN_RECALL_MAX_CHUNKS_PER_CARD
  BRAIN_RECALL_FIXTURE_PATH
)
manual_verification_mode_before_env="${BRAIN_RECALL_MANUAL_VERIFICATION_MODE:-0}"
for key in "${manual_env_override_keys[@]}"; do
  if [[ "${!key+x}" == "x" ]]; then
    printf -v "manual_${key}_present" '%s' "1"
    printf -v "manual_${key}_value" '%s' "${!key}"
  else
    printf -v "manual_${key}_present" '%s' "0"
  fi
done

system_env_file="${BRAIN_RECALL_SYSTEM_ENV_FILE:-/etc/brain/.env}"
if [[ -r "$system_env_file" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$system_env_file"
  set +a
fi

credential_file=""
if [[ -n "${CREDENTIALS_DIRECTORY:-}" && -r "${CREDENTIALS_DIRECTORY}/recall-api-key" ]]; then
  credential_file="${CREDENTIALS_DIRECTORY}/recall-api-key"
  RECALL_API_KEY="$(<"$credential_file")"
  export RECALL_API_KEY
fi

if [[ "$manual_verification_mode_before_env" == "1" ]]; then
  for key in "${manual_env_override_keys[@]}"; do
    present_var="manual_${key}_present"
    value_var="manual_${key}_value"
    if [[ "${!present_var}" == "1" ]]; then
      export "$key=${!value_var}"
    fi
  done
fi

if [[ "${BRAIN_RECALL_SYNC_ENABLED:-0}" != "1" ]]; then
  echo "[recall-scheduled-apply] disabled: BRAIN_RECALL_SYNC_ENABLED is not 1"
  exit 0
fi

required_manual_verification_approval="I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records."

if [[ "${BRAIN_RECALL_MANUAL_SYNC_MODE:-0}" == "1" ]]; then
  if [[ "${BRAIN_RECALL_TRIGGER:-}" != "manual_ui" || -z "${BRAIN_RECALL_REQUEST_ID:-}" ]]; then
    echo "[recall-scheduled-apply] trusted manual request correlation is required" >&2
    exit 2
  fi
elif [[ "${BRAIN_RECALL_MANUAL_VERIFICATION_MODE:-0}" == "1" ]]; then
  if [[ "${BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL:-}" != "$required_manual_verification_approval" ]]; then
    echo "[recall-scheduled-apply] exact BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL text is required for manual verification mode" >&2
    exit 2
  fi
elif [[ "${BRAIN_RECALL_SCHEDULER_ENABLED:-0}" != "1" ]]; then
  echo "[recall-scheduled-apply] disabled: BRAIN_RECALL_SCHEDULER_ENABLED is not 1"
  exit 0
fi

if [[ -z "${RECALL_API_KEY:-}" && -z "${BRAIN_RECALL_FIXTURE_PATH:-}" ]]; then
  echo "[recall-scheduled-apply] RECALL_API_KEY is not configured" >&2
  exit 2
fi

if [[ -z "${BRAIN_RECALL_FIXTURE_PATH:-}" && "${BRAIN_RECALL_CONFIRM_LIVE_API:-0}" != "1" ]]; then
  echo "[recall-scheduled-apply] BRAIN_RECALL_CONFIRM_LIVE_API is not 1" >&2
  exit 2
fi

key_rotation_env_file="${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-${credential_file:-/etc/brain/.env}}}"

if [[ -z "${BRAIN_RECALL_FIXTURE_PATH:-}" ]]; then
  node -- scripts/check-recall-key-rotation-evidence.mjs \
    --env-file "$key_rotation_env_file" \
    --min-rotated-after "${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}" \
    --system-env-file
fi

proof_args=()
if [[ "${BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF:-0}" == "1" ]]; then
  if [[ -z "${BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH:-}" || -z "${BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH:-}" ]]; then
    echo "[recall-scheduled-apply] live spike report proof paths are required" >&2
    exit 2
  fi
  proof_args+=(
    --require-live-spike-report-proof
    --live-spike-enumeration-report-path "$BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH"
    --live-spike-fidelity-report-path "$BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH"
    --live-spike-report-max-age-minutes "${BRAIN_RECALL_LIVE_SPIKE_REPORT_MAX_AGE_MINUTES:-1440}"
  )
  if [[ -n "${BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH:-}" ]]; then
    proof_args+=(--live-spike-manifest-path "$BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH")
  fi
  if [[ "${BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES:-0}" == "1" ]]; then
    proof_args+=(--live-spike-allow-fidelity-changes)
  fi
  if [[ -n "${BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK:-}" ]]; then
    proof_args+=(--live-spike-accepted-fidelity-risk "$BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK")
  fi
fi

trigger="${BRAIN_RECALL_TRIGGER:-automatic}"
occurrence_key="${BRAIN_RECALL_OCCURRENCE_KEY:-}"
if [[ -z "$occurrence_key" && "$trigger" == "automatic" && -x "$(command -v systemctl 2>/dev/null || true)" ]]; then
  last_timer_trigger="$(systemctl show brain-recall-sync.timer --property=LastTriggerUSec --value 2>/dev/null || true)"
  if [[ -n "$last_timer_trigger" && "$last_timer_trigger" != "n/a" ]]; then
    last_timer_trigger_iso="$(node -e 'const value=Date.parse(process.argv[1]); if(Number.isFinite(value)) process.stdout.write(new Date(value).toISOString())' "$last_timer_trigger")"
    if [[ -n "$last_timer_trigger_iso" ]]; then
      occurrence_key="automatic:${last_timer_trigger_iso}"
    fi
  fi
fi
occurrence_key="${occurrence_key:-automatic:$(date -u +%Y-%m-%d)}"
request_id="${BRAIN_RECALL_REQUEST_ID:-}"
if [[ "$trigger" == "manual_ui" ]]; then
  occurrence_key="manual:${request_id}"
fi
request_args=()
if [[ -n "$request_id" ]]; then
  request_args+=(--request-id "$request_id")
fi
outer_lock="${BRAIN_RECALL_OUTER_LOCK_PATH:-/run/brain-recall/recall-sync.lock}"
exec 9>"$outer_lock"
if [[ "$trigger" == "manual_ui" ]]; then
  flock -w "${BRAIN_RECALL_MANUAL_LOCK_WAIT_SECONDS:-5}" 9 || exit 75
else
  flock -w "${BRAIN_RECALL_AUTOMATIC_LOCK_WAIT_SECONDS:-10800}" 9 || exit 75
fi

lifecycle=(node -- scripts/recall-sync-lifecycle-prod.mjs)
lifecycle_args=(--db-path "${BRAIN_DB_PATH:-data/brain.sqlite}" --migrations-dir "${BRAIN_MIGRATIONS_DIR:-scripts/db/migrations}")
start_args=(start --trigger "$trigger" --occurrence-key "$occurrence_key" "${lifecycle_args[@]}")
if [[ -n "$request_id" ]]; then
  start_args+=(--request-id "$request_id")
fi
lifecycle_start="$("${lifecycle[@]}" "${start_args[@]}")"
if [[ "$lifecycle_start" == existing_terminal:* ]]; then
  echo "[recall-scheduled-apply] occurrence already has a terminal execution"
  exit 0
fi
if [[ "$lifecycle_start" == existing_running:* ]]; then
  execution_id="${lifecycle_start#existing_running:}"
  set +e
  "${lifecycle[@]}" reconcile \
    --execution-id "$execution_id" \
    --outer-lock-confirmed-free 1 \
    "${lifecycle_args[@]}" >/dev/null
  reconcile_status=$?
  set -e
  if [[ "$reconcile_status" == "75" ]]; then
    echo "[recall-scheduled-apply] existing occurrence is still healthy; retry later"
    exit 75
  fi
  if [[ "$reconcile_status" != "0" ]]; then
    echo "[recall-scheduled-apply] existing occurrence could not be reconciled safely" >&2
    exit "$reconcile_status"
  fi
  echo "[recall-scheduled-apply] stale occurrence reconciled without restarting core work"
  exit 0
fi
if [[ "$lifecycle_start" != created:* ]]; then
  echo "[recall-scheduled-apply] invalid lifecycle start response" >&2
  exit 1
fi
execution_id="${lifecycle_start#created:}"
execution_completed=0
heartbeat_pid=""
cleanup_lifecycle() {
  status=$?
  if [[ -n "$heartbeat_pid" ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
  fi
  if [[ "$execution_completed" != "1" ]]; then
    "${lifecycle[@]}" fail --execution-id "$execution_id" --safe-reason internal "${lifecycle_args[@]}" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup_lifecycle EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
(
  while kill -0 $$ 2>/dev/null; do
    sleep "${BRAIN_RECALL_HEARTBEAT_SECONDS:-15}"
    "${lifecycle[@]}" heartbeat --execution-id "$execution_id" "${lifecycle_args[@]}" >/dev/null 2>&1 || exit 0
  done
) &
heartbeat_pid=$!

mkdir -p data/private/recall-live-spikes data/backups

ts="$(date -u +%Y%m%dT%H%M%SZ)"
dry_run_report="data/private/recall-live-spikes/scheduled-dry-run-${ts}.json"
preflight_report="data/private/recall-live-spikes/scheduled-preflight-${ts}.json"
apply_report="data/private/recall-live-spikes/scheduled-apply-${ts}.json"
dry_run_id="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(12).toString("hex"))')"
apply_run_id="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(12).toString("hex"))')"
max_imports="${BRAIN_RECALL_MAX_IMPORTS:-20}"

common_args=(
  --max-cards "${BRAIN_RECALL_MAX_CARDS:-100}"
  --max-imports "$max_imports"
  --max-total-chars "${BRAIN_RECALL_MAX_TOTAL_CHARS:-1000000}"
  --max-total-chunks "${BRAIN_RECALL_MAX_TOTAL_CHUNKS:-1000}"
  --max-chunks-per-card "${BRAIN_RECALL_MAX_CHUNKS_PER_CARD:-50}"
)

runtime_args=()
key_rotation_apply_args=()
if [[ -n "${BRAIN_RECALL_FIXTURE_PATH:-}" ]]; then
  runtime_args+=(--fixture "$BRAIN_RECALL_FIXTURE_PATH")
else
  runtime_args+=(--confirm-live-api)
  export BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1
  key_rotation_apply_args+=(
    --require-key-rotation-evidence
    --key-rotation-env-file "$key_rotation_env_file"
    --key-rotated-after "${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"
    --key-rotation-system-env-file
  )
fi

policy_args=()
validator_args=()
if [[ "${BRAIN_RECALL_ALLOW_WEAK_UPGRADE_BY_URL:-0}" == "1" ]]; then
  policy_args+=(--allow-weak-upgrade-by-url)
  validator_args+=(--allow-weak-upgrades)
fi
if [[ "${BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT:-0}" == "1" ]]; then
  policy_args+=(--allow-unverified-import)
  validator_args+=(--allow-unverified-fidelity)
fi
if [[ "${BRAIN_RECALL_ALLOW_TRUNCATED_IMPORT:-0}" == "1" ]]; then
  policy_args+=(--allow-truncated-import)
  validator_args+=(--allow-possibly-truncated-fidelity)
fi
if [[ "${BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT:-0}" == "1" ]]; then
  policy_args+=(--allow-metadata-only-import)
  validator_args+=(--allow-metadata-only-fidelity)
fi
if [[ "${BRAIN_RECALL_WARNING_UI_AVAILABLE:-0}" == "1" ]]; then
  policy_args+=(--warning-ui-available)
fi

"${lifecycle[@]}" stage --execution-id "$execution_id" --stage dry_run --run-id "$dry_run_id" "${lifecycle_args[@]}"
node -- scripts/sync-recall-prod.mjs \
  --dry-run \
  --run-id "$dry_run_id" --execution-id "$execution_id" --trigger "$trigger" \
  ${request_args[@]+"${request_args[@]}"} \
  ${proof_args[@]+"${proof_args[@]}"} \
  "${runtime_args[@]}" \
  "${common_args[@]}" \
  ${policy_args[@]+"${policy_args[@]}"} \
  --output "$dry_run_report"

node -- scripts/check-recall-dry-run-report.mjs \
  --report "$dry_run_report" \
  --max-planned-imports "$max_imports" \
  --require-private-path \
  ${validator_args[@]+"${validator_args[@]}"}
"${lifecycle[@]}" stage --execution-id "$execution_id" --stage dry_run_validated "${lifecycle_args[@]}"

"${lifecycle[@]}" stage --execution-id "$execution_id" --stage backup "${lifecycle_args[@]}"
node -- scripts/recall-first-apply-preflight.mjs \
  --db-path "${BRAIN_DB_PATH:-data/brain.sqlite}" \
  --backup-dir data/backups \
  --json > "$preflight_report"

backup_path="$(node -e "const fs=require('fs'); const report=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(!report.ok || !report.backupPath) process.exit(2); console.log(report.backupPath)" "$preflight_report")"

"${lifecycle[@]}" stage --execution-id "$execution_id" --stage apply --run-id "$apply_run_id" "${lifecycle_args[@]}"
BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1 \
BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1 \
node -- scripts/sync-recall-prod.mjs \
  --apply \
  --run-id "$apply_run_id" --execution-id "$execution_id" --trigger "$trigger" \
  ${request_args[@]+"${request_args[@]}"} \
  --confirm-apply \
  ${key_rotation_apply_args[@]+"${key_rotation_apply_args[@]}"} \
  --require-dry-run-proof \
  --dry-run-report-path "$dry_run_report" \
  --dry-run-report-max-planned-imports "$max_imports" \
  --require-backup-proof \
  --backup-path "$backup_path" \
  --backup-max-age-minutes "${BRAIN_RECALL_BACKUP_MAX_AGE_MINUTES:-120}" \
  ${proof_args[@]+"${proof_args[@]}"} \
  "${runtime_args[@]}" \
  "${common_args[@]}" \
  ${policy_args[@]+"${policy_args[@]}"} \
  --output "$apply_report"

node -- scripts/check-recall-apply-report.mjs \
  --report "$apply_report" \
  --max-applied-imports "$max_imports" \
  --require-private-path \
  ${validator_args[@]+"${validator_args[@]}"}
"${lifecycle[@]}" stage --execution-id "$execution_id" --stage apply_validated "${lifecycle_args[@]}"
"${lifecycle[@]}" complete --execution-id "$execution_id" --apply-run-id "$apply_run_id" "${lifecycle_args[@]}"
execution_completed=1

echo "[recall-scheduled-apply] done execution_id=$execution_id trigger=$trigger"
