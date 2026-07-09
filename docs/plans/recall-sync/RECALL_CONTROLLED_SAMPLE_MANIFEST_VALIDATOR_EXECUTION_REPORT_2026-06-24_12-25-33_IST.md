# Recall Controlled Sample Manifest Validator Execution Report

Created: 2026-06-24 12:25 IST
Status: Done for offline scope; live Recall API execution still blocked pending approval
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a reusable private manifest validator for the live Recall sample-card set required before SPIKE-013 and SPIKE-014.

This closes a practical operator gap: the live spike scripts can already generate redacted reports, but the expected controlled cards were still documented as a manual checklist. The new command validates that the private sample set is complete before any API key is sourced or any live Recall request is made.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Validator command | `scripts/check-recall-controlled-samples.mjs` | Added private manifest template and validation command. |
| Package script | `package.json` | Added `npm run check:recall-controlled-samples`. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added manifest gate, six-sample set, and updated SPIKE-013/SPIKE-014 commands. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added manifest gate before live spike and production gates. |

## Manifest Requirements

Default private path:

```text
data/private/recall-live-spikes/controlled-samples.json
```

Required controlled samples:

| Label | Content type | Source URL rule |
|---|---|---|
| `sample-note` | `note` | Optional |
| `sample-article` | `article` | Required |
| `sample-youtube` | `youtube` | Required |
| `sample-pdf` | `pdf` | Required |
| `sample-no-url` | `no_url` | Forbidden |
| `sample-long` | `long` | Optional |

Required negative control:

- label: `outside-window`
- card ID unique from all samples
- creation time outside the SPIKE-013 date window

The validator rejects:

- unchanged template placeholders;
- invalid or missing `dateWindow`;
- missing required sample labels;
- duplicate card IDs;
- missing expected private titles;
- missing required source URLs;
- invalid source URL strings;
- source URL on `sample-no-url`;
- controlled samples outside the SPIKE-013 date window;
- negative control inside the SPIKE-013 date window;
- missing explicit public-report title/source URL privacy booleans.

## Commands

Generate template:

```text
node scripts/check-recall-controlled-samples.mjs --template
```

Validate completed private manifest:

```text
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
```

## Validation Evidence

Controlled manifest validator fixture check:

```text
templateIncludesNoUrl: true
unchangedTemplateStatus: 1
unchangedTemplateFindingCount: 19
validStatus: 0
invalidStatus: 1
invalidFindings:
- Missing required sample sample-no-url.
- Negative control must be outside the SPIKE-013 date window.
```

Help output check:

```text
npm run check:recall-controlled-samples -- --help
```

Result: passed.

Recall public privacy scan:

```text
npm run check:recall-public-privacy
```

Result:

```text
ok: true
scannedFiles: 0
```

Live spike rehearsal smoke:

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
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Validator is ready; Arun still needs to create or identify sample cards. |
| Live SPIKE-013 REST enumeration | Blocked | Run only after API-key and sample manifest approval. |
| Live SPIKE-014 content fidelity | Blocked | Run only after approved sample IDs are available. |
| Production dry-run/apply/deploy/scheduler | Blocked | Must wait for live spike gates and explicit apply/deployment approval. |

## Operator Next Step

After Arun approves live Recall API testing and provides/creates the controlled cards, populate the private manifest and run:

```text
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
```

Only after this passes should the live SPIKE-013/SPIKE-014 commands in the operating packet be run.
