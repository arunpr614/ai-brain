# Live Feature Audit

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Created: 2026-06-28 21:23 IST  
Version: v2 after [CORE_ARTIFACTS_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-Core-v1-Adversarial-Review)

## Audit Scope

This audit inspected the clean AI Brain worktree on branch `codex/ai-brain-feature-council-20260628`. It is a planning audit, not a production runtime verification. No production code was changed.

## Current Stack And Operating Model

| Area | Current state | Evidence |
| --- | --- | --- |
| Web app | Next.js 16, React 19, TypeScript, Tailwind 4, Radix primitives, Lucide | `package.json`, `src/app/*`, `src/styles/tokens.css` |
| Storage | Single-user SQLite via `better-sqlite3`, FTS5, `sqlite-vec`, WAL, migrations | `src/db/client.ts`, `src/db/migrations/*.sql` |
| AI providers | Claude/OpenRouter/Ollama abstractions for generation, Gemini/Ollama embeddings, provider status checks | `src/lib/llm/*`, `src/lib/embed/*`, `src/lib/providers/status.ts` |
| Deployment | the deployment host service behind managed tunnel with authenticated release health checks | `scripts/deploy.sh`, `scripts/deploy/brain.service`, `README.md` |
| Mobile | Capacitor Android thin WebView loading `the configured AI Brain web host`; offline fallback only | `capacitor.config.ts`, `android/*`, `public/offline.html` |
| Extension | Chrome MV3 popup/options/context menu capture for page/link/selection | `extension/manifest.json`, `extension/src/background.ts`, `extension/src/capture.ts` |
| Tests | Node test runner, route/unit tests, smoke scripts, APK build script | `package.json`, `src/**/*.test.ts`, `scripts/smoke-*.mjs` |

## Implemented User-Facing Features

| Feature area | Exists today | Notes |
| --- | --- | --- |
| Library | Yes | Chronological library with search entry and capture CTA in `src/app/page.tsx`. |
| Capture | Yes | URL, PDF, note, YouTube handling, selected text, Telegram source type, and capture quality metadata are represented in code. |
| Item detail | Yes | Original body, tags, collections, capture metadata, source link, digest, related items, export, item-level Ask. |
| Search | Yes | Full-text, semantic, and hybrid search with provider offline handling. |
| Ask | Yes | SSE streaming, citations, library/item scope, thread persistence, provider fail-fast. |
| Organization | Yes | Manual tags, collections, bulk tag/collection/delete, auto tags/categories from enrichment. |
| Review queue | Yes | Captures needing attention, transcript retries/ignore, weak text upgrade links, duplicate/search gap visibility. |
| Related items | Yes | Semantic related items panel when embeddings exist. |
| Export | Yes | Single item Markdown and full-library zip export. |
| Device pairing | Yes | Bearer token pairing and settings surfaces exist. |
| Backups | Yes | Local and off-site backup scripts/documentation exist. |

## Partial Or Uneven Features

| Area | Current gap | Product risk |
| --- | --- | --- |
| Capture result states | Web, extension, Android, review, and API do not share one visible result contract for full text, metadata-only, duplicate, updated, failed-with-save, and repair-needed outcomes. | User may think an item is saved well when it is weak or unusable. |
| Weak-source repair | Retry, ignore, delete, and pasted-text upgrade primitives exist, but there is no coherent repair center with lifecycle, reset-derived-state behavior, and success proof. | Broken captures accumulate and poison retrieval. |
| AI service readiness | Provider status exists, but not a full trust center for model readiness, degraded modes, diagnostics, privacy boundaries, and source eligibility. | Users cannot tell whether Ask/search failed because content is weak, model is down, entitlement/gate is absent, or indexing is stale. |
| Mobile shell | Android is a WebView shell; offline behavior is fallback, not full offline queue/read. | Mobile expectations can exceed actual guarantees. |
| Extension parity | Extension uses notification copy and storage, but advanced result/repair states are not first-class. | Capture quality improvements could bypass extension users. |
| Chat history UI | Threads persist in DB/API but the current Ask UI is turn-local unless additional thread surfaces are used. | History expectations are unclear. |
| SRS/review learning | `cards` schema exists, but a spaced-repetition product is not shipped. | Memory retention differentiator remains unrealized. |
| Auth guard consistency | HMAC session verification exists, but some middleware/routes primarily gate on cookie presence while bearer auth is separate. | Future APIs could inherit inconsistent security posture unless a shared guard is defined. |
| Enrichment ownership | Realtime enrichment worker and batch enrichment both start from instrumentation; ownership mode needs clarification before planning cost/latency features. | Duplicate or competing processing could distort status, cost, and user-facing readiness. |
| Usage accounting | Some provider usage rows are still labeled `ollama` even where provider selection can be Anthropic/OpenRouter. | Cost/trust UI could mislead users. |
| Deploy migration proof | Runtime migrations are read from bundled files; deploy checks should explicitly prove migration files are present in standalone artifacts. | A release could boot without required schema changes. |
| Android multi-file mismatch | Android manifest advertises multi-PDF share, while the share handler processes a first file. | Mobile capture promises can exceed behavior. |

## Missing Feature Families

| Feature | Status |
| --- | --- |
| Reading Studio PDF viewer with side-by-side notes | Missing |
| Highlights/bookmarks/annotations anchored to source passages | Missing |
| Citation manager, BibTeX/APA export, citation insertion | Missing |
| Evidence Scan claim checker | Missing |
| Matrix extraction/literature-review table workflows | Missing |
| Knowledge graph visualization | Planned in docs, not shipped |
| Neo4j export | Missing |
| Existing Markdown/Obsidian vault import | Missing |
| Full offline Android library/read queue | Missing |
| Subscription/paywall | Missing and intentionally out of current personal-app scope |

## Data Model Observations

AI Brain already has a strong substrate for many approved plans:

- `items`, `chunks`, `chunks_vec`, `chunks_rowid`, FTS triggers, `enrichment_jobs`, and `embedding_jobs` support capture, enrichment, retrieval, and search.
- `capture_artifacts`, `capture_metadata_cache`, capture quality columns, and transcript jobs support source quality and repair planning.
- `tags`, `collections`, and join tables support organization.
- `chat_threads` and `chat_messages` support durable Ask conversations.
- `cards` exists but is not a shipped product surface.

Main data risk: new features must distinguish user-authored state, imported source state, derived/cached state, AI-generated state, and exported state. Deletion and re-indexing must be explicit.

## Deployment And Verification Constraints

- Local development expects Node 22; deployment preflights enforce a configurable Node major.
- Release runs typecheck, lint, tests, env checks, AI provider checks, build, artifact sync, service restart, authenticated health check, provider check, and optional Telegram smoke.
- Native dependencies are repaired on the deployment host after sync.
- Android and extension behavior must be tested separately from web because both have independent packaging/state constraints.
- Extension tests live outside the root TypeScript/test sweep; Android test files are still default examples. Any package touching those channels needs explicit verification.

## Audit Conclusions

The app is beyond a simple MVP: capture, enrichment, Ask, semantic search, review, extension, mobile shell, provider status, and deployment hygiene exist. The highest-value strategy is not to copy all note.md features. It is to deepen the trust layer around capture quality, repair, source evidence, Ask context, graph relationships, and AI-service readiness.
