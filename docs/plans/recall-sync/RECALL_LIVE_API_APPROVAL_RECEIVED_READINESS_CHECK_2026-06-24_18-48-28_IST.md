# Recall Live API Approval Received Readiness Check

Created: 2026-06-24 18:48 IST
Owner: Codex
Status: Approval received; live API call not yet run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Record the state immediately after Arun approved proceeding with the live Recall API work.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, or card content.

## Approval Scope

Arun approved proceeding with the live Recall API validation lane.

This approval is interpreted as approval for the read-only SPIKE-013/SPIKE-014 validation path only:

- SPIKE-013: Recall REST date-window enumeration against controlled cards.
- SPIKE-014: Recall card-detail/content-fidelity check against controlled cards.

Production dry-run, production apply, production deploy, and scheduler enablement remain blocked.

## Readiness Check Result

The live call was not made because the fail-closed readiness gates stopped first.

Observed state:

- private evidence paths are ignored and untracked;
- `data/private/recall-live-spikes/recall.env` exists, is owner-only, and has a `RECALL_API_KEY` line, but the key value is empty;
- `BRAIN_RECALL_CONFIRM_LIVE_API` is present in the env template but remains disabled;
- `data/private/recall-live-spikes/controlled-samples.json` exists, is ignored/untracked, owner-only, and still contains placeholders;
- strict live status remains `status: needs_manifest_fix`;
- `readyForApprovedLiveSpikes: false`;
- `privateEvidenceOk: true`.

## Commands Run

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:controlled-samples:guide
```

## Gate Outcome

The manifest-enforced pre-live gate failed before any live Recall API call because the controlled sample manifest still has placeholders.

The private env template also still needs a local-only Recall API key value and explicit live confirmation before the live runner can proceed.

## Next Local Steps

1. Fill `data/private/recall-live-spikes/recall.env` locally:

```text
RECALL_API_KEY=<paste locally only; do not paste in chat>
BRAIN_RECALL_CONFIRM_LIVE_API=1
```

2. Fill `data/private/recall-live-spikes/controlled-samples.json` locally with:

- one note sample;
- one article sample;
- one YouTube/video sample;
- one PDF sample;
- one no-source-URL sample;
- one long/truncation candidate;
- one outside-window negative control.

3. Keep all public-report privacy booleans false:

```text
allowTitleInPublicReport: false
allowSourceUrlInPublicReport: false
```

4. Rerun:

```text
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

5. Only after those pass, run the approved live SPIKE runner:

```text
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --env-file data/private/recall-live-spikes/recall.env \
  --report-dir docs/plans/spikes \
  --confirm-live-api
```

## Current Production State

No live Recall API call was made. No production dry-run, production apply, production deploy, or scheduler enablement was performed.
