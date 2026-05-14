# AI Brain: Project retrospective (handover — 2026-05-14 dual-lane phase)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/05_Project_Retrospective.md](../Handover_docs_12_05_2026/05_Project_Retrospective.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** This file captures the dual-lane phase retrospective + recurring patterns + watch-outs. **Read §3 (Watch-outs) before doing the merge.** The branch-confusion pattern is the single most important behavioural note in the entire handover.

## 1. Timeline (compressed)

| Period | Focus |
|--------|-------|
| 2026-04-24 | Project re-opened (post-closure decision flip) — local-first Brain build begins |
| 2026-04-25 | Lenny PDF bulk import: 1,116 PDFs imported via `Recall_import/` tooling |
| 2026-05-07 → 2026-05-09 | v0.3.0 → v0.4.0 (Ask) → v0.5.0 (LAN pivot) shipped |
| 2026-05-09 → 2026-05-10 | v0.5.0 LAN approach abandoned; Cloudflare Named Tunnel pivot to `brain.arunp.in` |
| 2026-05-11 | v0.5.0 tunnel mode shipped end-to-end on cellular; v0.5.1 YouTube capture shipped |
| **2026-05-12 (Lane C kickoff)** | v0.6.0 cloud-migration research begins; 9 spikes + dual-lane handoff plan authored; Hetzner CX23 provisioned |
| **2026-05-12 → 2026-05-14 (Lane L active)** | Lane L ships v0.5.5 offline mode + v0.5.6 app-shell SW + DIAG-1..4 fixes; Lane L authors AB v1+v2, Graph v1, Offline v1+v2+v3 plans |
| 2026-05-13 | Lane L authors `Handover_docs_13_05_2026/` (offline-mode v0.6.x complete) |
| **2026-05-14 (Lane C resumes)** | Lane C completes Phase A: SSH access established (3-hour saga), server hardened, sqlite-vec smoked clean on glibc 2.39 |
| **2026-05-14 evening** | Lane C: budget-host pivot ($10 Lightsail rejected); Hetzner CX23 Helsinki at $5.59 picked; OpenRouter deep research; v0.6.0 plan v1.0 drafted with provider-agnostic LLM wrapper |
| **2026-05-14 22:30 (handover authored)** | This package + executive summary committed (`aa0f417`); user instructs end-of-dual-lane and merge handover |

## 2. Recurring themes

1. **Branch-confusion bug.** Two consecutive Lane C sessions started on `lane-l/feature-work` despite explicit memory entry (`project_ai_brain_dual_lane.md`), prior action items (`[VERIFY]` directive in `Handover_docs_12_05_2026/09_Next_Actions_Per_Lane.md`), and the dual-agent handoff plan rule. Both sessions wrote files to the wrong branch first, then noticed the divergence only when running the running-log skill (which forced `git status`). This is a **behaviour problem, not a knowledge problem** — see §3.1.
2. **Hetzner UI bugs cost ~3 hours during Phase A.** SSH key UI silently let the user skip key attachment (yellow `!` warning, no enforcement); password reset displayed credentials but `PasswordAuthentication no` is Ubuntu 24.04's default sshd setting; private-key passphrase blocked AI from driving SSH. None of these are documented gotchas — they were learned the hard way and are now in `Handover_docs_12_05_2026/05_Project_Retrospective.md`.
3. **Shipping-then-fixing on user-visible paths.** Lane L's v0.5.2 → v0.5.3 cycle (SameSite tightening that didn't fix the bug; CapacitorHttp.enabled was the real fix) is exactly the pattern the prior retrospective flagged. Memory entry `feedback_empirical_evidence_first.md` was added to make this stick.
4. **Plan-first-then-execute discipline holds when followed.** Every release that went through Stage 4 cross-AI review + self-critique landed clean. Releases that were one-pass plans needed mid-implementation rewrites. Lane L's offline plan (v1 → v2 → v3, 17 critique gaps + 9 critique gaps) and AB plan (v1 → v2, 17 gaps) prove the value of the cycle.
5. **Two-lane parallelism worked for ~3 days but is now over-extended.** The dual-lane setup paid off for cloud-migration research (Lane C) and offline-mode shipping (Lane L) in parallel. By 2026-05-14 the lanes' work surfaces have grown to where shared-file conflicts (RUNNING_LOG, plans/, secrets) are creating coordination overhead that now exceeds the parallelism gain. The collapse is the right call.

## 3. Incident / bug index

| File | Title (from report H1) |
|------|------------------------|
| (no formal Bug_Report directory in this project) | — |

This project does not maintain `Bug_Report/` files; bug records live in:

| Source | Where |
|--------|-------|
| Recent fixes | Git commit messages on `lane-l/feature-work` (DIAG-1..4 commits, SHELL-1..7 commits, OFFLINE-1..12 commits) |
| Plan self-critiques | `docs/plans/v0.6.x-*-SELF-CRITIQUE*.md` files |
| Empirical investigation reports | `docs/research/inspect-webview-output-*.md`, `docs/research/automate-webview-devtools-*.md` |
| Running log | `RUNNING_LOG.md` self-critique sections (each entry ends with one) |

## 4. Mitigations already in place

| Issue class | Mitigation |
|-------------|------------|
| Branch confusion | Memory entry `project_ai_brain_dual_lane.md` says "check git branch on session start"; failed twice. **Stronger mitigation needed:** the agent prompt itself should require `git branch --show-current` as a literal first action. Recommend the next agent add this to `CLAUDE.md` in the project root |
| Empirical evidence first | Memory entry `feedback_empirical_evidence_first.md` enforces "UI/WebView/APK/extension fixes need DevTools or chrome://inspect evidence before code change" |
| Plan one-pass syndrome | Self-critique-driven multi-version plans (v1 → v2 → v3) are now the norm; both Lane C and Lane L use this pattern |
| Mac sleep = Brain offline | v0.6.0 cloud migration moves backend to always-on Hetzner |
| Multi-tenant security risk | Single-user invariant explicitly locked in `Handover_docs_12_05_2026/01_Architecture.md §10` |
| API price cap blowout | `docs/research/v0.6.0-cost-summary.md` recommends $5/mo Anthropic hard cap; alerting documented |

## 5. Watch-outs for the next agent

### 5.1 Branch confusion is the single biggest risk

This rule has failed **twice in a row** despite three layers of documentation (memory + handover doc + prior action items). Treat it as a systemic agent-behaviour failure, not a soft preference.

**Mitigation for the merge:** the merge work is `main`-branch work. Run `git branch --show-current` as your literal first command. If it doesn't return `main` (or whichever working branch you're using for the merge), **stop and switch**. A `git merge` from the wrong branch silently produces a different result.

### 5.2 Stash@{1} is half-absorbed

[`stash@{1}` (`lane-c session leftovers`)](../../) contains the v0.6.0 plan, OR research, and RUNNING_LOG entry — all three of which are **already in commit `c2a71a4`**. It also contains 2 noise files (`public/offline.html` +1 line, `SwiftBar/brain-health.30s.sh` symlink) that belong to Lane L's surfaces and were intentionally NOT committed.

**Action:** do NOT `git stash apply stash@{1}` after the merge. Doing so would attempt to re-add files that already exist in the merged main. Drop it after confirming the merged main has both the plan and the OR research at the expected paths.

### 5.3 Stash@{3} contains the only unique tracked content

[`stash@{3}` (`lane-l-WIP-edges-and-android`)](../../) contains:
- `android/app/capacitor.build.gradle` + `android/capacitor.settings.gradle` (8 lines, gradle regenerated by Capacitor sync)
- `src/db/migrations/009_edges.sql` (untracked) — Lane L's Graph v2.1 schema
- `Handover_docs/Handover_docs_11_05_2026/` (untracked) — likely stale, review before retaining

**Action:** apply on merged branch with `git stash apply --index stash@{3}`. The migration `009_edges.sql` is sequential to v0.6.0 plan's `008_batch_id.sql`; no conflict expected.

### 5.4 v0.6.0 plan has 4 known gaps

The plan committed in `c2a71a4` has 4 self-critique-flagged gaps that need fixing in plan v1.1:
1. `LLMProvider` interface untested against actual call sites
2. No live Anthropic API smoke before Phase D deploy (Phase C-11 needed)
3. No Mac SQLite tar archive before rsync (Phase D-12-pre needed)
4. Anthropic monthly hard cap is $5/mo (per cost summary) but actual usage is ~$0.26/mo — should it be tightened to $3/mo?

These are documented in the `2026-05-14 21:05` RUNNING_LOG entry's action items. **Apply the fixes BEFORE running Stage 4 cross-AI review** — reviewing v1.0 with known gaps wastes a round-trip.

### 5.5 Hetzner box is configured but completely empty

Phase A hardened the box but installed nothing app-related. There's no Brain code, no SQLite, no cloudflared tunnel, no systemd unit. The Mac is still the production backend. Nothing about the lane-collapse merge changes this; the cutover is Phase D-13 of the v0.6.0 plan, which happens AFTER the merge AND AFTER Phase B + C ship.

### 5.6 Memory file `project_ai_brain_dual_lane.md` becomes obsolete after collapse

After the merge, append a NEW memory entry: `project_ai_brain_lane_collapse.md` recording that the dual-lane phase ended on `YYYY-MM-DD` with a final `lane-collapse-YYYY-MM-DD` tag. Mark `project_ai_brain_dual_lane.md` as superseded (keep it for history; don't delete).

### 5.7 The 4 SSH keys, gpg passphrase, and bearer token live in 1Password

Never paste these into any handover, plan, or commit message. The user's 1Password vault is the source of truth. If you need to verify a key works (e.g., the Hetzner SSH key), the verification COMMAND can go in a doc, but the KEY itself cannot.

### 5.8 The Lane L `RUNNING_LOG.md` divergence is intentional

After the collapse, Lane L's RUNNING_LOG.md does NOT need to be merged with Lane C's separately. The merge of `lane-l/feature-work` into the post-Lane-C `main` will produce a 3-way merge conflict in RUNNING_LOG.md. Resolve by interleaving entries chronologically. See [`07_Deployment_and_Operations.md §3.3`](./07_Deployment_and_Operations.md) for the exact resolution.

## 6. Related reading

- [`HANDOVER.md`](./HANDOVER.md) — executive summary
- [`Handover_docs_12_05_2026/05_Project_Retrospective.md`](../Handover_docs_12_05_2026/05_Project_Retrospective.md) — pre-Lane-L retrospective
- [`Handover_docs_13_05_2026/`](../Handover_docs_13_05_2026/) — Lane L's own snapshot (offline-mode focused)
- `RUNNING_LOG.md` — full append-only journal (32 entries at handover)
