#!/usr/bin/env bash
set -euo pipefail

cd "${BRAIN_DIR:-/opt/brain}"

required_approval="I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records."

if [[ "${BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL:-}" != "$required_approval" ]]; then
  echo "[recall-manual-verification-apply] exact BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL text is required" >&2
  exit 2
fi

if [[ "${BRAIN_RECALL_SYNC_ENABLED:-0}" != "1" ]]; then
  echo "[recall-manual-verification-apply] BRAIN_RECALL_SYNC_ENABLED must be 1" >&2
  exit 2
fi

if [[ -z "${BRAIN_RECALL_FIXTURE_PATH:-}" && "${BRAIN_RECALL_CONFIRM_LIVE_API:-0}" != "1" ]]; then
  echo "[recall-manual-verification-apply] BRAIN_RECALL_CONFIRM_LIVE_API must be 1 for live manual verification" >&2
  exit 2
fi

if ! node -- scripts/check-recall-second-manual-runtime-preflight.mjs >/dev/null; then
  echo "[recall-manual-verification-apply] second manual runtime preflight failed; run node -- scripts/check-recall-second-manual-runtime-preflight.mjs from the production root for details" >&2
  exit 2
fi

export BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1
export BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="$required_approval"

bash scripts/recall-scheduled-apply.sh
