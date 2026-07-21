# Recall Synchronization Architecture and Reuse Assessment

**Audit date:** 2026-07-21
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
**Direction:** Recall → AI Brain inbound import. This is not evidence that the same model is safe for AI Brain → NotebookLM outbound creation.

## Verified flow

```text
daily systemd timer OR durable manual request
  → trusted wrapper / occurrence identity
  → private process lock
  → lifecycle execution row + heartbeat
  → Recall API date-window enumeration
  → sequential detail fetch
  → plan/dry-run + limits/fidelity policy
  → fresh SQLite backup
  → one transaction per card import
  → wrapper validation
  → global checkpoint only after complete success
```

## Durable state

- `recall_sync_items` is keyed by remote Recall card ID. It stores local item ID, remote metadata, content hash/fidelity, status/error, and last-seen/synced times (`src/db/migrations/020_recall_sync.sql:109-133`).
- `recall_sync_runs` stores dry/apply lifecycle, window, counts, last error, and redacted report (`src/db/migrations/020_recall_sync.sql:142-160`).
- `recall_sync_state` is key/value storage. The global checkpoint is `checkpoint:last_successful_to` (`src/db/migrations/020_recall_sync.sql:165-169`; `src/db/recall-sync.ts:284-315`).
- A SQLite core lock supports explicit stale recovery (`src/db/recall-sync.ts:317-363`).
- Manual synchronization adds durable requests with unique idempotency keys and one-active-request enforcement, plus occurrence-unique executions, stage, heartbeat, and run correlation (`src/db/migrations/024_recall_manual_sync.sql:3-74`).

## Adapter, mapping, and import

- `RecallApiClient` encapsulates bearer calls and timeouts, but has no network retry/backoff or pagination-token support (`src/lib/recall/client.ts:4-11,35-112`).
- Mapper `recall-sync-v0.1` builds a canonical body and SHA-256 hash from remote identity, metadata, and chunks (`src/lib/recall/mapper.ts:7,24-103,129-209`).
- Import first deduplicates by remote card ID, then optionally by source URL. Insert/upgrade and Recall-ledger changes are atomic (`src/lib/recall/importer.ts:69-118,149-270`).
- Existing strong source-URL items are not overwritten. Weak items can be upgraded only under explicit policy.
- Fidelity defaults to verified-complete content. Unverified, possibly truncated, metadata-only, and unknown content are blocked or retrieval-gated (`src/lib/recall/fidelity.ts:18-73`).

## Detection, limits, and checkpointing

- Enumeration uses `[checkpoint - overlap, now]`, with a separate first-run lookback (`src/lib/recall/scheduler.ts:45-62`).
- The runner rejects incomplete enumeration when `results.length` differs from `total_count`; it does not paginate (`src/lib/recall/sync-runner.ts:189-232,531-560`).
- It fetches detail sequentially, plans the complete window, and blocks before writes for fidelity, limits, or changed-remote cases (`src/lib/recall/sync-runner.ts:234-385`).
- Apply is sequential. Every item commit also records exact run progress (`src/lib/recall/sync-runner.ts:387-403,491-504`).
- The global checkpoint advances to `dateTo` only after every planned write succeeds (`src/lib/recall/sync-runner.ts:439-466`).
- A crash after a card commit but before checkpoint advancement is recoverable: the next overlapping run sees the per-card remote identity and skips it (`src/lib/recall/sync-runner.test.ts:709-739`).

## Manual and scheduled execution

- Manual enqueue has bounded SQLite-busy retry, active-request coalescing, terminal-replay protection, five-minute cooldown, 30-minute expiry, and 20-second ambiguous-response resolution (`src/db/recall-manual-sync.ts:4-17,121-197`).
- Occurrence keys prevent the same wrapper occurrence from beginning core work twice (`src/db/recall-manual-sync.ts:284-351`).
- Success requires a linked completed apply plus wrapper validation. Partial writes do not advance “last successful sync” (`src/db/recall-manual-sync.ts:368-457`).
- The web route records intent and writes an empty wake marker; it neither receives the Recall key nor runs the importer (`src/app/api/settings/recall-sync/route.ts:17-95`; `src/lib/recall/manual-sync-service.ts:163-188`).
- A systemd path supplies fast manual pickup and a one-minute timer supplies lost-wake recovery (`scripts/deploy/brain-recall-manual-sync.path:4-7`; `scripts/deploy/brain-recall-manual-sync.timer:4-7`).
- Daily execution is scheduled for 20:00 UTC with persistence and jitter (`scripts/deploy/brain-recall-sync.timer:4-8`).
- The shared wrapper performs enablement gates, deterministic occurrence identity, outer locking, heartbeat, dry-run, backup, apply, and validation (`scripts/recall-scheduled-apply.sh:37-101,126-322`).

## Failure modes that must not be copied

### Whole-window poison blocking

One changed, policy-blocked, or otherwise poisonous card prevents the global checkpoint from moving for all newer cards in the window. A NotebookLM exporter needs per-item leases and independent retry schedules so one failure cannot starve unrelated items.

### Blocked-row policy defect

For an existing remote ID, the importer evaluates the same-hash path before re-evaluating fidelity policy (`src/lib/recall/importer.ts:85-147`). A row first persisted as blocked can later become `skipped_existing` after a policy change without ever being imported. This behavior is safe enough to flag for Recall maintenance but is unsuitable as an outbound template.

### No update or deletion model

A changed remote hash becomes `changed_remote`; it is not synchronized. Deletes are not represented.

### Incomplete remote traversal

Pagination is unsupported. A mismatch between reported and returned counts correctly blocks the run, but cannot complete the work.

### Unclassified sequential network work

The client has no bounded retry/backoff, and detail fetch/apply are sequential. One network error fails the window.

### Directional ambiguity difference

Inbound import can atomically create the local item and remote-ID ledger. Outbound creation cannot atomically commit across SQLite and Google. Google may accept a source while the response is lost, leaving local state ambiguous. A blind retry may create a duplicate.

## Reusable concepts

- dependency-injected provider client and synthetic fixtures;
- pure, versioned content mapping and hashing;
- separate planner, policy/limit evaluation, and executor;
- durable request, execution, and run records;
- unique occurrence and idempotency keys;
- safe status projection and exact ambiguous-request lookup;
- trusted worker credential boundary;
- outer process lock plus database claims;
- truthful partial-success and last-validated-success semantics;
- redacted reports and explicit dry-run/apply modes.

## Provider-neutral outbound model recommendation

### Core records

- `integration_connections`: owner, provider/edition/API variant, account-subject hash, scopes, encrypted credential reference, auth state, and connected/revoked timestamps.
- `integration_targets`: connection, provider notebook resource ID, mapping strategy, eligibility-policy version, schedule/timezone, and active state.
- `integration_outbox`: monotonically increasing integer sequence, item ID, event type, canonical item version/hash, and occurrence time. Create the initial event in the item transaction.
- `integration_sync_items`: target + logical item identity, selected representation/hash/mapping version, provider source ID, desired/observed state, attempt counters, `next_attempt_at`, safe error class, and reconciliation state.
- `integration_sync_attempts`: immutable attempt history with logical operation key, timing, provider request/resource identifiers, retry classification, and response-ambiguity flag.
- `integration_sync_requests`, `integration_sync_executions`, and `integration_sync_runs`: provider-neutral adaptations of Recall manual/daily lifecycle records.
- optional immutable item versions and deletion tombstones only when update/delete scope is later authorized.

### Recommended states

`eligible → prepared → creating → processing → synced`, with explicit `retry_wait`, `needs_reconcile`, `blocked_policy`, `blocked_capacity`, `permanent_failure`, and `auth_required`. Future deletion may add `delete_pending → deleted`.

### Required semantics

1. Discover work by outbox sequence, never `captured_at`.
2. Advance the discovery cursor after durable per-item work rows exist, not after all remote writes succeed.
3. Retry items independently using leases and bounded provider concurrency.
4. Hash a canonical snapshot containing item identity, selected content, allowed enrichment, source metadata, strategy, and mapper version.
5. Exclude attached notes unless separately opted in and covered by explicit provider consent.
6. Prepare and persist a deterministic logical operation key before calling the provider.
7. On a potentially accepted create with no response, enter `needs_reconcile`. Use a documented provider idempotency key or supported deterministic marker/search. If neither exists, require bounded manual reconciliation; never create blindly.
8. Coalesce overlapping manual and scheduled requests through the same service.
9. Treat auth failures as reauthorization, `429` as quota/backoff, transient network/`5xx` as bounded retry, and validation/unsupported/capacity as user-action or permanent states.
10. Keep OAuth refresh tokens outside plaintext settings. Encrypt mutable tokens with a master key available only to the trusted worker, or use an approved secret manager.

## Safe credential-free validations

- Synthetic SQLite outbox/ledger state machine with crash points before the call, after provider acceptance, after the response, and before local commit.
- Fake provider whose create succeeds and then throws; marker-based reconciliation must yield exactly one logical source.
- Concurrent manual/daily executor proving one logical item/target/content version is created once.
- Property tests for equal timestamps, delayed insertion, pagination, cursor advancement, and poison-item isolation.
- Pure mapper fixtures for URL, YouTube, note, extracted PDF, generated summary, and consent-gated attached note.
- Capacity simulation for per-item sources versus daily aggregation.
- OAuth persistence state-machine tests using only fake tokens and encryption keys.
