# Recall Public Docs Privacy Scan Execution Report

Created: 2026-06-24 18:28 IST
Owner: Codex
Status: Done for offline scope
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Close a public-document privacy gap in the Recall live approval flow.

Before this hardening, public SPIKE-013/SPIKE-014 reports had leak scanners, and manifest-aware report scans could catch exact and normalized private controlled-sample values. The current approval/runbook documents themselves did not have a focused no-secret scan. A broad historical-doc scan was too noisy because older planning artifacts intentionally contain placeholder examples and grep patterns.

This change adds a curated current-doc privacy gate for the documents Arun is expected to use next.

## Curated Current Scope

The default scan now checks these current public docs:

- live API approval checklist;
- compact live API approval handoff;
- live API spike operating packet;
- production runbook;
- current-state completion audit;
- project tracker;
- final implementation options V3;
- latest manifest privacy file-safety report;
- this public-doc privacy scan execution report;
- live API approval received readiness check;
- live SPIKE execution report;
- production dry-run execution report;
- first capped apply backup proof report;
- first capped apply approval packet;
- apply report review gate report;
- live SPIKE env-file gate fix execution report;
- first apply readiness gate execution report;
- first capped apply wrapper execution report;
- first apply readiness freshness countdown execution report;
- first apply proof refresh wrapper execution report;
- first apply ready-or-refresh wrapper execution report;
- first apply proof refresh actual execution report;
- first apply key rotation acknowledgement gate execution report;
- first apply key rotation evidence gate execution report;
- scheduled wrapper key rotation evidence gate execution report;
- deploy override key rotation evidence gate execution report;
- first apply readiness key-evidence consolidation execution report;
- first apply status helper execution report;
- first apply refresh-if-needed alias execution report;
- first apply proof refresh key acknowledgement gate execution report;
- live auth probe local-gate fix execution report;
- key rotation private evidence record workflow execution report;
- first apply post-rotation prepare wrapper execution report.

The default scope fails closed if any curated current document is missing.

## Change Summary

- Added `scripts/check-recall-public-docs-privacy.mjs`.
- Added `scripts/smoke-recall-public-docs-privacy.mjs`.
- Added package scripts:
  - `npm run check:recall-public-docs-privacy`
  - `npm run smoke:recall-public-docs-privacy`
- Integrated the smoke and real current-doc scan into `npm run check:recall-prelive`.
- Integrated the smoke and real current-doc scan into the local release gates in `scripts/deploy.sh` so future production deploy attempts stop before build/deploy if current public docs leak obvious secret-shaped values.
- Updated `scripts/check-recall-scheduler-artifacts.mjs` to enforce the deploy-time current-doc privacy gates.
- Added this execution report to the default curated scan scope so the evidence artifact is checked by the same no-secret gate it documents.
- Updated the approval packet checker so the checklist, handoff, operating packet, production runbook, audit, tracker, and required package scripts cannot silently drift.
- Updated the live approval checklist, compact handoff, operating packet, production runbook, final options V3, current-state audit, and project tracker with the new gate.

## Privacy Contract

The scanner detects obvious public-doc leaks, including:

- raw Recall API-key assignments;
- bearer-token examples that are not redacted placeholders;
- long `sk_` secret-shaped values;
- cookie headers;
- signed or tokenized URL query values.

Failure previews are redacted before output. Safe placeholders such as local-only key placeholders, redacted authorization placeholders, and redacted query values are allowed.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-public-docs-privacy.mjs
node --check scripts/smoke-recall-public-docs-privacy.mjs
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-approval-packet.mjs
bash -n scripts/deploy.sh
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run smoke:recall-public-docs-privacy
npm run check:recall-public-docs-privacy
npm run check:recall-approval-packet
npm run check:recall-scheduler
npm run check:recall-prelive
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Observed results:

- smoke proved the default curated-doc scope fails closed when current docs are missing;
- smoke proved safe placeholders pass;
- smoke proved synthetic public-doc leaks fail;
- smoke proved synthetic leak previews redact API keys, bearer tokens, cookies, and tokenized URLs;
- the real current-doc scan passed and scanned 33 curated files, including this execution report, the approval received readiness check, live SPIKE execution report, production dry-run execution report, first capped apply backup proof report, first capped apply approval packet, apply report review gate report, live SPIKE env-file gate fix execution report, first apply readiness gate execution report, first capped apply wrapper report, first apply freshness countdown report, first apply proof refresh wrapper report, first apply ready-or-refresh wrapper report, first apply proof refresh actual execution report, first apply key rotation acknowledgement gate execution report, first apply key rotation evidence gate execution report, scheduled wrapper key rotation evidence gate execution report, deploy override key rotation evidence gate execution report, first apply readiness key-evidence consolidation execution report, first apply status helper execution report, first apply refresh-if-needed alias report, first apply proof refresh key acknowledgement gate report, live auth probe local-gate fix report, key rotation private evidence record workflow report, and first apply post-rotation prepare wrapper report;
- approval packet consistency passed with the new public-doc privacy snippets required across checklist, handoff, operating packet, production runbook, completion audit, tracker, and package scripts;
- scheduler/deploy artifact check passed and now enforces that future deploys run both `smoke:recall-public-docs-privacy` and `check:recall-public-docs-privacy`;
- full no-manifest pre-live readiness passed and now includes both the current public-doc privacy smoke and the real current-doc scan.
- manifest-enforced pre-live readiness now passes with the private manifest;
- strict live readiness now passes with `status: ready_for_approved_live_spikes`, `readyForApprovedLiveSpikes: true`, and `privateEvidenceOk: true`.

## Current Production State

No production apply, production deploy, or scheduler enablement was performed.

The private controlled-sample manifest and local Recall env are now populated under ignored owner-only private paths. Live SPIKE-013/SPIKE-014 ran successfully, the standalone live auth/read probe returned HTTP 200 against Recall with zero future-window results, the private production-shaped dry-run passed, first capped apply backup proof passed, the no-secret first capped apply approval packet is ready, the guarded first capped apply wrapper is smoked, the ready-or-refresh proof maintenance wrapper is smoked, the first-apply refresh-if-needed alias is documented, the first-apply proof refresh key acknowledgement gate is implemented, the first-apply key rotation acknowledgement and metadata evidence gates are implemented, first-apply readiness now reports key-rotation evidence as a checked gate, direct proof refresh stops on stale key evidence before live Recall work, the first-apply status helper summarizes the ordered blocker and next safe command, the scheduled wrapper key rotation evidence gate is implemented, the deploy override key rotation evidence gate is implemented, and the post-apply report review gate is implemented. Production apply, deploy, and scheduler remain blocked until explicit write approval, key rotation acknowledgement, and passing key rotation evidence.

## Next Gate

The full offline readiness command passes without enforcing the private manifest:

```text
npm run check:recall-prelive
```

The manifest-enforced live gate is ready and should be rerun if private evidence changes:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The next production gate is explicit first capped apply approval plus key rotation acknowledgement and passing local key rotation evidence, using the accepted live-spike proof, reviewed dry-run proof, and private backup proof.
