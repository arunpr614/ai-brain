# Kanban Card Processing — candidate verification report

**Candidate date:** 2026-07-12
**Deployed application:** `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`
**Verdict:** **Production acceptance passed. Rollout, live API/domain verification, authenticated browser/design verification, synthetic cleanup, repository closeout merge, and GitHub Wiki publication/verification are complete.**

## Integrated automated gates

| Gate | Result |
|---|---|
| TypeScript | Pass — `tsc --noEmit` |
| ESLint | Pass |
| Product tests | Pass — 880 tests, 93 suites, 0 failed/skipped/todo |
| Production build | Pass — Next.js 16.2.9; only the documented pre-existing `unpdf` `import.meta` warning |
| Build-artifact privacy | Pass — no standalone `data` directory |
| Environment safety | Pass — local `.env` ignored, `.env.example` tracked |
| Documentation | Pass — 44 Feature Council pages, 86 reachable Wiki pages, 155/155 package scripts classified, privacy/structure/project-Wiki checks clean |
| Processing readiness smoke | Pass — 17 checks, including non-mutating status, migration hashes, strict production configuration, red/green behavior |
| Immutable release smoke | Pass — 49 checks, including deterministic archive, env/data exclusion, runtime/source migration binding, symlink rejection, tamper rejection, app+builder release identity, collision safety, staged-tool ordering, delayed/permanent/exhausted health behavior, parseable rollback state, generated readiness-tool paths, and explicit restoration failure propagation |
| Release scripts | Pass — shell syntax and whitespace checks |
| Full artifact rehearsal | Pass — 3,613 regular files, 71,973,337 bytes expanded, 27 migrations, no raw environment files, runtime verification clean |
| Dependency audit | Pass — clean `npm ci`; npm audit 0 total vulnerabilities; `@js-temporal/polyfill` 0.5.1 ISC and `tar` 7.5.16 BlueOak-1.0.0 |

## Performance

`qa/performance-10k-50k.md` records deterministic isolated runs. Final 50k results include:

- readiness p95 0.006 ms / 2 ms;
- unfiltered summary p95 49.688 ms / 100 ms;
- filtered summary p95 92.112 ms / 200 ms;
- slowest page/group p95 82.656 ms / 200 ms;
- mutation p95 20.911 ms / 250 ms;
- deep audit 1.247 s / 30 s;
- concurrent read degradation 11.6% / 20%;
- zero database-busy outcomes.

The initial capture-channel and capture-age descriptor failures were fixed with a grouped total pass and two EXPLAIN-backed partial active indexes. Budgets were not relaxed.

## Security and privacy

The independent application review is GO with no remaining P0/P1/P2. It verified session-only routes, bearer negatives, exact-origin writes, private/no-store responses, bounded/parameterized inputs, replay/CAS/Undo scoping, content-safe DTOs, streaming 16 KiB enforcement, and per-valid-session write throttling.

The independent release review initially returned no-go and found the database-target split plus artifact/rollback trust gaps. `reviews/implementation-security-adversarial-review.md` records every remediation. Three pre-acceptance attempts failed safe and exposed immutable-runtime data-root, startup-health, release-instance identity, staged-tool trust, generated readiness-tool path, and rollback-state parsing defects. PRs #26–#28 corrected those boundaries and expanded release smoke to 49 checks.

The final immutable deployment of `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` succeeded with a bound, restore-checked 7,626,752-byte SQLite backup. Production is healthy on the exact candidate runtime/tool set with 27 migrations through 025, quick check `ok`, foreign keys zero, a green app-SHA-bound deep readiness audit, no runtime-local durable data, and an enabled/active six-hour audit timer.

Stage A enabled reads only and completed a full 15-minute observation window with authenticated 200s, unauthenticated/bearer-only 401s, private/no-store cookie-varying responses, green health/readiness/integrity, and zero post-ready warnings. Stage B enabled writes with navigation dark; the bounded one-item legacy enrollment and synthetic capture lifecycle proved replay, outcome lookup, exact-origin 403/no mutation, oversized 413, compare-and-swap 409, status transitions, archive/restore/reprocess/Undo, 410 expired Undo, exact metric deltas, and 429/Retry-After rate limiting. Two full write observation windows stayed green. Stage C then enabled navigation and retained green readiness/runtime evidence.

After authenticated browser verification, cleanup used the application's hard-delete order: delete the synthetic vector through its relational bridge, remove any manual-note citations, then delete the item under foreign keys so all content/workflow dependents cascade. A fresh 7,643,136-byte pre-cleanup SQLite backup was mode-restricted, SHA-256 recorded, restore-readable, quick-check `ok`, and foreign-key clean. Post-cleanup evidence is exact: 129 retained items, synthetic item/FTS/content/workflow/job/tag/topic/note/enrollment/Undo/citation dependents zero, vector count reduced by exactly one, quick check `ok`, and foreign keys zero. The installed deep-audit service then completed successfully and restored a green checkpoint bound to application `ea7b159`; the application service and six-hour timer remain active.

## Visual and responsive QA

- Direction B desktop and mobile references were compared side-by-side with the authenticated deployment in the same dark Inbox state at matching 1440×1024 and 390×844 viewports.
- A P1 mobile defect that clipped Archived at 320 px was fixed.
- Fresh deployed 320×844 and 390×844 captures prove all four tabs visible, enabled, selectable, 44 px high, and contained without horizontal overflow.
- Authenticated desktop/mobile light/dark tasks passed Process next, selection/open separation, canonical detail and independent My notes, Back/Forward, Board/List parity, filters, Group & sort, enrollment preview and focus return, Archive/Restore/Reprocess/Undo, Library/More/command-palette discovery, live announcements, and keyboard operation.
- `design-qa.md` records `Final result: passed`. Browser console review found only stale extension connection messages from the pre-unlock page and no application error during the authenticated task pass.

## Scope check

No batch actions, drag-and-drop, manual rank, dates, assignees, sprints, WIP limits, collaboration, offline mutation queue, quick preview, global archive, or AI-taxonomy substitution entered the candidate.

## Remaining release gates

None. PR #29 passed protected checks and merged as `2760837e8294a56c0be7ece928d8300c382b069a`. The canonical 86-page corpus was concurrency-checked against Wiki base `703077dd74c3cbc18936357a9b5bde0397f972a3`, published normally as `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1`, then fresh-cloned. The clone passed privacy and structure/reachability checks and matched all 86 canonical pages byte-for-byte. Home, Card Processing current/history, Feature Catalog, and Deployment and Operations returned rendered HTTP 200 pages with their expected headings.

Physical screen-reader speech, switch hardware, and Android TalkBack remain explicit manual-device residual coverage; no browser-only evidence is represented as those physical outputs.
