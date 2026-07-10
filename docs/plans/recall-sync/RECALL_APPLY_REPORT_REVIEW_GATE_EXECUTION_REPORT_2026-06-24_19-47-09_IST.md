# Recall Apply Report Review Gate Execution Report

Created: 2026-06-24 19:47 IST
Owner: Codex
Status: Done for offline scope; production apply has not been run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add a machine-checkable post-apply gate for the first capped Recall -> AI Brain write.

The dry-run validator proves a write should be allowed before `--apply`. This new apply-report validator proves the resulting private apply report is clean before any production deploy or scheduler enablement decision.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, or database rows.

## Change Summary

- Added `scripts/check-recall-apply-report.mjs`.
- Added `scripts/smoke-recall-apply-report-check.mjs`.
- Added package scripts:
  - `npm run check:recall-apply-report`
  - `npm run smoke:recall-apply-report`
- Added the apply-report smoke to `npm run check:recall-prelive`.
- Updated the scheduled wrapper to run `scripts/check-recall-apply-report.mjs` after scheduled apply and before printing success.
- Updated the scheduled-wrapper smoke and scheduler artifact checker to prove the post-apply review path is packaged and enforced.
- Hardened both apply and dry-run report validators so unexpected-value diagnostics redact secret-shaped values before printing.
- Updated the first capped apply approval packet and production runbook to require post-apply validator review before deploy or scheduler work.

## Validator Contract

Default pass criteria for the apply report:

- report is JSON from `sync-recall` apply mode;
- `state` is `done`;
- `exitCode` is `0`;
- file mtime is fresh and not future-dated;
- report stays under `data/private/recall-live-spikes/` when `--require-private-path` is used;
- `checkpointAdvanced` is true unless explicitly waived for investigation;
- `enumerationComplete` is true and `cardsAvailable === cardsSeen`;
- `cardsImported + cardsUpgraded` does not exceed the approved cap;
- applied imports do not exceed `cardsPlannedForImport`;
- no blocked cards, changed remote cards, policy blocks, unknown fidelity, unapproved weak upgrades, obvious secrets, or raw payload fields are present.

For the current first capped apply, use:

```text
npm run check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5 --max-age-minutes 120 --require-private-path --require-cards-seen --require-applied-imports --allow-unverified-fidelity --allow-metadata-only-fidelity
```

Expected verdict:

```text
PASS_POST_APPLY_REVIEW_GATE
```

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-apply-report.mjs
node --check scripts/smoke-recall-apply-report-check.mjs
npm run smoke:recall-apply-report
npm run smoke:recall-dry-run-report
bash -n scripts/recall-scheduled-apply.sh
node --check scripts/smoke-recall-scheduled-wrapper.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
```

Observed smoke coverage:

- clean apply report passes;
- dry-run report mode fails;
- missing checkpoint advancement fails;
- blocked report fails;
- changed remote report fails;
- applied import cap fails;
- risky fidelity requires an explicit validator allow flag;
- obvious secret leak fails with redacted output;
- raw payload fields fail;
- stale report fails;
- future-dated report fails.

Scheduled-wrapper validation also passed: the future timer path rejects unconfirmed live mode, rejects missing live-spike proof, stops before backup/apply when unverified Recall chunks are not explicitly accepted, and then runs live-spike-proofed dry-run, backup proof, proof-backed apply, and post-apply report review with the packaged CLI.

## Current Production State

No production apply, production deploy, or scheduler enablement was performed.

The next production action remains explicit first capped apply approval. After apply, the private apply report must pass `PASS_POST_APPLY_REVIEW_GATE` before any deploy or scheduler decision.
