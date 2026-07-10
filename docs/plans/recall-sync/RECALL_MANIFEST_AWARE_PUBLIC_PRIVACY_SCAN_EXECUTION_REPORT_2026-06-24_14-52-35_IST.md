# Recall Manifest-Aware Public Privacy Scan Execution Report

Created: 2026-06-24 14:52 IST
Owner: Codex
Status: Done for offline scope; live Recall execution remains blocked pending approval
Related tracker task: RDS-026an1

## Summary

Added a manifest-aware public report privacy scan for the Recall live SPIKE-013/SPIKE-014 workflow. The existing public privacy scanner catches generic secret patterns; this scanner also checks generated public reports against the private controlled sample manifest for private values.

No live Recall API call, private Recall card inspection, production dry-run, production apply, deployment, or scheduler enablement was performed.

## Files Changed

| File | Change |
|---|---|
| `scripts/check-recall-public-manifest-privacy.mjs` | Checker that scans public reports for exact and normalized private manifest values without printing those values. |
| `scripts/lib/recall-controlled-samples.mjs` | Shared manifest parser imported by the checker; production deploy now copies this helper with the checker. |
| `scripts/run-recall-live-spikes.mjs` | Calls the manifest-aware checker after generating SPIKE-013/SPIKE-014 reports and running the generic public privacy scan. |
| `scripts/check-recall-live-spike-reports.mjs` | Accepts optional `--manifest` so post-live report acceptance can rerun exact and normalized private-value privacy checks locally; helper scripts resolve from the checker location. |
| `scripts/smoke-recall-live-spike-reports.mjs` | Proves the optional `--manifest` acceptance path rejects private-value leaks without printing the leaked value and works from a non-root cwd. |
| `scripts/smoke-recall-cli-bundle.mjs` | Copies the manifest-aware checker and manifest helper into the deploy-matching no-src `scripts/` layout and exercises the `--manifest` report gate. |
| `scripts/smoke-recall-live-spikes.mjs` | Adds a negative case proving a private expected-title leak fails without echoing the leaked private value. |
| `package.json` | Adds `check:recall-public-manifest-privacy`. |
| `scripts/deploy.sh` | Copies the manifest-aware checker to production artifacts and runs `npm run smoke:recall-live-spikes` as a local release gate. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static assertions that deploy carries the checker and runs live-spike rehearsal smoke. |
| `scripts/check-recall-approval-packet.mjs` | Adds the new command to approval packet drift checks. |
| `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Adds the manifest-aware scan before sharing/committing reports. |
| `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Documents the two public report scans. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Adds the manifest-aware scan to report evidence handling. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Adds artifact, report, task, and next-action evidence. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds current-state safety-gate evidence. |

## Private Values Checked

The scanner checks public reports for exact and normalized matches of:

- controlled sample card IDs;
- controlled sample expected titles;
- controlled sample full source URLs;
- controlled sample source URL paths and query strings;
- outside-window negative-control card ID;
- outside-window negative-control expected title.

The checker reports only the value kind, sample label, file path, and line number. It does not print the matched private value.

Follow-up hardening on 2026-06-24 18:00 IST added normalized matching for case, whitespace, HTML entity, and percent-encoding variants. See `RECALL_MANIFEST_PRIVACY_NORMALIZED_MATCHING_EXECUTION_REPORT_2026-06-24_18-00-19_IST.md`.

## Validation

Focused validation passed:

```text
npm run smoke:recall-live-spikes
npm run check:recall-scheduler
```

Observed result:

- manifest-driven SPIKE-013/SPIKE-014 fixture rehearsal still passed;
- generated reports still passed generic public privacy scanning;
- generated reports passed manifest-aware scanning;
- a deliberately leaky public report containing a private expected title was rejected;
- the rejection output did not print the private title value;
- static deploy/scheduler check now verifies the checker and its manifest helper are copied, the bundled CLI smoke carries the helper path in the production `scripts/` layout, and the live-spike rehearsal smoke is a local deploy gate.

## Remaining Gates

This guard improves public report safety but does not clear the live blockers. Completion still requires:

1. approved API-key handling;
2. real controlled Recall sample cards;
3. private controlled sample manifest validation;
4. approved live SPIKE-013/SPIKE-014 run;
5. accepted live-spike report gate;
6. production dry-run and review;
7. first capped apply with backup proof;
8. production deploy;
9. scheduler enablement and first scheduled run verification.
