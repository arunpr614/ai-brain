# Kanban Card Processing — relevant code map
**Baseline:** `5b92e68` (`origin/main`, 2026-07-12)
**Purpose:** implementation navigation map; symbols and lines refer to this baseline
**Legend:** **modify** = likely implementation seam; **regress** = behavior that must remain unchanged; **reference** = convention to reuse; **gap** = required capability absent today.

## Primary implementation path

```text
all genuine new captures
  -> src/db/items.ts::insertCaptured
  -> SQLite items row
  -> existing FTS/enrichment/transcript triggers

Processing read
  -> new processing repository (bounded DTO/count/filter/cursor queries)
  -> new /processing server page + client mutation surface

Processing write
  -> new cookie-authenticated exact-origin route
  -> workflow repository transaction (CAS + mutation receipt + event)
  -> items workflow projection + item_workflow_events
```

## 1. Shell and navigation

| File/symbol | Current responsibility/evidence | Kanban use |
|---|---|---|
| `src/app/layout.tsx:52-94` `RootLayout` | Shared theme, service worker, native share handler, responsive shell, private count | **regress**; Processing remains inside shell |
| `src/components/sidebar.tsx:30-43` `PRIMARY_ITEMS` | Desktop Library/Needs Upgrade/Ask/Settings definitions | **modify** for desktop Processing entry |
| `src/components/sidebar.tsx:91-304` `Sidebar` | Desktop rail and mobile bottom nav | **modify/reference** for mobile discovery and safe-area behavior |
| `src/components/sidebar-routing.ts:1-60` | Route-to-active-navigation mapping | **modify** for `/processing` and children |
| `src/app/more/page.tsx:82-126` | Mobile More destinations | **modify** if approved mobile entry is More |
| `src/app/page.tsx:1-5` | `/` → `/library` | **regress** unless approved product explicitly changes landing |
| `src/components/command-palette.tsx` | Global `cmdk` search/navigation | **modify** if Processing command is required |

## 2. Library and Processing UI reuse

| File/symbol | Current responsibility/evidence | Kanban use |
|---|---|---|
| `src/app/library/page.tsx:17-89` | Auth, source/quality/tag filter parsing, counts, first 100 items | **reference/regress**; do not extend into Processing query |
| `src/app/library/page.tsx:91-285` | Header/search/desktop+mobile filters/empty states | **reference** for density/copy/state patterns |
| `src/components/library-list.tsx:106-193` `LibraryList` | Local selection and bulk tag/collection/Ask state | **reference** for local pending/error; avoid copying client quality filter duplication |
| `src/components/library-list.tsx:223-378` | Responsive cards/rows and canonical detail links | **reference** for source metadata and route links |
| `src/components/library-list.tsx:438-577` `BulkBar` | Responsive fixed bulk toolbar | **regress**; v1 Processing has no batch write in prior technical contract |
| `src/components/mobile-library-filters.tsx:14-202` | Mobile filter sheet | **reference with caution**; it lacks evident focus containment/restoration |
| `src/db/items.ts:125-267` `ListItemsOptions`, `libraryWhere`, `listItems`, `countItems` | Offset/full-row Library query and single tag-name `EXISTS` filter | **regress/reference**; new Processing repository needs keyset/bounded DTO/multi-facet IDs |
| `src/app/search/page.tsx`, `src/app/api/search/route.ts:21-59` | Canonical search surfaces | **regress**; workflow archive must not remove search results |

**New likely files (names subject to final technical plan):**

- `src/app/processing/page.tsx`
- `src/components/processing-*.tsx`
- `src/db/item-workflow.ts`
- `src/lib/processing/{filters,cursor,transitions,metrics}.ts`
- `src/app/api/processing/{summary,items,mutations,enrollment}/...`
- `src/app/api/items/[id]/workflow/...`

## 3. Canonical item model and lifecycle

| File/symbol | Current responsibility/evidence | Kanban use |
|---|---|---|
| `src/db/client.ts:20-75` `getDb` | SQLite singleton, WAL, FK, NORMAL sync, 5s busy timeout, sqlite-vec, migrations | **regress** |
| `src/db/client.ts:100-164` `runMigrations` | Lexicographic transactional migration runner; fail startup on error | **modify/reference**; next migration is `025_...` |
| `src/db/client.ts:169-207` `ItemRow` | Typed central saved-source row | **modify** with workflow projection fields |
| `src/db/client.ts:241-249` `newId` | 96-bit random item IDs | **reference**; workflow mutation/event IDs should be stronger standard UUIDs |
| `src/db/items.ts:32-89` `InsertCapturedInput`, `insertCaptured` | Central new-item insertion/re-read | **primary modify**: one transaction initializes Inbox + event |
| `src/db/items.ts:91-101` `createNote` | Manual note wrapper around `insertCaptured` | **regress**; automatically inherits initialization |
| `src/db/items.ts:103-123` `getItem`, `getItemsByIds` | Canonical item reads | **regress** |
| `src/db/items.ts:280-289` `deleteItem` | Artifact/vector/note-derived cleanup then hard delete | **modify tests**: workflow event cascade and metric semantics |
| `src/db/items.ts:307-345` `updateItemCaptureContent` | Existing source repair | **regress**: never reset workflow |
| `src/db/items.ts:351-385` duplicate/search | URL identity and FTS | **regress**: workflow archive remains visible |
| `src/db/migrations/001_initial_schema.sql:81-97` `cards` | Dormant SRS Q/A table | **do not reuse** |
| `src/db/migrations/020_recall_sync.sql:12-40` | Current cumulative `items` shape | **reference** for additive schema |
| `src/db/migrations/003_enrichment_queue.sql:30-39` | New-item enrichment trigger | **regress** with workflow guard coexistence |
| `src/db/migrations/021_restore_transcript_recovery_trigger.sql:10-71` | Weak YouTube insert trigger/backfill | **regress** |

## 4. Creation/ingestion matrix

| Channel | Entrypoints | Insert/update seam | Required workflow test |
|---|---|---|---|
| Web note | `src/app/actions.ts:19-35`; `src/app/capture/tabs.tsx:166-224` | `createNote` → `insertCaptured` | new Inbox once |
| Web URL | `src/app/capture-actions.ts:26-94` | `insertCaptured`; duplicate can save again | new vs duplicate-new identity |
| Web PDF | `src/app/capture-actions.ts:104-141`; `pdf-dropzone.tsx` | `insertCaptured` | new Inbox once |
| URL API | `src/app/api/capture/url/route.ts:201-392` | duplicate/upgrade or `insertCaptured` | duplicate/upgrade preserves; new enrolls |
| Note API | `src/app/api/capture/note/route.ts:25-101` | dedup window or `insertCaptured` | duplicate creates no workflow; new enrolls |
| PDF API | `src/app/api/capture/pdf/route.ts:48-165` | `capturePdfAction` → `insertCaptured` | checksum failure none; success enrolls |
| Browser extension | `extension/src/capture.ts:67-118`; `background.ts:14-69`; `popup.ts` | URL API, source header `extension` | origin/bearer path new vs duplicate |
| Android native share | `src/components/share-handler.tsx:77-121`, `184-304`; `src/lib/android-share/request.ts` | URL/note/PDF APIs, source header `android` | URL/note/PDF, cold-start duplicate |
| Telegram | `src/lib/telegram/webhook-handler.ts:37-151`; `dispatch.ts:123-158`, `189-617` | direct `insertCaptured` or update | URL/YouTube/note/PDF new; duplicate/repair preserve |
| Recall | `src/lib/recall/importer.ts:69-179`; `mapper.ts:24-92` | transactional `insertCaptured`, skip, or repair | import new; stable-ID/URL duplicate preserve |
| Scripts/future raw insert | any direct SQL/test/script outside central seam | DB guard | valid bounded fallback initialization |

Existing-item-only regressions:

- `src/app/api/capture/transcript/route.ts:84-100`, `134-209`
- `src/app/api/transcripts/owned-media/route.ts`
- `src/db/item-upgrades.ts:13-145`
- `src/lib/repair/item-repair.ts`
- `src/lib/enrich/pipeline.ts:219-251`
- `src/lib/queue/{enrichment-worker,transcript-worker,note-index-worker}.ts`

None may enroll/reset workflow or count as Added.

## 5. Detail, notes, taxonomy, and archive matrix

| File/symbol | Current responsibility | Kanban rule |
|---|---|---|
| `src/app/items/[id]/page.tsx:151-260` | Canonical authenticated detail loader | Link/navigate here; no parallel item detail API exists |
| `src/app/items/[id]/page.tsx:359-404`, `818-884` | Read-only original title/body | Preserve |
| `src/app/items/[id]/page.tsx:425-440`, `1154-1169` | Hard delete | Keep distinct from archive |
| `src/components/manual-note-editor.tsx:180-813` | Journal/autosave/conflict/revision behavior | Reuse if notes shown; independent pending state |
| `src/app/api/items/[id]/note/route.ts:36-95` | Session + exact-origin + flag + CAS note API | Best security/idempotency reference for workflow writes |
| `src/db/item-notes.ts:336-563` | Note CAS, receipt, revision, tombstone, semantic queue | Do not couple workflow version to note generation |
| `src/components/tag-editor.tsx:23-99` | Per-item manual/auto tag UI | Preserve; User tags separate from status |
| `src/db/tags.ts:15-125` | Tag canonicalization, joins, promote/merge/delete | Reuse stable tag IDs in Processing filters |
| `src/db/topics.ts:37-181` | AI/system topics and joins | Reuse topic IDs; separate AI Topics facet |
| `src/lib/enrich/pipeline.ts:219-251` | Generated category/title/tags/topics | Must not change workflow |
| `src/db/collections.ts` | Manual group CRUD/joins | Out of workflow scope; archive must not detach |
| `src/lib/review/attention.ts:186-240` | Needs-attention query over all items | Workflow archive remains eligible |
| `src/app/api/library/export.zip/route.ts:58-96` | Export up to 10k items | Workflow archive remains exported unless final matrix adds metadata only |

## 6. API/auth/state conventions

| File/symbol | Convention | Kanban action |
|---|---|---|
| `src/proxy.ts:48-162` | Default-private proxy, public exceptions, session first, bearer allow-list, 401/redirect | **regress** |
| `src/lib/auth.ts:42-135` | PIN/session verification and cookie policy | **reuse** |
| `src/lib/auth/bearer.ts:67-80` | Bearer paths; prefix matching for `/api/items` | **risk:** workflow handler must enforce intended session-only policy |
| `src/lib/notes/http.ts:3-35` | private/no-store response and exact same-origin helper | **reuse** for workflow APIs |
| `src/app/api/items/[id]/note/route.ts:16-95` | Zod + size + auth + origin + 409-style repository errors | **reference** |
| `src/components/library-list.tsx:113-193` | local selection/pending/flash | **reference** for local item mutation state |
| `src/components/manual-note-editor.tsx:288-299` | BroadcastChannel invalidation | **reference** for multi-tab refresh |
| `src/app/library/page.tsx:45-89` | URL search parameters | **reuse** for view/filter deep links |
| `src/app/api/health/route.ts:1-30` | liveness only, no DB check | Add separate Processing readiness/integrity projection |

**Verified gap:** no `src/app/api/items/[id]/route.ts`; do not rely on a generic item JSON endpoint.

## 7. Design system and accessibility references

| File/symbol | Reuse/constraint |
|---|---|
| `src/styles/tokens.css:11-126`, `129-184` | light/dark semantic tokens, spacing, radii, motion, reduced-motion |
| `src/app/globals.css:36-70` | global typography/focus/readable content |
| `src/components/sidebar.tsx:91-304` | responsive shell and mobile safe-area navigation |
| `src/app/capture/tabs.tsx:43-65` | current tab visual; do not use tab roles without full keyboard model |
| `src/components/item-companion-tabs.tsx:22-40` | existing Arrow/Home/End roving-tab behavior if tabs are selected |
| `src/components/manual-note-editor.tsx:584-633`, `829-990` | focus containment, Escape, status live-region, mobile safe area |
| `src/components/recall-manual-sync.tsx:238-331` | Radix Dialog, pending states, one live announcement |
| `src/components/mobile-library-filters.tsx:37-108` | filter sheet visual only; focus behavior is not sufficient modal precedent |

## 8. Tests and release seams

| Area | Current evidence | Required additions |
|---|---|---|
| DB/migrations | `src/db/*.test.ts`, migration-specific tests; isolated setup files | migration `025`, legacy dormant/new enrolled invariants, trigger/raw insert, indexes/query plans |
| Actions/routes | route tests under `src/app/api`; `actions.bulk.test.ts` | processing reads, workflow transition/CAS/idempotency/unknown outcome/auth/origin |
| Capture | four capture route suites; Telegram/Android/extension mapping tests | full ingestion matrix new/duplicate/repair preservation |
| Notes | item note repository/API/journal/save queue/focus tests | notes/workflow independent concurrency |
| Accessibility | semantic unit tests and dated manual scripts; no browser E2E harness | keyboard/focus/live regions/zoom/themes/mobile/no-drag/manual AT |
| Performance | no current Processing fixture | 10k/50k realistic tag/topic fan-out, four status pages, counts, archive, metrics |
| CI | `.github/workflows/agent-docs.yml:43-53` runs docs checks only | ensure full product gate is required before release |
| Deploy | `scripts/deploy.sh:469-568` | flags/readiness/integrity smoke and production Processing verification |
| Rollback | `scripts/restore-from-backup.sh:22-82` | known-good artifact + flags-off + additive-schema rollback rehearsal |

## 9. Schema map relevant to workflow

Current core relationships:

```text
items
├── item_tags ── tags(manual|auto)
├── item_topics ── topics(ai|system)
├── item_collections ── collections
├── item_note_state/item_notes/revisions/mutations/index jobs
├── enrichment_jobs / embedding_jobs / transcript_jobs
├── chunks / vectors / semantic events
├── capture artifacts/policy/transcript provenance
├── recall_sync_items
└── cards (SRS child; unrelated to Processing)
```

Proposed additive relationship from the approved/finalized technical plan should remain:

```text
items (current workflow projection)
└── item_workflow_events (content-free append-only history; ON DELETE CASCADE)
```

Do not add workflow joins to Library/search/Ask/Related/Review queries merely to hide archived Processing items.
