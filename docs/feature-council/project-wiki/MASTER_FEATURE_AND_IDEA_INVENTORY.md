# Master Feature and Idea Inventory

**Verified current-main baseline:** `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` on 2026-07-11
**Latest verified deployed application baseline:** `6858529ef179a51442d319c6c58e5ace79757619` on 2026-07-10
**Confidence:** High means code plus tests or dated runtime evidence; Medium means implementation exists but reachability/runtime is not fully proven; Low means planning/research evidence only.

Availability and runtime evidence are separate from status. `Feature-flagged` is used when a capability is materially controlled by rollout configuration. An enabled production flag does not make a feature unflagged.

The normalized `MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv` record contains 46 current-feature rows and 37 non-current idea/capability rows. Every row includes user problem/opportunity, target users, behavior, coverage/boundary, code/test/documentation evidence, routes/components/services, data/schema, flags/configuration, dependencies/integrations, limitations, related features/ideas, aliases, runtime evidence, and last-verified commit/date. Explicit `No current…` values distinguish absence from missing analysis.

## Current capabilities

| Capability | Definitive status | Confidence | Coverage | Explicit boundary | Primary evidence |
|---|---|---:|---|---|---|
| PIN setup, unlock, and sessions | Implemented | High | Single-owner PIN and HMAC session | No users, roles, SSO, or collaboration | `src/lib/auth.ts`, `src/app/auth-actions.ts`, auth tests |
| Bearer API authentication | Implemented | High | Android/extension auth; client-version is checked only when present; `Origin` may be absent and Chrome-extension origins are broadly accepted | Shared token rather than per-device revocation | `src/lib/auth/bearer.ts`, `src/lib/auth/api-version.ts` |
| Short-lived Android pairing | Implemented | High | One-time code exchange and reachability | No QR workflow | `src/lib/device-pairing/`, pairing routes/tests |
| Theme, responsive shell, navigation, command palette | Implemented | High | Light/dark UI, desktop/mobile navigation, shortcuts | Single-owner shell | `src/app/layout.tsx`, `src/components/sidebar.tsx`, `src/components/command-palette.tsx` |
| Library browse, filter, and selection | Implemented | High | Source/quality/tag filters, selection, bulk operations | No saved searches or rule-based smart filters | `src/app/library/`, `src/components/library-list.tsx`, library tests |
| Bulk tag, collect, and delete | Implemented | High | Multi-select actions and selected-source Ask | No multi-user workflows | `src/app/actions.ts`, `src/app/actions.bulk.test.ts` |
| Item detail and source-reading Focus | Implemented | High | Original, digest, Ask, Related, details, My notes, trust, transcript preview, export | Not a native PDF viewer or annotation studio | `src/app/items/[id]/`, `src/components/item-companion-tabs.tsx` |
| Standalone note capture | Implemented | High | Creates a library item with note source type | Separate from attached My notes | note capture route/tests, `src/db/items.ts` |
| URL and article capture | Implemented | High | Safe fetch, Readability, metadata fallbacks, dedup, platform handling | Some sites remain metadata/preview only | URL capture route and `src/lib/capture/` tests |
| Browser-selected text capture | Implemented | High | Extension selection plus page context | Latest production UI flow not independently re-verified | `src/lib/capture/selected-text.ts`, extension capture code/tests |
| PDF capture | Implemented | High | Single-PDF web/Android upload, validation, extraction, artifacts | No OCR, PDF renderer, highlights, or batch upload | PDF route, dropzone, `src/lib/capture/pdf.ts` |
| YouTube initial capture | Implemented | High | Metadata, duration, thumbnail, best-effort transcript and quality states | Provider/platform behavior can degrade | YouTube capture modules/tests |
| User-provided transcript repair | Implemented | High | VTT/SRT/TXT/Markdown repair with source/segment provenance | YouTube items only | repair page, transcript route, `src/db/transcripts.ts` |
| YouTube recovery worker | Implemented | High code; Medium runtime | Retry/manual-needed/ignore and provider-health policy | Automatic public recovery remains policy-limited | recovery/provider-health/worker modules and tests |
| YouTube production backfill tooling | Implemented | High code; runtime Unknown | Guarded operator backfill for transcript recovery | Production write; private runbook and approval context required | backfill scripts/modules/tests |
| Official YouTube captions recovery | Inactive | High | Adapter exists | UI says not wired; needs authorized OAuth path | `youtube-official.ts`, recovery options, repair UI |
| Owned-media speech-to-text | Inactive | High | Validation and provider adapter exist | Route always returns `503 provider_disabled` | owned-media route/adapters/tests |
| Capture result contract | Partially implemented | High | Shared full/limited/duplicate/updated/failure states | No single repair lifecycle across every channel | capture result, Android result, share-result UI |
| Capture provenance, artifacts, and cache | Implemented | High | Channel/platform/extraction metadata, artifacts, cache, quality | Retention/cleanup is not a complete user contract | migrations `012`–`016`, artifact/cache repositories |
| Needs Upgrade | Implemented | High | Weak-source queue with repair/source links | Not spaced repetition | needs-upgrade page, quality/repair modules |
| Review inbox | Implemented | High code; Medium runtime | Attention reasons for transcript, weak text, failures, gaps, duplicates | Not primary-nav SRS review | review page, attention module/tests |
| Unified Repair Center proposal | Planned | High | Many result, quality, review, repair, and transcript primitives exist | Full Council workspace/reset/parity contract is absent | current repair code plus FCP-001 v2 |
| Android thin client | Implemented | High | Private Capacitor WebView, URL/note/single-PDF share, pairing, result states | No public store or offline-native library | Capacitor config, Android manifest, share handler/tests |
| Multi-PDF Android share | Rejected | High | Manifest can receive multiple files | Product classifier intentionally rejects multiple PDFs | Android result classifier and share handler |
| Browser extension | Implemented | High | Popup plus page/link/selection context capture; endpoint is hard-coded/read-only and only the token is configurable | No store publication or augmented browsing | `extension/manifest.json`, extension source |
| Telegram capture | Implemented | High | Private-owner webhook, dedup, URL/text/document dispatch, rate limiting | Not a general multi-user bot | Telegram route/lib/DB tests |
| Recall daily import | Partially implemented | High | Guarded one-way fidelity-aware scheduled import with checkpoint/lock/report | No general two-way sync UI; runtime is time-specific | `src/lib/recall/`, migration `020`, final audit |
| AI enrichment and generated taxonomy | Implemented | High | Title, digest, quotes, category, tags/topics through realtime/batch paths | Provider failures can leave retryable/batched states | enrich pipeline/prompts/queue tests |
| Provider abstraction and health | Implemented | High | Ollama/Anthropic/OpenRouter text; Ollama/Gemini embeddings; point-in-time status | Not a full trust/readiness center | `src/lib/llm/`, `src/lib/embed/`, provider status route/tests |
| Tags, categories, topics, collections | Implemented | High | Manual/auto labels, category, generated topics, explicit collections | No hierarchical taxonomy or rule collections | DB repositories, taxonomy actions/pages/tests |
| Item and library export | Implemented | High | Item Markdown and library ZIP | Attached notes excluded by default; no round-trip import/sync | export routes/tests |
| Chunking and semantic indexing | Implemented | High | Markdown-aware/source-aware chunks, vectors, jobs, audit/repair | Quality depends on provider and index generation | chunk/embed/vector modules, migration `023`, tests |
| Full-text, semantic, and hybrid search | Implemented | High | FTS, vector, RRF hybrid, eligible note matches | No source-kind UI filter or rank explanation | search route/lib, retrieve module, tests |
| Ask with scopes and citations | Implemented | High | Streaming cited answers for library/item/selection/tag/topic/collection scopes | No Evidence Scan verdicts or policy presets | Ask route/lib, SSE/citation/scope tests |
| Chat persistence | Implemented | High | Threads, messages, rename/delete, persisted citations | Single-owner only | thread routes, chat repository/tests |
| Related items | Implemented | High | Query-time semantic similarity with eligible note influence | Not a persisted relationship graph | related module/component/tests |
| Attached private My notes | Feature-flagged | High | One Markdown note per item, autosave, local journal, conflicts, revisions, preview, export/delete, exact search | Not a second item, not E2EE, excluded from default bulk export | manual editor, item-notes DB/migration/routes/tests |
| Notes in AI and connections | Feature-flagged | High | Semantic index/Ask/Related with rollout flags, per-note opt-in, and provider acknowledgement | Exact search is separate; remote use is consent-gated | note flags/policy/worker/routes/tests |
| Global note AI default | Feature-flagged | High | Off-by-default first-save/recreation preference; non-retroactive | Parent note UI/write flags control reachability; does not rewrite existing notes | setting component/API/policy tests |
| Note Focus Mode | Feature-flagged | High | Same mounted editor, full viewport, history/deep-link support | Android keyboard/TalkBack and real screen-reader speech remain unverified | note focus modules/tests and release evidence |
| Provider/privacy/offline settings | Implemented | High | Provider status, note consent/default, privacy/offline copy, backup/export visibility | The comprehensive Trust Center is a separate planned proposal | settings pages, trust copy, provider status |
| App-shell offline fallback | Implemented | High | Cached shell/visited HTML/static assets plus attached-note draft journal | Implements fallback only; no offline capture queue or full offline library | service worker, offline page, note journal/tests |
| Local and off-site backups | Implemented | High | SQLite backup and encrypted off-site flow | Restore remains operator-oriented | backup module/scripts and dated release evidence |
| Health, errors, and quota diagnostics | Implemented | High | Health API, provider probes, client-error sink, quota page, deploy gates | Owner/operator diagnostics, not general analytics | health/errors/quota/deploy code and tests |
| Local status tooling | Implemented | High code; runtime Unknown | Read-only menu/status helpers for owner operations | Availability varies by machine; not a product dashboard | local status scripts and static/unit checks |

All rows were last verified at current main on 2026-07-11. Runtime evidence is feature-specific; the deployed application SHA does not imply that every row received an end-to-end production test.

## Ideas and non-current capabilities

| Idea or capability | Status | Confidence | What exists now | Why it is not Implemented | Primary evidence |
|---|---|---:|---|---|---|
| Reading Studio Lite | Planned | High | Source-reading Focus, trust strip, transcript panel, My notes | No PDF viewer, anchors/highlights, editable citations, or citation workflow | FCP-002 v2 |
| Contextual Ask Evidence Scan | Planned | High | Scoped Ask, selected-source scope, citations | No claim-support verdicts, retrieval snapshot, source-kind/high-quality policies | FCP-003 v2 and Ask code |
| Relationship Graph/Connection Map | Deferred | High | Query-time Related similarity and partial semantic events | No demonstrated recurring job, edge model/lifecycle, comparative advantage, graph route/UI, accessible parity, measurement owner, or exit proof | 2026-07-13 Graphify council decision; historical FCP-004 v2 |
| AI Services/Privacy Trust Center | Planned | High | Provider status, consent, privacy copy, backup/export visibility | No complete data-flow/readiness/eligibility dashboard or diagnostic bundle | FCP-005 v2 and Settings code |
| GenPage, GenLink, clusters, smart filters | Planned | Medium | Related/retrieval substrate | No current product route/flow | roadmap lanes |
| Spaced repetition/FSRS review | Planned | High | Quality Review inbox only | No scheduling/queue/streak/retention behavior | roadmap; no current service code |
| Flow and proactive suggestions | Planned | Medium | Enrichment/retrieval substrate | No proactive Catch-up/Learn/Discover flows | roadmap |
| Augmented Browsing overlays | Planned | Medium | Capture extension exists | No page-overlay/highlight experience | roadmap AUG lanes |
| Fully offline Android library | Planned | High | Fallback shell and visited-content cache | No complete local library, offline capture queue, or sync | offline docs/current code |
| Podcast, EPUB, DOCX/RTF/ODT ingestion | Planned | Medium | Some enum/type substrate | No complete routes/services/UI | roadmap and current source scan |
| Obsidian synchronization | Planned | Medium | Markdown export only | No import, identity, conflict, or sync path | roadmap |
| Structured Calm Green design | Planned | High | Alternative design document | Current UI remains Prism Memory | design docs/current styles |
| Rich note history/diff and editor tools | Explored | Medium | Revisions and Markdown editor exist | Diff/labels/find/outline/slash tools remain brainstorm concepts | F08 brainstorm |
| Note-aware search explanations and source policies | Explored | Medium | Exact/semantic search and note consent exist | No provenance filter/explanation or original-only/note-only Ask control | F08 brainstorm |
| Highlights, annotations, backlinks, synthesis, learning | Explored | Medium | Source/notes/related substrate | No committed product implementation | F08 brainstorm |
| Multi-project/multi-vault workspace | Deferred | High | Single store only | Council intentionally postponed | Council tracker RN-F01 |
| Full writing IDE/block editor | Deferred | High | Markdown note editor | Immediate product model rejects expanded IDE scope | tracker RN-F05 |
| Neo4j export | Deferred | High | No current exporter | Postponed | tracker RN-F09 |
| Matrix extraction | Deferred | Medium | No product flow | More research required | tracker RN-F12 |
| Existing Markdown/Obsidian vault adoption | Deferred | Medium | Export only | Identity/non-mutation proof missing | tracker RN-F14 |
| OCR and additional social/email/reader capture | Deferred | Medium | Current capture pipeline | No implemented adapters | roadmap deferred rows |
| Public share links, Notion, Slack | Deferred | Medium | No sharing/integration surface | Outside current private-owner scope | roadmap integrations |
| Multi-user/family/team support | Deferred | High | Single-owner model | Outside current architecture | roadmap FUT-3 |
| Native Kotlin replacement and iOS | Deferred | Medium | Capacitor Android only | No native replacement/iOS code | roadmap FUT-4/FUT-5 |
| WebAuthn/Touch ID | Deferred | High | PIN/bearer auth only | Feasibility explored; no dependency/source | roadmap S-004/F-040 |
| On-device Gemma summarization | Deferred | Medium | Other provider abstractions exist | Candidate/spike only | roadmap GEMMA-1 |
| Subscription/paywall | Rejected | High | None | Explicitly rejected for current personal app | Council tracker RN-F17 |
| Automatic remote processing of all attached notes | Rejected | High | Opt-in consent path | Violates explicit note privacy decision | note decision records |
| Silent AI rewriting of canonical notes | Rejected | High | No rewrite flow | Explicit trust boundary | F08 brainstorm decisions |
| Real-time collaboration | Rejected | High | None | Outside single-owner model | F08 brainstorm decisions |
| Multiple attached notes per item | Rejected | High | One canonical attached note | Immediate model intentionally one-to-one | F08 brainstorm decisions |
| Decorative graph-first redesign | Rejected | High | Related list only | Unexplained edges rejected | F08 brainstorm decisions |
| 100% local Mac/Ollama runtime | Superseded | High | Local providers remain options | Hosted service, managed edge, and cloud providers replaced the original runtime claim | current deploy/provider code |
| LAN/mDNS and QR-first pairing | Superseded | High | Short-lived code pairing | Managed tunnel and code exchange replaced earlier design | pairing code/current docs |
| `/items/new` note form | Superseded | High | Redirect exists | Capture note tab is current entry | redirect/capture code |
| Android offline outbox/inbox plan | Superseded | High | Honest offline fallback only | UX v2 removed unsupported queue promise | offline copy/current code |
| Initial `yt-dlp` capture design | Superseded | High | Zero-dependency capture plus gated recovery | Current pipeline replaced initial approach | YouTube code/history |

## Product boundaries and aliases

- AI Brain is currently branded **AI Memory** in parts of the UI; treat AI Memory as an alias until a naming decision exists.
- An **item** is the canonical library record. Original source, generated digest, standalone note item, and attached My notes are distinct layers.
- Review/Needs Upgrade are source-quality attention surfaces, not spaced repetition.
- Related means query-time similarity, not a graph.
- Private means authenticated/single-owner/default-unshared, not end-to-end encrypted.
- Android is a private thin client, not a public native/offline product.
- Export is not two-way Markdown or Obsidian sync.
- Schema/type substrate for cards, podcast, EPUB, or DOCX does not prove those features.
