# Recall Public Report Redaction Manifest Gate Execution Report

Created: 2026-06-24 13:56 IST
Status: Done and validated for offline scope; no live Recall API call made
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Made the combined live SPIKE-013/SPIKE-014 workflow redacted-only for public reports.

Before this change, the private controlled sample manifest accepted `allowTitleInPublicReport=true` or `allowSourceUrlInPublicReport=true` as valid values, even though the operating path does not need private titles or private source URLs in public Markdown. The manifest validator now rejects those values. The live-gate status smoke includes a negative control proving that a manifest requesting public title/source URL exposure is reported as `needs_manifest_fix`.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Controlled sample validator | `scripts/lib/recall-controlled-samples.mjs` | Requires `allowTitleInPublicReport=false` and `allowSourceUrlInPublicReport=false` for every sample. |
| Live gate status smoke | `scripts/smoke-recall-live-gate-status.mjs` | Adds a manifest negative control that sets public-report booleans to true and expects `needs_manifest_fix`. |
| Operating/runbook docs | `RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`, `RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Documents that public SPIKE reports are redacted-only. |
| Tracker/audit | Project tracker and completion audit | Removes report privacy preference as a live blocker by making the default policy explicit and machine-enforced. |

## Safety Behavior

- Private expected titles remain in the private manifest only.
- Private source URLs remain in the private manifest only.
- Public SPIKE reports continue to use redacted titles and source-host-only behavior.
- Manifest validation fails before live API work if public report exposure booleans are set to true.
- The public privacy scan remains in the pre-live gate and still scans generated SPIKE reports.

## Validation Evidence

Actual validation run on 2026-06-24:

```text
npm run smoke:recall-live-gate-status
npm run smoke:recall-live-spikes
node scripts/check-recall-controlled-samples.mjs --template
npm run check:recall-prelive
npm run lint
npm run typecheck
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' -o -name 'controlled-samples-status-smoke-*.json' -o -name 'recall-env-init-smoke-*.env' \) -print
```

Observed results:

- live gate status smoke passed and now includes `public report exposure manifest rejected`;
- live spike rehearsal still passed with redacted public outputs;
- template check confirmed all public report booleans default false;
- consolidated pre-live readiness passed with the stricter status smoke;
- lint and typecheck passed;
- private smoke temp-file check printed no lingering files.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved API-key handling | Blocked | Still required before any live API command. |
| Controlled sample manifest populated with real Recall card IDs | Blocked | Manifest must keep public report booleans false. |
| Live SPIKE-013/SPIKE-014 | Blocked | Requires approved API handling, valid redacted-only manifest, and explicit live confirmation. |
| Production dry-run/apply/deploy/scheduler | Blocked | Still gated behind live spike evidence and explicit approval. |
