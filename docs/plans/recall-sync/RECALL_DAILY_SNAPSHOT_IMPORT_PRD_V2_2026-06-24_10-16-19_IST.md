# **Recall Daily Snapshot Import into AI Brain Global PRD**

**Team:** Personal AI Brain, Recall Integrations
**Author (PM):** Arun Prakash; draft prepared by Codex
**Triad Partners (Design, Engineering):** Design N/A for V1 backend-first flow; Engineering: Codex / Arun
**Legal Contact:** N/A for personal local app; privacy/data-handling review required before production apply
**Applicable Countries:** N/A - personal/internal use
**Market Segments:** N/A - personal/internal use

**Date last edited:** 2026-06-24
**Doc Status:** Revised v2 after adversarial review; live Recall API gates remain pre-implementation blockers
**Related Links:**

- `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_2026-06-24_10-13-04_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_ADVERSARIAL_REVIEW_2026-06-24_10-14-55_IST.md`
- `docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V2_2026-06-24_09-13-12_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_2026-06-24_10-09-20_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`
- `docs/plans/spikes/SPIKE-015-recall-privacy-fixtures-2026-06-24_09-19-39_IST.md`
- `docs/plans/spikes/SPIKE-016-recall-import-fixture-2026-06-24_09-25-55_IST.md`
- `docs/plans/spikes/SPIKE-017-recall-weak-item-upgrade-2026-06-24_10-07-17_IST.md`
- `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-2026-06-24_09-51-39_IST.md`
- `docs/plans/spikes/SPIKE-020-recall-deployment-operability-2026-06-24_09-57-15_IST.md`
- [Recall REST API](https://docs.recall.it/developer/api)
- [Recall MCP Server](https://docs.recall.it/developer/mcp)

---

# **Overview**

## **Context & Insights**

- Arun uses Recall as a read-it-later and knowledge-capture app for YouTube, PDFs, notes, web articles, and other content.
- AI Brain / AI Memory is the long-term personal memory system. Today, new Recall content does not automatically appear in AI Brain.
- Recall's current developer docs expose a read-only REST API for cards, card detail chunks, and semantic search. This makes a server-side daily pull plausible.
- Current Recall REST docs say `GET /api/v1/cards` supports `date_from` and `date_to`. An older empirical live-account probe found incomplete enumeration behavior. This conflict is the central live gate.
- Offline spikes proved AI Brain can accept `capture_source='recall'`, store Recall provenance, import synthetic cards through the existing capture/enrichment path, enforce checkpoint safety, redact reports, and optionally upgrade weak existing items.
- Production readiness is still blocked by live API proof and CLI packaging. Hetzner deployment does not currently ship the full TypeScript source tree or dev dependencies, so a production-safe JS CLI bundle/script is required.
- V2 incorporates adversarial review changes: 100% controlled-card discovery gate, concrete sample-card protocol, fidelity decision matrix, production packaging acceptance criteria, persistent report privacy rules, and first-apply backup/rollback requirements.

## **Problem Statement**

Arun needs new content added to Recall to appear in AI Brain without manually re-sharing each item. The feature should run as a daily one-way snapshot import that discovers new Recall cards, imports eligible content into AI Brain, and preserves clear provenance and content-fidelity labels. It must avoid false completeness claims, duplicate imports, data leaks, runaway queue pressure, and production cron behavior before live Recall API behavior is proven with controlled cards.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Reduce manual duplicate capture work between Recall and AI Brain.
2. Preserve AI Brain as the searchable and askable personal memory layer for newly saved Recall content.
3. Import Recall content safely with dry-run visibility before first apply.
4. Maintain user trust by labeling Recall imports as snapshots with explicit fidelity states.
5. Keep production safe through caps, idempotency, checkpointing, redaction, backup, rollback, and disabled-by-default scheduling.

## **Success Metrics**

### **Primary Metric**

- Live validation discovers 100% of controlled Recall cards created for the approved test window, with no unexplained `total_count`, date-filter, result-cap, or pagination mismatch.

### **Supporting Metrics**

- 0 duplicate AI Brain items for repeated imports of the same Recall card ID.
- 0 unredacted Recall API keys, bearer tokens, signed URL secrets, cookies, or full private card bodies in CLI output, logs, dry-run reports, or `recall_sync_runs.report_json`.
- 100% of apply runs preserve checkpoint correctness: no checkpoint advancement after partial failure, cap block, auth failure, lock conflict, or unexpected API ambiguity.
- First production apply imports no more than the approved cap, default target `max_imports <= 5`.
- 100% of imported Recall items show visible or inspectable provenance as `Imported from Recall`.
- 100% of exactly-50-chunk detail responses are classified as `possibly_truncated` unless live fidelity proof and explicit user approval justify a stronger state.
- 100% of `possibly_truncated`, `metadata_only`, and `api_chunks_unverified` items are either visibly labeled before Ask/Search use or excluded from Ask/Search retrieval until labeling exists.

## **Non-Goals**

- No two-way sync from AI Brain back into Recall.
- No Recall deletion propagation into AI Brain.
- No automatic overwrite of already imported Recall content when the remote card changes.
- No default weak-item upgrade behavior in V1.
- No browser automation as the primary production path.
- No MCP-based cron in V1.
- No claim that long PDFs, long videos, podcasts, or paywalled content are complete unless live fidelity gates prove it.
- No production cron until live enumeration/content fidelity, production CLI packaging, redaction, and first-apply runbook gates are validated.

---

# **User Personas / Stakeholders**

*Define key user personas and stakeholders of your feature:*

## **Users**

- Arun / AI Brain owner Persona:
  - Saves content into Recall across articles, PDFs, videos, and notes.
  - Wants AI Brain to become the complete personal memory layer without repetitive manual capture.
  - Cares more about trust, provenance, and recoverability than invisible automation.
- Future AI agent / maintainer Persona:
  - Needs clear run reports, tracker state, docs, and failure modes to continue development safely.
  - Needs secrets and private Recall content protected by default.
- AI Brain Ask/Search user Persona:
  - Expects imported Recall content to be searchable and citeable only when content fidelity is sufficient.
  - Needs weak or partial Recall imports to be labeled honestly so answers are not overtrusted.

---

# **Requirements**

- **User Stories:** How users interact with the capability
- **Requirements:** The capability that must exist, along with the behavioral conditions that define correct behavior and when the work is "done"
  - List your user stories and acceptance criteria. [How to write user stories](https://www.atlassian.com/agile/project-management/user-stories)
  - Assign a priority level: P0 = tablestake/MVP, P1/P2 = iterative improvements, P3/P4 = future sequencing
- **Mock ups & Prototypes (Magic Patterns, v0):** Share initial look & feel to illustrate ideas clearly

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | As Arun, I want a live validation dry-run that proves Recall enumeration before import so that daily automation cannot silently miss cards. | Run SPIKE-013 against at least five controlled cards: short note, article, YouTube, PDF, and long/truncation candidate. Record expected private card list locally. Pass only if 100% of controlled cards appear in the API result window and no result cap/pagination/date mismatch is unexplained. | User-approved API-key handling; controlled sample cards; `scripts/spikes/recall-rest-enumeration.ts`. | N/A - CLI/report-first |
| P0 | As Arun, I want content-fidelity decisions per content type so that AI Brain does not treat partial Recall chunks as full text. | Run SPIKE-014 and classify each representative content type. Apply the fidelity decision matrix in Technical Considerations. Exactly 50 chunks defaults to `possibly_truncated`. Long PDF/video content is blocked from Ask/Search unless warning visibility or exclusion policy is implemented. | Recall detail endpoint; mapper; Ask/Search gating decision. | N/A |
| P0 | As Arun, I want a dry-run that shows which new Recall cards would import so that I can inspect impact before any writes. | Provide a production-capable dry-run CLI that lists planned counts, fidelity states, allowed skip reasons, blocked reasons, caps, and checkpoint window without creating items or advancing checkpoint. Reports must be redacted by default. | Recall REST API key; production CLI packaging; redaction helper. | N/A |
| P0 | As Arun, I want new Recall cards imported once into AI Brain so that my memory library stays current without duplicate manual saves. | Import via REST daily pull only after live gates pass. Use `recall_sync_items` for card-ID idempotency. Re-running the same card must not create a duplicate. Changed remote cards are recorded and not overwritten. | SPIKE-013; SPIKE-014; `src/lib/recall/importer.ts`. | N/A |
| P0 | As Arun, I want imported items to show they came from Recall so that I can trust their provenance. | Imported items use `capture_source='recall'`, Recall extraction method/version, provenance body header, original source URL when present, and fidelity metadata. Library/item detail must render Recall as a known source. | Migration 020; shared `captureSourceLabel()`. | Existing Library/item detail UI |
| P0 | As Arun, I want the job to stop safely on partial failures so that content is not silently missed. | Apply mode must not advance checkpoint after list/detail/import failure, cap overflow, auth failure, lock conflict, unexpected result-count mismatch, or fidelity ambiguity requiring review. Exit codes must be cron-friendly. | Scheduler/checkpoint runner; `recall_sync_state`. | N/A |
| P0 | As Arun, I want secrets and private Recall content protected so that dry-runs and logs do not leak my data. | Redact API keys, bearer headers, signed URL query values, cookies, long content, private titles in default reports, and error stacks. `recall_sync_runs.report_json` stores redacted summaries only. No real Recall payload fixtures may be committed. | Redaction helper; live reporting preference. | N/A |
| P0 | As Arun, I want the first production apply to be capped and rollbackable so that a bad run cannot flood AI Brain. | Before first apply: create fresh DB backup, verify backup integrity or restore path, document rollback command, run dry-run, and cap first apply to approved small batch. Apply report must include imported item IDs and fidelity classes. | Backup tooling; deployment runbook; scheduler caps. | N/A |
| P0 | As Arun, I want the production command to actually run on Hetzner so that cron does not depend on local dev tooling. | Deploy artifact must include production-safe JS/bundled CLI, e.g. `scripts/sync-recall-prod.mjs`. Remote smoke must prove it runs as `brain` user after sourcing `/etc/brain/.env` without TypeScript source or dev dependencies. | SPIKE-020; deploy script update. | N/A |
| P1 | As Arun, I want optional weak-item upgrade later so that Recall can repair metadata-only AI Brain captures without duplicates. | Keep disabled by default in V1. When explicitly enabled, exact source URL plus weak existing item can be repaired in place. Strong existing items are skipped. First dry-run must show upgrade candidates and require approval. | SPIKE-017; live fidelity gate; candidate report. | Future UI badge optional |
| P1 | As Arun, I want allowed skip/block reasons separated so that a run cannot look successful while importing nothing useful. | Track and report idempotent existing Recall card, strong source-URL skip, changed remote, cap-block, unsupported content, metadata-only block, and API ambiguity as separate outcomes. Only idempotent existing cards and already-strong exact URL matches count as acceptable skips. | Sync-run report schema. | N/A |
| P1 | As Arun, I want production operations to be clear so that I can disable, dry-run, apply, roll back, and inspect failures. | Provide runbook for env vars, command contract, dry-run/apply, backup, logs, smoke checks, emergency disable, rollback, and restore. | SPIKE-020; production CLI. | N/A |
| P2 | As Arun, I want MCP/export fallback options if REST fails so that the project still has a recovery path. | Document fallback options; do not implement MCP/export cron in V1 unless REST live gates fail and fallback spike is approved. | SPIKE-019 conditional. | N/A |
| P3 | As Arun, I want canonical URL matching so that Recall can repair more duplicates safely. | Future PRD required. Exact URL only in V1. No heuristic matching without review. | Canonicalization research. | N/A |
| P4 | As Arun, I want browser automation fallback only if every developer integration fails. | Browser automation is last resort and not production V1. | Explicit owner approval. | N/A |

---

# **Milestones / Sequencing Plan**

*The milestones and sequencing plan should trace the scoped requirements from this PRD to the JPD Ideas tracking the work, through to full GA. For this personal AI Brain project, the rows below are JPD-equivalent local milestones mapped to tracker tasks rather than real Toast JPD Ideas.*

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **RDS-013 / RDS-014 - Live Recall API validation** | Controlled-card enumeration and content-fidelity spikes. No production import. | N | Tier 4 - Non-Customer Facing | TBD after user API-key approval | N/A |
| **RDS-023 - REST dry-run CLI plan** | Implementation plan defines production-packaged dry-run CLI, redacted reports, caps, checkpoint windows, and no-write behavior. | N | Tier 4 - Non-Customer Facing | TBD after plan v2 | N/A |
| **RDS-026a - Production dry-run CLI implementation** | Production-safe CLI runs locally and on Hetzner in dry-run mode without writes or checkpoint advancement. | N | Tier 4 - Non-Customer Facing | TBD after live gates pass | N/A |
| **RDS-026b - Manual capped apply** | Apply mode imports approved small batch with backup/rollback, idempotency, provenance, fidelity labels, checkpoint safety, and queue integration. | N | Tier 4 - Non-Customer Facing | TBD after dry-run validation | N/A |
| **RDS-027 - Scheduled daily job** | Disabled-by-default scheduled daily apply is enabled only after repeated clean dry-runs/manual apply and production runbook approval. | N | Tier 4 - Non-Customer Facing | TBD after manual apply validation | N/A |
| **Future - Optional weak-item upgrade** | Exact source-URL weak-item upgrades enabled after separate approval and dry-run candidate review. | N | Tier 4 - Non-Customer Facing | Future | N/A |

---

# **Additional Components & Resources**

*The sections below are conditionally required based on the nature of the work. Use them when the scope requires it.*

---

## **Legal: Risk Checklist**

*When to use: If the work touches any of these areas, flag all risks and dependencies. Your legal partner will advise on next steps for any features that intersect with these product areas.*

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | AI Brain saves imported Recall snapshots as persistent local items. | Y |
| **Card Linking** | No Toast card linking. Recall card IDs are linked to AI Brain item IDs in local DB. | N |
| **Loyalty Program** | Not applicable. | N |
| **Guest Checkout** | Not applicable. | N |
| **Toast User Auth** | Not applicable. | N |
| **Marketing/Ads** | Not applicable. | N |
| **Built-in consent mechanism** | Production apply requires owner approval and local API-key setup. No public end-user consent UI in V1. | Y |
| **Guest Book feed-in functionality** | Not applicable. | N |
| **Digital Receipts** | Not applicable. | N |
| **Feedback Loop to Merchant** | Not applicable. | N |
| **Feedback Loop to Toast** | Not applicable. | N |

---

## **Legal: Personal Data Processed**

*When to use: Is this a new product or a change that results in any data capture changes from users? If so, review with Legal.*

| Information field ([examples here](https://docs.google.com/document/d/1NG_ZNIP-FbkUgFEE2aRDfioCVdl-Vd3bLEoYNM7Fqug/edit#bookmark=kix.r84rhq5snhfh)) | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| Recall API key | Mandatory for live REST dry-run/apply | `/etc/brain/.env` or approved local ignored env during spikes | Persistent until rotated/deleted |
| Recall card ID | Mandatory for idempotency | `recall_sync_items.recall_card_id` | Persistent |
| Recall title | Mandatory when API provides it; redacted from reports by default | `items.title`, `recall_sync_items.recall_title` | Persistent |
| Recall source URL | Optional depending on card | `items.source_url`, `recall_sync_items.recall_source_url` | Persistent |
| Recall content chunks / imported body | Mandatory for full import; blocked/metadata-only if absent or unsafe | `items.body`; never stored in run reports by default | Persistent |
| Recall image URL / thumbnail | Optional | `items.thumbnail_url`, `recall_sync_items.recall_image_url` | Persistent |
| Sync reports and errors | Mandatory for operation | `recall_sync_runs.report_json`, logs, `data/errors.jsonl` if used | Persistent or log-retention-bound; redacted summaries only by default |

Data-handling rules:

- `recall_sync_runs.report_json` must not contain full chunks, raw API responses, API keys, bearer headers, cookies, or signed URL query secrets.
- Dry-run reports may include redacted IDs, counts, statuses, fidelity states, and redacted titles only.
- Full Recall content is persisted only in `items.body` for approved imports.
- Real Recall fixtures and API responses must not be committed.

---

## **Ideal User Experience**

*When to use: When coming up with a new product experience where the user flow is not immediately clear. Especially helpful for gaining alignment on experiences that span multiple product surfaces.*

### **User Flows**

1. Arun creates controlled sample cards in Recall and approves API-key handling for live dry-run.
2. Codex/operator records the expected private sample-card set locally.
3. Codex/operator runs SPIKE-013 over a narrow date window with overlap.
4. Dry-run must discover 100% of controlled cards or block the project.
5. Codex/operator runs SPIKE-014 to classify content fidelity for each sample card.
6. Dry-run report shows counts, allowed skip reasons, blocked reasons, fidelity classes, and redacted examples.
7. Arun approves a small capped apply only after dry-run, backup, and rollback are ready.
8. Apply imports eligible Recall snapshots into AI Brain.
9. AI Brain Library shows imported items as `via Recall`.
10. Item detail shows Recall provenance and content-fidelity warning when applicable.
11. Ask/Search includes partial/unverified items only if warning visibility or exclusion policy is implemented.
12. Scheduler remains disabled until multiple clean runs and runbook validation.

### **Wireframes / Mockups (Optional)**

N/A for V1. Existing Library and item detail surfaces are reused. If `possibly_truncated` or `api_chunks_unverified` items are allowed into Ask/Search, a visible warning in item detail and Ask source metadata becomes required before scheduled apply.

---

## **Technical Considerations**

*When to use: Capture important technical constraints, dependencies, and tradeoffs that may impact decisions or implementation.*

- Recall REST API is read-only. V1 is one-way import only.
- API base URL: `https://backend.getrecall.ai/api/v1`.
- REST auth uses `Authorization: Bearer <RECALL_API_KEY>`.
- `GET /api/v1/cards` supports documented `date_from` and `date_to`, but live behavior must be proven.
- `GET /api/v1/cards/{card_id}` returns chunks with `max_chunks` 1-50.
- Use `insertCaptured()` or Recall importer service rather than public capture routes.
- Store Recall sync state in `recall_sync_items`, `recall_sync_runs`, and `recall_sync_state`.
- Keep `capture_source='recall'` and shared capture-source labels.
- Checkpoint only after fully successful apply.
- Use lock row to prevent overlapping runs.
- Use caps for card count, import count, total chars, and total chunks.
- Use redaction helper for logs and dry-run reports.
- Production CLI must be packaged as deployable JS or bundled artifact. Current Hetzner deploy does not ship full TypeScript source or dev dependencies.
- Optional weak-item upgrade exists locally but must remain disabled by default.
- No real Recall fixtures should be committed.

Live validation protocol:

| Sample | Required setup | Pass criterion |
|---|---|---|
| Short note | New Recall note with unique sentinel title/text | Listed by date window; detail returns usable text or explicit metadata-only classification |
| Web article | New article/card with source URL | Listed by date window; detail chunks ordered and coherent enough for `api_chunks_unverified` or better |
| YouTube/video | New video card | Listed by date window; detail chunks/timestamps classified; no full-transcript claim unless proven |
| PDF | New PDF card | Listed by date window; page/source markers inspected if available; long/partial content blocked or warning-gated |
| Long/truncation candidate | Card likely to hit 50 chunks | Listed by date window; exactly-50 chunks classified `possibly_truncated` |

Fidelity decision matrix:

| Fidelity state | V1 import policy | Ask/Search policy | User-visible treatment |
|---|---|---|---|
| `complete_enough_for_daily_import` | Import | Eligible | Normal Recall provenance |
| `api_chunks_unverified` | Import only after live sample review | Eligible only if warning visible in item detail or Ask source metadata | Show unverified Recall snapshot |
| `possibly_truncated` | Import only with explicit approval or block by default for long content | Exclude from Ask/Search unless warning is visible before retrieval/citation | Show possibly truncated |
| `metadata_only` | Block by default unless user explicitly accepts metadata-only snapshots | Not eligible for Ask/Search | Show metadata-only / needs upgrade |
| `blocked_unknown` | Do not create item | Not eligible | Record blocked reason in sync report |

Allowed skip/block taxonomy:

- Acceptable skip: same Recall card ID already imported with same content hash.
- Acceptable skip: exact source URL already exists as a strong AI Brain item and weak-upgrade mode is disabled or not applicable.
- Not success: changed remote content hash; record for future review.
- Safe block: cap exceeded before writes.
- Safe block: unsupported or ambiguous API shape.
- Safe block: metadata-only or `blocked_unknown` content under V1 default policy.

Production CLI packaging acceptance:

- Deploy artifact contains `scripts/sync-recall-prod.mjs` or equivalent bundled JS.
- Remote file check passes under `/opt/brain`.
- Remote dry-run starts under `brain` user after sourcing `/etc/brain/.env`.
- CLI does not require `tsx`, TypeScript source, or dev dependencies.
- Deploy script intentionally copies the CLI and runtime dependencies.

First apply safety:

- Fresh DB backup exists before apply.
- Backup integrity/restore path is verified before apply.
- Dry-run report is reviewed before apply.
- First apply uses low import cap, default `max_imports <= 5`.
- Apply report records imported item IDs and fidelity states.
- Rollback command/path is documented before apply.

---

## **Risks & Mitigations**

*When to use: When risks to the agreed-upon direction arise, document them and the mitigation plan to keep stakeholders aligned.*

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Recall `/cards` enumeration misses cards despite docs | High | Medium | SPIKE-013 requires 100% controlled-card discovery and no unexplained cap/date mismatch. |
| Card detail chunks are partial for long PDFs/videos | High | High | SPIKE-014 plus fidelity matrix; exactly-50 chunks become `possibly_truncated`; Ask/Search warning or exclusion required. |
| API key or private content leaks in logs/reports | High | Medium | Redaction helper, redacted `report_json`, no raw payload fixtures, secret/privacy scan before sharing reports. |
| First apply floods AI Brain or queues | High | Medium | Hard caps, manual first apply, dry-run before apply, backup/rollback, low initial `max_imports`. |
| Checkpoint advances after partial failure | High | Medium | Existing scheduler tests; production implementation must preserve no-advance invariant and block on ambiguity. |
| Duplicate items from repeated runs | High | Low after offline tests | `recall_sync_items` card-ID idempotency and exact source-URL skip policy. |
| Weak upgrade overwrites good AI Brain content | High | Low if disabled | Keep disabled by default; exact URL and weak-policy gate only; strong items skip. |
| Production CLI fails because deploy package lacks TS source | High | Medium | Production-safe JS/bundled CLI and remote smoke before cron. |
| User misreads snapshot as true sync | Medium | Medium | Use "snapshot import" wording; no deletion/update promises. |
| MCP/export fallback becomes operationally messy | Medium | Medium | Keep fallback conditional; use separate SPIKE-019 if REST fails. |
