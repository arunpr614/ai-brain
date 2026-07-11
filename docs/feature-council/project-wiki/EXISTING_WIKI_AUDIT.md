# Existing GitHub Wiki Audit

**Wiki baseline:** `3d578c3f66e61de3f124a855253e713758f6a49b`
**Audit date:** 2026-07-11
**History:** 8 commits preserved in the separate wiki repository

The page-by-page audit and before/after decision map is `EXISTING_WIKI_PAGE_AUDIT_AND_MIGRATION.csv`. It contains all 63 pre-existing pages plus 21 additions, with purpose, prior quality/accuracy/duplication/completeness, orphan/broken-link status, preservation value, action, destination, reason, and before/after hashes.

## Inventory and verification

- 63 tracked Markdown files: 62 content pages plus `_Sidebar.md`.
- 18 living/core pages and 44 Feature Council research/history pages.
- 0 broken internal links and 0 graph-orphaned pages.
- 62 of 62 live wiki page URLs returned HTTP 200.
- 51 of 51 unique external GitHub evidence/prototype URLs returned HTTP 200.
- No `_Footer.md` exists.

## Valuable content to preserve

- Evidence hierarchy and independent product/code/runtime status.
- Pinned source links and explicit Unknown state.
- Architecture diagram and failure-isolation model.
- Command safety and public/private documentation boundary.
- Manual Content Notes no-loss, privacy, and rollout contracts.
- Publishing concurrency, verification, and rollback process.
- Agent workflows and safe troubleshooting.
- Feature Council lifecycle banners, decisions, reviews, prototypes, and Git history.

## Problems to correct

1. Nine core pages contradict newer pages about whether a complete production SHA is known.
2. The old Shipped/Main/Runtime vocabulary does not map directly to the required definitive status taxonomy.
3. Several Council proposals overlap partially implemented current capabilities without an explicit delta.
4. Forty-four historical/research pages crowd the living wiki and duplicate status narratives.
5. Feature detail is uneven: Manual Content Notes is deep, while most capabilities are compressed into domain summaries.
6. The 43-by-12 feature table is difficult to scan, especially on mobile.
7. Missing explicit pages include AI Agent Start Here, Technology Stack, Repository Map, APIs and Integrations, Feature Architecture, Ideas and Exploration, Known Limitations, Glossary, and Documentation Changelog.

## Audit limitation

HTTP success proves addressability, not semantic currency. Mermaid and all long-table renderings still require publication-candidate visual checks.
