# Card Processing Workflow Exploration

Purpose: Preserve the 2026-07-11 feature-council exploration that preceded the shipped Card Processing Workflow.
Audience: Product/design reviewers, engineers, maintainers, and AI agents.
Verified against: deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`; original exploration baseline `df4c42b9869f8a35b9557bc64bf6ecdb9d11b416`.
Runtime evidence through: 2026-07-12 for the successor implementation; this historical prototype itself used fictional in-memory data.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

> **Status: Superseded historical exploration.** The shipped behavior is documented in [Card Processing Workflow](Card-Processing-Workflow). This page preserves the proposal and decision trail; where it differs from the current page, current implementation wins.

## Problem explored

AI Brain made capture easy, but the Library did not provide a deliberate lightweight lifecycle for deciding what to do with each saved source. Tags and AI topics organized knowledge; capture quality and Review identified fidelity/attention needs; neither expressed the owner's current workflow intent.

## Explored directions

| Direction | Thesis | Strength | Main risk |
|---|---|---|---|
| A — Workflow | Board-first spatial operations | Whole-workload visibility and repeated desktop movement | Project-management drift, scale, mobile, and accessibility complexity |
| B — Processing | Inbox-first deliberate triage | Clearest next decision, strongest mobile/accessibility fit | Read-only preview and mobile discovery had to earn their complexity |
| C — Queue | Library-integrated dense lens | Maximum Library reuse and dense scanning | Easy to mistake for another Library filter; weak dedicated habit |

The weighted comparison scored A 70, B 94, and C 79. The council recommended **Direction B: Processing, Inbox-first** while preserving A and C for comparison.

## Recommended proposal

- Dedicated Processing section, desktop peer to Library; Inbox as the landing job.
- Mobile under More, with a Library Inbox summary and capture feedback.
- Workflow statuses Inbox, To Do, In Progress, and Done.
- Transactional Inbox initialization for genuine new items; duplicate/repair/enrichment paths preserve lifecycle.
- Dormant historical baseline until explicit selected/recent/all enrollment.
- Board, List, Archived, and oldest-first Inbox views over the same retained items.
- User tags, AI topics, quality/enrichment, SRS Review, workflow status, and archive remain separate.
- Native Move control as the universal action; no dependency on drag-and-drop.
- No manual rank, batch mutation, offline mutation queue, or general project-management scope.
- Existing item detail and My notes remain canonical.
- Done-only workflow archive, Restore to Done, and explicit Reprocess to Inbox.

## Proposed metrics and archive

The proposal separated capture-only Added, one effective Processed exit per Inbox-entry episode, and first-lifetime Completed. It explicitly rejected streaks, guilt/debt colors, time-in-app, and raw transition volume.

Archive was proposed as a separate Done-only workflow timestamp that hides a source only from active Processing. The same item would remain in Library, detail, notes, search, Ask/citations, Related, repair, export, duplicate detection, and background processing.

## Architecture proposal

The exploration proposed validated workflow projection fields on `items`, content-free events, expected-version plus mutation-ID writes, current-truth replay, source-local Undo, raw-insert integrity protection, resumable legacy enrollment, keyset pagination, partial indexes, bounded DTOs, and 10k/50k gates.

The shipped implementation follows this direction but strengthened several details after adversarial review: server-backed actor-tab Undo is 30 seconds, terminal receipts are immutable, exact metrics and cursor epochs are explicit, reads are browser-session-only, deep readiness is off the request path, and immutable release/rollback provenance is enforced.

## Prototype evidence

The original review branch contains a locally runnable fictional gallery, three responsive directions, route-based detail simulation, and screenshots:

- [Feature-council package](https://github.com/arunpr614/ai-brain/tree/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow)
- [Prototype gallery source](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/prototypes/index.html)
- [PRD v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/product/prd-v2.md)
- [UX/UI v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/ux/ux-ui-v2.md)
- [Technical plan v2](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/technical/technical-plan-v2.md)
- [Decision log](https://github.com/arunpr614/ai-brain/blob/df4c42b9869f8a35b9557bc64bf6ecdb9d11b416/docs/feature-council/card-processing-workflow/decisions/decision-log.md)
- [Review-only pull request #21](https://github.com/arunpr614/ai-brain/pull/21)

## Historical risks and disposition

The exploration identified naming, mobile discovery, preview value, metric pressure, migration/scale, replay/concurrency, filter normalization, and accessibility as release risks. The successor implementation resolved the architecture and release-safety gates, retained mobile More plus Library/capture discovery, omitted quick preview and drag-and-drop, passed deterministic 10k/50k budgets, and shipped the Inbox-first direction. Ongoing product observation can still revisit discoverability and metric presentation without changing workflow truth.
