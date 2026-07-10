# Recall First Apply Proof Refresh Key Acknowledgement Gate Execution Report

Created: 2026-06-25 00:00 IST
Owner: Codex
Status: Done for offline scope; real no-write proof refresh still remains blocked until key rotation evidence passes
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Harden the first-apply no-write live proof refresh path after the Recall API key was pasted into chat.

Before this change, the real proof refresh path required local key rotation evidence before live Recall dry-run refresh. That evidence is necessary but metadata-only. This change adds the same exact human acknowledgement used by the guarded first capped apply wrapper before any real live proof refresh can proceed.

## What Changed

| Area | File | Change |
|---|---|---|
| Proof refresh wrapper | `scripts/recall-first-apply-proof-refresh.sh` | Requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` text after local key evidence passes and before any non-fixture live Recall dry-run refresh. |
| Proof refresh smoke | `scripts/smoke-recall-first-apply-proof-refresh.mjs` | Adds a fresh-env, missing-acknowledgement case proving the wrapper stops before dry-run report or backup creation. |

## Required Acknowledgement

Before real no-write live proof refresh, set:

```text
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file."
```

This acknowledgement does not approve writes. It only confirms that the key used for live proof refresh is no longer the exposed chat key.

## Safety

- This document contains no Recall API key.
- The wrapper still checks local key rotation evidence before the acknowledgement gate.
- The wrapper still fails closed on `env_file_not_rotated_after_checkpoint` in the current local state.
- The wrapper never passes `--apply`.
- The wrapper does not deploy, enable the scheduler, or advance any checkpoint.
- The wrapper does not enable the scheduler.
- The wrapper does not advance any checkpoint.
- No private Recall card IDs, titles, source URLs, raw chunks, private dry-run payloads, apply payloads, or database rows are included.

## Validation

Passed:

```text
bash -n scripts/recall-first-apply-proof-refresh.sh
node --check scripts/smoke-recall-first-apply-proof-refresh.mjs
npm run smoke:recall-first-apply-proof-refresh
```

The real refresh-if-needed alias was also run and still failed closed before live work because local key evidence is stale:

```text
npm run recall:first-apply:refresh-if-needed
```

Observed current outcome:

```text
env_file_not_rotated_after_checkpoint
not refreshing proof
```

## Next Gate

After key rotation outside chat:

```text
npm run check:recall-key-rotation-evidence
npm run recall:first-apply:status
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed
```
