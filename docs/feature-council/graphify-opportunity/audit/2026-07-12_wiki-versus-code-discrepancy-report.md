# AI Brain Wiki versus Code Discrepancy Report

**Code baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c` (`origin/main`, verified 2026-07-12)  
**Canonical Wiki baseline:** `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1` (verified 2026-07-12)  
**Method:** cloned the GitHub Wiki read-only, compared it byte-for-byte with `docs/wiki/`, then checked material claims against current code, migrations, configuration, tests, CI, and Git history. The repository Wiki sources and canonical Wiki matched byte-for-byte at the audited commits.

## Summary

The Wiki is unusually disciplined about separating implemented behavior from planned graph work. Its central current-product claims are substantially aligned with code. The principal discrepancies are freshness and precision issues rather than a wholesale misrepresentation of the product:

1. Recall manual sync is still described as an unmerged review candidate even though it is now merged into current main.
2. Several Wiki pages cite older verification baselines even when current main contains later merged changes.
3. Deployment documentation incorrectly says CI does not validate the full product suite, while current Product CI runs static checks, product tests, docs checks, builds, and release smokes.
4. “AI topics” and “evidence-bearing concepts” can be read more strongly than current enrichment supports: topics currently reuse generated tag names, store null confidence, and use generic category evidence.
5. Dated production-enable/runtime claims cannot be reconfirmed from source alone and were not freshly probed in this audit; they should retain their dates and never be treated as “live now” merely because they are in the Wiki.

The Wiki is correct that Related is similarity rather than a graph, no current relationship graph exists, Processing cards are not spaced repetition, and graph/Neo4j capabilities remain planned/deferred.

## Findings requiring correction or clarification

### W-01 — Recall manual sync is described as a review candidate after merge

**Severity:** Medium documentation freshness  
**Wiki claim:** `Recall-Synchronization.md:5-6,54-56` says the manual feature is a review candidate, not merged/deployed/enabled. `Feature-Catalog.md:41` calls `fdd7406…` a candidate. `Deployment-and-Operations.md:10,18-20` also calls it a review candidate.

**Code/history evidence:**

- `fdd7406` introduced durable manual sync on 2026-07-11.
- PR #22 merged in commit `4e917c7` before the audited `origin/main` baseline; PR #23 subsequently merged rollout fixes in `5b92e68`.
- Current main contains the Settings component, API, repository/service, migration 024, trusted worker, path/timer/service units, and tests: `src/components/recall-manual-sync.tsx`, `src/app/api/settings/recall-sync/route.ts`, `src/lib/recall/manual-sync-service.ts:28-35`, `src/db/migrations/024_recall_manual_sync.sql`, and `scripts/deploy/brain-recall-manual-sync.*`.

**Resolution:** Change “review candidate / does not merge” to “merged into main; default off; host enablement/runtime not established by merge.” Preserve the separate, still-valid statement that the manual control was not enabled/deployed in the dated production evidence unless a later host verification exists.

**Why this matters:** “Implemented in code,” “deployed,” and “enabled” are separate axes. The current Wiki collapses the first into stale candidate language while correctly remaining cautious on the latter two.

### W-02 — Verification baselines lag current main

**Severity:** Medium evidence traceability  
**Wiki claim:** many primary pages say verified against `ea7b159…` or `23868faf…`, including `Product-Overview.md:5-7`, `Search-RAG-and-Ask.md:5-7`, `Organization-Tags-Topics-and-Collections.md:5-7`, `System-Architecture.md:5-7`, and `Feature-Catalog.md:5-10`.

**Current evidence:** audited main is `8c134110…`, with subsequent Recall merge, Processing release commits, and selected-library-source work. The older baselines can still be valid evidence for their named feature scope, but they do not establish full current-main coverage.

**Resolution:** Keep feature-specific historical runtime SHAs where useful, but add a current-main code verification line or per-row “code verified at” column. Do not rewrite dated runtime evidence as current merely to align SHAs.

### W-03 — Deployment page understates Product CI

**Severity:** Medium operational documentation accuracy  
**Wiki claim:** `Deployment-and-Operations.md:30` says, “GitHub CI validates documentation but not the full product suite.”

**Code/CI evidence:** `.github/workflows/product-ci.yml:19-41` performs locked install, typecheck, lint, environment checks, `npm test`, documentation checks, Processing/vector tool builds, production build, and release-tool smokes. The main-push job packages and attests the immutable runtime (`:43-81`). Protected-baseline run `29200243743` passed 894 tests/95 suites plus the static/build/release gates; Agent docs run `29200243741` passed.

**Resolution:** Replace the sentence with a precise boundary: CI runs the repository product suite and build/release smokes, but does not reproduce production host, provider, client-device, systemd, or private-data runtime verification.

### W-04 — Topic semantics are stronger in prose than in current enrichment

**Severity:** Medium product/evidence precision  
**Wiki claim:** `Organization-Tags-Topics-and-Collections.md:12-17` calls topics “generated concepts with dedicated topic pages and evidence-bearing joins” and says enrichment adds generated tags/topics. `Data-Model.md:15` lists them as distinct organization relations.

**Code evidence:**

- The distinct schema and pages are real: `src/db/migrations/017_topics.sql:4-24`; `src/db/topics.ts:140-182`.
- However, current enrichment uses the exact same `output.tags` array for auto-tags and topics (`src/lib/enrich/pipeline.ts:241-249`).
- `replaceTopicsForItem` writes `confidence: null` (`src/db/topics.ts:109-137`).
- Evidence is a generic `Detected during enrichment for <category>` sentence, not an excerpt, source span, model confidence, or independently extracted relation (`src/lib/enrich/pipeline.ts:247-249`).

**Resolution:** Describe current topics as “generated navigable labels stored separately from tags, with nullable evidence/confidence fields.” State that current enrichment mirrors tag labels, does not populate confidence, and does not create topic-topic/item-item relations. This avoids double-counting tags and topics as independent graph signals.

### W-05 — “Current” runtime claims need a dated-evidence guard

**Severity:** Low/Medium evidence interpretation  
**Wiki claim:** the Feature Catalog accurately labels runtime evidence as feature-specific (`Feature-Catalog.md:10-12`) but rows also use availability phrases such as “Enabled in verified private production release” for Processing and notes (`:35,51-54`). Processing page cites staged runtime verification (`Card-Processing-Workflow.md:5-10,58-62`).

**Audit boundary:** source confirms code, flags, migrations, and tests, but this audit did not probe the current host, environment flags, readiness row, database, services, providers, or devices. `.env.example:83-106,128-134` defaults notes, Processing, and manual Recall controls off.

**Resolution:** No product-status downgrade is justified. Keep the dated verified-release wording, but add an explicit statement that it is historical evidence through the named date/commit and not a live-now health assertion. For planning, classify current runtime availability as **Unknown unless freshly probed**.

### W-06 — Version labels can confuse feature maturity

**Severity:** Low  
**Wiki/repository context:** Wiki pages describe features with later internal release histories while `package.json:3` remains `0.6.2`, and source comments refer to v0.7.5-era capture behavior. This is not a functional mismatch, but a reader can mistakenly infer package version equals the latest feature milestone.

**Resolution:** Treat package version, feature/release evidence SHA, and product status as independent. A short glossary note would prevent false ordering in future audits.

## Confirmed alignments (no correction required)

### A-01 — Related is not a knowledge graph

The Wiki explicitly says Related is “query-time similarity, not graph edges” (`Search-RAG-and-Ask.md:14-21`) and “query-time similarity, not a graph” (`Product-Overview.md:41`). Code agrees: `src/lib/related/index.ts:1-16,52-132` computes centroids/similarity on demand; no edge is written. The UI is a bounded list in `src/components/related-items.tsx:20`.

### A-02 — Relationship Graph/Connection Map is planned, not live

`Ideas-and-Exploration-Catalog.md:18` lists the planned graph and explicitly names missing persisted edges, graph route/UI, accessible alternate view, and rebuild controls. Repository inspection found no generalized graph schema, dependency, route, service, UI, tests, flags, or deployment work. Neo4j export is correctly deferred (`:33`), and decorative graph-first redesign is correctly rejected (`:47`).

### A-03 — Tags, topics, categories, and collections are distinct storage concepts

The schema supports the distinctions described at `Organization-Tags-Topics-and-Collections.md:12-19`: category is an item field, tags and topics have separate join tables, and collections are groups. The clarification in W-04 concerns extraction semantics/confidence, not schema existence.

### A-04 — No hierarchy, smart collections, backlinks, or graph

The Wiki boundary at `Organization-Tags-Topics-and-Collections.md:19` matches code. The original schema comment says tag names may use `/` (`src/db/migrations/001_initial_schema.sql:67`), but current tag logic only canonicalizes/renames strings (`src/db/tags.ts:15-30,100-120`); no parent/child relation or hierarchy UI exists.

### A-05 — Search/RAG description matches implementation

The Wiki correctly describes item/note FTS, 768-d semantic/hybrid retrieval, query-time Related, scopes, citations, and chat (`Search-RAG-and-Ask.md:14-27`). Code and tests support FTS/note provenance, semantic deduplication, RRF, source-aware chunks, scoped retrieve, citation filtering, and chat persistence.

### A-06 — Attached-note privacy and provenance claims match current code shape

`Manual-Content-Notes.md:34-66` correctly separates the note record, FTS, source-aware chunks, opt-in, provider policy, and delete/purge behavior. Migrations 022/023 and note/retrieve/related/provider-policy code implement those boundaries. Current host flag state remains subject to W-05.

### A-07 — Card Processing is not SRS

`Data-Model.md:24` says the SRS-shaped `cards` table has no product implementation, and `Ideas-and-Exploration-Catalog.md:21` keeps spaced repetition planned. Code search found no current SRS route/service/scheduler. Processing’s “cards” are saved items with workflow fields/events from migration 025.

### A-08 — Capture schema enums do not prove support

The Wiki repeatedly warns that podcast/EPUB/DOCX enum values do not establish ingestion support (`Product-Overview.md:43`; `Ideas-and-Exploration-Catalog.md:25`). Code confirms schema/type substrate but no complete capture routes/extractors/tests for those formats.

### A-09 — Observability is not analytics

`Deployment-and-Operations.md:22-24,32-34` accurately classifies health, queues, JSONL/journal, Recall/Processing audits, and local status tooling as operator signals rather than centralized product analytics. No general event analytics pipeline was found.

## Source-to-Wiki classification guidance

| Evidence found | Safe Wiki classification |
|---|---|
| Current route/service/schema and protecting tests, default reachable | Implemented; runtime Unknown unless separately verified |
| Current code behind explicit environment/readiness gate | Feature-flagged; state enablement separately |
| Adapter exists but current route deliberately returns unavailable | Inactive |
| Schema only with no product path | Inactive substrate / planned product, never “implemented feature” |
| PRD/prototype/Wiki exploration only | Planned or explored; not implemented |
| Prior production report only | “Verified on <date> at <SHA>”; not an evergreen live assertion |
| Query-time similarity | Related/similarity; not a persisted relationship graph |
| Nullable confidence field with null-producing code | Schema supports confidence; current behavior does not populate it |

## Recommended Wiki changes for the later publication stage

1. Update Recall pages/catalog/deployment prose from “review candidate / not merged” to “merged into main, default off, host enablement not established here.”
2. Add current code baseline `8c134110…` while retaining dated feature-specific runtime SHAs.
3. Correct the Product CI boundary in Deployment and Operations.
4. Qualify topics: generated navigable labels, currently mirrored from auto-tags; confidence nullable and currently null; evidence generic.
5. Keep the existing graph, Neo4j, SRS, offline, and unsupported-format classifications unchanged.
6. Preserve dates on all runtime claims and avoid converting them to “currently live” without a fresh host check.

No Wiki changes were made during this Stage 1 audit; publication belongs to the later coordinated Wiki stage.
