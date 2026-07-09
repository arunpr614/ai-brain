# Recall Live API Approval Handoff

Created: 2026-06-24 18:21 IST
Owner: Codex
Status: Ready for Arun review; no live Recall API call made
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

This is the compact no-secret approval handoff for the first live Recall API validation.

It does not contain API keys, private Recall titles, private source URLs, card IDs, or card content. Private values stay only under:

```text
data/private/recall-live-spikes/
```

## What Approval Allows

Approval allows only the read-only live SPIKE-013/SPIKE-014 validation:

- SPIKE-013: Recall REST date-window enumeration against controlled cards.
- SPIKE-014: Recall card-detail/content-fidelity check against controlled cards.

Approval does not allow:

- production dry-run;
- production apply;
- production deploy;
- scheduler enablement;
- committing private values;
- pasting the Recall API key into chat.

## Safe Approval Text

Arun can approve by sending one of these no-secret messages:

```text
I approve the live Recall SPIKE-013/SPIKE-014 run using the temporary shell env option. I will paste the API key locally only, not in chat. Production dry-run/apply/deploy/scheduler remain blocked.
```

or:

```text
I approve the live Recall SPIKE-013/SPIKE-014 run using the ignored local env file option under data/private/recall-live-spikes/recall.env. Production dry-run/apply/deploy/scheduler remain blocked.
```

## Current Safe State

Current expected blocker:

```text
status: needs_manifest_fix
readyForApprovedLiveSpikes: false
privateEvidenceOk: true
```

This is correct until the private controlled sample manifest is filled with real approved Recall cards.

## Pre-Approval Commands

These are safe before any secret is entered:

```text
npm run check:recall-private-ignore
npm run check:recall-prelive
npm run recall:controlled-samples:guide
```

If using the ignored env-file path:

```text
npm run recall:env:init
```

If the private controlled sample manifest does not exist yet:

```text
npm run recall:controlled-samples:init
```

## Private Files To Fill Locally

Only after approval, fill or edit:

```text
data/private/recall-live-spikes/controlled-samples.json
data/private/recall-live-spikes/recall.env
```

Required manifest policy:

```text
allowTitleInPublicReport: false
allowSourceUrlInPublicReport: false
```

Both private files must be ignored, untracked, and owner-only.

## Readiness Commands

Before the live API call, all of these must pass:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The strict readiness command must report:

```text
readyForApprovedLiveSpikes: true
```

## Approved Live Command

Run only after approval and readiness:

```text
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --env-file data/private/recall-live-spikes/recall.env \
  --report-dir docs/plans/spikes \
  --confirm-live-api
```

## Required Post-Live Gates

Before any production-capable dry-run:

```text
npm run check:recall-public-privacy -- --require-files
npm run check:recall-public-docs-privacy
npm run check:recall-public-manifest-privacy -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json
```

The current public approval/runbook docs privacy scan must stay green before the live findings are summarized or used to start any production-capable dry-run.

`--allow-unsafe-manifest-for-smoke` must not be used for real live reports, production dry-run proof, production apply proof, or scheduled proof.

## Stop Conditions

Stop before live API use if:

- the API key would be pasted into chat;
- private files are not ignored or are tracked;
- private files are not owner-only;
- manifest validation fails;
- public report booleans are true;
- `recall:live-gate:require-ready` fails;
- `check:recall-prelive -- --manifest ...` fails;
- live reports would be written outside `docs/plans/spikes`;
- the command would run without `--confirm-live-api`;
- the task drifts into production dry-run, apply, deploy, or scheduler enablement.

## References

- `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md`
- `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V3_2026-06-24_18-17-27_IST.md`
