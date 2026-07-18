# YouTube Transcript and Enrichment — Tracker

**Current status:** Prospective-input seal verified; Gate 1 failed at 3/5 eligible first attempts with 4/4 rejection controls; dependent experiments stopped; production remains unimplemented<br>
**Current phase:** Mandatory post-failure governance, result-evidence reconciliation, and review-only delivery<br>
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
| 2 | Benchmark protocol and corpus lock | Complete / Verified | Content Commit A `6b829798101a59fadd9a1d0efd65428539f400ad`; lock-only Commit B `0ed1b13729802f4ded921f1a94369ddc110dabc3`; lock SHA-256 `bef4437a05ac20418a49f3c06a99a1f74ad93c9395dcc780d1c0307aa354b8c3`; official verifier valid. The seal binds prospective inputs, not later result narratives. |
| 3 | Gate 1 — compliant acquisition | **Fail / Complete** | Eligible first attempts 3/5 against exact 5/5; truthful rejection controls 4/4; nine canonical claims, two failure terminals, seven private receipts; no retry, repair, replacement, or denominator change |
| 4 | Gate 2 — STT fallback | Not triggered / Not run | Two-part trigger is 1/10 (10%); both ≥2 rows and ≥20% fail; zero STT/media execution |
| 5 | Gate 3 — normalization | Ineligible / Not run | Gate 1 failed; no repeats, repeat claims, or generated Gate 3 result |
| 6 | Gate 4 — enrichment | Blocked / Not run | Gate 1 failed and Gate 3 was ineligible; zero model inference, evaluator, or provider execution |
| 7 | Gate 5 — visual value | Not triggered / Not run | Gate 4 produced no valid result; zero visual calls or media processing |
| 8 | Gate 6 — product/security/ops | Complete with material gaps | Safety evaluator 18 pass / 8 known gaps / 7 not applicable; exact unavailable/retry suite 5/5; exact A1 CLI integration suite 11/11; production readiness not passed |
| 9 | Product council | Complete | All three PMs and council v1 recommend **Defer**; adversarial review verdict was Revise; reconciled v2 records **No-go / not approved** for the current automatic route and **Defer** for separately authorized future exact-class research |
| 10 | Conditional downstream artifacts | Not eligible | Only after Go or Limited-go |
| 11 | Wiki and review-only PR | Pending | Result evidence is not yet committed; Wiki publication, branch push, and unmerged review-only PR remain pending |

## Hard-limit ledger

| Limit | Authorized maximum | Current | State |
|---|---:|---:|---|
| Corpus videos | 12 | 10 selected and sealed | Within limit; five A1 positives, four A1 rejection controls, one no-sidecar case |
| Transcript-acquisition methods | 3 | 1/3 experimental roster (A1); 9 fixed cells executed once | Within limit; eligible 3/5 and rejection controls 4/4; A2 excluded before run and A3 not triggered |
| Speech-to-text approaches | 2 | 0/2 frozen; 0 executed | Within limit; Gate 2 not triggered |
| Enrichment models | 4 | 1/4 sealed; 0 inference | Within limit; Gate 4 blocked before execution |
| Multimodal approaches | 1 | 0 executed | Within limit; Gate 5 not triggered |
| Repeats after the same method/input failure | 2 | 0 | Within limit; YT-02 and YT-08 were not retried |
| Tool-recovery time per failing tool | 60 minutes | ~40 active minutes for the A1 sandbox | Within limit; resolved without expanding access or changing the primary scope |
| Paid external-service spend | USD 0 | USD 0 | At limit; no spend allowed |
| New subscriptions | 0 | 0 | At limit; none allowed |
| Primary external/API/provider calls | 0 | 0 | At limit; no such call occurred |

Free credits are not spending authorization. Any essential paid validation must remain a separately priced, separately blocked experiment and cannot be run under this goal.

## Agent ownership

| Role | Current scope | File ownership |
|---|---|---|
| Coordinator/project manager | Integration, tracker, decisions, limits, final delivery | Control documents; no shared concurrent edits |
| Transcript/open-source researcher | Current methods, licenses, policy sources, rights-safe corpus candidates | Read-only research return until assigned a unique artifact |
| Model/evaluation specialist | Exact local runtime/model package, prompt/schema/rubric, and offline runner tests | `benchmark/model/`, `spikes/model-harness/`, model comparison and stop record only |
| Architecture/security/QA specialist | Focused code, schema, test, security, and deployment audit | Read-only research return until assigned a unique artifact |

## Evidence discipline

- The two-commit seal verified before primary execution. It establishes prospective-input identity and chronology; it does not by itself authenticate post-seal result or council artifacts, which require separate schema/link/privacy validation and a result commit.
- Historical repository results are prior knowledge and audit evidence, not prospective benchmark results.
- Every claim must be marked or written as verified behavior, official claim, third-party claim, inference, hypothesis, or recommendation.
- AI qualitative evaluation will be labeled provisional pending human stakeholder review.
- Gate 1's first-attempt failure stopped Gates 3–5 under this seal; no cell was retried, repaired, replaced, or removed.
- The scoped primary ledger remains at zero external/API/provider/model/STT/visual calls and USD 0. The two public failure terminals do not expose per-cell network counters and are not safety passes.
- Production implementation, dependencies, migrations, merge, deployment, browser cookies, private content, and bypass techniques remain outside scope. The credential-safe OAuth prerequisite exploration completed without a call; any future OAuth work requires separate authorization, and identifiers/secrets/tokens stay outside Git.

## Immediate next actions

1. Validate and commit the publication-safe claims, terminals, gate decisions, council documents, and governance updates as post-seal result evidence; rerun the official verifier to prove prospective inputs remain unchanged.
2. Publish privacy-checked Wiki updates from a fresh clone after a remote-head concurrency check.
3. Push the research branch and open a review-only, unmerged pull request; do not merge or deploy.
4. Keep credential rotation/revocation as an explicit owner action before any future OAuth exploration.
