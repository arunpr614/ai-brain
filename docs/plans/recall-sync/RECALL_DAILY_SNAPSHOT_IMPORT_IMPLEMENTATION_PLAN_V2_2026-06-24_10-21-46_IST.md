# Recall Daily Snapshot Import - Implementation Plan V2

Created: 2026-06-24 10:21 IST
Author: Codex
Status: Revised v2 after adversarial review; production apply/cron blocked
Source PRD: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
V1 plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_2026-06-24_10-18-50_IST.md`
Adversarial review: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-06-24_10-20-22_IST.md`
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Executive Summary

Implement Recall daily snapshot import as a CLI-first, REST-backed, one-way import from Recall into AI Brain. Production import is blocked until live Recall API gates pass. V2 tightens the plan around the main execution risks from review:

- live API testing gets a safe operating packet;
- cap/page detection is mandatory;
- V1 retrieval policy is retrieval-gated for unverified/truncated content;
- production CLI packaging uses a bundled JS artifact, not `tsx`;
- persistent run-report redaction is tested;
- production migration/schema smoke is required before CLI dry-run;
- first apply requires backup integrity/restore proof;
- cap defaults are concrete;
- implementation tasks trace to PRD requirements.

## Current Starting Point

Offline foundation already exists and is validated:

- `src/db/migrations/020_recall_sync.sql`
- `src/db/recall-sync.ts`
- `src/lib/recall/mapper.ts`
- `src/lib/recall/importer.ts`
- `src/lib/recall/scheduler.ts`
- `src/lib/recall/sync-runner.ts`
- `src/lib/security/redaction.ts`
- `scripts/spikes/recall-rest-enumeration.ts`

Existing validation:

```text
node --import tsx --test src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/lib/repair/item-repair.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/capture/quality.test.ts src/lib/security/redaction.test.ts
npm run typecheck
```

## Non-Negotiable No-Go Gates

Block production apply and cron if any are false:

1. Live API operating packet approved by Arun.
2. Controlled live API enumeration discovers 100% of approved sample cards.
3. Live probe reports total-count/result-count/page-cap behavior; no unexplained mismatch.
4. Content fidelity is classified for note, article, YouTube, PDF, and long/truncation candidate.
5. Dry-run output and `recall_sync_runs.report_json` redact secrets, full private content, signed URL secrets, cookies, and stacks.
6. Production schema smoke proves Recall tables and `capture_source='recall'` are available.
7. Production CLI bundle runs on Hetzner without `tsx`, TypeScript source, or dev dependencies.
8. First apply backup passes integrity or restore proof.
9. First apply cap is explicitly set and reviewed.
10. `possibly_truncated`, `metadata_only`, and `api_chunks_unverified` are retrieval-gated by default.
11. Weak-item upgrade remains disabled unless separately approved.

## Phase 0 - Baseline And Secret Hygiene

| ID | PRD Req | Task | Files | Exit Criteria |
|---|---|---|---|---|
| IMP-001 | P0 privacy | Capture Recall-owned `git status --short` | N/A | Status recorded in QA note |
| IMP-002 | P0 privacy | Secret scan tracked files for Recall keys/tokens | repo tracked files | No `sk_`/Bearer/API-key leak |
| IMP-003 | P0 baseline | Run focused Recall tests and typecheck | test files | Pass |

Validation:

```text
git status --short -- docs/research/recall-sync docs/plans/recall-sync docs/plans/spikes/SPIKE-0*recall* src/lib/recall src/db/recall-sync.ts src/db/migrations/020_recall_sync.sql scripts/spikes/recall-rest-enumeration.ts
git grep -nE 'RECALL_API_KEY=|Authorization: Bearer|sk_[A-Za-z0-9]' -- ':!*.md' ':!package-lock.json'
node --import tsx --test src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/sync-runner.test.ts src/lib/security/redaction.test.ts src/db/migrations/020_recall_sync.test.ts
npm run typecheck
```

## Phase 1 - Live Recall Spike Operating Packet

Create before any live API call:

```text
docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_<timestamp>_IST.md
```

The packet must define:

- approved API-key injection method;
- no-chat/no-git/no-shell-history key rule;
- ignored private evidence path, e.g. `data/private/recall-live-spikes/`;
- redacted public report path under `docs/plans/spikes/`;
- command templates;
- exact controlled card checklist;
- what may appear in redacted reports;
- cleanup and key rotation instructions.

Recommended key method:

```text
set +o history
export RECALL_API_KEY='<paste key locally, never in chat>'
set -o history
```

Preferred safer method if available:

```text
source data/private/recall-live-spikes/recall.env
```

`data/private/` must be gitignored before use.

## Phase 2 - Live API Gate Spikes

### SPIKE-013 - Mandatory Enumeration

Use or extend:

```text
scripts/spikes/recall-rest-enumeration.ts
```

Controlled card set:

1. short note with unique sentinel;
2. web article with source URL;
3. YouTube/video card;
4. PDF card;
5. long/truncation candidate likely to hit `max_chunks=50`.

Mandatory probe behavior:

- narrow date window with explicit overlap;
- wider date window to detect result caps;
- `total_count` versus returned result count;
- no silent pagination assumptions;
- redacted title/source URL handling;
- no raw chunks in public report.

Pass:

- 100% controlled-card discovery;
- no unexplained date-window miss;
- no unexplained `total_count`/returned-count mismatch.

### SPIKE-014 - Mandatory Content Fidelity

Use a new or extended script:

```text
scripts/spikes/recall-content-fidelity.ts
```

Pass:

- every controlled sample gets fidelity state;
- exactly 50 chunks classified `possibly_truncated`;
- note/article/YouTube/PDF/long cases each have import/Ask/Search policy;
- report is redacted by default.

Required reports:

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md`

## Phase 3 - Recall REST Client

Proposed files:

- `src/lib/recall/client.ts`
- `src/lib/recall/client.test.ts`

Contract:

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

Requirements:

- default base URL `https://backend.getrecall.ai/api/v1`;
- send bearer auth;
- encode `date_from` and `date_to`;
- reject malformed responses;
- classify 401/403, 422, 429, 5xx;
- redact request details and API key in thrown errors;
- no full response body logging.

Tests:

- auth header sent;
- date filters encoded;
- status classification;
- malformed list/detail response rejected;
- max chunks encoded;
- redaction on thrown error.

## Phase 4 - Fidelity Policy And Retrieval Gate

Proposed files:

- `src/lib/recall/fidelity.ts`
- `src/lib/recall/fidelity.test.ts`

V1 decision: retrieval-gated by default.

| Fidelity state | Import policy | Ask/Search policy |
|---|---|---|
| `complete_enough_for_daily_import` | import | eligible |
| `api_chunks_unverified` | import after live sample review | exclude from Ask/Search until warning UI exists |
| `possibly_truncated` | block by default; import only with explicit approval | exclude from Ask/Search |
| `metadata_only` | block by default | exclude |
| `blocked_unknown` | block | exclude |

Implementation:

- Add helper returning `{ shouldImport, shouldIndexForRetrieval, reason }`.
- Existing mapper may still calculate raw fidelity.
- Importer/runner must apply policy before creating items.
- Retrieval/search exclusion can be implemented by not enqueueing embedding jobs for gated imports or by filtering retrieval. V2 implementation should prefer the least invasive route that can be tested.

## Phase 5 - Durable Redacted Run Reporting

Extend:

- `src/db/recall-sync.ts`
- new `src/db/recall-sync.test.ts` or focused `src/lib/recall/run-report.test.ts`

Helpers:

- `createRecallSyncRun()`
- `completeRecallSyncRun()`
- `failRecallSyncRun()`
- `listRecentRecallSyncRuns()`

Mandatory redaction test:

Input report contains:

- fake `RECALL_API_KEY`;
- `Authorization: Bearer ...`;
- signed URL query values;
- cookie;
- full title;
- full chunk;
- stack trace.

Stored `report_json` must contain none of those raw values.

## Phase 6 - Production CLI Packaging

V2 chooses bundled CLI.

Proposed files:

- `scripts/sync-recall.ts` - TypeScript source for CLI.
- `scripts/build-recall-cli.mjs` - bundles CLI for production.
- `scripts/dist/sync-recall-prod.mjs` - generated production artifact, or generated during build and copied during deploy.
- `scripts/sync-recall-prod.mjs` - only if this is the generated/copied artifact location.

Tooling:

- Add `esbuild` as a dev dependency or use an equivalent bundler already approved during implementation.
- Bundle TypeScript source and path aliases.
- Externalize native/runtime packages:
  - `better-sqlite3`
  - `sqlite-vec`
  - any Next/native package that must resolve from production `node_modules`.

Package scripts:

```json
{
  "scripts": {
    "build:recall-cli": "node scripts/build-recall-cli.mjs",
    "smoke:recall-cli:bundle": "node scripts/smoke-recall-cli-bundle.mjs"
  }
}
```

Bundle smoke:

- create temp deploy-like directory with no `src/`;
- copy bundled CLI;
- run `node sync-recall-prod.mjs --help`;
- run no-key dry-run and assert config error is redacted;
- if using test DB/env, run dry-run with fake client path if supported.

Deploy update:

- `scripts/deploy.sh` runs or verifies `npm run build:recall-cli`;
- copies bundled artifact to `/opt/brain/scripts/sync-recall-prod.mjs`;
- remote smoke checks file existence before any cron setup.

## Phase 7 - Dry-Run And Apply CLI Behavior

CLI flags:

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
- `--recover-stale-lock` explicit only

Initial defaults:

| Setting | First dry-run | First apply | Steady apply after approval |
|---|---:|---:|---:|
| `maxCards` | 20 | 20 | 100 |
| `maxImports` | 0 | 5 | 20 |
| `maxChunksPerCard` | 50 | 50 | 50 |
| `maxTotalChunks` | 250 | 250 | 1,000 |
| `maxTotalChars` | 250,000 | 250,000 | 1,000,000 |
| concurrency | 1 | 1 | 1 until proven safe |

Apply requirements:

- `BRAIN_RECALL_SYNC_ENABLED=1` required unless local test override.
- Acquire lock.
- Create run record.
- Enforce caps before writes.
- Import only eligible cards.
- Record blocked cards.
- Do not advance checkpoint on partial failure.
- Return stable exit codes.
- Weak upgrade off unless explicitly enabled.

## Phase 8 - Production Schema, Backup, Dry-Run, First Apply

Production schema smoke before Recall CLI:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('recall_sync_items','recall_sync_runs','recall_sync_state');
```

Recall capture source smoke:

```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='items';
```

Confirm `capture_source` CHECK includes `recall` before apply.

Backup proof:

```text
sqlite3 /path/to/backup.sqlite 'PRAGMA integrity_check;'
```

Preferred restore proof:

```text
scripts/restore-from-backup.sh <backup> <temp-db-path>
sqlite3 <temp-db-path> 'PRAGMA integrity_check;'
```

First apply checklist:

1. Production schema smoke passed.
2. Fresh backup created.
3. Backup integrity/restore proof passed.
4. Dry-run report reviewed.
5. Cap set to approved small number.
6. Rollback command documented.
7. Apply run report saved.
8. Imported item IDs inspected.
9. Enrichment/embedding queue health checked.

## Phase 9 - Production Runbook And Scheduling

Create:

```text
docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_<timestamp>_IST.md
```

Required sections:

- env vars and secret handling;
- schema smoke;
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

Scheduling:

- system cron or systemd timer only;
- no in-process Next cron for V1;
- default disabled:

```text
BRAIN_RECALL_SYNC_ENABLED=0
```

Enable only after live gates, production dry-run, first apply, and runbook review.

## Phase 10 - QA Matrix

Automated:

```text
node --import tsx --test \
  src/lib/recall/client.test.ts \
  src/lib/recall/fidelity.test.ts \
  src/lib/recall/importer.test.ts \
  src/lib/recall/scheduler.test.ts \
  src/lib/recall/sync-runner.test.ts \
  src/lib/security/redaction.test.ts \
  src/db/migrations/020_recall_sync.test.ts

npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run typecheck
npm test
npm run build
```

Manual/live:

- SPIKE-013 controlled enumeration.
- SPIKE-014 controlled fidelity.
- Production schema smoke.
- Production dry-run with no writes.
- First apply with cap.
- Library/item detail inspection for imported Recall item.
- Ask/Search exclusion for retrieval-gated fidelity states.
- Secret scan of logs and run report.

## Traceability Matrix

| PRD Requirement | Implementation Tasks |
|---|---|
| Live enumeration proof | Phase 1, Phase 2 |
| Content-fidelity decisions | Phase 2, Phase 4 |
| Dry-run before writes | Phase 5, Phase 7 |
| Import idempotency | Existing importer + Phase 7 apply |
| Recall provenance | Existing mapper/importer + Phase 8 validation |
| Stop safely on partial failures | Existing scheduler + Phase 7 |
| Privacy/redaction | Phase 1, Phase 5, Phase 10 |
| First apply backup/rollback | Phase 8, Phase 9 |
| Production command runs on Hetzner | Phase 6, Phase 8 |
| Weak upgrade disabled by default | Existing importer + Phase 7 |
| Skip/block taxonomy | Phase 5, Phase 7 |

## Task Tracker

| ID | Phase | Task | Status |
|---|---|---|---|
| IMP-001 | 0 | Baseline and secret scan | Pending |
| IMP-002 | 1 | Create live API operating packet | Pending |
| IMP-003 | 2 | Run SPIKE-013 live REST enumeration | Blocked pending user approval |
| IMP-004 | 2 | Run SPIKE-014 live content fidelity | Blocked pending user approval |
| IMP-005 | 3 | Build Recall REST client | Pending after live gates |
| IMP-006 | 4 | Build fidelity policy helper and retrieval gate | Pending |
| IMP-007 | 5 | Add durable run reporting helpers/tests | Pending |
| IMP-008 | 6 | Build bundled production CLI | Pending |
| IMP-009 | 6 | Add CLI bundle smoke and deploy copy | Pending |
| IMP-010 | 7 | Implement dry-run/apply CLI behavior | Pending |
| IMP-011 | 8 | Add production schema and backup checks | Pending |
| IMP-012 | 9 | Create production runbook | Pending |
| IMP-013 | 9 | Enable disabled-by-default scheduler | Pending after apply validation |
| IMP-014 | 10 | Run local QA matrix | Pending |
| IMP-015 | 10 | Run production dry-run and first apply | Pending after approval |

## Open Decisions

| Decision | Owner | Default |
|---|---|---|
| API-key handling mechanism for live spikes | Arun | Do not proceed without approval |
| Whether live reports may show private titles/source URLs | Arun | Redact by default |
| Whether metadata-only Recall cards should be imported | Arun | Block by default |
| Whether weak upgrades can ever run automatically | Arun | Disabled by default |
| Whether to use cron or systemd timer | Codex + Arun | Systemd timer preferred if implementation complexity is reasonable |

## V2 Plan Verdict

This plan is ready to guide implementation planning and local-only scaffolding. Production Recall API work remains blocked until Arun approves API-key handling and controlled sample-card reporting. Production apply and scheduling remain blocked until every no-go gate above is satisfied.
