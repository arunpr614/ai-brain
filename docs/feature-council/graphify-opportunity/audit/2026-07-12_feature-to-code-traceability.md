# AI Brain Feature-to-Code Traceability

**Code baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Verified:** 2026-07-12  
**Purpose:** map current product claims to executable surfaces, data, background behavior, and protecting evidence. “Runtime” below means what source enables; it is not a fresh host probe.

## Traceability matrix

| ID | Capability and status | User surface / route | Implementation and data | Protecting evidence | Principal boundary |
|---|---|---|---|---|---|
| F01 | PIN setup/unlock/session — **Implemented** | `/setup`, `/unlock`, protected HTML | `src/lib/auth.ts:42-135`; `src/app/auth-actions.ts`; `src/proxy.ts:14-32,76-157`; settings `auth.pin` | `src/lib/auth.test.ts`; `src/proxy.test.ts` | Single owner; 4-character minimum; no roles/SSO |
| F02 | Bearer API auth — **Implemented** | Capture, items, health, errors APIs | `src/lib/auth/bearer.ts:39-93,149-223`; `src/proxy.ts:89-138`; process env token | `src/lib/auth/bearer.test.ts`; `src/lib/auth/api-version.test.ts`; `src/lib/auth/no-destructive-gets.test.ts` | Shared token and process-local rate limit |
| F03 | Device pairing/token rotation — **Implemented** | `/setup-apk`, `/settings/device-pairing` | device-pairing routes/services; migration `010_device_pairing_codes.sql`; rotate-token route | device-pairing code, token-display, create/exchange route, setup-client tests | No per-device identity or selective revocation |
| F04 | Shell/navigation/theme — **Implemented** | Global layout/sidebar/mobile More/command palette | `src/app/layout.tsx`; `src/components/sidebar.tsx:40-44,65-100`; command palette; theme modules | sidebar-routing, theme, register-service-worker tests | UI shell only; Processing entry is gated |
| F05 | Library browse/filter/select — **Implemented** | `/library` | `src/app/library/page.tsx`; `src/components/library-list.tsx`; `src/db/items.ts:188-330` | item DB tests; selected-actions tests; bulk action tests | No saved searches or smart filters |
| F06 | Bulk tag/collect/delete — **Implemented** | Library selection bar | `src/app/actions.ts`; tags/collections/item deletion repositories | `src/app/actions.bulk.test.ts`; item deletion/vector/note tests | Browser-session, single-owner action |
| F07 | Item detail/source Focus — **Implemented** | `/items/[id]` | `src/app/items/[id]/page.tsx:216-268,293-477`; companion tabs, source focus, status | item companion/status, repair, scope-health tests | Not native PDF/annotation studio |
| F08 | Item/library export — **Implemented** | Item export; Library export | item Markdown route; library ZIP route | `src/app/api/library/export.zip/route.test.ts` | One way; attached notes excluded by default |
| F09 | Note capture — **Implemented** | `/capture` Note | note capture route; `src/db/items.ts:151-160`; common triggers | `src/app/api/capture/note/route.test.ts` | Creates a library item, unlike attached note |
| F10 | URL/article/selected-text capture — **Implemented** | `/capture`, extension, Android, Telegram | URL route `src/app/api/capture/url/route.ts:57-388`; platform extractors; dedup/artifacts | URL route plus capture platform/dedup/selected-text/subplatform tests | Source fidelity and remote access vary |
| F11 | YouTube capture/recovery — **Implemented with inactive adapters** | Capture, detail repair, Needs Upgrade | YouTube extractors, transcript jobs/worker, user-text upgrade, backfill | YouTube, recovery, provider-health, transcript route/worker tests | Official captions not wired; network/provider variability |
| F12 | PDF capture — **Implemented** | Capture and Android single-file share | PDF route; `src/lib/capture/pdf.ts:46-108`; artifacts | PDF route and file-validation tests | No OCR, renderer, annotations, multi-PDF |
| F13 | Owned-media STT — **Inactive** | Owned-media transcript API | current route/service returns provider-disabled before writes; adapters retained | owned-media route/provider tests | Not a usable ingestion path |
| F14 | Capture result/quality/provenance — **Partially implemented** | Share result, item trust/repair | `src/lib/capture/result.ts:4-139`; item source/quality fields; artifact/cache migrations 012-016 | capture result/quality/artifact/cache/client result tests | No one lifecycle UI across every channel |
| F15 | Needs Upgrade/repair/Review — **Implemented** | `/needs-upgrade`, `/items/[id]/repair`, `/review` | quality policy, item repair, upgrade and attention modules | repair, upgrade-policy, review-attention, transcript recovery tests | Review is attention triage, not SRS |
| F16 | Android/extension/Telegram clients — **Implemented** | Capacitor APK, MV3 extension, private chat | share handler, Android helpers, extension modules, webhook/dispatch/rate limit | Android request/result, extension build/static evidence, Telegram route/dispatch tests | Private client channels; Telegram owner/private-chat only |
| F17 | Recall scheduled import — **Implemented, host-dependent** | Background integration | `src/lib/recall/client.ts`, mapper/fidelity/importer/sync-runner/scheduler; migration 020; timer unit | Recall client/fidelity/importer/sync-runner/scheduler/migration tests and many gate smokes | One-way; actual host/API not re-probed |
| F18 | Recall manual “Sync now” — **Feature-flagged** | Settings Recall card; `/api/settings/recall-sync` | component, route, durable request/execution DB, trusted worker, path/timer units; migration 024 | route/component/DB/contract/process/crash/shell artifact tests | Default off; host identity/credential boundary required |
| F19 | Enrichment summaries/taxonomy — **Implemented** | Status/digest/taxonomy on item | migration 003 trigger; pipeline `src/lib/enrich/pipeline.ts:153-251`; locked output contract | pipeline, prompts, enrichment-worker tests | Short body bypass; provider failures; generated-label quality |
| F20 | Provider abstraction/health — **Implemented** | Settings provider status; AI paths | LLM factory `src/lib/llm/factory.ts:29-106`; embed factory; provider status | factory/provider/status tests | External keys, quota, latency; point-in-time probe |
| F21 | Categories — **Implemented** | Item digest/filter copy | `items.category`; controlled prompt values `src/lib/enrich/prompts.ts:9-24` | enrichment validation/pipeline tests | One classifier string; not an entity relation |
| F22 | Manual/auto tags — **Implemented** | Item editor, Library filter, Settings | tags/item_tags; `src/db/tags.ts:19-124`; taxonomy/bulk actions | item/action tests | Slash names do not implement hierarchy |
| F23 | AI topics — **Implemented, semantically limited** | `/topics/[slug]`, item/topics, Processing filters | topics/item_topics `017_topics.sql:4-24`; `src/db/topics.ts:92-182`; enrichment `pipeline.ts:241-249` | `src/db/topics.test.ts`; Ask scope and processing filter tests | Same labels as auto-tags; current confidence is null; no topic graph |
| F24 | Collections — **Implemented** | `/collections/[id]`, Settings, item/bulk actions | collections/item_collections; repository and taxonomy actions | item/action/scope tests | Manual flat grouping only |
| F25 | FTS search — **Implemented** | `/search`, search API | items FTS migration 002; note FTS migration 022; `src/lib/search/index.ts:49-69` | `src/lib/search/index.test.ts:44-78` | No saved search or rank explanation |
| F26 | Semantic/hybrid search — **Implemented** | `/search` mode toggle/API | chunks/vec0/row bridge/jobs migrations 005/006/023; retrieve/search RRF | search tests `:82-134`; retrieve tests `:60-203`; embed pipeline/factory/provider tests | 768-d provider/index dependency |
| F27 | Related items — **Implemented** | Item Related tab/list | `src/lib/related/index.ts:1-16,25-41,52-132`; `src/components/related-items.tsx:20` | `src/lib/related/index.test.ts` | Query-time similarity, no stored/explained edge or graph |
| F28 | Scoped cited Ask — **Implemented** | `/ask`, `/items/[id]/ask`, selected source Ask | ask route/generator/scope/SSE/citation parser; retrieve; chat DB | Ask route/request/state/generator/SSE/parser tests; chat tests | Model/retrieval-dependent citations; no verdict snapshot |
| F29 | Attached My notes — **Feature-flagged** | My notes item tab and Focus | migration 022 note state/current/revisions/receipts/FTS/jobs/consent; editor/journal/save queue | item-note route/repository, journal, queue, formatting, focus tests | One note/item, not E2EE, flags default off in example config |
| F30 | Notes in AI/Related — **Feature-flagged + consent** | Per-note switch; Settings default | migration 023 source-aware chunks; note index worker; provider policy; retrieve/related rechecks | provider-policy, note-index, search/retrieve/related/Ask tests | Exact search differs from semantic eligibility; remote call cannot be recalled |
| F31 | Chat persistence — **Implemented** | Ask history | chat_threads/messages and citation JSON in migration 001; chat routes/repository | `src/db/chat.test.ts` | Single-owner, no collaborative conversation |
| F32 | Processing workflow — **Feature-flagged + readiness-gated** | `/processing`, Library/capture/detail entry points | migration 025 projection/events/receipts/undo/enrollment/readiness; processing routes/components/repositories | processing migration, workflow, query, route, component tests; readiness/release smokes | Default-off config; no batch/rank/due-date/collaboration |
| F33 | Background workers/schedules — **Implemented** | Indirect | `src/instrumentation.ts:25-71`; queue workers; batch cron; Recall and audit system units | worker/cron tests; unit/static/release smokes | Operational coupling with web process/SQLite |
| F34 | Backups/restore tooling — **Implemented** | Operator-only | `src/lib/backup.ts:20-30,41-118`; off-site and restore scripts/runbook | `src/lib/backup.test.ts`; release/restore evidence docs | DB-only snapshot excludes capture artifacts |
| F35 | Health/errors/quota/observability — **Implemented** | health API, debug quota, Settings status, operator logs | health route; error sink/client route; provider status; processing/Recall audit tools | route/provider/vector/readiness tests | Operational diagnostics, not engagement analytics |
| F36 | Hosted/immutable deployment — **Implemented** | Production operations | Next standalone config; systemd service; immutable release/build verification; product CI | release artifact/runtime/build smokes; `.github/workflows/product-ci.yml:19-41` | Current host state was not independently probed |
| F37 | Knowledge graph/connection map — **Planned, not implemented** | None in current app | no generalized node/edge schema, route, graph service, dependency, or UI found | Wiki exploration only; absence checked across `package.json`, `src/`, `scripts/`, clients | Existing joins/similarity must not be relabeled as graph |
| F38 | Spaced repetition — **Planned product; inactive schema** | None | `cards` table in `src/db/migrations/001_initial_schema.sql:81-97` | no routes/services/tests for SRS behavior found | Processing “cards” are captured items, not flashcards |

## Relationship and provenance trace

| Primitive | Stored identity | Relation/provenance | Confidence/explanation | Consumer |
|---|---|---|---|---|
| Item ↔ tag | `items`, `tags` | `item_tags` many-to-many | tag `kind` manual/auto; no per-edge confidence | Library, item, Processing filter |
| Item ↔ topic | `items`, `topics` | `item_topics` | nullable `confidence`, nullable `evidence`, `detected_at`; current enrichment writes confidence null | Topic page, item, Ask scope, Processing filter |
| Item ↔ collection | `items`, `collections` | `item_collections` with `added_at` | manual membership; no reason/confidence | Collection page, Ask scope |
| Item ↔ chunk | `items`, `chunks` | FK plus `source_kind`, epoch/version, index | explicit original/AI/manual/legacy provenance | Retrieval, Related, Ask citations |
| Citation ↔ evidence | chat message JSON → item/chunk; generated citation objects | item/chunk IDs and source-kind/version | parser filters orphans; no claim-support verdict | Ask UI/history |
| Item ↔ item similarity | no stored edge | computed centroid similarity at request time | numeric similarity + matched chunk/source kind internally; no user explanation | Related list |
| Item ↔ workflow event | item projection + append-only event | versioned prior/current workflow state | actor/surface/time, not semantic confidence | Processing/audit/undo |
| Item ↔ capture source | item source fields + artifacts/cache | ingestion channel/platform/quality/method/version | warnings/quality/artifact metadata | Trust, repair, provenance |

## Test and CI status

Current protected-baseline evidence is GitHub Product CI run `29200243743`: locked install, static verification, 894 tests in 95 suites with 894 passing, production build, documentation checks, processing tools, and release smokes all succeeded. Agent docs run `29200243741` also succeeded.

In the local nested worktree, 868/872 loaded tests passed while four Processing files could not import declared dependency `@js-temporal/polyfill`. The cause was not established. Because the locked clean CI install at the exact baseline passed all 894 tests, the local observation is an environment-resolution limitation, not evidence of a current code failure.
