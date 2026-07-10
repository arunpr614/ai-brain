# Recall Daily Snapshot Import Implementation Plan V1 - Adversarial Review

**Created:** 2026-06-24 10:20:22 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_2026-06-24_10-18-50_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-06-24_10-20-22_IST.md`

## Executive Verdict

Conditional no-go for execution.

The plan is directionally safe because it keeps production apply and cron blocked, but it is still too abstract in places that matter most for successful execution. The biggest gaps are the production CLI packaging strategy, live test operating packet, fidelity retrieval decision, run-report privacy validation, and production migration/deploy sequencing. Create implementation plan v2 before coding the production path.

## Evidence Inspected

- Target plan:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_2026-06-24_10-18-50_IST.md`
- Source PRD:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
- Final options:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_2026-06-24_10-09-20_IST.md`
- Plan line-number inspection via `nl -ba`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found for planning-only status. The plan blocks production apply/cron and does not authorize mutation.

### P1 - High Risk

#### 1. Production CLI packaging is still a placeholder, not an implementation strategy

**Evidence:** The plan says proposed files include `scripts/sync-recall-prod.mjs` and an optional TypeScript source if bundled (`RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_2026-06-24_10-18-50_IST.md:240-244`). It requires a remote file check and dry-run (`:281-288`), but it does not decide how a JS script will access app DB helpers without the TypeScript source tree or dev dependencies.

**Why it matters:** SPIKE-020 already identified packaging as a production blocker. A `.mjs` file that imports `@/db/client` or TypeScript modules will fail on Hetzner unless it is bundled or standalone-compatible.

**Failure mode:** Implementation creates `scripts/sync-recall-prod.mjs`, deploy copies it, but it imports unavailable source modules or path aliases. Local tests pass; production cron fails.

**Recommendation:** V2 must choose one packaging strategy:

- bundle CLI with `esbuild`/`tsup` into a standalone JS file with path aliases resolved; or
- add Recall CLI code inside the Next standalone server bundle and expose a Node entry point; or
- implement a pure production `.mjs` using only deployed runtime modules and direct SQL helpers.

Also add a local packaging test that executes the bundled artifact from a temp directory without `src/`.

#### 2. Live API gate execution lacks a safe operating packet

**Evidence:** Phase 1 says agree API-key handling and create a controlled sample-card checklist (`:87-94`), but does not specify where the key is stored, what command format avoids shell history leaks, how the private expected-card file is named/ignored, or what the operator can report back.

**Why it matters:** The live spikes are the next concrete step and involve private Recall data plus an API key. Without an operating packet, the user may provide a key in chat or a future agent may write private evidence into tracked docs.

**Failure mode:** API key lands in shell history, chat, or a tracked report; controlled card titles are committed; live evidence becomes unsafe to share.

**Recommendation:** V2 must add a `LIVE_RECALL_SPIKE_OPERATING_PACKET` artifact before running live spikes. It should define:

- approved key injection method;
- no-chat/no-git key rule;
- ignored private evidence path;
- redacted public report path;
- exact command template;
- cleanup/rotation instructions.

#### 3. Fidelity treatment remains a plan decision even though it blocks code shape

**Evidence:** Phase 7 leaves "Warning-visible" vs "Retrieval-gated" as options and says plan v2 must choose one (`:319-340`). Earlier phases still proceed to client/run reporting/CLI as if importability can be implemented independently.

**Why it matters:** The choice affects schema fields, importer policy, Ask retrieval filters, search indexing, UI labels, and tests. Kicking it to v2 is acceptable, but coding before choosing would create rework.

**Failure mode:** Implementation imports `api_chunks_unverified` or `possibly_truncated` into normal search/Ask because the retrieval decision was deferred.

**Recommendation:** V2 must choose retrieval-gated for V1 unless explicit UI warning work is added. This is the safer default and reduces scope.

#### 4. Run-report privacy validation is underspecified

**Evidence:** Phase 4 lists fields that `report_json` must and must not contain (`:212-232`), but Phase 9 only says "Secret scan of logs and run report" (`:408-416`). It does not define automated tests or scan patterns for persistent JSON.

**Why it matters:** Privacy failures often happen in the persistence layer after stdout redaction passes.

**Failure mode:** `sanitizeRecallSyncReport()` redacts console output, but `completeRecallSyncRun()` stores an unsanitized report in SQLite.

**Recommendation:** V2 must require tests that insert a report containing an API key, bearer header, signed URL, full title, full chunk, cookie, and stack trace, then assert stored `report_json` is redacted.

### P2 - Medium Risk

#### 1. Production migration/deploy sequencing is missing

**Evidence:** The plan reuses migration 020 (`:16`) and references production CLI deploy (`:240-288`), but does not define how production migration 020 is applied, verified, or rolled back before first dry-run/apply.

**Why it matters:** The CLI depends on `recall_sync_*` tables and `capture_source='recall'`. If production DB is not migrated, dry-run/apply may fail or partial writes may break.

**Failure mode:** Production CLI runs against an older DB schema and crashes when writing run records or importing Recall items.

**Recommendation:** Add a deploy sequence:

- deploy app/migration first;
- verify `recall_sync_items`, `recall_sync_runs`, `recall_sync_state` exist;
- verify `items.capture_source` accepts `recall`;
- only then run Recall CLI dry-run/apply.

#### 2. Live enumeration needs page/cap strategy before not after failure

**Evidence:** P1.4 says "Extend probe for page/cap/date mismatch detection if needed" (`:92`). The old empirical risk is exactly a cap/pagination issue.

**Why it matters:** Treating cap detection as optional may reproduce the original blind spot.

**Failure mode:** The live probe observes a result set that includes controlled cards but misses older/larger-window cards; the plan declares success too early.

**Recommendation:** Make page/cap detection mandatory in v2. The probe must compare `total_count` to result count, test a deliberately wider window, and report whether pagination exists or is absent.

#### 3. First-apply backup verification is too loose

**Evidence:** First apply checklist says "Backup integrity or restore path verified" (`:310-312`) but does not define the acceptable proof.

**Why it matters:** A backup that exists but cannot be restored is false comfort.

**Failure mode:** Apply corrupts or pollutes DB; backup exists but restore command fails under pressure.

**Recommendation:** Require at minimum `sqlite3 <backup> 'PRAGMA integrity_check;'` and a documented restore command. Prefer restore-test to a temp path if feasible.

#### 4. Cost/queue caps lack starting values

**Evidence:** The CLI flags include caps (`:253-279`), but only `max-imports 5` is mentioned in examples (`:246-250`). No defaults are specified for cards, chars, chunks, retries, or concurrency.

**Why it matters:** Defaults are operational policy. Missing defaults cause each operator to improvise.

**Failure mode:** First dry-run or apply fetches too much content or enqueues too many enrichment jobs.

**Recommendation:** V2 should set conservative initial defaults:

- max cards seen: 20;
- max imports: 5 for first apply, 20 for steady state after approval;
- max chunks per card: 50;
- max total chunks: 250 for first apply;
- max total chars: explicit conservative threshold;
- concurrency: 1 for apply until proven.

### P3 - Low Risk Or Polish

#### 1. Task tracker does not map implementation tasks back to PRD requirement IDs

**Evidence:** IMP task table is useful (`:418-436`) but does not reference PRD P0/P1 rows.

**Why it matters:** Traceability matters in this project because the user requested PM/project-management discipline.

**Failure mode:** A future agent implements IMP tasks but misses a PRD P0 acceptance condition.

**Recommendation:** Add a requirement mapping column or a separate traceability matrix in v2.

## What The Original Plan Or Work Gets Wrong

- It still treats production packaging as a file name instead of a bundling/dependency strategy.
- It under-specifies the most sensitive next action: live API testing with private data and API credentials.
- It postpones fidelity retrieval behavior even though that choice changes implementation.
- It does not make cap/pagination detection mandatory despite that being the central historical risk.

## Missing Validation

- Bundled CLI artifact runs without `src/` or dev dependencies.
- API key handling and private evidence path are tested for no git leakage.
- Mandatory pagination/cap detection in live probe.
- Persistent run-report redaction unit tests.
- Production schema/migration smoke before CLI run.
- Backup integrity or restore test before first apply.
- Ask/Search exclusion or warning behavior tests.

## Revised Recommendations

1. Choose a packaging strategy in v2.
2. Add a live-spike operating packet before API testing.
3. Make pagination/cap detection mandatory.
4. Choose retrieval-gated as V1 default for partial/unverified content unless UI warning work is explicitly included.
5. Add run-report redaction tests.
6. Add production migration/schema smoke.
7. Add concrete cap defaults.
8. Add PRD-to-implementation traceability.

## Go / No-Go Recommendation

No-go for execution from implementation plan v1.

Go for implementation plan v2 after the required changes are incorporated. Coding beyond offline foundations should still wait for user-approved live API handling unless the task is limited to local-only packaging/test scaffolding that cannot touch real Recall data.

## Plan Revision Inputs

### Required Deletions

- Remove "if needed" from page/cap detection.
- Remove indecision around retrieval treatment for V1; choose a safe default.

### Required Additions

- Production CLI packaging strategy and local bundle smoke.
- Live Recall spike operating packet.
- Mandatory cap/pagination detection.
- Concrete cap defaults.
- Persistent run-report redaction tests.
- Production migration/schema smoke.
- Backup integrity/restore proof.
- Requirement traceability.

### Required Acceptance Criteria Changes

- CLI acceptance requires execution from a deploy-like directory without `src/`.
- Live gate acceptance requires total-count/result-count/cap evidence.
- Partial/unverified content acceptance requires retrieval-gated default or visible warning tests.
- First apply requires backup integrity proof, not just a backup file.

### Required Validation Changes

- Add unit tests for run-report persistence redaction.
- Add packaging smoke test.
- Add production schema check commands to runbook.
- Add Ask/Search retrieval test for excluded partial content or warning-visible behavior.

### Required No-Go Gates

- No live API test if API-key handling packet is not approved.
- No implementation coding that assumes a CLI packaging strategy before v2 chooses one.
- No production dry-run if schema smoke fails.
- No production apply if backup integrity/restore proof is missing.
- No Ask/Search use of unverified/truncated content without retrieval gate or warning.

## Residual Risks

- Even with live validation, Recall API behavior can change later.
- Content completeness may remain approximate for long PDFs/videos.
- Personal data handling depends on local operational discipline.
- Cron scheduling may interact with existing enrichment workload in ways only production dry-runs reveal.
