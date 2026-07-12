# Feature Council Project Tracker

Created: 2026-06-28 21:23 IST  
Branch: `codex/ai-brain-feature-council-20260628`

> **FCP-004 status update (2026-07-13): Deferred; not active for implementation.** See the [Graphify opportunity decision](Graphify-Opportunity-Decision).

## Status Board

| Work item | Status | Owner | Artifact |
| --- | --- | --- | --- |
| Clean worktree and branch | Complete | Coordinator | Branch `codex/ai-brain-feature-council-20260628` |
| Live feature audit | Complete | Coordinator + technical architect | `LIVE_FEATURE_AUDIT.md` |
| Research inventory | Complete | Product manager | `RESEARCH_FEATURE_INVENTORY.md` |
| Gap matrix | Complete | Coordinator | `FEATURE_GAP_MATRIX.md` |
| Council decision log | Complete | AI Expert Brainstorm Council | `FEATURE_COUNCIL_DECISION_LOG.md` |
| FCP-001 planning package | Complete | Product/UX/tech | `prd/`, `ux/`, `technical/`, `reviews/` |
| FCP-002 planning package | Complete | Product/UX/tech | `prd/`, `ux/`, `technical/`, `reviews/` |
| FCP-003 planning package | Complete | Product/UX/tech | `prd/`, `ux/`, `technical/`, `reviews/` |
| FCP-004 planning package | Complete | Product/UX/tech | `prd/`, `ux/`, `technical/`, `reviews/` |
| FCP-005 planning package | Complete | Product/UX/tech | `prd/`, `ux/`, `technical/`, `reviews/` |
| Master index | Complete | Coordinator | `MASTER_FEATURE_COUNCIL_INDEX.md` |
| Final handoff | Complete | Coordinator | `FINAL_HANDOFF_SUMMARY.md` |
| Graphify opportunity audit, research, and council | Complete | Multi-agent council | [Research](Graphify-Opportunity-Research) · [Decision](Graphify-Opportunity-Decision) |

## Approved Feature Tracker

| ID | Feature package | Status | Priority | Council decision | Blockers | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| FCP-001 | Capture Quality And Repair Center | Planning v2 complete | P0 | Proceed | Requires channel-by-channel UX QA before implementation | Create implementation issue/phase only after user approval |
| FCP-002 | Source Workspace And Reading Studio Lite | Planning v2 complete | P1 | Proceed reduced scope | PDF viewer/anchor data proof needed | Spike PDF viewing/anchor storage |
| FCP-003 | Contextual Ask And Evidence Scan | Planning v2 complete | P1 | Proceed reduced scope | Evidence classifications and retrieval snapshots need test fixtures | Prototype source-set Ask contract |
| FCP-004 | Relationship Graph And Connection Map | Historical planning v2; superseded current posture | Not active | **Deferred by 2026-07-13 council** | Demonstrated job, comparative advantage, lifecycle, privacy, scale, accessibility, measurement, ownership, and exit all non-passing | No code/prototype; reopen only through a new council after evidence gates pass |
| FCP-005 | AI Services And Privacy Trust Center | Planning v2 complete | P0 | Proceed | Must avoid false local-only claims | Define provider/privacy copy and diagnostics DTO |

## Parked / Rejected Tracker

| ID | Feature | Status | Reopen trigger |
| --- | --- | --- | --- |
| RN-F01 | Multi-project/vault setup | Parked | User asks for multiple workspaces or per-project data separation. |
| RN-F05 | Full Markdown editor/slash commands | Parked | Reading Studio anchors/citations ship and writing workflow becomes a primary job. |
| RN-F09 | Neo4j export | Parked | Relationship Graph is mature and user asks for external graph tooling. |
| RN-F12 | Matrix extraction | Needs more research | Evidence Scan ships and user has repeat literature-review/table extraction workflows. |
| RN-F14 | Existing Markdown vault adoption | Needs more research | Source freshness/non-mutation/import proof packets are created. |
| RN-F17 | Subscription/paywall | Rejected | Separate commercialization goal is opened. |

## Milestones

| Milestone | Status | Notes |
| --- | --- | --- |
| M1 Worktree setup | Complete | Clean branch from `main`; no production code edits. |
| M2 Audit and inventory | Complete | Live app and research bundle reviewed. |
| M3 Council decisions | Complete | Feature-by-feature log created. |
| M4 v1 packages and reviews | Complete | Five approved packages received adversarial package reviews. |
| M5 v2 packages and handoff | Complete | Final package is linked from master index. |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Approved packages still too large | P1 | Each v2 has reduced first release, non-goals, and proof gates. |
| Capture quality changes break extension/APK | P1 | FCP-001 requires channel parity tests and shared result contract. |
| Evidence Scan overclaims truth | P1 | FCP-003 frames verdicts as source support classifications, not factual proof. |
| Graph becomes stale or misleading | P1 | FCP-004 uses derived rebuildable graph snapshots and owner tables as source of truth. |
| Privacy copy overclaims local-only behavior | P1 | FCP-005 requires provider-specific data-flow copy and diagnostics redaction. |
| Auth/session guard drift weakens future APIs | P1 | Technical plans require a shared verified session/bearer guard before new sensitive APIs. |
| Enrichment worker mode is ambiguous | P1 | FCP-001/FCP-005 require an explicit realtime-vs-batch ownership decision before implementation. |
| Deploy misses migration files | P1 | Technical plans require a standalone artifact migration-presence gate before schema features ship. |
| Cost/usage labels are stale | P2 | FCP-005 includes provider-aware usage accounting as a prerequisite for user-facing cost/readiness UI. |

## Running Log Discipline

Append to project `RUNNING_LOG.md` after each major milestone and after one hour of work. This package adds a milestone entry for the feature council setup and planning artifacts.
