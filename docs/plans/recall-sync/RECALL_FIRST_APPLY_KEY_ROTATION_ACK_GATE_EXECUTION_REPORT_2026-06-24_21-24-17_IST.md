# Recall First Apply Key Rotation Acknowledgement Gate Execution Report

Created: 2026-06-24 21:24 IST
Owner: Codex
Status: Done for offline scope; no production apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add one final first-write safety gate after the Recall API key was pasted into chat during live-validation setup.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, or database rows.

## Change Summary

- Updated `scripts/recall-first-capped-apply.sh` so the guarded first capped apply wrapper refuses unless `BRAIN_RECALL_KEY_ROTATION_ACK` exactly matches the required key-rotation acknowledgement.
- Updated `scripts/smoke-recall-first-capped-apply.mjs` so the fixture-backed smoke proves:
  - the wrapper still refuses without exact first-apply approval text;
  - the wrapper now refuses without exact key rotation acknowledgement;
  - the wrapper still reruns readiness, performs a fixture-backed capped apply, and validates the post-apply report when both gates are present.
- Updated the first capped apply approval packet so the preferred command includes the key-rotation acknowledgement.
- Updated the project tracker, current-state audit, approval-packet checker, and current public-doc privacy scan to include this gate and report.

## Required Acknowledgement

The guarded wrapper now requires this exact no-secret text:

```text
I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.
```

This acknowledgement is separate from write approval. It does not approve apply, deploy, or scheduler enablement.

## Validation

Focused validation passed:

```text
npm run smoke:recall-first-capped-apply
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
npm run check:recall-first-apply-readiness
git diff --check
```

Observed results:

- first capped apply smoke refused without exact approval text;
- first capped apply smoke refused without exact `BRAIN_RECALL_KEY_ROTATION_ACK`;
- first capped apply smoke passed with fixture data after both exact gates were present;
- approval-packet consistency passed with the new key-rotation gate snippets required;
- current public-doc privacy scan passed across 23 curated files;
- first capped apply readiness remained `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`;
- no live Recall write, production deploy, scheduler enablement, checkpoint advancement, stage, commit, push, or pull request occurred.

## Current Production State

The first capped apply is still not run.

The next production action requires all of the following:

1. private proof remains fresh or is refreshed with the no-write proof maintenance wrapper;
2. Arun provides the exact first capped write approval text;
3. the Recall API key used for apply has been rotated after chat exposure and stored only in the ignored private Recall env file;
4. the guarded wrapper receives the exact `BRAIN_RECALL_KEY_ROTATION_ACK` text;
5. post-apply report review passes before any deploy or scheduler decision.
