# Kanban Card Processing — acceptance traceability

**Source of truth:** `product/prd-v2.md` §29
**Last updated:** 2026-07-12, pre-release candidate
**Rule:** “Local pass” proves implementation behavior only. “Pending live” remains a release blocker until production evidence is linked.

| AC | Status | Primary implementation/evidence |
|---:|---|---|
| 1 | Local pass | PRD/UX/technical v2 authority headers, v2 consistency review, implementation report |
| 2 | Local pass; predeploy refresh pending | `qa/baseline-verification.md`; release plan requires a fresh content-free baseline |
| 3 | Local pass | Migration projection isolation; workflow preservation tests; existing 876-test regression suite |
| 4 | Local pass | `processingFilterSql`, query fixtures proving AI Topic IDs and manual/auto-tag separation |
| 5 | Local pass | 024→025/fresh migration tests, quick/FK checks, runtime migration hash manifest |
| 6 | Local pass | Migration CHECK/trigger matrix plus transition tests |
| 7 | Local pass | `insertCaptured` atomic transaction and exact-once capture test |
| 8 | Local pass | Content-repair preservation test plus full capture/enrichment/transcript regression suite |
| 9 | Local pass | Raw old-runtime insert, partial-shape abort, collision/integrity triggers |
| 10 | Local pass | 024→025 dormant historical-row test |
| 11 | Local pass | Frozen selected/recent/all enrollment state machine, empty/retry/resume/idempotency tests |
| 12 | Local pass | Transition decision table and workflow domain tests |
| 13 | Local pass | Query test: current-entry then ID ordering and page independence |
| 14 | Local pass | Current Done projection transition/Undo tests and migration invariants |
| 15 | Local pass | Event-derived completion query and Undo metric fixture |
| 16 | Local pass | Approved enum contracts, grouped query layer, Board/List UI |
| 17 | Local pass | User-tag/AI-Topic/unassigned filter query tests and URL-backed UI |
| 18 | Local pass | Zero-filled exact unfiltered status aggregate tests |
| 19 | Local pass | Exact filtered four-state query fixtures |
| 20 | Local pass | Aggregate-before-page query tests and 10k/50k evidence |
| 21 | Local pass | Processing UI true-empty/filtered-empty branches and exact summary DTO |
| 22 | Local pass | Temporal Today fixture and event-derived Processed/Completed queries |
| 23 | Local pass | Temporal Monday-week fixture and Added/Processed/Completed queries |
| 24 | Local pass | Neutral Today line in Processing UI and visual comparison |
| 25 | Local pass | Weekly line with timezone/Monday disclosure |
| 26 | Local pass | Temporal timezone/midnight/week boundary tests and CAS preference route |
| 27 | Local pass | FK cascade plus retained-source recomputation queries |
| 28 | Local pass | No-preselection/Process-next/focus/empty behavior in `ProcessingApp` |
| 29 | Local pass; live task pending | Shared card/actions across Board/List and responsive local QA |
| 30 | Local pass | Existing detail route integration; independent notes/workflow versions; regression suite |
| 31 | Local pass | Active/archive query predicates and Restore/Reprocess transition tests |
| 32 | Local pass | Existing Library/detail behavior preserved; workflow badge/actions added independently |
| 33 | Local pass | Archive remains a Processing projection; search/Ask/Related code paths unchanged and regressions green |
| 34 | Local pass | Quality/Review/SRS predicates unchanged and full regressions green |
| 35 | Local pass | Duplicate/export code unchanged; workflow fields retained in item storage |
| 36 | Pass | Worker predicates unchanged, hard-delete cascades tested, and isolated current-production-copy backup/restore matched integrity and logical counts |
| 37 | Local pass | Expected-version CAS and winner/conflict tests |
| 38 | Local pass | Exact replay returns immutable receipt plus current projection/slot |
| 39 | Local pass | Session-only outcome lookup and one-effect receipt/event assertions |
| 40 | Local pass | Same-tab confirmation-only slot replacement and failed-action preservation test |
| 41 | Local pass | Rapid same-item slot/version test |
| 42 | Local pass | Actor-tab keyed slots and intervening-version conflict behavior |
| 43 | Local pass | Inclusive boundary, expiry 410, replay, and Undo-of-Undo rejection tests |
| 44 | Local pass; live accessibility task pending | Native Move/Restore/Reprocess controls available after timed Undo |
| 45 | Pending live | Manual keyboard/screen-reader/switch timed and permanent reversal evidence |
| 46 | Local pass | Load/error/offline UI states; rollback/current-truth logic; no offline queue |
| 47 | Local pass | All Processing read/write/outcome/enrollment route session/bearer negative tests |
| 48 | Local pass | Exact configured-origin tests, missing-config 503, cross-origin 403 |
| 49 | Local pass; live header check pending | Central private/no-store/Vary/nosniff response helper and route tests |
| 50 | Local pass | Allow-listed DTOs, normalized errors/logging, independent application security review |
| 51 | Local pass | Zod bounds, streaming 16 KiB limit, signed cursor bounds, per-session write throttle, normalized enumeration outcomes |
| 52 | Pass | `qa/performance-10k-50k.md`; every p95/contention/payload/deep-audit budget green |
| 53 | Not applicable | Virtualization is intentionally not used in v1 |
| 54 | Local pass | Bounded page/group sizes, Load more/focus behavior, 50k payload/performance evidence |
| 55 | Partial; live task pending | 320/390 four-tab/no-overflow/44 px QA passed; full Move/Archive/Restore/Reprocess/Undo task remains live gate |
| 56 | Partial; live task pending | Semantic/focus/contrast/reduced-motion/mobile automation passed; screen-reader/switch/forced-colors/live zoom task remains |
| 57 | Pass | `qa/production-copy-migration-rehearsal.md`: migration/WAL/lock/interruption/resume/backup/restore/old-code/explicit-025 compatibility all pass |
| 58 | Pending rollout | Default-off flags/readiness and staged commands implemented; observed production stages not yet run |
| 59 | Pending live | Full synthetic production capture/workflow/count/metric/header journey and cleanup |
| 60 | Partial | Implementation/user/operator/release docs are being finalized; GitHub Wiki publish/verification waits for shipped SHA |
| 61 | Local pass | Diff/scope review confirms no deferred project-management or drag/queue features |

## Current release blockers

AC 45, 55-56, and 58-60 retain live/manual or release-state work. They cannot be closed by additional local code assertions alone. The final verification report must link the PR/CI artifacts, staged rollout windows, production synthetic journey and cleanup, final browser/design/accessibility evidence, installed rollback proof, and published Wiki commit.
