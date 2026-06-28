# Recall First Apply Refresh-If-Needed Alias Execution Report

Created: 2026-06-24 23:50 IST
Owner: Codex
Status: Done for offline scope; real no-write proof refresh remains blocked until key rotation evidence passes
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add one operator-safe command for the post-rotation no-write proof maintenance step.

Before this change, the approved path required typing:

```text
BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 npm run recall:first-apply:ready-or-refresh
```

The new alias is:

```text
npm run recall:first-apply:refresh-if-needed
```

It sets only the refresh confirmation needed for the existing no-write ready-or-refresh wrapper. It does not bypass key rotation evidence, does not bypass the exact key rotation acknowledgement required by the proof-refresh wrapper, does not run `--apply`, does not deploy, does not enable the scheduler, and does not advance any checkpoint.

## What Changed

| Area | File | Change |
|---|---|---|
| Package script | `package.json` | Adds `recall:first-apply:refresh-if-needed`, which delegates to `scripts/recall-first-apply-ready-or-refresh.sh` with `BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1`. |
| Status helper | `scripts/check-recall-first-apply-status.mjs` | When status is `needs_no_write_proof_refresh`, the first suggested command is now `npm run recall:first-apply:refresh-if-needed`. |
| Status smoke | `scripts/smoke-recall-first-apply-status.mjs` | Proves the refresh-needed status points to the alias. |
| Proof-refresh acknowledgement | `scripts/recall-first-apply-proof-refresh.sh` | The delegated real proof refresh still requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` before any live Recall dry-run refresh. |

## Safety

- This document contains no Recall API key.
- The alias still runs local key rotation evidence before any live Recall dry-run refresh.
- The delegated proof refresh still requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` before live Recall dry-run refresh.
- In the current local state, the command remains blocked by `env_file_not_rotated_after_checkpoint`.
- The alias never passes `--apply`.
- The alias does not deploy, enable the scheduler, or advance any checkpoint.
- No private Recall card IDs, titles, source URLs, raw chunks, private dry-run payloads, apply payloads, or database rows are included.

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run smoke:recall-first-apply-status
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
```

Current real status remains:

```text
status: blocked_key_rotation_evidence
```

After the Recall API key is rotated outside chat and `data/private/recall-live-spikes/recall.env` is updated, rerun:

```text
npm run recall:first-apply:status
```

If the status becomes `needs_no_write_proof_refresh`, use:

```text
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed
```
