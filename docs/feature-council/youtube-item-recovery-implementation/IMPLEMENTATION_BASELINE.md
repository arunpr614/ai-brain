# YouTube Item Recovery Implementation Baseline

**Frozen:** 2026-07-23 (Asia/Kolkata)
**Repository:** `https://github.com/arunpr614/ai-brain.git`
**Project worktree:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4`
**Branch:** `feat/youtube-item-recovery-enrichment`
**Base commit:** `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`
**Status:** source baseline frozen; implementation and enablement gates remain open

## Baseline decision

Use protected `origin/main@f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` as the sole implementation base. It contains the fully reconciled and merged planning stack:

- PR #41, final generic YouTube DOM-capture PRD and implementation plan;
- PR #42, exact-item recovery Product Council decision and prototype;
- PR #48, final held-transcript manual-enrichment PRD, UX, plan, traceability, and reviews; and
- PR #50, final post-planning Chrome-companion verification and adversarial review.

Do not cherry-pick or merge the planning worktrees wholesale. Their authoritative files are already present on `main`. Preserve their historical worktrees as immutable evidence unless a separate cleanup decision is made.

## Repository and worktree evidence

| Field | Frozen value |
|---|---|
| Remote | `https://github.com/arunpr614/ai-brain.git` |
| Protected GitHub `main` | `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` |
| Worktree branch | `feat/youtube-item-recovery-enrichment` |
| Worktree HEAD | `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` |
| Upstream | `origin/main` |
| Shared Git directory | `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-git-main/.git` |
| Registered worktrees at reconciliation | 19, including one prunable disposable `/private/tmp` entry; none was pruned or changed |
| Tracked source state at freeze | Clean; intentional implementation-artifact Markdown files are the only new work in this folder |

Notable evidence checkouts were preserved:

| Checkout | Reconciled head at inspection | State | Treatment |
|---|---|---|---|
| `.../ai-brain-worktrees/youtube-dom-capture-prd-v2` | `cbaed78e879a84adcd3a5acbc489bd3ae82bb3b8` | Clean but historical | Evidence only; reviewed #42 head later moved and merged without contract-tree drift |
| `.../ai-brain-worktrees/youtube-item-recovery-enrichment-plan` | `63effafc2c7601dc5ba52df7f0f96fb5af79ae3f` | Clean but historical | Evidence pin; final #48 restack was byte-identical in the plan directory |
| `.../ai-brain-worktrees/youtube-chrome-companion-research-refresh` | `b4f2a961160e44103cc8af909be7977d3e1138be` | Clean but historical | Evidence pin; final #50 restack was byte-identical in the research directory |
| Shared primary checkout on `codex/note-focus-final` | `3ab7571f4931b573975560b81461e00268c1d165` | Five unrelated dirty entries at inspection | Do not use or modify for this feature |
| Separate `Documents/ArunVault2026-2/.../ai-brain-git-main` checkout | `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` | Clean but stale | Do not use as source authority |

## Source precedence applied

1. `main@f905f6a1` is current repository truth.
2. The merged states of #41, #42, #48, and #50 are next.
3. There are no remaining open dependent PR heads in this planning stack.
4. The V2 verification addendum, V2 plans, V2 UX, and adversarial reviews supply requirements and safety constraints where current code has not implemented them.
5. V1 and historical prototypes remain provenance only.

See [source inventory](SOURCE_INVENTORY.md), [source reconciliation](SOURCE_RECONCILIATION.md), [dependency graph](DEPENDENCY_GRAPH.md), and [migration collision resolution](MIGRATION_COLLISION_RESOLUTION.md).

## Merged source lineage

| Source | Artifact pin | Final merged head | Merge commit | Resolution |
|---|---|---|---|---|
| PR #41 | `c000d7c4891` / `8bfe5274c9c` | `8bfe5274c9c` | `ea801efa0249` | Final DOM plan present unchanged on main |
| PR #42 | verification pin `c22b5aa80bf7` | `35700f7b469f` | `508d9f2c1552` | Merge-only drift; complete DOM plan/prototype tree identical |
| PR #48 | verification pin `63effafc2c76` | `42ad65708548` | `bf08e3a3500c` | Merge-only restack; complete manual plan tree identical |
| PR #50 | local reviewed `b4f2a961160e` | `9f437f24c255` | `f905f6a1ef69` | Merge-only update; complete research tree identical |

This table replaces the historical “open PR” status recorded inside the dated verification artifact. The artifact's reviewed content remains valid; its mutable GitHub status text is not current.

## Current migration and release-tool baseline

| Fact | Frozen value |
|---|---|
| SQL migration files | 28 |
| Highest prefix | `026` |
| Current frontier | `026_notebooklm_export.sql` |
| 026 Git blob | `84d96b2cc5a5f442f8f5931915d6bb7908f6fda4` |
| 026 SHA-256 | `1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f` |
| Existing duplicate prefixes | Grandfathered `017` and `018` groups only |
| Next safe nominal sequence | `027_youtube_browser_transcript.sql`, `028_manual_transcript_enrichment_expand.sql`, later `029_manual_transcript_enrichment_contract.sql` |
| Current audited rollback allowlist | 025 and 026 only; no 027 rule |

The full filename/hash/schema-effect inventory and compatibility matrix are in [MIGRATION_COLLISION_RESOLUTION.md](MIGRATION_COLLISION_RESOLUTION.md). The migration tree is identical on final main and the final #42/#48/#50 heads. PR #41's historical head lacks 026 only because it predates NotebookLM export.

## Current implementation truth

The merged stack is planning, prototype, verification, and documentation. It is not evidence that the requested browser capture or manual-enrichment implementation exists.

The current code baseline does contain:

- the existing Manifest V3 Brain Chrome companion;
- existing item, transcript recovery, policy/source, segment, enrichment, embedding, Recall, workflow, and NotebookLM data paths;
- an auto-applying, hash-enforcing SQLite migration runner;
- release tooling that blocks unknown migration-ledger entries unless an exact audited rollback exception applies; and
- existing production application, extension, CI, release, backup, and worker infrastructure that must remain compatible.

Before implementation claims current behavior, re-audit the code paths named by the final current-state audit and their current successors. At minimum this includes:

```text
src/db/client.ts
src/instrumentation.ts
src/lib/repair/item-repair.ts
src/lib/capture/transcripts/**
src/app/api/items/[id]/enrich/route.ts
src/app/api/items/[id]/enrichment-status/route.ts
src/lib/queue/enrichment-worker.ts
src/lib/queue/enrichment-batch.ts
src/lib/enrich/pipeline.ts
src/lib/embed/pipeline.ts
src/lib/items/status.ts
src/lib/retrieve/index.ts
src/lib/related/index.ts
src/app/api/ask/route.ts
src/lib/ask/generator.ts
src/lib/processing/http.ts
extension/manifest.json
extension/src/**
scripts/check-release-migration-compatibility.mjs
scripts/activate-release.sh
```

This is the current audit scope, not authorization to change every listed file. The exact affected-file inventory must be frozen per implementation PR before concurrent edits begin.

## Non-negotiable baseline invariants

### Production

- Browser-visible transcript capture remains denied in production code/configuration.
- Held browser-transcript manual enrichment remains denied in production code/configuration.
- Production browser routes are absent or reject before body processing.
- Shared workers do not claim held or unauthorized content.
- No captured transcript reaches a production provider, database, log, analytics event, or browser store.
- Inactive actions are not presented as working features.
- Link-only, if independently released, remains metadata-only and truthfully labeled.

### Browser companion

- Extend the existing extension; create no second extension.
- Use temporary `activeTab`, top-frame isolated execution, and no persistent YouTube host permission or static YouTube content script.
- Read nothing until explicit Inspect; transfer nothing until explicit Add/Confirm.
- Read only the visible selected transcript and bounded metadata.
- Do not access cookies, page/browser storage, Google account data, player responses, signed URLs, authorization material, audio, or ASR.
- The page never chooses the Brain destination or receives Brain authority.
- Transcript text is not persisted in extension storage, page DOM, URLs, logs, or diagnostics.

### Server and data

- Bind authority to exact user, item, item revision, canonical video, extension, and contract version.
- Recompute normalization, hashes, source classification, and policy on the server.
- Commit attachment, active source, ordered segments, receipt, revision, hold, recovery resolution, and derived reset atomically.
- Fence every body-derived asynchronous writer with current revision and claim identity.
- Preserve one active transcript source per item and legitimate repeated cues.
- Keep browser transcripts held until a distinct exact-revision processing authorization succeeds.
- Preserve deletion, retention, response-loss reconciliation, provider drift, and stale-result rejection.

### Release authority

| Capability | Baseline authority |
|---|---|
| Source reconciliation and fixture-only implementation | Authorized |
| Production-safe containment/foundations | Authorized after tests and review |
| Production-safe link-only | Conditionally authorized only after frozen/reviewed 027 recovery exclusions and its independent gates |
| Packaged local extension against synthetic fixtures | Conditionally authorized after manifest/lifecycle review |
| Isolated live lab canary | Blocked until all external, environment, target, retention, and cleanup gates pass |
| Production browser-visible transcript capture | Not authorized |
| Production held-transcript manual enrichment | Not authorized |

## Contract freeze status

The source reconciliation lists candidate browser and manual-enrichment contract identifiers. They are not implementation truth yet.

Three corrected material contracts passed the focused Stage 0 recheck as candidate contracts, but remain unimplemented and gated by their dependent stages:

1. **Side-panel/auth handoff:** D-008 freezes a service-worker-authorized body transfer with separately named HTTPS destination origin, `chrome-extension://` requester Origin/CORS, and HTTPS Brain-page `externally_connectable` handoff origin; transcript stays in panel memory and the upload grant is a secret capability.
2. **Provider and authorization identities:** D-009 freezes the V2 wire schema, V1 provider-plan-entry fingerprint domain, V1 authorization-input domain, and V1 authorization-context domain as four separate constants/tuples.
3. **Note hold scope:** D-015 blocks source/body processing without silently overriding a separately authorized note; recovery notes remain AI-off and manual-lab mode starts no note worker.

D-014 separately limits any pre-027 work to non-enabling schema-026 containment. D-016 requires exact migration-ledger SHA plus full shape attestation before a schema can be treated as ready.

The migration filename/hash/schema is a third hard freeze described in the collision-resolution record.

## Verification evidence inherited by this baseline

| Evidence | Result | What it proves |
|---|---|---|
| PR #41 `verify` | Success | Planning package passed repository CI at its merged head |
| PR #42 Product CI `29974716749` | Success; packaging skipped | Restacked exact-item prototype passed static, extension, product, docs, build, and release-tool checks |
| PR #48 Product CI `29974916378` | Success in 3m15s; packaging skipped | Restacked manual package passed the same current-main checks |
| PR #50 Product CI `29975095549` | Success in 2m51s; packaging skipped | Restacked verification package passed the same current-main checks |
| Contract-tree comparisons | Identical | Mutable-head updates did not alter the reviewed #42/#48/#50 artifact trees |
| Migration-tree comparisons | Identical | Planning/verification restacks introduced no migration drift |

These checks verify the merged planning baseline. They do not prove the future 027 migration, browser extractor, package E2E, manual-enrichment workers, lab canary, deployment, or production-negative runtime behavior.

The CI runs also emitted a non-failing GitHub Actions notice that Node.js 20 actions are being forced onto Node.js 24. Track it as release-tool maintenance; it is not evidence against this baseline.

## Stage-0 gate status

| Gate | Status | Evidence or next action |
|---|---|---|
| Supplied-source inventory and duplicate hashing | Complete | `SOURCE_INVENTORY.md` and hash manifest |
| PR state/head/base/check/file reconciliation | Complete | `DEPENDENCY_GRAPH.md` |
| #48 stacked-parent resolution | Complete | #42 then #48 merged on current main |
| Verification PR integration | Complete | #50 merged as `f905f6a1` |
| Migration-number collision decision | Complete | Nominal 027/028/029 with shift rule |
| Initial Stage 0 adversarial review | Historical NO-GO; remediated | `YOUTUBE_ITEM_RECOVERY_STAGE_0_ADVERSARIAL_REVIEW_2026-07-23_08-42-46_IST.md`; the later focused recheck closed every P0/P1 finding |
| Actual 027 hash/schema/test freeze | Not complete; hard blocker | Implement, rehearse, and independently review |
| Current-code behavior re-audit | Complete for Stage 0 | `implementation/CALLER_CONTAINMENT_INVENTORY.md` records writers, claimants, status, deletion, startup, scripts, and extension/link-only addendum evidence |
| Contract version/handoff freeze | Focused recheck passed; implementation pending | D-008 three-origin/secret-grant addendum, D-009 four domains, D-015 note scope |
| P0 code/test traceability | Stage 0 allocation complete | 65 unique rows name source/code/test/evidence; every status remains Planned and evidence says not executed |
| Focused Stage 0 recheck | Conditional GO for D-014 only | `YOUTUBE_ITEM_RECOVERY_STAGE_0_FOCUSED_RECHECK_ADVERSARIAL_REVIEW_2026-07-23_09-05-27_IST.md`; no P0/P1 findings remain |
| Production feature enablement | Explicit no-go | Requires later separate authority |

## Exact evidence commands and frozen results

```bash
PROJECT='/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4'

git -C "$PROJECT" remote get-url origin
# https://github.com/arunpr614/ai-brain.git

git -C "$PROJECT" branch --show-current
# feat/youtube-item-recovery-enrichment

git -C "$PROJECT" rev-parse HEAD
# f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8

git -C "$PROJECT" rev-parse origin/main
# f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8

git -C "$PROJECT" diff --quiet
git -C "$PROJECT" diff --cached --quiet
# both zero at the tracked-source freeze

gh api repos/arunpr614/ai-brain/branches/main \
  --jq '{name,sha:.commit.sha,protected}'
# {"name":"main","protected":true,"sha":"f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8"}

for pr_number in 41 42 48 50; do
  gh pr view "$pr_number" --repo arunpr614/ai-brain \
    --json number,state,baseRefOid,headRefOid,mergeCommit,mergedAt,statusCheckRollup
done

git -C "$PROJECT" worktree list --porcelain
# 19 registered entries at reconciliation; one disposable prunable entry was left untouched
```

## Next safe actions

1. Use the frozen caller inventory and D-014 scope to implement production-safe containment against schema 026 and prove ordinary workflows unchanged.
2. Propagate D-016 ledger-plus-shape attestation into code/tests before any schema can report `ready`.
3. Re-run the migration frontier scan immediately before creating 027.
4. Implement 027, freeze its hash/schema, run the full binary/schema matrix, and obtain an independent migration adversarial review.
5. Continue fixture-only implementation in the approved sequence; do not skip to live YouTube.

If any baseline SHA, pending migration, or non-negotiable safety decision changes, stop the affected slice and update these records before continuing.
