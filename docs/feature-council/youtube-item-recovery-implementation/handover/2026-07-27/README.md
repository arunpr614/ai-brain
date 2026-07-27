# YouTube Item Recovery and Manual Enrichment Handover

- **Repository state audit:** 2026-07-27 14:02 IST
- **Remote PR/ref refresh:** 2026-07-27 14:32 IST; unchanged from the state audit
- **Initial handover assembly:** 2026-07-27 14:33 IST
- **Latest review-item remediation:** 2026-07-27 18:11 IST
- **Audience:** a cold-start AI implementation agent and its reviewers
- **Project:** AI Brain
- **Repository root:** resolve with `git rev-parse --show-toplevel`; no machine-local path is authoritative
- **Branch:** `feat/youtube-item-recovery-enrichment`
- **Pushed branch head:** `4786b079e88cc01ec8e9c300faa93e3832ae2678`
- **Protected-main base:** `6784e0e85c50fd86e3353b54a8b1964f045b65b1`
- **Draft pull request:** [#57](https://github.com/arunpr614/ai-brain/pull/57)
- **Handover status:** privacy-scrubbed documentation snapshot; it is not an implementation, migration, lab, merge, deployment, or release approval
- **Publication gate:** local verification and a fresh zero-P0/P1 review unlock exact Group E staging only for publication verification; commit, push, and draft-PR update require publication-verifier PASS

## Why this package exists

This package captures the complete implementation context at a deliberately interrupted point. It is designed so another AI agent can continue without the prior conversation, while preserving the exact authorization boundaries, evidence hierarchy, accepted contracts, unfinished edits, known invalid evidence, and safe order of work.

The parent product implementation objective being handed over remains:

1. exact-item, explicit-consent YouTube visible-transcript recovery through the existing Chrome companion;
2. revision-bound manual enrichment for an already attached, held browser transcript; and
3. a separately gated metadata-only link-save path.

No browser-visible transcript capture or held-transcript processing is authorized in production. No live lab canary is authorized without the external packet described in this package.

## Read this first

The worktree is intentionally dirty. It contains:

- reviewed and pushed Stage 0, Stage 1, and bounded Stage 2 foundation commits;
- uncommitted native crash/recovery profiles with session-derived direct
  observations, but no persisted integrated gate;
- candidate crash/restart build and worker artifacts, while the required parent
  controller and integrated passing proof are absent;
- an uncommitted SQLite WAL-reset source-reconciliation addendum whose first adversarial review returned **NO-GO**;
- CI/router edits that must not be treated as green until the crash suite contains and executes real matching tests; and
- an unrelated untracked nested checkout identified in
  [current state](CURRENT_STATE.md), which must not be edited, moved, staged,
  removed, or committed.

Do not run `git add .`, `git add -A`, destructive cleanup, recursive formatting across the nested checkout, or any migration/deployment command.

## Current gate summary

| Area                                             | Current truth                                                                                    | Authority                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Stage 0 source, PR, and migration reconciliation | Complete on earlier baselines; later drift is recorded where known                               | GO for continued local work                                     |
| Stage 1 production-safe containment              | Implemented, reviewed, pushed, and independently accepted                                        | Non-enabling containment only                                   |
| Stage 2 physical-schema contract                 | Exact bytes accepted at SHA-256 `d1eef042...e5eed48`                                             | Contract GO only                                                |
| Stage 2 memory-only native route                 | Bounded GO, non-authorizing                                                                      | Prerequisite evidence only                                      |
| Stage 2 nominal file-backed factory              | Local and hosted nominal evidence accepted at pushed head                                        | Does not prove abrupt restart                                   |
| Abrupt-stop/fresh-restart proof                  | Native profiles are present; direct results are session-derived; controller/tests are incomplete | NO-GO until persisted local, hosted, and adversarial gates pass |
| SQLite WAL-reset source                          | Current 3.49.2 pin is in the affected range                                                      | P1 blocker                                                      |
| Migration `028_youtube_browser_transcript.sql`   | Not created or applied                                                                           | NO-GO                                                           |
| Chrome companion implementation                  | Not started                                                                                      | Blocked on Stage 2                                              |
| Exact-item recovery                              | Not started                                                                                      | Blocked on Chrome/data foundations                              |
| Held manual enrichment                           | Not started                                                                                      | Blocked on recovery/data foundations                            |
| UX/accessibility implementation                  | Not started                                                                                      | Blocked on feature implementation                               |
| Live lab canary                                  | External authorization packet absent                                                             | Blocked                                                         |
| Production capture or held processing            | Explicitly prohibited                                                                            | Denied                                                          |
| Merge/deployment/release                         | None performed                                                                                   | Not authorized by this handover                                 |

## Terminology and restart boundary

This package is self-contained for answering: what the goal is, what state was
observed, what is blocked, what must not be touched, and what to do next. The
[privacy-scrubbed governing-goal snapshot](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md)
preserves the operational authority needed to restart without a machine-local
attachment. It does not duplicate the 16,988-line frozen Stage 2 contract, the
live Git diff, or mutable PR/CI state. Before any implementation mutation, the
successor must read the repo-relative primary sources and refresh live state. If
a required source is inaccessible or refreshed state conflicts with this
snapshot, stop and reconcile it; do not treat stale snapshot facts as current
authority.

Use the D-021 labels precisely:

- **D-021 stop decision:** the binding decision that migration 028 and later
  Stage 2 work cannot advance while the SQLite source gate is unresolved.
- **D-021 advisory addendum:** the untracked remediation candidate at
  `b8d38446…c482878b`; it is not accepted.
- **D-021 session review:** the durable record in this package of a
  session-derived four-P1 NO-GO; it is not a formal accepted gate artifact.

## Package index

Read in this order:

1. [Governing-goal public snapshot](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md)
2. [Canonical current-state snapshot](CURRENT_STATE.md)
3. [Goal, scope, and authority](01_GOAL_SCOPE_AND_AUTHORITY.md)
4. [Reference and evidence inventory](02_REFERENCE_EVIDENCE_INVENTORY.md)
5. [Work completed and delivered](03_WORK_COMPLETED_AND_DELIVERED.md)
6. [Current worktree and uncommitted state](04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md)
7. [Stage 2 contract, crash recovery, and WAL gate](05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md)
8. [Architecture and end-to-end data flow](06_ARCHITECTURE_AND_DATA_FLOW.md)
9. [Requirements and verification status](07_REQUIREMENTS_AND_VERIFICATION_STATUS.md)
10. [Continuation execution playbook](08_EXECUTION_PLAYBOOK.md)
11. [Decisions, risks, blockers, and stop conditions](09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md)
12. [Git, pull request, CI, tests, and commands](10_GIT_PR_CI_TESTS_AND_COMMANDS.md)
13. [Documentation, Wiki, lab, and release handoff](11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md)
14. [Successor completion checklist](12_SUCCESSOR_COMPLETION_CHECKLIST.md)
15. [D-021 adversarial-review session findings](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md)
16. [File, artifact, and commit map](14_FILE_ARTIFACT_AND_COMMIT_MAP.md)
17. [Adversarial-review finding disposition](ADVERSARIAL_REVIEW_DISPOSITION.md)
18. [Cold-start reader test](COLD_START_READER_TEST.md)
19. [Handover integrity manifest](HANDOVER_MANIFEST.md)

The stable cross-date entry point is [`../INDEX.md`](../INDEX.md). Run the
package verifier from the repository root:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode local
```

Local mode is the pre-review byte-integrity gate; it deliberately does not
assert that the later final review or running-log append has happened.
Publication additionally requires `--mode publication`, which enforces a
genuinely public repository, every configured origin fetch and push destination
as the exact expected repository, exact tracked/index-matching bytes, the
complete staged set including deletions, privacy signatures, and a
machine-readable unique block in the latest running-log entry. The block binds
this manifest, the exact stable index and verifier bytes, the locally present
review report and its matching machine record, `GO`, zero P0/P1, and the
bounded Group E authority attestation. Publication mode privacy-scans the
complete appended suffix, requires the raw review report to remain outside the
Git index, rejects a detached `HEAD`, and proves the staged running log is a
strict byte-prefix append of `HEAD`.

## Authority and freshness rules

Use this order when evidence conflicts:

1. current `origin/main`;
2. current merged pull-request state;
3. current heads of open dependent pull requests;
4. the latest final V2 post-planning verification;
5. final V2 PRDs and implementation plans;
6. final V2 UX specifications and prototypes;
7. final adversarial reviews and disposition matrices;
8. V1 artifacts;
9. historical prototypes.

A newer source cannot silently weaken a safety boundary. Explicit production denial, consent, privacy, and lab-authorization decisions remain binding unless a newer approved decision explicitly supersedes them.

This handover is a snapshot, not a replacement for the source documents. Before changing code, re-run the state commands in [Git, pull request, CI, tests, and commands](10_GIT_PR_CI_TESTS_AND_COMMANDS.md), inspect the live diff, and update any drift in a new handover or running-log entry.

## Fast restart for the successor

```bash
PROJECT="$(git rev-parse --show-toplevel)"
cd "$PROJECT"

# Refresh server-side facts before relying on local remote-tracking refs.
git ls-remote origin \
  refs/heads/main \
  refs/heads/feat/youtube-item-recovery-enrichment
gh pr view 57 --repo arunpr614/ai-brain \
  --json state,isDraft,headRefOid,mergeable,mergeStateStatus,url

git status --short --branch
git rev-parse HEAD origin/main
git diff --stat
git diff --name-status
git log --oneline --decorate -n 25
```

Then:

1. read this package in order;
2. read the repo-relative
   [governing-goal public snapshot](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md);
3. read the latest `RUNNING_LOG.md` entry without modifying prior bytes;
4. preserve the unrelated nested checkout identified in `CURRENT_STATE.md`;
5. inspect every uncommitted file before editing;
6. finish only the crash/restart integration slice first;
7. keep migration 028 blocked while D-021 is NO-GO;
8. require a zero-P0/P1 pre-push source/local-evidence review;
9. if current explicit authority permits a push, require exact hosted evidence on
   that commit; and
10. require a separate zero-P0/P1 post-hosted exact-commit evidence review before
    advancing.

## Claims this package does not make

- It does not claim the complete feature is implemented.
- It does not claim migration 028 exists, is safe, or has run.
- It does not claim the SQLite WAL-reset defect occurred in AI Brain.
- It does not claim the current SQLite source is remediated.
- It does not claim the partial crash workers form a valid proof.
- It does not claim full-project lint/typecheck is currently green.
- It does not claim a live YouTube request or lab canary occurred.
- It does not claim link-only is available in production.
- It does not claim browser capture or manual enrichment is available in production.
- It does not authorize merge, deployment, extension publication, provider processing, or production data writes.
