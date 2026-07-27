# Canonical Current-State Snapshot

## Scope and freshness

This file is the package's single current-state summary. It records the state
observed on 2026-07-27; it is not live authority. Refresh remote and worktree
facts before acting:

```bash
PROJECT="$(git rev-parse --show-toplevel)"
cd "$PROJECT"

git ls-remote origin \
  refs/heads/main \
  refs/heads/feat/youtube-item-recovery-enrichment
gh pr view 57 --repo arunpr614/ai-brain \
  --json state,isDraft,headRefOid,baseRefOid,mergeable,mergeStateStatus,url
gh pr checks 57 --repo arunpr614/ai-brain
git status --short --branch
git diff --name-status
git diff --check
```

If refreshed facts differ, update a new current-state record and append the
running log. Do not silently reinterpret this snapshot.

## Last accepted remote state

| Fact | Last observed value |
|---|---|
| Branch | `feat/youtube-item-recovery-enrichment` |
| Pushed branch head / PR head | `4786b079e88cc01ec8e9c300faa93e3832ae2678` |
| Protected-main head / PR base | `6784e0e85c50fd86e3353b54a8b1964f045b65b1` |
| Pull request | Draft [#57](https://github.com/arunpr614/ai-brain/pull/57), open, mergeable, merge state `CLEAN` |
| Product CI | Run `30245448800`, exact head above |
| Native nominal job | `89911374316`, success |
| Strict verify job | `89911975927`, success |
| Agent documentation | Run `30245448803`, job `89911374473`, success |

This hosted evidence covers only the pushed head. It does not cover any current
dirty byte.

## Current local state classes

The worktree is intentionally dirty and unstaged. Its changes fall into
separate review and future-commit groups:

1. native file-factory and candidate crash/recovery implementation bytes;
2. product-suite, command-registry, package, and hosted-CI routing bytes;
3. living feature-council decisions, tracker, traceability, risk, and source
   reconciliation;
4. the D-021 advisory candidate;
5. this privacy-scrubbed handover package and its verifier; and
6. an unrelated nested checkout that appears untracked to the outer repository.

The unrelated nested checkout is outside this feature lane. Do not edit, move,
format, stage, remove, clean, or commit it. Resolve its exact path from the live
`git status` output only when needed for an exclusion check; do not publish its
machine-specific name in this package.

No current dirty group is accepted merely because it is documented here.

## Stage 2 exact controls

| Control | Current truth |
|---|---|
| Physical contract | Frozen SHA-256 `d1eef042423d7d2d3413637f62bd8ed5842b64846db6f656a0b8e1cb7e5eed48` |
| Acceptance registry | Frozen SHA-256 `7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45` |
| Static authority index | Frozen SHA-256 `e691edfd0edcade37d439906f3b97dee9a3b05d57baae995ae23fb0254bbfd5d` |
| Static authority verifier | Frozen SHA-256 `133d55fae063244e7c6d413c64acbe88ebf0d1e83736296d9a00ca00de2e68a6` |
| Native operation trace | 265 entries; SHA-256 `1bca0c280eef643bf7b286973a70d59eed1cc08650f20791315b5b107b9cdbc7` using `SHA256(JSON.stringify(trace) + "\n")` |
| Local file modes | Best-effort only; hashes, registry/index/verifier checks, and reviewed Git bytes are durable controls |

Do not edit the frozen contract package in place.

## Open implementation truth

- The nominal worker trace and independent test digest were stale relative to
  the current 265-entry source trace; this remediation aligns both consumers.
  The local `npm run test:stage2-native:nominal` rerun passed 30 tests, failed
  zero, and retained the three explicit gap skips.
- Candidate crash and recovery build/worker artifacts exist locally.
- The required parent controller, complete validators, negative fixtures,
  nonzero suite-selection sentinel, and two executable required
  `crash/restart:` cases are not yet complete.
- Nominal evidence intentionally reports `abruptExitRestart=false`.
- Local technical evidence for dirty bytes is not hosted evidence.
- A pre-push source/local-evidence review cannot serve as the final hosted
  review.

## Cumulative blockers

1. Complete and accept the stopped-writer crash/restart prerequisite.
2. Resolve D-021:
   - choose a fixed official SQLite source;
   - bind source/package/build/release provenance;
   - inventory and fence every same-database actor;
   - execute the candidate-versus-3.49.2 semantic matrix for frozen physical
     contract lines 3076–3085, 4443–4449, and 4514–4521;
   - create a versioned compatibility addendum and regenerate dependent
     registry/index/verifier hashes if normative behavior drifts; and
   - obtain fresh zero-P0/P1 Contract GO.
3. Only then implement and accept migration 028 and Stage 2 Implementation GO.
4. Require migration 029 acceptance before any manual-enrichment route, UI,
   worker, provider dispatch, or product claim.
5. Require migration 030 parity/drain/cutover/contract acceptance before Stage
   7 can complete.
6. Before any transcript DOM read, require a content-free server-side
   `authorize inspect` success for the exact context and prove zero reads on
   every refusal/drift case.
7. Prove production source/build/module/sourcemap capability absence; runtime
   denial alone is insufficient.
8. Model retryable, terminal, and outcome-unknown states separately, with new
   attempts, mutation identifiers, claim tokens, or index generations as the
   exact operation requires.

## Authority boundary

Technical GO does not itself grant mutation authority. For this delivery only,
the governing goal plus the current request to address every review item
authorize the strict log append and staging of the exact sanitized handover
Group E paths solely to run publication verification after a zero-P0/P1
exact-byte review. Publication-verifier PASS then authorizes committing,
pushing, and updating draft PR #57 for that identical staged set. The final
running-log block must attest the exact repository, branch, ordered action set,
scope, and exclusions, and the verifier must validate that unique block.

No authority exists for the dirty feature/crash/D-021 paths, merge, deployment,
Wiki publication, live lab, provider use, release, browser capture, manual
processing, or production enablement. Any different action or slice stops at
`ready but not authorized`.

Production browser-visible transcript capture and held-transcript processing
remain denied. No live target access is permitted without the complete external
authorization packet.

## Handover integrity

The dated package is sealed only when `HANDOVER_MANIFEST.md` matches every
payload byte and `../INDEX.md` records that manifest's exact SHA-256. During
assembly those fields remain explicitly pending. The manifest validates bytes,
not freshness or authority. Publication additionally requires:

```bash
node scripts/verify-youtube-item-recovery-handover.mjs --mode publication
```

Any package byte change invalidates its manifest, cold-reader result, and
adversarial verdict until they are rerun on the exact final bytes.
