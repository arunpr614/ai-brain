# Source Reconciliation Report

**Baseline date:** 2026-07-11

| Conflict | Authoritative conclusion | Rationale |
|---|---|---|
| README says current status is v0.2 while package reports 0.6.2 and code contains later work | Do not use a single marketing version as feature truth | Current routes, migrations, tests, and release commits are newer than the prose |
| Old agent docs split features between main and a divergent worktree | Reclassify against unified current main | Later merges brought UX/Recall/Notes changes into current main |
| Existing wiki cites production `8654f293…`; Note Focus records later `6858529…` | Use current code baseline `23868faf…` and latest verified deployed application baseline `6858529…` | Commits after `6858529…` are documentation/release records only |
| Council packages describe complete future experiences | Keep as Explored/Planned unless current-main code proves a subset | PRDs/prototypes are not implementation evidence |
| Review inbox resembles spaced repetition | Review inbox is Implemented; spaced repetition remains Planned | Current review code uses attention/upgrade policy, not SRS scheduling |
| Related items resembles a knowledge graph | Related items is Implemented; graph UI remains Planned | Similarity results do not create a graph model or visualization |
| Scoped Ask resembles Evidence Scan | Scoped Ask is Implemented; full Evidence Scan remains Explored/Planned | Existing retrieval/citation behavior covers only part of the proposal |
| Capture repair exists while Council Repair Center remains a proposal | Current repair/needs-upgrade behavior is Implemented; unified Repair Center remains Explored/Planned | Current routes and modules implement repair primitives, not the entire proposed workspace |
| Historical migration `017` collision | Document as a resolved-history integration hazard; never infer order by number alone | Current main contains distinct migration files from formerly divergent branches |

## Reconciliation rule

Every living-wiki feature claim must point to current-main code/test/config evidence. Runtime wording must additionally cite dated deployment evidence or remain Unknown. Historical pages keep their original context and gain explicit current-status links rather than being silently deleted.
