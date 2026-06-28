# Recall Pre-Live Default Manifest Status Execution Report

Created: 2026-06-24 17:16 IST
Owner: Codex
Status: Done for offline scope; live API still blocked pending approval and private controlled samples

## Purpose

Reduce operator confusion when `npm run check:recall-prelive` is run without `--manifest` after the default private controlled-sample manifest template already exists.

Before this change, the no-manifest pre-live command passed offline readiness and skipped controlled-sample validation. That was technically correct, but easy to misread during live prep because the default private template now exists locally and still contains placeholders.

## Change

- `scripts/check-recall-prelive-readiness.mjs` now reports a redacted `defaultManifest` block whenever `--manifest` is omitted.
- The `defaultManifest` block includes file safety metadata, validation status, and sanitized validation findings without printing private values.
- `nextGate` now states that the no-manifest pre-live pass did not enforce the default manifest and that live API access still requires rerunning with:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

- `--help` now documents this behavior.

## Current Observed State

Command:

```text
npm run check:recall-prelive
```

Observed:

```text
ok: true
manifestPath: null
defaultManifest.exists: true
defaultManifest.validationEnforced: false
defaultManifest.validationRequiredBeforeLiveApi: true
defaultManifest.status: invalid
defaultManifest.valid: false
defaultManifest.fileSafety.safeForPrivateValues: true
defaultManifest.fileSafety.mode: 600
nextGate: Offline readiness passed without enforcing the default manifest. The default manifest is invalid; fill/fix it and rerun with --manifest data/private/recall-live-spikes/controlled-samples.json before live API access.
```

This means offline safety/rehearsal gates pass, but live Recall API execution remains blocked.

## Validation

Passed:

```text
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-approval-packet.mjs
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

Expected failure confirmed:

```text
npm run check:recall-prelive -- --require-manifest
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The first command exits non-zero when the manifest is required but omitted. The second exits non-zero because the current private manifest template still contains placeholders.

Full application tests passed with 689 pass, 0 fail.

No live Recall API call was made. No API key, private Recall title, private source URL, card content, or raw Recall payload was printed.

## Remaining Gate

The default controlled sample manifest still contains placeholders. The next live step remains user approval plus filling the private manifest, then running:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```
