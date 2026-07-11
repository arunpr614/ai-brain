# AI Brain Feature Council Core Artifacts v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-Research](Feature-Council-Research).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-Research](Feature-Council-Research). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Created: 2026-06-28 21:23 IST  
Branch: `codex/ai-brain-feature-council-20260628`  
Worktree: `local research workspace`

## Purpose

This v1 baseline collects the first-pass live audit, research inventory, feature gap mapping, and council decisions for the AI Brain feature strategy effort. It is intentionally compact so the adversarial review can evaluate the logic before the final required files are split out.

## Live App Baseline

The live AI Brain repo is a Next.js 16, React 19, TypeScript, SQLite, and sqlite-vec app with a single-user local/cloud hybrid deployment. The current implementation includes:

- Library list and item detail surfaces in `src/app/page.tsx` and `src/app/items/[id]/page.tsx`.
- Capture surfaces for URL, PDF, and notes in `src/app/capture/page.tsx`, `src/app/capture/tabs.tsx`, and capture API/action modules.
- Search across full-text, semantic, and hybrid modes in `src/app/search/page.tsx` and `src/lib/search`.
- RAG Ask with SSE streaming, citations, item scope, and chat persistence in `src/app/api/ask/route.ts`, `src/app/ask`, `src/lib/ask`, `src/lib/retrieve`, and `src/db/chat.ts`.
- Tags, collections, bulk actions, export, related items, provider status, and review queue surfaces.
- Chrome MV3 extension capture and a thin Capacitor Android shell pointed at `the configured AI Brain web host`.
- the deployment host deployment, managed tunnel, authenticated health checks, and off-site backup scripts.

Partial or thin areas:

- Capture result states exist technically but are inconsistent across web, extension, Android, and review surfaces.
- Weak-source repair exists as retry/ignore/upgrade-text primitives, but not as a coherent repair workflow.
- Review cards/SRS schema exists but product flow is not shipped.
- Knowledge graph, augmented browsing, Matrix extraction, Evidence Scan, Neo4j export, reading studio, and citation management are not shipped.
- Offline Android behavior is mostly fallback/readiness, not full offline library or queue.
- Privacy and AI-service settings are truthful but not yet a full trust center.

## Research Inventory Baseline

The research path `local research workspace` is a Vite/Supabase research app plus a complete `docs/note-md-exploration` planning corpus. The highest-confidence note.md candidates are:

- F01 project/vault setup.
- F02 PDF import and source management.
- F03 Reading Studio.
- F04 highlights, bookmarks, annotations, and anchors.
- F05 Markdown editor and slash commands.
- F06 smart citations and BibTeX/APA export.
- F07 source metadata.
- F08 graph view.
- F09 Neo4j export.
- F10 semantic search.
- F11 source indexing and extraction.
- F12 Matrix extraction.
- F13 Evidence Scan.
- F14 existing Markdown vault adoption.
- F15 local AI runtime management.
- F16 privacy settings and optional analytics.
- F17 subscription/paywall.

The research package is public-documentation-derived and repeatedly warns that implementation entry still requires source/runtime proof for heavier features.

## Council Method

Each candidate was evaluated by a council lens:

- Coordinator: artifact consistency and fit to this goal.
- Project manager: sequencing, milestone risk, blockers.
- Growth/engagement PM: user value, habit formation, retention.
- Platform/data PM: data model, ingestion, retrieval, privacy.
- Power-user/workflow PM: daily flow, edge cases, trust.
- Technical architect: feasibility, architecture, security, maintainability.
- UX/UI designer: interaction quality, state clarity, responsive behavior.
- QA/reviewer: acceptance criteria, testability, failure modes.

## First-Pass Decision Summary

Approved for v2 package creation:

1. FCP-001 Capture Quality And Repair Center - Proceed.
2. FCP-002 Source Workspace And Reading Studio Lite - Proceed with reduced scope.
3. FCP-003 Contextual Ask And Evidence Scan - Proceed with reduced scope.
4. FCP-004 Relationship Graph And Connection Map - Proceed with reduced scope.
5. FCP-005 AI Services And Privacy Trust Center - Proceed.

Parked or not approved:

- Full note.md multi-vault project model: park; AI Brain is single-user single-store today.
- Full Markdown editor/slash command environment: park; app is memory-first, not a writing IDE yet.
- Matrix extraction: needs more research; strong for literature review, weaker for daily personal memory.
- Neo4j export: park; niche and dependent on graph maturity.
- Existing Markdown vault adoption: needs more research because source mutation, identity, and import guarantees are high risk.
- Subscription/paywall: reject for this personal app unless commercialization becomes a separate strategy.

## V1 Risks Noted By Author

- The approved packages may still be too broad.
- Research-to-live mapping needs stronger source confidence labels.
- Mobile/extension constraints need to be explicit in each approved package.
- The final package must avoid implying implementation authorization.
