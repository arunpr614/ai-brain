# Kanban Card Processing — source-conflict report

**Date:** 2026-07-12
**Resolution authority:** execution goal → explicit stakeholder handoff → reviewed source v2 → latest main

| ID | Conflict | Resolution | Implementation consequence |
|---|---|---|---|
| SC-01 | Source PRD/technical/UX say no implementation authority; current goal explicitly authorizes full release. | Current goal supplies authority; older classification remains historical evidence. | Implement, but never backdate “Implemented” status before live verification. |
| SC-02 | Prototype `Process next` chooses the newest/first fixture while PRD/copy require oldest current Inbox entry. | PRD/data rule wins. | Query/order/focus use `workflow_inbox_entered_at ASC, id ASC`; add regression. |
| SC-03 | Metrics framework uses first-lifetime Processed; later reviewed artifacts use once per Inbox-entry episode. | Episode-based Processed; first lifetime is Triaged diagnostic. | Persist/derive opaque episode ID and exclude linked undone exits. |
| SC-04 | Handoff sort includes “Custom fixture order”; product scope rejects manual rank. | Fixture order is prototype-only. | Production exposes Workflow default/field sorts; no rank storage/custom sort. |
| SC-05 | Board/List handoff defaults Oldest captured; dedicated Inbox must use current-entry age. | Both are valid in separate scopes. | Inbox ordering is fixed current-entry; Board/List organization may use capture-age sort. |
| SC-06 | Older research uses generic `archived_at`; later model uses `workflow_archived_at`. | Use workflow-prefixed attribute and “Archived from Processing” copy. | Never confuse with hard delete/global archive. |
| SC-07 | Earlier power-user research advocates batch/manual priority; reviewed PRD removes them. | Reviewed PRD wins. | Defer batch, rank, and priority. |
| SC-08 | Prototype persists `theme` in its review URL; production already has global Light/Dark preference. | Existing application appearance owns theme. | No Processing-specific theme state; preserve parity via current tokens. |
| SC-09 | Prior technical plan assumes existing `GET /api/items/[id]`; latest main has only canonical page read. | Current code wins. | Add bounded Processing APIs only; keep `/items/[id]` canonical. |
| SC-10 | Wiki says migration 024 is candidate/not deployed; latest main and production report 024 applied. | Current repo/production evidence wins. | Workflow migration uses `025_...`; update Wiki only after actual release. |
| SC-11 | Older source baseline predates merged Recall manual sync and latest navigation/docs. | Reconcile against `5b92e68`. | Avoid file/module assumptions from `1cb5d36`; preserve migration 024/Recall behavior. |
| SC-12 | Goal mentions daily and weekly processing metrics; reviewed PRD rejects persistent daily pressure tiles. | Preserve daily values as secondary/transient activity evidence; persistent hierarchy is weekly. | API may compute today/week; UI keeps Today out of pressure headline. |
| SC-13 | Goal says archiving/restoring where supported; approved source makes Done-only archive/restore/reprocess mandatory. | Approved detailed model wins. | Implement Archived view, Restore Done, Reprocess Inbox. |
| SC-14 | Goal names AI-generated “category tags”; current app has both generated tags, topics, and category. | Reviewed design identifies AI Topics as the facet. | Filter `topics/item_topics`; keep `items.category` and auto tags independent. |
| SC-15 | Source planned production-size evidence but current production is only 129 items. | Use real production baseline plus synthetic 10k/50k fan-out. | Rehearse additive migration on safe copy and benchmark generated scale. |

No approved material requirement is silently removed by these resolutions.
