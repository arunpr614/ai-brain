# SPIKE-018 - Recall Scheduler And Checkpoint Safety

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-018 |
| **Date** | 2026-06-24 09:51 IST |
| **Author** | AI agent (Codex) |
| **Phase** | Phase C - local integration and scheduling design |
| **Triggered by** | Recall daily sync V2 GATE-005: queue/cost/checkpoint safety |
| **Isolation** | Synthetic fake clients, fake clocks, isolated DB state; no real Recall API calls; no cron installed |
| **Verdict** | PROCEED-WITH-CHANGES for CLI-first scheduler/checkpoint primitives; production cron remains blocked |

## Question

Can the Recall import be designed as a safe daily job without duplicate runs, checkpoint corruption, or unbounded downstream work?

## Method

This spike implemented and tested scheduler/checkpoint primitives without scheduling a real job and without accessing live Recall data.

Implementation added:

- `src/lib/recall/scheduler.ts`
  - date-window calculation with overlap;
  - cap evaluation for cards/imports/chars/chunks;
  - checkpoint-advance rules;
  - cron-friendly exit-code mapping;
  - Recall sync report sanitization.
- `src/db/recall-sync.ts`
  - `recall_sync_state` helpers;
  - checkpoint read/advance helpers;
  - run-lock acquire/release helpers;
  - stale-lock recovery support.
- `src/lib/recall/sync-runner.ts`
  - fake-client-compatible dry-run/apply runner;
  - list/detail planning;
  - caps before writes;
  - import through `importRecallCard()`;
  - checkpoint advancement only after successful apply;
  - lock-based overlap prevention.
- Tests:
  - `src/lib/recall/scheduler.test.ts`
  - `src/lib/recall/sync-runner.test.ts`

No production cron was added. No in-process Next.js cron wrapper was added. No Recall API key was read.

## Evidence

### Date Window And Checkpoint Rules

`computeRecallSyncWindow()` supports:

- first-run lookback window;
- checkpoint-based window;
- overlap buffer so boundary cards are not missed;
- clamping future/invalid inputs safely.

`shouldAdvanceRecallCheckpoint()` allows checkpoint advancement only when all are true:

- mode is `apply`;
- run completed;
- failure count is zero;
- caps were not exceeded;
- enumeration is not suspicious.

Dry-run never advances the checkpoint.

### Run Lock

`tryAcquireRecallSyncLock()` stores a lock in `recall_sync_state` under:

```text
lock:recall_sync
```

It blocks concurrent runs by default and allows stale-lock recovery only when the caller explicitly opts in.

Tested cases:

- first run acquires lock;
- overlapping run is blocked;
- stale lock is not recovered without approval;
- stale lock can be intentionally recovered;
- non-owner release fails;
- owner release succeeds.

### Caps Before Writes

`evaluateRecallSyncCaps()` enforces:

- max cards seen;
- max cards planned for import;
- max total characters planned;
- max total chunks fetched.

The fake sync runner applies caps in two places:

1. after list, before detail fetches, for card-count limits;
2. after detail planning, before any item write, for character/chunk/import limits.

Tested case:

- an oversized apply run is blocked before creating an AI Brain item or advancing checkpoint.

### Dry-Run And Apply Runner

`runRecallSync()` accepts a fake client:

```ts
interface RecallSyncClient {
  listCards(window: { dateFrom: string; dateTo: string }): Promise<RecallCardPreview[]>;
  getCardDetail(cardId: string, options: { maxChunks: number }): Promise<RecallCardDetail>;
}
```

Tested cases:

- dry-run plans a window without writing items or checkpoint;
- apply imports planned cards and advances checkpoint after success;
- detail fetch failure returns a partial-failure exit code and does not advance checkpoint;
- cap overflow blocks writes and checkpoint advancement;
- active lock blocks overlapping invocation;
- retry after an import-before-checkpoint crash skips the already-mapped card and advances checkpoint safely.

### Cron-Friendly Exit Codes

The spike defines stable exit codes:

| Name | Code | Intended meaning |
|---|---:|---|
| `success` | 0 | Run completed successfully |
| `unexpected_error` | 1 | Unclassified failure |
| `config_error` | 2 | Missing or invalid local config |
| `partial_failure` | 10 | List succeeded but one or more detail/import steps failed |
| `rate_limited` | 69 | Recall API rate limit |
| `locked` | 75 | Another run is active |
| `auth_failure` | 77 | Auth/API-key failure |
| `cap_exceeded` | 78 | Safety cap blocked the run |

### Privacy-Safe Reports

`sanitizeRecallSyncReport()` uses the shared redaction helper to remove:

- private titles;
- bearer/API secrets;
- sensitive URL query values;
- full chunks/content fields.

The test verifies that a dry-run report containing a private title, signed URL, bearer token, and chunks is sanitized.

## Validation

Focused validation passed:

```text
node --import tsx --test src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/capture/quality.test.ts src/lib/security/redaction.test.ts

# tests 27
# pass 27
# fail 0

npm run typecheck
```

## Pass Criteria Assessment

| Criterion | Result | Evidence |
|---|---|---|
| Checkpoint cannot advance on partial failure | Passed for fake detail failure | `sync-runner.test.ts` partial failure test |
| Run lock prevents overlap | Passed | `scheduler.test.ts` and `sync-runner.test.ts` lock tests |
| Stale locks can be recovered intentionally | Passed | `scheduler.test.ts` stale recovery test |
| Caps are enforced before writes | Passed | `sync-runner.test.ts` cap-before-write test |
| Crash windows are retry-safe | Partially passed | Retry after import-before-checkpoint crash is idempotent; process-death fault injection remains future hardening |
| Exit codes are documented | Passed | `scheduler.ts` and this report |
| Dry-run/apply reports are redacted | Passed for helper-level report shapes | `scheduler.test.ts` report sanitization test |
| No real cron is installed | Passed | No cron file or node-cron registration added |

## Remaining Gaps

This spike is not production cron approval.

Remaining before production scheduling:

1. Live Recall enumeration must pass SPIKE-013.
2. Live content fidelity must pass SPIKE-014.
3. A real CLI wrapper, likely `scripts/sync-recall.ts`, must be added after the live API contract is known.
4. The fake-client runner must be connected to a real Recall REST client only after the API shape is validated.
5. Process-death fault injection around exact write boundaries should be added before broad apply mode.
6. First-run caps and manual approval thresholds need final values from production data expectations.
7. Deployment operability still needs SPIKE-020.

## Implementation Recommendation

Proceed with a CLI-first design, not in-process cron-first.

Recommended shape:

```text
scripts/sync-recall.ts --dry-run
scripts/sync-recall.ts --apply
```

The CLI should:

- require `RECALL_API_KEY`;
- default to `--dry-run`;
- acquire `lock:recall_sync`;
- compute a checkpoint window with overlap;
- list Recall cards;
- fetch details with `max_chunks=50`;
- evaluate caps before writes;
- import through the mapper/importer path;
- advance checkpoint only after full apply success;
- write a redacted run report;
- exit with the stable codes documented above.

System cron may call the CLI only after SPIKE-013, SPIKE-014, and SPIKE-020 pass.

## Tracker Update

Recommended project-tracker change:

- `RDS-015` -> `Done - offline scheduler/checkpoint primitives implemented`
- `M9` remains `Pending` because deployment operability and optional weak-item upgrade are not complete.

## Final Verdict

SPIKE-018 clears the local scheduler/checkpoint design risk enough to include CLI-first scheduling in a later implementation plan. It does not clear production cron enablement because live enumeration, live content fidelity, and deployment runbook gates remain blocked or pending.
