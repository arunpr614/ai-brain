#!/usr/bin/env bash
set -euo pipefail

cd "${BRAIN_DIR:-$(pwd)}"

if [[ "${BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM:-0}" != "1" ]]; then
  echo "[recall-first-apply-proof-refresh] BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM must be 1" >&2
  exit 2
fi

required_key_rotation_ack="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file."
enumeration_report="${BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH:-$(node -- scripts/lib/recall-latest-spike-reports.mjs --field enumeration)}"
fidelity_report="${BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH:-$(node -- scripts/lib/recall-latest-spike-reports.mjs --field fidelity)}"
manifest_path="${BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH:-data/private/recall-live-spikes/controlled-samples.json}"
env_file="${BRAIN_RECALL_FIRST_APPLY_ENV_FILE:-data/private/recall-live-spikes/recall.env}"
key_rotation_evidence_file="${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-data/private/recall-live-spikes/key-rotation-evidence.json}"
key_rotated_after="${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"
dry_run_report="${BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH:-data/private/recall-live-spikes/dry-run-report.json}"
backup_path="${BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH:-data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite}"
accepted_fidelity_risk="${BRAIN_RECALL_FIRST_APPLY_ACCEPTED_FIDELITY_RISK:-Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.}"
max_imports="${BRAIN_RECALL_FIRST_APPLY_MAX_IMPORTS:-5}"
dry_run_max_age="${BRAIN_RECALL_FIRST_APPLY_DRY_RUN_MAX_AGE_MINUTES:-120}"
backup_max_age="${BRAIN_RECALL_FIRST_APPLY_BACKUP_MAX_AGE_MINUTES:-120}"
min_freshness_remaining="${BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES:-5}"
date_from="${BRAIN_RECALL_FIRST_APPLY_DATE_FROM:-2026-06-16T00:00:00.000Z}"
date_to="${BRAIN_RECALL_FIRST_APPLY_DATE_TO:-2026-06-16T23:59:59.999Z}"

runtime_args=()
if [[ -n "${BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH:-}" ]]; then
  runtime_args+=(--fixture "$BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH")
else
  if [[ "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
    node -- scripts/check-recall-key-rotation-evidence.mjs \
      --env-file "$env_file" \
      --evidence-file "$key_rotation_evidence_file" \
      --min-rotated-after "$key_rotated_after"

    if [[ "${BRAIN_RECALL_KEY_ROTATION_ACK:-}" != "$required_key_rotation_ack" ]]; then
      echo "[recall-first-apply-proof-refresh] exact BRAIN_RECALL_KEY_ROTATION_ACK text is required before live proof refresh" >&2
      exit 2
    fi
  fi
  runtime_args+=(--confirm-live-api --env-file "$env_file")
fi

dry_run_args=(
  --dry-run
  "${runtime_args[@]}"
  --require-live-spike-report-proof
  --live-spike-enumeration-report-path "$enumeration_report"
  --live-spike-fidelity-report-path "$fidelity_report"
  --live-spike-manifest-path "$manifest_path"
  --live-spike-allow-fidelity-changes
  --live-spike-accepted-fidelity-risk "$accepted_fidelity_risk"
  --date-from "$date_from"
  --date-to "$date_to"
  --max-cards "${BRAIN_RECALL_FIRST_APPLY_MAX_CARDS:-5}"
  --max-imports "$max_imports"
  --max-total-chars "${BRAIN_RECALL_FIRST_APPLY_MAX_TOTAL_CHARS:-250000}"
  --max-total-chunks "${BRAIN_RECALL_FIRST_APPLY_MAX_TOTAL_CHUNKS:-250}"
  --max-chunks-per-card "${BRAIN_RECALL_FIRST_APPLY_MAX_CHUNKS_PER_CARD:-50}"
  --allow-unverified-import
  --allow-metadata-only-import
  --warning-ui-available
  --output "$dry_run_report"
)

node --import tsx -- scripts/sync-recall.ts "${dry_run_args[@]}"

dry_run_validator_args=(
  --report "$dry_run_report"
  --max-planned-imports "$max_imports"
  --max-age-minutes "$dry_run_max_age"
  --require-cards-seen
  --allow-unverified-fidelity
  --allow-metadata-only-fidelity
)

if [[ "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
  dry_run_validator_args+=(--require-private-path)
fi

node -- scripts/check-recall-dry-run-report.mjs "${dry_run_validator_args[@]}"

node -- scripts/recall-first-apply-preflight.mjs --backup-path "$backup_path" --json >/dev/null
chmod 600 "$backup_path"

readiness_args=(
  --enumeration "$enumeration_report"
  --fidelity "$fidelity_report"
  --manifest "$manifest_path"
  --env-file "$env_file"
  --key-rotation-evidence-file "$key_rotation_evidence_file"
  --key-rotated-after "$key_rotated_after"
  --dry-run-report "$dry_run_report"
  --backup-path "$backup_path"
  --accepted-fidelity-risk "$accepted_fidelity_risk"
  --max-planned-imports "$max_imports"
  --dry-run-report-max-age-minutes "$dry_run_max_age"
  --backup-max-age-minutes "$backup_max_age"
  --min-freshness-remaining-minutes "$min_freshness_remaining"
  --allow-fidelity-changes
  --allow-unverified-fidelity
  --allow-metadata-only-fidelity
)

if [[ "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" == "1" ]]; then
  readiness_args+=(
    --allow-unsafe-manifest-for-smoke
    --allow-non-private-dry-run-report
    --allow-non-private-backup
    --skip-private-ignore
    --skip-live-gate-status
    --skip-key-rotation-evidence
    --skip-approval-packet
    --skip-public-docs-privacy
  )
fi

node -- scripts/check-recall-first-apply-readiness.mjs "${readiness_args[@]}"

echo "[recall-first-apply-proof-refresh] done dry_run_report=$dry_run_report backup_path=$backup_path"
