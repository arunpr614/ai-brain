# F08 Implementation Adversarial Review Disposition

**Date:** 2026-07-10  
**Reviewed report:** `F08_MANUAL_CONTENT_NOTES_IMPLEMENTATION_ADVERSARIAL_REVIEW_2026-07-10_18-44-33_IST.md`  
**Disposition:** All P0 and P1 findings closed before release execution

| Finding | Resolution | Executable evidence |
|---|---|---|
| P0 migration 023 loses bridges in the real runner | Migration runner now applies declared foreign-key disablement before `BEGIN`, restores it in `finally`, and requires an unchanged FK manifest. | Runner-shaped populated migration 023 test preserves chunk, bridge, vector rowid, and allocator. |
| P0 normal item deletion orphans vec0 and retains note-derived chat | Canonical item delete now deletes vectors before bridge cascades and removes manual-note-cited assistant turns in the same DB transaction. | Item deletion regression covers vec0 and a library-thread citation. |
| P0 delayed idempotent replay falsely acknowledges stale text | Replays compare current epoch/generation with the receipt's accepted state and return a conflict after later changes. | Three-step delayed-replay regression. |
| P1 stale purge deletes newer index | Purge ownership check, vec deletion, and completion are transactional and generation-bound. | Stale purge after a newer completed generation leaves the new vector intact. |
| P1 queued Save/Clear intent collapses | Queue now retains explicit manual intent and the newest operation while one request is in flight. | Pure queue-transition regression plus existing browser autosave/conflict checks. |
| P1 delete during Ask re-persists derived text | Ask completion rechecks every manual citation immediately before persistence and skips stale-note answers. | Eligibility regression proves a previously retrieved note citation becomes non-persistable immediately on opt-out. |
| P1 worker ignores UI/write flags | Semantic processing now requires UI, write, and worker flags before claim, provider call, purge, and commit. | Mixed-flag worker test makes zero provider calls. |
| P1 provider consent identity is inaccurate | Policy classifies parsed loopback endpoints only as local and fingerprints normalized destination plus the effective embed/Ask model. | Non-loopback Ollama and effective-model regression. |
| P1 reapproval never reindexes | Final provider approval requeues every current opted-in non-empty note for indexing. | Revoke/purge-state/reapprove regression ends with an index job. |

The final focused suite passed 20/20 after disposition. The complete suite then passed 785 tests in 92 suites, followed by typecheck, lint, production build, dependency audit, and a fresh production-snapshot rehearsal ending safe.

Residual P2/P3 items are non-blocking: event-driven pruning of dormant mutation receipts is documented rather than a scheduled maintenance task; the unused `conflict` server-revision label remains schema-compatible but is not presented as a losing-draft store; GFM tables now preserve valid table structure inside a safe overflow wrapper.
