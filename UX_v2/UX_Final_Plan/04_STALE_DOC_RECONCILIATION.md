# Stale Document Reconciliation

Created: 2026-06-14 10:15 IST
Purpose: prevent old progress docs in `../UX_v2` from being mistaken for current release evidence or implementation authorization.

## Precedence Rule

Current planning status is governed by this `UX_Final_Plan` folder first, then the remediated root `../00_PLANNING_PACKAGE_INDEX.md`, `../06_ROADMAP_AND_EXECUTION_PLAN.md`, `../07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`, and root trackers.

Older `../01_MASTER_PLAN.md` through `../05_MISSING_FEATURE_TODO.md` are historical baseline material. They are not release evidence unless the final package or a fresh QA artifact cites them.

## Reconciliation Table

| Artifact or slice | Historical role | Current status authority | Current status | Implementation instruction |
| --- | --- | --- | --- | --- |
| `../01_MASTER_PLAN.md` | Original UX v2 execution plan | `00_FINAL_PACKAGE_INDEX.md`, `01_FINAL_ROADMAP_AND_EXECUTION_PLAN.md` | Superseded for sequencing | Use only for historical context |
| `../02_REQUIREMENTS_PRD_BACKLOG.md` | Original requirements backlog | `02_FINAL_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`, final trackers | Baseline requirements | Do not treat as current readiness state |
| `../03_IMPLEMENTATION_PROGRESS.md` | Historical completed-slice evidence | `trackers/testing_qa_readiness_tracker.md`, PRD-16 package | Historical evidence, not release proof | Re-verify before marking complete |
| `../04_FEATURE_DELIVERY_PROTOCOL.md` | Original workflow protocol | Final package plus feature packages | Useful workflow reference | Follow final no-go gates first |
| `../05_MISSING_FEATURE_TODO.md` | Initial missing/partial feature list | Final master inventory and PRD trackers | Superseded | Use final tracker rows |
| PRD-01/02 brand and design foundation | Completed historically | PRD-16 QA and copy/design specs | Coded but evidence must be refreshed | Run brand/icon/copy checks |
| PRD-03 web shell/navigation | Completed historically | PRD-11-SHELL gate | Coded-unverified | Finish smoke evidence before feature work |
| PRD-04 Library filters and Ask selected | Completed historically | LIB/ASK final inventory rows | Existing, QA-gated | Re-smoke before dependent Ask work |
| PRD-05 Needs Upgrade queue | Completed historically | PRD-10 | Partial because repair missing | Do not call complete until repair handled or deferred |
| PRD-06 basic result banners | Completed historically | PRD-06-FU | Partial | Implement canonical result contract |
| PRD-07 focus mode | Completed historically | PRD-11-FU/PRD-16 | Partial Android evidence | Re-smoke web/mobile focus |
| PRD-08 topics/collections | Completed historically | TAX/COLL final rows | Existing, QA-gated | Verify topic/collection Ask |
| PRD-09 scope/history | Completed historically | PRD-09-FU | Partial/Missing | Decision-gated; do not implement until D-001/D-002/D-003 close |
| PRD-11 mobile shell | In-flight/completed claims | PRD-11-SHELL and PRD-11-FU | No-go until verification | Complete smoke evidence first |

## Implementation Rule

If an old doc says "completed" but this final package says "partial," "coded-unverified," "decision-gated," or "no-go until verification," the final package wins.
