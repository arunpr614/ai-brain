# Recall Live Spike Report Gate Execution Report

Created: 2026-06-24 14:12 IST
Owner: Codex
Status: Complete for offline scope
Scope: Recall -> AI Brain daily snapshot import

## Summary

Added a post-live acceptance gate for generated SPIKE-013 and SPIKE-014 Markdown reports.

This gate runs after the approved live Recall spike runner creates public redacted reports and before any production-capable dry-run. It verifies:

- SPIKE-013 is `CLEAR`;
- SPIKE-013 evidence includes stable repeated date-window enumeration;
- the six positive controlled card IDs are present;
- the outside-window negative control is absent;
- no unexplained `total_count` / returned-result cap is present;
- SPIKE-014 is `CLEAR`, or `PROCEED-WITH-CHANGES` only with explicit accepted fidelity-risk text;
- SPIKE-014 evidence includes the six required controlled sample labels;
- no `blocked_unknown` fidelity is present;
- max-chunk cards are classified as `possibly_truncated`;
- generated public reports pass the existing privacy scan;
- when a private controlled sample manifest is supplied, generated public reports also pass exact and normalized private-value manifest-aware scanning.

## Files Changed

| Path | Change |
|---|---|
| `scripts/check-recall-live-spike-reports.mjs` | New post-live SPIKE-013/SPIKE-014 report acceptance validator; now supports optional `--manifest` private-value privacy scanning. |
| `scripts/smoke-recall-live-spike-reports.mjs` | Offline smoke covering clear, blocker, generic privacy leak, manifest private-value leak, accepted fidelity-change paths, and non-root cwd helper resolution. |
| `scripts/check-recall-prelive-readiness.mjs` | Added live spike report gate smoke to pre-live readiness. |
| `scripts/run-recall-live-spikes.mjs` | Updated next-gate message to point to the post-live report validator. |
| `scripts/check-recall-approval-packet.mjs` | Added the new post-live report gate to handoff consistency checks. |
| `package.json` | Added `check:recall-live-spike-reports` and `smoke:recall-live-spike-reports`. |
| `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Added post-live report gate command. |
| `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Added post-live report gate command. |
| `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Added post-live report gate before production dry-run. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Recorded artifact/task updates. |
| `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Added the gate to current evidence and remaining live gate criteria. |

## Validation

Passed:

```text
npm run smoke:recall-live-spike-reports
npm run check:recall-approval-packet
```

Full validation was rerun after tracker and audit updates. The live-spike report smoke now proves clean reports pass with `--manifest`, helper scripts resolve from the checker location when the current working directory is not the repo root, and a deliberate private expected-title leak fails without printing the private title.

Follow-up hardening on 2026-06-24 18:00 IST added normalized matching for case, whitespace, HTML entity, and percent-encoding variants. See `RECALL_MANIFEST_PRIVACY_NORMALIZED_MATCHING_EXECUTION_REPORT_2026-06-24_18-00-19_IST.md`.

## Boundaries

No live Recall API call was made.

No API key, private Recall title, private source URL, card ID, or card content was added to public artifacts.

No production dry-run, apply, deployment, or scheduler enablement was performed.
