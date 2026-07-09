# Recall Private Evidence Ignore Guard Execution Report

Created: 2026-06-24 12:44 IST
Status: Done for offline scope; live Recall API execution still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a reusable private-evidence ignore guard for Recall live-spike files.

The live Recall path needs local private files for `recall.env`, controlled sample manifests, raw debugging evidence, and dry-run/apply JSON reports. The repo already ignores `data/`, but that safety was documented as manual `git check-ignore` commands. This change makes the safety check executable and wires it into the combined live-spike runner.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Private ignore guard | `scripts/check-recall-private-ignore.mjs` | Verifies Recall private evidence paths are ignored and not tracked. |
| Package command | `package.json` | Added `npm run check:recall-private-ignore`. |
| Live spike runner | `scripts/run-recall-live-spikes.mjs` | Runner now checks private evidence ignore state before manifest/spike execution. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added private-ignore gate before private evidence creation and before live access. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added private-ignore gate to pre-live commands. |

## Checked Paths

The guard checks these paths:

```text
data/private/
data/private/recall-live-spikes/
data/private/recall-live-spikes/recall.env
data/private/recall-live-spikes/controlled-samples.json
data/private/recall-live-spikes/dry-run-report.json
data/private/recall-live-spikes/first-apply-report.json
```

Each path must be:

- ignored by git;
- not already tracked by git.

## Validation Evidence

Private-ignore guard:

```text
npm run check:recall-private-ignore
```

Result:

```text
ok: true
checkedPaths: 6
all checked paths ignored: true
all checked paths tracked: false
```

Help output:

```text
npm run check:recall-private-ignore -- --help
```

Result: passed.

Combined runner rehearsal:

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
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Manifest validator and private-ignore guard are ready. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Use the combined runner after approval. |
| Production dry-run/apply/deploy/scheduler | Blocked | Must wait for live spike reports and explicit apply/deployment approval. |

## Operator Next Step

Before writing any Recall private evidence:

```text
npm run check:recall-private-ignore
```

Only after it passes should `data/private/recall-live-spikes/recall.env`, controlled sample manifests, or raw live evidence be created.
