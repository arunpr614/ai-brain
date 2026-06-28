# Recall Pre-Live Readiness Command Execution Report

Created: 2026-06-24 12:50 IST
Status: Done for offline scope; live Recall API execution still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a consolidated pre-live readiness gate for the Recall -> AI Brain daily sync workstream.

The previous runbooks had several separate checks before live API work: private-ignore validation, live-spike rehearsal, controlled manifest validation, public-report privacy scan, scheduler static safety, and packaged CLI smoke. This change keeps those checks available individually while adding one command that can be run before approved live work. Later updates added dry-run report validator smoke, scheduled wrapper smoke, private env-template initializer smoke, approval packet consistency, and live spike report gate smoke to this same gate, so first-apply, credential-file setup, handoff consistency, post-live report review, and future scheduler guardrails are rehearsed before live API work.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Pre-live readiness command | `scripts/check-recall-prelive-readiness.mjs` | Runs the Recall offline readiness gate sequence and emits structured JSON. |
| Package command | `package.json` | Added `npm run check:recall-prelive`. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added the pre-live readiness gate before live access. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Replaced scattered pre-live commands with the consolidated readiness command plus manifest form. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added artifact, report, task, blocker, and next-action updates. |
| Dry-run report validator smoke | `scripts/check-recall-prelive-readiness.mjs` | The pre-live gate now runs `npm run smoke:recall-dry-run-report`. |
| Scheduled wrapper smoke | `scripts/check-recall-prelive-readiness.mjs` | The pre-live gate now runs `npm run smoke:recall-scheduler-wrapper` after building the packaged CLI. |
| Private env initializer smoke | `scripts/check-recall-prelive-readiness.mjs` | The pre-live gate now runs `npm run smoke:recall-env-init`. |
| Live spike report gate smoke | `scripts/check-recall-prelive-readiness.mjs` | The pre-live gate now runs `npm run smoke:recall-live-spike-reports`. |

## Gate Sequence

`npm run check:recall-prelive` runs:

1. `npm run check:recall-private-ignore`
2. Optional `npm run check:recall-controlled-samples -- <manifest>`
3. `npm run smoke:recall-controlled-samples-init`
4. `npm run smoke:recall-env-init`
5. `npm run smoke:recall-live-gate-status`
6. `npm run check:recall-approval-packet`
7. `npm run smoke:recall-live-spikes`
8. `npm run smoke:recall-live-spike-reports`
9. `npm run check:recall-public-privacy`
10. `npm run smoke:recall-dry-run-report`
11. `npm run check:recall-scheduler`
12. `npm run build:recall-cli`
13. `npm run smoke:recall-cli:bundle`
14. `npm run smoke:recall-scheduler-wrapper`

The manifest form is:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The no-manifest form is still useful before the private sample file exists. The manifest form should be used before approved live SPIKE-013/SPIKE-014 execution.

## Validation Evidence

Help output:

```text
npm run check:recall-prelive -- --help
```

Result: passed.

Required-manifest negative control:

```text
npm run check:recall-prelive -- --require-manifest
```

Result: exited with code `1` after passing the private-ignore check and failing because no manifest was supplied.

Offline readiness gate:

```text
npm run check:recall-prelive
```

Result:

```text
ok: true
private_ignore: passed
controlled_samples: skipped
controlled_samples_init_smoke: passed
recall_env_init_smoke: passed
live_gate_status_smoke: passed
public report exposure manifest rejected: covered by live_gate_status_smoke
live_spike_rehearsal: passed
public_privacy_scan: passed
dry_run_report_review_gate: passed
scheduler_static_safety: passed
production_cli_build: passed
production_cli_bundle_smoke: passed
scheduled_wrapper_smoke: passed
nextGate: Populate and validate the private manifest before live API access.
```

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | No key has been requested in chat or written to tracked files. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Run the manifest form of `check:recall-prelive` once the file exists. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use the combined runner after approval and pre-live readiness. |
| Production dry-run/apply/deploy/scheduler | Blocked | Must wait for live spike reports and explicit apply/deployment approval. |

## Operator Next Step

After controlled Recall sample cards exist, populate:

```text
data/private/recall-live-spikes/controlled-samples.json
```

Then run:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Only after that gate passes and Arun approves API-key handling should live SPIKE-013/SPIKE-014 be run.
