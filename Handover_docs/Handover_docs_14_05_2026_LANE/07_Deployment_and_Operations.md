# AI Brain: Deployment and operations (handover — 2026-05-14 lane-collapse procedure)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/07_Deployment_and_Operations.md](../Handover_docs_12_05_2026/07_Deployment_and_Operations.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** This file documents the **lane-collapse merge procedure**, not product deployment. Product deploy procedures (Mac, Hetzner cutover, cloudflared, APK build, extension build) live in [`Handover_docs_12_05_2026/07_Deployment_and_Operations.md`](../Handover_docs_12_05_2026/07_Deployment_and_Operations.md) and apply unchanged after the merge. Follow the numbered steps EXACTLY. Replace `<DD>`, `<MM>`, `<YYYY>` with today's date.

> **Guardrail:** Do not delete branches before CI green on `main`. Do not push merged main if any post-merge validation step fails. Surface failures to the user; do not silently fix.

## 1. Pre-merge prerequisites

1. Working tree on `main` is clean:
   ```bash
   git checkout main
   git fetch --all
   git pull origin main         # confirm main is at expected SHA (2a35d74 at handover authorship)
   git status --short            # must return nothing
   ```
2. Baseline test gate green BEFORE merge starts:
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```
   If any of these fail on `main` AT BASELINE, abort. Do NOT start merging; surface to user.
3. Confirm 5 user decisions per [`HANDOVER.md §11`](./HANDOVER.md):
   - Strategy A (sequential, recommended) vs B (octopus)
   - `Handover_docs_11_05_2026/` retain or drop?
   - Anthropic hard cap $5/mo vs $3/mo (informs plan v1.1, not the merge itself)
   - Tag the collapse? (`lane-collapse-<DD>-<MM>-<YYYY>` recommended)
   - Branch deletion: immediate or 7-day grace?

## 2. Merge procedure — Strategy A (recommended)

Sequential merges: Lane C first, then Lane L.

### 2.1 Merge Lane C into main

1. Run the merge:
   ```bash
   git merge --no-ff lane-c/v0.6.0-cloud \
     -m "merge(lane-c): v0.6.0 cloud migration Phase A + plan v1.0 + research + handover"
   ```
2. Expect zero conflicts (Lane C only touched docs not in main).
3. If a conflict appears, abort:
   ```bash
   git merge --abort
   ```
   and surface the conflict to the user — it indicates `main` moved between handover authorship and merge.
4. Validate after merge:
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```
5. Inspect commit history:
   ```bash
   git log --oneline -10
   git log --oneline --first-parent -10
   ```
6. If validation fails, revert the merge:
   ```bash
   git reset --hard HEAD~1
   ```
   and surface to user.

### 2.2 Merge Lane L into main

1. Run the merge:
   ```bash
   git merge --no-ff lane-l/feature-work
   ```
2. Expect 3 conflicts on these files only:
   - `RUNNING_LOG.md`
   - `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`
   - `docs/plans/LANE-L-BOOTSTRAP.md`
3. Resolve each per §3 below.
4. Continue the merge:
   ```bash
   git add RUNNING_LOG.md docs/plans/DUAL-AGENT-HANDOFF-PLAN.md docs/plans/LANE-L-BOOTSTRAP.md
   git merge --continue
   ```
5. Validate:
   ```bash
   npm test                # full suite must pass
   npm run typecheck
   npm run lint
   npm run build           # production build must succeed
   npm run build:apk       # APK build must succeed (Lane L's domain)
   ```
6. If any validation fails, revert:
   ```bash
   git reset --hard ORIG_HEAD
   ```
   and surface to user with the failing output.

### 2.3 Apply Lane L's stashed migration + gradle

1. Inspect `stash@{3}` first:
   ```bash
   git stash show -u stash@{3} --stat
   ```
2. Apply with `--index` to preserve staging:
   ```bash
   git stash apply --index stash@{3}
   ```
3. Resolve gradle conflicts if any (gradle is regenerated, can be overwritten with the stashed version safely).
4. Inspect `Handover_docs/Handover_docs_11_05_2026/` — likely stale; ask user before retaining.
5. Stage Lane L's WIP:
   ```bash
   git add android/app/capacitor.build.gradle \
           android/capacitor.settings.gradle \
           src/db/migrations/009_edges.sql
   # Handover_docs_11_05_2026/ — only add if user confirmed retention
   ```
6. Commit:
   ```bash
   git commit -m "chore(lane-collapse): restore Lane L stashed WIP — gradle + 009 edges migration"
   ```
7. Re-validate:
   ```bash
   npm run typecheck   # 009 migration shouldn't break TS but verify
   npm test
   ```

### 2.4 Push merged main + tag

1. Push:
   ```bash
   git push origin main
   ```
2. Wait for CI green (if CI configured) or run local validation again.
3. If user confirmed tagging:
   ```bash
   git tag -a lane-collapse-<DD>-<MM>-<YYYY> \
     -m "Lane C + Lane L merged into main; single-stream resumed"
   git push origin lane-collapse-<DD>-<MM>-<YYYY>
   ```

### 2.5 Delete lane branches (after CI green + grace period if requested)

If user confirmed immediate deletion:

1. Delete local branches:
   ```bash
   git branch -d lane-c/v0.6.0-cloud
   git branch -d lane-l/feature-work
   ```
   `git branch -d` refuses to delete unmerged branches — if it errors, the merge is incomplete; investigate.
2. Delete remote branches:
   ```bash
   git push origin --delete lane-c/v0.6.0-cloud
   git push origin --delete lane-l/feature-work
   ```

If user requested 7-day grace: skip this step. Schedule reminder for 2026-05-21.

### 2.6 Drop processed stashes

After confirming merged main has the expected content:

1. Drop redundant stashes:
   ```bash
   git stash drop stash@{2}   # duplicate of {0}
   git stash drop stash@{1}   # contents in c2a71a4 except 2 noise files
   ```
2. Confirm `stash@{0}` and `stash@{3}` are still present:
   ```bash
   git stash list
   ```
3. `stash@{0}` (gradle) and `stash@{3}` (gradle + edges + 11_05 handover) — drop after their tracked content is confirmed in committed state:
   ```bash
   git stash drop stash@{0}
   git stash drop stash@{3}
   ```

## 3. Conflict resolution rules — exact procedure

### 3.1 `RUNNING_LOG.md` (append-only journal)

Both lanes appended their own entries. Lane C added 3 (`2026-05-12 10:55`, `2026-05-14 18:11`, `2026-05-14 21:05`). Lane L added entries from `2026-05-12 13:55` through `2026-05-13 21:17`.

Resolution algorithm:

1. Open the file in your editor; you'll see Git conflict markers near the bottom.
2. Read the entries on each side of the markers (Lane C side ends with `21:05`; Lane L side ends with `2026-05-13 21:17`).
3. Sort all entries chronologically by their `## YYYY-MM-DD HH:MM` heading. Earliest first.
4. Reconstruct the file with all entries in chronological order. **No entries are deleted** — the append-only invariant is preserved.
5. After resolution, append ONE final entry:
   ```markdown
   ---

   ## <YYYY-MM-DD HH:MM> — Lane collapse merge complete

   **Entry author:** AI agent (Claude or successor) — single-lane mode resumed
   **Triggered by:** lane-collapse merge per Handover_docs_14_05_2026_LANE

   ### Done
   - Merged lane-c/v0.6.0-cloud (4 commits) into main via merge commit <SHA>
   - Merged lane-l/feature-work (51 commits) into main via merge commit <SHA>
   - Resolved 3 markdown conflicts: RUNNING_LOG.md (chronological interleave), DUAL-AGENT-HANDOFF-PLAN.md (Lane C version + SUPERSEDED note), LANE-L-BOOTSTRAP.md (same)
   - Applied stash@{3} for 009_edges.sql migration + android gradle
   - Dropped stash@{0}, stash@{1}, stash@{2}, stash@{3}
   - Tagged lane-collapse-<DD>-<MM>-<YYYY>
   - Deleted lane-c/v0.6.0-cloud and lane-l/feature-work (local + origin) <or "preserved for 7-day grace until YYYY-MM-DD">

   ### State snapshot
   - **Branch:** main @ <merged-SHA>
   - **Phase:** v0.6.0 cloud migration → Stage 4 review of plan v1.0
   - **Next milestone:** plan v1.1 locked → Phase B-1 begins
   ```
6. Validate count:
   ```bash
   grep "^## " RUNNING_LOG.md  wc -l
   ```
   Should equal: (entries in lane-c at `c2a71a4` = 32) + (entries in lane-l at `c944387` = N) − (overlap before split = 28) + 1 (this final entry).

### 3.2 `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`

Lane C is the canonical author; Lane L modified later.

1. Pick Lane C's version (or merge Lane L's edits if they're additive — read both):
   ```bash
   git checkout --theirs docs/plans/DUAL-AGENT-HANDOFF-PLAN.md   # if Lane L = "theirs"
   # OR
   git checkout --ours docs/plans/DUAL-AGENT-HANDOFF-PLAN.md     # if Lane C = "ours"
   ```
   (Which is "ours" vs "theirs" depends on which lane you merged from. Inspect.)
2. Add SUPERSEDED note at the top (after any existing frontmatter):
   ```markdown
   > **STATUS: SUPERSEDED <YYYY-MM-DD>.** This document governed dual-lane work from 2026-05-12 to <YYYY-MM-DD>. Lane C and Lane L have been merged back to `main`. See [Handover_docs_14_05_2026_LANE/HANDOVER.md](../../Handover_docs/Handover_docs_14_05_2026_LANE/HANDOVER.md) for the collapse mechanics. Work now resumes in single-lane mode on `main`.
   ```

### 3.3 `docs/plans/LANE-L-BOOTSTRAP.md`

Same treatment as 3.2 — prefer Lane C version, add SUPERSEDED note.

## 4. Smoke checks (post-merge)

### 4.1 Server boot

```bash
npm run dev
# Expected: Next.js server boots clean on :3000
# Expected: console shows no [Error] or [Failed to compile] entries
```

### 4.2 API health

```bash
curl -s http://localhost:3000/api/health
# Expected: 200 OK with JSON status
```

### 4.3 Authenticated endpoint

```bash
curl -s http://localhost:3000/api/items \
  -H "Authorization: Bearer <BRAIN_BEARER_TOKEN from .env.local>"
# Expected: 200 OK with items array
```

### 4.4 Service worker registers

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sw.js
# Expected: 200 (Lane L's auth-bypass for /sw.js works)
```

### 4.5 Inbox page renders

Manual:
1. Browse `http://localhost:3000/inbox`
2. Expected: page renders, nav-bar shows badge

### 4.6 APK build

```bash
npm run build:apk
# Expected: APK artifact appears under android/app/build/outputs/apk/
```

## 5. Post-merge validation checklist

All 12 must check before `git push origin main` (or before tagging if push already happened):

- [ ] `git status` clean
- [ ] `npm test` green; record count vs pre-merge baseline
- [ ] `npm run typecheck` zero errors
- [ ] `npm run lint` zero new warnings
- [ ] `npm run build` succeeds
- [ ] `npm run build:apk` succeeds
- [ ] `npm run dev` boots; `/api/health` returns 200
- [ ] `/inbox` renders; `/settings/lan-info` renders
- [ ] `git log --oneline --first-parent main` shows clean linear history with merge commits
- [ ] `RUNNING_LOG.md` entries from both lanes preserved + new lane-collapse entry appended
- [ ] `STATE.md` OWNERSHIP block updated (single lane, `main` canonical)
- [ ] `ROADMAP_TRACKER.md` updated (v0.5.6 ✅, v0.6.0 Phase A ✅, Phase B–F pending)

## 6. Common merge mistakes

| Severity | Mistake | Recovery |
|----------|---------|----------|
| **P0** | Merging from wrong branch (e.g., from `lane-c` instead of `main`) | `git reset --hard ORIG_HEAD` immediately; restart from §1 step 1; the branch-confusion bug has failed twice — verify branch first |
| **P0** | `git stash drop` before confirming content is in committed state | Recover via `git fsck --dangling`; commits stay reachable for ~30 days; if found, cherry-pick from dangling commit SHA |
| **P0** | Force-pushing to origin after a partial merge | Don't. Use `git reset --hard ORIG_HEAD` locally; do NOT push until the merge is clean. If already pushed, revert via a new commit, not force-push |
| **P1** | Resolving `RUNNING_LOG.md` by deleting older entries instead of interleaving | Per the append-only rule: never delete entries. Re-resolve from `git checkout --conflict diff3 RUNNING_LOG.md` |
| **P1** | Applying `stash@{1}` (`lane-c session leftovers`) after the merge | Don't — its tracked changes are already in `c2a71a4`. Only `stash@{3}` should be applied |
| **P1** | Dropping `lane-c/v0.6.0-cloud` or `lane-l/feature-work` before CI green | If commits are reachable from `main` (they should be after merge), no data loss. But verify `git log` first |
| **P2** | Forgetting to update `STATE.md` OWNERSHIP block | Edit + commit; not blocking |
| **P2** | Forgetting to mark `project_ai_brain_dual_lane.md` memory entry as superseded | Add a NEW memory entry; don't delete the old one |

## 7. Rollback (if validation fails after merge but before push)

1. Reset main to pre-merge state:
   ```bash
   git reset --hard 2a35d74        # the SHA main was at before any merge
   ```
2. Verify branches `lane-c/v0.6.0-cloud` and `lane-l/feature-work` are still intact:
   ```bash
   git log --oneline lane-c/v0.6.0-cloud -3
   git log --oneline lane-l/feature-work -3
   ```
3. Surface failure to the user with full validation output (test failures, typecheck errors, build errors).
4. Do NOT attempt the merge again until the user has reviewed the failure and decided how to proceed. The dual-lane state is recoverable; a botched merge pushed to origin is not.

## 8. Post-merge product deploy procedures (unchanged from baseline)

Refer to:
- [`Handover_docs_12_05_2026/07_Deployment_and_Operations.md`](../Handover_docs_12_05_2026/07_Deployment_and_Operations.md) — Mac dev mode, APK build, extension publishing, cloudflared launchd
- [`docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md`](../../docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md) — Hetzner cutover (Phase D of v0.6.0 plan)

These apply unchanged after the lane collapse.
