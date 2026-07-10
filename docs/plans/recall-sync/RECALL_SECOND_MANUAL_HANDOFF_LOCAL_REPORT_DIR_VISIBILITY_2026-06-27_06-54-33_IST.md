# Recall Second Manual Handoff Local Report Directory Visibility

Created: 2026-06-27 06:54 IST
Owner: Codex
Status: Completed; no live write performed
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the no-live second-manual production command handoff surface the local private apply-report directory before Arun approves the live write.

This report contains no Recall API key, bearer token, private Recall card ID, title, source URL, raw chunk, raw response body, apply payload, or database row.

## Root Cause

The production apply runner had already been hardened to reject unsafe `--local-report-dir` values before any remote apply. However, the no-live handoff command did not expose the report-copy destination. Operators could see remote readiness and approval text, but not the local private evidence destination that the future approved runner would use.

The safer handoff should show the destination up front and refuse to print a runnable command if an override points outside private Recall evidence.

## Changes

| Area | File | Change |
| --- | --- | --- |
| No-live handoff | `scripts/print-recall-second-manual-production-apply-command.mjs` | Added `localReportDir` JSON/Markdown visibility with `path`, `privateRoot`, `underPrivateRecallEvidencePath`, and `runnerDefault`. |
| Unsafe override handling | `scripts/print-recall-second-manual-production-apply-command.mjs` | Added `--local-report-dir`; unsafe overrides now fail with `local_apply_report_dir_not_private` and withhold the runnable command by returning `command: null`. |
| Smoke coverage | `scripts/smoke-recall-second-manual-production-command.mjs` | Proves default report dir is private, private overrides are printed in the command, unsafe overrides fail, and unsafe failures do not print a runnable command. |
| Static release guard | `scripts/check-recall-scheduler-artifacts.mjs` | Now asserts handoff local-report-dir visibility, private root definition, unsafe override refusal, and smoke proof. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added this handoff visibility milestone. |
| Public-doc privacy corpus | `scripts/check-recall-public-docs-privacy.mjs` | Added this report to the curated Recall public-doc scan. |

## Verification

Passed:

- `node --check scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-production-command.mjs`
- `npm run -s smoke:recall-second-manual-production-command`
- `node --check scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-production-command.mjs scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:second-manual:production-command -- --json`

Expected no-live failure:

- `npm run -s recall:second-manual:production-command -- --json --local-report-dir docs/plans/recall-sync/unsafe-handoff-report-cache` exited 1 with `localReportDir.underPrivateRecallEvidencePath: false`, finding `local_apply_report_dir_not_private`, and `command: null`.

## Current Gate

The normal no-live handoff now reports:

- `localReportDir.path: data/private/recall-live-spikes`
- `localReportDir.underPrivateRecallEvidencePath: true`
- `localReportDir.runnerDefault: true`
- remote preflight ready
- `liveApplyDelegationAllowed: true`

This does not approve or run the live write. The current gate remains exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`:

```text
I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.
```

Scheduler enablement remains separately blocked until two distinct clean manual runs exist and the separate scheduler evidence gate passes.

## Safety Notes

- No Recall import was run.
- No AI Brain row was written.
- No production apply was run.
- No scheduler timer was enabled or started.
- No checkpoint was moved.
- The stale first capped apply approval remains spent and does not authorize the second-manual verification write.
