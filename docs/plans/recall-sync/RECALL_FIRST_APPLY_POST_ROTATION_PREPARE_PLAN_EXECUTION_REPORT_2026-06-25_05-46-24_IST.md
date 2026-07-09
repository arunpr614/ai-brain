# Recall First Apply Post-Rotation Prepare Plan Execution Report

Status: Done for offline scope; real first-write remains blocked until external key rotation
Date: 2026-06-25 05:46 IST
Owner: AI agent (Codex)
Scope: Recall daily sync / first capped apply post-rotation preparation

## Summary

Added a no-live, no-write plan mode for the post-rotation first-apply prepare wrapper. Operators can now run `npm run recall:first-apply:prepare-plan` before setting the exact key-rotation acknowledgement or `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1`.

This reduces first-write risk by making the next sequence visible without recording private key evidence, refreshing proof, calling Recall, applying, deploying, enabling the scheduler, or advancing a checkpoint.

## Change

| Area | Behavior |
|---|---|
| Wrapper | `scripts/prepare-recall-first-apply-after-rotation.mjs` now accepts `--plan-only` and `BRAIN_RECALL_FIRST_APPLY_PREPARE_PLAN_ONLY=1`. |
| Package script | Added `recall:first-apply:prepare-plan`. |
| Status helper | `npm run recall:first-apply:status` now lists `npm run recall:first-apply:prepare-plan` as the first safe next command while blocked on key rotation evidence. |
| Smoke coverage | `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs` proves plan mode passes without acknowledgement or prepare confirmation and creates no private evidence. |
| Status smoke | `scripts/smoke-recall-first-apply-status.mjs` proves stale-key status advertises the prepare-plan command. |

## Current Plan Output

`npm run -s recall:first-apply:prepare-plan` passed with:

```text
mode: first_apply_prepare_after_rotation_plan
currentStatus.status: blocked_key_rotation_evidence
currentStatus.failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
currentGateSummary.currentBlockingGate: key_rotation_evidence
currentGateSummary.owner: Arun
currentGateSummary.externalAction: rotate_recall_api_key_outside_chat
currentGateSummary.safeNoWritePreviewCommand: npm run recall:first-apply:prepare-plan
currentGateSummary.blockedActions: proof_refresh, first_capped_apply, deploy, scheduler, checkpoint
realPrepareCommand: BRAIN_RECALL_KEY_ROTATION_ACK="<exact acknowledgement>" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```

Planned actions reported:

```text
external_key_rotation_required: no live API, no writes
record_private_key_rotation_evidence_if_needed: may run one read-only future-window /cards auth probe and write data/private/recall-live-spikes/key-rotation-evidence.json
refresh_private_proof_if_needed: may run production-capable dry-run reads only after key evidence passes and update private dry-run/backup proof
stop_at_first_apply_approval: no live API, no writes
```

Safety notes reported:

```text
Plan mode does not require the key rotation acknowledgement.
Plan mode does not require prepare confirmation.
Plan mode does not record private key-rotation evidence.
Plan mode does not refresh proof.
Plan mode does not call Recall.
Plan mode does not apply, deploy, enable the scheduler, or advance a checkpoint.
Plan mode does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.
```

## Validation

Passed:

```text
node --check scripts/prepare-recall-first-apply-after-rotation.mjs
node --check scripts/smoke-recall-first-apply-prepare-after-rotation.mjs
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run -s recall:first-apply:prepare-plan
npm run smoke:recall-first-apply-prepare-after-rotation
npm run smoke:recall-first-apply-status
```

Smoke assertions include:

- plan-only mode passes without acknowledgement or confirmation and creates no private evidence;
- plan-only mode carries through the status gate summary;
- missing acknowledgement still fails before private evidence creation;
- missing prepare confirmation still fails before private evidence creation;
- tainted private evidence still fails as non-recordable without being overwritten;
- stale env mtime plus exact acknowledgement can still record private evidence via the read-only auth probe in smoke;
- stale proof still refreshes only through the existing no-write ready-or-refresh wrapper;
- output does not print key material.

## Safety Properties

- No real Recall API call was made in this change.
- No private key-rotation evidence was recorded in the real workspace.
- No dry-run proof or backup proof was refreshed in the real workspace.
- No AI Brain database write was performed.
- No production apply, deploy, scheduler enablement, checkpoint advancement, staging, commit, push, or pull request was performed.
- The chat-pasted Recall API key was not used.

## Next Gate

Rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then run:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```
