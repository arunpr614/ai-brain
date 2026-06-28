# Recall Daily Snapshot Import PRD V1 - Adversarial Review

**Created:** 2026-06-24 10:14:55 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_2026-06-24_10-13-04_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_ADVERSARIAL_REVIEW_2026-06-24_10-14-55_IST.md`

## Executive Verdict

Conditional no-go for implementation planning.

The PRD correctly refuses production cron/apply before live Recall gates, but it is still too soft to drive the next execution phase. The biggest gaps are not architecture choice; they are gate precision. V1 does not yet define exactly how live Recall sample cards will be created, how enumeration completeness will be proven, what content-fidelity thresholds permit import versus block, what production packaging evidence is required, or how persistent private data in run tables/logs will be retained and redacted.

Create PRD v2 before implementation planning. Do not move to implementation plan v1 from this PRD as written.

## Evidence Inspected

- Target PRD with line numbers:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_2026-06-24_10-13-04_IST.md`
- Current final options:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_2026-06-24_10-09-20_IST.md`
- Current project tracker:
  - `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`
- Current Recall docs checked by the author:
  - `https://docs.recall.it/developer/api`
  - `https://docs.recall.it/developer/mcp`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found for a draft PRD. The PRD explicitly blocks production cron/apply until live gates and packaging are validated.

### P1 - High Risk

#### 1. Live API gates are named but not executable enough to prove completeness

**Evidence:** The primary metric says "At least 95% of controlled new Recall cards" must be discovered (`RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_2026-06-24_10-13-04_IST.md:57-60`). Requirements say import happens after GATE-001 and GATE-002 pass (`:115`) and content fidelity depends on live SPIKE-014 (`:118`). The user flow says Arun creates controlled sample cards (`:192`), but the PRD does not define the sample-card set, exact expected count, creation timestamps, allowed clock skew, tag/source URL conventions, or how to detect missing cards.

**Why it matters:** The known project risk is silent missed Recall cards. A 95% target permits exactly the trust failure the feature is supposed to prevent.

**Failure mode:** Live dry-run misses 1 card in 20, still meets a 95% metric, and daily import silently becomes incomplete.

**Recommendation:** In v2, define a live validation protocol:

- five controlled cards minimum: short note, article, YouTube, PDF, long/truncation candidate;
- unique sentinel titles/source URLs or tags;
- exact expected card IDs/titles recorded locally in a private evidence file;
- date window starts before first card creation and ends after last card creation with explicit overlap;
- pass criterion is 100% discovery of controlled cards and no unexpected API cap/pagination behavior;
- any miss is a no-go unless a fallback enumeration strategy is proven.

#### 2. Content-fidelity acceptance is too vague to decide import versus block

**Evidence:** The PRD lists fidelity states and exactly-50 chunks handling (`:118`, `:237`) but does not define per-content-type rules for notes, articles, PDFs, YouTube, or long cards. It says metadata-only cards are "imported only if product policy allows; otherwise record blocked" (`:118`) but does not choose the V1 policy.

**Why it matters:** Recall card detail has a documented `max_chunks` cap. Without import/block rules, implementation can accidentally import partial long content as useful memory or block too much and make the feature feel broken.

**Failure mode:** A 50-chunk PDF gets imported as a searchable item with a warning, Ask cites it as if complete, and the user trusts an incomplete memory.

**Recommendation:** In v2, add a fidelity decision matrix:

| Content class | Import policy | Required evidence |
|---|---|---|
| Short note | import if chunks/text present or metadata-only explicitly accepted | body length and title |
| Article | import if chunks below cap and body appears coherent | chunk count/order |
| YouTube | import as unverified unless timestamps/chunks prove useful transcript | chunk count/timestamps |
| PDF | block or import as unverified unless live sample proves meaningful coverage | page/source markers |
| Exactly 50 chunks | default block from enrichment/search or import as `possibly_truncated` but exclude from Ask until repaired | explicit user approval |

#### 3. Production packaging is treated as a note, not a release gate with acceptance evidence

**Evidence:** The PRD notes Hetzner does not ship full TypeScript source or dev dependencies (`:37`, `:224`) and adds a milestone for "production-packaged CLI" (`:137`), but no P0 requirement states exactly what packaging must prove before deployment.

**Why it matters:** This is the practical blocker to running the job. Without an acceptance test, an implementation plan can produce a local `tsx` script that passes tests but cannot run in production.

**Failure mode:** Cron is installed with `node --import tsx scripts/sync-recall.ts`, production lacks `tsx` or source files, the job fails nightly, and no cards import.

**Recommendation:** Add a P0 packaging requirement:

- deploy artifact contains `scripts/sync-recall-prod.mjs` or equivalent bundled JS;
- remote `ssh brain 'test -f /opt/brain/scripts/sync-recall-prod.mjs'` passes;
- remote dry-run starts under `brain` user after sourcing `/etc/brain/.env`;
- no dev dependencies are required;
- deploy script copies the CLI and any runtime dependencies intentionally.

### P2 - Medium Risk

#### 1. Persistent privacy model is incomplete

**Evidence:** Personal data table lists Recall title/content/source URL and sync reports as persistent (`:176-182`). The PRD requires report redaction (`:119`) but does not define retention, scrub behavior, raw report schema, or whether `recall_sync_runs.report_json` may contain private titles.

**Why it matters:** Redacting stdout is not enough if the database stores raw dry-run reports or private content in error fields.

**Failure mode:** A "redacted" report is safe in logs, but the persistent `report_json` contains full card titles, source URLs, or chunk snippets and later gets exported or committed.

**Recommendation:** Add data retention rules:

- `recall_sync_runs.report_json` stores counts, IDs, fidelity states, statuses, and redacted titles only by default;
- full content is never stored in run reports;
- raw API responses are not persisted outside `items.body` for imported items;
- failed dry-run reports omit full content;
- logs older than an agreed window can be rotated/deleted;
- no real Recall payload fixtures may be tracked.

#### 2. Success metric allows "skipped" without defining acceptable skip reasons

**Evidence:** Primary metric counts cards "imported, skipped idempotently, or blocked" (`:59`). Skips can be safe or unsafe, but the metric does not distinguish already-imported, strong source-URL match, changed remote, cap-blocked, unsupported, or API ambiguity.

**Why it matters:** A run could skip everything and still appear successful if all cards receive any skip label.

**Failure mode:** The dry-run sees new cards but classifies them all as skipped due to URL collisions or metadata ambiguity; the metric passes while no useful import occurs.

**Recommendation:** Define allowed skip/block reasons and success thresholds:

- "idempotent existing Recall card" is acceptable;
- "strong existing source URL" is acceptable only when exact item is already full-text;
- "changed remote" is not success for V1 apply; it requires review;
- cap-blocked is a safe stop but not import success;
- unsupported/ambiguous content counts as a blocked card and should be surfaced separately.

#### 3. User-facing quality state is under-specified

**Evidence:** PRD says imported items show provenance and content-fidelity warning (`:116`, `:198`), but does not say where the fidelity state appears in Library, item detail, Ask citations, or search results. It also says existing surfaces are reused (`:204`).

**Why it matters:** If fidelity only lives in metadata/body text, the user may not see it before asking questions against a partial item.

**Failure mode:** A `possibly_truncated` card is imported, Library only says `Full text`, Ask retrieves it, and the user misses the warning.

**Recommendation:** Add acceptance criteria that `possibly_truncated`, `metadata_only`, and `api_chunks_unverified` appear in at least item detail and Ask/source scope metadata before Ask uses the content as authoritative. If UI work is out of V1, state that such items are excluded from Ask until UI warning is visible.

#### 4. Rollback and backup requirements are not represented as P0 requirements

**Evidence:** Goals mention rollback (`:53`) and production operations mention rollback (`:123`), but there is no explicit P0 requirement or acceptance criterion for backup/restore before first apply.

**Why it matters:** The first apply mutates AI Brain's local DB. A bad mapper or overbroad import can create noisy items, queue work, and pollute search.

**Failure mode:** First apply imports many bad items; there is no fresh restore-tested backup; cleanup becomes manual.

**Recommendation:** Add P0 first-apply safety requirement:

- fresh DB backup before first apply;
- restore test or at least sqlite integrity check on the backup;
- apply report with item IDs;
- rollback command documented before apply;
- first apply cap defaults to 5 or fewer.

### P3 - Low Risk Or Polish

#### 1. Toast/JPD template remnants reduce clarity for a personal project

**Evidence:** Milestones use JPD rows, Test Kitchen, launch tier, and JPD Link (`:130-140`) even though this is a personal/internal AI Brain project.

**Why it matters:** This is not execution-blocking, but future agents may waste time trying to map personal work to nonexistent JPD artifacts.

**Failure mode:** Tracker and PRD disagree about whether JPDs are required.

**Recommendation:** In v2, keep the template headers but explicitly mark the table as "JPD-equivalent local milestones" and use the project tracker IDs (`RDS-013`, `RDS-014`, etc.) in the milestone column.

## What The Original Plan Or Work Gets Wrong

- It treats live gates as blockers but does not define a strict enough live gate protocol.
- It accepts a 95% discovery metric for a feature whose primary trust problem is silent misses.
- It acknowledges content truncation but does not decide what V1 does with truncated or unverified content in Ask/Search.
- It acknowledges production packaging risk but does not make remote packaged CLI proof a P0 acceptance criterion.
- It discusses report redaction but not persistent run-report retention and schema privacy.

## Missing Validation

- Controlled-card creation protocol and expected-card evidence file.
- Live `/cards` pagination/cap detection, not just narrow date filter.
- Per-content-type fidelity acceptance tests.
- Remote packaged CLI smoke test on Hetzner.
- Backup/restore or rollback validation before first apply.
- UI/Ask behavior validation for partial/unverified Recall imports.
- Persistent `recall_sync_runs.report_json` privacy validation.

## Revised Recommendations

1. Replace the primary 95% discovery metric with 100% controlled-card discovery for live gate approval.
2. Add a live sample protocol covering note, article, YouTube, PDF, and long/truncation candidate.
3. Add a fidelity policy matrix with import/block/search/Ask behavior per class.
4. Make production CLI packaging a P0 requirement with remote evidence.
5. Add backup/rollback requirements before first apply.
6. Add persistent-report privacy rules.
7. Convert JPD milestones into tracker-aligned local milestones.

## Go / No-Go Recommendation

No-go for implementation plan v1 from the current PRD.

Go for PRD v2 after the required revision inputs below are incorporated. Production implementation remains blocked until live API gates pass or are explicitly treated as implementation blockers in the later implementation plan.

## Plan Revision Inputs

### Required Deletions

- Delete or revise the 95% controlled-card discovery primary metric. It is too weak.
- Remove any implication that "skipped" broadly counts as success without allowed skip-reason taxonomy.

### Required Additions

- Live API gate protocol with exact sample-card classes and 100% discovery requirement.
- Fidelity decision matrix defining import/block/search/Ask behavior.
- Production packaged CLI P0 acceptance criteria.
- First-apply backup/rollback criteria.
- Persistent report/log privacy and retention policy.
- Tracker-ID-aligned milestone names.

### Required Acceptance Criteria Changes

- GATE-001 passes only with 100% controlled-card discovery and no unexplained total-count/page-cap mismatch.
- GATE-002 passes only after each representative content type receives an explicit fidelity verdict.
- First apply requires backup, low caps, item ID report, and rollback path.
- `possibly_truncated` imports cannot be silently treated as full Ask/search sources.

### Required Validation Changes

- Add live dry-run evidence checklist.
- Add remote CLI packaging smoke check.
- Add secret/privacy scan for logs and `recall_sync_runs.report_json`.
- Add UI or retrieval acceptance for partial/unverified content treatment.

### Required No-Go Gates

- No production apply if any controlled card is missed.
- No production apply if any real dry-run report stores unredacted secrets or full private content outside approved DB fields.
- No scheduled cron if remote packaged CLI smoke fails.
- No default weak upgrade until live fidelity passes and user approves candidate list.
- No Ask/search inclusion for `possibly_truncated` content unless the UI or retrieval layer surfaces the fidelity warning.

## Residual Risks

- Recall may change API behavior after implementation; ongoing dry-run monitoring will still be needed.
- Exact content completeness may remain unknowable for long videos/PDFs even after live samples.
- Personal/private data remains sensitive even with redaction; local backups and logs need careful handling.
- Browser/MCP/export fallbacks remain unproven and should not be treated as equivalent substitutes without their own spikes.
