# AI Brain Audit v2 — QA Evidence Review

**Review date:** 2026-07-12  
**Repository baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Wiki baseline:** `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1`  
**Artifacts reviewed:** audit v2, semantic-event/lifecycle matrix, surface-coverage CSV, v1 adversarial review, source inventory, cited source/tests/Wiki/history, and protected CI evidence

## Readiness verdict

**FAIL for closure-certified Stage 1 sign-off. PASS, with conditions, as bounded technical and historical council input. Runtime and user-value readiness remain UNKNOWN.**

The v2 package fixes the dangerous substantive omissions: it records FCP-004 as an existing reduced-scope decision, treats value as a hypothesis rather than an observed outcome, identifies `item_semantic_events` as partial, states that no graph consumer exists, preserves derived/rebuildable/consent-aware lifecycle rules, and records the browser-unlock boundary. Those rules make the package safe to consult if its own no-go conditions are enforced.

It does not meet the v1 review's explicit approval threshold because P1-02, P2-01, and P2-02 are not fully closed. P2-04, P2-05, and P3-01 also retain evidence-hygiene gaps. The v2 disposition table at `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:18-30` therefore overstates closure.

## Disposition matrix

| Finding | QA disposition | Evidence and required correction |
|---|---|---|
| P1-01 — prior FCP-004 omitted | **PASS / closed** | The decision, P2 priority, planning-only maturity, proof-packet gate, historical baseline, current-main delta, binding constraints, and reopenable decisions are recorded at `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:47-97`. They match `docs/wiki/Feature-Council-Decision-Log.md:32-40`, `docs/wiki/Feature-Council-Project-Tracker.md:38-44`, and the FCP-004 PRD/technical/UX v2 pages. |
| P1-02 — `item_semantic_events` omitted | **FAIL / partially closed** | The schema, partial producer, consumer absence, and no-go rule are now present. However, the matrix uses aliases `original` and `legacy` instead of the schema values `original_content` and `legacy_item_context` (`src/db/migrations/023_source_aware_chunks.sql:61-72`), and it calls the manual-note producer “implemented and tested” while the cited test asserts only `indexed`, not `purged` (`src/lib/queue/note-index-worker.test.ts:81-86`). Split coverage by exact source kind and action, and add or cite a direct `purged`-event assertion. |
| P1-03 — unsupported product-value claims | **PASS / closed** | The intended-jobs table explicitly separates source-supported affordances from runtime/adoption/outcome evidence, and Unknown is non-passing (`docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:32-45,165-173`). |
| P2-01 — collapsed status axes | **FAIL / partially closed** | The ledger separates implementation, entry/gate, external readiness, runtime evidence, and value evidence (`docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:99-121`). It omits the required confidence for each axis and groups many F-IDs, so it is not an axis-complete record for every capability as required by the v1 review at `docs/feature-council/graphify-opportunity/audit/AI_BRAIN_FEATURE_AUDIT_V1_ADVERSARIAL_REVIEW_2026-07-12_22-48-54_IST.md:133-141,296-302`. Add per-axis confidence/evidence dates and avoid grouping capabilities whose gates or evidence differ. |
| P2-02 — no coverage closure | **FAIL / partially closed** | The CSV is machine-readable, all 107 listed paths exist, and it exactly covers 24 pages, 43 API routes, and 27 SQL migrations. It also lists 3 clients, 7 workers, and 3 units. It does not cover every worker/unit: for example `src/lib/backup.ts`, `src/db/processing-enrollment.ts`, `scripts/deploy/brain.service`, the three deploy `.service` files paired with listed timers, `scripts/deploy/brain-recall-manual-sync.path`, `scripts/deploy/brain-recall-manual-sync.tmpfiles.conf`, and `scripts/deploy/brain-backup.cron` are absent. F34 and F36 consequently have no CSV mapping. The CSV also maps classifications, not each capability's acceptance behavior and critical negative paths to exact tests, which was part of the required revision. |
| P2-03 — browser unlock throttling omitted | **PASS / closed** | `src/app/auth-actions.ts:22-33,65-80` enforces a four-character minimum and directly verifies the PIN without a discovered throttle, lockout, or durable attempt record. `src/proxy.ts:91-137` applies its limiter only to bearer routes. The v2 security boundary states this distinction accurately at `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:136-141`. |
| P2-04 — history manifest inconsistency | **FAIL / partially closed** | The source inventory no longer says “pending,” and Git verifies `fdd7406`, PR #22 merge `4e917c7`, rollout-fix merge `5b92e68`, and that `5b92e68` is an ancestor of the baseline. But `SOURCE_INVENTORY.md:9` still omits the exact questions, commits, and verification date requested by the v1 review. In addition, `docs/feature-council/graphify-opportunity/audit/2026-07-12_wiki-versus-code-discrepancy-report.md:26-30` incorrectly associates PR #22 with `5b92e68`; PR #22 is `4e917c7`, while `5b92e68` is PR #23. Correct the mapping and make the manifest exact. |
| P2-05 — no graph-input lifecycle contract | **PASS for safe input; incomplete for implementation approval** | The matrix now records owner/source, eligibility, consent/privacy, invalidation, delete behavior, classifications, and a six-part precondition for persisted relationships (`docs/feature-council/graphify-opportunity/audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md:28-54`). Its no-go rule is appropriately strict. Before implementation approval, make provider boundary, provenance fields, rebuild source, and failure visibility explicit per included input. Also account for item deletion: both `item_semantic_events` and `note_index_jobs` cascade with the item (`src/db/migrations/022_item_notes.sql:68-80`; `src/db/migrations/023_source_aware_chunks.sql:61-76`), so a lagging event consumer would not retain an item-deletion tombstone. |
| P3-01 — local-test root cause overstated | **FAIL / partially closed** | Audit v2 uses the requested observable wording at `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md:147`. But `docs/feature-council/graphify-opportunity/SOURCE_INVENTORY.md:25` still asserts “stale shared dependencies,” the unsupported root-cause wording the review asked to remove. Retain only the observed dependency-resolution failure plus exact-SHA clean-CI result. |

## Verification checks

| Check | Result |
|---|---|
| Repository baseline | PASS — audited commit exists and is the stated baseline. |
| Protected Product CI | PASS — run `29200243743` completed successfully at the exact baseline; logs report 894/894 tests, 95 suites, zero failures, plus successful verification/release jobs. Agent documentation run `29200243741` also succeeded at the same SHA. |
| Targeted local evidence | PASS — migration 023, note-index worker, and proxy tests completed: 31 passed, 0 failed. This is targeted evidence, not a replacement for protected full-suite CI. |
| Wiki baseline and mirror | PASS — the stated Wiki commit exists, contains 86 Markdown pages, is an ancestor of current Wiki `master`, and matches `docs/wiki/` byte-for-byte at that commit. |
| History correction | PARTIAL — ancestry and merge facts reproduce, but the discrepancy report swaps the PR #22/PR #23 merge association. |
| Surface CSV integrity | PARTIAL — 107 rows; no duplicate type/path pairs; all paths are relative and exist; page/API/migration sets close exactly; worker/unit closure and behavior-to-test closure do not. |
| Semantic-event implementation | PARTIAL — exact schema supports four source kinds and two actions; only manual-note code produces events; no consumer; direct test evidence covers `indexed` only. |
| Privacy/path hygiene | PASS — no absolute user path, account identifier, local-file URL, or missing relative Markdown target was found in the three v2 artifacts. Sensitive graph concentration and telemetry boundaries are explicitly stated. |

## Actionable blockers to full sign-off

1. Correct the semantic-event matrix to exact enum values, split action coverage, and add a direct `purged` event assertion; document deletion tombstone/watermark handling.
2. Add confidence and evidence date per status axis for every capability.
3. Complete the worker/unit CSV and add acceptance-behavior/critical-negative-test closure, including F34 backup and F36 deployment surfaces.
4. Correct the PR #22/PR #23 history mapping and make `SOURCE_INVENTORY.md` name the verified commits/questions/date.
5. Remove the remaining unsupported “stale shared dependencies” causal wording from `SOURCE_INVENTORY.md`.

Until items 1-3 are complete, the v1 approval threshold is not met. Council may use v2 to understand the current substrate and prior decision, but must not treat it as proof of complete invalidation, implementation readiness, runtime availability, adoption, or user value.

## Recheck — 2026-07-12 23:24 IST

**This recheck supersedes the initial readiness verdict above.**

**Audit readiness as bounded technical and historical council input: PASS. Implementation/runtime/user-value readiness: UNKNOWN and non-passing.**

| Rechecked blocker | Result |
|---|---|
| Exact event enums, action evidence, and deletion tombstone | **PASS for source-audit closure.** The matrix now uses `manual_note`, `original_content`, `ai_summary`, and `legacy_item_context`; distinguishes the directly asserted `indexed` action from the source-implemented but unasserted `purged` action; marks the latter Unknown/non-passing; and explicitly states that cascading event/job rows are not durable deletion tombstones. The missing direct `purged` assertion remains an honest implementation-test gap and preserves the graph-refresh no-go rule; it is not a remaining documentation blocker in this documentation-only goal. |
| Per-capability status/confidence evidence | **PASS.** `2026-07-12_capability-status-evidence-ledger.csv` has exactly 38 unique rows, F01–F38 in order, with non-empty status and confidence for implementation, entry/gate, external readiness, runtime evidence, and value evidence, plus a verification date. The grouped table in audit v2 is a summary; the linked CSV is the controlling complete ledger. |
| Surface coverage closure | **PASS.** The expanded CSV contains exact closure for 24 pages, 43 API routes, and 27 migrations, plus 3 clients, 10 workers/services, and 11 deployment units. All 119 listed paths exist, type/path pairs are unique, and the page/API/migration sets have no missing or extra paths. Backup F34 and hosted-deployment F36 surfaces are now mapped. |
| Positive/negative test accounting | **PASS for audit evidence accounting.** `2026-07-12_capability-acceptance-test-closure.csv` has exactly 38 unique F01–F38 rows with non-empty positive evidence, critical negative/boundary evidence, closure status, and remaining gap. Every cited repository path exists. The ledger retains 5 Partial and 2 Negative-closure rows rather than converting absent implementation/runtime proof into a pass. |
| PR history and local-test wording | **PASS.** `SOURCE_INVENTORY.md` now records the verified questions, date, feature commit, PR #22 merge `4e917c7`, PR #23 rollout-fix merge `5b92e68`, and ancestry. The discrepancy report uses the same mapping. The source inventory now states only the observed local dependency-resolution failure and makes no unsupported stale-dependency root-cause assertion. |

**Remaining documentation blockers: none found in the assigned recheck scope.** The package is ready to be used only under its stated bounded-input rules: `item_semantic_events` is not a complete invalidation bus; no generalized graph is implemented; the proof packet remains required; and Unknown runtime, trust, privacy, or value gates remain non-passing.
