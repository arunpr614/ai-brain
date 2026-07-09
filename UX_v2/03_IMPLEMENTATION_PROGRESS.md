# AI Memory UX v2 Implementation Progress

> Current-status note: this file preserves historical implementation evidence. It is not current release proof. For current blockers, verification gates, and status precedence, use `00_PLANNING_PACKAGE_INDEX.md`, `trackers/testing_qa_readiness_tracker.md`, `trackers/baseline_status_reconciliation.md`, and PRD-16.

Updated: 2026-06-13

## Completed Slices

### PRD-01 / PRD-02: Brand And Design Foundation

- Rebranded user-facing app surfaces from AI Brain to AI Memory.
- Wired AI Memory logo, web icons, manifest, and Android launcher assets.
- Updated app metadata, Capacitor app name, Android label, setup/unlock/capture/settings/export copy, service worker precache, and AI-facing prompts.
- Added Prism Memory tokens and source-quality/scope semantic token aliases.

### PRD-04: Library Filters And Ask Selected

- Added canonical `/library` route while keeping `/` as a redirect.
- Added source filters: All, Articles, YouTube, PDFs, Notes, Telegram.
- Added quality filters: All, Full text, Transcript, Needs upgrade.
- Library rows now show source platform, captured via, quality badge, saved date, and warning state.
- Multi-select toolbar now includes Ask selected, Tag, Add to collection, Delete, and Clear.
- Added multi-item Ask scope through `/ask?scope=selected&ids=...`.
- Extended `/api/ask`, client streaming types, and retrieval to support selected item IDs.

### PRD-03: Web Shell And Navigation

- Added collapsible desktop sidebar with persisted expanded/collapsed state.
- Added active-state handling for Library, item detail, Ask, and Settings subroutes.
- Added lower utility navigation for Pair Device and disabled Privacy Controls coming-soon state.
- Added Needs Upgrade badge support in desktop and mobile navigation.
- Switched the logo image to unoptimized rendering to avoid local Next image optimizer warnings on the generated logo PNG.

### PRD-05: Needs Upgrade Queue

- Added `/needs-upgrade`.
- Added weak-capture query helpers and counts.
- Queue includes metadata-only, preview-only, failed, and known transcript-warning captures.
- Library shows Needs Upgrade entry/count when weak captures exist.

### PRD-07: Item Detail Focus Mode

- Added source trust strip to item detail with platform, captured via, quality, author, saved date, and size metadata.
- Added `/items/[id]?mode=focus` read mode with Exit focus, Ask, Source, trust strip, and focused content.
- Weak/thin sources in focus mode show a repair cue with links to Needs Upgrade and Capture.

### PRD-06: Capture Result States

- URL, PDF, and note saves now route to item detail with a capture-result marker.
- Item detail renders a capture result banner for saved URL/PDF/note outcomes.
- Result banner shows what was saved, source platform, captured via, quality, and next actions.
- Weak/limited captures get warning-tone copy and an Upgrade action to the Needs Upgrade queue.

### PRD-08: Included Topics

- Added `topics` and `item_topics` tables plus topic repository helpers.
- Enrichment now writes AI-detected topics from enrichment tags while leaving manual tags user-managed.
- Item detail right rail now separates Tags, Included Topics, and Collections.
- Included Topics chips open `/topics/[slug]` topic detail pages.
- Topic detail pages show matched sources and provide an Ask topic action.
- `/ask?scope=topic&topic=...` now scopes retrieval to items included in that topic.
- Manual tag chips on item detail now open `/library?tag=...`.
- Library now supports tag-filtered results alongside source and quality filters.
- Collection chips on item detail now open collection detail pages.
- Collection detail pages now provide an Ask collection action.
- `/ask?scope=collection&collection=...` now scopes retrieval to items in that collection.
- Ask selected/topic/collection item scopes now allow up to 50 source IDs, matching the retriever cap.

### PRD-09: Ask Scope Clarity

- Ask now has a persistent scope banner for library, item, selected, tag, topic, and collection scopes.
- Scope banners show source counts plus preview chips for explicit item-backed scopes.
- Ask tag is now reachable from tagged Library results via `/ask?scope=tag&tag=...`.
- Ask item, tag, topic, and collection scopes show weak-source warnings when scoped sources have limited readable text.
- Retrieved citation source chips now include source platform and capture quality metadata.
- Inline citation hover text now includes source platform and capture quality metadata.
- Library Ask and per-item Ask now create durable chat threads on first submit.
- `/ask?thread=...` and `/items/[id]/ask?thread=...` restore previous messages.
- Ask now has a desktop history side panel for durable library/item threads.
- Mobile Ask now has a compact History disclosure for durable library/item threads.

### PRD-11: Android/Mobile Library Filters

- Library now has a mobile-only compact filter control with active filter labels and visible result count.
- Added a dismissible, safe-area-aware mobile filter bottom sheet for source, quality, and tag filters.
- Tag-filtered mobile Library results expose Clear tag, Clear filters, and Ask tag actions inside the sheet.
- Desktop Library filter rows remain unchanged and hidden separately from the mobile control.
- Bulk Ask selected is aligned to the 50-source retrieval cap and the mobile bulk bar sits above bottom navigation.

### App Shell Reliability

- Bumped service worker cache names from legacy `brain-*` v4 to `ai-memory-*` v5.
- Added local-dev service worker network bypass for `localhost`, `127.0.0.1`, and `::1` to avoid stale Next dev chunks causing hydration mismatches.
- Activation now purges both legacy `brain-*` and new `ai-memory-*` cache families outside the active version.
- Renamed service-worker logs/comments from Brain to AI Memory where not part of historical compatibility.

## Verification

- Focused tests:
  - `node --import tsx --test src/db/items.test.ts src/lib/retrieve/index.test.ts src/app/api/ask/route.test.ts`
  - `node --import tsx --test src/db/topics.test.ts src/lib/queue/enrichment-batch.test.ts`
  - `node --import tsx --test src/db/items.test.ts src/app/api/ask/route.test.ts`
  - `node --import tsx --test src/lib/retrieve/index.test.ts src/app/api/ask/route.test.ts`
  - `node --import tsx --test src/db/chat.test.ts src/app/api/ask/route.test.ts`
- Typecheck:
  - `npm run typecheck`
- Lint:
  - `npm run lint`
  - Current lint result has 0 errors and 1 pre-existing warning in `src/lib/queue/enrichment-batch-cron.ts`.
- Browser smoke:
  - `/library` desktop and 390px mobile.
  - `/ask?scope=selected&ids=...` missing-source fallback.
  - Item detail trust strip and focus mode using a temporary note, then deleted.
  - Sidebar expanded/collapsed states, persisted collapse after reload, and restore to expanded.
  - Local service worker unregister via `?nosw=1` to clear stale dev chunks before shell smoke.
  - Capture result banner with a temporary note, then deleted.
  - Included Topics item detail, topic detail, and topic Ask on desktop and mobile-size viewport with a temporary note, then deleted.
  - Tag-filtered Library and Ask collection on desktop and mobile-size viewport with a temporary tagged/collected note, then deleted.
  - Ask tag, Ask collection, and per-item Ask persistent scope banners plus weak-source warnings on desktop and mobile-size viewport with a temporary weak source, then deleted.
  - `/ask?thread=...` and `/items/[id]/ask?thread=...` history restore on desktop and mobile-size viewport with temporary threads/items, then deleted.
  - Mobile Library compact filter control and dismissible sheet for source/quality filters on `/library?source=note&quality=full_text&nosw=1`; desktop filter rows verified unchanged.
  - Mobile tag-filtered Library sheet with Clear tag, Clear filters, and Ask tag using a temporary tagged note, then deleted.

## Next Slices

- PRD-06 follow-up: duplicate, updated-existing, and error-with-save result states inside Capture.
- PRD-09 follow-up: attached context override, high-quality-only scope, full Android history sheet, and extended durable scope storage for tag/topic/collection threads.
- PRD-11 follow-up: four-item mobile bottom nav, route-aware raised Capture FAB, and long-press/select-mode polish.
- PRD-12: Android/mobile Ask composer add-context sheet and keyboard-safe composer refinements.
