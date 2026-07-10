# Recall Daily Sync Spike Requirements V2

Created: 2026-06-24 09:13 IST
Author: Codex
Status: Revised V2 spike requirements after adversarial review
Research report V2: `docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md`
Spike requirements V1: `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_2026-06-24_09-10-06_IST.md`
Spike requirements review: `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_ADVERSARIAL_REVIEW_2026-06-24_09-11-53_IST.md`
Standard spike report template: `docs/plans/spikes/README.md`

## Purpose

These requirements define the spike phase that must happen before AI Brain can implement a production Recall daily import.

The spike phase must prove or disprove:

1. Whether Recall REST can enumerate new cards reliably.
2. Whether Recall card content can be classified safely.
3. Whether private Recall content and API keys can be handled safely.
4. Whether AI Brain can import Recall snapshots through existing capture/enrichment paths.
5. Whether scheduling, checkpoints, retries, and queue pressure can be bounded.
6. Whether MCP or Markdown export is a viable fallback if REST fails.

No production implementation plan should be created until this V2 spike requirements document is accepted and the required spike reports are complete.

## Execution Phases

### Phase A - Offline Safety And Local Fixture Work

Can run without a Recall API key.

| Order | Spike | Purpose |
|---:|---|---|
| 1 | SPIKE-015 | Redaction, privacy rules, and synthetic fixtures. |
| 2 | SPIKE-016 | Synthetic AI Brain import fixture in disposable test context. |

### Phase B - User-Gated Live Recall API Work

Must not run until the user confirms API-key use and controlled-card permissions.

| Order | Spike | Purpose |
|---:|---|---|
| 3 | SPIKE-013 | REST card enumeration with controlled live data. |
| 4 | SPIKE-014 | Card detail/content fidelity with approved live samples. |

If user-provided API access is not available, mark Phase B as `BLOCKED_USER_INPUT` and do not substitute browser scraping, local secret discovery, or fabricated API evidence.

### Phase C - Local Integration And Scheduling Design

Runs only if Phase A is clear and Phase B does not block the REST path.

| Order | Spike | Purpose |
|---:|---|---|
| 5 | SPIKE-018 | CLI, run-lock, checkpoint, cap, and retry behavior with fake clients. |
| 6 | SPIKE-020 | Deployment operability and production runbook readiness. |
| 7 | SPIKE-017 | Optional weak-item upgrade path. |

### Phase D - Fallback Evaluation

Runs only if REST enumeration fails, REST content fidelity is too weak, or the user wants a fallback strategy.

| Order | Spike | Purpose |
|---:|---|---|
| 7 | SPIKE-019 | MCP and Markdown export viability. |

## Blocked-State Rules

1. No live Recall API spike may run without explicit user confirmation.
2. No live Recall API spike may read API keys from shell history, browser profiles, local app stores, or unapproved files.
3. If API access is missing, continue only with offline spikes and record the live gates as blocked.
4. If controlled Recall cards cannot be created or identified, SPIKE-013 must be `INCONCLUSIVE` or `BLOCKER`; do not infer success from arbitrary account data.
5. If any spike exposes private content unexpectedly, stop live work and run privacy remediation before continuing.

## Shared Safety Rules

These rules apply to every spike:

1. Do not commit or print `RECALL_API_KEY`.
2. Read the key only from a local environment variable or user-approved local secret path.
3. Redact secrets, bearer tokens, cookies, signed URLs, token-like URL query strings, and private content.
4. Do not save full real Recall card content unless the user approves that exact sample.
5. Prefer synthetic fixtures for tests.
6. Default every live API script to dry-run.
7. Any apply/write behavior must require both an explicit flag and `RECALL_SYNC_ENABLED=true`.
8. Do not create production cron, permanent migrations, or long-lived jobs during spikes.
9. Any prototype schema/import work must run in a disposable branch, worktree, test database, or clearly isolated harness.
10. If live Recall behavior contradicts public docs, live-account evidence wins.

## Required Output Artifacts

Each executed spike must create one Markdown report in `docs/plans/spikes/` using the exact structure from `docs/plans/spikes/README.md`.

Every report filename must include a full timestamp:

```text
SPIKE-<NNN>-<short-slug>-<YYYY-MM-DD_HH-MM-SS_IST>.md
```

Planned report patterns:

| Spike | Planned report pattern |
|---|---|
| SPIKE-013 | `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md` |
| SPIKE-014 | `docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md` |
| SPIKE-015 | `docs/plans/spikes/SPIKE-015-recall-privacy-fixtures-<timestamp>_IST.md` |
| SPIKE-016 | `docs/plans/spikes/SPIKE-016-recall-import-fixture-<timestamp>_IST.md` |
| SPIKE-017 | `docs/plans/spikes/SPIKE-017-recall-weak-item-upgrade-<timestamp>_IST.md` |
| SPIKE-018 | `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-<timestamp>_IST.md` |
| SPIKE-019 | `docs/plans/spikes/SPIKE-019-recall-fallback-enumeration-<timestamp>_IST.md` |
| SPIKE-020 | `docs/plans/spikes/SPIKE-020-recall-deployment-operability-<timestamp>_IST.md` |

Final synthesis artifact:

```text
docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_<timestamp>_IST.md
```

## Owner Roles And Time Boxes

| Spike | Primary owner role | Reviewer role | Time box | Verdict required |
|---|---|---|---:|---|
| SPIKE-015 | QA agent | Technical architect | 2 hours | `CLEAR`, `PROCEED-WITH-CHANGES`, `BLOCKER`, or `INCONCLUSIVE` |
| SPIKE-016 | Technical architect | QA agent | 3 hours | same |
| SPIKE-013 | Technical architect | QA agent | 2 hours after user access | same |
| SPIKE-014 | Product manager + Technical architect | QA agent | 3 hours after user access | same |
| SPIKE-018 | Technical architect | Project manager | 3 hours | same |
| SPIKE-017 | Technical architect | QA agent | 2 hours | same |
| SPIKE-019 | Product manager + Technical architect | Project manager | 3 hours | same |
| SPIKE-020 | Project manager + Technical architect | QA agent | 2 hours | same |

If a spike exceeds its time box, the report must say what was learned, what remains unknown, and whether the next plan is blocked.

## Decision Gates

| Gate | Required spike | Decision unlocked if pass | Decision if fail |
|---|---|---|---|
| GATE-001 REST enumeration | SPIKE-013 | REST daily sync can remain primary path. | Block REST daily sync; run SPIKE-019. |
| GATE-002 Content fidelity | SPIKE-014 | Content import can proceed with fidelity taxonomy. | Allow only metadata/partial import or fallback reconciliation. |
| GATE-003 Privacy-safe persistence | SPIKE-015 | Live API evidence and reports can be captured safely. | Block live API work and real-payload persistence. |
| GATE-004 AI Brain compatibility | SPIKE-016 | Recall snapshots can use `insertCaptured()` and `capture_source='recall'`. | Block import implementation until schema/UI path is fixed. |
| GATE-005 Queue/cost/checkpoint safety | SPIKE-018 | CLI/system cron implementation plan can include bounded runs. | Block cron enablement; keep manual dry-run/apply only. |
| GATE-006 Deployment operability | SPIKE-020 | Production deployment/runbook plan can be drafted. | Block production deployment. |
| OPTIONAL-001 Weak item upgrade | SPIKE-017 | Existing weak items can be upgraded safely. | Keep upgrades out of V1. |
| FALLBACK-001 Fallback viability | SPIKE-019 | Fallback implementation plan can be drafted. | Recommend no production daily sync yet. |

## SPIKE-015 - Recall Privacy And Fixture Safety

### Question

Can Recall sync tooling be tested, logged, and reported without leaking private content or secrets?

### Phase

Phase A - offline.

### Method Requirements

The spike must:

1. Define redaction rules for API keys, bearer tokens, cookies, signed URLs, URL query strings, full chunks, and private titles.
2. Create synthetic Recall fixtures for:
   - list response;
   - detail response;
   - no URL;
   - exact 50 chunks;
   - empty window;
   - auth error;
   - validation error;
   - server error;
   - partial content.
3. Create a reusable redaction helper or an executable redaction test table.
4. Verify these example inputs are redacted:
   - `Authorization: Bearer sk_example`
   - `https://example.com/article?token=abc&signature=def`
   - a long chunk body;
   - a private title marked sensitive.
5. Verify thrown errors, stack traces, filenames, screenshots, saved reports, and `report_json` paths cannot leak full chunks or secrets by default.
6. Define the only approved location for user-approved real response captures.
7. Confirm real response capture paths are gitignored or outside the repo.

### Pass Criteria

- Redaction behavior is demonstrated with concrete before/after examples.
- Synthetic fixtures cover all required response classes.
- Dry-run report shape excludes full chunks by default.
- No tracked file contains real Recall private content.

### Fail Criteria

- Any default path prints API keys or full private chunks.
- Real API payloads are written to tracked files without explicit approval.
- Redaction is only described but not validated.

### Blocks

- All live API spikes.
- Any PR/report containing Recall payload evidence.

## SPIKE-016 - AI Brain Recall Import Fixture

### Question

Can a synthetic Recall card become an AI Brain item through `insertCaptured()` without duplication and with correct provenance?

### Phase

Phase A - offline.

### Isolation Requirement

This spike must use a disposable test database, test transaction, temporary branch/worktree, or fixture-only harness. It must not mutate the user's real working AI Brain data unless the user explicitly approves.

### Method Requirements

The spike must:

1. Inspect current `items.capture_source` constraints and TypeScript types.
2. Prototype only the minimum schema/type change needed for `capture_source='recall'`, or document the exact migration needed without applying it permanently.
3. Map synthetic Recall preview/detail fixtures into `insertCaptured()` input.
4. Insert once in the isolated context and verify an item is created.
5. Re-run and verify no duplicate item is created.
6. Verify source type, source platform, capture source, title, body, and fidelity metadata.
7. Verify DB migration behavior with an executable migration/test path where feasible.
8. Verify TypeScript type coverage with an executable check where feasible.
9. Verify Library, item-detail, and filter behavior with an isolated UI/component test or a clearly cited code path if executable UI checks are not practical in the spike time box.
10. Verify enrichment/embedding side effects or explicitly document why they are deferred.
11. Clean up or clearly label any prototype files.

### Pass Criteria

- One synthetic Recall card creates exactly one AI Brain item in isolated context.
- Re-running skips or updates mapping without duplicates.
- `capture_source='recall'` has a clear migration/type/UI path.
- Enrichment/embedding trigger behavior is observed or intentionally deferred with evidence.

### Fail Criteria

- DB constraint rejects Recall source and no safe migration path is identified.
- UI/filter code breaks or hides the new source.
- Dedupe cannot support no-URL items.
- Prototype changes cannot be isolated or cleaned up.

### Blocks

- Recall item import implementation.
- Schema migration plan.
- Library UX plan.

## SPIKE-013 - Recall REST Enumeration

### Question

Can a server-side process use Recall REST API key auth to reliably list all newly created cards in a controlled date window?

### Phase

Phase B - user-gated live API.

### User Preconditions

The user must confirm:

1. A Recall API key may be used locally.
2. The key will be provided only through an approved local mechanism, preferably:

```text
RECALL_API_KEY=<redacted>
```

3. Controlled cards may be created or identified.
4. Controlled card titles may appear in local spike reports, or should be redacted.

### Controlled Test Data

Minimum required controls:

| Control | Requirement |
|---|---|
| Positive control A | A card created inside the test window. |
| Positive control B | A second card created inside the same window. |
| Negative control | A card known to be outside the test window. |
| Boundary check | Date window includes a buffer for timezone/clock skew. |

Preferred content:

- one note or simple URL card;
- one PDF or web article if easy;
- one no-source-url item if available.

### Method Requirements

The spike must:

1. Call `GET /api/v1/cards`.
2. Call `GET /api/v1/cards?date_from=<start>&date_to=<end>`.
3. Compare filtered and unfiltered result IDs.
4. Verify expected positive controls are present.
5. Verify the negative control is absent.
6. Repeat the same filtered call at least twice and compare IDs/order for stability.
7. Check `date_from` and `date_to` boundary behavior with a clock-skew buffer.
8. Check same-timestamp or near-same-timestamp behavior if controlled cards can be created closely enough; otherwise mark this subcase untested.
9. Check whether `total_count` semantics are usable for the filtered window.
10. Check whether pagination, caps, or first-page-only behavior appear within the controlled window.
11. Check whether ordering is stable enough for checkpointing.
12. Record auth, validation, rate-limit, and server-error behavior without printing secrets.

### Pass Criteria

- API key auth succeeds.
- All expected positive controls appear in the filtered window.
- Negative control outside the window is absent.
- `created_at` values are parseable and timezone-safe.
- Filtered response differs from unfiltered response in a way consistent with the date window.
- Repeated filtered calls return stable IDs and ordering, or the report defines a safe ordering/cursor alternative.
- Boundary behavior is documented well enough to choose an overlap/lookback strategy.
- No capped/first-500-only behavior is observed for the controlled date window.
- Spike report includes redacted evidence: expected count, observed count, redacted IDs/titles, date window, and verdict.

### Fail Criteria

- Date filters are ignored.
- Any positive control is missing.
- Negative control appears inside the filtered window without a timestamp explanation.
- API returns a capped/unordered set that cannot prove completeness.
- Auth requires unsafe token handling.

### Blocks

- REST daily sync implementation plan.
- Checkpoint strategy.
- Production cron.

## SPIKE-014 - Recall Content Fidelity

### Question

Can `GET /api/v1/cards/{card_id}?max_chunks=50` return content that AI Brain can classify safely across representative Recall content types?

### Phase

Phase B - user-gated live API.

### Required Samples

| Content type | Required outcome |
|---|---|
| Note | Determine whether full note content is available. |
| Web article | Determine whether article content is complete enough or partial. |
| YouTube/video | Determine whether transcript-like content is present and timestamped. |
| PDF | Determine whether PDF text is complete enough or partial. |
| No-URL item | Determine whether dedupe and provenance are still possible. |
| Long item | Confirm exact-50-chunk handling and truncation label. |

### Method Requirements

The spike must:

1. Fetch each approved sample with `max_chunks=50`.
2. Record metadata field names, chunk count, chunk order evidence, and available source/timestamp metadata.
3. Avoid saving full chunks unless the user approved that exact sample.
4. Compare each sample to an approved truth source when possible:
   - exact note text for notes;
   - original article/source page or approved Recall view for articles;
   - transcript/timestamp evidence for video;
   - first/last page or approved export truth for PDFs.
5. Test null, missing, malformed, empty-chunk, and reordered-chunk fixture variants using synthetic fixtures if live samples do not naturally produce them.
6. Classify each sample as:
   - `complete_enough_for_daily_import`
   - `api_chunks_unverified`
   - `possibly_truncated`
   - `metadata_only`
   - `blocked_unknown`
7. Produce a per-content-type decision matrix:
   - full snapshot import;
   - partial snapshot import;
   - metadata-only import;
   - blocked.

### Pass Criteria

- Every required content type has a decision matrix row.
- At least notes and one URL/article-like content type are importable as full or useful partial snapshots.
- Exact-50-chunk responses are labeled `possibly_truncated`.
- No content type is labeled full text without evidence.
- Each full or partial classification cites the evidence used for that content type.
- Mapper rules for `items.body` are specific enough for implementation planning.

### Fail Criteria

- Chunks are unstable semantic snippets rather than stable card content.
- Chunk order cannot be trusted.
- Long content cannot be detected as partial.
- Most target content types are `blocked_unknown` or `metadata_only`.

### Blocks

- Content import quality.
- Enrichment eligibility.
- User-facing fidelity labels.

## SPIKE-018 - Scheduler And Checkpoint Safety

### Question

Can the Recall import be designed as a safe daily job without duplicate runs, checkpoint corruption, or unbounded downstream work?

### Phase

Phase C - local integration and scheduling design.

### Isolation Requirement

Use fake Recall clients, fake clocks, synthetic fixtures, and isolated run-state storage. Do not schedule a real cron.

### Method Requirements

The spike must:

1. Define CLI behavior:

```text
scripts/sync-recall.ts --dry-run
scripts/sync-recall.ts --apply
```

2. Simulate:
   - empty window;
   - successful window;
   - list succeeds but card detail returns 404;
   - list succeeds but card detail returns different content on retry;
   - partial fetch failure;
   - API auth failure;
   - 429/rate-limit retry exhaustion;
   - cap overflow;
   - one card exceeds character/chunk cap mid-run;
   - concurrent run attempt;
   - stale lock after process death;
   - crash after item insert but before mapping row;
   - crash after mapping row but before checkpoint;
   - enrichment enqueue failure;
   - retry after failure.
3. Verify checkpoint advances only after full success.
4. Verify run lock prevents overlap.
5. Verify caps stop oversized runs before writes.
6. Verify exit-code mapping for cron.
7. Verify dry-run/apply reports are redacted.

### Pass Criteria

- Checkpoint cannot advance on partial failure.
- Run lock prevents overlap.
- Stale locks can be recovered intentionally.
- Caps are enforced before writes.
- Crash windows are retry-safe and do not lose imported card IDs.
- Exit codes are documented.
- No real cron is installed.

### Fail Criteria

- Partial failure can lose cards.
- Overlapping runs can duplicate work.
- First-run imports can flood enrichment.
- The design depends on in-process Next.js cron before CLI proof.

### Blocks

- Production cron.
- Deployment runbook.

## SPIKE-020 - Deployment Operability

### Question

Can a production Recall import be deployed, disabled, observed, verified, and rolled back safely?

### Phase

Phase C - deployment readiness design.

### Isolation Requirement

This spike must not deploy or schedule production work. It produces a runbook-ready design and verification checklist only.

### Method Requirements

The spike must:

1. Identify the intended execution environment for the CLI job.
2. Define required environment variables and secret-injection mechanism.
3. Define dry-run, first apply, steady-state apply, and emergency disable commands.
4. Define log locations and redaction expectations.
5. Define production smoke checks:
   - dry-run succeeds;
   - expected card count is sane;
   - no full private content appears in logs;
   - no duplicate item is created;
   - enrichment queue count remains within cap.
6. Define rollback behavior:
   - disable future runs;
   - recover stale lock;
   - revert or quarantine newly imported items if needed;
   - preserve enough evidence for diagnosis.
7. Define first-run caps and manual approval threshold.
8. Define what production success and failure look like for the user.

### Pass Criteria

- A later implementation plan can cite a concrete runbook outline.
- Secrets, logs, disable path, rollback path, and smoke checks are documented.
- Production deployment remains blocked until code and QA are complete.

### Fail Criteria

- No safe secret-injection path exists.
- Logs cannot be checked without exposing private content.
- There is no clear disable or rollback path.
- Success/failure cannot be observed after deployment.

### Blocks

- Production deployment.
- Final implementation plan deployment section.

## SPIKE-017 - Existing Weak Item Upgrade

### Question

Can Recall content safely upgrade an existing weak AI Brain item, such as a metadata-only Android/Substack capture, without stale chunks or duplicates?

### Phase

Phase C - optional local integration.

### Isolation Requirement

Use synthetic data and isolated DB state unless the user approves a real item.

### Method Requirements

The spike must:

1. Seed a weak item with matching source URL in isolated state.
2. Use synthetic Recall detail with richer body text.
3. Test whether `repairItemWithText()` can be used or adapted.
4. Verify old chunks/vectors/summaries are cleared or requeued.
5. Verify existing strong items are not overwritten.

### Pass Criteria

- Existing weak item is upgraded, not duplicated.
- Stale semantic artifacts are cleared or regenerated.
- Strong existing items are protected.
- User-visible metadata explains Recall upgraded the item.

### Fail Criteria

- Upgrade requires unsafe field-only overwrite.
- Chunks/vectors remain stale.
- The match logic can overwrite unrelated content.

### Default If Inconclusive

Keep weak-item upgrades out of V1.

## SPIKE-019 - Fallback Enumeration

### Question

If REST enumeration fails, can MCP or Markdown export support a trustworthy fallback import or reconciliation workflow?

### Phase

Phase D - fallback evaluation.

### Method Requirements

For MCP:

1. Confirm actual auth flow.
2. Test whether `filter_by_metadata` can list cards by date or equivalent metadata.
3. Test whether `get_document_content` is richer or safer than REST.
4. Document token storage and refresh implications.

For Markdown:

1. Export a small approved Recall sample.
2. Inspect filenames, frontmatter, source URLs, card IDs, timestamps, and body completeness.
3. Check whether Markdown can match REST card IDs or source URLs.
4. Classify the fallback as:
   - automation-ready;
   - semi-automated;
   - manual-only;
   - not viable.

### Pass Criteria

- At least one fallback preserves identity and retrieves useful content safely.
- The fallback classification is explicit.
- Manual-only fallback is not presented as daily automation.

### Fail Criteria

- MCP cannot enumerate safely.
- Markdown lacks stable identifiers.
- Both paths require brittle browser automation with unacceptable privacy/maintenance risk.

### Blocks

- Any fallback implementation plan.

## Final Synthesis Requirements

After all feasible spikes, create:

```text
docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_<timestamp>_IST.md
```

It must include:

1. Gate results table.
2. Spike verdict table.
3. Viable product option:
   - REST snapshot import;
   - REST metadata/partial import;
   - Markdown reconciliation;
   - MCP pull;
   - no production daily sync yet.
4. Blocked options and reasons.
5. Required user decisions.
6. Implementation-plan readiness verdict.
7. PRD readiness verdict.
8. Recommended next artifact.

## User Inputs Needed Before Phase B

Before live Recall API spikes, the user must confirm:

1. Recall API key may be used locally.
2. The approved local key mechanism.
3. Controlled Recall cards may be created or identified.
4. Sample titles may or may not appear in local spike reports.
5. Real content snippets may or may not be stored.

If the user does not provide these, Phase B remains blocked and the final synthesis must say that production REST sync cannot yet be recommended.

## Milestone Exit Criteria

The spike requirements phase is complete when:

1. V2 requirements are created.
2. The user or project owner accepts the Phase A/Phase B gated execution model.
3. Offline spikes are ready to execute without secrets.
4. Live spikes have clear user-input prerequisites.

The full spike phase is complete when:

1. Every feasible spike has a Markdown report.
2. Each report has a clear verdict.
3. The final implementation options artifact exists.
4. A PRD can be written without unresolved enumeration, fidelity, privacy, or scheduler unknowns.
