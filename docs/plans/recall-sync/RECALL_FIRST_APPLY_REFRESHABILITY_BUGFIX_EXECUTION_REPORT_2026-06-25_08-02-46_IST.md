# Recall First Apply Refreshability Bugfix Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 08:02 IST |
| Status | Done for no-live/no-write local gate correctness scope; full project remains incomplete |
| Owner | Codex |
| QA sub-agent | Hilbert |
| Related tracker item | RDS-026l |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, backup payloads, or database rows. |

## Problem

The post-rotation prepare path must be able to move from passing key evidence to a no-write proof refresh before first capped apply approval. A QA/architecture sub-agent found two local correctness risks in that handoff:

- a dry-run proof could fall below the freshness floor as a top-level readiness finding while the `dry_run_report_proof` checked entry remained `ok`, causing `npm run recall:first-apply:status` to classify the state as `blocked_first_apply_readiness` instead of `needs_no_write_proof_refresh`;
- `scripts/recall-first-apply-ready-or-refresh.sh` looked for any refreshable rule in readiness output instead of requiring every failed readiness check/finding to be refreshable, so a mixed refreshable proof issue plus non-refreshable gate could still refresh proof when confirmation was set.

The same audit found a docs defect: lower-level proof-refresh snippets omitted the exact `BRAIN_RECALL_KEY_ROTATION_ACK` that `scripts/recall-first-apply-proof-refresh.sh` requires before live proof refresh.

## Change

- Updated `scripts/check-recall-first-apply-status.mjs`:
  - added `readinessFailureIds`;
  - status classification now combines failed `checked[]` entries with top-level `findings[]`;
  - dry-run freshness-floor findings now produce `needs_no_write_proof_refresh` after key evidence passes.
- Updated `scripts/recall-first-apply-ready-or-refresh.sh`:
  - parses readiness JSON instead of using a loose text grep;
  - refreshes only when every failed check/finding is `dry_run_report_proof` or `backup_proof` and a refreshable proof rule is present;
  - mixed refreshable and non-refreshable readiness failures now fail closed without proof refresh.
- Updated smoke coverage:
  - `scripts/smoke-recall-first-apply-status.mjs` now proves near-expiry dry-run proof reports `needs_no_write_proof_refresh`;
  - `scripts/smoke-recall-first-apply-ready-or-refresh.mjs` now proves near-expiry dry-run proof refreshes and mixed refreshable/non-refreshable failures do not refresh.
- Updated operator docs:
  - `RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md`;
  - `RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`;
  - `RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md`.

## Validation Evidence

```text
node --check scripts/check-recall-first-apply-status.mjs
bash -n scripts/recall-first-apply-ready-or-refresh.sh
node --check scripts/smoke-recall-first-apply-ready-or-refresh.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run -s smoke:recall-first-apply-ready-or-refresh
npm run -s smoke:recall-first-apply-status
```

Focused smoke results included:

- `near-expiry dry-run proof requires refresh confirmation`;
- `near-expiry dry-run proof refreshes through dry-run and backup preflight`;
- `mixed refreshable and non-refreshable readiness failure does not refresh`;
- `fresh key with near-expiry dry-run proof reports needs_no_write_proof_refresh`;
- no secret-shaped Recall key output.

## Non-Actions

- No new live Recall API call was made.
- No private key-rotation evidence was recorded.
- No real proof was refreshed.
- No first capped apply was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Next Gate

The real execution path remains blocked until external key rotation evidence passes. After that, `npm run recall:first-apply:prepare-after-rotation` can correctly refresh stale dry-run or backup proof only when all remaining readiness blockers are refreshable proof blockers, then stop at first capped apply approval.
