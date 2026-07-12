# Card Processing Workflow — Relevant Code Map

**Baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`

| Area | Primary files | Why it matters |
|---|---|---|
| Shell/navigation | `src/components/sidebar.tsx`, `src/components/sidebar-routing.ts`, `src/app/layout.tsx` | New desktop peer, mobile More placement, active-route behavior |
| Library route/query | `src/app/library/page.tsx`, `src/db/items.ts` | Existing filters/counts/order/100-row cap; canonical item repository |
| Library interactions | `src/components/library-list.tsx`, `src/components/mobile-library-filters.tsx`, `src/lib/library/selected-actions.ts` | Shared card rows, selection, bulk actions, mobile filter sheet |
| Item detail | `src/app/items/[id]/page.tsx`, `src/components/item-companion-tabs.tsx` | Existing route, desktop/mobile detail posture, contextual return target |
| Attached notes | `src/components/manual-note-editor.tsx`, `src/db/item-notes.ts`, `src/lib/notes/*`, `src/app/api/items/[id]/note/**` | Save/recovery/CAS/idempotency/cross-tab precedents |
| Manual tags | `src/db/tags.ts`, `src/components/tag-editor.tsx`, `src/app/taxonomy-actions.ts` | User-managed filter facet |
| AI topics | `src/db/topics.ts`, `src/db/migrations/017_topics.sql`, item detail panels | AI-generated filter facet distinct from tags/status |
| Collections | `src/db/collections.ts`, `src/components/collection-editor.tsx` | Existing organization; must not become workflow |
| Canonical insert | `src/db/items.ts:32-101` | One database default can protect every creation path |
| Web capture | `src/app/capture/page.tsx`, `src/app/capture/tabs.tsx`, `src/app/capture-actions.ts`, `src/app/actions.ts` | URL/PDF/note creation defaults and post-save routes |
| Client capture APIs | `src/app/api/capture/url/route.ts`, `src/app/api/capture/note/route.ts`, `src/app/api/capture/pdf/route.ts` | Android/extension behavior, duplicate results, auth conventions |
| Telegram | `src/lib/telegram/dispatch.ts`, `src/lib/telegram/webhook-handler.ts` | URL/text/PDF ingestion defaults |
| Recall | `src/lib/recall/importer.ts`, `src/lib/recall/mapper.ts`, `src/db/recall-sync.ts` | Import defaults, timestamps, idempotency, migration cohort |
| Capture repair | `src/app/api/capture/transcript/route.ts`, `src/lib/repair/item-repair.ts`, `src/db/item-upgrades.ts` | Existing-item upgrades must preserve workflow/archive |
| Hard delete | `src/db/items.ts:280-289`, `src/app/actions.ts`, `src/app/review/actions.ts` | Archive is not delete; authorization gap to avoid copying |
| Search | `src/db/items.ts:359-384`, `src/lib/search/index.ts`, `src/app/api/search/route.ts` | Initial archive scope and separate workflow query repository |
| Ask/Related | `src/lib/retrieve/index.ts`, `src/lib/related/index.ts`, `src/app/api/ask/route.ts` | Archived knowledge remains eligible in phase one |
| Enrichment | `src/lib/enrich/pipeline.ts`, `src/lib/queue/enrichment-batch.ts`, `src/db/migrations/003_enrichment_queue.sql` | Operational state remains orthogonal; AI taxonomy overlap |
| Database/migrations | `src/db/client.ts`, `src/db/migrations/001_initial_schema.sql` through `023_source_aware_chunks.sql` | SQLite WAL, lexicographic additive migrations, SRS `cards` collision |
| Design system | `src/styles/tokens.css`, `src/app/globals.css`, `DESIGN_SYSTEM.md` | Prism Memory palette, spacing/radius/motion, typography/accessibility |
| Prior council patterns | `docs/feature-council/note-focus-mode/`, `docs/feature-council/F08-manual-content-notes/` | v1/review/v2 discipline, isolated prototypes, validation evidence |
| Canonical wiki | `docs/wiki/`; separate `ai-brain.wiki.git` mirror | Status taxonomy, current behavior, publication process |

## Planned implementation seam

This exploration does not create code. A future implementation would likely add:

- `src/db/item-workflow.ts` for current state, events, counts, filters, and CAS;
- one additive `024_...sql` migration;
- explicit private/no-store authenticated workflow routes;
- Processing page/client components that reuse compact item fields and style tokens;
- item-detail status controls that do not duplicate the notes editor;
- focused repository/API/UI tests plus large-fixture query checks.

Those paths are planning targets only.
