# Recall Public Manifest Privacy File-Safety Guard Execution Report

Created: 2026-06-24 18:11 IST
Owner: Codex
Status: Done for offline scope
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Close a privacy-control gap in the standalone manifest-aware public report scanner.

Before this hardening, `scripts/check-recall-public-manifest-privacy.mjs` could scan a supplied manifest for private-value leaks, but it did not itself require that manifest file to be stored safely. Other live gates already enforced private manifest file safety; this change makes the standalone scanner fail closed by default too.

## Change Summary

- `scripts/check-recall-public-manifest-privacy.mjs` now validates manifest file safety by default before reading the manifest.
- Real manifest-aware scans require the manifest to be under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only.
- Unsafe manifest failures emit redacted metadata with `kind: "unsafe_manifest_file"` and do not print private titles, private source URLs, card IDs, or content.
- `--allow-unsafe-manifest-for-smoke` was added as an explicit smoke-only bypass for synthetic temporary manifests used by offline fixture tests.
- `scripts/check-recall-live-spike-reports.mjs`, `scripts/run-recall-live-spikes.mjs`, `scripts/sync-recall.ts`, and smoke fixtures were updated so fixture mode can use the bypass while real live/proof paths remain strict.
- Approval/checklist/runbook/tracker docs now state that the bypass must not be used for real live reports, production dry-run proof, production apply proof, or scheduled proof.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-public-manifest-privacy.mjs
node --check scripts/check-recall-live-spike-reports.mjs
node --check scripts/run-recall-live-spikes.mjs
node --check scripts/smoke-recall-public-manifest-privacy.mjs
node --check scripts/smoke-recall-live-spike-reports.mjs
node --check scripts/smoke-recall-live-spikes.mjs
node --check scripts/smoke-recall-cli-bundle.mjs
npm run smoke:recall-public-manifest-privacy
npm run smoke:recall-live-spike-reports
npm run smoke:recall-live-spikes
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run smoke:recall-scheduler-wrapper
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

Key smoke evidence:

- temporary manifest without the smoke-only bypass fails with `unsafe_manifest_file`;
- temporary manifest failure output does not print the synthetic private title or private source URL;
- exact private-value leaks fail without printing private values;
- normalized private-value leaks fail across case, whitespace, HTML entities, and percent-encoding;
- packaged CLI report proof still works in the deploy-matching `scripts/` layout;
- scheduled wrapper proof flow still passes with fixture-mode report proof and remains strict for future real manifest paths.
- approval packet consistency remains green with the new safety wording enforced across checklist, operating packet, runbook, completion audit, and tracker;
- no-manifest pre-live readiness remains green while reporting the default placeholder manifest as invalid and requiring the manifest-enforced live gate before Recall API access;
- broad code validation passed: lint, typecheck, full test suite, and whitespace diff check.

Expected live blockers were rechecked:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Both returned exit 1, as intended. The enforced pre-live gate fails on placeholder controlled-sample values. The strict live gate reports `status: needs_manifest_fix`, `readyForApprovedLiveSpikes: false`, and `privateEvidenceOk: true`.

## Current Production State

No live Recall API call was made. No production dry-run, production apply, production deploy, or scheduler enablement was performed.

The current private manifest template remains a placeholder. The expected live blockers still apply until the user approves API-key handling and controlled Recall sample cards are filled in the ignored private manifest.

## Next Gate

Before live Recall access:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Both should remain blocking until the private controlled sample manifest is filled with real approved sample cards and the local Recall API-key handling path is approved.
