# AI Brain: Debugging and incident response (handover — 2026-05-14 lane-collapse)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md](../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** Use this file when something breaks during or after the lane-collapse merge. Start with the **symptom table** (§3) for quick triage, then use **outside-in layers** (§2) for systematic diagnosis. For product-level incidents (Mac stack down, tunnel offline, capture failures), use [`Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md`](../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md) instead — this file is collapse-specific.

## 1. Primary playbooks

| Doc | Use when |
|-----|----------|
| [`07_Deployment_and_Operations.md`](./07_Deployment_and_Operations.md) | Performing the merge — has rollback procedure in §7 |
| [`HANDOVER.md`](./HANDOVER.md) | Executive summary; stash inventory in §2.2 |
| [`05_Project_Retrospective.md`](./05_Project_Retrospective.md) | Recurring patterns including the branch-confusion bug |
| [`Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md`](../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md) | Product-level incidents (post-merge) |
| `RUNNING_LOG.md` | Self-critique sections of recent entries describe similar bugs |

## 2. Outside-in diagnostic layers

| Layer | What fails | Typical signature | First fix |
|-------|-----------|-------------------|-----------|
| **Branch context** | Working on the wrong branch | `git status` shows expected files but `git log` is wrong; merge errors out unexpectedly | `git branch --show-current` — if not the expected branch, `git stash` then `git checkout` |
| **Working tree state** | Dirty tree blocks merge | `git merge` returns "Your local changes to the following files would be overwritten by merge" | `git stash push -m "<descriptive message>"` first; then merge |
| **Stash recovery** | Lost stash content after a drop | `git stash list` no longer shows expected stash | `git fsck --dangling --no-reflogs` — recoverable for ~30 days; cherry-pick the dangling commit SHA |
| **Conflict markers** | Resolution incomplete | Build fails with `<<<<<<<` syntax error in source | `git diff --check` to find unresolved markers; re-resolve with `git checkout --conflict diff3 <file>` |
| **Test suite** | Tests fail post-merge | `npm test` red where it was green | `git bisect start; git bisect bad; git bisect good <pre-merge-SHA>` to find the breaking commit |
| **TypeScript** | Type errors post-merge | `npm run typecheck` errors in untouched files | Likely Lane L added a type that Lane C's plan doc references; check whether plan v1.0 invented an interface that doesn't match real code |
| **APK build** | Capacitor sync fails post-merge | `npm run build:apk` errors on Java/gradle | Lane L's gradle stash may not have applied cleanly; re-apply `stash@{3}` |
| **Lint** | New warnings post-merge | `npm run lint` shows count > baseline | Identify per-file source via `npm run lint -- --quiet`; not blocking unless config has `--max-warnings 0` |

### Pre-merge sanity checks

```bash
# Confirm we're on main
git branch --show-current
# Expected: main

# Confirm main is clean and at expected SHA
git status --short
git log -1 --format=%H

# Confirm both lanes exist on origin
git ls-remote origin lane-c/v0.6.0-cloud
git ls-remote origin lane-l/feature-work

# Confirm stashes still exist
git stash list
# Expected: 4 stashes (or fewer if some were already dropped per HANDOVER.md §2.2)
```

### Post-merge sanity checks

```bash
# Confirm main has both lanes' work
git log --oneline main..lane-c/v0.6.0-cloud   # should be empty (lane-c merged)
git log --oneline main..lane-l/feature-work   # should be empty (lane-l merged)

# Confirm linear --first-parent history is clean
git log --oneline --first-parent main -10

# Confirm the 3 merge-conflicting files are sane
grep "^## " RUNNING_LOG.md  wc -l        # entries from both lanes + 1 collapse entry
head -3 docs/plans/DUAL-AGENT-HANDOFF-PLAN.md   # should show SUPERSEDED note
head -3 docs/plans/LANE-L-BOOTSTRAP.md          # should show SUPERSEDED note
```

## 3. Symptom → quick reference

| Symptom | Likely cause | Pointer |
|---------|-------------|---------|
| `git merge` produces conflicts in source files (not just the 3 markdowns) | Lane L touched files that the v0.6.0 plan claimed it didn't | Re-read [`02_Systems_and_Integrations.md §2.2`](./02_Systems_and_Integrations.md); your `main` may have moved beyond `2a35d74` |
| `npm test` fails on tests that pass on lane-l/feature-work directly | Test config differs in main vs lane-l | Compare `vitest.config.ts` in main vs lane-l |
| Build error: "Cannot find module 'idb'" or similar | Lane L added a dependency; merge didn't pick up `package.json` correctly | `npm install` after merge; if still fails, inspect `package.json` diff |
| APK build fails: "Could not find capacitor.build.gradle" | Lane L stash@{3} not applied | `git stash apply --index stash@{3}`; gradle is regenerated, safe to overwrite |
| `RUNNING_LOG.md` has duplicate entries | Conflict resolution kept both sides | Re-resolve; sort by date heading; preserve append-only |
| `stash@{1}` apply fails with "merge conflict" | Its tracked changes are already in main (committed in c2a71a4); the noise files (`public/offline.html`, `SwiftBar/...`) might conflict | DON'T apply stash@{1}; drop it. Its tracked content is already in main |
| `git push origin main` rejected | Someone pushed to main between your fetch and push | `git fetch && git rebase origin/main`; re-validate; push again |
| `git push origin --delete lane-c/v0.6.0-cloud` rejected | Branch protection on origin | Disable protection in GitHub UI temporarily; or ask user to delete via UI |
| Service worker not registering after merge | Lane L's auth-bypass for `/sw.js` lost in merge | Verify `src/proxy.ts` still has `/sw.js` whitelist; see commit `0c524f8` |
| Anthropic key shows up in commit | Pre-merge guardrail failed | **P0** — rotate key immediately at console.anthropic.com; revoke; do NOT attempt force-push to remove from history; let the rotated state be the new truth |
| Capture API returns 500 after merge | Lane L's outbox modifications conflicted with Phase B+ assumptions in plan | Check `src/lib/queue/enrichment-worker.ts` — Lane L modified +18 lines; if those changes integrate with old Ollama path, all good; if Phase B has begun, see plan §3.1 wrapper integration |

## 4. Logging / observability

During merge troubleshooting, watch for these prefixes:

| Prefix | Component | Use for |
|--------|-----------|---------|
| `[git]` | n/a (your shell) | Git operation output |
| `[npm]`, `[vitest]` | Test runner | Test failures |
| `[next]` | Next.js | Build / compile errors |
| `[capacitor]` | Capacitor sync | APK build failures |

After merge, when running the dev server:

| Prefix | Component | Use for |
|--------|-----------|---------|
| `[sw]` | Service worker | Cache hits/misses; precache failures |
| `[outbox]` | IndexedDB outbox | Queue + retry events |
| `[sync-worker]` | Outbox orchestrator | Sync cycle events |
| `[capture]` | Capture pipeline | Article + YouTube extraction |
| `[enrichment]` | Enrichment queue | Pre-Phase-B Ollama path |

Search logs with:

```bash
# Tail dev server logs filtered by prefix
npm run dev 2>&1 | grep -E "\[(sw|outbox|sync-worker)\]"

# Search for errors
npm run dev 2>&1 | grep -iE "(error|failed|warn)"
```

## 5. Filing new bugs

This project does not maintain a `Bug_Report/` directory. Bug records live in:

1. **Git commits** — descriptive commit messages (e.g., `fix(sw): ignoreVary + ignoreSearch on cache.match (DIAG-3 final-final)`)
2. **Plan self-critiques** — `docs/plans/v0.6.x-*-SELF-CRITIQUE*.md`
3. **`RUNNING_LOG.md`** — self-critique section in every entry

If a merge-related bug surfaces, capture it in the new RUNNING_LOG entry under "Session self-critique" with:

1. **Symptom** — what was observed (`npm test` red, build failure, etc.)
2. **Expected** — what should have happened
3. **Steps to reproduce** — numbered, minimal
4. **Evidence** — log excerpts (NEVER include keys/secrets)
5. **Root cause** (if known) — 5-Whys
6. **Resolution** — what fixed it; commit SHA if applicable

## 6. Branch-confusion incident response

If you discover mid-merge that you were on the wrong branch (this is a recurring pattern — see [`05_Project_Retrospective.md §2`](./05_Project_Retrospective.md)):

1. **Stop. Don't run any more git commands.**
2. Confirm current branch:
   ```bash
   git branch --show-current
   ```
3. Inspect what was committed where:
   ```bash
   git log --all --oneline -10
   ```
4. If you wrote files to the wrong branch BUT didn't commit:
   ```bash
   git stash push -u -m "rescue-from-wrong-branch-<DD>-<MM>-<YYYY>"
   git checkout <correct-branch>
   git stash pop
   ```
5. If you committed to the wrong branch:
   ```bash
   git log -1 --format=%H        # save the wrong-branch commit SHA
   git reset --hard HEAD~1        # remove it from wrong branch (it's still reachable via reflog)
   git checkout <correct-branch>
   git cherry-pick <saved-SHA>   # bring the commit to the correct branch
   ```
6. Append a RUNNING_LOG self-critique entry honestly documenting the incident — the pattern only stops if it's surfaced.

## 7. Related handover files

- [`07_Deployment_and_Operations.md`](./07_Deployment_and_Operations.md) — merge procedure with rollback in §7
- [`05_Project_Retrospective.md`](./05_Project_Retrospective.md) — recurring patterns
- [`HANDOVER.md`](./HANDOVER.md) — executive summary; risk register in §10
- [`Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md`](../Handover_docs_12_05_2026/08_Debugging_and_Incident_Response.md) — product-level debugging (post-merge)
