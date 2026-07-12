# Card Processing Workflow

Purpose: Document the shipped owner-only workflow for triaging captured cards through Inbox, To Do, In Progress, Done, and archive.
Audience: AI Brain users, agents, engineers, designers, and operators.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-12 staged production rollout and live workflow verification.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Enabled in the verified private production release

AI Brain provides a dedicated `/processing` workspace for reducing the backlog of captured cards without changing Library membership or replacing the canonical item-detail experience. Newly created items enter Inbox automatically. Historical items remain dormant until the owner explicitly enrolls selected items directly from Library, the most recent 30 days (capped at 25), or all items.

## User problem and journey

The single owner needs a low-pressure way to turn an accumulating capture backlog into deliberate next actions. The typical journey is enter Processing → choose Inbox, Board, List, or Archived → narrow by User tag or AI Topic → open or move one card → use Undo or a permanent reverse action when needed → return to the same filtered context.

## State and failure matrix

| State | Behavior |
|---|---|
| Empty | Distinguishes an empty workflow from a filter with no matches and offers capture/enrollment paths. |
| Loading | Keeps navigation and current view context while bounded cards or groups load. |
| Success | Shows current projection, exact counts/metrics, and a live-region confirmation for the completed action. |
| Failure | Preserves current truth, reports private content-safe errors, and offers retry/outcome lookup without claiming success. |

## Experience

Processing has four views:

- **Inbox:** deterministic oldest-current-entry queue with Process next.
- **Board:** four status groups with independent bounded pagination.
- **List:** compact rows with the same filters, counts, and single-item actions.
- **Archived:** completed cards that can be restored to Done or reprocessed into Inbox.

The owner can filter by User tags and AI Topics, group or sort within supported modes, and see exact total/matching counts for Inbox, To Do, In Progress, and Done. Today and week-to-date metrics distinguish cards added, processing episodes, and first-lifetime completion without streaks, overdue pressure, or celebration mechanics.

Desktop navigation exposes Processing beside Library. Mobile exposes it through More, with additional entry points from the Library summary, command palette, and successful capture feedback. In Library, selecting up to 100 sources exposes **Add to Inbox**: eligible sources are added directly, while already-enrolled or unavailable sources are reported without duplication or state reset. Item detail and My notes remain the existing canonical surfaces; moving a card never saves, discards, or remounts an unsaved note draft.

## Workflow behavior and recovery

Moves use compare-and-swap versioning. A stale tab receives current truth instead of overwriting a newer change. Repeating the same mutation or selected-enrollment request ID returns its durable outcome. A direct Library add classifies every requested source as added, already present, missing, or deleted, including a concurrent enrollment, so the result always accounts for the exact submitted set. The most recent eligible action in a browser tab has a server-backed 30-second Undo window; permanent Move, Restore, Reprocess, and archive controls remain available when Undo expires.

Only Done cards can be archived. Restore returns an archived card to Done. Reprocess atomically returns it to Inbox. Archive changes Processing visibility only: Library, search, Ask, detail, export, enrichment, and attached notes continue to use the same retained item.

## Data, APIs, and privacy

Migration `025_item_workflow.sql` adds validated workflow projections to `items`, append-only content-free events, durable mutation receipts, tab-scoped Undo slots, enrollment jobs, owner timezone preferences, readiness state, and supporting indexes. New captures initialize Inbox, version 1, a receipt, and an event in one transaction. Hard deletion cascades workflow records with the existing item cleanup contract.

Browser APIs under `/api/processing/**` and `/api/items/[id]/workflow/**` require a valid PIN session. Bearer-only access is rejected. Reads and writes return allow-listed private/no-store responses; writes additionally require the exact configured HTTPS origin, bounded request bodies, validated enums/identifiers, mutation IDs, and per-session rate limiting.

## Architecture and runtime flow

The existing `items` row remains the aggregate. Authenticated Processing pages call bounded summary, page/group, filter, preference, enrollment, and mutation endpoints. Repository transactions update the validated current projection together with immutable receipts/events; readiness and epochs invalidate unsafe or stale reads without placing deep audits on request paths. Existing capture, Library, detail, notes, retrieval, enrichment, and deletion paths continue to own their original responsibilities.

## Availability, operations, and rollback

Read, write, and navigation flags are independent and default off on fresh configuration. Effective access also requires a fresh green database readiness checkpoint. Deep readiness runs during deployment, startup, and on a six-hour system timer rather than on request paths.

The verified rollout enabled reads, then writes, then navigation with observation windows at every stage. Rollback first disables the three flags. Code rollback uses an attested immutable known-good runtime; schema 025 is backward-compatible only through the explicit compatibility guard. Database restore remains a last resort because it loses later writes and does not restore filesystem capture artifacts.

Protecting tests cover ingestion initialization, dormant/enrolled history, ordering, filters, exact counts and metrics, owner-local DST windows, pagination/cursor invalidation, replay/CAS/Undo, archive behavior, item deletion, route authentication/privacy, streaming limits, rate limiting, readiness, immutable release safety, and deterministic 10k/50k performance. Production verification adds staged health/readiness/integrity, authenticated workflow, journal, audit-timer, and cleanup evidence.

## Boundaries

The release does not add drag-and-drop, bulk workflow-state mutations, manual rank, due dates, assignees, sprints, WIP limits, collaboration, an offline mutation queue, a global archive, or a replacement AI taxonomy.

Related: [Library and Items](Library-and-Item-Management), [Capture and Ingestion](Capture-and-Ingestion), [Organization](Organization-Tags-Topics-and-Collections), [APIs and Integrations](APIs-and-Integrations), [Deployment and Operations](Deployment-and-Operations), and [Backups and Restore](Backups-and-Restore).
