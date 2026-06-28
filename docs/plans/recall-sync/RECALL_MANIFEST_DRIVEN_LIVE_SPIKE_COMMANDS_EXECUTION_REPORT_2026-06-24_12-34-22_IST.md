# Recall Manifest-Driven Live Spike Commands Execution Report

Created: 2026-06-24 12:34 IST
Status: Done for offline scope; live Recall API execution still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Upgraded the live Recall spike probes so the private controlled sample manifest can drive SPIKE-013 and SPIKE-014 directly.

Before this change, the runbooks asked the operator to validate the manifest and then manually copy six positive card IDs, one negative control ID, date-window values, and card IDs into separate commands. That was a high-friction and error-prone handoff. The probes now support `--manifest data/private/recall-live-spikes/controlled-samples.json`.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Shared manifest module | `scripts/lib/recall-controlled-samples.mjs` | Centralized template, validation, loading, and summary logic. |
| Type declarations | `scripts/lib/recall-controlled-samples.d.ts` | Allows TypeScript spike probes to import the manifest loader cleanly. |
| Standalone validator | `scripts/check-recall-controlled-samples.mjs` | Refactored to use the shared manifest module. |
| SPIKE-013 probe | `scripts/spikes/recall-rest-enumeration.ts` | Added `--manifest`; manifest supplies date window, six expected IDs, private title controls, and negative ID. |
| SPIKE-014 probe | `scripts/spikes/recall-content-fidelity.ts` | Added `--manifest`; manifest supplies the card-detail sample list and public sample labels. |
| Live-spike smoke | `scripts/smoke-recall-live-spikes.mjs` | Rehearses both probes with a synthetic six-sample manifest and verifies privacy redaction. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Commands now use `--manifest`. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Live spike commands now use `--manifest`. |

## Behavior

SPIKE-013:

```text
node --import tsx scripts/spikes/recall-rest-enumeration.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md
```

The manifest supplies:

- `date_from`;
- `date_to`;
- all six positive card IDs;
- one outside-window negative card ID;
- private expected titles for internal presence checks;
- redacted public sample-label summary.

SPIKE-014:

```text
node --import tsx scripts/spikes/recall-content-fidelity.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --max-chunks 50 \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

The manifest supplies:

- all six live card IDs;
- public sample labels on each redacted card summary;
- a redacted expected-control summary for report review.

## Validation Evidence

Manifest validator refactor check:

```text
templateStatus: 0
templateIncludesNoUrl: true
unchangedTemplateStatus: 1
validStatus: 0
validStdoutIncludesNoUrl: true
invalidStatus: 1
invalidStderrIncludesNoUrl: true
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

Manifest-driven live-spike rehearsal:

```text
npm run smoke:recall-live-spikes
```

Result:

```text
ok: true
SPIKE-013 fixture-backed Markdown report -> CLEAR
SPIKE-014 fixture-backed Markdown report -> PROCEED-WITH-CHANGES
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
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Manifest-driven scripts are ready; Arun still needs to create or identify live cards. |
| Live SPIKE-013 REST enumeration | Blocked | Run only after API-key and manifest approval. |
| Live SPIKE-014 content fidelity | Blocked | Run only after approved sample IDs are available. |
| Production dry-run/apply/deploy/scheduler | Blocked | Must wait for live spike gates and explicit apply/deployment approval. |

## Operator Next Step

After Arun approves live Recall API testing and creates or identifies the controlled cards:

1. Populate `data/private/recall-live-spikes/controlled-samples.json`.
2. Run `npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json`.
3. Run SPIKE-013 and SPIKE-014 with `--manifest` as documented in the operating packet.
