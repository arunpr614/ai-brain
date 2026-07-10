# Recall Production Dry-Run Live Spike Proof Gate Execution Report

Created: 2026-06-24 14:24 IST
Owner: Codex
Status: Complete for offline scope
Scope: Recall -> AI Brain daily snapshot import

## Summary

Added production CLI enforcement for accepted live SPIKE-013/SPIKE-014 report proof.

The post-live report validator already checks the generated Markdown reports. This change wires that proof into `sync-recall-prod.mjs`, so production dry-run or apply can fail before Recall API or database work when accepted live-spike evidence is missing.

## Files Changed

| Path | Change |
|---|---|
| `scripts/sync-recall.ts` | Added `--require-live-spike-report-proof`, SPIKE report path flags, report freshness, and accepted fidelity-change flags. |
| `scripts/smoke-recall-cli-bundle.mjs` | Bundled smoke now proves missing live-spike proof fails, valid proof permits fixture dry-run, and proof is accepted on guarded apply. |
| `scripts/deploy.sh` | Local release gates now include approval packet and live-spike report smoke; deploy sync now includes the live-spike report checker and public privacy scanner. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Production dry-run/apply commands now pass live-spike report proof flags. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Recorded artifact/task updates. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Added proof enforcement to current evidence and remaining gate criteria. |

## New CLI Flags

```text
--require-live-spike-report-proof
--live-spike-enumeration-report-path <SPIKE-013.md>
--live-spike-fidelity-report-path <SPIKE-014.md>
--live-spike-report-max-age-minutes <n>
--live-spike-allow-fidelity-changes
--live-spike-accepted-fidelity-risk <text>
```

Environment variable equivalent:

```text
BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1
```

## Validation

Passed:

```text
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run check:recall-approval-packet
npm run smoke:recall-live-spike-reports
npm run check:recall-prelive
npm run lint
npm run typecheck
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' -o -name 'controlled-samples-status-smoke-*.json' -o -name 'recall-env-init-smoke-*.env' \) -print
```

The temp-file hygiene check printed no files.

## Boundaries

No live Recall API call was made.

No production dry-run, apply, deployment, or scheduler enablement was performed.

No API key, private Recall title, private source URL, card ID, or card content was added to public artifacts.
