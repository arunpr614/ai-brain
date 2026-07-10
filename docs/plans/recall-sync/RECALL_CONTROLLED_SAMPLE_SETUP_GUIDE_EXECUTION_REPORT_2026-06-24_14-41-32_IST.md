# Recall Controlled Sample Setup Guide Execution Report

Created: 2026-06-24 14:41 IST
Owner: Codex
Status: Done for offline scope; live sample creation remains pending user approval
Related tracker task: RDS-026ao0b

## Summary

Added a no-secret controlled sample setup guide for the Recall live SPIKE-013/SPIKE-014 phase. The guide tells the operator how to choose the six positive sample cards and one outside-window negative control without printing private Recall values.

No live Recall API call, private Recall card inspection, production dry-run, production apply, deployment, or scheduler enablement was performed.

## Files Changed

| File | Change |
|---|---|
| `scripts/print-recall-controlled-samples-guide.mjs` | New Markdown/JSON guide generated from the same required sample labels used by the manifest validator. |
| `scripts/smoke-recall-controlled-samples-guide.mjs` | New smoke test proving the guide includes all required labels, no live API call warning, redacted-only report guard, validation commands, and no API-key-shaped values. |
| `package.json` | Added `recall:controlled-samples:guide` and `smoke:recall-controlled-samples-guide`. |
| `scripts/check-recall-prelive-readiness.mjs` | Added the guide smoke to the consolidated pre-live gate. |
| `scripts/check-recall-approval-packet.mjs` | Added the guide command to approval-packet drift checks. |
| `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Added guide command to safe setup flow. |
| `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added guide command before manifest creation. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added guide command before live sample selection. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Added artifact, report, task, and next-action evidence. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Added current-state evidence and next-gate sequence entry. |

## Guide Coverage

The guide covers:

- `sample-note`
- `sample-article`
- `sample-youtube`
- `sample-pdf`
- `sample-no-url`
- `sample-long`
- `outside-window` negative control

It also reinforces:

- no private Recall values in chat or public docs;
- `allowTitleInPublicReport: false`;
- `allowSourceUrlInPublicReport: false`;
- `npm run check:recall-private-ignore`;
- `npm run recall:controlled-samples:init`;
- `npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json`;
- `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`.

## Validation

Focused validation passed:

```text
npm run smoke:recall-controlled-samples-guide
npm run check:recall-approval-packet
```

Observed result:

- Markdown guide prints all required labels;
- JSON guide uses the manifest source-of-truth labels;
- guide states no live API call is made;
- guide includes the redacted-only public report guard;
- guide includes private validation commands;
- smoke found no API-key-shaped values;
- smoke found no private-value placeholders printed as usable values;
- approval packet consistency passed with the new guide command.

## Remaining Gates

The guide does not clear the live blockers by itself. Completion still requires:

1. Arun approval for API-key handling;
2. real controlled Recall sample cards;
3. private `data/private/recall-live-spikes/controlled-samples.json` populated locally;
4. manifest validation;
5. approved live SPIKE-013/SPIKE-014 run;
6. accepted live-spike report gate;
7. production dry-run/apply/deploy/scheduler verification.
