#!/usr/bin/env bash
set -euo pipefail

cd "${BRAIN_DIR:-$(pwd)}"

required_approval="I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content."
required_key_rotation_ack="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file."
env_file="${BRAIN_RECALL_FIRST_APPLY_ENV_FILE:-data/private/recall-live-spikes/recall.env}"
key_rotation_evidence_file="${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-data/private/recall-live-spikes/key-rotation-evidence.json}"
key_rotated_after="${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"

if [[ "${BRAIN_RECALL_FIRST_APPLY_APPROVAL:-}" != "$required_approval" ]]; then
  echo "[recall-first-capped-apply] exact BRAIN_RECALL_FIRST_APPLY_APPROVAL text is required" >&2
  exit 2
fi

if [[ "${BRAIN_RECALL_SYNC_ENABLED:-0}" != "1" ]]; then
  echo "[recall-first-capped-apply] BRAIN_RECALL_SYNC_ENABLED must be 1" >&2
  exit 2
fi

if [[ "${BRAIN_RECALL_KEY_ROTATION_ACK:-}" != "$required_key_rotation_ack" ]]; then
  echo "[recall-first-capped-apply] exact BRAIN_RECALL_KEY_ROTATION_ACK text is required" >&2
  exit 2
fi

enumeration_report="${BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH:-$(node -- scripts/lib/recall-latest-spike-reports.mjs --field enumeration)}"
fidelity_report="${BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH:-$(node -- scripts/lib/recall-latest-spike-reports.mjs --field fidelity)}"
manifest_path="${BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH:-data/private/recall-live-spikes/controlled-samples.json}"
dry_run_report="${BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH:-data/private/recall-live-spikes/dry-run-report.json}"
backup_path="${BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH:-data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite}"
apply_report="${BRAIN_RECALL_FIRST_APPLY_REPORT_PATH:-data/private/recall-live-spikes/first-apply-report.json}"
accepted_fidelity_risk="${BRAIN_RECALL_FIRST_APPLY_ACCEPTED_FIDELITY_RISK:-Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.}"
max_imports="${BRAIN_RECALL_FIRST_APPLY_MAX_IMPORTS:-5}"
dry_run_max_age="${BRAIN_RECALL_FIRST_APPLY_DRY_RUN_MAX_AGE_MINUTES:-120}"
backup_max_age="${BRAIN_RECALL_FIRST_APPLY_BACKUP_MAX_AGE_MINUTES:-120}"
apply_report_max_age="${BRAIN_RECALL_FIRST_APPLY_REPORT_MAX_AGE_MINUTES:-120}"
min_freshness_remaining="${BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES:-5}"
date_from="${BRAIN_RECALL_FIRST_APPLY_DATE_FROM:-2026-06-16T00:00:00.000Z}"
date_to="${BRAIN_RECALL_FIRST_APPLY_DATE_TO:-2026-06-16T23:59:59.999Z}"

if [[ -z "${BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH:-}" && "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
  node -- scripts/check-recall-key-rotation-evidence.mjs \
    --env-file "$env_file" \
    --evidence-file "$key_rotation_evidence_file" \
    --min-rotated-after "$key_rotated_after"
fi

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

runtime_args=()
key_rotation_apply_args=()
if [[ -n "${BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH:-}" ]]; then
  runtime_args+=(--fixture "$BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH")
else
  runtime_args+=(--confirm-live-api --env-file "$env_file")
  if [[ "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
    key_rotation_apply_args+=(
      --require-key-rotation-evidence
      --key-rotation-env-file "$env_file"
      --key-rotation-evidence-file "$key_rotation_evidence_file"
      --key-rotated-after "$key_rotated_after"
    )
  fi
fi

apply_args=(
  --apply
  --confirm-apply
  "${runtime_args[@]}"
  ${key_rotation_apply_args[@]+"${key_rotation_apply_args[@]}"}
  --require-live-spike-report-proof
  --live-spike-enumeration-report-path "$enumeration_report"
  --live-spike-fidelity-report-path "$fidelity_report"
  --live-spike-manifest-path "$manifest_path"
  --live-spike-allow-fidelity-changes
  --live-spike-accepted-fidelity-risk "$accepted_fidelity_risk"
  --require-dry-run-proof
  --dry-run-report-path "$dry_run_report"
  --dry-run-report-max-age-minutes "$dry_run_max_age"
  --dry-run-report-max-planned-imports "$max_imports"
  --dry-run-report-require-cards-seen
  --require-backup-proof
  --backup-path "$backup_path"
  --backup-max-age-minutes "$backup_max_age"
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
  --output "$apply_report"
)

node --import tsx -- scripts/sync-recall.ts "${apply_args[@]}"

apply_validator_args=(
  --report "$apply_report"
  --max-applied-imports "$max_imports"
  --max-age-minutes "$apply_report_max_age"
  --require-cards-seen
  --require-applied-imports
  --allow-unverified-fidelity
  --allow-metadata-only-fidelity
)

if [[ "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
  apply_validator_args+=(--require-private-path)
fi

node -- scripts/check-recall-apply-report.mjs "${apply_validator_args[@]}"

echo "[recall-first-capped-apply] done apply_report=$apply_report"
