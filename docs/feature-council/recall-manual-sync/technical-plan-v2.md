# Technical plan v2: Recall sync status and manual synchronization

Status: Approved engineering source of truth for implementation
Date: 2026-07-11
Supersedes: `technical-plan-v1.md` where they differ

## Adversarial disposition

| V1 finding | V2 resolution |
| --- | --- |
| Non-blocking lock could skip daily run | Trigger-aware waits: manual waits 5s then requeues; automatic waits up to the derived 3h wrapper bound or trusted retry. |
| Lock path could be controlled by web identity | Distinct `brain-recall` identity and private `/run/brain-recall/` lock directory; web cannot open/delete it. |
| Request/execution/run had split terminal ownership | Execution is wrapper authority; lifecycle terminal transaction updates execution, linked request, and last-success. Worker never invents outcome. |
| Heartbeat was aspirational | PID-bound 15s heartbeat loop plus stage/run progress; stale requires 90s and corroborating lock/process/run evidence. |
| Credential design was optional | Distinct Recall identity is mandatory; root-owned key delivered only to Recall units. |
| Schedule capture unspecified | Automatic unit runs a trusted read-only next-elapse helper and persists value + observed-at; missing/stale/past is unavailable. |
| Per-card redundant writes increased contention | Runner updates only its run after each committed card; lifecycle derives/finalizes execution/request counts. |
| Migration/build/deploy details vague | Explicit schema order, constraints, bundle/unit/tmpfiles manifest, and disabled install gates below. |

## Architecture

The browser authenticates and enqueues in SQLite, then creates an empty marker in a bounded shared spool. A path unit or 60-second timer starts a trusted worker. The worker claims one request and invokes the same `recall-scheduled-apply.sh` used by the daily timer. Both trusted entry points run as `brain-recall` and serialize the entire wrapper with `flock`; `runRecallSync` retains its current database lock/checkpoint/item idempotency.

Execution, request, and core runs have distinct ownership:

- request: owner intent/queue/cooldown/expiry;
- execution: one complete wrapper, automatic or manual, authoritative terminal outcome and validated success;
- run: one dry-run or apply core invocation and incremental private progress.

## Identity, credential, and filesystem boundary

Review-ready assets define:

- web service identity `brain`;
- trusted Recall identity `brain-recall`;
- shared group `brain-data` for SQLite/WAL/backups and wake spool only;
- setgid restricted data directories with `UMask=0007`;
- `/run/brain-recall/` created by tmpfiles as `brain-recall:brain-recall` mode `0700` for the wrapper lock;
- root-owned Recall key source, delivered with `LoadCredential=recall-api-key:...` only to Recall units;
- shared `/etc/brain/.env` must not contain `RECALL_API_KEY` when the manual feature or new units are enabled;
- wrapper reads `$CREDENTIALS_DIRECTORY/recall-api-key` in Recall service context.

Web may write only the empty marker under a bounded data spool and normal application DB/data. It cannot read the credential or open/delete/hold the wrapper lock. Deploy preflight fails closed if shared env still contains the key, identity/group/tmpfiles/credential permissions are wrong, or unit properties drift. This PR installs support default off; host transition/proof is separately authorized.

## Whole-wrapper locking and automatic preservation

`recall-scheduled-apply.sh` opens `/run/brain-recall/recall-sync.lock` before lifecycle start.

- Manual trigger: `flock -w 5`. Contention exits a recognized temporary code; lifecycle/request repository returns the same claimed request to queued and refreshes its marker. No execution row is created.
- Automatic trigger: `flock -w 10800` (3h derived maximum). If timeout occurs, the unit schedules/records one trusted retry rather than silently losing the daily occurrence. The retry uses the same automatic occurrence key so it cannot produce duplicate wrapper executions.

Derived bound: current wrapper performs dry and apply, each with at most 100 detail requests at a 30s client timeout: 6,000s worst-case detail time, plus enumeration, validators, backup, process startup, and ~2,000s margin, rounded to 10,800s. Static tests fail if caps/timeouts change without updating the derived bound. Manual worker service timeout is 3h15m after lock acquisition; automatic service timeout covers up to 3h lock wait plus 3h15m execution and margin (7h). Test fixtures use short injected values.

Process exit releases `flock`; the existing DB lock remains defense in depth. Tests prove a manual run at timer fire cannot interleave stages or skip the automatic run and that each occurrence executes at most once.

## Migration `024_recall_manual_sync.sql`

Verify filename availability after rebase.

### Create `recall_sync_executions` first

- `id TEXT PRIMARY KEY`
- `occurrence_key TEXT UNIQUE NOT NULL` (automatic occurrence or manual request correlation)
- `trigger TEXT NOT NULL CHECK(trigger IN ('automatic','manual_ui'))`
- `request_id TEXT`
- `state TEXT NOT NULL CHECK(state IN ('running','done','blocked','error','partial_failure'))`
- `stage TEXT NOT NULL CHECK(stage IN ('starting','dry_run','dry_run_validated','backup','apply','apply_validated','terminal'))`
- `started_at`, `heartbeat_at`, `completed_at`, `wrapper_validated_at` INTEGER
- `dry_run_id`, `apply_run_id` TEXT
- `safe_reason TEXT` with SQL/repository allowlist
- non-negative typed imported/upgraded/already-current counts with CHECK constraints

Indexes: active `(state, heartbeat_at)` and validated-success `(wrapper_validated_at DESC)`.

### Create `recall_sync_requests`

- ID/idempotency/owner/trigger constraints;
- state enum queued/claimed/running/done/blocked/error/partial_failure/expired;
- requested/claimed/started/heartbeat/completed/expires timestamps;
- `execution_id TEXT REFERENCES recall_sync_executions(id) ON DELETE SET NULL`;
- safe reason and non-negative typed counts.

Partial unique index on constant manual trigger for queued/claimed/running; claim and cooldown indexes. `run_id` is not duplicated here; apply run is reachable through execution.

### Extend `recall_sync_runs`

Add nullable `execution_id TEXT`, `trigger TEXT NOT NULL DEFAULT 'automatic'`, and `request_id TEXT`, with indexes. SQLite ALTER limitations mean these are documented soft links; repository validates referenced IDs. Migration tests cover fresh DB, existing rows, enum/default/check/index shape, foreign keys, and rollback-free compatibility.

## SQLite behavior

- Set `busy_timeout=5000` for web and workers.
- Enqueue/dedupe/cooldown and claim use `.immediate()` transactions.
- On `SQLITE_BUSY`, retry enqueue/claim only twice with bounded 50ms/150ms delay; then return safe unavailable. Never retry ambiguous run/item writes.
- Partial unique constraint is final active arbiter; constraint conflict re-reads the active row.
- Test two independent connections and a process-level race.

## Request repository

Enqueue transaction expires old queued rows, resolves same-key replay, returns any active request, calculates five-minute cooldown, then inserts one queued row with 30-minute expiry. Both new and deduped accepted responses are `202`.

Claim transaction selects/updates oldest non-expired queued row. Worker marks running only after lifecycle start links an execution. Contended outer lock requeues the same request. Stale recovery requires execution/heartbeat/lock/run evidence; it finalizes from an existing terminal execution or safely requeues only when no execution/lock/process can exist.

## Core run persistence and partial truth

`runRecallSync` receives stable run/execution/trigger/request IDs, inserts one `running` row before network work, and updates that row to terminal. Apply uses an ordered loop instead of `planned.map`:

1. each `importRecallCard` retains its existing short transaction;
2. after commit, one short run-progress transaction updates run aggregates;
3. a later throw persists prior counts and an error/partial internal result;
4. checkpoint never advances on error/partial;
5. execution/request counts are derived from the linked apply run during lifecycle terminal transaction, not redundantly updated per card.

Existing dry-run/apply report schemas gain safe run/execution IDs. Private report sanitization remains. Existing Recall tests and wrapper smokes must continue to pass.

## Wrapper lifecycle authority

Packaged lifecycle commands:

- `start`: after lock, create unique running execution and print ID.
- `stage`: validate monotonic stage and heartbeat.
- `heartbeat`: update active execution every 15s while wrapper PID lives.
- `complete`: only after final apply validator; in one immediate transaction link apply run, derive safe counts, set execution done/validated, finalize linked request, and make this execution the latest-success candidate.
- `fail`: trap nonzero EXIT/INT/TERM; derive counts/state from durable linked runs, atomically finalize execution/request without touching last-success.
- `schedule`: read-only parse of `systemctl show brain-recall-sync.timer` NextElapse, persist UTC instant + observed-at + timer name; missing/error is logged and status remains unavailable.

The wrapper starts a background heartbeat loop bound to its PID and kills/waits it during cleanup. Stale threshold is 90s (six missed 15s intervals) and still requires corroboration; tests inject short intervals. Lifecycle is the only terminal writer. Worker handles claim/spawn/requeue/reconcile only.

## Worker and activation

Worker bundle starts, exits if flag/readiness/queue absent, expires eligible work, claims one request, invokes wrapper with fixed trigger/request correlation and 5s lock wait, and reconciles only from lifecycle rows. It never passes user operational parameters or exposes child stderr.

Assets:

- `brain-recall-manual-sync.service` as `brain-recall`, hardened, 3h15m execution timeout;
- `.path` watches the empty-marker spool;
- `.timer` runs every 60s as lost-wake fallback;
- automatic service updated to `brain-recall`, credential, lock-wait/retry, timeout, and trusted `ExecStartPost` schedule helper;
- tmpfiles rule creates private runtime lock directory and bounded shared spool.

Install/daemon-reload only; manual path/timer and UI flag remain disabled. Existing daily timer is never disabled/rescheduled by this task.

## API and safe status

Node/force-dynamic `/api/settings/recall-sync` authenticates before flags. GET returns private/no-store one reduced activity object (not separate raw request/execution), latest outcome, last validated success, fresh future next schedule, retry seconds, and server observed time.

POST requires exact origin, body-size bound, strict zod `{idempotencyKey}`. `202` new/deduped; `400`, `401`, `403`, `429`, `503` as defined. Marker failure after durable insert still returns queued `202` and logs activation failure; insert failure never implies acceptance.

DTO allowlist contains only enabled/readiness/activity state/timestamps/safe counts/safe reason/cooldown/request ID. It excludes report JSON, raw errors/stderr, source data/IDs, lock owner, paths, commands, environment/credential details. Safe reasons are active, connection_attention, authentication_attention, rate_limited, safety_attention, worker_unavailable, internal, expired.

## Client implementation

Server Settings inserts the feature after AI services when UI flag is on. Client has pure contract/formatter/view-model helpers; Radix Dialog; Requesting/ambiguous-response state; same-key recovery; two-second visible active polling; hidden pause/slow; visibility/online refresh; abort/out-of-order suppression; 401 Unlock; last-known/last-checked offline; terminal cooldown composition; exact IST; bounded pluralization; `px-4 sm:px-8`; 44px mobile controls; transition-only live region; reduced motion.

## Schedule and readiness

Persisted next-elapse is trusted only if timer name matches, observed-at is recent, instant parses as UTC and is future. Otherwise API returns null and UI says unavailable. Static checks compare timer definition/identity with helper expectations. Schedule helper is in trusted automatic unit, never web.

Readiness separately checks UI flag, manual worker/unit configuration signal, shared sync enablement, and safe database/spool ability without reading/probing the Recall credential from web. Credential readiness is asserted by trusted worker/host gate.

## Build/deploy manifest

Update build to atomically emit:

- existing `sync-recall-prod.mjs`;
- `recall-sync-lifecycle-prod.mjs`;
- `recall-manual-sync-worker-prod.mjs`;
- copied migrations.

Deploy explicitly copies all three bundles, wrapper/check/worker support, migration directory, automatic/manual service/path/timer units, and tmpfiles rule. Static artifact check asserts every referenced path exists. Deploy installs identities/group/tmpfiles/units only under an explicit preparation mode and never moves the credential or enables units without separate authorization. Default deploy verifies current automatic timer remains enabled/active when the established override is used.

## Tests and verification

### Data/process

- migration/constraints/compatibility;
- immediate enqueue/claim races and bounded busy behavior;
- stable run lifecycle and late-card partial counts;
- lifecycle atomic terminal transaction/crash windows;
- PID heartbeat healthy-long versus killed-stale recovery;
- manual lock contention requeue; automatic waits/retries and eventually runs exactly once;
- web identity cannot access credential/lock; Recall identity can access required DB/data in Linux fixture/static unit proof;
- next-elapse parse/fresh/stale/past and timer drift;
- bundle/deploy/unit/tmpfiles manifest.

### Route/UI

- auth-first/flag/origin/body/idempotency/dedupe/429/marker-failure/persistence-failure/privacy;
- Requesting/lost-response/same-key recovery/automatic race;
- all durable/overlay/cooldown/offline/auth states;
- IST zones/boundaries; pluralization/large counts;
- polling/visibility/online/abort/out-of-order/live announcements;
- dialog/no-overlay/focus return; 1440/1024/390/320, dark, 44px, AA, zoom, reduced motion.

### Regression/build

- existing Recall client/fidelity/importer/scheduler/runner/migration suites;
- packaged CLI and scheduled wrapper smoke;
- manual and automatic fixture proof-sequence comparison;
- timer files/state unchanged by manual fixture;
- full lint/type/test/production build and privacy/docs gates.

## Rollout and rollback

Land dark persistence/worker/routes, then UI, all default off. Review-ready PR includes local/static/fixture evidence only. Separately authorized host preparation creates identity/group/credential/data/tmpfiles/units, proves permissions and timer invariants, then controlled enablement/observation.

Rollback disables UI/new path/fallback, rejects new requests, preserves rows/migration, lets active trusted work finish unless runbook says otherwise, and never disables/reschedules daily timer. Use forward/revert commits; no destructive migration or force history.

## No-go gates

- No implementation deviation from distinct identity, private lock, trigger-aware automatic preservation, single lifecycle authority, or heartbeat without decision-log update and review.
- No release if manual activity can skip/interleave automatic sync, partial counts can lie, or safe DTO leaks private internals.
- No production enablement without explicit authorization and host identity/credential/permission/unit/timer proof.
