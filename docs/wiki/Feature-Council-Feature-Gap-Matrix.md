# Feature Gap Matrix

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
Version: v2 after core adversarial review

| Research / UX idea | Live AI Brain state | Gap classification | Council disposition | Target package |
| --- | --- | --- | --- | --- |
| RN-F01 Project/vault setup | Single SQLite-backed personal app; no multi-vault project model | Needs storage strategy | Park for later | None |
| RN-F02 PDF import/source management | PDF capture exists; source metadata/readiness is thin | Enhancement | Proceed through reduced scope | FCP-001, FCP-002 |
| RN-F03 Reading Studio | No PDF viewer or side-by-side notes | New feature | Proceed with reduced scope | FCP-002 |
| RN-F04 Highlights/bookmarks/anchors | No source anchors beyond Ask citation chunk links | New feature | Proceed with reduced scope | FCP-002 |
| RN-F05 Markdown editor/slash commands | Manual note textarea only; no article editor | New feature, broad scope | Park for later | None |
| RN-F06 Smart citations/BibTeX/APA | Markdown export exists; citation management missing | New feature | Proceed with reduced scope | FCP-002 |
| RN-F07 Source metadata management | Capture metadata exists; editing/quality ownership is thin | Enhancement | Proceed | FCP-001, FCP-002 |
| RN-F08 Graph View | Related items exists; graph plan docs exist; no graph UI | New feature/enhancement | Proceed with reduced scope | FCP-004 |
| RN-F09 Neo4j export | No graph export | New feature, niche | Park for later | None |
| RN-F10 Semantic search | FTS/semantic/hybrid exists | Enhancement | Proceed as readiness/scope upgrade | FCP-003 |
| RN-F11 Source indexing/extraction | Chunks/embeddings/artifacts exist; readiness contracts partial | Enhancement | Proceed | FCP-001, FCP-003 |
| RN-F12 Matrix extraction | Missing | New feature, specialized | Needs more research | None |
| RN-F13 Evidence Scan | Missing; Ask citations provide adjacent substrate | New feature | Proceed with reduced scope | FCP-003 |
| RN-F14 Existing Markdown vault adoption | Export exists; import missing | New feature, high data safety risk | Needs more research | None |
| RN-F15 Local AI runtime management | Provider status exists; not a full readiness/trust center | Enhancement | Proceed | FCP-005 |
| RN-F16 Privacy settings/analytics | Privacy copy exists; no full trust center or opt-in analytics policy UI | Enhancement | Proceed | FCP-005 |
| RN-F17 Subscription/paywall | Missing and not needed for personal app | Low-value/rejected | Reject | None |
| UX-02 Capture result contracts | Inconsistent across channels | Enhancement | Proceed | FCP-001 |
| UX-03 Weak-source repair workflow | Review/upgrade primitives exist, not coherent workflow | Enhancement | Proceed | FCP-001 |
| UX-04 Ask context/high-quality scope | Ask supports library/item scope; no attach-context/high-quality-only UX | Enhancement | Proceed | FCP-003 |
| UX-05 Android Ask composer | Thin WebView; responsive UX unverified for advanced composer | Enhancement | Park until FCP-003 | None |
| UX-06 Android share result surface | Share capture exists; designed result/repair states thin | Enhancement | Proceed as channel requirement | FCP-001 |
| UX-09 Privacy/offline/settings trust states | Settings exists; trust states incomplete | Enhancement | Proceed | FCP-005 |
| UX-11 YouTube trust strip | Capture quality metadata exists; item-specific trust UI partial | Enhancement | Proceed through FCP-001 | FCP-001 |

## Cross-Cutting Gap Themes

1. Trust before novelty: users must know whether a captured source is complete, weak, stale, repaired, indexed, or excluded.
2. Source-backed workbench: reading, anchors, citations, and metadata should build on the existing item/source substrate before introducing writing IDE features.
3. Ask needs inspectable source controls: high-quality-only retrieval, attached context, and evidence scan should reduce false confidence.
4. Graph should be derived: owner tables remain source of truth; graph snapshots are rebuildable and disposable.
5. Privacy/readiness must be honest: AI Brain currently has cloud-provider paths, so the UI must state exactly what leaves the app and why.
