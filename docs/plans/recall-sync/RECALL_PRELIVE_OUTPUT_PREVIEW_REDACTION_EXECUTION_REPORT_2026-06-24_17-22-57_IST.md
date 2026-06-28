# Recall Pre-Live Output Preview Redaction Execution Report

Created: 2026-06-24 17:22 IST
Owner: Codex
Status: Done for offline scope; live API still blocked pending approval and private controlled samples

## Purpose

Harden `npm run check:recall-prelive` so its child-command `stdoutPreview` and `stderrPreview` fields cannot accidentally echo private controlled-sample manifest values if a downstream gate prints them.

## Change

- Added `scripts/lib/recall-prelive-output.mjs`.
- Added `scripts/smoke-recall-prelive-output.mjs`.
- Added package script `smoke:recall-prelive-output`.
- Updated `scripts/check-recall-prelive-readiness.mjs` to:
  - collect private preview values from the supplied manifest, or from the default private manifest when `--manifest` is omitted;
  - redact private `cardId`, `expectedTitle`, `sourceUrl`, source URL path, and `notes` values from child-command previews;
  - redact Recall API-key-shaped values and bearer tokens from child-command previews;
  - run `smoke:recall-prelive-output` as part of the consolidated pre-live gate.

## Validation

Passed:

```text
node --check scripts/lib/recall-prelive-output.mjs
node --check scripts/smoke-recall-prelive-output.mjs
node --check scripts/check-recall-prelive-readiness.mjs
npm run smoke:recall-prelive-output
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

The smoke verified:

- private manifest preview values are collected;
- card IDs are redacted from previews;
- expected titles are redacted from previews;
- source URLs and source URL paths are redacted from previews;
- private notes are redacted from previews;
- API-key-shaped values are redacted from previews;
- bearer tokens are redacted from previews;
- preview length cap is preserved;
- temporary manifest cleanup succeeds.

Current no-manifest pre-live output still reports the default private manifest as invalid because it contains placeholders:

```text
defaultManifest.status: invalid
defaultManifest.validationEnforced: false
defaultManifest.validationRequiredBeforeLiveApi: true
```

Manifest-enforced pre-live validation still stops, as expected, at the private controlled-sample gate:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
exitCode: 1
failedStep: controlled_samples
reason: controlled sample manifest still contains template placeholders
```

No live Recall API call was made. No API key, private Recall title, private source URL, card content, or raw Recall payload was printed.

## Remaining Gate

This protects pre-live status previews only. It does not unblock live SPIKE-013/SPIKE-014. The controlled sample manifest still needs approved private values and manifest-enforced pre-live validation before any live API call.
