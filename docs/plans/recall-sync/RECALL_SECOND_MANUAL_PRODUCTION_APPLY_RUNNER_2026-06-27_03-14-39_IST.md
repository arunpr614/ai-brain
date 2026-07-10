# Recall Second Manual Production Apply Runner - 2026-06-27 03:14 IST

## Purpose

Add a guarded production runner for the second manual Recall -> AI Brain verification apply.

The runner exists to prevent the next approved live step from depending on manual copy/paste or on local private gates that are not valid from the production host.

## Problem

The first capped apply has already completed and passed post-apply review. The active gate is now the second distinct clean manual verification run required before scheduler enablement.

After the production runtime preflight and remote runtime preflight were added, the remaining operator-risk was still practical:

- the generated command could be copied incorrectly
- the operator could forget the remote preflight
- the command could be run from the wrong directory
- a future agent could accidentally trust local readiness instead of production runtime readiness

## Change

Created `scripts/run-recall-second-manual-production-apply.mjs`.

The runner:

1. Builds the guarded second-manual command with `scripts/print-recall-second-manual-verification-command.mjs --json`.
2. Runs `scripts/check-recall-second-manual-remote-runtime-preflight.mjs` against the production host.
3. Refuses to execute the remote apply unless exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is present locally.
4. Runs the generated command from `BRAIN_REMOTE_DIR || /opt/brain` over SSH only after approval and preflight pass.
5. Passes `BRAIN_DIR` explicitly to the remote wrapper so the wrapper uses the same remote root the runner verified.
6. Skips the broad local readiness and local live-spike validation gates by default, so local private-file drift cannot stop the approved production runtime path first.
7. Reports whether a live write was attempted.

Created `scripts/smoke-recall-second-manual-production-apply.mjs`.

The smoke test uses a fake SSH command and production-shaped runtime root to prove:

- no approval means no remote apply attempt
- remote runtime preflight failure means no remote apply attempt
- exact approval reaches the remote manual wrapper in smoke only
- the remote wrapper receives manual mode, live confirmation, and capped import env
- output does not print secret-shaped API keys or bearer tokens

## Safety Properties

- Without exact approval, the runner is no-live/no-write.
- Local readiness and local live-spike validation are optional extra checks, not default production runner blockers.
- The remote guarded apply path still enforces live-spike report proof before constructing the Recall API client.
- The runner and remote preflight output surface deployed SPIKE-013/SPIKE-014 proof file readiness from the production root.
- The runner and remote preflight output also surface the latest deployed SPIKE-013/SPIKE-014 pair from production and whether it matches the locally selected pair timestamp.
- The runner does not enable or start `brain-recall-sync.timer`.
- The runner does not bypass the existing wrapper, scheduled apply guard, dry-run proof, backup proof, apply report review, or post-apply review gates.
- The runner does not add scheduler approval or checkpoint authority.
- The smoke test does not call Recall and does not write AI Brain data.

## Operator Command

No-live command handoff:

```bash
npm run recall:second-manual:production-command
```

The handoff checks the current completion gate, reruns no-live remote runtime preflight, and prints the guarded production runner command. Printing the command is not approval.

After exact approval is present:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records." \
npm run recall:second-manual:production-apply
```

## Verification

Passed:

- `node --check scripts/run-recall-second-manual-production-apply.mjs scripts/smoke-recall-second-manual-production-apply.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-prelive-readiness.mjs`
- `npm run -s smoke:recall-second-manual-production-apply`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s recall:second-manual:remote-runtime-preflight`
- `npm run -s recall:second-manual:production-apply` without approval exited blocked with `liveWriteAttempted: false`, local readiness/proof gates skipped, remote preflight ready, and no remote apply.
- The no-approval production probe surfaced `remotePreflight.proofReports.enumeration.ok: true` and `remotePreflight.proofReports.fidelity.ok: true` for the selected `2026-06-26_21-58-57_IST` SPIKE pair from `/opt/brain`.
- The no-approval production probe also surfaced `remotePreflight.deployedLatestReports.timestamp: 2026-06-26_21-58-57_IST` and `remotePreflight.deployedLatestReports.selectedMatchesRemoteLatest: true`.
- `npm run -s recall:second-manual:command -- --json --skip-readiness --skip-live-spike-gate`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

The first smoke attempt caught that the wrapper defaults `BRAIN_DIR` to `/opt/brain`; the runner now passes `BRAIN_DIR` explicitly with the selected remote root before invoking the generated command.

Completion status now points the safe next commands at:

```text
No-live handoff before approval: run npm run recall:second-manual:production-command
Only after exact approval: run npm run recall:second-manual:production-apply
```

## Current Gate

This change does not complete the live run.

Current active gate remains:

- `currentBlockingGate`: `second_manual_verification_run`
- owner: Arun
- required action: exact approval before production apply
