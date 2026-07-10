# F08 Project Tracker

**Coordinator / integration owner:** Codex primary agent
**Repository:** `arunpr614/ai-brain`
**Worktree:** `Phase3`
**Branch:** `codex/manual-content-notes`
**Started:** 2026-07-10
**Current recommendation:** Release candidate GO for guarded production execution; live enablement remains gated by exact audit/repair and synthetic smoke.

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
| Documentation/wiki | Coordinator | In progress | Canonical local docs complete; GitHub wiki publication pending |
| Release | Coordinator | Pending | GitHub PR/checks, backup, controlled deploy, production smoke/cleanup |

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
| M8 | Production release | Pending | Synthetic end-to-end smoke and cleanup pass; health stable |

## Current blockers

1. Publish the reviewed branch/PR without flattening the production-baseline merge.
2. Deploy with all manual-note flags off; repeat the exact live vector/FK audit and approve only a matching, explained manifest.
3. Run the guarded live repair only with verified backup + exact audit ID; require a safe post-audit before any writer/worker flag.
4. Use only a synthetic production item/note for create/edit/search/Ask/Related/opt-out/delete/cleanup, then stage UI/write and finally worker after explicit provider acknowledgement.
5. Publish sanitized wiki docs with a concurrency check and record final production evidence.

## Release rule

No real user note content is created or mutated during validation. Production smoke uses an isolated synthetic item/note with a recorded cleanup manifest. Feature flags are the first rollback; schema down-migrations are prohibited.
