# Recall Key Rotation Handoff Command Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 07:34 IST |
| Status | Done for no-live/no-write key-rotation handoff scope; full project remains incomplete |
| Owner | Codex |
| Related tracker item | RDS-026i |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, or database rows. |

## Problem

`npm run recall:first-apply:status`, `npm run recall:first-apply:prepare-plan`, and `npm run recall:daily-sync:completion-status` correctly report that first-write work is blocked by key-rotation evidence. The output is complete but machine-shaped: it is easy for a future operator to miss the exact safe sequence, the owner of the next external action, or the actions that must remain blocked until key evidence passes.

## Change

- Added `scripts/print-recall-key-rotation-handoff.mjs`.
- Added `scripts/smoke-recall-key-rotation-handoff.mjs`.
- Added package commands:
  - `npm run recall:key-rotation:handoff`
  - `npm run smoke:recall-key-rotation-handoff`

The handoff command:

- runs only local no-live checks;
- summarizes whether key-rotation evidence currently passes;
- lists failed key-evidence rules such as `env_file_not_rotated_after_checkpoint` and `missing_key_rotation_evidence_file`;
- identifies Arun-owned external key rotation as the current action;
- prints the exact private env file and private evidence file paths;
- prints the guarded post-rotation prepare command;
- names proof refresh, first capped apply, production deploy, scheduler enablement, and checkpoint advancement as blocked until key evidence passes;
- states that the chat-pasted Recall API key must not be used.

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
  "requiredExternalAction": {
    "owner": "Arun",
    "action": "rotate_recall_api_key_outside_chat",
    "privateEnvFile": "data/private/recall-live-spikes/recall.env",
    "privateEvidenceFile": "data/private/recall-live-spikes/key-rotation-evidence.json"
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
node --check scripts/print-recall-key-rotation-handoff.mjs
node --check scripts/smoke-recall-key-rotation-handoff.mjs
node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8")); console.log("package-json-ok")'
npm run -s smoke:recall-key-rotation-handoff
npm run -s recall:key-rotation:handoff -- --json
```

Smoke coverage verifies:

- blocked key-rotation handoff exits `0` and names stale private gates;
- Markdown handoff includes an operator checklist and blocked-action section;
- fresh key-rotation metadata reports passing evidence;
- handoff output does not print env file contents or secret-shaped values;
- smoke uses no live Recall API call.

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
