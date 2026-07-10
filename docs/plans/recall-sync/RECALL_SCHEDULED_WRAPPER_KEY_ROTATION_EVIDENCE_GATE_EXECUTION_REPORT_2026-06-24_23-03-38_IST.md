# Recall Scheduled Wrapper Key Rotation Evidence Gate Execution Report

Created: 2026-06-24 23:03 IST
Owner: Codex
Status: Done for offline scope; scheduler remains disabled and real env still needs rotated-key evidence before live scheduled work
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Close the future scheduler gap after the first-apply key rotation evidence gate was added.

The guarded first capped apply and ready-or-refresh paths already stop when the local Recall API key evidence predates the post-chat-exposure rotation checkpoint. The future scheduled wrapper also needs this protection so an enabled timer cannot later run with an unrotated exposed key.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, or database rows.

## Change Summary

- Updated `scripts/check-recall-key-rotation-evidence.mjs` with `--system-env-file`.
  - Local first-apply mode remains strict: private Recall env file under `data/private/recall-live-spikes/`, ignored, untracked, owner-only, and newer than the rotation checkpoint.
  - System env-file mode is for production-style scheduler evidence files such as `/etc/brain/.env`; it skips git checks and requires restrictive file metadata plus mtime after the rotation checkpoint.
- Updated `scripts/recall-scheduled-apply.sh`.
  - Real non-fixture scheduled live mode now runs the key rotation evidence checker after live confirmation and before live-spike proof, report directory creation, dry-run, backup, apply, or report validation.
  - Fixture smoke mode remains available for offline package validation.
- Updated `scripts/smoke-recall-scheduled-wrapper.mjs`.
  - Smoke now proves a confirmed live scheduled run with stale key evidence fails before report directory creation and does not print the API key value.
- Updated `scripts/deploy.sh` so production deployment copies `scripts/check-recall-key-rotation-evidence.mjs`.
- Updated `scripts/check-recall-scheduler-artifacts.mjs` so local release gates enforce the scheduled-wrapper key evidence guard and deploy packaging.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-key-rotation-evidence.mjs
bash -n scripts/recall-scheduled-apply.sh
node --check scripts/smoke-recall-scheduled-wrapper.mjs
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
git diff --check
```

Expected real blocker remains:

```text
npm run check:recall-key-rotation-evidence
```

The local private env file still fails closed with:

```text
env_file_not_rotated_after_checkpoint
```

## Current Production State

No production apply, production deploy, scheduler enablement, checkpoint advancement, stage, commit, push, or pull request was performed.

The scheduled daily job remains disabled. It must not be enabled until after:

1. the Recall API key is rotated outside chat;
2. key rotation evidence passes for the relevant local or production env file;
3. first capped manual apply succeeds through the guarded wrapper;
4. the private post-apply report passes review;
5. Arun explicitly approves scheduler enablement.
