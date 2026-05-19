---
Title: AI Brain Handover — Implementation Plan (M0)
Version: 1.0
Date: 2026-05-19
Previous version: n/a (full-mode handover)
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This is the index file. Read `README.md` first for the recommended traversal order. The handover documents AI Brain at a partially-complete v0.6.0 cutover state — DB on Hetzner, 6/8 items re-embedded, two blockers pending decision, Mac still serving the live URL. **Do not run `cutover.sh cutover` again before reading 06_Handover_Current_Status.md** — there are two known bugs that will reproduce.

# 1. Purpose

Provide a self-contained AI-to-AI continuity package for AI Brain at the point where the v0.6.0 Mac→Hetzner cutover is partially complete and blocked on free-tier Gemini embedding rate limits. The next agent should be able to resume work without rebuilding context from conversation history.

# 2. Scope

| Aspect | In scope | Out of scope |
|---|---|---|
| Project | AI Brain (single-user knowledge app) | Other Arun_AI_Projects (Open Brain Web, Lenny imports) |
| Phase | v0.6.0 cloud migration, Phase D (deploy + cutover) | v0.6.x, v0.7.0 |
| State | D-1..D-11 ✅, D-12 partial, D-13/D-14 pending decision, S-13 shipped | D-15..D-18 (post-cutover validation) — guidance only |
| Audience | Next AI agent OR experienced developer continuing the cutover | New project members unfamiliar with prior handovers |

# 3. What "complete" means

| Aspect | Status now |
|---|---|
| Documentation done | ✅ this package complete |
| Code shipped | ✅ all session code at `main @ 95259f1`, pushed to origin |
| Product verified | ❌ cutover incomplete; 2 items un-embedded; D-13/D-14 unrun |
| Production cutover | ❌ `brain.arunp.in` still on Mac |
| 24h validation | ❌ not started |

**Handover complete ≠ product verified.** This documentation captures the moment; resuming the cutover is a separate work effort gated on decisions documented in M6.

# 4. Files in this package

Files are numbered for traversal order. M0 (this file) is the index; M6 is the README.

| # | File | Purpose |
|---|---|---|
| M0 | [Handover_Implementation_Plan_2026-05-19_134700.md](Handover_Implementation_Plan_2026-05-19_134700.md) | This index + global rules |
| M1 | [01_Architecture.md](01_Architecture.md) | System topology + Mermaid diagram |
| M2 | [02_Systems_and_Integrations.md](02_Systems_and_Integrations.md) | External vendors + integration surfaces |
| M3 | [03_Secrets_and_Configuration.md](03_Secrets_and_Configuration.md) | Env vars, keys, rotation queue |
| M4 | [04_Implementation_Roadmap_Consolidated.md](04_Implementation_Roadmap_Consolidated.md) | Phase D progress + remaining tasks |
| M5 | [05_Project_Retrospective.md](05_Project_Retrospective.md) | Session learnings + 3 deployment bugs |
| M6 | [README.md](README.md) | Reading order + first-action checklist |
| M7 | [06_Handover_Current_Status.md](06_Handover_Current_Status.md) | Half-state snapshot + open decisions |
| M8 | [07_Deployment_and_Operations.md](07_Deployment_and_Operations.md) | Cutover runbook + bug fixes |
| M9 | [08_Debugging_and_Incident_Response.md](08_Debugging_and_Incident_Response.md) | Diagnostic recipes for known issues |

# 5. Global rules

## 5.1 Path conventions
Repo-relative paths from this handover folder use `../../` to reach project root. Absolute paths only when referencing system files (e.g., `/etc/brain/.env`, `/opt/brain/`).

## 5.2 Markdown style
- `backticks` for filenames, function names, env vars, commands
- **bold** for milestones (e.g., **D-12**), severity, status
- `**bold-code**` for emphasized commands
- Numbered steps for procedures (AI agents reproduce numbered steps more reliably than bullets)
- Tables for state snapshots, decisions, comparisons

## 5.3 Source-of-truth marking
When docs disagree with code, code is authoritative. Mark with `**(SoT: code)**` inline. SoT tables in M1 (mandatory), M2 + M4 + M5 where relevant.

## 5.4 Evidence pointer triple format
`[doc-name](path) (version, **status**) — see [code](path)`. Both the doc reference AND the authoritative code location, so the next agent can verify either.

## 5.5 Secret hygiene
- No `.env` values in any file
- No API key literals (use `<placeholder>`)
- No webhook secrets
- No system prompts from production
- Names + placeholder patterns only

## 5.6 Date precision
All timestamps in IST (Asia/Kolkata, UTC+5:30) unless explicitly stated otherwise. Format: `YYYY-MM-DD HH:MM`.

# 6. Definition of done for this handover

- [x] All 10 files created
- [x] M1 includes a Mermaid topology diagram
- [x] M0 + M6 cross-reference siblings correctly
- [x] No secrets pasted
- [x] Half-state explicitly documented in M6 + M7
- [x] Two pending decisions explicitly punted to next agent
- [x] Three known bugs (cutover.sh WAL leak, backfill --reset wipe, Gemini TPM) documented with reproducers + fixes in M8 + M9
- [x] Repo-relative links work
- [x] Tasks 1–5 of M9 are independently actionable

# 7. Repo HEAD at handover

| Property | Value |
|---|---|
| Branch | `main` |
| HEAD | `95259f1` (`fix(S-13): correct factory export name in backfill-embeddings.mjs`) |
| Pushed | ✅ all session commits at origin/main |
| Tags pushed | `phase-d-blocked-on-embeddings/v0.6.0` (revert anchor at `5e39d32`) |
| Working tree | **dirty** — `src/lib/embed/gemini.ts` modified (serial loop + 1.1s delay) |
| Stash | empty |

# 8. Reading order summary

If new to the project: M6 → M1 → M0 → M7 → M8 → M9.
If continuing work: M6 → M7 → M8 (cutover.sh bugs) → M9 (Gemini blocker) → M4.
