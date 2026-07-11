# Card Processing Workflow — Source Reconciliation

## Authority order

1. Current repository code at `1cb5d36f...` for existing behavior.
2. The feature objective for the desired problem/direction.
3. Canonical living wiki `docs/wiki/` and published wiki at `88a3520...` for reconciled explanation/status.
4. Dated prior councils, roadmap, UX plans, and prototypes as historical hypotheses only.
5. Root README/version trackers only when confirmed by current code; the living wiki explicitly marks them as staleness traps.

## Reconciled conflicts

| Topic | Evidence conflict | Resolution |
|---|---|---|
| Product name | UI says AI Memory; repository/wiki say AI Brain | Prototypes match AI Memory shell and document the project as AI Brain |
| “Card” object | Objective says cards; code central object is `items`; DB `cards` is SRS | UI may say card/source; architecture always attaches workflow to `items` |
| Existing Inbox ideas | Old `DESIGN_SYSTEM.md` describes a future Inbox; current code has no workflow Inbox; Review is quality attention | Treat old Inbox as planning inspiration and Review as orthogonal quality behavior |
| Status | Current `enrichment_state` has pending/running/etc.; requested workflow has Inbox/To Do/In Progress/Done | Add a separate `workflow_status`; never overload operational state |
| “AI category tags” | Current code has scalar category, auto tags, and AI topics | Public Processing filters use User tags (manual) and AI topics; category/auto tags remain separate/legacy |
| Archive | Some docs use “archive” generically for saved knowledge or docs cleanup; item code only hard-deletes | New `archived_at` is a recoverable Processing lifecycle, not delete or documentation archive |
| Analytics | Operational logs/usage exist; objective asks throughput metrics | Use content-free workflow events; do not infer metrics from JSONL or current timestamps |
| Backfill | Product direction warns against silent all-history Inbox; platform wants a valid persisted model | Baseline every legacy row as dormant Inbox/version 0, keep it outside Processing with null `workflow_enrolled_at`, and enroll recent/selected/all only through explicit owner action; baseline/enrollment never inflate metrics |
| Manual ordering | Board concepts assume ranking; platform flags concurrency/rebalance cost | No manual intra-column rank in v1; drag changes status only; deterministic ordering and Inbox sort options |
| Archive visibility | Objective asks separate archive; unclear effect on Library/search/Ask | Archive hides only from active Processing; Library/search/Ask/export remain eligible with an Archived badge |
| Detail surface | Objective asks page/modal/drawer choice; current canonical detail is a route | Full route remains truth; recommended prototype tests an optional read-only/quick-action drawer without duplicating notes editing |
| Mobile board | Requirement includes Kanban; current mobile is list/bottom-nav oriented | Mobile defaults to Inbox/List and offers one-status-at-a-time board segmentation, never drag-only horizontal mini-columns |
| Wiki baseline | Wiki records code baseline `23868f...`; branch base is later merge `1cb5d36...` | Later commits are documentation closeout; inspected source behavior is unchanged, but citations record both hashes |

## Prior artifacts inspected

- `docs/feature-council/00_CORE_ARTIFACTS_v1.md` and dated FCP packages/reviews.
- `docs/feature-council/F08-manual-content-notes/` for v1/review/v2 and isolated prototype discipline.
- `docs/feature-council/note-focus-mode/` for current item-detail/notes evolution and validation.
- `UX_DESIGN_PRODUCT_MODEL.md`, `UX_DESIGN_REQUIREMENTS_DOCUMENT.md`, `UX_REDESIGN_APPROACH_WEB_AND_MOBILE.md`, and `UX_DESIGN_GAP_ANALYSIS_AND_REDESIGN_PRIORITIES.md`.
- `DESIGN_SYSTEM.md`, `DESIGN.md`, and current token/source files.
- Wiki Product Overview, Feature Catalog, Ideas and Exploration, Library and Items, Capture and Ingestion, Organization, Data Model, Architecture, Status Baselines, and Changelog.

## Unresolved until prototype/review

- Whether the Inbox entry should eventually replace More or Ask in mobile primary navigation.
- Whether the quick-detail drawer is valuable enough to include after prototype testing.
- Whether a post-v1 manual priority/rank feature is justified.
- Whether archived items should remain in the separate quality Review surface; default is yes because workflow and capture quality are orthogonal.

None of these unknowns blocks the discovery recommendation or isolated prototypes.
