# Recall Public Privacy Require-Files And Redacted Preview Execution Report

Created: 2026-06-24 17:51 IST
Owner: Codex
Status: Done for offline scope; live reports still pending approved Recall API run

## Purpose

Close a false-positive risk in the reusable public SPIKE-013/SPIKE-014 privacy scanner. The default command can legitimately scan zero files before live reports exist, but post-report automation needs a fail-closed mode so a missing report set cannot be mistaken for a clean report set.

Also prevent the scanner from echoing leaked values in failure previews. A privacy checker should identify the rule and location without reprinting the secret-shaped value it detected.

## Change

- Added `--require-files` to `scripts/check-recall-public-privacy.mjs`.
  - Default mode still reports `scannedFiles: 0` successfully before live reports exist.
  - Required-files mode exits nonzero with `no_report_files_found` when no Markdown report files match.
- Redacted failure previews for:
  - raw `RECALL_API_KEY=` assignments;
  - bearer tokens;
  - `sk_*` secret-shaped values;
  - cookie header values;
  - tokenized/signed query-string values.
- Added `scripts/smoke-recall-public-privacy.mjs` and package script `smoke:recall-public-privacy`.
- Added the smoke to `npm run check:recall-prelive`.
- Updated the approval checklist, operating packet, and production runbook to use:

```text
npm run check:recall-public-privacy -- --require-files
```

after live reports should exist.

## Validation

Passed:

```text
node --check scripts/check-recall-public-privacy.mjs
node --check scripts/smoke-recall-public-privacy.mjs
npm run smoke:recall-public-privacy
npm run check:recall-public-privacy
npm run check:recall-prelive
```

Expected blocked strict-mode result while no public live reports exist:

```text
npm run check:recall-public-privacy -- --require-files
exitCode: 1
rule: no_report_files_found
scannedFiles: 0
```

The smoke also proves a synthetic leak is detected while failure output does not print the synthetic API key, bearer token, cookie value, or tokenized URL.

`npm run check:recall-prelive` now includes `public_privacy_scan_smoke` and passed in non-enforcing mode. It still reports the default private controlled-sample manifest as placeholder-invalid and keeps the manifest-enforced command as the next live gate.

No live Recall API call was made. No production dry-run, production apply, deploy, or scheduler enablement was performed.

## Remaining Gate

This hardens public-report scanning only. Real SPIKE-013/SPIKE-014 reports still need an approved live Recall API run, then both the strict public privacy scan and manifest-aware privacy scan must pass before production-capable dry-run.
