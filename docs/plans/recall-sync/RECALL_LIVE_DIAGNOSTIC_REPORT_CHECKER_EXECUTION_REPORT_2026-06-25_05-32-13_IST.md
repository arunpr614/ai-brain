# Recall Live Diagnostic Report Checker Execution Report

Status: Done for offline scope; live diagnostic proof is validated as diagnostic-only
Date: 2026-06-25 05:32 IST
Owner: AI agent (Codex)
Scope: Recall daily sync / first-apply live-read diagnostic evidence

## Summary

Added a no-live artifact checker for `data/private/recall-live-spikes/live-diagnostic-report.json`. The checker validates that the private live diagnostic proof exists, is owner-only, is ignored/untracked, has the expected status-preserving read-only shape, contains no obvious secret-shaped values or raw Recall payload keys, and does not claim probe-level proof refresh or apply permission.

This closes a safety gap after the live diagnostic private proof was written: future agents can validate the artifact without treating it as key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint permission.

## Change

| Area | Behavior |
|---|---|
| Artifact checker | `scripts/check-recall-live-diagnostic-report.mjs` validates the private diagnostic report JSON without calling Recall. |
| Smoke coverage | `scripts/smoke-recall-live-diagnostic-report-check.mjs` proves valid reports pass and unsafe variants fail. |
| Package scripts | Added `check:recall-live-diagnostic-report` and `smoke:recall-live-diagnostic-report`. |
| Status discoverability | `npm run recall:first-apply:status` now exposes `diagnostics.liveReadConnectivity.optionalNoWriteReportCheckCommand` and `optionalDiagnosticCommands[id=first_apply_live_diagnostic_report_check]`. |
| Private ignore baseline | `scripts/check-recall-private-ignore.mjs` now includes `data/private/recall-live-spikes/live-diagnostic-report.json`. |

## Current Checker Result

`npm run check:recall-live-diagnostic-report` passed against the real private report:

```text
verdict: PASS_RECALL_LIVE_DIAGNOSTIC_REPORT
statusBeforeProbe: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
diagnosticOutputFile.path: data/private/recall-live-spikes/live-diagnostic-report.json
diagnosticOutputFile.mode: 0600
diagnosticOutputFile.statMode: 600
diagnosticOutputFile.sizeBytes: 6524
liveAuthProbe.httpStatus: 200
liveAuthProbe.authenticated: true
liveAuthProbe.reachable: true
liveAuthProbe.totalCount: 0
liveAuthProbe.resultCount: 0
envFileMtimeAfterCheckpoint: false
proofRefreshAllowedNow: false
applyAllowedNow: false
proofRefreshAllowedByThisProbe: false
applyAllowedByThisProbe: false
warnings: []
```

## Smoke Coverage

`npm run smoke:recall-live-diagnostic-report` passed and proves:

- valid private live diagnostic report passes;
- non-private report fails by default;
- non-private fixture can be allowed only with explicit smoke flags;
- secret-shaped values fail;
- raw/private payload keys fail;
- probe-level write permission claims fail;
- wrong diagnostic mode fails;
- stale report fails when `--max-age-minutes` is requested;
- future-dated report fails.

## Status Output

`npm run recall:first-apply:status` still reports:

```text
status: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
proofRefreshAllowedNow: false
applyAllowedNow: false
```

It now also exposes the diagnostic-only artifact checker:

```bash
npm run check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-report.json
```

Top-level `optionalDiagnosticCommands` includes:

```text
id: first_apply_live_diagnostic_report_check
mode: no_live_private_file_check
outputFile: data/private/recall-live-spikes/live-diagnostic-report.json
doesNotSatisfy: live_connectivity, key_rotation_evidence, proof_freshness, first_write_approval, apply, deploy, scheduler, checkpoint
```

## Safety Properties

- The checker does not call Recall.
- The checker does not read or write the AI Brain database.
- The checker does not create or refresh dry-run proof or backup proof.
- The checker does not apply, deploy, enable the scheduler, or advance a checkpoint.
- Passing the checker does not satisfy live connectivity, key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.
- The private report remains under `data/private/recall-live-spikes/`, ignored by git, untracked, and owner-only.

## Validation

Passed:

```text
node --check scripts/check-recall-live-diagnostic-report.mjs
node --check scripts/smoke-recall-live-diagnostic-report-check.mjs
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
node --check scripts/check-recall-private-ignore.mjs
npm run check:recall-live-diagnostic-report
npm run smoke:recall-live-diagnostic-report
npm run smoke:recall-first-apply-status
npm run check:recall-private-ignore
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
npm run recall:first-apply:status
```

`npm run check:recall-approval-packet` now includes this report in the approval packet evidence set, with 34 checked documents and 47 required package scripts. `npm run check:recall-public-docs-privacy` now scans 46 curated public Recall docs, including this report.

## Next Gate

For first-write progress, rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then run:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```
