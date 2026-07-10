# F08 Project Tracker

**Coordinator / integration owner:** Codex primary agent
**Repository:** `arunpr614/ai-brain`
**Worktree:** `Phase3`
**Branch:** `codex/manual-content-notes`
**Started:** 2026-07-10
**Current recommendation:** v2 GO for implementation behind default-off flags after `8178117` integration; production remains gated.

## Workstreams and owners

| Workstream | Accountable role | State | Exit evidence |
|---|---|---:|---|
| Product, AI, and PM council | Expert PM + Brainstorm Council | Complete | `council/product_council_v1.md` |
| UX direction and prototype | Expert UX/UI designer | In progress | UX council brief, working prototype, desktop/mobile screenshots |
| Technical architecture | Technical architect | Complete | `council/technical_architecture_v1.md` |
| Integrated v1 package | Coordinator | In progress | PRD/UX/technical v1 |
| QA review | QA/reviewer | Complete | `reviews/QA_REVIEW_v1.md`, 36-test matrix, nine gates |
| Adversarial review | Coordinator using adversarial-review skill | Complete | Timestamped prioritized P0–P3 report |
| Final v2 package | Coordinator | Complete | PRD/UX/technical v2 resolve all review P0s and P1 contract gaps |
| Production-line integration | Coordinator | Pending | Recall source/migrations 018–020 retained; clean merge evidence |
| Implementation | Coordinator | Pending | Schema, API, editor, search, AI/related, privacy, observability |
| Validation | Coordinator + QA | Pending | Automated, browser, design, migration-copy, and rollback evidence |
| Documentation/wiki | Coordinator | Pending | Sanitized canonical docs and verified GitHub wiki publication |
| Release | Coordinator | Pending | GitHub PR/checks, backup, controlled deploy, production smoke/cleanup |

## Milestones

| ID | Milestone | State | Gate |
|---|---|---:|---|
| M0 | Discovery and isolated baseline | Complete | Clean worktree from `main`; baseline checks recorded |
| M1 | Three-lens council and v1 artifacts | Complete | All required product, UX, and technical sections present |
| M2 | QA + adversarial review and v2 | Complete | No unresolved specification P0; P1 dispositions explicit |
| M3 | Deployed-source reconciliation | Pending | Production source through migration 020 and Recall scheduler preserved |
| M4 | Persistence, security, and no-loss save | Pending | CAS/idempotency/offline tests and forged-session rejection pass |
| M5 | Editor and responsive item UI | Pending | Markdown, accessibility, mobile, and cache/privacy checks pass |
| M6 | Search, AI, related/graph integration | Pending | Provenance, opt-out, convergence, and cleanup tests pass |
| M7 | Release readiness | Pending | Snapshot-copy migration, audit, backup, manifest, rollback proof pass |
| M8 | Production release | Pending | Synthetic end-to-end smoke and cleanup pass; health stable |

## Current blockers

1. Production is ahead of `origin/main`; attested consolidated snapshot `8178117` with migrations 018/019/020 must be merged before feature code. Deploying stale main or `4d97c45` can remove/regress transcript/Recall runtime.
2. Production has 122 items, 0 relational chunks, and 44 vector rows. The vector rowids must be classified and proven-safe or repaired before a note-index worker can allocate rowids.
3. Every new private-note route must verify the HMAC session and same-origin mutation; the existing cookie-presence pattern is insufficient.
4. The editor dependency must pass React 19 / Next 16 / Capacitor, IME, Markdown round-trip, bundle, and accessibility tests; a plain Markdown editor remains the safe fallback.

## Release rule

No real user note content is created or mutated during validation. Production smoke uses an isolated synthetic item/note with a recorded cleanup manifest. Feature flags are the first rollback; schema down-migrations are prohibited.
