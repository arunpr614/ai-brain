# Semantic Event and Graph-Input Lifecycle Matrix

**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Verified:** 2026-07-12  
**Purpose:** Close audit-v1 review findings P1-02 and P2-05. This is current-state evidence, not a proposed graph schema.

## `item_semantic_events` current coverage

Migration `src/db/migrations/023_source_aware_chunks.sql:59-76` creates a content-free future graph-refresh integration contract. `src/lib/notes/semantic-events.ts:5-27` writes events. No graph consumer exists.

| Source kind | Indexed producer | Purged producer | Deletion/replace path | Test evidence | Current coverage |
|---|---|---|---|---|---|
| `manual_note` | Note index worker after source-aware chunk/vector write; direct `indexed` event assertion exists | Note semantic purge/re-index path emits `purged` in source; purge removes chunks in tests, but the event action is not directly asserted | Note delete, consent/policy change, and replacement are handled by note pipeline | `src/lib/queue/note-index-worker.test.ts`: direct `indexed` assertion; purge behavior test without a `purged`-event assertion | `indexed`: implemented/tested. `purged`: implemented but event assertion absent. Feature-flagged and consent/policy gated. |
| `original_content` | None found | None found | Original-content replacement/deletion updates item/chunk/vector state through other paths | No semantic-event producer test found | Missing from event contract |
| `ai_summary` | None found | None found | Enrichment/re-enrichment and item deletion use other pipeline paths | No semantic-event producer test found | Missing from event contract |
| `legacy_item_context` | None found | None found | Legacy chunk migration/repair uses other paths | No semantic-event producer test found | Missing from event contract |

### Contract status

- Schema: implemented.
- Manual-note producer: `indexed` is implemented and directly tested; `purged` is implemented and the purge outcome is tested, but the event action lacks a direct assertion. This documentation-only goal does not add production tests, so that evidence remains **Unknown/non-passing** for implementation selection.
- Other source producers: absent.
- Consumer: absent.
- Delivery guarantees, replay, gap detection, retention, and ordering contract: not defined for a graph consumer.
- Item deletion cascades both semantic events and note jobs with the item. A lagging consumer therefore cannot rely on the current event table as a durable deletion tombstone. Any future consumer needs an owner-table watermark/reconciliation strategy or a durable tombstone outside the cascading rows.

**No-go rule:** no graph refresh design may describe `item_semantic_events` as a complete invalidation bus until every included source kind and delete/rebuild path has tested coverage or an explicitly different watermark strategy.

## Candidate graph-input eligibility and lifecycle

| Candidate input | Current source of truth | Minimum eligibility | Privacy/consent boundary | Change/invalidation signal today | Delete/purge behavior | Safe current classification |
|---|---|---|---|---|---|---|
| Item identity/title/source | `items` | Saved item; title/source may exist even for weak capture | Owner-private; titles/URLs are sensitive in aggregate | Item create/update/repair/delete paths; no unified graph event | Item deletion cascades feature-specific rows; capture artifacts are separate | Deterministic node input, subject to redaction and source-quality display |
| Manual tag membership | `tags`, `item_tags` | Existing canonical tag and membership | User-authored organization | Tag attach/detach/rename/merge/delete actions | Join cleanup/delete | Deterministic extracted edge; rename/merge invalidation required |
| AI auto-tag membership | `tags`, `item_tags`, `kind=auto` | Successful enrichment | Model-generated; no separate relationship consent | Enrichment and repair/re-enrichment | Join cleanup/delete | Model-extracted label membership; not user-asserted fact |
| Topic membership | `topics`, `item_topics` | Successful enrichment | Model-generated | Enrichment replacement | Item/topic join cleanup | Current labels mirror auto-tags; confidence null and evidence generic; weak graph evidence |
| Collection membership | `collections`, `item_collections` | Explicit membership | User-authored organization | Collection add/remove/delete | Join cleanup/delete | Deterministic extracted edge |
| Original content chunks | `chunks`, vector tables, source-aware metadata | Full/usable source and successful index | Existing capture/privacy boundary | Embedding queue/version state; no semantic event | Item/chunk/vector cleanup | Retrieval evidence; graph use needs source-quality and epoch/version watermark |
| AI summary chunks | `chunks`, source kind/version | Successful enrichment/index | Provider/model-derived | Enrichment/index state; no semantic event | Item/chunk/vector cleanup | Derived evidence; never independent fact |
| Manual-note chunks | note tables, source-aware chunks | Note AI opt-in, rollout flags, provider eligibility, successful index | Per-note consent and provider policy | `item_semantic_events`; `indexed` directly asserted, `purged` source-implemented but event assertion absent | Note delete/consent/policy purge; item cascade removes jobs/events and is not a durable deletion tombstone | Eligible only while consent/policy remains active; event completeness is non-passing |
| Related-item similarity | Query-time centroids over eligible vectors | Both items have eligible current vectors | Note-derived vectors obey consent/policy | Recomputed on request; no durable edge/event | Disappears when vectors/items are removed | Transient score, not a stored edge; any snapshot needs threshold/version/staleness |
| Chat citation | `chat_messages.citations` and item/chunk IDs | Persisted message with valid cited source | Private conversation; model/retrieval-derived | Chat/message lifecycle; no graph event | Thread/message deletion behavior governs | Evidence link only; not claim truth or accepted evidence |
| Same normalized source URL | Item canonical URL/duplicate policy | Valid normalized URL on two records | URLs sensitive in aggregate | Capture/update/repair | Item deletion | Possible deterministic relation, but duplicate policy may collapse rather than connect |
| Source anchor | No implemented owner record | Not available | Unknown | None | None | Exclude; FCP-002 prerequisite not implemented |
| Accepted claim evidence | No implemented FCP-003 record | Not available | Unknown | None | None | Exclude; FCP-003 prerequisite not implemented |
| Workflow events | Processing projection/events | Item enrolled and workflow flags enabled | Operational state, not semantic meaning | Append-only workflow events | Item lifecycle/receipts | Exclude from semantic graph unless a separate user problem is proven |

## Required lifecycle proof before persisted relationships

1. Every included source has a canonical owner record and eligibility function.
2. Every update, repair, re-enrichment, consent change, index-version change, and deletion either emits a durable invalidation event or advances a complete source watermark.
3. Derived edges store source kind, evidence reference, origin class, algorithm/model version, confidence, creation time, and source version.
4. Rebuild from owner records produces the same eligible projection; no graph-only fact is required.
5. Consent-revoked, deleted, weak-ineligible, or superseded data disappears from both visual and non-visual views.
6. Partial refresh, dropped event, stale snapshot, and rebuild failure are visible without logging private titles/content.
7. Item deletion is recovered from a durable tombstone or complete owner-table watermark; a cascading event row is not sufficient.
