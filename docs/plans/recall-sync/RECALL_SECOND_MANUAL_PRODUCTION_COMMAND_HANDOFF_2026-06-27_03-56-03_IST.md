# Recall Second Manual Production Command Handoff - 2026-06-27 03:56 IST

## Purpose

Add a no-live command handoff for the second manual Recall -> AI Brain production verification run.

This closes an operator usability gap: the preferred execution path is the guarded production runner, but future operators still had to combine the approval text, runner command, and current remote preflight evidence from multiple docs.

## Change

Created `scripts/print-recall-second-manual-production-apply-command.mjs`.

The handoff command:

1. Runs the no-live completion-status helper and confirms the active gate is `second_manual_verification_run`.
2. Runs the no-live remote runtime preflight with broad local readiness/live-spike gates skipped.
3. Surfaces remote timer/env flag state, runtime preflight status, deployed proof report readiness, and latest deployed proof-pair matching.
4. Prints the preferred production runner command:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL='I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.' \
npm run recall:second-manual:production-apply
```

## Safety Properties

- Printing the command is not approval.
- The printer does not call Recall, import data, deploy, enable a scheduler, or advance checkpoints.
- The printed command still routes through `npm run recall:second-manual:production-apply`, which reruns remote preflight and refuses to apply unless the exact approval env is present.
- Scheduler enablement remains separate and still requires two distinct clean manual run reports plus explicit scheduler approval/evidence.
- Smoke coverage asserts the command handoff distinguishes printing from approval and keeps scheduler enablement separate.

## Commands

No-live handoff:

```bash
npm run recall:second-manual:production-command
```

JSON form:

```bash
npm run recall:second-manual:production-command -- --json
```

Smoke:

```bash
npm run smoke:recall-second-manual-production-command
```

## Verification

Passed:

- `node --check scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-production-command.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs`
- `npm run -s smoke:recall-second-manual-production-command`
- `npm run -s recall:second-manual:production-command -- --json` - returned `currentBlockingGate: second_manual_verification_run`, remote preflight ready, timer disabled/inactive, remote Recall enable flags disabled, and `selectedMatchesRemoteLatest: true`.
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy` - scanned 87 curated public Recall docs.
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` - full no-live pre-live passed and surfaced the production command handoff in `safeNextCommands`.

## Current Gate

This change does not execute the live write.

Current active gate remains:

- `currentBlockingGate`: `second_manual_verification_run`
- owner: Arun
- required action: exact approval before production apply
