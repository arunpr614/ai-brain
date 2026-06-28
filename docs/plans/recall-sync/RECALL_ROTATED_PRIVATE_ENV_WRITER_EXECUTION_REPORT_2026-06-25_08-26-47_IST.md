# Recall Rotated Private Env Writer Execution Report

Generated: 2026-06-25 08:26:47 IST

Status: Done for no-live/no-write local rotated-key env writer scope; full project remains incomplete.

This document contains no Recall API key.

## Problem

After the chat-exposed Recall key, the next first-write blocker is local key-rotation evidence. The user still has to rotate the key outside chat, but the project did not have a one-command local helper that writes the rotated key only to the ignored private env file and immediately checks the local metadata gate.

That leaves room for operator mistakes:

- editing the wrong file;
- writing outside the ignored private Recall path;
- leaving group/other-readable permissions;
- accidentally enabling live API confirmation in the env file;
- thinking the write step also authorizes proof refresh or first apply.

## Fix

Added `scripts/write-recall-rotated-env.mjs` and package script `recall:key-rotation:write-env`.

The helper:

- requires the exact `BRAIN_RECALL_KEY_ROTATION_ACK`;
- prompts locally for the rotated key, or accepts `--read-key-from-stdin` for automation/tests;
- refuses env paths outside `data/private/recall-live-spikes/`;
- runs `check:recall-private-ignore` before reading a key;
- refuses to overwrite an existing env file unless `--replace-existing` is supplied;
- writes the key only to the ignored private env file with mode `0600`;
- keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`;
- runs the no-live key-rotation metadata gate;
- stops after the metadata gate.

It does not rotate the key in Recall. The key must still be created or rotated outside chat before using the helper.

## New Commands

```text
npm run recall:key-rotation:write-env
npm run smoke:recall-key-rotation-env-writer
```

Expected real use after external rotation:

```text
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:key-rotation:write-env -- --replace-existing
```

Then continue with:

```text
npm run recall:first-apply:prepare-plan
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
npm run recall:first-apply:status
```

## Release-Gate Wiring

The new no-live smoke is now part of:

- `scripts/check-recall-prelive-readiness.mjs` as `key_rotation_env_writer_smoke`;
- `scripts/deploy.sh` local release gates;
- `scripts/check-recall-scheduler-artifacts.mjs` static package/pre-live/deploy drift checks.

The operator guidance now also surfaces the helper:

- `npm run recall:key-rotation:handoff` includes `writeRotatedPrivateEnv` in JSON output and the command block in Markdown output;
- `npm run recall:first-apply:status` includes the same helper in `nextCommands` and `gateSummary.writeRotatedPrivateEnvCommand`;
- `npm run recall:daily-sync:completion-status` inherits that safer next command through first-apply status.
- 2026-06-25 08:48 IST update: the first capped apply approval packet and production runbook now also prefer `npm run recall:key-rotation:write-env -- --replace-existing` after external key rotation, before key-evidence checks, post-rotation prepare, proof refresh, or first apply.

## Validation

Passed:

```text
node --check scripts/write-recall-rotated-env.mjs
node --check scripts/smoke-recall-key-rotation-env-writer.mjs
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
bash -n scripts/deploy.sh
npm run -s smoke:recall-key-rotation-env-writer
npm run -s smoke:recall-key-rotation-handoff
npm run -s smoke:recall-first-apply-status
npm run -s check:recall-scheduler
```

The smoke proves:

- writer refuses without exact key rotation acknowledgement before creating env file;
- writer refuses env paths outside the private Recall evidence root;
- writer refuses to overwrite existing env file without `--replace-existing`;
- writer writes owner-only private env file with live confirmation disabled;
- writer runs the no-live key-rotation metadata gate and reaches `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`;
- writer can explicitly replace an existing private env file;
- writer output does not print env contents or secret-shaped values;
- smoke uses no live Recall API call;
- temp private files are cleaned up.

## Safety Boundary Preserved

No new live Recall API call was made. No private key-rotation evidence was recorded. No proof was refreshed. No first capped apply was run. No production deploy was run. No scheduler was enabled. No checkpoint was advanced. The chat-pasted Recall API key was not used.

The helper only writes the rotated key to the ignored private env file and checks local file metadata. It does not satisfy proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.

## Current State

The real project remains blocked until Arun rotates the Recall key outside chat and uses the helper or manually updates `data/private/recall-live-spikes/recall.env`.
