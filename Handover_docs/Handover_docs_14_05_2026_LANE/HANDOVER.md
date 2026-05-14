# Lane Collapse Handover — End of Two-Lane Phase

**Date authored:** 2026-05-14 22:30 IST
**Authored by:** Claude (Sonnet 4.6) on `lane-c/v0.6.0-cloud`
**Audience:** the next AI agent (any model) tasked with collapsing both lanes back into a single stream of work
**Triggered by:** user instruction "Conclude work as two lanes; let the new agent merge both Lane C and Lane L into a single stream. Create a handover document."

> **READ THIS FIRST.** This document is the single source of truth for the lane-collapse handoff. It supersedes `Handover_docs/Handover_docs_12_05_2026/` for everything related to merging the two lanes. The 12_05_2026 package remains valid for *post-collapse* baseline architecture; this doc is what tells you how to *get there*.

---

## 1. TL;DR

You are taking over a project that ran two parallel lanes for ~3 days:

- **Lane C** (`lane-c/v0.6.0-cloud`) shipped Phase A of the cloud migration: Hetzner CX23 server hardened in Helsinki, 9 research spikes, full handover package, and v0.6.0 plan v1.0 with a provider-agnostic LLM wrapper architecture. **4 commits ahead of `main`**.
- **Lane L** (`lane-l/feature-work`) shipped v0.5.6 + offline-mode v0.5.5 + Graph v2.1 plans + DIAG-1..3 service-worker fixes. **51 commits ahead of `main`**.

Both lanes diverged from `main @ 2a35d74`. There is **zero overlap in functional code changes** — Lane C only touched `Handover_docs/`, `docs/plans/`, `docs/research/`, and `RUNNING_LOG.md`. Lane L touched everything else (extension, APK, offline outbox, service worker, Graph + AB plans). The only files touched by both lanes are 3 markdown files: `RUNNING_LOG.md`, `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`, `docs/plans/LANE-L-BOOTSTRAP.md`. **Those are the only merge conflicts you will hit.**

Your job is to:
1. Merge both lanes into `main` (or into one another, then into `main`).
2. Resolve the 3 markdown conflicts using the rules in §6 below.
3. Restore Lane L's stashed WIP onto the merged branch.
4. Validate the merged tree builds + tests pass.
5. Drop the 4 stashes once their contents are confirmed to have been preserved.
6. Delete the lane branches after the merge lands on `main`.
7. Update `STATE.md`, `ROADMAP_TRACKER.md`, and append one final lane-collapse entry to `RUNNING_LOG.md`.

After the collapse, work resumes as **single-lane on `main`**, picking up Phase B-1 of the v0.6.0 cloud migration plan.

---

## 2. Repo state at handover

### 2.1. Branches

| Branch | HEAD | Position vs main | Pushed to origin? |
|---|---|---|---|
| `main` | `2a35d74` | — | yes |
| `lane-c/v0.6.0-cloud` | `c2a71a4` | +4 commits | yes (`origin/lane-c/v0.6.0-cloud`) |
| `lane-l/feature-work` | `c944387` | +51 commits | yes (`origin/lane-l/feature-work`) |

**Merge base** for both lanes: `2a35d74` (= current `main`). Both branches share exactly that commit as their last common ancestor.

### 2.2. Stashes (4 total — all preserved)

```
stash@{0}: On lane-l/feature-work: lane-l-WIP-android-gradle-3
stash@{1}: On lane-c/v0.6.0-cloud: lane-c session leftovers
stash@{2}: On lane-l/feature-work: lane-l-WIP-android-gradle-2
stash@{3}: On lane-l/feature-work: lane-l-WIP-edges-and-android
```

**What each stash contains and what to do with it:**

- **`stash@{0}` `lane-l-WIP-android-gradle-3`** — `android/app/capacitor.build.gradle` + `android/capacitor.settings.gradle`, both modified by Capacitor build tooling (likely re-generated when an Android Studio session opened the project). 8 lines added. Identical to stash@{2}. **Action:** apply on the merged branch after collapse, then verify `npm run build:apk` still works. If `git stash apply` produces no functional change after the merge, drop it. Otherwise commit as a separate `chore(android): regenerated capacitor sync output` commit.
- **`stash@{1}` `lane-c session leftovers`** — **already absorbed into commit `c2a71a4`.** This stash contains the v0.6.0 plan, OpenRouter research, RUNNING_LOG entry, plus 2 Lane L noise files (`public/offline.html`, `SwiftBar/brain-health.30s.sh`). The 3 Lane C files were extracted and committed cleanly in `c2a71a4`. The 2 noise files (1 line each) were intentionally left in this stash. **Action:** confirm the 2 noise diffs are still relevant on the merged branch (they were captured against `lane-l/feature-work @ c944387`). If they apply cleanly after the merge, commit them under Lane L's authorship as a separate commit. If not, drop.
- **`stash@{2}` `lane-l-WIP-android-gradle-2`** — duplicate of stash@{0} with same gradle changes. **Action:** drop. Redundant.
- **`stash@{3}` `lane-l-WIP-edges-and-android`** — gradle (8 lines, same as @{0}/@{2}) PLUS untracked `src/db/migrations/009_edges.sql` PLUS untracked `Handover_docs/Handover_docs_11_05_2026/`. The migration is from Lane L's Graph v2.1 work. **Action:** apply on merged branch with `git stash apply --index stash@{3}`. The `009_edges.sql` migration must be reviewed against any v0.6.0 schema work in `docs/plans/v0.6.0-cloud-migration.md` (Phase C-1 introduces `008_batch_id.sql`). The migrations should not conflict — `008` and `009` are sequential. The `Handover_docs_11_05_2026/` directory is a previous-day snapshot and may be stale; check whether it duplicates `Handover_docs_12_05_2026/` and delete if so.

**Important:** Inspect stashes with `git stash show -u stash@{N} --stat` before applying. Use `git stash apply` (NOT `pop`) until you've verified contents land correctly on the merged tree, then drop manually with `git stash drop stash@{N}`.

### 2.3. Branch divergence summary (commit titles)

**Lane C — 4 commits ahead of main (oldest first):**

```
60481fb docs(lane-split): initiate dual-agent workflow for v0.6.0 parallel work
3dcbcd2 wip(lane-c): running-log entries from mid-session — pre-Lane L handoff
fe197af feat(v0.6.0): Phase A complete — Hetzner server hardened + 9 spikes + handover package
c2a71a4 docs(v0.6.0): plan v1.0 + OpenRouter evaluation + Lane C session log
```

**Lane L — 51 commits ahead of main (most recent 15 shown):**

```
c944387 fix(sw): ignoreVary + ignoreSearch on cache.match (DIAG-3 final-final)
d63f87e fix(ui): hide Next.js dev indicator in WebView (APK bottom-nav fix)
0c524f8 fix(proxy): allow /sw.js to bypass auth gate (DIAG-3 follow-up)
7c8d817 fix(sw): drop auth-protected routes from precache (DIAG-3)
e8ea4db docs(research): self-critique fixes to CDP automation report (DIAG-4)
eec6713 chore(scripts): hardened CDP inspector + revised v0.5.6 plan (DIAG-1/DIAG-2 partial)
6479c64 fix(sw): claim clients aggressively + reload after first install (SHELL-7)
46d7c5c chore(release): v0.5.6 with app-shell SW (SHELL-5/6)
e054e27 docs(plans): v0.5.6 SW addresses plan v3 cold-start gap (SHELL-4)
59a87ac feat(sw): register service worker from root layout (SHELL-2)
f571df6 feat(sw): app-shell service worker for offline cold-start (SHELL-1)
4ee2b23 docs(handover): v5 package 2026-05-13 — offline mode v0.6.x complete
4a6548a fix(offline): split youtube URL helpers from capture module — fixes APK build
09be658 docs(test-reports): v0.5.5 offline-mode manual verification matrix
86cefb3 fix(offline): YouTube variants share one outbox dedup key
... (36 older Lane L commits — see `git log main..lane-l/feature-work`)
```

The full Lane L commit list is too long for this doc; query with `git log --oneline main..lane-l/feature-work`.

### 2.4. Files touched by each lane

```
Lane C (vs main): 28 files, +6,588 / −0
  Handover_docs/Handover_docs_12_05_2026/  — entire directory (10 files, baseline package)
  RUNNING_LOG.md                           — +266 lines (3 Lane C entries)
  docs/plans/DUAL-AGENT-HANDOFF-PLAN.md    — created
  docs/plans/LANE-L-BOOTSTRAP.md           — created
  docs/plans/v0.6.0-cloud-migration.md     — NEW (v1.0 plan, 416 lines)
  docs/plans/v0.6.0-cloud-migration-RESEARCH-PROGRAM.md  — created
  docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md  — created
  docs/research/ai-provider-matrix.md
  docs/research/brain-usage-baseline.md
  docs/research/budget-hosts.md
  docs/research/budget-hosts-v2-under-5.md
  docs/research/cloud-host-matrix.md
  docs/research/embedding-strategy.md
  docs/research/enrichment-flow.md
  docs/research/free-tier-architecture-redesign.md
  docs/research/hybrid-architectures-SELF-CRITIQUE.md
  docs/research/hybrid-free-tier-architectures.md
  docs/research/openrouter-provider-evaluation.md
  docs/research/privacy-threat-delta.md
  docs/research/v0.6.0-cost-summary.md

Lane L (vs main): 103 files, +16,677 / −203
  Source code: src/app/, src/components/, src/lib/outbox/, src/lib/queue/,
               src/lib/sw/, src/proxy.ts, public/sw.js, public/offline.html
  Plans:       docs/plans/v0.5.0-* updates, docs/plans/v0.5.6-app-shell-sw*.md,
               docs/plans/v0.6.x-augmented-browsing.md (v1+v2),
               docs/plans/v0.6.x-graph-view.md (v1),
               docs/plans/v0.6.x-offline-mode-apk.md (v1+v2+v3),
               docs/plans/v0.7.x-offline-workmanager-roadmap.md
  Research:    docs/research/automate-webview-devtools-from-claude-code.md,
               docs/research/graph-view-tooling.md, docs/research/offline-queue-prior-art.md,
               docs/research/webview-quota-pixel-2026-05-14.md (etc.)
  Test reports: scripts/, src/scripts/
  Handover:    Handover_docs/Handover_docs_13_05_2026/ — Lane L's own snapshot
  Releases:    package.json (v0.5.4 → v0.5.6), CHANGELOG.md
  RUNNING_LOG: +N entries (Lane L's last entry: 2026-05-13 21:17)
```

### 2.5. The 3 conflicting files

These are the **only files touched by both lanes**:

```
docs/plans/DUAL-AGENT-HANDOFF-PLAN.md
docs/plans/LANE-L-BOOTSTRAP.md
RUNNING_LOG.md
```

See §6 for resolution rules.

---

## 3. What each lane delivered

### 3.1. Lane C deliverables (cloud migration v0.6.0)

**Phase A — Server hardening (✅ COMPLETE, committed `fe197af`):**
- Hetzner CX23 Helsinki provisioned: `204.168.155.44`, 2 vCPU / 4 GB / 40 GB SSD, $5.59/mo
- SSH access: key-only, `brain` user with passwordless sudo, root login disabled
- UFW firewall: deny inbound except port 22; allow all outbound (for Cloudflare Tunnel)
- Installed: Node 20.20.2, sqlite3 3.45.1, cloudflared 2026.5.0
- Verified: `better-sqlite3@12` + `sqlite-vec v0.1.9` load on Ubuntu 24.04 / glibc 2.39 (this was the highest pre-flight risk; now retired)

**Research outputs (9 spikes + follow-ups, all committed):**
- `docs/research/brain-usage-baseline.md` (S-1) — Brain captures ~5/mo low-use, projected 30–150/mo post-migration
- `docs/research/v0.6.0-cost-summary.md` (S-9) — total $5.85/mo at moderate use after Hetzner pivot
- `docs/research/enrichment-flow.md` (S-3) — daily batch + manual button + state machine
- `docs/research/ai-provider-matrix.md` (S-4) — locks Anthropic Haiku 4.5 + Sonnet 4.6
- `docs/research/embedding-strategy.md` (S-5) — locks Gemini text-embedding-004 (768-dim, free tier)
- `docs/research/cloud-host-matrix.md` (S-6) — initially picked AWS Lightsail, later overridden
- `docs/research/budget-hosts.md` + `budget-hosts-v2-under-5.md` — Hetzner CX23 Helsinki at $5.59 chosen
- `docs/research/privacy-threat-delta.md` (S-8) — paid-tier no-training posture verified
- `docs/research/free-tier-architecture-redesign.md` + `hybrid-free-tier-architectures.md` + `hybrid-architectures-SELF-CRITIQUE.md` — explored Cloudflare Workers + Vercel free tiers; rejected for Brain's WAL-on-local-SSD invariant
- `docs/research/openrouter-provider-evaluation.md` — newest. Anthropic-direct primary, OpenRouter as standby (env-var swap target)

**Plan output (committed `c2a71a4`):**
- `docs/plans/v0.6.0-cloud-migration.md` v1.0 — 50 tasks across 5 phases (B–F). Phase A is done. Plan introduces a **provider-agnostic LLM wrapper** (`src/lib/llm/types.ts` + `factory.ts` + `anthropic.ts` + `openrouter.ts`) replacing direct `ollama.ts` imports. Six env vars (`LLM_ENRICH_PROVIDER`, `LLM_ENRICH_MODEL`, `LLM_ASK_PROVIDER`, `LLM_ASK_MODEL`, `LLM_ENRICH_BATCH`, plus `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY`) drive provider selection. Embed wrapper locked to 768-dim output to match `chunks_vec`.

**Handover package (committed `fe197af`):**
- `Handover_docs/Handover_docs_12_05_2026/` — full 10-file Option-C package (shared baseline + per-lane sections). Still valid for post-collapse architecture reference; not for the collapse mechanics itself (this doc handles that).

### 3.2. Lane L deliverables (feature work)

**Releases:**
- `v0.5.4` — extension polish + APK fixes
- `v0.5.5` — offline-mode complete (IndexedDB outbox + sync-worker + share-handler + a11y nav badge + plain-language copy)
- `v0.5.6` — app-shell service worker for offline cold-start

**Offline-mode v0.5.5 (10 OFFLINE-* commits):**
- `src/lib/outbox/` — IndexedDB schema, dedup keys, classifier, exponential backoff
- `src/lib/queue/sync-worker.ts` — orchestrator
- `src/app/inbox/` — /inbox page + nav-bar badge
- Android local notifications for stuck transitions
- Plain-language copy throughout

**Service-worker v0.5.6 (SHELL-1..7 + DIAG-1..4 commits):**
- `public/sw.js` — app-shell precache, ignoreVary + ignoreSearch (DIAG-3 fix)
- `src/lib/sw/registration.ts` — register from root layout, claim clients, reload-after-install
- DIAG runbooks for Chrome DevTools / WebView debugging

**Plans authored (Lane L):**
- `docs/plans/v0.5.6-app-shell-sw.md` + REVISED — v0.5.6 implementation
- `docs/plans/v0.6.x-augmented-browsing.md` (v1, v2) — Augmented Browsing plan
- `docs/plans/v0.6.x-graph-view.md` (v1) — Graph view plan; v2 + research doc (`docs/research/graph-view-tooling.md`) outstanding per Lane L's last RUNNING_LOG entry
- `docs/plans/v0.6.x-offline-mode-apk.md` (v1, v2, v3) + 2 self-critiques
- `docs/plans/v0.7.x-offline-workmanager-roadmap.md`

**Open Lane L work (per Lane L's last log entry on 2026-05-13 21:17):**
- Graph plan v2 + research doc still need to be written
- Offline plan needs a self-critique pass before user review
- 1 uncommitted migration: `src/db/migrations/009_edges.sql` (in `stash@{3}`)

---

## 4. Architectural impact of the collapse

### 4.1. v0.6.0 plan still applies after the merge — with one caveat

The v0.6.0 plan in `docs/plans/v0.6.0-cloud-migration.md` was authored on Lane C without knowledge of Lane L's recent work. After the merge:

- **Phase B (provider wrapper) refactors `src/lib/llm/ollama.ts` and its callers.** Lane L did NOT touch any of these files. ✅ No impact on the plan's task IDs B-1 to B-13.
- **Phase C (batch + cron) adds `src/db/migrations/008_batch_id.sql`.** Lane L's stashed `009_edges.sql` is sequential — no conflict. The merged branch will need migration 008 first, then 009 from Lane L's stash, in that numerical order. ✅ No re-numbering needed.
- **Phase D (Hetzner deploy) and Phase E (cleanup + tag) are unaffected** by Lane L's work — they're operations against the server, not the codebase.
- **Caveat:** Lane L's offline-mode adds a new `src/lib/outbox/` directory and modifies `src/proxy.ts` + `src/app/inbox/`. The v0.6.0 plan's acceptance criterion #6 ("APK and Chrome extension both work without changes") requires that the offline outbox continues to work against the new Hetzner backend. **Add a verification task to Phase D**: "verify offline outbox sync completes against Hetzner backend after cutover." This is a single E2E test, not a refactor.

### 4.2. Lane L's open plans become single-lane work after collapse

Augmented Browsing, Graph view, and offline-WorkManager v0.7.x plans are all `v0.6.x` patch releases that should land *after* v0.6.0 cloud migration ships, on `main`, in single-lane mode. Their priority order (per Lane L's last RUNNING_LOG entry):

1. Graph plan v2 + `docs/research/graph-view-tooling.md` written → GRAPH-1 execution
2. AUG-1..7 execution
3. Offline plan self-critique → review → execution

These are NOT blockers for the lane collapse. They become the post-collapse work queue.

---

## 5. Recommended merge strategy

You have two viable strategies. **Strategy A is recommended** for forensic clarity; Strategy B is acceptable if you want a single merge commit.

### Strategy A — Sequential merges into main (recommended)

```bash
# 0. Pre-flight
git checkout main
git pull origin main          # confirm main hasn't moved (still 2a35d74)
git fetch --all
npm test                      # baseline must be green; if not, abort

# 1. Merge Lane C first (smaller, fewer conflicts, mostly docs)
git merge --no-ff lane-c/v0.6.0-cloud -m "merge(lane-c): v0.6.0 cloud migration Phase A + plan v1.0 + research + handover"
# expect zero conflicts (Lane C touched only docs not in main)
npm test
npm run typecheck
npm run lint

# 2. Merge Lane L (large, conflicts only on 3 markdown files)
git merge --no-ff lane-l/feature-work
# expect conflicts on:
#   - docs/plans/DUAL-AGENT-HANDOFF-PLAN.md
#   - docs/plans/LANE-L-BOOTSTRAP.md
#   - RUNNING_LOG.md
# resolve per §6 below

git merge --continue           # after resolving
npm test                       # full suite must pass
npm run typecheck
npm run build                  # production build must succeed
npm run build:apk              # APK build must succeed (Lane L's domain)

# 3. Apply Lane L stashed WIP
git stash apply stash@{3}      # edges-and-android: contains 009_edges.sql + gradle
# resolve any conflicts (gradle is regenerated, can be overwritten)
git add android/ src/db/migrations/009_edges.sql Handover_docs/Handover_docs_11_05_2026/
git commit -m "chore(lane-collapse): restore Lane L stashed WIP — gradle + 009 migration + 11_05 handover snapshot"

# 4. Validate stash@{0} and stash@{1} can be dropped or need committing
git stash show -u stash@{0}    # gradle WIP — likely already covered by stash@{3}
git stash show -u stash@{1}    # lane-c session leftovers — already in c2a71a4 except 2 noise files
git stash show -u stash@{2}    # gradle WIP duplicate — drop

# 5. Push collapsed main + tag
git push origin main
git tag -a lane-collapse-2026-05-XX -m "Lane C + Lane L merged into main; single-stream resumed"
git push origin lane-collapse-2026-05-XX

# 6. Delete lane branches (after CI confirms green)
git branch -d lane-c/v0.6.0-cloud
git branch -d lane-l/feature-work
git push origin --delete lane-c/v0.6.0-cloud
git push origin --delete lane-l/feature-work

# 7. Drop processed stashes
git stash drop stash@{2}       # confirmed duplicate
git stash drop stash@{1}       # contents accounted for
# stash@{0} and stash@{3}: drop after confirming applied content survives a clean checkout
```

### Strategy B — Octopus merge

```bash
git checkout main
git merge --no-ff lane-c/v0.6.0-cloud lane-l/feature-work -m "merge(lane-collapse): C + L → main"
```

This is faster but mixes both lanes' commits into one merge commit, making `git log --first-parent` less useful. Avoid unless you're confident.

### Strategy C (NOT recommended) — Rebase Lane L on Lane C

Possible but adds rewriting risk to 51 commits of shipped code. Don't do this unless the user explicitly asks.

---

## 6. Conflict resolution rules for the 3 markdown files

These files were touched by both lanes. Each has a deterministic resolution:

### 6.1. `RUNNING_LOG.md` (append-only journal)

**Both lanes appended their own entries to the bottom.**
- Lane C added 3 entries: `2026-05-12 10:55`, `2026-05-14 18:11`, `2026-05-14 21:05` — all `[Lane C]` tagged.
- Lane L added entries from `2026-05-12 13:55` through `2026-05-13 21:17` — untagged or `[Lane L]` tagged.

**Resolution rule:** keep ALL entries from BOTH lanes, ordered chronologically by timestamp. The append-only invariant means no entry is ever deleted. Use this command to verify after resolving:

```bash
grep "^## " RUNNING_LOG.md | sort -k2,2 -k3,3   # all entries should sort cleanly by date
```

Likely conflict markers will appear at the bottom of the file. Resolve by interleaving the entries by their own timestamps. If timestamps tie, Lane L wins (more recent activity). After resolution, append ONE final entry:

```
## YYYY-MM-DD HH:MM — Lane collapse merge completed; single-stream resumed
```

### 6.2. `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`

This was the contract between the two lanes. After the collapse it becomes **historical**.

**Resolution rule:** prefer Lane C's version (it's the canonical source authored by Lane C). After the merge, add a note at the top:

```markdown
> **STATUS: SUPERSEDED 2026-05-XX.** This document governed dual-lane work from 2026-05-12 to 2026-05-XX. Lane C and Lane L have been merged back to `main`. See `Handover_docs/Handover_docs_14_05_2026_LANE/HANDOVER.md` for the collapse mechanics. Work now resumes in single-lane mode on `main`.
```

Do not delete the file — it's part of the project history.

### 6.3. `docs/plans/LANE-L-BOOTSTRAP.md`

Same treatment as DUAL-AGENT-HANDOFF-PLAN. Prefer Lane C's version, add a SUPERSEDED note at the top.

---

## 7. Validation checklist (run after merge before pushing)

Each box must check before `git push origin main`. If any fail, do NOT push — surface to the user and pause.

- [ ] `git status` clean (no untracked, no modified, no staged)
- [ ] `npm test` — full suite green; record the count vs pre-merge baseline
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero new warnings
- [ ] `npm run build` — Next.js standalone build succeeds
- [ ] `npm run build:apk` — Capacitor APK build succeeds (Lane L's domain; do NOT skip)
- [ ] `npm run dev` — server boots, `/api/health` returns 200, `/inbox` page renders, `/settings/lan-info` page renders
- [ ] `git log --oneline main` — recent commits include both Lane C and Lane L work
- [ ] `git log --oneline --first-parent main` — clean linear history with merge commits
- [ ] `RUNNING_LOG.md` — all entries from both lanes preserved; ends with the new lane-collapse entry
- [ ] `STATE.md` — OWNERSHIP block updated (single lane, `main` is canonical)
- [ ] `ROADMAP_TRACKER.md` — v0.5.6 ✅, v0.6.0 in progress (Phase A done, Phase B next)
- [ ] All 4 stashes either dropped (after confirming contents preserved) or documented in a new RUNNING_LOG entry as still pending application

---

## 8. Post-collapse work queue (priority order)

After the merge lands on main, work resumes single-lane in this order:

### 8.1. P0 — finish v0.6.0 cloud migration plan review

The plan committed in `c2a71a4` is **v1.0 draft, awaiting Stage 4 review + user sign-off**. Do not start Phase B execution yet.

1. Run cross-AI review (`gsd-plan-checker` agent) → produce `docs/plans/v0.6.0-cloud-migration-REVIEW.md`
2. Run self-critique (fresh agent) → produce `docs/plans/v0.6.0-cloud-migration-SELF-CRITIQUE.md`
3. Apply 4 known fixes flagged in the prior session's RUNNING_LOG action items (ref: `2026-05-14 21:05` entry):
   - Cross-check `LLMProvider` interface against actual call sites in `src/lib/enrich/pipeline.ts`, `src/lib/queue/enrichment-worker.ts`, `src/lib/ask/generator.ts`
   - Add Phase C task `C-11`: live Anthropic API smoke ($0.50 spending cap) before Hetzner deploy
   - Add Phase D task `D-12-pre`: tar Mac SQLite + data/ to local archive before rsync
   - ASK user about Anthropic monthly hard cap ($5 vs $3)
4. Present revised plan to user for sign-off
5. Lock plan as v1.1

### 8.2. P0 — Phase B execution (provider wrapper)

Once plan v1.1 is locked, execute Phase B-1 through B-13 from `docs/plans/v0.6.0-cloud-migration.md`. Each task has a "Done when" criterion. First task: `B-1 — Define LLMProvider interface in src/lib/llm/types.ts`.

### 8.3. P1 — Lane L's open plans

Pick up where Lane L paused (per its last RUNNING_LOG entry):

- **Graph view v2 plan** (`docs/plans/v0.6.x-graph-view.md` v2) — needs Graph plan v2 addressing 9 self-critique items + research doc `docs/research/graph-view-tooling.md` (8-library comparison + alt-paradigm sweep + prior-art review)
- **Augmented Browsing v1+v2** — already plan-locked, ready for AUG-1..7 execution
- **Offline plan self-critique** — apply same lens that caught 17 gaps in AB v1 and 9 in Graph v1, then user review

These run on `main` after v0.6.0 ships. Do NOT start them before the cloud migration is in production.

### 8.4. P2 — pending tasks from prior TaskList

The TaskList at handover has 2 pending tasks (47 total, 45 completed/in-progress):

- `#9 — Execute T-CF-11 AVD smoke + SSE keepalive test` — v0.5.0 task, may be obsolete after v0.5.6 ship; verify before re-opening
- `#10 — Execute T-CF-14 physical Pixel smoke (user-gated)` — same; verify

If still relevant, slot them into the post-v0.6.0 backlog.

---

## 9. Critical context the next agent must absorb

These are facts the next agent will get wrong without explicit signal:

### 9.1. Branch-confusion bug — recurring pattern, NOT one-off

This is the single most important behavioral note in this handover.

**The bug:** the previous two AI sessions both started on `lane-l/feature-work` despite being asked to do Lane C work. Both sessions wrote files to the wrong branch initially, then noticed the divergence only when running the running-log skill (which forces a `git status` check). The rule "check `git branch --show-current` as the FIRST command of every session" was:
- documented in memory (`project_ai_brain_dual_lane`)
- documented in prior session's action items as `[VERIFY]`
- documented in `Handover_docs/Handover_docs_12_05_2026/09_Next_Actions_Per_Lane.md`

It still failed twice. Treat this as a **systemic agent-behavior failure**, not a rule the next agent can rely on remembering.

**Why this matters for the collapse:** the collapse work is `main`-branch work. The next agent MUST verify `git branch --show-current` returns `main` before any merge command. A `git merge` run from the wrong branch silently produces a different result.

### 9.2. Working tree state at handover

After this session's work, the working tree on `lane-c/v0.6.0-cloud` is **clean** (status returns nothing). The 4 stashes hold all uncommitted state. Do not start the collapse on a dirty tree.

### 9.3. Hetzner server is idle but live

The `204.168.155.44` Hetzner box is hardened but has nothing running on it. The cloudflared tunnel is configured on Mac, NOT on the Hetzner box. No DNS change has happened. The Mac is still serving `brain.arunp.in`. **The collapse merge does not deploy anything to Hetzner.** Phase D of the v0.6.0 plan handles that, AFTER the merge.

### 9.4. User profile

Per `~/.claude/projects/-Users-arun-prakash-Documents-GitHub-arun-cursor/memory/user_non_technical_full_ai_assist.md`: the user is non-technical and expects full AI assistance. Write all code; explain in plain language; lead with user-visible outcome before engineering detail. Don't hand the user a `git merge` command and expect them to resolve conflicts themselves.

### 9.5. Memory files relevant to this work

These memory entries were authored during the dual-lane phase and remain authoritative:

- `project_ai_brain.md` — Brain project overview
- `project_ai_brain_android_env.md` — Android SDK paths and AVDs
- `project_ai_brain_cloudflare_pivot.md` — v0.5.0 tunnel rationale
- `project_ai_brain_dual_lane.md` — the dual-lane split (now ending; mark superseded after collapse)
- `feedback_empirical_evidence_first.md` — UI/WebView fixes need DevTools evidence before code change

After the collapse, append a **new** memory entry: `project_ai_brain_lane_collapse.md` documenting that the dual-lane phase ended on YYYY-MM-DD with a final lane-collapse merge into main.

### 9.6. Files NOT to touch during the collapse

- `Handover_docs/Handover_docs_12_05_2026/` — frozen baseline, do not edit
- `Handover_docs/Handover_docs_14_05_2026_LANE/` (this directory) — the next agent reads this; don't edit until after the collapse, then add a CLOSURE.md noting completion
- Any file under `docs/research/` — these are spike outputs, append-only

---

## 10. Risk register for the collapse

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Lane L test suite breaks on merge | Low | High | Run `npm test` after each merge step; revert immediately if red |
| Lane L APK build breaks on merge | Low | High | Run `npm run build:apk` as part of validation; revert if red |
| `RUNNING_LOG.md` conflict resolution drops entries | Medium | Medium | Validate with `grep "^## " RUNNING_LOG.md | wc -l` — must equal sum of pre-merge entries (Lane C count + Lane L count − overlap) |
| Stash apply on `stash@{3}` reintroduces gradle conflicts | Medium | Low | Apply with `--index`, inspect, abort if not clean |
| `009_edges.sql` migration is incompatible with `008_batch_id.sql` (Phase C) | Low | Medium | Inspect both migrations; sequential numbering should mean no overlap, but verify column names don't collide |
| Branch deletion before CI green | Low | High | Push merged main → wait for CI → only then delete branches |
| Cloudflare tunnel still pointing at Mac after collapse | N/A | N/A | The collapse does not change tunnel config; this is a Phase D concern, NOT a collapse concern |
| Stash `lane-c session leftovers` (`stash@{1}`) accidentally re-applied | Low | Medium | Already in commit `c2a71a4`; reapplying would duplicate the v0.6.0 plan and OR research files. Drop only after confirming the merged main has both files at the expected paths. |

---

## 11. Open questions for the user (ask before merging)

The next agent should NOT proceed with the merge without confirming these:

1. **Strategy A vs B?** Sequential merges (recommended) or octopus merge?
2. **Lane L stash@{3}**: does the user want `Handover_docs/Handover_docs_11_05_2026/` to land on main, or is it stale and should be dropped?
3. **Anthropic monthly hard cap**: $5/mo (per `v0.6.0-cost-summary.md`) or $3/mo (a tightening given actual ~$0.26/mo expected usage)? This decision affects Phase D-1 of the v0.6.0 plan.
4. **Tag the collapse?** A `lane-collapse-YYYY-MM-DD` annotated tag is useful for forensics; user may prefer no tag.
5. **Delete lane branches immediately or keep for ~7 days?** A 7-day grace period gives time to revert if a regression surfaces.

---

## 12. Final notes

- This handover doc is authored during the live two-lane phase. **It will be wrong** about anything that happens between this commit and the actual collapse. If the user resumes either lane before the next agent picks this up, the divergence numbers in §2 must be recomputed via `git rev-list --count` before the merge.
- The plan committed in `c2a71a4` (`docs/plans/v0.6.0-cloud-migration.md`) is the next agent's working document **after** the collapse. Read it before starting Phase B.
- The 21:05 RUNNING_LOG entry (`c2a71a4`) contains an honest self-critique calling out 7 issues with the v0.6.0 plan v1.0. Apply those fixes (per §8.1) before locking the plan as v1.1.
- The OpenRouter research (`docs/research/openrouter-provider-evaluation.md`) is a structural reason to keep the wrapper architecture even if the user never activates OpenRouter in production. Don't simplify the wrapper down to "just call Anthropic" during Phase B.

**End of handover. Good luck.**
