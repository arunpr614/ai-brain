# Note Focus Mode — Project Tracker

Updated: 2026-07-10 22:51 IST

| Phase | Exit condition | Status |
|---|---|---|
| 0. Isolation | Clean worktree from latest `origin/main`; original Phase3 preserved | Complete |
| 1. Discovery | Current code, visual, state, responsive, analytics, release, and precedent evidence captured | Complete |
| 2. Feature council | Product, UX, and technical briefs complete; direction recorded | Complete |
| 3. PRD/UX/technical v1 | Traceable P0/P1 requirements, interaction contract, and architecture contract | Complete |
| 4. Adversarial review | Timestamped reviews completed; every finding dispositioned | Complete |
| 5. PRD/UX/technical v2 | Resolved, implementation-ready source of truth | Complete |
| 6. Test-first implementation | Focus behavior implemented without editor duplication/remount | Complete |
| 7. Local QA | Focused tests, full suite, lint, typecheck, build, privacy/docs/dependency gates | Complete |
| 8. Acceptance/visual QA | Desktop/mobile/reflow/history/network/accessibility traceability and comparison evidence | Complete for web; physical Android/TalkBack unavailable |
| 9. GitHub integration | Intentional commits, pushed branch, green PR, merge to `main` | Complete — PRs #15 and #16 |
| 10. Production release | Guarded deploy, health/provider/scheduler checks, production focus smoke, cleanup | Complete — main `6858529` enabled |
| 11. Documentation closeout | Canonical docs/wiki published and verified; running log appended | Complete — PR #17 and wiki `3d578c3` |

## Non-negotiable gates

- Exactly one `ManualNoteEditor` and one `textarea` for the item before, during, and after focus.
- Text, selection, textarea scroll, native undo, editor mode, journal identity, queued saves, conflict/recovery state, and save status survive focus transitions.
- Normal item detail remains the default; focus is item-scoped and deliberate.
- Background shell is visually covered, inert, and inaccessible to keyboard/assistive technology while focus is active.
- Back/Forward/direct-load/refresh behavior does not trigger a Next.js route remount.
- Exit, save status, Copy, and Save remain visible and actionable across supported viewport and error states.
- No schema, note API, AI-provider, search, graph, consent, or semantic-processing behavior changes.
- No production mutation until all local release and acceptance gates pass.

## Current release evidence

- 814 tests / 92 suites pass after the signed-out deep-link regression test; lint, typecheck, diff check, build, env/artifact checks, and dependency audit pass.
- Production-build Back/Forward transitions preserve the single textarea and issue zero note GET/PUT requests; direct refresh performs the expected one note GET.
- 1440×900 Focus editor is 816px versus 318px normally (2.57× wider).
- 320×800 has zero horizontal overflow, 44×44 formatting targets, a 320px editor, and persistent Exit/Copy/Save.
- Focus-off restart removes the control and server-normalizes stale `note_mode` while ordinary Notes remain intact.
- Previous artifact `870dc5a` builds and serves the prior normal Notes behavior; emergency rollback intentionally restores the known pre-consolidation duplicate-controller baseline.
- Real Android keyboard/Back/TalkBack and real desktop screen-reader speech remain unexecuted environment-specific evidence; the release report does not claim those platforms as verified.
- PR #15 merged at `e2b44a2`; flag-off production smoke exposed query loss in the auth proxy, PR #16 fixed it, and final production main is `6858529`.
- Production Focus is deliberately enabled. Authenticated server-rendered smoke passes ordinary Notes, Focus control/route, URL canonicalization, source-reading precedence, and the AI/connections default setting; strict Anthropic/Gemini checks, health, webhook boundary, service, and Recall timer pass.
- Production closeout documentation merged through PR #17 at `47968ec`; the 63-page GitHub Wiki was published at `3d578c3`, then passed fresh-clone privacy, structure/reachability, and byte-for-byte canonical comparison.

## Current owners

- Product/council integration, specifications, implementation, QA, release: primary Codex agent.
- Product/growth/platform/power-user council: `product_council`.
- UX/accessibility/responsive council: `ux_designer`.
- Technical/reliability/testing/rollout council: `technical_architect`.
