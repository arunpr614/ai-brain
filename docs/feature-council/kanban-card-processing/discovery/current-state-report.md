# Kanban Card Processing — current-state report
**Status:** Discovery baseline, not implementation evidence
**Code baseline:** `origin/main` / worktree HEAD `5b92e68` on 2026-07-12
**Wiki baseline:** read-only clone of `https://github.com/arunpr614/ai-brain.wiki.git` at `703077dd74c3cbc18936357a9b5bde0397f972a3` (2026-07-11)
**Scope:** current application, data, security, operations, and the seams affected by Card Processing
**Production/runtime limitation:** no production database contents, production host, user content, or live traffic were inspected. Runtime claims below come only from current code and the explicitly dated Wiki.

## Executive finding

AI Brain is a compact, single-owner Next.js application backed by one SQLite database. The knowledge object the product calls a saved source/card is the `items` row. Current main has no workflow status, Processing route, Kanban/list switch, workflow archive, workflow history, or processing metrics. The existing `cards` table is an unrelated, currently dormant spaced-repetition schema and must not be reused.

The safest integration seam is the existing `insertCaptured()` repository function: every production path that creates a new item eventually uses it, while duplicate, repair, transcript, enrichment, indexing, and note operations update an existing item. Processing therefore needs a separate owner-intent lifecycle initialized only for genuinely new `items`, while preserving all current capture/enrichment/note/taxonomy lifecycles.

The previous Wiki exploration reaches the same separation: Processing is proposed as distinct from tags, AI topics, capture quality, SRS Review, and archive, and says the feature is not implemented ([Card Processing Workflow Exploration](https://github.com/arunpr614/ai-brain/wiki/Card-Processing-Workflow-Exploration), lines 10–14 and 28–38 in the inspected clone).

## 1. Application shape and navigation

- Root `/` redirects to `/library` (`src/app/page.tsx:1-5`).
- Desktop primary navigation is Capture, Library, Needs Upgrade, Ask, and Settings; device pairing is a utility (`src/components/sidebar.tsx:38-43`, `168-252`).
- Mobile primary navigation is Library, Capture, Ask, and More (`src/components/sidebar.tsx:255-304`). Processing has no navigation target or route classification (`src/components/sidebar-routing.ts:1-60`).
- Item, topic, collection, and search routes currently map back to Library in the shell (`src/components/sidebar-routing.ts:27-42`).
- The shell is responsive at Tailwind's `md` breakpoint: sticky left rail on desktop, fixed 64px bottom navigation on mobile, and safe-area content padding (`src/components/sidebar.tsx:91-100`, `255-304`; `src/app/layout.tsx:77-89`).
- Android is a thin Capacitor WebView over the live hosted web application. A web-only Processing feature will appear in Android without a native data model or APK change; native changes are needed only if share/client contracts change (`capacitor.config.ts:6-24`, `43-57`).

**Kanban implication:** add a first-class Processing route and shell target. The prior exploration recommends a desktop peer to Library and mobile discovery under More initially, but the approved PRD/UX package remains authoritative for the final placement. Route highlighting must explicitly include Processing children rather than falling through to Library.

## 2. Current Library experience

`/library` is an authenticated server component. It reads up to 100 full `ItemRow` records, total/matching counts, manual collections, and Needs Upgrade count (`src/app/library/page.tsx:62-89`). It renders:

- search form to `/search` (`src/app/library/page.tsx:123-136`);
- server-side source filters: all, article, YouTube, PDF, note, Telegram (`src/app/library/page.tsx:17-24`);
- server-side quality filters: all, full text, transcript, needs upgrade (`src/app/library/page.tsx:26-31`);
- one tag-name query parameter (`src/app/library/page.tsx:45-60`, `72-89`);
- distinct empty-library and filtered-empty states (`src/app/library/page.tsx:206-210`, `247-285`);
- client-local quality tabs and local multi-selection in `LibraryList` (`src/components/library-list.tsx:106-141`, `380-435`);
- bulk Ask, manual tag, and manual collection actions (`src/components/library-list.tsx:143-193`, `356-365`, `438-577`).

The repository query uses `ORDER BY captured_at DESC LIMIT ? OFFSET ?` and returns `SELECT *` (`src/db/items.ts:228-240`). Tag filtering joins `item_tags` and `tags` by canonical tag name (`src/db/items.ts:210-220`). There is no topic facet in Library; AI topics have dedicated pages (`src/db/topics.ts:155-181`; `src/app/topics/[slug]/page.tsx:37-149`).

**Kanban implication:** reuse Library visual and item-link conventions, but do not reuse its full-row/offset query for multi-column processing. Board/List/Archive need bounded DTOs, stable keyset cursors, independent per-status pages/counts, and shared normalized filter algebra. User tags and AI topics must remain separately labeled and should use stable IDs at the API/repository boundary.

## 3. Card model and lifecycle today

### Canonical saved source

`items` is the central aggregate (`src/db/migrations/020_recall_sync.sql:12-40`; `src/db/client.ts:169-207`). It contains source identity/type/channel, original body, generated summary/title/category/quotes, capture quality/provenance, timestamps, and enrichment state. `captured_at` orders Library. `enrichment_state` is a technical queue state (`pending`, `running`, `batched`, `done`, `error`), not owner workflow intent.

`insertCaptured()` creates a 96-bit random hex ID, inserts one item, then re-reads it (`src/db/client.ts:241-249`; `src/db/items.ts:54-89`). Database triggers independently enqueue enrichment after every insert (`src/db/migrations/003_enrichment_queue.sql:30-39`) and weak YouTube transcript recovery (`src/db/migrations/021_restore_transcript_recovery_trigger.sql:10-42`).

### Existing `cards` naming collision

Migration `001` defines `cards` as SRS question/answer records with `new|learning|review|relearning` state (`src/db/migrations/001_initial_schema.sql:81-97`). No current product repository or route implements that SRS feature. The Wiki likewise calls it a review substrate with no discovered spaced-repetition product (`Data-Model.md:23` in the inspected Wiki clone).

**Decision constraint:** Processing cards are `items`; do not overload the SRS `cards.state`, rename Inbox states to enrichment states, or encode workflow in tags/topics.

### Current lifecycle

1. New item insert.
2. FTS and enrichment queue triggers run (`src/db/migrations/002_fts5.sql:19-31`; `003_enrichment_queue.sql:30-39`).
3. Enrichment writes summary, cleaned title, category, auto tags/topics, and `done` atomically (`src/lib/enrich/pipeline.ts:219-251`).
4. Embedding is queued when enrichment flips to `done` (`src/db/migrations/006_embedding_jobs.sql:24-37`).
5. Weak YouTube items may enter the independent transcript-recovery queue (`src/db/migrations/021_restore_transcript_recovery_trigger.sql:10-71`).
6. User organization, attached notes, repair, Ask, export, and delete remain independent.

There is no owner status, completion timestamp, archive timestamp, rank, workflow version, or workflow event history in the current schema.

## 4. Every production creation and ingestion path

All genuinely new production items converge on `insertCaptured()`:

| Channel/path | Entrypoint and evidence | New item behavior | Existing item behavior |
|---|---|---|---|
| Web manual note | `createNoteAction()` → `createNote()` → `insertCaptured()` (`src/app/actions.ts:19-35`; `src/db/items.ts:91-101`) | Creates `source_type=note`, default `capture_source=web` | N/A |
| Web URL | `captureUrlAction()` (`src/app/capture-actions.ts:26-94`) | Extracts then inserts | Warns on duplicate; web can explicitly save again |
| Web PDF | `capturePdfAction()` (`src/app/capture-actions.ts:104-141`) | Extracts then inserts | No URL identity |
| JSON URL API | `POST /api/capture/url` (`src/app/api/capture/url/route.ts:338-392`) | Inserts and saves artifacts | Duplicate or quality-aware update of same item (`:201-335`) |
| JSON note API / Android text share | `POST /api/capture/note` (`src/app/api/capture/note/route.ts:25-101`) | Dedup-window check then insert | Short in-memory duplicate window returns no item |
| PDF API / Android PDF share | `POST /api/capture/pdf` (`src/app/api/capture/pdf/route.ts:48-165`) | SHA-256 verification, extraction action, insert | N/A |
| Browser extension popup/context menu/selection | `extension/src/capture.ts:67-118`; `background.ts:14-69` | Calls URL API with `capture_source=extension` | Server duplicate/update rules |
| Android native share | `src/components/share-handler.tsx:77-121`, `184-238`, `240-304` | Routes URL, note, or one PDF to capture APIs with Android header | Server duplicate/update rules |
| Telegram URL/YouTube | `src/lib/telegram/dispatch.ts:189-423` | Direct extraction + insert (`:358-374`) | Duplicate or quality-aware upgrade (`:201-355`) |
| Telegram text note | `src/lib/telegram/dispatch.ts:473-508` | Inserts note | In-memory duplicate window |
| Telegram PDF | `src/lib/telegram/dispatch.ts:510-617` | Validates/downloads/extracts/inserts (`:570-584`) | Durable Telegram document unique-ID check |
| Recall import | `src/lib/recall/importer.ts:69-179`; mapper `src/lib/recall/mapper.ts:24-92` | Transactional insert with `capture_source=recall` | Stable Recall ID skips; optional weak URL match repairs existing item |

The transcript upload/owned-media, repair, capture upgrade, enrichment, embedding, note-index, and Recall weak-upgrade paths update an existing `items` row and must not reset workflow. Representative evidence: `src/app/api/capture/transcript/route.ts:84-100`, `src/db/item-upgrades.ts:13-145`, `src/lib/repair/item-repair.ts`, `src/lib/enrich/pipeline.ts:219-251`.

**Kanban implication:** initialize Inbox once inside the central new-item transaction. Duplicate, upgrade, repair, enrichment, transcript, indexing, and note mutations preserve workflow state. Retain a database guard for future/raw inserts because scripts and tests can call or bypass repositories.

## 5. Detail and editing

- `/items/[id]` is the canonical authenticated detail route (`src/app/items/[id]/page.tsx:151-260`). Desktop shows Original/Digest/metadata and mobile uses route tabs; all open the same item identity.
- Original item title/body are displayed, not generally editable (`src/app/items/[id]/page.tsx:359-404`, `818-884`). Enrichment may replace the title, and repair/upgrade may replace captured content; there is no ordinary title/body editor.
- Delete is available on desktop and mobile and calls the same hard-delete action (`src/app/items/[id]/page.tsx:425-440`, `1154-1169`).
- Per-item User/auto tags and collections are edited inline (`src/components/tag-editor.tsx:23-99`; `collection-editor.tsx:11-82`).
- AI topics are displayed separately and link to topic pages (`src/app/items/[id]/page.tsx:1554-1581`).
- **My notes** is a separate, feature-flagged attached Markdown document, not the item body (`src/lib/notes/flags.ts:1-28`; Wiki [Manual Content Notes](https://github.com/arunpr614/ai-brain/wiki/Manual-Content-Notes), lines 14–18).

The note editor has a device IndexedDB journal, autosave/manual save, compare-and-swap epoch/generation, mutation IDs, conflict handling, revisions/restore, delete tombstone, and opt-in AI indexing (`src/components/manual-note-editor.tsx:180-492`, `531-813`; `src/db/item-notes.ts:336-563`). Note APIs require a valid session; writes additionally require feature flag and exact same origin (`src/app/api/items/[id]/note/route.ts:36-95`; `src/lib/notes/http.ts:21-35`). Responses are private/no-store and cookie-varying (`src/lib/notes/http.ts:3-18`).

**Kanban implication:** open the existing detail route; do not create parallel item or note persistence. Workflow moves and note saves need independent pending/conflict state. If a Processing detail surface embeds notes, it must reuse the existing mounted editor and navigation-loss protections.

## 6. User tags, AI tags/topics, and filters

- Tags share one table with `kind=manual|auto`; names canonicalize to lowercase/hyphenated values (`src/db/tags.ts:15-37`).
- Re-enrichment clears only auto-tag joins, preserves manual tags, and repopulates generated tags (`src/db/tags.ts:56-79`; `src/lib/enrich/pipeline.ts:241-249`).
- Auto tags can be promoted to manual, renamed/merged, or deleted (`src/db/tags.ts:72-125`; `src/app/settings/tags/page.tsx:31-97`).
- Topics are a distinct AI/system concept with slug, optional evidence/confidence, and joins (`src/db/migrations/017_topics.sql:4-24`; `src/db/topics.ts:92-181`). Current enrichment uses its generated tags as topic names too (`src/lib/enrich/pipeline.ts:247-249`).
- `items.category` is a single generated classifier, separate from tags/topics (`src/lib/enrich/prompts.ts:9-34`; Wiki [Organization](https://github.com/arunpr614/ai-brain/wiki/Organization-Tags-Topics-and-Collections), lines 12–19).
- Library currently supports one tag-name filter and no topic facet (`src/db/items.ts:125-225`).

**Kanban implication:** status, archive, User tags, AI topics, category, and quality must remain orthogonal. Processing filtering will need new multi-value normalization and `EXISTS`-based SQL to avoid fan-out count inflation.

## 7. Archive and deletion

There is no current archive behavior. `deleteItem()` removes external capture artifacts, vectors/chunks, note-derived assistant messages, and then the parent item in a transaction; foreign keys cascade join/queue/note/history rows (`src/db/items.ts:280-289`; `src/db/migrations/001_initial_schema.sql:39-79`; `src/db/migrations/022_item_notes.sql:7-81`). Bulk delete loops through the same hard-delete function (`src/app/actions.ts:174-194`).

**Kanban implication:** workflow archive must be a reversible Processing-only projection, not hard delete. It must not hide items from Library, detail, search, Ask, Related, Review/Needs Upgrade, export, duplicate detection, or background workers unless an approved archive matrix explicitly says otherwise. Hard delete should cascade workflow events for privacy; historical metrics then describe retained items and can decrease.

## 8. API and state-management conventions

Current API routes use Next.js route handlers with Zod or explicit bounded parsing, parameterized repositories, JSON errors, and explicit status codes. There are 30 route files / 37 method exports. Browser mutations are mostly server actions or cookie-authenticated APIs; programmatic capture uses bearer auth.

Important current facts:

- There is **no** `GET /api/items/[id]` route in current main. The canonical item read is the server-rendered `/items/[id]` page. The older technical exploration's reference to an existing item API is stale.
- `src/proxy.ts` defaults private HTML/API to authenticated, redirects unauthenticated HTML, and returns 401 JSON for APIs (`src/proxy.ts:76-162`).
- The bearer allow-list includes `/api/items` and uses prefix matching, so every future path below `/api/items/...` reaches its handler when a bearer token is valid (`src/lib/auth/bearer.ts:67-80`). A new workflow handler must therefore perform its own intended credential/origin check and not assume the proxy made it session-only.
- Note APIs show the strongest current write convention: handler session verification, exact same-origin check, size bound, schema validation, CAS/idempotency, `409` current state, and private/no-store response.

State management is intentionally local:

- server components read SQLite directly;
- URL search parameters carry durable filters/tabs;
- server actions mutate and revalidate;
- client components use `useState`, `useTransition`, or `useActionState` for ephemeral selection/pending/error;
- there is no Redux/Zustand/general global store;
- note editing alone adds IndexedDB journal, BroadcastChannel, and a save queue for no-loss behavior.

**Kanban implication:** make view/filter state URL-addressable, keep per-item optimistic mutation state local, and add explicit version/idempotency/reconciliation instead of introducing a general app store. Unknown network outcomes require a mutation-status read before retry.

## 9. Authentication, authorization, and privacy

- The app is single-owner, not multi-tenant. There is no `user_id` on `items` and no role model.
- PIN setup uses PBKDF2-HMAC-SHA-256 at 200k iterations; sessions are HMAC-signed, 30-day tokens (`src/lib/auth.ts:42-45`, `59-115`).
- Session cookies are HttpOnly, SameSite=Lax, Path=/, and Secure in production (`src/lib/auth.ts:127-135`).
- Programmatic clients share one 128-bit-minimum/typically 256-bit bearer token, timing-safe verification, and in-process per-token rate limiting (`src/lib/auth/bearer.ts:35-46`, `82-93`, `141-229`).
- Telegram is public only at the webhook boundary; it requires a secret, configured owner ID, private chat, and durable update claim (`src/lib/telegram/webhook-handler.ts:37-151`).
- Production runs the service as unprivileged `brain`, on loopback behind managed TLS, with systemd filesystem hardening (`scripts/deploy/brain.service:6-29`).
- SQLite, backups, capture artifact files, browser journals, service-worker caches, extension storage, and Android preferences are not application-level encrypted (Wiki `Data-Model.md:35-38`). CSP is absent and one shared bearer token has no per-device revocation (Wiki `Known-Limitations-and-Technical-Debt.md:18-31`).

**Kanban implication:** v1 remains single-owner. Workflow records need no content, URLs, titles, notes, tag/topic labels, prompt data, or free-form reason text. Archive is not a privacy deletion. Handler-level auth and exact-origin enforcement are mandatory for workflow writes.

## 10. Analytics and observability

There is no centralized product analytics SDK. Current signals are:

- rotating local `data/errors.jsonl` (`src/lib/errors/sink.ts:20-40`);
- system journal and worker logs;
- authenticated liveness endpoint with no DB check (`src/app/api/health/route.ts:1-30`);
- provider status and queue tables;
- LLM usage table;
- SwiftBar health probe (`scripts/swiftbar/brain-health.30s.sh:21-52`);
- Recall durable run/request/execution records.

Some existing capture logs include `source_url` (`src/app/api/capture/url/route.ts:367-375`; `src/lib/telegram/dispatch.ts:385-393`), so the current sink is not a suitable template for privacy-safe workflow analytics.

**Kanban implication:** compute Inbox counts/age and weekly metrics from content-free projection/events. Log only IDs, enums, versions, timestamps, counts, safe reason codes, and latency. Add DB-aware readiness/integrity signals; `/api/health` alone cannot prove workflow schema/data correctness.

## 11. Feature flags

There is no general feature-flag service. Flags are server environment variables parsed in owning modules:

- attached notes UI/write/worker and note Focus (`src/lib/notes/flags.ts:1-28`);
- Recall manual UI/worker/sync (`src/lib/recall/manual-sync-service.ts:27-34`);
- transcript recovery/worker (`src/lib/queue/transcript-worker.ts:68-69`).

Flags default off in `.env.example` for guarded features (`.env.example:83-105`). Migrations still run while UI/write flags are disabled.

**Kanban implication:** introduce separate read/UI and write/readiness gates if required by the final rollout. Never allow UI enablement when integrity checks find a new item missing workflow initialization. Disabling the UI must not disable the DB guard that keeps future captures valid.

## 12. Design system, responsive, and accessibility conventions

- Tailwind utility composition plus CSS variables; no separate component library beyond Radix Dialog/Slot/Tooltip and `cmdk` (`package.json` dependencies).
- `src/styles/tokens.css` is the color/spacing/radius/motion source of truth (`:1-9`, `30-126`, `129-184`). It includes explicit light/dark themes and a reduced-motion token override.
- Global `:focus-visible` outlines use the action focus token (`src/app/globals.css:51-59`).
- Mobile task controls frequently target 44px (`h-11`), use safe-area insets, and avoid desktop-only hover semantics; desktop commonly reduces to 32–40px (`src/app/capture/tabs.tsx:43-65`, `147-160`; `src/components/mobile-library-filters.tsx:74-105`).
- Existing semantics include native lists/sections, `aria-current`, labeled navigation, status live regions, and toolbars. The note Focus implementation demonstrates inert background/focus containment/history restoration patterns (`src/components/manual-note-editor.tsx:584-633`, `829-990`).
- The current mobile filter sheet uses `role=dialog` but implements only Escape/backdrop close, not an evident focus trap/initial focus restore (`src/components/mobile-library-filters.tsx:37-44`, `74-108`). Do not copy it as the model for a modal workflow detail.

**Kanban implication:** use native buttons/selects and list/section semantics; do not require drag. Preserve 44px mobile targets, bottom-nav clearance, focus after an item changes columns/disappears, one pre-mounted polite status owner, explicit count scopes, reduced motion, and light/dark contrast.

## 13. Test infrastructure

- Node 22, TypeScript, `node:test` + `tsx`; scripts are `typecheck`, `lint`, `test`, and safe standalone build (`package.json:6-23`).
- Current tree contains 131 `*.test.ts(x)` files, including 18 API route tests and 15 DB/repository/migration tests (file-count discovery command below).
- Tests use isolated `BRAIN_DB_PATH` setup files and apply real migrations.
- No Playwright, Cypress, or committed `*.e2e.*` harness was found.
- GitHub Actions currently runs only agent-documentation validation, despite watching application paths (`.github/workflows/agent-docs.yml:1-53`). The Wiki explicitly warns that a green CI check is not product-suite evidence ([Local Development and Testing](https://github.com/arunpr614/ai-brain/wiki/Local-Development-and-Testing), lines 10–23).

**Kanban implication:** add repository/migration/route/component tests and an approved browser/a11y E2E path. Release must run the full local gate because CI does not.

## 14. Deployment, backup, and rollback

- `scripts/deploy.sh` checks Node/toolchain/env, makes and quick-checks a production SQLite backup, runs typecheck/lint/tests/env checks, builds a standalone artifact, rsyncs it, repairs native SQLite dependencies, restarts systemd, and validates authenticated health/providers/webhook (`scripts/deploy.sh:469-568`).
- The service runs Node standalone on `127.0.0.1:3000` as unprivileged `brain` with `/opt/brain/data` as the writable path (`scripts/deploy/brain.service:6-29`).
- Startup instrumentation opens DB/applies migrations and starts backup/enrichment/transcript/note workers and batch cron (`src/instrumentation.ts:14-63`). A migration failure prevents startup (`src/db/client.ts:100-153`).
- In-process backup uses SQLite `VACUUM INTO`, defaults to every six hours with 28 snapshots (`src/lib/backup.ts:1-30`, `44-115`). Deploy also creates a pre-release SQLite backup (`scripts/deploy.sh:274-288`).
- Restore stops the service, moves the current DB/WAL aside, copies the selected backup, and requires manual post-start Library verification (`scripts/restore-from-backup.sh:22-82`).
- Schema down-migration is not supported. The deploy script synchronizes into the active directory; it does not itself retain/switch a named previous application release. The Wiki says rollback requires a known artifact, configuration/flag state, backup, and migration compatibility ([Deployment and Operations](https://github.com/arunpr614/ai-brain/wiki/Deployment-and-Operations), lines 12–28).

**Kanban implication:** use an additive, backward-compatible migration; rehearse with a production-size snapshot; deploy UI/write flags off; retain a known-good application artifact and predeploy DB backup; disable feature reads/writes before any restore. Because workflow data is SQLite-only, the known capture-artifact backup gap does not block workflow rollback, but restoring a DB snapshot discards post-snapshot workflow changes and new captures.

## 15. Material gaps and conflicts

1. **Current code versus prior technical plan:** no `GET /api/items/[id]` exists. Canonical detail is the page route.
2. **Wiki versus current main:** the Wiki Data Model says migration `024` is a candidate/not deployed; current main includes `024_recall_manual_sync.sql`, and a fresh isolated DB applied all 25 migration files successfully. Production application remains unverified here.
3. **Migration numbering:** both `017_topics.sql` and `017_transcript_recovery.sql` exist. Lexicographic full filenames, not numeric IDs alone, determine order (`src/db/client.ts:116-123`). Next migration should be `025_...`.
4. **Library scale:** current Library caps at 100 and uses offset/full rows; this is not sufficient proof for a multi-column 10k/50k board.
5. **Archive:** current hard delete is irreversible; no reusable archive subsystem exists.
6. **Metrics:** no product analytics system or workflow event model exists.
7. **Authorization:** single-owner auth has no per-item tenant check. This is correct for current scope but cannot be described as multi-user authorization.
8. **Bearer prefix:** `/api/items` bearer prefix can unintentionally expose future item subroutes to bearer-authenticated clients unless each handler checks its own credential policy.
9. **E2E/a11y tooling:** no committed browser E2E harness; manual assistive-technology proof will be required.
10. **Production-size evidence:** this lane did not inspect production volume, WAL growth, query plans, free space, or live host state.

## 16. Commands and evidence log

Read-only/discovery commands used:

```text
git status --short --branch
git remote -v
git log -1 --oneline --decorate
find ... -name AGENTS.md -print
rg --files src android/app/src extension/src .github scripts docs/wiki
rg -n <symbols/patterns> src extension scripts
nl -ba <relevant source and Wiki files>
git clone --depth 1 https://github.com/arunpr614/ai-brain.wiki.git /tmp/ai-brain.wiki.discovery
git -C /tmp/ai-brain.wiki.discovery log -1 --format=...
find src/app/api -name route.ts + method-export inventory
rg --files src | rg '\.(test|spec)\.(ts|tsx)$' | wc -l
rg --files | rg '(playwright|cypress|\.e2e\.)' | wc -l
```

Schema smoke used a temporary SQLite path and imported `src/db/client.ts`; it applied migrations `001` through `024`, reported `PRAGMA foreign_key_check=[]`, and `PRAGMA integrity_check=ok`. The first one-line attempt hit only a `tsx` CommonJS interop mistake (`getDb` was under the default export); the corrected attempt succeeded. No project or production database was mutated by this smoke.
