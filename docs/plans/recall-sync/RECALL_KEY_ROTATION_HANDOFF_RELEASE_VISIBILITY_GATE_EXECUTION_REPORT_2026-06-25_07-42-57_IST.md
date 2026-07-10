# Recall Key Rotation Handoff Release Visibility Gate Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 07:42 IST |
| Status | Done for no-live/no-write release visibility scope; full project remains incomplete |
| Owner | Codex |
| Related tracker item | RDS-026j |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, or database rows. |

## Problem

`npm run recall:key-rotation:handoff` now gives an operator-friendly checklist for the current `blocked_key_rotation_evidence` state, but the command was not yet part of the normal pre-live or deploy-time local visibility path. A future operator could run `npm run check:recall-prelive` and still miss the handoff unless they already knew the command existed.

## Change

- Updated `scripts/check-recall-prelive-readiness.mjs` with two required no-live steps:
  - `key_rotation_handoff_smoke`: runs `npm run smoke:recall-key-rotation-handoff`;
  - `key_rotation_handoff_snapshot`: runs `npm run recall:key-rotation:handoff -- --json`.
- Updated `scripts/deploy.sh` local release gates to run:
  - `npm run smoke:recall-key-rotation-handoff`;
  - `npm run recall:key-rotation:handoff -- --json`.
- Updated `scripts/check-recall-scheduler-artifacts.mjs` so `npm run check:recall-scheduler` statically requires:
  - package scripts for the handoff command and smoke;
  - pre-live handoff smoke and snapshot wiring;
  - deploy-time local handoff smoke and snapshot wiring.

## Current Real Output Summary

Command:

```text
npm run recall:key-rotation:handoff -- --json
```

No-secret summary:

```json
{
  "ok": true,
  "mode": "recall_key_rotation_handoff",
  "noLiveNoWrite": true,
  "currentGate": {
    "status": "blocked_key_rotation_evidence",
    "keyRotationEvidenceOk": false,
    "failedRules": [
      "env_file_not_rotated_after_checkpoint",
      "missing_key_rotation_evidence_file"
    ]
  },
  "blockedUntilKeyEvidencePasses": [
    "proof_refresh",
    "first_capped_apply",
    "production_deploy",
    "scheduler_enablement",
    "checkpoint_advancement"
  ]
}
```

## Validation Evidence

```text
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-key-rotation-handoff
npm run -s recall:key-rotation:handoff -- --json
npm run -s check:recall-scheduler
npm run -s check:recall-prelive
```

Expected post-change pre-live output includes:

- `key_rotation_handoff_smoke`;
- `key_rotation_handoff_snapshot`;
- `blocked_key_rotation_evidence`;
- `env_file_not_rotated_after_checkpoint`;
- `missing_key_rotation_evidence_file`;
- no secret-shaped Recall key output.

## Non-Actions

- No new live Recall API call was made.
- No private key-rotation evidence was recorded.
- No proof was refreshed.
- No first capped apply was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Next Gate

The next real gate is unchanged: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, establish key rotation evidence, refresh stale private proof without apply if needed, then use the no-secret first capped apply approval packet and guarded wrapper only after exact approval.
