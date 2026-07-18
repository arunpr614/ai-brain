# YouTube Transcript and Enrichment — Tracker

**Current status:** Prospective pre-seal controls mechanically validated; production remains unimplemented and primary runs remain prohibited<br>
**Current phase:** Machine readiness, same-reviewer closure, and two-commit sealing<br>
**Verified:** 2026-07-19<br>

## Baseline

| Field | Evidence |
|---|---|
| Origin | `https://github.com/arunpr614/ai-brain.git` |
| Default branch | `main` |
| Fetched base | `ad78d77495dcaa90f62aab038fe63ae95cf36862`; `origin/main` re-fetched and still exact on 2026-07-18 |
| Base subject | `docs: record Library inbox release (#33)` |
| Research branch | `research/youtube-transcript-enrichment` |
| Worktree baseline | Clean when created from `origin/main` on 2026-07-16 |
| Existing user work | Preserved in other checkouts/worktrees; no reset, clean, move, or overwrite performed |
| GitHub Wiki | Enabled; Git remote readable; publication not yet attempted |
| Overlapping work | Draft PR #6 touches YouTube transcript recovery/repair and is conflicting with current `main`; audit required |

## Ordered execution

| Order | Stage | State | Exit evidence |
|---:|---|---|---|
| 1 | Focused current-state audit | Complete | v1, independent review, reconciled v2, maps, and 194-test QA baseline |
| 2 | Benchmark protocol and corpus lock | Implementation validation complete / authorization machine- and reviewer-governed | Required exit: `PRESEAL_READINESS.json` ready, same-reviewer closure recorded, Commit A frozen, and Commit B adds only verified `LOCK.json`; none of Commit A/B/LOCK or primary evidence exists yet |
| 3 | Gate 1 — compliant acquisition | Eligible after seal / Not run | Exact 5/5 A1 positives and 4/4 predeclared rejections, each with one canonical public claim and either an exclusive private success receipt or a public caught-failure terminal; zero network/provider activity; USD 0 |
| 4 | Gate 2 — STT fallback | Not triggered / Not run | Two-part trigger is 1/10; both ≥2 rows and ≥20% fail |
| 5 | Gate 3 — normalization | Conditionally eligible / Not run | One write-once repeat for each of the five eligible Gate 1 outputs; the sealed generator derives the exact 5/5 repeat, 5/5 positive, and 4/4 rejection handoff and Git-binds all 14 claims under the same A/B seal |
| 6 | Gate 4 — enrichment | Conditionally eligible / Not run | One frozen local text candidate may run only after Gates 1 and 3 pass; public package/role claims, exact A/B evidence, conditional adjudication, and the sole finalizer control the result; zero inference so far |
| 7 | Gate 5 — visual value | Not triggered / Not run | A below-80% Gate 4 result fires the trigger, but this seal has no visual method/media; record Triggered but blocked / Not run |
| 8 | Gate 6 — product/security/ops | Required / Pending | Must synthesize threat, cost, reliability, supported-input, recovery, policy, and lifecycle evidence for every upstream outcome |
| 9 | Product council | Required / Pending | Three independent memos plus v1, adversarial review, and v2 for every upstream outcome |
| 10 | Conditional downstream artifacts | Not eligible | Only after Go or Limited-go |
| 11 | Wiki and review-only PR | Not started | Verified publication, commits, push, and unmerged PR |

## Hard-limit ledger

| Limit | Authorized maximum | Current | State |
|---|---:|---:|---|
| Corpus videos | 12 | 10 selected; 0 sealed | Within limit; five A1 positives, four A1 rejection controls, one no-sidecar case |
| Transcript-acquisition methods | 3 | 1/3 experimental roster (A1); 0 executed | Within limit; A2 is excluded before run and A3 was not triggered |
| Speech-to-text approaches | 2 | 0/2 frozen; 0 executed | Within limit; Gate 2 not triggered |
| Enrichment models | 4 | 1/4 selected for prospective freeze; 0 inference | Within limit; four public catalog leads were rejected during discovery before candidate freeze and never entered the experimental model roster |
| Multimodal approaches | 1 | 0 executed | Within limit |
| Repeats after the same method/input failure | 2 | 0 | Within limit |
| Tool-recovery time per failing tool | 60 minutes | ~40 active minutes for the A1 sandbox | Within limit; resolved without expanding access or changing the primary scope |
| Paid external-service spend | USD 0 | USD 0 | At limit; no spend allowed |
| New subscriptions | 0 | 0 | At limit; none allowed |

Free credits are not spending authorization. Any essential paid validation must remain a separately priced, separately blocked experiment and cannot be run under this goal.

## Agent ownership

| Role | Current scope | File ownership |
|---|---|---|
| Coordinator/project manager | Integration, tracker, decisions, limits, final delivery | Control documents; no shared concurrent edits |
| Transcript/open-source researcher | Current methods, licenses, policy sources, rights-safe corpus candidates | Read-only research return until assigned a unique artifact |
| Model/evaluation specialist | Exact local runtime/model package, prompt/schema/rubric, and offline runner tests | `benchmark/model/`, `spikes/model-harness/`, model comparison and stop record only |
| Architecture/security/QA specialist | Focused code, schema, test, security, and deployment audit | Read-only research return until assigned a unique artifact |

## Evidence discipline

- Primary real-item results are prohibited until the two-commit seal verifies. Publication-safe synthetic development fixtures may run only as declared outside every primary denominator.
- Historical repository results are prior knowledge and audit evidence, not prospective benchmark results.
- Every claim must be marked or written as verified behavior, official claim, third-party claim, inference, hypothesis, or recommendation.
- AI qualitative evaluation will be labeled provisional pending human stakeholder review.
- A failed gate stops dependent work unless a separately viable restricted-scope strategy is recorded.
- Production implementation, dependencies, migrations, merge, deployment, browser cookies, private content, and bypass techniques remain outside scope. The newly authorized OAuth-client exploration is isolated and remains blocked before a call; identifiers/secrets/tokens stay outside Git.

## Immediate next actions

1. Complete the final candidate-tree no-drift checks and populate `PRESEAL_READINESS.json` with the stabilized 289/289 benchmark, 20/20 A1, 29/29 model, and 338/338 aggregate counts; then check only the internal-validation checklist row.
2. Have the same reviewer inspect the exact reconciled bytes. Only after preliminary approval, complete the reference-ledger review fields and independent-review checklist row; then obtain the same reviewer's final closure marker.
3. Rerun final non-mutating validation, create Commit A, create lock-only Commit B, and verify the seal before Gate 1.
4. Execute only eligible/conditional sealed cells, preserving every stop condition and zero-spend limit; then complete Gate 6, the three independent PM memos, and council v1/review/v2.
5. Publish verified Wiki updates, push the research branch, and open a review-only unmerged pull request.
