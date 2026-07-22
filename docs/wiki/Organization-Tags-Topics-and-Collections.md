# Organization: Tags, Topics, and Collections

Purpose: Explain AI Brain's organization model and its terminology boundaries.
Audience: AI agents and contributors changing taxonomy or navigation.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-10; organization behavior was not independently re-tested for this revision.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Default

- Category is a single enrichment-generated classifier on an item.
- Tags are many-to-many labels and can be manual or generated.
- Topics are generated concepts with dedicated topic pages and evidence-bearing joins.
- Collections are explicit manual groups/folders.

Users manage tags and collections from Settings, open topic/collection pages, and apply taxonomy through item or bulk actions. Enrichment can add generated category/tags/topics.

The feature does not include hierarchical taxonomies, smart rule collections, multi-vault organization, backlinks, or a graph. Historical documents sometimes use category/topic/tag interchangeably; current database concepts are distinct.

Primary files: `src/db/tags.ts`, `topics.ts`, `collections.ts`, taxonomy actions, topic/collection pages and tests.

## User problem, entry points, and journey

The owner needs lightweight manual grouping plus AI-assisted discovery without collapsing distinct concepts. Entry points are item details, bulk actions, tag/collection Settings, topic pages and collection pages. Journey: inspect generated/manual labels → add/remove or collect → browse the resulting scope → optionally Ask over that scope.

## States and architecture

Empty topic/collection pages retain identity and explain the absence of items; loading follows server navigation; successful mutations refresh joins; invalid names/IDs or transaction failures return without altering unrelated taxonomy. `src/app/taxonomy-actions.ts` and application actions call synchronous repositories for tags/topics/collections and join tables. Enrichment writes generated category/tags/topics; collections are explicit user actions. Topic/collection scopes feed retrieval and Ask.

API/server-action entrypoints use taxonomy and application actions; data storage is SQLite organization tables and joins. Operational changes may require backfill/reclassification review when generated topics/tags change.

## Security, configuration, tests, and impact

Browser mutations require the owner session. No feature flag controls core taxonomy; provider configuration affects generated labels only. Tests include `src/db/topics.test.ts` and repository/action coverage for items, tags and collections, plus Ask scope tests. Changes can affect Library filters, item detail, generated enrichment, search/Ask scopes and exports. Pinned evidence: [current organization repositories](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/db).

Related current features are Library, Enrichment and scoped Ask. Related explored ideas are smart filters/collections, backlinks, graph views and multi-vault organization.
