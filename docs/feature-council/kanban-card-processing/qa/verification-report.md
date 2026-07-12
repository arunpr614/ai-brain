# Kanban Card Processing — candidate verification report

**Candidate date:** 2026-07-12
**Branch:** `codex/fix-release-first-cutover` from merged main `9f6c878f2e087c7cf56e746f5e5e20c944f1f227`
**Verdict:** **Merged feature plus first-cutover remediation GO for corrective PR/CI. Production acceptance remains pending.**

## Integrated automated gates

| Gate | Result |
|---|---|
| TypeScript | Pass — `tsc --noEmit` |
| ESLint | Pass |
| Product tests | Pass — 880 tests, 93 suites, 0 failed/skipped/todo |
| Production build | Pass — Next.js 16.2.9; only the documented pre-existing `unpdf` `import.meta` warning |
| Build-artifact privacy | Pass — no standalone `data` directory |
| Environment safety | Pass — local `.env` ignored, `.env.example` tracked |
| Documentation | Pass — 44 Feature Council pages, 84 reachable Wiki pages, 155/155 package scripts classified, privacy/structure/project-Wiki checks clean |
| Processing readiness smoke | Pass — 17 checks, including non-mutating status, migration hashes, strict production configuration, red/green behavior |
| Immutable release smoke | Pass — 46 checks, including deterministic archive, env/data exclusion, runtime/source migration binding, symlink rejection, tamper rejection, app+builder release identity, collision safety, staged-tool ordering, delayed/permanent/exhausted health behavior, and explicit restoration failure propagation |
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

The independent release review initially returned no-go and found the database-target split plus artifact/rollback trust gaps. `reviews/implementation-security-adversarial-review.md` records every remediation. Two production attempts then failed safe before schema 025 or feature enablement and exposed immutable-runtime data-root, startup-health, release-instance identity, and staged-tool trust defects. The corrective re-review found no P0/P1; its final P2 cleanup (bounded Telegram notification, blank Recall override normalization, symlink-aware override containment, and backup-format documentation) is integrated. The current release-safety verdict is GO for corrective PR/CI and a guarded retry; production acceptance has not passed.

## Visual and responsive QA

- Direction B desktop and mobile references were compared side-by-side with the implementation at matching 1440×1024 and 390×844 viewports.
- A P1 mobile defect that clipped Archived at 320 px was fixed.
- Fresh 320×844 and 390×844 captures prove all four tabs visible, enabled, selectable, 44 px high, and contained without horizontal overflow.
- `design-qa.md` correctly remains `final result: blocked` until the same comparison and core task pass against the browser-accessible deployed candidate, including dark mode.

## Scope check

No batch actions, drag-and-drop, manual rank, dates, assignees, sprints, WIP limits, collaboration, offline mutation queue, quick preview, global archive, or AI-taxonomy substitution entered the candidate.

## Remaining release gates

1. Commit, push, corrective PR, protected CI, review resolution, merge, and fresh candidate/known-good artifact plus attestation verification.
2. Installed Linux known-good/candidate switch and authenticated rollback-health proof.
3. Dark production deployment with bound backup and strict audit.
4. Staged read, write, and navigation enablement with observation windows.
5. Live synthetic capture→Inbox→Move→Done→Archive/Restore/Reprocess/Undo/count/metric/header journey and complete cleanup.
6. Browser/design and manual accessibility tasks on the deployed experience.
7. Repository documentation final deployed SHA plus GitHub Wiki publication and verification.

Until these pass, this report must not be cited as production acceptance.
