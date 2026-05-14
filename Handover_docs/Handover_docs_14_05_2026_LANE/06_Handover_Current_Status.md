# AI Brain: Current status (handover — 2026-05-14 lane-collapse handoff)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/06_Handover_Current_Status.md](../Handover_docs_12_05_2026/) (note: 12_05 used a different file order; this file maps to `09_Next_Actions_Per_Lane.md` in that package) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** Read this first for "where are we?" — what is built, what is open, and what you should do next. Numbered next actions in §3 are ordered by blast radius — do them in order.

## 1. What is built and deployed

| Area | Status | Notes |
|------|--------|-------|
| **Mac production stack** | **Live + verified** | Next.js + Ollama + SQLite serving `brain.arunp.in` via Cloudflare tunnel; fully operational; APK + extension paired |
| **v0.5.6 app-shell SW** | **Shipped (Lane L)** | `46d7c5c chore(release): v0.5.6 with app-shell SW`; DIAG-1..4 follow-up fixes landed up to `c944387` |
| **v0.5.5 offline mode** | **Shipped (Lane L)** | IndexedDB outbox + sync-worker + share-handler + a11y nav badge |
| **v0.5.4 extension polish** | **Shipped (Lane L)** | Per `package.json` history |
| **Hetzner CX23 server** | **Hardened, idle** | `204.168.155.44` Helsinki; Phase A complete in commit `fe197af`. SSH key-only, brain user, UFW deny inbound, Node 20.20.2, sqlite-vec smoked clean |
| **`Handover_docs_12_05_2026/`** | **Live (committed)** | Full 10-file Option-C handover package; baseline for post-v0.6.0 architecture |
| **v0.6.0 plan v1.0** | **Drafted, NOT locked** | `docs/plans/v0.6.0-cloud-migration.md` in commit `c2a71a4`; awaiting Stage 4 review + sign-off |
| **OpenRouter evaluation** | **Live (committed)** | `docs/research/openrouter-provider-evaluation.md` in `c2a71a4`; verdict: Anthropic-direct primary, OR as standby |
| **Lane-collapse handover** | **Authoring complete** | This package + [`HANDOVER.md`](./HANDOVER.md) |

## 2. What is deferred or open

| Item | Source | Detail |
|------|--------|--------|
| **Lane collapse merge** | This handover | Two lanes (`lane-c/v0.6.0-cloud` + `lane-l/feature-work`) need to merge into `main`; see [`07_Deployment_and_Operations.md`](./07_Deployment_and_Operations.md) for procedure |
| **v0.6.0 plan Stage 4 review** | Plan v1.0 itself | Cross-AI review + self-critique + 4 known gap fixes + user sign-off → plan v1.1 lock |
| **Phase B-1..B-13** | v0.6.0 plan | Provider-agnostic LLM wrapper refactor (depends on plan lock) |
| **Phase C-1..C-10** | v0.6.0 plan | Daily batch + cron + migration 008_batch_id.sql |
| **Phase D-1..D-18** | v0.6.0 plan | Hetzner deploy + tunnel migration + cutover |
| **Phase E-1..E-8** | v0.6.0 plan | Cleanup + tag v0.6.0 |
| **v0.6.x AB execution** | `docs/plans/v0.6.x-augmented-browsing.md` v2 | AUG-1..7 — runs after v0.6.0 ships |
| **v0.6.x Graph v2 plan** | Lane L's last log entry (2026-05-13 21:17) | Plan v1 has 9 self-critique gaps; v2 outstanding + research doc `docs/research/graph-view-tooling.md` outstanding |
| **v0.6.x offline plan v3 review** | Lane L's last log entry | Drafted, unreviewed; needs self-critique + user review |
| **TaskList tasks #9, #10** | Project tracker | T-CF-11 AVD smoke + T-CF-14 physical Pixel smoke; v0.5.0 tasks, may be obsolete after v0.5.6 — verify before re-opening |
| **`Handover_docs_11_05_2026/`** | `stash@{3}` (untracked) | Pre-Lane-L snapshot; review and likely delete |
| **`SwiftBar/brain-health.30s.sh`** | Working tree (untracked) on lane-c | Symlink, optional Mac menu-bar widget; gitignore or document |

## 3. Immediate next actions (incoming agent)

In order — do them sequentially, not in parallel.

1. **Verify branch context.** Run `git branch --show-current`. If output is not `main`, switch (`git checkout main`). This is the literal first command. The branch-confusion bug has failed twice in a row; treat it as a hard violation, not a soft preference. See [`05_Project_Retrospective.md §5.1`](./05_Project_Retrospective.md).
2. **Read [`HANDOVER.md`](./HANDOVER.md) end-to-end** (~15 minutes). It's the executive summary; everything else in this package is supporting drill-down.
3. **Confirm the 5 open questions in `HANDOVER.md §11`** with the user before any merge command:
   - Strategy A (sequential merges) vs B (octopus)?
   - `Handover_docs_11_05_2026/` retain or drop?
   - Anthropic monthly hard cap $5/mo or $3/mo?
   - Tag the collapse?
   - Delete lane branches immediately or keep for 7 days?
4. **Run pre-merge baseline validation:**
   ```bash
   git checkout main
   git fetch --all
   git status --short    # must be clean
   npm test               # must be green; record count
   npm run typecheck      # must have zero errors
   ```
   If any of these fail on `main` BEFORE the merge starts, do not proceed. Surface to the user.
5. **Execute the merge per [`07_Deployment_and_Operations.md §2`](./07_Deployment_and_Operations.md)** (Strategy A recommended). Resolve the 3 markdown conflicts per §3 of that file.
6. **Run post-merge validation** per [`07_Deployment_and_Operations.md §5`](./07_Deployment_and_Operations.md) — 12-item checklist. Do NOT push if any item fails.
7. **Apply `stash@{3}`** for Lane L's `009_edges.sql` migration + gradle WIP. Drop `stash@{0}`, `stash@{1}`, `stash@{2}` per [`HANDOVER.md §2.2`](./HANDOVER.md).
8. **Push merged main** + tag if user confirmed tagging. Wait for CI green.
9. **Delete lane branches** (local + origin) if user confirmed immediate deletion; otherwise hold for 7 days.
10. **Append final `CLOSURE.md`** to this handover folder noting completion + final commit SHAs + any deviation from the documented plan.
11. **Update `STATE.md`** OWNERSHIP block — single-lane on `main`.
12. **Update `ROADMAP_TRACKER.md`** — v0.5.6 ✅ shipped; v0.6.0 Phase A ✅, Phase B–F pending.
13. **Add `RUNNING_LOG.md` entry** for the lane-collapse merge — single-agent now (no `[Lane X]` prefix).
14. **Append memory entry** `project_ai_brain_lane_collapse.md` recording end of dual-lane phase + tag SHA. Mark `project_ai_brain_dual_lane.md` superseded.
15. **Begin Stage 4 review of `docs/plans/v0.6.0-cloud-migration.md`** per [`04_Implementation_Roadmap_Consolidated.md §5`](./04_Implementation_Roadmap_Consolidated.md). Apply 4 known gap fixes BEFORE spawning cross-AI review agent.
16. **Continue Lane L's open plans** in priority order: Graph v2 plan + research doc → AB execution → offline plan self-critique. These run on `main` post-v0.6.0 ship.

## 4. Active endpoints (post-collapse, pre-v0.6.0 cutover — Mac-hosted)

| Path | Method | Auth | Notes |
|------|--------|------|-------|
| `/api/capture/url` | `POST` | Bearer | Article + YouTube capture |
| `/api/ask/stream` | `POST` | Bearer | SSE streaming Ask (Ollama-backed) |
| `/api/items/[id]/enrich` | `POST` | Bearer | Manual "Enrich now" |
| `/api/items` | `GET` | Bearer | List/filter |
| `/api/health` | `GET` | None | Lightweight; Lane L modified to bypass auth for `/sw.js` |
| `/sw.js` | `GET` | None | Service worker (Lane L v0.5.6) |
| `/inbox` | `GET` | Bearer | Outbox UI (Lane L v0.5.5) |
| `/settings/lan-info` | `GET` | Bearer | Token rotation + QR pairing |

After v0.6.0 cutover (Phase D-13), the same endpoints exist at the same paths; only the origin behind `brain.arunp.in` changes from Mac to Hetzner.

## 5. Program status line

`v0.5.6 shipped (Lane L) | v0.6.0 Phase A complete (Lane C) | Plan v1.0 drafted, Stage 4 pending | Lane-collapse handover authored 2026-05-14 | Active plan: docs/plans/v0.6.0-cloud-migration.md | Active tracker: ROADMAP_TRACKER.md | Backlog: BACKLOG.md`
