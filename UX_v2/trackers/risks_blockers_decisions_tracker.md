# Risks, Blockers, And Decisions Tracker

Created: 2026-06-14 07:40 IST

| ID | Type | Severity | Status | Owner | Description | Resolution path |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Risk | P1 | Open | Implementation agent | Dirty worktree may be mistaken for verified completion. | Verify each slice before marking done. |
| R-002 | Risk | P1 | Open | Implementation agent | Prototype source contains legacy AI Brain copy. | Apply brand-copy migration before implementation. |
| R-003 | Risk | P1 | Open | Implementation agent | Repair updates can leave stale chunks, embeddings, summaries, topics, and related items. | Use PRD-10 derived-state reset gate. |
| R-004 | Risk | P1 | Open | Implementation agent | Attached context may leak outside intended Ask scope if retriever and UI disagree. | Make effective scope explicit in API and citations. |
| R-005 | Blocker | P0 | Open | Implementation agent | PRD-11-SHELL mobile smoke is incomplete. | Finish responsive Browser checks before next code slice. |
| R-006 | Decision | P1 | Open | Arun/Product | Should attached context be temporary, saved, or both? | Decide before PRD-09-FU implementation. |
| R-007 | Decision | P2 | Open | Arun/Product | Should offline controls download readable content or remain informational? | Decide in PRD-14. |
| R-008 | Decision | P2 | Open | Arun/Product | Should Android item tabs be part of PRD-11-FU or separate? | Decide before mobile detail work. |
| R-009 | Risk | P1 | Open | Implementation agent | Privacy controls may look active if disabled copy is weak. | Copy audit and disabled visual state QA. |
| R-010 | Blocker | P1 | Open | Arun/Product | Transcript fallback strategy is not a UI-only issue. | Separate research PRD before provider changes. |
| R-011 | Risk | P1 | Open | Implementation agent | Android share currently uses alerts and direct route pushes. | PRD-13 result surface before release. |
| R-012 | Decision | P3 | Open | Arun/Product | Analytics/events may conflict with private app expectations. | Decide local-only/no telemetry/server events. |
