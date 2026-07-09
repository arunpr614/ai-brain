# Recall Live Spike Explicit Confirmation Gate Execution Report

Created: 2026-06-24 13:30 IST
Status: Done for offline scope; no live Recall API call made
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added an explicit confirmation gate to the combined Recall live-spike runner.

Before this change, a shell that happened to contain `RECALL_API_KEY` could run the combined SPIKE-013/SPIKE-014 runner in live mode. The runner now refuses live mode unless `--confirm-live-api` is passed or `BRAIN_RECALL_CONFIRM_LIVE_API=1` is set after approval. It also rejects mixed fixture/live mode, so the runner cannot combine one fixture-backed probe with one live Recall API probe.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Live runner | `scripts/run-recall-live-spikes.mjs` | Requires explicit live confirmation and rejects mixed fixture/live mode. |
| Live runner smoke | `scripts/smoke-recall-live-spikes.mjs` | Proves unconfirmed live mode and mixed fixture/live mode fail before API work. |
| Live gate status | `scripts/check-recall-live-gate-status.mjs`, `scripts/smoke-recall-live-gate-status.mjs` | Adds `needs_live_api_confirmation` status and only reports ready when API-key presence plus confirmation are both present. |
| Operating packet/runbook | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`, `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Live runner examples now include `--confirm-live-api`. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Adds the explicit live confirmation gate as a completed offline-scope task. |

## Safety Behavior

- Fixture rehearsal still works without `RECALL_API_KEY`.
- Live mode requires `RECALL_API_KEY` and explicit confirmation.
- A single fixture plus live API fallback is refused.
- Status command does not print the API-key value.
- Pre-live readiness remains a no-live-API gate.

## Validation Evidence

Live spike runner smoke:

```text
npm run smoke:recall-live-spikes
```

Result: passed.

- unconfirmed live runner path exits before live API work;
- mixed fixture/live runner path exits before live API work;
- fixture rehearsal still passes;

Live gate status smoke:

```text
npm run smoke:recall-live-gate-status
```

Result: passed; status now distinguishes `needs_live_api_confirmation` from `ready_for_approved_live_spikes`.

Current local live gate status:

```text
npm run recall:live-gate:status
```

Result: passed and reports:

- `status: needs_manifest_template`;
- `credential.recallApiKeyEnvPresent: false`;
- `credential.liveApiConfirmationPresent: false`;
- next command: `npm run recall:controlled-samples:init`.

Pre-live readiness:

```text
npm run check:recall-prelive
```

Result: passed; includes live gate status smoke and live-spike rehearsal with unconfirmed-live/mixed-mode rejection coverage.

Quality gates:

```text
npm run lint
npm run typecheck
```

Result: both passed.

Smoke cleanup check:

```text
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' -o -name 'controlled-samples-status-smoke-*.json' \) -print
```

Result: no files printed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | Still required before any live API command. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Required before live SPIKE-013/SPIKE-014. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Must use `--confirm-live-api` only after approval. |
