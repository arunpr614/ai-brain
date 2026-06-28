# Recall Second Manual Verification Apply Approval Packet - 2026-06-27 00:14 IST

## Purpose

Prepare the second distinct clean manual production verification run required before enabling the daily Recall -> AI Brain scheduler.

This packet does not approve or run the write. It defines the exact approval text, guardrails, command shape, and expected evidence for a future approved run.

## Current State

Done:

- First capped apply completed and passed post-apply review.
- Production deploy completed and passed deploy evidence verification.
- Scheduler enablement evidence validator now requires distinct manual clean run report evidence.
- Scheduler enablement evidence recorder exists and is wired into pre-live/deploy gates.
- `npm run recall:second-manual:readiness` exists and reports machine readiness for owner approval without granting write permission.
- The manual verification wrapper reruns a deploy-safe runtime preflight internally before delegating to the guarded apply path.
- `npm run recall:second-manual:command` exists and prints a no-live, concrete command using the latest validated SPIKE-013/SPIKE-014 proof pair, so operators do not have to hand-edit report path placeholders.
- `npm run recall:second-manual:production-command` exists and prints the preferred guarded production-runner command plus current no-live completion/remote-preflight status.
- `npm run recall:second-manual:production-apply` exists and runs the generated command from the production host only after exact approval and a remote runtime preflight pass.

Not done:

- Second manual verification run has not been approved.
- Second manual verification run has not been executed.
- Scheduler has not been enabled.

## Exact Approval Text

Use this exact approval text before running the second manual verification wrapper:

```text
I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.
```

Do not use the earlier first capped apply approval text for this gate. The first capped apply is already complete; `BRAIN_RECALL_FIRST_APPLY_APPROVAL` must not be treated as approval for the current `second_manual_verification_run` gate.

## Guarded Command Shape

Before approval and again immediately before any live run, verify the consolidated no-live current gate:

```bash
npm run -s recall:current-gate
```

Expected status before approval:

- `status: ready_for_second_manual_exact_approval`
- `currentBlockingGate: second_manual_verification_run`
- `activeBlockedRequirement: second_manual_verification`
- `approvalRequiredEnv: BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`
- `exactApprovalPresent: false`
- `firstApplyApprovalPresent: false`
- `secondManualApprovalInWrongEnv: false`
- `localGateStatus: not_blocking_production_path`
- `remotePreflightPassed: true`
- `liveWriteAttempted: false`
- `schedulerAllowedNow: false`
- `checkpointAllowedNow: false`

If this command fails with `stale_first_apply_approval_present`, unset `BRAIN_RECALL_FIRST_APPLY_APPROVAL`; it is stale for this phase and must not be translated into second-manual approval. If it fails with `second_manual_approval_wrong_env`, put the exact approval text in `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` only when intentionally running the approved production apply.

Before approval and again immediately before any live run, verify the no-live readiness gate:

```bash
npm run -s recall:second-manual:readiness
```

Expected status before approval: `ready_for_second_manual_verification_approval`, with `liveWriteAllowedNow: false`.

Preferred command generation after exact approval:

```bash
npm run -s recall:second-manual:command
```

This builder is no-live/no-write. It validates the latest matching SPIKE-013/SPIKE-014 report pair, verifies second-manual readiness, and prints a concrete guarded command with the resolved proof paths. The private controlled-samples manifest is used for local proof validation and is omitted from the production command by default; pass `--include-runtime-manifest` only when that private manifest path exists from the production root.

Before running the generated live command, verify the production host can pass the same runtime gate without calling Recall:

```bash
npm run -s recall:second-manual:remote-runtime-preflight
```

Expected status: `ready_for_second_manual_remote_runtime_preflight`, with remote timer disabled/inactive, remote Recall enable flags disabled, and remote runtime preflight `liveApplyDelegationAllowed: true`.

Preferred approved production execution path:

```bash
npm run -s recall:second-manual:production-command
```

This handoff command is no-live/no-write. It checks the current completion gate, reruns the no-live remote runtime preflight, and prints the exact guarded runner command. Printing that command is not approval.

Before copying or running the printed command, confirm the handoff progress block says the flow is waiting on exact approval, not local private gates:

- `handoffProgress.stoppedAt: ready_for_exact_approval`
- `handoffProgress.readyForExactApproval: true`
- `handoffProgress.localPrivateGatesSkippedForProductionPath: true`
- `handoffProgress.localGateStatus: not_blocking_production_path`
- `handoffProgress.remotePreflightPassed: true`
- `handoffProgress.liveWriteAttempted: false`
- `handoffProgress.liveCallNotAttemptedBecause: this handoff is no-live/no-write; exact second-manual approval is the next required action after production remote preflight passed`

Before exact approval and again immediately before any live run, verify broad pre-live carries the same local-gate resolution proof:

```bash
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Expected manifest-enforced pre-live local-gate proof:

- `nextGate.localGateResolution.noLiveNoWrite: true`
- `nextGate.localGateResolution.liveWriteAttempted: false`
- `nextGate.localGateResolution.currentGate: second_manual_verification_run`
- `nextGate.localGateResolution.handoffProgress.stoppedAt: ready_for_exact_approval`
- `nextGate.localGateResolution.preApplyProgress.stoppedAt: approval_gate`
- `nextGate.localGateResolution.preApplyProgress.remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`
- `nextGate.localGateResolution.preApplyProgress.selectedReports.timestamp: 2026-06-26_21-58-57_IST`
- `nextGate.localGateResolution.preApplyProgress.selectedReports.selectedBy: remote_latest_deployed_pair`
- `nextGate.localGateResolution.preApplyProgress.remoteProofReports.enumerationOk: true`
- `nextGate.localGateResolution.preApplyProgress.remoteProofReports.fidelityOk: true`
- `nextGate.localGateResolution.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest: true`

Do not run the live command if broad pre-live no longer carries this proof. Repair or regenerate the pre-live evidence first, because the approval packet must not rely on stale local assumptions about production proof selection.

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records." \
npm run recall:second-manual:production-apply
```

The production apply runner is blocked before any remote apply unless the exact approval env is present. It rebuilds the guarded command, reruns the remote runtime preflight, then runs the generated command from `/opt/brain` through SSH.

For the production runner, broad local readiness and local live-spike validation are skipped by default so local private-file drift cannot stop the approved production path first. Production still enforces the deployed runtime preflight and the remote guarded apply path validates live-spike report proof before any Recall API call.

The no-approval production probe also surfaces `remotePreflight.proofReports` so the operator can see the selected SPIKE-013/SPIKE-014 proof files are readable from `/opt/brain` before approval. It also surfaces `remotePreflight.deployedLatestReports` so the operator can confirm the latest deployed production proof pair timestamp matches the locally selected pair.

After exact approval, run from the production host or through a controlled production shell where `/opt/brain` has the deployed Recall scripts:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records." \
BRAIN_RECALL_SYNC_ENABLED=1 \
BRAIN_RECALL_CONFIRM_LIVE_API=1 \
BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1 \
BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH=<SPIKE-013-report-path> \
BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH=<SPIKE-014-report-path> \
BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES=1 \
BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK="Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used." \
BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT=1 \
BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT=1 \
BRAIN_RECALL_WARNING_UI_AVAILABLE=1 \
BRAIN_RECALL_MAX_IMPORTS=5 \
bash scripts/recall-second-manual-verification-apply.sh
```

Replace the SPIKE report paths with the current accepted SPIKE-013/SPIKE-014 report pair before running.

Prefer the generated command from `npm run -s recall:second-manual:command` instead of manually replacing the SPIKE placeholders above.

## What The Wrapper Does

`scripts/recall-second-manual-verification-apply.sh`:

- refuses without exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`
- requires `BRAIN_RECALL_SYNC_ENABLED=1`
- requires `BRAIN_RECALL_CONFIRM_LIVE_API=1` outside fixture mode
- reruns `scripts/check-recall-second-manual-runtime-preflight.mjs` and stops before apply delegation if deployed helper scripts, proof paths, fidelity flags, or the capped import limit are not production-ready
- sets `BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1`
- delegates to `scripts/recall-scheduled-apply.sh`
- does not enable or start `brain-recall-sync.timer`

`scripts/recall-scheduled-apply.sh` in manual verification mode:

- requires the same exact manual verification approval
- keeps scheduler timer enablement separate from manual verification
- runs dry-run proof
- validates the dry-run report
- creates backup proof
- runs proof-backed apply
- validates the apply report
- prints the generated `scheduled-apply-*.json` report path

`scripts/run-recall-second-manual-production-apply.mjs` now also captures that remote `scheduled-apply-*.json` report after the approved SSH execution, copies it into the ignored private local Recall evidence directory, reruns `scripts/check-recall-apply-report.mjs` locally with the second-manual cap and explicit fidelity flags, and returns a `secondManualApplyReport.localReview.verdict` summary. A successful approved production runner should report `PASS_POST_APPLY_REVIEW_GATE` in that summary before any scheduler decision.

## Expected Evidence

After a successful approved run, record:

- generated dry-run report path
- generated backup path
- generated apply report path
- post-apply review verdict `PASS_POST_APPLY_REVIEW_GATE`
- production runner `secondManualApplyReport.remoteApplyReportPath`
- production runner `secondManualApplyReport.localApplyReportPath`
- production runner `secondManualApplyReport.localReview.verdict: PASS_POST_APPLY_REVIEW_GATE`

The generated apply report path becomes the second `manualCleanRuns[]` entry for the later scheduler enablement evidence recorder.

## Stop Conditions

Do not run the second manual verification wrapper if:

- exact approval text is absent
- `npm run -s recall:current-gate` does not return `ready_for_second_manual_exact_approval`
- `npm run -s recall:current-gate` reports `firstApplyApprovalPresent: true`
- `npm run -s recall:current-gate` reports `secondManualApprovalInWrongEnv: true`
- `BRAIN_RECALL_FIRST_APPLY_APPROVAL` is present in the shell; that approval is stale for this phase
- `npm run recall:second-manual:readiness` does not return `ready_for_second_manual_verification_approval`
- manifest-enforced pre-live does not expose `nextGate.localGateResolution` with `preApplyProgress.stoppedAt: approval_gate`
- manifest-enforced pre-live does not report `preApplyProgress.remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`
- manifest-enforced pre-live does not report `preApplyProgress.selectedReports.selectedBy: remote_latest_deployed_pair`
- manifest-enforced pre-live does not report `preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest: true`
- production deploy evidence is missing or stale
- key rotation evidence is stale or missing
- accepted SPIKE report proof is missing
- the runtime preflight fails because required deployed helper scripts or proof report files are missing
- dry-run proof reports blocked cards, remote changes, or unapproved fidelity classes
- production health or provider checks are failing
- `brain-recall-sync.timer` is already enabled unexpectedly
- any command risks printing API keys, bearer tokens, raw Recall content, source URLs, titles, chunks, or private payloads

## Verification Before This Packet Was Published

Passed:

- `npm run -s smoke:recall-manual-verification-apply`
- `npm run -s smoke:recall-second-manual-readiness`
- `npm run -s recall:second-manual:readiness`
- `npm run -s smoke:recall-scheduler-wrapper`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

Additional wrapper-readiness guard verification on 2026-06-27 02:24 IST:

- `npm run -s smoke:recall-manual-verification-apply` - proves the wrapper reruns readiness, stops on readiness failure, and still delegates only after exact approval/sync/live confirmation.

Additional command-builder verification on 2026-06-27 02:34 IST:

- `npm run -s smoke:recall-second-manual-command` - proves the builder selects a matching SPIKE pair, validates proof, and prints concrete report paths without placeholders.
- `npm run -s recall:second-manual:command -- --json` - selected `SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md` and `SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md`, with `PASS_WITH_ACCEPTED_FIDELITY_CHANGES` and readiness `ready_for_second_manual_verification_approval`.

Additional runtime-preflight/deploy alignment verification on 2026-06-27 02:48 IST:

- `npm run -s smoke:recall-second-manual-runtime-preflight` - proves deployed proof/helper checks pass in a production-shaped scratch root and fail for missing proof, scheduler-enabled manual runs, import caps above 5, and missing helper scripts.
- `npm run -s smoke:recall-manual-verification-apply` - proves the wrapper calls the runtime preflight and stops before scheduled-apply delegation on runtime-preflight failure.
- `npm run -s check:recall-scheduler` - statically requires deploy to copy the runtime preflight, post-apply checker, and public SPIKE proof reports.

Additional remote runtime-preflight verifier evidence on 2026-06-27 03:06 IST:

- `npm run -s smoke:recall-second-manual-remote-runtime-preflight` - proves the verifier can run through an SSH shim, pass with production-shaped runtime files, and fail when a remote runtime helper is missing.
- `npm run -s recall:second-manual:remote-runtime-preflight` - passed against `brain`/`/opt/brain` with `ready_for_second_manual_remote_runtime_preflight`, remote timer disabled/inactive, remote Recall enable flags disabled, and remote runtime preflight `liveApplyDelegationAllowed: true`.

Additional guarded production-apply runner evidence on 2026-06-27 03:14 IST:

- `npm run -s smoke:recall-second-manual-production-apply` - proves the runner refuses without exact approval, stops before apply when remote preflight fails, and reaches the remote manual wrapper only after exact approval in smoke.

Additional second-manual apply-report capture evidence on 2026-06-27 06:33 IST:

- `npm run -s smoke:recall-second-manual-production-apply` - proves the approved production runner copies the remote `scheduled-apply-*.json` report into the ignored local private evidence directory and locally validates it with `PASS_POST_APPLY_REVIEW_GATE`.
- `npm run -s recall:second-manual:production-apply` without exact approval - still stops before live write, so `secondManualApplyReport` is `null` until an approved run actually produces the remote report.

Additional production-runner local-gate bypass evidence on 2026-06-27 03:31 IST:

- `npm run -s recall:second-manual:production-apply` without exact approval - blocked before apply with `liveWriteAttempted: false`, local readiness/live-spike gates skipped, and remote runtime preflight ready.

Additional deployed proof report surfacing evidence on 2026-06-27 03:38 IST:

- `npm run -s recall:second-manual:production-apply` without exact approval - blocked before apply while surfacing `remotePreflight.proofReports.enumeration.ok: true` and `remotePreflight.proofReports.fidelity.ok: true` for the selected SPIKE pair from `/opt/brain`.

Additional latest deployed proof-pair matching evidence on 2026-06-27 03:47 IST:

- `npm run -s smoke:recall-second-manual-remote-runtime-preflight` and `npm run -s smoke:recall-second-manual-production-apply` now prove `remotePreflight.deployedLatestReports.selectedMatchesRemoteLatest: true` is surfaced without making a live Recall call.
- The production no-approval probe is expected to surface `remotePreflight.deployedLatestReports.timestamp: 2026-06-26_21-58-57_IST` and `selectedMatchesRemoteLatest: true` before any approved apply.

Additional production command handoff evidence on 2026-06-27 03:56 IST:

- `npm run -s smoke:recall-second-manual-production-command` proves the handoff prints the guarded production runner command, distinguishes printing from live approval, keeps scheduler enablement separate, and remains no-live/no-write.
- `npm run -s recall:second-manual:production-command -- --json` is the preferred no-live operator handoff before the exact approved run.

Additional production command handoff progress evidence on 2026-06-27 07:13 IST:

- `npm run -s smoke:recall-second-manual-production-command` now proves the no-live handoff reports exact approval as the next live-write action and reports local private gates are not blocking the production path.
- `npm run -s recall:second-manual:production-command -- --json` now reports `handoffProgress.stoppedAt: ready_for_exact_approval`, `handoffProgress.localPrivateGatesSkippedForProductionPath: true`, `handoffProgress.localGateStatus: not_blocking_production_path`, `handoffProgress.remotePreflightPassed: true`, and `handoffProgress.liveWriteAttempted: false`.

Additional current-gate approval-mismatch evidence on 2026-06-27 08:51 IST:

- `npm run -s smoke:recall-current-gate` now proves stale first-apply approval and second-manual approval in the wrong environment fail without printing secret-shaped values.
- `npm run -s recall:current-gate` now reports `ready_for_second_manual_exact_approval`, `firstApplyApprovalPresent: false`, `secondManualApprovalInWrongEnv: false`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false` in a clean shell.
- `BRAIN_RECALL_FIRST_APPLY_APPROVAL='<first capped apply approval text>' npm run -s recall:current-gate` exits blocked no-live with `stale_first_apply_approval_present`, proving the already-spent first capped apply approval cannot authorize the second-manual live write.

Additional pre-live local-gate proof alignment evidence on 2026-06-27 09:43 IST:

- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passes with `nextGate.localGateResolution.preApplyProgress.stoppedAt: approval_gate`.
- The pre-live proof shows `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, selected proof pair `2026-06-26_21-58-57_IST`, `selectedBy: remote_latest_deployed_pair`, and `selectedMatchesRemoteLatest: true`.
- `npm run -s check:recall-approval-packet` now requires the second-manual approval packet to include this broad pre-live local-gate proof before any live run.

Additional production wrapper drift fix evidence on 2026-06-27 04:52 IST:

- Production `/opt/brain/scripts/recall-scheduled-apply.sh` now contains the manual env preservation guard required for second-manual apply delegation.
- Production `/opt/brain/scripts/check-recall-second-manual-runtime-preflight.mjs` now rejects a stale scheduled wrapper missing that guard before any approved remote apply.
- `npm run -s recall:second-manual:remote-runtime-preflight` passed after the narrow scripts-only production update.
- `npm run -s recall:second-manual:production-apply` without exact approval still stopped before remote apply with `liveWriteAttempted: false`.

Additional key-rotation preflight guard evidence on 2026-06-27 05:09 IST:

- Production `/opt/brain/scripts/check-recall-second-manual-runtime-preflight.mjs` now runs the same key-rotation evidence checker as the scheduled wrapper before second-manual apply delegation.
- `npm run -s smoke:recall-second-manual-runtime-preflight`, `npm run -s smoke:recall-second-manual-remote-runtime-preflight`, `npm run -s smoke:recall-second-manual-production-apply`, and `npm run -s check:recall-scheduler` passed with stale-key-evidence refusal coverage.
- `npm run -s recall:second-manual:remote-runtime-preflight` now blocks before approval with `key_rotation_evidence`, which is the intended current state until production key evidence is repaired.
- `npm run -s recall:second-manual:production-command -- --json` now blocks with `remote_preflight_not_ready`.
- `npm run -s recall:second-manual:production-apply` without exact approval still stopped before remote apply with `liveWriteAttempted: false`.
- `npm run -s recall:daily-sync:completion-status` now keeps the second manual phase active while directing operators to repair production key evidence if the no-live handoff blocks.

Additional production system key-evidence recorder evidence on 2026-06-27 05:26 IST:

- `scripts/run-recall-live-auth-probe.mjs` and `scripts/record-recall-key-rotation-evidence.mjs` now support `--system-env-file` for production `/etc/brain/.env` key-evidence repair.
- System mode requires exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`, separate from the local private-env acknowledgement.
- Production helper files were synced to `/opt/brain` and syntax-checked.
- The recorder was tested on production without the exact acknowledgement and refused before any read-only auth probe, key-evidence write, Recall import, AI Brain database write, deploy, scheduler enablement, or checkpoint movement.
- Execution report: `RECALL_PRODUCTION_SYSTEM_KEY_EVIDENCE_RECORDER_2026-06-27_05-26-09_IST.md`.

Additional production key-evidence repair runner evidence on 2026-06-27 05:46 IST:

- `npm run recall:production-key-evidence:command` now prints the guarded production system key-evidence repair runner command after a no-live remote metadata check.
- `npm run recall:production-key-evidence:repair` now executes the production system-env evidence recorder on `/opt/brain` only after exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`.
- The runner rejects the local private-env acknowledgement as `private_acknowledgement_wrong_gate`; production evidence repair requires the production-specific acknowledgement.
- `npm run -s smoke:recall-production-key-evidence-repair`, `npm run -s check:recall-scheduler`, and `npm run -s check:recall-node-env-file-separators` passed.
- `npm run -s recall:production-key-evidence:command -- --json` currently reports `env_file_not_rotated_after_checkpoint` and `missing_key_rotation_evidence_file`.
- `npm run -s recall:production-key-evidence:repair` without exact acknowledgement stops before any read-only Recall auth probe or private evidence write.
- Execution report: `RECALL_PRODUCTION_KEY_EVIDENCE_REPAIR_RUNNER_2026-06-27_05-46-16_IST.md`.

Current production pre-approval blocker:

- Resolved on 2026-06-27 06:07 IST: production `/etc/brain/.env` was missing `RECALL_API_KEY`, so the production read-only Recall auth probe loaded the system env file but stopped with `missing_api_key` before calling Recall.
- Guarded fix: `BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK="<exact acknowledgement>" npm run recall:production-env-key:install`.
- Sanitized production result: `RECALL_API_KEY` absent before, present after; `BRAIN_RECALL_CONFIRM_LIVE_API=0`; `/etc/brain/.env` mode `640`; read-only Recall auth probe returned HTTP `200`, authenticated `true`, reachable `true`, future-window result count `0`; production key-evidence gate passed with `evidenceSource: env_file_mtime`.
- `npm run -s recall:second-manual:remote-runtime-preflight` now passes with `liveApplyDelegationAllowed: true`.
- `npm run -s recall:second-manual:production-command -- --json` now passes as a no-live/no-write handoff and prints the guarded production apply command.
- This does not approve or run the second manual production apply.

Fallback production key-evidence repair handoff, only if a future no-live handoff again reports missing/stale production key evidence:

```bash
npm run recall:production-key-evidence:command
```

Fallback guarded repair runner, only after the production Recall API key has truly been rotated after chat exposure and `/etc/brain/.env` contains that rotated key:

```bash
BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence." \
npm run recall:production-key-evidence:repair
```

This repair command performs one read-only Recall auth probe on production and writes private key-rotation evidence if the probe passes. It does not approve or run the second manual production apply.

Lower-level fallback production command, for controlled production shells only:

```bash
BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence." \
node -- scripts/record-recall-key-rotation-evidence.mjs \
  --system-env-file \
  --env-file /etc/brain/.env \
  --evidence-file data/private/recall-live-spikes/key-rotation-evidence.json \
  --min-rotated-after 2026-06-24T15:54:17.000Z
```

Current completion status remains:

- `currentBlockingGate`: `second_manual_verification_run`
- `owner`: `Arun`
- `blockedActions`: `second_manual_verification`, `scheduler`, `checkpoint`
- Exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is still required before the second-manual live write.
