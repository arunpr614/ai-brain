# **Recall Daily Snapshot Import into AI Brain Global PRD**

**Team:** Personal AI Brain, Recall Integrations
**Author (PM):** Arun Prakash; draft prepared by Codex
**Triad Partners (Design, Engineering):** Design N/A for V1 backend-first flow; Engineering: Codex / Arun
**Legal Contact:** N/A for personal local app; privacy/data-handling review required before production apply
**Applicable Countries:** N/A - personal/internal use
**Market Segments:** N/A - personal/internal use

**Date last edited:** 2026-06-24
**Doc Status:** Draft v1 - pre-adversarial review; live Recall API gates unresolved
**Related Links:**

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

## **Problem Statement**

Arun needs new content added to Recall to appear in AI Brain without manually re-sharing each item. The feature should run as a daily one-way snapshot import that discovers new Recall cards, imports eligible content into AI Brain, and preserves clear provenance and content-fidelity labels. It must avoid false completeness claims, duplicate imports, data leaks, runaway queue pressure, and production cron behavior before live Recall API behavior is proven.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Reduce manual duplicate capture work between Recall and AI Brain.
2. Preserve AI Brain as the searchable and askable personal memory layer for newly saved Recall content.
3. Import Recall content safely with dry-run visibility before first apply.
4. Maintain user trust by labeling Recall imports as snapshots with explicit fidelity states.
5. Keep production safe through caps, idempotency, checkpointing, redaction, rollback, and disabled-by-default scheduling.

## **Success Metrics**

### **Primary Metric**

- At least 95% of controlled new Recall cards created in an approved live test window are discovered by the dry-run and either imported, skipped idempotently, or blocked with a clear reason.

### **Supporting Metrics**

- 0 duplicate AI Brain items for repeated imports of the same Recall card ID.
- 0 unredacted Recall API keys, bearer tokens, signed URL secrets, or full private card bodies in dry-run reports/logs.
- 100% of apply runs preserve checkpoint correctness: no checkpoint advancement after partial failure or cap block.
- First production apply imports no more than the approved cap, default target `max_imports <= 5`.
- 100% of imported Recall items show visible or inspectable provenance as `Imported from Recall`.
- 100% of exactly-50-chunk detail responses are classified as `possibly_truncated` unless live fidelity proof justifies a stronger state.

## **Non-Goals**

- No two-way sync from AI Brain back into Recall.
- No Recall deletion propagation into AI Brain.
- No automatic overwrite of already imported Recall content when the remote card changes.
- No default weak-item upgrade behavior in V1.
- No browser automation as the primary production path.
- No MCP-based cron in V1.
- No claim that long PDFs, long videos, podcasts, or paywalled content are complete unless live fidelity gates prove it.
- No production cron until live enumeration/content fidelity and production CLI packaging are validated.

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
| P0 | As Arun, I want a dry-run that shows which new Recall cards would import so that I can inspect impact before any writes. | Provide a production-capable dry-run CLI that lists planned counts, fidelity states, skips, blocks, caps, and checkpoint window without creating items or advancing checkpoint. Reports must be redacted by default. | Recall REST API key; production CLI packaging; redaction helper. | N/A - CLI/report-first |
| P0 | As Arun, I want new Recall cards imported once into AI Brain so that my memory library stays current without duplicate manual saves. | Import via REST daily pull after GATE-001 and GATE-002 pass. Use `recall_sync_items` for card-ID idempotency. Re-running the same card must not create a duplicate. | SPIKE-013 REST enumeration; SPIKE-014 content fidelity; `src/lib/recall/importer.ts`. | N/A |
| P0 | As Arun, I want imported items to show they came from Recall so that I can trust their provenance. | Imported items use `capture_source='recall'`, Recall extraction method/version, provenance body header, original source URL when present, and fidelity metadata. Library/item detail must render Recall as a known source. | Migration 020; shared `captureSourceLabel()`. | Existing Library/item detail UI |
| P0 | As Arun, I want the job to stop safely on partial failures so that content is not silently missed. | Apply mode must not advance checkpoint after list/detail/import failure, cap overflow, auth failure, or lock conflict. Exit codes must be cron-friendly. | Scheduler/checkpoint runner; `recall_sync_state`. | N/A |
| P0 | As Arun, I want content fidelity labels so that AI Brain does not treat partial Recall chunks as full text. | Classify card detail as `complete_enough_for_daily_import`, `api_chunks_unverified`, `possibly_truncated`, `metadata_only`, or `blocked_unknown`. Exactly 50 chunks defaults to `possibly_truncated`. Metadata-only cards are imported only if product policy allows; otherwise record blocked. | Live SPIKE-014; mapper. | N/A |
| P0 | As Arun, I want secrets and private Recall content protected so that dry-runs and logs do not leak my data. | Redact API keys, bearer headers, signed URL query values, cookies, long content, private titles in default reports, and error stacks. Do not commit real Recall payloads. | Redaction helper; live reporting preference. | N/A |
| P0 | As Arun, I want the first production apply to be capped so that a bad run cannot flood AI Brain. | Apply mode requires max cards/imports/chars/chunks caps. First production apply defaults to low cap and manual invocation. Scheduled mode remains disabled until approved. | Scheduler caps; deployment runbook. | N/A |
| P1 | As Arun, I want optional weak-item upgrade later so that Recall can repair metadata-only AI Brain captures without duplicates. | Keep disabled by default in V1. When explicitly enabled, exact source URL plus weak existing item can be repaired in place. Strong existing items are skipped. | SPIKE-017 done; live fidelity gate; first dry-run candidate report. | Future UI badge optional |
| P1 | As Arun, I want a changed-remote review path so that edited Recall cards do not overwrite AI Brain silently. | If a known Recall card ID returns a changed content hash, record `changed_remote` and do not overwrite V1 item content. Future work may add a review queue. | Importer hash tracking. | Future review UI |
| P1 | As Arun, I want production operations to be clear so that I can disable, dry-run, apply, roll back, and inspect failures. | Provide runbook for env vars, command contract, dry-run/apply, backup, logs, smoke checks, emergency disable, rollback, and restore. | SPIKE-020; production CLI. | N/A |
| P2 | As Arun, I want MCP/export fallback options if REST fails so that the project still has a recovery path. | Document fallback options; do not implement MCP/export cron in V1 unless REST live gates fail and fallback spike is approved. | SPIKE-019 conditional. | N/A |
| P3 | As Arun, I want canonical URL matching so that Recall can repair more duplicates safely. | Future PRD required. Exact URL only in V1. No heuristic matching without review. | Canonicalization research. | N/A |
| P4 | As Arun, I want browser automation fallback only if every developer integration fails. | Browser automation is last resort and not production V1. | Explicit owner approval. | N/A |

---

# **Milestones / Sequencing Plan**

*The milestones and sequencing plan should trace the scoped requirements from this PRD to the JPD Ideas tracking the work, through to full GA. Some PRDs will map to a single JPD Idea and release; others will span multiple. Each JPD Idea = one milestone = one release. Attach this PRD (in shareable format) to each applicable JPD Idea, and ensure GA dates are maintained at the JPD level.*

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **JPD Idea #1 - Live Recall API validation** | SPIKE-013 and SPIKE-014 run against controlled Recall cards. No production import. | N | Tier 4 - Non-Customer Facing | TBD after user API-key approval | N/A |
| **JPD Idea #2 - REST dry-run CLI** | Production-packaged CLI supports read-only dry-run, redacted reports, caps, checkpoint windows, and no writes. | N | Tier 4 - Non-Customer Facing | TBD after PRD v2 and plan v2 | N/A |
| **JPD Idea #3 - Manual capped apply** | Apply mode imports approved small batch with idempotency, provenance, fidelity labels, checkpoint safety, and queue integration. | N | Tier 4 - Non-Customer Facing | TBD after live gates pass | N/A |
| **JPD Idea #4 - Scheduled daily job** | Disabled-by-default scheduled daily apply is enabled only after repeated clean dry-runs/manual apply and production runbook approval. | N | Tier 4 - Non-Customer Facing | TBD after manual apply validation | N/A |
| **JPD Idea #5 *(if applicable)* - Optional weak-item upgrade** | Exact source-URL weak-item upgrades enabled after separate approval and dry-run candidate review. | N | Tier 4 - Non-Customer Facing | Future | N/A |

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
| **Built-in consent mechanism** | Production apply requires owner approval and local API-key setup. No end-user consent UI in V1. | Y |
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
| Recall content chunks / imported body | Mandatory for full import; blocked/metadata-only if absent or unsafe | `items.body`; not printed in reports by default | Persistent |
| Recall image URL / thumbnail | Optional | `items.thumbnail_url`, `recall_sync_items.recall_image_url` | Persistent |
| Sync reports and errors | Mandatory for operation | `recall_sync_runs.report_json`, logs, `data/errors.jsonl` if used | Persistent or log-retention-bound |

---

## **Ideal User Experience**

*When to use: When coming up with a new product experience where the user flow is not immediately clear. Especially helpful for gaining alignment on experiences that span multiple product surfaces.*

### **User Flows**

1. Arun creates controlled sample cards in Recall and approves API-key handling for live dry-run.
2. Codex/operator runs a dry-run over a narrow date window.
3. Dry-run report shows counts, fidelity classes, skipped/blocked reasons, and redacted examples.
4. Arun approves a small capped apply.
5. Apply imports eligible Recall snapshots into AI Brain.
6. AI Brain Library shows imported items as `via Recall`.
7. Item detail shows Recall provenance and content-fidelity warning when applicable.
8. Existing enrichment and embedding queues make eligible imports searchable and askable.
9. Scheduler remains disabled until multiple clean runs and runbook validation.

### **Wireframes / Mockups (Optional)**

N/A for V1. Existing Library and item detail surfaces are reused. Future weak-upgrade UX may need a visible `Upgraded by Recall` badge.

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

---

## **Risks & Mitigations**

*When to use: When risks to the agreed-upon direction arise, document them and the mitigation plan to keep stakeholders aligned.*

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Recall `/cards` enumeration misses cards despite docs | High | Medium | Run SPIKE-013 with controlled cards before PRD approval for production apply. Do not enable cron without proof. |
| Card detail chunks are partial for long PDFs/videos | High | High | Run SPIKE-014; classify 50-chunk responses as `possibly_truncated`; avoid full-text claims. |
| API key or private content leaks in logs/reports | High | Medium | Redaction helper, no raw payload fixtures, default private title/content redaction, secret scan before sharing reports. |
| First apply floods AI Brain or queues | High | Medium | Hard caps, manual first apply, dry-run before apply, low initial `max_imports`. |
| Checkpoint advances after partial failure | High | Medium | Existing scheduler tests; production implementation must preserve no-advance invariant. |
| Duplicate items from repeated runs | High | Low after offline tests | `recall_sync_items` card-ID idempotency and source-URL skip policy. |
| Weak upgrade overwrites good AI Brain content | High | Low if disabled | Keep disabled by default; exact URL and weak-policy gate only; strong items skip. |
| Production CLI fails because deploy package lacks TS source | High | Medium | Implement production-safe JS/bundled CLI and verify on Hetzner before cron. |
| User misreads snapshot as true sync | Medium | Medium | Use "snapshot import" wording; no deletion/update promises. |
| MCP/export fallback becomes operationally messy | Medium | Medium | Keep fallback conditional; use separate SPIKE-019 if REST fails. |
