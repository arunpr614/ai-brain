# Recall Synchronization

Purpose: Document the guarded Recall import architecture, the manual Settings control, and their operational limits.
Audience: AI Brain owners, agents, and operators changing the integration.
Verified against: current code baseline `8c1341100b174fe4ca518e6a745c30b9078df21c`; feature commit `fdd740617685c1ce730a6150c306152a04070f86`, PR #22 merge `4e917c7c1fb665ef487f508de8d8984ec13642b6`, and PR #23 rollout fixes `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`.
Runtime evidence through: 2026-07-10 for the previously deployed daily timer; the manual control is not enabled or deployed.
Last reviewed: 2026-07-13.
Owner: AI Brain maintainer.

**Status:** Implemented, default off · **Confidence:** High for code and local verification · **Availability:** Feature-flagged and host-dependent

Recall is a one-way guarded import, not two-way synchronization. The existing scheduled wrapper acquires a private outer lock, performs dry-run validation, backup, proof-backed apply, final validation, and checkpoint handling. The manual Settings control creates a durable request for that same wrapper; it does not call Recall or run the importer inside the web process.

## User journey and truthful states

When enabled, the owner opens **Settings → Recall**, reviews the last fully validated success and trusted next schedule, selects **Sync now**, and confirms. The page then rehydrates the exact request by its request ID or idempotency key and reports queued, running, and terminal progress.

| State | User-visible contract |
|---|---|
| Loading | Existing freshness metadata remains while the authenticated status request resolves |
| Never synced / ready | No success is implied; the owner may request a run |
| Queued | Durable intent exists and may be waiting behind the automatic run |
| Running manual / automatic | Bounded progress is shown without claiming completion |
| Long running | The same active request continues with explicit patience copy |
| Done | The linked apply completed and final wrapper validation passed |
| Partial failure | Persisted import/upgrade counts are shown; last success is unchanged |
| Blocked / failed / expired | A safe reason is shown; private provider data and raw errors are excluded |
| Cooldown / terminal replay | A repeated terminal key returns `429` or `409`; no duplicate run is created |
| Offline / session expired / unavailable | Last-known data is qualified and the user is not told an unverified run failed |

Every absolute time is displayed using the `Asia/Kolkata` calendar with an `IST` suffix. “Last successful sync” advances only after the final wrapper validation of a linked apply, including a valid no-new-items apply. Dry runs, blocked runs, failures, and partial failures never overwrite it.

## Request and API contract

The authenticated same-origin endpoint is `/api/settings/recall-sync`.

- `GET` returns an allowlisted status projection. Exact `requestId` and `idempotencyKey` lookup supports refresh, multi-tab, and ambiguous-response recovery.
- `POST` accepts a bounded idempotency key and an empty JSON body. A new or active deduplicated request returns `202`.
- Authentication is evaluated before availability. Unsafe origin, oversized body, cooldown, terminal replay, and unavailable worker paths retain distinct `401`, `403`, `400`, `429`, `409`, and `503` behavior.
- The route writes an empty wake marker only. SQLite remains authoritative and no Recall credential, raw report, source content, private path, or raw exception crosses the response boundary.

Requests expire after 30 minutes if never started. Terminal requests have a five-minute cooldown. A client that cannot find its idempotency key resolves ambiguity after the shared bounded database-retry window rather than immediately creating another request.

## Architecture and data

The browser stores only the safe request identifier and idempotency key. `recall_sync_requests` records durable intent; `recall_sync_executions` records the whole-wrapper occurrence, stage, heartbeat, linked core runs, safe reason, and aggregate counts; `recall_sync_schedule_state` stores a trusted future timer snapshot; and `recall_sync_state.last_successful_apply_at` stores the validated success marker. Migration `024_recall_manual_sync.sql` adds these contracts.

The trusted worker claims one request atomically, holds the same private `flock` used by the automatic wrapper, and launches the packaged lifecycle and wrapper. The existing SQLite core lock remains in place. A 15-second heartbeat and 90-second stale threshold support conservative crash reconciliation; recovery also requires outer-lock and linked-run evidence. Per-card progress is committed with each import transaction so a later failure reports exact persisted writes.

Path activation provides fast pickup and a one-minute safety timer recovers a lost marker. Deployment holds one release lock across application and Recall artifacts, preserves the pre-release daily timer state, and leaves all new units and UI flags disabled by default.

## Security, configuration, and enablement boundary

The intended host model uses a distinct `brain-recall` service identity, a restricted shared data group, a private `/run/brain-recall` lock, and Recall credentials readable only by trusted Recall units. The web service may enqueue in SQLite and write the empty marker, but must not read the Recall credential, execute the wrapper, or open the private lock.

This implementation is merged into current main and proves that boundary statically and with isolated process fixtures. Merge does not prove deployment or enablement. Current host state remains Unknown until an authorized operator proves the actual host identity, credential permissions, directory permissions, installed unit contents, timer invariant, flags, and rollback path.

## Verification and operations

Protecting evidence includes route, database, lifecycle, sync-runner, component, contract, wrapper, bundle, security-artifact, and six multi-process/crash/fake-systemd fixture groups. The full type, lint, test, build, privacy, shell, and documentation gates pass. Responsive evidence covers 1440, 1024, 390, and 320 pixel layouts, light/dark themes, 200% zoom, keyboard focus containment/restoration, reduced motion, live-region behavior, and the major lifecycle states.

Operational diagnosis should compare request, execution, core run, final-validation, lock, and timer evidence without exposing private values. An active timer does not prove every later run succeeded. Start any separately authorized rollout with the UI and manual worker flags off, verify the host boundary, then enable and observe one bounded run before broader use.

Primary implementation areas: `src/components/recall-manual-sync.tsx`, `src/app/api/settings/recall-sync/`, `src/db/recall-manual-sync.ts`, `src/lib/recall/`, `scripts/recall-manual-sync-worker.ts`, `scripts/recall-sync-lifecycle.ts`, the guarded wrapper, and Recall deployment units.

Related current features are capture provenance, quality/repair, enrichment, search, deployment, and backups. Related ideas such as general two-way synchronization remain outside this contract.
