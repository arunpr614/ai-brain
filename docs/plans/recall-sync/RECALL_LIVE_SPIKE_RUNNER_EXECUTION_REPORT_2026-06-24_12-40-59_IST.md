# Recall Live Spike Runner Execution Report

Created: 2026-06-24 12:40 IST
Status: Done for offline scope; live Recall API execution still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a single manifest-driven live-spike runner for the approved Recall API validation phase.

The runner validates the private controlled sample manifest, runs SPIKE-013, runs SPIKE-014, writes dated public Markdown reports, and scans those generated reports for public privacy leaks. It also supports fixture-backed offline rehearsal, so the full command path can be tested without `RECALL_API_KEY`.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Live spike runner | `scripts/run-recall-live-spikes.mjs` | Added combined SPIKE-013/SPIKE-014 runner with manifest validation, report writing, and privacy scan. |
| Package command | `package.json` | Added `npm run recall:live-spikes`. |
| Offline smoke | `scripts/smoke-recall-live-spikes.mjs` | Updated to exercise the combined runner with synthetic manifest and fixtures. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added preferred runner command and direct-command fallback guidance. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added preferred runner command before direct debugging commands. |

## Preferred Command

After Arun approves API-key handling and the private manifest validates:

```text
source data/private/recall-live-spikes/recall.env
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --report-dir docs/plans/spikes \
  --confirm-live-api
```

The runner exits before live API calls if `RECALL_API_KEY` is missing. Offline rehearsal can be done with:

```text
node scripts/run-recall-live-spikes.mjs \
  --manifest <temp-controlled-samples.json> \
  --enumeration-fixture <temp-list-fixture.json> \
  --fidelity-fixture <temp-detail-fixture.json> \
  --report-dir <temp-report-dir>
```

## Validation Evidence

Runner no-key guard:

```text
npm run recall:live-spikes
```

Result: exited with code `2` and refused to run without `RECALL_API_KEY` or both offline fixtures.

Runner help:

```text
npm run recall:live-spikes -- --help
```

Result: passed.

Manifest-driven rehearsal smoke:

```text
npm run smoke:recall-live-spikes
```

Result:

```text
ok: true
manifest-driven SPIKE-013/SPIKE-014 runner
SPIKE-013 fixture-backed Markdown report -> CLEAR
SPIKE-014 fixture-backed Markdown report -> PROCEED-WITH-CHANGES
```

Public privacy scan:

```text
npm run check:recall-public-privacy
```

Result:

```text
ok: true
scannedFiles: 0
```

Static checks:

```text
npm run typecheck
npm run lint
```

Result: both passed.

Focused Recall regression:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result: 46 passed, 0 failed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | No key has been requested in chat or written to tracked files. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Runner is ready; Arun still needs to create or identify live cards. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use `npm run recall:live-spikes -- --manifest ... --confirm-live-api` after approval. |
| Production dry-run/apply/deploy/scheduler | Blocked | Must wait for live spike reports and explicit apply/deployment approval. |

## Operator Next Step

After the controlled Recall cards exist:

1. Populate `data/private/recall-live-spikes/controlled-samples.json`.
2. Run `npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json`.
3. Run `npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --confirm-live-api`.
