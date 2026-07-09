# Recall Pre-Live Next Gate Static Release Guard

Date: 2026-06-27 01:53 IST
Status: Done for no-live/no-write release-gate hardening
Scope: Recall -> AI Brain pre-live readiness release guard

## Summary

The pre-live readiness command now surfaces the active production gate as structured JSON, but that behavior needed a fast regression guard. The long manifest-enforced pre-live command proves the behavior end to end, but a lightweight static release gate should also fail if the script loses the structured `nextGate.currentProductionGate` contract.

This report records the static guard added to `scripts/check-recall-scheduler-artifacts.mjs`.

## Implementation

Updated `scripts/check-recall-scheduler-artifacts.mjs` to assert that `scripts/check-recall-prelive-readiness.mjs` contains:

- `statusSummary`;
- `currentProductionGate`;
- `manualCleanRunReadiness`;
- the no-write safety note: `Pre-live is no-live/no-write. It does not approve live writes, scheduler enablement, or checkpoint movement.`

These assertions make `npm run check:recall-scheduler` fail if pre-live readiness regresses to a string-only next gate or drops manual clean-run readiness from its release-facing output.

## Verification

Passed:

| Command | Result |
| --- | --- |
| `node --check scripts/check-recall-scheduler-artifacts.mjs` | Passed |
| `npm run -s check:recall-scheduler` | Passed |
| `node --check scripts/check-recall-prelive-readiness.mjs` | Passed |
| `npm run -s smoke:recall-prelive-output` | Passed |
| `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` | Passed; top-level next gate still points at `second_manual_verification_run` |
| `npm run -s check:recall-public-docs-privacy` | Passed; scanned 77 public Recall docs before adding this report |
| `npm run -s smoke:recall-public-docs-privacy` | Passed |
| `npm run -s recall:second-manual:readiness` | Passed; still approval-only |

## Current Gate

The real production gate remains unchanged:

- `currentBlockingGate`: `second_manual_verification_run`;
- owner: Arun;
- clean manual run count: `1`;
- scheduler approval by manual-run evidence: `false`;
- blocked actions: `second_manual_verification`, `scheduler`, `checkpoint`.

No Recall API call, import, database write, production deploy, scheduler enablement, or checkpoint movement happened.
