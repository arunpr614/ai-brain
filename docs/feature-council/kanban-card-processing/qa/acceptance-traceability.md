# Kanban Card Processing — acceptance traceability

**Source of truth:** `product/prd-v2.md` §29
**Last updated:** 2026-07-12, deployed browser and cleanup closeout
**Rule:** “Local pass” proves implementation behavior only. Production claims require linked live evidence; physical assistive-technology claims remain explicit when the selected browser cannot prove speech or switch hardware.

| AC | Status | Primary implementation/evidence |
|---:|---|---|
| 1 | Local pass | PRD/UX/technical v2 authority headers, v2 consistency review, implementation report |
| 2 | Pass | Fresh predeploy content-free baseline, bound backups, production-copy rehearsal, and deployed integrity/readiness evidence |
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
| 29 | Pass | Shared card/actions across Board/List plus authenticated deployed desktop/mobile parity task |
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
| 44 | Pass for keyboard/native controls; physical AT residual | Deployed keyboard Move/Undo/Archive/Restore/Reprocess plus native button/select semantics and permanent reversal paths |
| 45 | Partial; physical device residual | Deployed timed Undo and permanent reversal completed by keyboard with live announcements; actual NVDA/VoiceOver/TalkBack speech and switch hardware were not claimed by browser automation |
| 46 | Local pass | Load/error/offline UI states; rollback/current-truth logic; no offline queue |
| 47 | Local pass | All Processing read/write/outcome/enrollment route session/bearer negative tests |
| 48 | Local pass | Exact configured-origin tests, missing-config 503, cross-origin 403 |
| 49 | Pass | Central helper/route tests plus Stage A authenticated/unauthenticated live header matrix |
| 50 | Local pass | Allow-listed DTOs, normalized errors/logging, independent application security review |
| 51 | Local pass | Zod bounds, streaming 16 KiB limit, signed cursor bounds, per-session write throttle, normalized enumeration outcomes |
| 52 | Pass | `qa/performance-10k-50k.md`; every p95/contention/payload/deep-audit budget green |
| 53 | Not applicable | Virtualization is intentionally not used in v1 |
| 54 | Local pass | Bounded page/group sizes, Load more/focus behavior, 50k payload/performance evidence |
| 55 | Pass | Deployed 320/390 no-overflow/44px view proof; mobile More discovery; Move/Archive/Restore/Reprocess/Undo task on the responsive surface |
| 56 | Pass for browser-verifiable scope; physical AT residual | Deployed keyboard/focus/live-region/mobile/theme evidence plus automated semantic/contrast/reduced-motion/zoom/text-spacing/forced-colors coverage; actual speech and switch hardware remain unclaimed |
| 57 | Pass | `qa/production-copy-migration-rehearsal.md`: migration/WAL/lock/interruption/resume/backup/restore/old-code/explicit-025 compatibility all pass |
| 58 | Pass | Default-off readiness, guarded immutable deploy, Stage A/B/C observation windows, deep-audit service/timer, and rollback evidence |
| 59 | Pass | Full synthetic production capture/workflow/count/metric/header journey, authenticated browser journey, and exact dependent cleanup back to 129 retained items |
| 60 | Pass | PR #29 merged repository sources as `2760837`; Wiki `10a3e2b` published through an unchanged-base gate, fresh-cloned byte-for-byte, privacy/structure/reachability clean, and live-page verified |
| 61 | Local pass | Diff/scope review confirms no deferred project-management or drag/queue features |

## Current release blockers

No release-state acceptance criterion remains open. AC 44-45/56 separately preserve the honest boundary that browser semantics and keyboard operation do not prove physical screen-reader speech or switch hardware; this is residual manual-device coverage rather than an unreported product defect.
