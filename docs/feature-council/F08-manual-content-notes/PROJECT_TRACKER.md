# F08 Project Tracker

**Coordinator / integration owner:** Codex primary agent
**Repository:** `arunpr614/ai-brain`
**Worktree:** `Phase3`
**Branch:** `codex/manual-content-notes`
**Started:** 2026-07-10
**Current recommendation:** Production GO; release verified and synthetic data fully cleaned.

## Workstreams and owners

| Workstream | Accountable role | State | Exit evidence |
|---|---|---:|---|
| Product, AI, and PM council | Expert PM + Brainstorm Council | Complete | `council/product_council_v1.md` |
| UX direction and prototype | Expert UX/UI designer | Complete | UX v2, high-fidelity prototype, combined design QA, desktop/mobile screenshots |
| Technical architecture | Technical architect | Complete | `council/technical_architecture_v1.md` |
| Integrated v1 package | Coordinator | Complete | PRD/UX/technical v1 |
| QA review | QA/reviewer | Complete | `reviews/QA_REVIEW_v1.md`, 36-test matrix, nine gates |
| Adversarial review | Coordinator using adversarial-review skill | Complete | Timestamped prioritized P0–P3 report |
| Final v2 package | Coordinator | Complete | PRD/UX/technical v2 resolve all review P0s and P1 contract gaps |
| Production-line integration | Coordinator | Complete | True merge `a50ba82`; Recall source/migrations 018–020 retained |
| Implementation | Coordinator | Complete | Schema, API, editor, search, AI/Related, privacy, vector audit/repair, rollout flags |
| Validation | Coordinator + QA | Complete | 785 tests, build/lint/type/audit, browser/design, adversarial disposition, snapshot rehearsal |
| Documentation/wiki | Coordinator | Complete | Canonical commit `463c56f`; wiki commit `70f6fa8`; fresh clone matches all 63 Markdown files |
| Release | Coordinator | Complete | GitHub PR, backup, controlled deploy, exact repair, production smoke/cleanup |

## Milestones

| ID | Milestone | State | Gate |
|---|---|---:|---|
| M0 | Discovery and isolated baseline | Complete | Clean worktree from `main`; baseline checks recorded |
| M1 | Three-lens council and v1 artifacts | Complete | All required product, UX, and technical sections present |
| M2 | QA + adversarial review and v2 | Complete | No unresolved specification P0; P1 dispositions explicit |
| M3 | Deployed-source reconciliation | Complete | Production source through migration 020 and Recall scheduler preserved in true merge |
| M4 | Persistence, security, and no-loss save | Complete | CAS/idempotency/offline/tombstone/route/cleanup tests pass |
| M5 | Editor and responsive item UI | Complete | Markdown, accessibility, mobile, cache/privacy, and interactive checks pass |
| M6 | Search, AI, related/graph integration | Complete | Provenance, consent, opt-out, convergence, stale-job, and cleanup tests pass |
| M7 | Release readiness | Complete | Verified backup copy, snapshot migration, exact audit/repair, rollback gates, and 785-test build pass |
| M8 | Production release | Complete | Synthetic end-to-end smoke and cleanup pass; health, providers, and Recall timer stable |
| M9 | Publication and main integration | Complete | Wiki fresh-clone verification passed; PR #10 merged to `main` at `b5910b2` |

## Current blockers

None. Production feature behavior, public documentation, and main integration have no open release blocker.

## Release rule

No real user note content is created or mutated during validation. Production smoke uses an isolated synthetic item/note with a recorded cleanup manifest. Feature flags are the first rollback; schema down-migrations are prohibited.
