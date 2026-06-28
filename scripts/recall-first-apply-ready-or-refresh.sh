#!/usr/bin/env bash
set -euo pipefail

cd "${BRAIN_DIR:-$(pwd)}"

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

readiness_refresh_decision() {
  node - "$1" <<'NODE'
const { readFileSync } = require("node:fs");

const path = process.argv[2];
const text = readFileSync(path, "utf8");
const start = text.indexOf("{");
const end = text.lastIndexOf("}");
if (start < 0 || end < start) {
  console.log("non_refreshable");
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(text.slice(start, end + 1));
} catch {
  console.log("non_refreshable");
  process.exit(0);
}

const refreshableIds = new Set(["dry_run_report_proof", "backup_proof"]);
const refreshableRules = new Set([
  "proof_expiring_soon",
  "stale_backup",
  "missing_backup",
  "future_dated_backup",
  "stale_report",
  "missing_report",
  "future_dated_report",
]);
const failedIds = new Set();
const rules = new Set();

for (const check of Array.isArray(parsed.checked) ? parsed.checked : []) {
  if (check?.ok !== true && check?.id) failedIds.add(check.id);
}
for (const finding of Array.isArray(parsed.findings) ? parsed.findings : []) {
  if (finding?.id) failedIds.add(finding.id);
  if (finding?.rule) rules.add(finding.rule);
}

const serialized = JSON.stringify(parsed);
for (const rule of refreshableRules) {
  if (serialized.includes(rule)) rules.add(rule);
}

const allFailuresRefreshable =
  failedIds.size > 0 && [...failedIds].every((id) => refreshableIds.has(id));
const hasRefreshableRule = [...rules].some((rule) => refreshableRules.has(rule));

console.log(allFailuresRefreshable && hasRefreshableRule ? "refreshable" : "non_refreshable");
NODE
}

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

if [[ -z "${BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH:-}" && "${BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS:-0}" != "1" ]]; then
  set +e
  node -- scripts/check-recall-key-rotation-evidence.mjs \
    --env-file "$env_file" \
    --evidence-file "$key_rotation_evidence_file" \
    --min-rotated-after "$key_rotated_after"
  key_evidence_status=$?
  set -e

  if [[ "$key_evidence_status" -ne 0 ]]; then
    echo "[recall-first-apply-ready-or-refresh] key rotation evidence failed; not refreshing proof" >&2
    exit "$key_evidence_status"
  fi
fi

readiness_output="$(mktemp -t recall-first-apply-readiness.XXXXXX)"
trap 'rm -f "$readiness_output"' EXIT

set +e
node -- scripts/check-recall-first-apply-readiness.mjs "${readiness_args[@]}" >"$readiness_output" 2>&1
readiness_status=$?
set -e

cat "$readiness_output"

if [[ "$readiness_status" -eq 0 ]]; then
  echo "[recall-first-apply-ready-or-refresh] ready_without_refresh"
  exit 0
fi

refresh_decision="$(readiness_refresh_decision "$readiness_output")"

if [[ "$refresh_decision" != "refreshable" ]]; then
  echo "[recall-first-apply-ready-or-refresh] readiness failed on a non-refreshable gate; not refreshing" >&2
  exit "$readiness_status"
fi

if [[ "${BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM:-${BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM:-0}}" != "1" ]]; then
  echo "[recall-first-apply-ready-or-refresh] refreshable proof failure found; set BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 to refresh proof" >&2
  exit 2
fi

echo "[recall-first-apply-ready-or-refresh] refreshable proof failure found; running no-write proof refresh"

BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1 bash scripts/recall-first-apply-proof-refresh.sh

echo "[recall-first-apply-ready-or-refresh] refreshed"
