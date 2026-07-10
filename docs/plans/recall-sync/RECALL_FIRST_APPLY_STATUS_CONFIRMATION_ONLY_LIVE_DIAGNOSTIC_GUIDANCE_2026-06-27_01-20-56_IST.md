# Recall First-Apply Status Confirmation-Only Live Diagnostic Guidance

Generated: 2026-06-27 01:20:56 IST

## Summary

The read-only Recall live diagnostic can now be reached from the normal first-apply status output even when the local no-live status run has not set live API confirmation yet.

Before this change, `npm run recall:first-apply:status` hid the private env-file diagnostic wrapper whenever the live gate reported `needs_live_api_confirmation`. That made the direct live diagnostic path look blocked by local private gates, even though the wrapper command itself includes `--confirm-live-api` and reruns the local guards before making exactly one read-only `/cards` probe.

## Root Cause

`scripts/check-recall-first-apply-status.mjs` only exposed `optionalNoWriteWrapperCommand` when `live_gate_status` was already fully ready. In no-live status mode, `live_gate_status` can be not-ready solely because explicit live confirmation is absent from the status process.

That status is not a private-file safety failure. If the private env file is loaded safely and private evidence is OK, the status helper should still surface the env-file diagnostic wrapper because the wrapper supplies explicit confirmation at execution time.

## Implementation

Updated `scripts/check-recall-first-apply-status.mjs` so:

- `envFileDiagnosticAvailableWithExplicitConfirmation` is true when:
  - the env file path is present;
  - `live_gate_status` verdict is `needs_live_api_confirmation`;
  - private evidence is OK;
  - the env file was loaded safely.
- `primarySafeReadOnlyDiagnosticCommand` now points to:
  - `npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json`
- `optionalNoWriteWrapperCommand`, `optionalNoWriteWrapperOutputFile`, and the lower-level live auth probe are exposed for this confirmation-only state.
- First-write, deploy, scheduler, and checkpoint actions remain blocked.

## Live Reproduction

Ran the private-env-file read-only diagnostic with explicit confirmation and a private output file:

```bash
npm run -s recall:first-apply:live-diagnostic -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-current-repro.json
```

Result:

| Field | Result |
| --- | --- |
| Diagnostic mode | `first_apply_live_read_diagnostic` |
| Status helper | Completed before the probe |
| Read-only endpoint | `/cards` |
| HTTP status | `200` |
| Authenticated | `true` |
| Reachable | `true` |
| Total count | `0` |
| Result count | `0` |
| Output file | `data/private/recall-live-spikes/live-diagnostic-current-repro.json` |
| Output mode | `0600` |

The private report checker passed for that output file:

```bash
npm run -s check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-current-repro.json
```

## Verification

| Check | Result |
| --- | --- |
| `node --check scripts/check-recall-first-apply-status.mjs` | Passed |
| `node --check scripts/smoke-recall-first-apply-status.mjs` | Passed |
| `npm run -s smoke:recall-first-apply-status` | Passed; includes confirmation-missing regression coverage |
| `npm run -s smoke:recall-first-apply-live-diagnostic` | Passed |
| `npm run -s check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-current-repro.json` | Passed |
| `npm run -s recall:first-apply:status` | Passed as incomplete by design; now recommends the private env-file diagnostic wrapper |
| `npm run -s check:recall-scheduler` | Passed |
| `npm run -s check:recall-approval-packet` | Passed |
| `npm run -s check:recall-public-docs-privacy` | Passed; scanned 74 curated public documents |
| `npm run -s recall:daily-sync:completion-status` | Passed as incomplete by design; active gate is `second_manual_verification_run` |
| `npm run -s recall:second-manual:readiness` | Passed; ready for approval only, with live write, scheduler, and checkpoint still disallowed |
| `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` | Passed; included 74-file public-doc privacy scan and completion-status snapshot at `second_manual_verification_run` |

## Related Completion Status Fix

The full pre-live gate exposed a secondary status issue after the live diagnostic guidance fix: `recall:daily-sync:completion-status` was using the strict apply-report freshness validator as durable historical evidence. Once the first apply report aged past 120 minutes, completion status incorrectly regressed from the real post-apply gate back to `first_apply_readiness`.

Updated `scripts/check-recall-daily-sync-completion-status.mjs` so completion status treats apply reports as durable historical evidence by default. The strict 120-minute freshness checks still remain in the guarded apply/deploy validators before new production actions.

`scripts/smoke-recall-daily-sync-completion-status.mjs` now includes a stale historical apply fixture proving that stale post-apply evidence does not mask the real `second_manual_verification_run` gate after first apply and production deploy evidence exist.

## Safety Notes

- One live Recall API call was made, read-only, against future-window `/cards`.
- No Recall -> AI Brain import was run.
- No AI Brain database write was made.
- No proof refresh was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- No Recall API key, raw response body, private card ID, title, source URL, chunk, or note content is included in this report.

## Current Gate

This fix does not complete the daily sync goal. The current production gate remains `second_manual_verification_run` for the Recall -> AI Brain apply flow, and scheduler enablement remains blocked until the required clean manual run evidence and explicit approval exist.
