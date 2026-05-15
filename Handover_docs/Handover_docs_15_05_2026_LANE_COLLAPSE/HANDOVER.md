---
name: AI Brain — Lane-Collapse Handover (final)
description: Single-file handover for the new Claude Code session. Concludes the dual-lane (Lane C + Lane L) phase and instructs how to merge both into a single work stream on `main`.
date: 2026-05-15 14:10 IST
authored_by: Claude (Opus 4.7) on `lane-l/feature-work` @ HEAD `c40d074`
audience: The next AI agent (any model) taking over both work streams as one
supersedes: Handover_docs/Handover_docs_14_05_2026_LANE/ (still valid as deeper drill-down; this doc is the authoritative starting point)
status: ACTIVE — read end-to-end before touching the repo
---

# AI Brain — Lane-Collapse Handover (2026-05-15)

> **Read this top-to-bottom once.** It is intentionally self-contained. The 10-file package at `Handover_docs/Handover_docs_14_05_2026_LANE/` is the deeper reference for branch topology, secrets, and merge mechanics — load it only when this doc points you there.

---

## 1. TL;DR

The user has decided to **end the dual-lane experiment**. From this session forward, work resumes as a **single stream on `main`**. Your job, in order:

1. Land both lanes back into `main`. Lane C contributes 7 commits (mostly docs + 1 Hetzner migration plan); Lane L contributes 52 commits (v0.5.5 + v0.5.6 ship). They do **not** touch the same code files — only 3 markdown files conflict.
2. Resolve the 3 markdown conflicts using the rules in §6.
3. Apply / drop the 4 stashes per the rules in §7.
4. Verify the merged tree builds + tests pass + the APK still runs offline.
5. Tag `v0.5.6` (it is implementation-complete on Lane L but never tagged).
6. Delete `lane-c/v0.6.0-cloud` and `lane-l/feature-work` on origin and locally.
7. Resume work on `main`. The next user-facing scope item is **v0.6.0 cloud migration Phase B** — but read §10 first; the user may pick a different next track.

The **whole merge is mechanically simple** (no overlapping code) — what matters is following the order, not skipping the verification steps, and keeping the user's testing rhythm intact.

---

## 2. Context — why two lanes existed and why we're stopping

The dual-lane setup was introduced on **2026-05-12** to let two parallel concerns proceed without blocking each other:

- **Lane C** (`lane-c/v0.6.0-cloud`, owned by a Sonnet 4.6 session) — research + plan for the v0.6.0 cloud migration. Hetzner CX23 server hardening, 9 research spikes, the migration plan, an OpenRouter evaluation, and the lane-collapse handover package. **No application code changes.** All Markdown + research artifacts.
- **Lane L** (`lane-l/feature-work`, owned by this session) — local feature shipping. v0.5.5 offline-mode (outbox + IndexedDB + share-handler), v0.5.6 service-worker app shell (offline cold-launch), Graph v2.1 / AB plans, Chrome extension polish, APK fixes. **All product code work.**

The split worked: zero overlapping code commits, zero force-pushes between lanes, one branch-tangle near-miss (recovered cleanly — see §11). But **the cost of context-switching between two AI agents on two branches is now higher than the parallelism benefit**, especially because the v0.6.0 cloud migration Phase B (Lane C's next step) directly touches application code (database client, auth, deploy) that Lane L is also modifying. Rather than negotiate that boundary, the user wants one agent + one branch.

**Lane L tiered rule** (commit `48967cd` from earlier): patch bumps were always allowed on either lane without cross-lane signoff. That rule still applies through the collapse — `v0.5.6` can be tagged before the merge if you prefer (recommended order is in §8).

---

## 3. Repo state at handover (2026-05-15 14:10 IST)

### 3.1. Branches

| Branch | HEAD | Position vs `main` | Pushed to origin? | Notes |
|---|---|---|---|---|
| `main` | `2a35d74` | — | yes | Untouched since 2026-05-12 |
| `lane-c/v0.6.0-cloud` | `829cb4a` | +7 commits | yes | Last commit is the prior 10-file handover package |
| `lane-l/feature-work` | `c40d074` | +52 commits | yes | This session's v0.5.6 SW work landed here |

Merge base for both lanes is `2a35d74` (current `main`). Both branches share exactly that commit as their last common ancestor.

### 3.2. What's new since the prior handover (`Handover_docs_14_05_2026_LANE/`)

The Lane C package at `Handover_docs_14_05_2026_LANE/` was authored on 2026-05-14 22:30 IST. **Two Lane L commits + one verification milestone have landed since then:**

| New since 14 May handover | Commit | Effect |
|---|---|---|
| `0aa9972` `fix(sw): split match opts — strict for static, relaxed for pages (DIAG-3 fix #2)` | Lane L | Bumped service-worker cache from `brain-*-v1` → `brain-*-v2`. Fixed APK black-screen caused by `ignoreSearch` returning wrong static chunks. |
| `c40d074` `fix(sw): RSC normalization (DIAG-3 fix #3 — v3 cache)` | Lane L | Bumped cache `v2` → `v3`. Added `isRscRequest()` detection + `strippedKey()` normalization. Fixed Library-double-tap rendering raw RSC payload as text. |
| **2026-05-15 13:36** Redmi Note 7S verification | (not a commit — empirical) | Offline cold-launch confirmed on a second physical device (Pixel 7 Pro was the first). Bucket A green on both. |

**Implication for the merge:** the prior handover's diff stats and stash list are still substantively correct, but `lane-l/feature-work` is at `c40d074` (not `c944387` as the prior package states). Re-run `git rev-list --count origin/main..origin/lane-l/feature-work` to confirm — should be `52`.

### 3.3. Stashes (4 total — all preserved as of today)

```
stash@{0}: On lane-l/feature-work: lane-l-WIP-android-gradle-3
stash@{1}: On lane-c/v0.6.0-cloud: lane-c session leftovers
stash@{2}: On lane-l/feature-work: lane-l-WIP-android-gradle-2
stash@{3}: On lane-l/feature-work: lane-l-WIP-edges-and-android
```

Disposition rules in §7. Do not pop until the rules say so.

### 3.4. Uncommitted on `lane-l/feature-work` HEAD right now

```
 M RUNNING_LOG.md                              ← updated at end of this session (entry #30)
 M android/app/capacitor.build.gradle          ← Capacitor regenerated; same as stashes
 M android/capacitor.settings.gradle           ← Capacitor regenerated; same as stashes
```

`RUNNING_LOG.md` should be **committed before merging** so the v0.5.6 ship narrative is in `main`'s history. The two Capacitor gradle files are the same auto-regenerated changes that appear in `stash@{0}` and `stash@{2}` — see §7.1 for handling.

### 3.5. Files touched by each lane (no functional overlap)

**Lane C** changed only:
- `Handover_docs/**`
- `docs/plans/v0.6.0-cloud-migration.md` (new) and the 9 spike briefs under `docs/plans/spikes/v0.6.0-cloud-migration/`
- `docs/research/openrouter-evaluation.md` (new)
- `RUNNING_LOG.md` (one entry added on 14 May)
- `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` (the lane-split contract — touched by both)
- `docs/plans/LANE-L-BOOTSTRAP.md` (touched by both)

**Lane L** changed everything else: `public/sw.js`, `src/lib/client/register-sw.ts`, `src/proxy.ts`, `next.config.ts`, `public/offline.html`, the entire `src/lib/outbox/` tree, IndexedDB schema, share-handler, Chrome extension v2.x, APK plans, Graph v2.1 plan, AB plan, `RUNNING_LOG.md` (entries 22–30), and the prior `Handover_docs_13_05_2026/` package.

**The only files both lanes touch are 3 markdown files**: `RUNNING_LOG.md`, `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`, `docs/plans/LANE-L-BOOTSTRAP.md`. These are your conflict surface. See §6 for resolution rules.

---

## 4. Mental model the new agent must adopt

Internalise these before touching anything:

1. **One repo, one user, one mental model from now on.** Stop thinking in lanes. After the merge, `main` is the only branch that matters. Patch ships go to `main`. Feature work goes to `main`. No new long-lived branches without explicit user approval.
2. **Lane C produced no application code.** All Lane C work is documentation + research + the Hetzner server (which lives outside the repo on a Hetzner CX23 in Helsinki — see §3 of `Handover_docs_14_05_2026_LANE/03_Secrets_and_Configuration.md` for SSH key paths and connection details). Treat Lane C's contribution as "the v0.6.0 plan + a prepared server, ready for Phase B implementation."
3. **Lane L is the live product.** The currently running APK on the user's Redmi Note 7S and Pixel 7 Pro is built from Lane L. Anything that breaks the offline cold-launch path in `public/sw.js` is a regression visible to the user immediately.
4. **The user is non-technical.** From auto-memory `user_non_technical_full_ai_assist`: write all code yourself, explain in plain language, lead with user-visible outcome. Don't ask the user to run `git rebase --interactive` or read a stack trace — solve those yourself.
5. **Empirical evidence first for UI / WebView / APK / extension bugs** (auto-memory `feedback_empirical_evidence_first`). DevTools or `chrome://inspect` evidence beats server logs every time.
6. **Personal GitHub only** (`arunpr614`, NOT the work account). Auto-memory `feedback_never_use_work_github`. Repo is `arunpr614/ai-brain` (public).
7. **Test on localhost first, not prod** (auto-memory `feedback_test_localhost_not_prod`). Use `npm run dev:lan` for mobile testing. Do not deploy unfinished work to the Vercel-hosted `brain.arunp.in` Cloudflare Tunnel.

---

## 5. The merge plan (recommended path: Strategy A)

The prior handover documents two strategies (A: sequential merges, B: octopus). **Strategy A is correct.** Reason: Lane C is small (7 commits, all docs) and clean — landing it first keeps `main` linear and lets you verify Lane L's much larger merge against a known-good `main`.

### 5.1. Pre-merge hygiene

Run these before opening any merge:

```bash
# from the project root
git fetch --all --prune
git status                              # expect: 1M RUNNING_LOG.md + 2M gradle files
git -C . stash list                     # expect: 4 stashes per §3.3

# Commit RUNNING_LOG.md on lane-l/feature-work first (see §5.2)
# Then proceed.
```

### 5.2. Step-by-step merge

```bash
# 1. Land the trailing RUNNING_LOG.md update on lane-l before merging.
git switch lane-l/feature-work
git add RUNNING_LOG.md
git commit -m "docs(running-log): entry #30 — v0.5.6 SW shipped + Redmi verified"
# DO NOT add the gradle files yet — they go via the stash workflow in §7.1.
git push origin lane-l/feature-work

# 2. Update local main to match origin.
git switch main
git pull --ff-only origin main

# 3. Merge Lane C into main (no-ff to keep the lane-collapse story visible in history).
git merge --no-ff lane-c/v0.6.0-cloud -m "merge(lane-c): collapse Lane C — v0.6.0 cloud-migration plan + Hetzner Phase A + handover package"
# Expect: zero conflicts (Lane C touched files Lane L did not).

# 4. Merge Lane L into main.
git merge --no-ff lane-l/feature-work -m "merge(lane-l): collapse Lane L — v0.5.5 offline + v0.5.6 SW + Graph + AB plans"
# Expect: 3 conflicts in the markdown files listed in §6.

# 5. Resolve the 3 markdown conflicts using §6, then:
git add RUNNING_LOG.md docs/plans/DUAL-AGENT-HANDOFF-PLAN.md docs/plans/LANE-L-BOOTSTRAP.md
git commit                              # default message is fine; just describe "lane-collapse merge"

# 6. Apply stashes per §7. Validate per §8.

# 7. Push the collapsed main and tag v0.5.6.
git push origin main
git tag v0.5.6 -m "v0.5.6 — service-worker app shell, offline cold-launch on APK"
git push origin v0.5.6

# 8. Delete lane branches (only after main is verified — do this last).
git branch -d lane-c/v0.6.0-cloud lane-l/feature-work
git push origin --delete lane-c/v0.6.0-cloud lane-l/feature-work
```

**`--no-ff` is intentional.** It produces two visible merge commits that document the collapse in `git log --graph` for future archaeology. The user does not pay any cost for this.

### 5.3. If `git pull --ff-only` fails on step 2

Means `origin/main` moved (extremely unlikely — only the user pushes). If it did, `git log origin/main` to see what landed and adjust. Do **not** force-push.

---

## 6. The 3 markdown conflicts — resolution rules

These are the only conflicts you will hit. Apply the rule, do not improvise.

### 6.1. `RUNNING_LOG.md`

- **Rule:** keep ALL entries from BOTH lanes in chronological order. The file is append-only — never delete an entry from either side. Lane C's 14-May entry and Lane L's 12-May / 13-May / 15-May entries should all appear, sorted by their `## YYYY-MM-DD HH:MM` heading.
- **Why:** it's a project journal. Losing a day's narrative would orphan future archaeology.
- **How:** open the file, find each `<<<<<<<` block, take **both** sides (concatenate), then sort the entries by date heading. The latest entry should be 2026-05-15 13:40 (Lane L's v0.5.6 SW shipping entry, written by this session).

### 6.2. `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`

- **Rule:** **delete this file** as part of the merge resolution. It documented a workflow that no longer exists.
- **Why:** preserving it after the lane collapse will mislead future agents.
- **How:** `git rm docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` after resolving the conflict. Mention the deletion in the merge commit message.

### 6.3. `docs/plans/LANE-L-BOOTSTRAP.md`

- **Rule:** **delete this file** for the same reason as 6.2.
- **How:** `git rm docs/plans/LANE-L-BOOTSTRAP.md`.

> **Sanity check after resolving:** `grep -rn "lane-c\|lane-l\|DUAL-AGENT" docs/ src/ scripts/` should return references only inside `Handover_docs/` (historical) and inside this file. If anything else references the lane workflow, leave it alone unless the user asks to clean up — those are mostly in plan docs that just describe what each lane did, which is now historical.

---

## 7. Stash disposition

Inspect each with `git stash show -u stash@{N} --stat` BEFORE applying. Use `apply` (not `pop`) until contents are confirmed.

### 7.1. `stash@{0}` and `stash@{2}` — gradle re-syncs (8 lines, identical)

- Both contain the same 8-line auto-regeneration of `android/app/capacitor.build.gradle` + `android/capacitor.settings.gradle` from when Capacitor opened the Android project.
- These are **also currently uncommitted in the working tree** (see §3.4) — they're not unique to the stash.
- **Action:** after the merge, commit the gradle changes from the working tree as a single `chore(android): regenerated capacitor sync output` commit on `main`. Then drop both stashes:
  ```bash
  git stash drop stash@{0}
  git stash drop stash@{2}    # @{2} becomes @{1} after dropping @{0} — re-list before each drop
  ```

### 7.2. `stash@{1}` — Lane C session leftovers

- Contains 2 noise files (`public/offline.html`, `SwiftBar/brain-health.30s.sh`) — 1 line each.
- The Lane C application changes from this stash were already committed in `c2a71a4` (per the prior handover).
- **Action:** apply with `git stash apply stash@{1}`, inspect `git diff`, decide:
  - If the changes still apply cleanly and look intentional, commit as `chore: tidy offline.html + swiftbar from lane-c session` and drop.
  - If they look stale or trivial, `git checkout -- <files>` and drop without committing.

### 7.3. `stash@{3}` — Lane L Graph v2.1 WIP

- Contains the gradle 8-line diff (same as @{0}/@{2}) PLUS untracked `src/db/migrations/009_edges.sql` PLUS untracked `Handover_docs/Handover_docs_11_05_2026/`.
- **Action:**
  1. After the merge, `git stash apply --index stash@{3}`.
  2. Drop the gradle files from the apply (already committed in §7.1).
  3. Review `src/db/migrations/009_edges.sql` against `docs/plans/v0.6.0-cloud-migration.md` Phase C-1 (which adds `008_batch_id.sql`). The migrations should be sequential (008 → 009), not conflicting.
  4. If 009 is part of the planned Graph v2.1 work, commit it as `feat(db): 009_edges.sql migration for Graph v2.1` — but only if the user has approved Graph v2.1 as the next track. If not, `git rm` it back out and drop the stash.
  5. The `Handover_docs_11_05_2026/` directory is a stale snapshot from before the dual-lane phase. It is highly likely to duplicate content already in the 12 May or 14 May packages. **Diff against `Handover_docs_12_05_2026/` first**; delete if redundant.
  6. Drop the stash.

### 7.4. After all four are processed

```bash
git stash list    # expect: empty
```

If anything is left, document why in the running log and surface it to the user.

---

## 8. Validation checklist (do not skip)

Run after the merge, before pushing, before tagging.

| Check | Command | Expected |
|---|---|---|
| Repo is clean | `git status` | `nothing to commit, working tree clean` |
| Stashes drained | `git stash list` | empty |
| Type check | `npm run typecheck` | exit 0 |
| Unit / route tests | `npm test` | 260+ tests pass (per running-log entry 28) |
| Lint | `npm run lint` | exit 0 (warnings ok if pre-existing) |
| Dev server boots | `npm run dev` then `curl -fsS http://localhost:3000/api/health` | `{"ok":true}` |
| APK build | `npm run android:debug` (Capacitor) | builds without error |
| **Service-worker offline cold-launch on physical device** | airplane-mode test on Pixel 7 Pro or Redmi Note 7S | Library renders; Inbox renders; tabs work |
| `v0.5.6` tag exists | `git tag --list v0.5.6` | one match |

If any of the empirical mobile checks fail, **do not delete the lane branches** — you may need to revert. Branch deletion is irreversible from the user's perspective.

---

## 9. Mandatory watch-outs (read these or you will break things)

These come from this session's own bug log (see Lane L `RUNNING_LOG.md` entry #30, "Session self-critique") and the `05_Project_Retrospective.md` from the prior handover. Treat them as hard constraints.

1. **Do not run `rm -rf .next` while the Next dev server is running.** Causes Turbopack panic + 502/524 from Cloudflare. Always kill the dev process first; clear `.next/dev` only, not the whole `.next`.
2. **Do not relax `cache.match` options on `public/sw.js` without thinking about RSC.** Adding `ignoreSearch: true` will silently break document navigations because Next's `?_rsc=` query distinguishes RSC vs HTML requests. The current implementation uses `strippedKey()` + `isRscRequest()` to handle this — **bump the cache version (`brain-*-v3` → `-v4`) on any change to caching strategy.**
3. **`/sw.js` must remain in `PUBLIC_PATHS`** in `src/proxy.ts`. Browsers refuse to register a SW whose script URL is behind a redirect (`SecurityError`). Removing it from `PUBLIC_PATHS` will silently break offline cold-launch with no compile-time error.
4. **`cache.addAll` is all-or-nothing.** If you add a new precache target that might 302-redirect for unauthenticated SW fetches, the entire precache batch fails and the SW never activates. Use per-URL `cache.add` with try/catch (existing pattern in `public/sw.js`).
5. **CDP-over-adb does not work on Capacitor 8.3.3.** HTTP `/json` succeeds but the WebSocket upgrade hangs. Verified on Pixel 7 Pro AND Redmi Note 7S, so this is a Capacitor limitation, not device-specific. Do not invest more time in `chrome-remote-interface` automation unless we move off Capacitor. Use `chrome://inspect` manually.
6. **MIUI requires a separate "USB debugging (Security settings)" toggle** for `adb install` to work. Failing without that toggle returns `INSTALL_FAILED_USER_RESTRICTED`.
7. **Always check `git branch --show-current` before committing during long iteration cycles.** A commit went to the wrong branch in this session and was recovered cleanly only because origin had not yet seen it. After the lane collapse this risk drops to zero (only `main` exists), but during the collapse itself you will be switching between `main`, `lane-c/...`, and `lane-l/...` — be deliberate.
8. **APK unlock-loop has no regression test.** Flipping `CapacitorHttp.enabled` back to `true` in `src/lib/capacitor.ts` (or wherever the v0.5.3 fix landed) will silently re-introduce the unlock-loop bug on cold-start. If the user reports unlock-loop again, check that flag first.

---

## 10. What to do AFTER the collapse — the next track

This is the question to put to the user explicitly before starting any new code work. The candidates, in order of how recently they were active:

| Candidate | Status | Rough size | User-visible outcome |
|---|---|---|---|
| **Tag v0.5.6** | Implementation done; just needs `git tag` + APK release build + CHANGELOG entry | 30 min | Officially-shipped offline cold-launch — current state of two devices |
| **v0.6.0 cloud migration Phase B** | Plan v1.0 done, Hetzner Phase A complete (server hardened) | weeks | Brain runs on Hetzner CX23 Helsinki instead of laptop-tunneled localhost |
| **Library-from-DB offline (the v0.6.x SHELL follow-on)** | Designed but not started; closes the item-detail-offline gap from v0.5.6 | days | Tap into any item offline and read it (no network round-trip) |
| **Graph v2.1** | Plan v2 drafted; `009_edges.sql` migration in `stash@{3}` | weeks | Graph view of items + edges across the library |
| **AB (augmented browsing)** | Plan v2 locked | weeks | Inline AI augmentation while browsing captured items |

Recommended question to the user (verbatim, copy-paste ready):

> "The lane collapse is complete and v0.5.6 is tagged. Before I start the next track, which of these do you want first: (a) Phase B of the cloud migration to Hetzner, (b) library-from-DB offline (closes the item-offline gap), (c) Graph v2.1, (d) AB? Each of (b)–(d) is days, (a) is weeks."

---

## 11. Anti-patterns and recovery references

Things that almost broke this session and how to avoid / recover:

- **Branch tangle.** Mid-session, commit `633194f` landed on `lane-c/v0.6.0-cloud` instead of `lane-l/feature-work`. Recovery: cherry-pick verified the change had also been applied to lane-l, then reset local lane-c (origin had not yet seen it). After the collapse this risk vanishes.
- **Three "final-fix" cache-version bumps on the SW (v1 → v2 → v3) in one day.** Each fix had a side effect that wasn't predicted. Lesson: write a tiny empirical test (precache one URL, verify `cache.match` returns it on a real device) BEFORE shipping a SW change to the device. The user should not be the integration test.
- **Long research doc shipped before the runnable script was tested** (`docs/research/automate-webview-devtools-from-claude-code.md` — 1035 lines, recommends a CDP automation path that does not work on Capacitor). The SELF-CRITIQUE companion file caught it. Lesson: when producing research that ends in a runnable artifact, run the artifact end-to-end before declaring the research done.

---

## 12. Required reading after this doc

In order, only when you need them:

1. **For the merge mechanics** (if §5 above is unclear): `Handover_docs/Handover_docs_14_05_2026_LANE/07_Deployment_and_Operations.md` (M8 — merge procedure step-by-step).
2. **For Hetzner / secrets / SSH access** (only when you start v0.6.0 Phase B): `Handover_docs/Handover_docs_14_05_2026_LANE/03_Secrets_and_Configuration.md`.
3. **For the v0.6.0 cloud-migration plan** (when starting Phase B): `docs/plans/v0.6.0-cloud-migration.md` + the 9 spike briefs at `docs/plans/spikes/v0.6.0-cloud-migration/`.
4. **For the v0.5.6 SW design and bug history** (if you ever touch `public/sw.js`): `docs/plans/v0.5.6-app-shell-sw.md` and `docs/plans/v0.5.6-app-shell-sw-REVISED.md`.
5. **For Lane L feature inventory** (offline outbox, share-handler, Chrome extension): `Handover_docs/Handover_docs_13_05_2026/` and `Handover_docs/Handover_docs_12_05_2026/02_Systems_and_Integrations.md`.
6. **For the project journal** (entries 1–30): `RUNNING_LOG.md` (top-to-bottom is best, but entries 22–30 cover the dual-lane period directly).

---

## 13. Definition of Done for this handover

The next agent has finished the lane collapse when ALL of these are true:

1. `git branch --list lane-*` returns empty (locally).
2. `git ls-remote origin 'refs/heads/lane-*'` returns empty.
3. `git stash list` returns empty.
4. `git tag --list v0.5.6` returns one match and the tag is pushed.
5. The validation checklist in §8 passes 100%.
6. A new entry has been appended to `RUNNING_LOG.md` titled "Lane collapse complete — single-stream resumed on `main`".
7. The user has been asked the §10 "next track" question and has answered.
8. `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` and `docs/plans/LANE-L-BOOTSTRAP.md` have been deleted (per §6.2 / §6.3).
9. `Handover_docs/Handover_docs_15_05_2026_LANE_COLLAPSE/` (this folder) has a `CLOSURE.md` appended noting the collapse landed cleanly and pointing at the merge commit SHA on `main`.

---

## 14. One-paragraph status snapshot for the receiving agent

> AI Brain is a local-first knowledge-capture app (Recall.it + Knowly clone) running as Next.js + SQLite + Ollama, packaged as a Capacitor APK pointing at a Cloudflare-tunneled origin. As of 2026-05-15, v0.5.6 is implementation-complete on `lane-l/feature-work` (offline cold-launch verified on Pixel 7 Pro + Redmi Note 7S via service-worker app-shell). Lane C has finished Phase A of the v0.6.0 cloud migration (Hetzner CX23 in Helsinki, hardened, 9 spikes done, plan v1.0 locked) but committed no application code. The two lanes are about to be collapsed onto `main` because the next phase of cloud migration would force overlapping edits the dual-lane workflow is not designed for. Your first job is the collapse + tag. Your second job is whatever the user picks from §10.

---

*End of handover. Total length: ~9.5 KB. If anything in this doc contradicts the prior 14 May package, this doc wins (it is newer and reflects today's state).*
