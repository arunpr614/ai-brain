# Recall Deploy Override Key Rotation Evidence Gate Execution Report

Created: 2026-06-24 23:12 IST
Owner: Codex
Status: Done for offline scope; deploy and scheduler remain unrun
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Close the production deploy override gap for Recall.

The deploy script already refuses an enabled or active Recall timer and refuses remote Recall enable flags unless explicit override variables are set for an approved apply or scheduler window. Those overrides are intentionally rare, but they also need to require key rotation evidence so an approved deploy window cannot proceed while the remote Recall credential evidence still predates the post-chat-exposure key rotation checkpoint.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, or database rows.

## Change Summary

- Updated `scripts/deploy.sh`.
  - Added `remote_recall_key_rotation_evidence_preflight`.
  - The preflight runs only when `BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1` or `BRAIN_RECALL_ALLOW_EXISTING_TIMER=1`.
  - It checks remote evidence-file metadata for `${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}`.
  - It requires restrictive permissions and mtime after `${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}`.
  - It does not read or print the Recall API key.
- Updated `scripts/check-recall-scheduler-artifacts.mjs`.
  - Static scheduler/deploy checks now require the deploy override key evidence preflight and fail-closed stale-evidence messaging.

## Validation

Focused validation passed:

```text
bash -n scripts/deploy.sh
npm run check:recall-scheduler
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
git diff --check
```

No remote deploy was attempted.

## Current Production State

No production apply, production deploy, scheduler enablement, checkpoint advancement, stage, commit, push, or pull request was performed.

Deploy remains blocked unless the ordinary disabled Recall preflights pass. If a future approved Recall deploy or scheduler window intentionally sets `BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1` or `BRAIN_RECALL_ALLOW_EXISTING_TIMER=1`, remote key rotation evidence must also pass before deploy proceeds.
