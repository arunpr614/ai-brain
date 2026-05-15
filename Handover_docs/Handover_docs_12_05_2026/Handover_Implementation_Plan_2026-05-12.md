# M0 — Handover Implementation Plan

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** Handover_docs_11_05_2026/ (full, v0.5.1-ship baseline)
**Baseline (this package extends):** full mode — stands alone; does NOT require reading the 2026-05-11 package, but it's a useful comparison for what changed.
**Package scope:** AI Brain project, state immediately after v0.5.1 shipped + v0.6.0 research complete + dual-lane split initiated
**Applies to:** both Lane C (cloud migration v0.6.0) and Lane L (local features) agents
**Status:** COMPLETE (documentation only — not a claim of code shipped or production verified)

> **For the next agent:** this package exists because the AI Brain project has temporarily split into two parallel AI-agent lanes. Start at `README.md` in this folder; it gives you per-lane reading order. Every file in this package applies to BOTH lanes unless explicitly marked. When a file splits by lane, sections are clearly labelled. "Handover complete" means these 10 docs are written — nothing about this handover implies v0.6.0 has shipped, the Hetzner migration is done, or Lane L has finished any backlog item. It means the next agent (whichever lane) has a ground-truth package to resume from.

---

## 1. Why this handover exists

This session (2026-05-12) crossed two major thresholds that warrant a fresh handover package:

1. **v0.6.0 research program complete.** All 9 spikes shipped (S-1..S-9) with follow-on budget-host research. The v0.6.0 plan is now ready to be drafted — but the underlying decisions (Hetzner Helsinki, Claude Haiku Batch + Sonnet realtime, Gemini embeddings, Backblaze B2 backups, gpg-before-upload encryption) are locked.
2. **Dual-lane split initiated.** The project temporarily runs two parallel agents:
   - **Lane C** (cloud migration v0.6.0) on branch `lane-c/v0.6.0-cloud`
   - **Lane L** (local feature development) on branch `lane-l/feature-work`

Both lanes need the same ground truth for what the codebase does today and what's decided. Splitting into separate handovers would risk drift. One package with per-lane sections keeps both agents on the same page.

## 2. What "complete" means here

| Dimension | Definition for this handover |
|---|---|
| Documentation | 10 files filled from conversation + code + existing docs, quality-checked |
| Code shipped | NOT IMPLIED. v0.6.0 plan not yet drafted. Hetzner server provisioned but not hardened. Lane L has not yet started. |
| Production verified | NOT IMPLIED. Migration cutover scheduled for a later session (03:00 IST window, per S-7 runbook). |
| Handover signed off | User sign-off on this package is the final gate — at which point both agents can work independently. |

## 3. Global rules for every file in this package

1. **Links are repo-relative** from this handover folder. To reach project root: `../../` (up out of `Handover_docs_12_05_2026/` → `Handover_docs/` → project root).
2. **Backticks** for `filenames`, `functions()`, env vars like `BRAIN_ENRICH_BATCH_MODE`, shell commands like `git fetch`.
3. **Bold** for **Lane C** / **Lane L**, **M0**–**M9** milestones, severity tags (**BLOCKING**, **HIGH**, **MEDIUM**, **LOW**), status (**COMPLETE**, **IN-PROGRESS**, **PENDING**, **BLOCKED**).
4. **`**bold code**`** (bold + backticks) for emphasized commands the next agent MUST run.
5. **No secrets.** Env var names are OK; values are NOT. API keys, tokens, bearer strings: never paste.
6. **Code is source of truth** when code and docs disagree — flagged inline with `**(SoT: code)**`.
7. **Evidence pointer triples** for citations: `[doc](path) (version, **status**) — see [code](path)`.
8. **Procedures are numbered**, not bulleted — AI agents follow numbers more reliably.

## 4. Reading order by audience

- **If you are Lane C (cloud):** M6 README → M0 (this) → M1 → M7 (runbook) → M9 (next actions, Lane C section) → M4 → M2 → M3 → M5 → M8
- **If you are Lane L (local):** M6 README → M0 (this) → M1 → M9 (next actions, Lane L section) → M4 → M2 → M3 → M5 → M7 → M8
- **If you are a single serial agent** (kill-switch triggered, lanes collapsed back): M6 → M0 → M1 → M9 (both sections) → rest in order.
- **If you are a human reviewer:** M6 README → M5 retrospective → M9 next actions. Skim the rest.

## 5. The 10 files

| # | File | Purpose | Applies to |
|---|---|---|---|
| M0 | `Handover_Implementation_Plan_2026-05-12.md` (this file) | The rules of this package + reading order | Both lanes |
| M1 | `01_Architecture.md` | System topology, data flow, tech stack, pre/post v0.6.0 | Both lanes |
| M2 | `02_Systems_and_Integrations.md` | External systems (Cloudflare, Anthropic, Gemini, B2, Hetzner) | Both lanes |
| M3 | `03_Secrets_and_Configuration.md` | Env-var catalog, secrets policy, no values | Both lanes |
| M4 | `04_Implementation_Roadmap_Consolidated.md` | Phase history, what shipped, what's next (per lane) | Both lanes |
| M5 | `05_Project_Retrospective.md` | Decisions locked this session, bets made, things that surprised me | Both lanes |
| M6 | `README.md` | Entry point — per-lane read order, quickstart | Both lanes |
| M7 | `07_Deployment_and_Operations.md` | Hetzner migration runbook, backups, rollback | Lane C primary; Lane L skim |
| M8 | `08_Debugging_and_Incident_Response.md` | Known issues, recovery playbook, who-owns-what during incidents | Both lanes |
| M9 | `09_Next_Actions_Per_Lane.md` | Lane C backlog + Lane L backlog, with explicit handoff items | Both lanes (read YOUR section) |

## 6. Evidence gathering done for this package

- **Conversation:** this session's full transcript (v0.6.0 research, budget-host pushback, dual-lane plan, Hetzner provisioning, SSH key problem)
- **Repo structure:** `src/` (app, api, components, db, lib with 18 sub-modules), `extension/` (Chrome MV3), `android/` (Capacitor APK), `scripts/` (smoke tests, build, backfill)
- **Git history:** last 20 commits scanned — 3 doc/research commits this session, all prior from v0.5.0 + v0.5.1 cycles
- **Existing docs:** `README.md`, `BUILD_PLAN.md`, `PROJECT_TRACKER.md`, `ROADMAP_TRACKER.md`, `FEATURE_INVENTORY.md`, `DESIGN.md`, `DESIGN_SYSTEM.md`, `BACKLOG.md`, `RUNNING_LOG.md`, all 9 `docs/research/*` artifacts from this session, `docs/plans/*`
- **Bug reports:** none open from user during the session
- **Prior handover:** `Handover_docs_11_05_2026/` — covers v0.5.1 ship + pre-split state. This package references it but stands alone.

## 7. Definition of Done (for this package)

- [x] 10 files created with 7-field metadata header
- [x] All files have `> **For the next agent:**` opener blockquote
- [x] Table-driven organization where applicable
- [x] Per-lane sections labelled clearly where split
- [x] Mermaid diagram in M1
- [x] SoT tables in M1, M2 where applicable
- [x] No secrets — placeholder pattern only
- [x] Numbered procedures (not bullets)
- [x] Cross-links validated (repo-relative from this folder)
- [x] M9 has explicit Lane C + Lane L sections
- [ ] User sign-off (the one gate only a human can close)

## 8. What's different from the 2026-05-11 baseline

1. **v0.6.0 research is COMPLETE.** 9 spike outputs + budget-host follow-up now live in `docs/research/`.
2. **Architecture is mid-pivot.** Current prod stack is Mac + Ollama local; post-v0.6.0 stack will be Hetzner Helsinki + Claude API + Gemini embeddings. M1 documents BOTH.
3. **New dependencies INCOMING** (not yet added to `package.json`): `@anthropic-ai/sdk`, `@google/generative-ai`. Flagged in M2.
4. **New branch topology.** `main` is still the trunk; `lane-c/v0.6.0-cloud` and `lane-l/feature-work` are the parallel lanes. Both pushed to `origin`.
5. **Running-log format changed.** Added Lane + Session ID + Cross-lane-notes sections. See M4.
6. **Hetzner server provisioned** at IP `204.168.155.44` (Helsinki, Ubuntu 24.04, 4GB RAM). Currently unreachable via SSH due to the SSH-key-not-selected issue — see M7 + M8.

## 9. Handover recipient quickstart

1. Clone or `git fetch origin` on `ai-brain` repo.
2. Check `git branch --show-current`:
   - `lane-c/v0.6.0-cloud` → you are Lane C
   - `lane-l/feature-work` → you are Lane L
   - `main` → ask the user which lane
3. Read M6 (README) for per-lane reading order.
4. Run the catch-up protocol from `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md §4.4` before writing code.
5. Before editing any "shared" file, check the OWNERSHIP BLOCK at top of `RUNNING_LOG.md`.
6. Before editing any "Lane-X-owned" file, confirm you are Lane X.
