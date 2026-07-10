# Recall Daily Snapshot Import - Implementation Plan V1

Created: 2026-06-24 10:18 IST
Author: Codex
Status: Draft v1 for adversarial review; production apply/cron blocked
Source PRD: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
Recommended option: REST API daily pull with dry-run-first apply
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Executive Summary

Implement Recall daily snapshot import as a CLI-first, REST-backed, one-way import from Recall into AI Brain. The implementation must start with live validation gates, not production import. V1 production apply is blocked until controlled live Recall cards prove enumeration completeness and content fidelity.

The implementation should reuse the offline foundation already built:

- `src/db/migrations/020_recall_sync.sql`
- `src/db/recall-sync.ts`
- `src/lib/recall/mapper.ts`
- `src/lib/recall/importer.ts`
- `src/lib/recall/scheduler.ts`
- `src/lib/recall/sync-runner.ts`
- `src/lib/security/redaction.ts`
- `scripts/spikes/recall-rest-enumeration.ts`

New implementation work centers on:

1. live REST client validation;
2. production-safe Recall REST client;
3. production-packaged CLI;
4. durable run reporting;
5. dry-run/apply commands;
6. first-apply runbook;
7. disabled-by-default scheduler configuration;
8. QA and deployment gates.

## Non-Negotiable No-Go Gates

Block production apply and cron if any of these are false:

1. Controlled live API enumeration discovers 100% of approved sample cards.
2. Content fidelity is classified for note, article, YouTube, PDF, and long/truncation candidate.
3. Dry-run and `recall_sync_runs.report_json` redact secrets, full private content, and signed URL secrets.
4. Production CLI runs on Hetzner without `tsx`, TypeScript source, or dev dependencies.
5. First apply backup and rollback path are documented and verified.
6. First apply cap is explicitly set and reviewed.
7. `possibly_truncated`, `metadata_only`, and `api_chunks_unverified` handling is implemented according to PRD v2.
8. Weak-item upgrade remains disabled unless separately approved.

## Phase 0 - Baseline And Branch Hygiene

### Goal

Confirm current project state and avoid sweeping unrelated dirty files into the Recall workstream.

### Tasks

| ID | Task | Primary Files | Exit Criteria |
|---|---|---|---|
| P0.1 | Capture `git status --short` for Recall-owned files | N/A | Status recorded in QA note |
| P0.2 | Confirm no existing Recall API key is in tracked files | `.env*`, docs, scripts | Secret scan passes |
| P0.3 | Run current focused Recall tests | Recall test files | Tests pass before new live-client changes |
| P0.4 | Confirm migration 020 is applied in isolated DB tests | `src/db/migrations/020_recall_sync.test.ts` | Test pass |

### Validation

```text
node --import tsx --test \
  src/lib/recall/importer.test.ts \
  src/lib/recall/scheduler.test.ts \
  src/lib/recall/sync-runner.test.ts \
  src/lib/repair/item-repair.test.ts \
  src/db/migrations/020_recall_sync.test.ts \
  src/lib/capture/quality.test.ts \
  src/lib/security/redaction.test.ts

npm run typecheck
```

## Phase 1 - Live API Gate Spikes

### Goal

Prove Recall REST enumeration and content fidelity before implementing production apply.

### Tasks

| ID | Task | Primary Files | Exit Criteria |
|---|---|---|---|
| P1.1 | Agree API-key handling mechanism | User + local env | User-approved mechanism exists; no key in git |
| P1.2 | Create controlled Recall sample-card checklist | New private evidence file, untracked or redacted | Five sample classes recorded privately |
| P1.3 | Run SPIKE-013 REST enumeration | `scripts/spikes/recall-rest-enumeration.ts` | 100% controlled-card discovery |
| P1.4 | Extend probe for page/cap/date mismatch detection if needed | `scripts/spikes/recall-rest-enumeration.ts` | Detects unexplained `total_count`/result mismatch |
| P1.5 | Run SPIKE-014 content fidelity probe | New or extended spike script | Fidelity matrix populated |
| P1.6 | Create dated SPIKE-013 and SPIKE-014 reports | `docs/plans/spikes/` | Reports include redacted evidence and verdict |

### Controlled Card Set

Use at least:

1. short note with unique sentinel;
2. web article with source URL;
3. YouTube/video card;
4. PDF card;
5. long/truncation candidate likely to hit `max_chunks=50`.

### Exit Criteria

- Every controlled card appears in the expected date window.
- Any miss blocks REST daily pull.
- Any unexplained result cap or pagination gap blocks REST daily pull.
- Each sample receives a fidelity state and import/Ask/Search policy.

## Phase 2 - Recall REST Client

### Goal

Create a reusable, tested Recall REST client for production CLI use.

### Proposed Files

- `src/lib/recall/client.ts`
- `src/lib/recall/client.test.ts`

### API Contract

```ts
export interface RecallRestClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface RecallRestClient {
  listCards(window: { dateFrom: string; dateTo: string }): Promise<RecallCardPreview[]>;
  getCardDetail(cardId: string, options: { maxChunks: number }): Promise<RecallCardDetail>;
}
```

### Requirements

- Default base URL: `https://backend.getrecall.ai/api/v1`.
- Authenticate with `Authorization: Bearer <key>`.
- Support `date_from` and `date_to`.
- Detect non-2xx responses and classify:
  - 401/403 -> auth failure;
  - 422 -> config/validation error;
  - 429 -> rate-limited;
  - 5xx -> retryable/unexpected.
- Redact API key and request URLs in errors.
- Do not log full response bodies.
- Validate response shape defensively.

### Tests

- Auth header is sent.
- Date filters are encoded.
- 401 maps to auth failure.
- 422 maps to config/validation failure.
- 429 maps to rate limit.
- Malformed response is blocked with redacted error.
- Detail endpoint honors `max_chunks=50`.

## Phase 3 - Content Fidelity Policy

### Goal

Make fidelity classification executable, not just documented.

### Proposed Files

- `src/lib/recall/fidelity.ts`
- `src/lib/recall/fidelity.test.ts`

### Requirements

Implement policy from PRD v2:

| Fidelity state | V1 import policy | Ask/Search policy |
|---|---|---|
| `complete_enough_for_daily_import` | import | eligible |
| `api_chunks_unverified` | import only after live sample review | warning-visible or retrieval-gated |
| `possibly_truncated` | block by default or import with explicit approval | exclude unless warning-visible |
| `metadata_only` | block by default | not eligible |
| `blocked_unknown` | block | not eligible |

### Implementation Notes

- Existing `inferContentFidelity()` can remain mapper-level, but the new policy helper should decide importability and retrieval eligibility.
- Do not rely only on chunk count for long content. Include source type/platform when available.
- The implementation plan v2 should choose whether `api_chunks_unverified` is allowed into Ask/Search initially or excluded until visible warnings exist.

## Phase 4 - Run Reporting Persistence

### Goal

Use `recall_sync_runs` for durable, redacted run records.

### Proposed Files

- Extend `src/db/recall-sync.ts`
- Add `src/db/recall-sync.test.ts` or extend existing migration tests

### Requirements

Add helpers:

- `createRecallSyncRun()`
- `completeRecallSyncRun()`
- `failRecallSyncRun()`
- `listRecentRecallSyncRuns()`

Stored `report_json` must contain:

- run mode;
- window;
- counts;
- statuses;
- fidelity states;
- cap decisions;
- redacted item/card identifiers;
- exit code;
- last error redacted.

Stored `report_json` must not contain:

- API key;
- bearer header;
- full chunks;
- raw API responses;
- cookies;
- signed URL secret query values;
- full private titles unless user explicitly approves.

## Phase 5 - Production CLI

### Goal

Expose dry-run/apply as production-safe commands.

### Proposed Files

- `scripts/sync-recall-prod.mjs`
- Optional build source: `scripts/sync-recall.ts` if bundled into prod JS
- `scripts/deploy.sh` update to copy the CLI

### CLI Contract

```text
node scripts/sync-recall-prod.mjs --dry-run
node scripts/sync-recall-prod.mjs --apply --max-imports 5
```

Supported flags:

- `--dry-run`
- `--apply`
- `--date-from`
- `--date-to`
- `--max-cards`
- `--max-imports`
- `--max-total-chars`
- `--max-total-chunks`
- `--max-chunks-per-card`
- `--allow-weak-upgrade-by-url` default false
- `--json`
- `--output`

Environment variables:

- `RECALL_API_KEY`
- `RECALL_API_BASE_URL`
- `BRAIN_RECALL_SYNC_ENABLED`
- `BRAIN_RECALL_SYNC_MAX_CARDS`
- `BRAIN_RECALL_SYNC_MAX_IMPORTS`
- `BRAIN_RECALL_SYNC_MAX_CHARS`
- `BRAIN_RECALL_SYNC_MAX_CHUNKS`
- `BRAIN_RECALL_SYNC_FIRST_RUN_LOOKBACK_HOURS`
- `BRAIN_RECALL_SYNC_OVERLAP_MINUTES`
- `BRAIN_RECALL_SYNC_LOG_PATH`

### Production Packaging Requirement

The CLI must run on Hetzner without dev dependencies:

```text
ssh brain 'test -f /opt/brain/scripts/sync-recall-prod.mjs'
ssh brain "cd /opt/brain && sudo -u brain bash -lc 'set -a; source /etc/brain/.env; set +a; node scripts/sync-recall-prod.mjs --dry-run --max-cards 20 --max-imports 0'"
```

## Phase 6 - Apply Mode

### Goal

Permit capped manual import only after live gates and dry-run pass.

### Requirements

- `--apply` refuses to run if `BRAIN_RECALL_SYNC_ENABLED` is not enabled, unless an explicit local override is provided for test.
- Apply mode enforces caps before writes.
- Apply mode acquires sync lock.
- Apply mode records run start/end.
- Apply mode imports only eligible cards.
- Apply mode records blocked cards without creating items.
- Apply mode advances checkpoint only after successful apply.
- Apply mode returns documented exit codes.
- Weak upgrade is off unless explicitly passed.

### First Apply Checklist

1. Fresh DB backup.
2. Backup integrity or restore path verified.
3. Dry-run report reviewed.
4. Cap set to approved small number.
5. Rollback command documented.
6. Apply run report saved.
7. Imported item IDs inspected.
8. Enrichment/embedding queue health checked.

## Phase 7 - UI / Retrieval Treatment

### Goal

Avoid overtrusting partial Recall snapshots.

### Options

Option 1 - Warning-visible:

- show `api_chunks_unverified` and `possibly_truncated` in item detail;
- show fidelity in Ask source metadata;
- allow retrieval with visible warning.

Option 2 - Retrieval-gated:

- import items but exclude `possibly_truncated` and `metadata_only` from Ask/Search until repaired;
- simpler but may reduce usefulness.

### Required V2 Plan Decision

The implementation plan v2 must choose one. Do not silently index unverified/truncated content as ordinary full text.

## Phase 8 - Production Runbook And Scheduling

### Goal

Enable daily scheduling only after manual dry-run/apply success.

### Required Document

Create:

```text
docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_<timestamp>_IST.md
```

Required sections:

- environment variables;
- dry-run command;
- first apply command;
- backup and rollback;
- log locations;
- redaction checks;
- scheduler disable/enable;
- health checks;
- imported item validation;
- checkpoint inspection;
- incident rollback.

### Scheduling

Prefer system cron or systemd timer, not in-process Next cron, for V1.

Initial schedule remains disabled:

```text
BRAIN_RECALL_SYNC_ENABLED=0
```

Enable only after:

- live gates pass;
- production dry-run passes;
- first apply passes;
- runbook is reviewed.

## Phase 9 - QA Matrix

### Automated Tests

Run:

```text
node --import tsx --test \
  src/lib/recall/client.test.ts \
  src/lib/recall/fidelity.test.ts \
  src/lib/recall/importer.test.ts \
  src/lib/recall/scheduler.test.ts \
  src/lib/recall/sync-runner.test.ts \
  src/lib/security/redaction.test.ts \
  src/db/migrations/020_recall_sync.test.ts

npm run typecheck
npm test
npm run build
```

### Manual / Live Tests

- SPIKE-013 controlled enumeration.
- SPIKE-014 controlled fidelity.
- Production dry-run with no writes.
- First apply with cap.
- Library/item detail inspection for imported Recall item.
- Ask/Search behavior according to selected fidelity policy.
- Secret scan of logs and run report.

## Task Tracker

| ID | Phase | Task | Status |
|---|---|---|---|
| IMP-001 | Phase 0 | Baseline and secret scan | Pending |
| IMP-002 | Phase 1 | User-approved API-key setup | Blocked |
| IMP-003 | Phase 1 | SPIKE-013 live REST enumeration | Blocked |
| IMP-004 | Phase 1 | SPIKE-014 live content fidelity | Blocked |
| IMP-005 | Phase 2 | Build Recall REST client | Pending |
| IMP-006 | Phase 3 | Build fidelity policy helper | Pending |
| IMP-007 | Phase 4 | Add durable run reporting helpers | Pending |
| IMP-008 | Phase 5 | Build production-safe CLI | Pending |
| IMP-009 | Phase 5 | Update deploy packaging | Pending |
| IMP-010 | Phase 6 | Implement guarded apply mode | Pending |
| IMP-011 | Phase 7 | Decide and implement fidelity UI/retrieval behavior | Pending |
| IMP-012 | Phase 8 | Create production runbook | Pending |
| IMP-013 | Phase 8 | Enable disabled-by-default scheduler | Pending |
| IMP-014 | Phase 9 | Run local QA matrix | Pending |
| IMP-015 | Phase 9 | Run production dry-run and first apply | Pending |

## Implementation Order

1. Run live API gates after user approval.
2. Revise implementation plan v2 based on adversarial review and live gate outcomes.
3. Implement REST client and fidelity policy.
4. Implement run reporting.
5. Implement production CLI and deploy packaging.
6. Run local QA.
7. Run production dry-run.
8. Run capped manual apply.
9. Review imported items and queue health.
10. Enable scheduled job only after approval.

## Open Decisions

| Decision | Owner | Default |
|---|---|---|
| API-key handling mechanism for live spikes | Arun | Do not proceed without approval |
| Whether live reports may show private titles/source URLs | Arun | Redact by default |
| Fidelity treatment for `api_chunks_unverified` in Ask/Search | Arun + Codex | Warning-visible or retrieval-gated required |
| Whether metadata-only Recall cards should be imported | Arun | Block by default |
| Whether weak upgrades can ever run automatically | Arun | Disabled by default |

## V1 Plan Verdict

This implementation is feasible, but production work must be gate-first. The next step is adversarial review of this plan, then implementation plan v2. Actual coding beyond offline foundations should start with live API validation and a production CLI packaging design, not cron or apply mode.
