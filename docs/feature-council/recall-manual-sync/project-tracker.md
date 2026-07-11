# Recall manual sync project tracker

Updated: 2026-07-11 17:01 IST
Branch: `feat/recall-manual-sync`
Project phase: documentation, Wiki publication, and review-ready delivery

## Milestones

| Milestone | Owner | Exit gate | Status |
| --- | --- | --- | --- |
| M0 Repository and source baseline | Coordinator | Correct origin, latest-main worktree, clean branch, supplied inputs readable, baseline tests recorded | Complete |
| M1 Discovery and council | Coordinator, PM council, architect, UX | PRD/code/wiki/history/design evidence reconciled; conflicts logged | Complete |
| M2 v1 product/UX/technical package | Coordinator | `prd-v1.md`, `ux-ui-v1.md`, `technical-plan-v1.md` consistent | Complete |
| M3 Adversarial review and v2 approval | Adversarial reviewer, coordinator | Every material finding dispositioned in PRD/UX/technical v2 | Complete |
| M4 Backend dark launch | Implementation agent | Migration, request repository, lifecycle/status, route, worker, full-wrapper reuse, tests; flag off | Complete |
| M5 Settings experience | Implementation agent, UX | Responsive accessible panel/dialog/polling and every v2 state | Complete |
| M6 Verification and independent review | QA/reviewer, adversarial reviewer | Automated gates, visual/mobile/a11y/manual evidence, no critical/high findings | Complete — GO |
| M7 Repository and wiki documentation | Coordinator | Canonical docs updated; separate wiki committed, pushed, fresh-clone verified | In progress |
| M8 Review-ready delivery | Coordinator | Final diff, commits, push, PR, screenshots, evidence, running log, final report | Pending |

## Work items

| ID | Deliverable | Owner | Status | Gate / evidence |
| --- | --- | --- | --- | --- |
| RMS-BASE-01 | Verify origin and preserve existing checkouts | Coordinator | Complete | Origin `arunpr614/ai-brain`; source checkout clean and untouched |
| RMS-BASE-02 | Create clean worktree from latest `origin/main` | Coordinator | Complete | `1cb5d36`, branch `feat/recall-manual-sync` |
| RMS-BASE-03 | Baseline type/lint/Recall tests | Coordinator | Complete | Typecheck and lint pass; 25 focused tests pass |
| RMS-DISC-01 | Render all three supplied designs | UX + coordinator | Complete | Desktop 1440, mobile 390, state-board desktop/mobile evidence |
| RMS-DISC-02 | Current sync/code/history/wiki discovery | Architect + coordinator | Complete | Technical and discovery working notes |
| RMS-PROD-01 | Normative state/copy and acceptance model | PM council + coordinator | Complete | Approved `prd-v2.md`, `ux-ui-v2.md`, and `technical-plan-v2.md` |
| RMS-DATA-01 | Fully validated last-success source | Implementation | Complete | Post-validator authority and crash-stage tests; no failure overwrite |
| RMS-DATA-02 | Truthful partial-write accounting | Implementation | Complete | Later-card fault injection and killed-apply fixtures persist exact counts |
| RMS-DATA-03 | Durable automatic/manual execution lifecycle | Implementation | Complete | Running execution, 15s heartbeat, 90s stale recovery, six crash stages |
| RMS-CONC-01 | One active request and atomic claim | Implementation | Complete | Independent-process enqueue/claim races and exact request recovery |
| RMS-CONC-02 | Whole-wrapper daily/manual serialization | Implementation | Complete | Real `flock` ordering, existing core lock, no occurrence restart |
| RMS-OPS-01 | Narrow wake path and fallback timer | Implementation | Complete for review-ready scope | Built worker/lifecycle path and fallback fixtures; host proof separate |
| RMS-OPS-02 | Trusted next-elapse snapshot and timer invariant | Implementation + QA | Complete for review-ready scope | Trusted snapshot validation and before/after hash/state fixtures |
| RMS-SEC-01 | Owner, exact-origin, flag, body-limit contract | Implementation | Complete | Auth-first exhaustive route tests and 256-byte streaming limit |
| RMS-SEC-02 | Web/Recall credential separation | Architect + QA | Complete for static review | Default-off units/artifact checks pass; actual-host proof required before enablement |
| RMS-PRIV-01 | Allowlisted API/event/log schemas | Implementation + QA | Complete | Exact DTO/privacy checks and broad publication scans pass |
| RMS-UX-01 | Revised state prototype | UX + coordinator | Complete | 20-state board plus dialog; 320/390/1440 light and dark renders; zero horizontal overflow |
| RMS-UX-02 | Responsive accessible Settings UI | Implementation | Complete | 320/390/1024/1440, 200% zoom, keyboard, reduced motion, light/dark, AX/axe |
| RMS-REL-01 | Refresh/offline/auth/multi-tab recovery | Implementation + QA | Complete | Exact request-ID/key rehydration, supersession, no replay/false failure |
| RMS-QA-01 | Acceptance traceability and release risk | QA/reviewer | Complete — GO | AC 1–21 closed for review-ready scope; no Critical/High; host proof separate |
| RMS-DOC-01 | Repository docs and wiki source | Coordinator | In progress | Feature, API, data, ops, security, limitations, catalog, changelog, baseline |
| RMS-DOC-02 | Separate wiki publication | Coordinator | Pending | Protected base SHA, normal push, fresh clone, live verification |
| RMS-DEL-01 | Review-ready PR | Coordinator | Pending | Green checks, screenshots, rollback, no production enablement |

## Current blockers and risks

- Production enablement remains blocked until an authorized real-host proof shows the web process cannot read the Recall credential or open the private lock and verifies identity, data/SQLite/WAL/backup permissions, installed units, timer continuity, a controlled request, and the next daily completion. This does not block a default-off review-ready PR.
- No Critical, High, or P2 implementation-review finding remains. Physical VoiceOver/TalkBack and physical touch hardware were unavailable; browser AX/live-region/keyboard/zoom/contrast/axe/reduced-motion evidence is recorded without claiming a physical AT lab.
- Remaining delivery work is canonical Wiki publication verification, repository documentation commit, branch push, and the review-ready PR. No merge or deploy is authorized.

## Operating constraints

- No merge, production deployment, timer mutation, or feature enablement is authorized.
- Agents may edit only their assigned artifacts or implementation areas; the coordinator owns synthesis and integration.
- All v1 artifacts remain immutable review evidence after adversarial reports are created; revisions go to v2.
