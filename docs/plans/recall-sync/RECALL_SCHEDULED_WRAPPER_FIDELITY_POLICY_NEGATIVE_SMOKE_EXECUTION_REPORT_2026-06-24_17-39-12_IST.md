# Recall Scheduled Wrapper Fidelity-Policy Negative Smoke Execution Report

Created: 2026-06-24 17:39 IST
Owner: Codex
Status: Done for offline scope; scheduler remains disabled pending live proof and approval

## Purpose

Prove the future scheduled Recall job cannot accidentally apply ordinary unverified Recall API chunks unless the operator explicitly enables the fidelity acceptance flag.

This came from the technical-architecture audit: the positive scheduled-wrapper smoke proved the accepted path, but it did not prove the default policy-blocking path inside the disabled future timer wrapper.

## Change

- Updated `scripts/smoke-recall-scheduled-wrapper.mjs` to run a valid fixture/proof scheduled job without `BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT`.
- The smoke now asserts that:
  - the wrapper exits before backup/apply;
  - the dry-run report records `plannedActionCounts.blocked_by_fidelity_policy: 1`;
  - no scheduled preflight report is created;
  - no scheduled apply report is created.
- Fixed `scripts/recall-scheduled-apply.sh` so optional Bash arrays expand safely when empty under `set -u`.
  - This closed a real bug found by the negative smoke: an empty `policy_args` array could abort the wrapper before the dry-run command.
- Updated `scripts/check-recall-scheduler-artifacts.mjs` to require safe optional-array expansion and the negative smoke coverage.

## Validation

Passed:

```text
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
```

The scheduled-wrapper smoke now covers:

- unconfirmed live API mode rejected before report directory creation;
- missing live-spike proof rejected before report directory creation;
- unaccepted unverified Recall chunks rejected before backup/apply;
- accepted live-spike-proofed dry-run, backup proof, and proof-backed apply with the packaged CLI.

No live Recall API call was made. No production dry-run, production apply, deploy, or scheduler enablement was performed.

## Remaining Gate

This only proves the disabled scheduled wrapper's fixture behavior. Live scheduler enablement still requires approved live SPIKE-013/SPIKE-014 reports, a reviewed live dry-run, first capped apply, repeated clean manual runs, production deploy, and explicit scheduler approval.
