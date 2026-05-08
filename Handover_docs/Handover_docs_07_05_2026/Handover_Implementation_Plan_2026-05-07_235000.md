# Handover implementation plan — AI Brain

| Field | Value |
|-------|--------|
| **Created** | 2026-05-07T23:50:00+05:30 |
| **Package folder** | [./](./) |
| **Supersedes** | (none — first handover for this project) |
| **Mode** | **Full** — this is the first structured handover package for AI Brain. |

## Purpose

Control document for this handover bundle. Reading order: **M0** (this file) → **M1–M5** (foundation + planning + history) → **M6** (README) → **M7–M9** (operations).

This package captures the state of AI Brain **immediately after shipping v0.3.0 Intelligence** (commit `5d1c390` on `main`, pushed to `arunpr614/ai-brain`). It is the snapshot a new AI agent needs to continue the project from v0.3.1 polish onward, or to resume from a cold session.

## Package status

| Field | Value |
|-------|--------|
| **Handover complete** | Yes — 2026-05-07 |
| **What "complete" means** | **Documentation only.** Does not imply product verification sign-off, formal QA, or a user-facing release. Product evidence lives in [`RUNNING_LOG.md`](../../RUNNING_LOG.md) and [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md). |
| **Outstanding product work** | F-207 bulk-ops UI (library multi-select) deferred to v0.3.1. Title hyphenation quirk (Qwen 2.5 outputs `Growth-Loops-Messy-Draft` from filename slugs) noted for v0.3.1 post-processing. Inline tag editor on item detail page pending. [`src/components/collection-editor.tsx`](../../src/components/collection-editor.tsx) exists but is not yet wired into `src/app/items/[id]/page.tsx`. |

## Table of contents

| Milestone | Artifact | Description |
|-----------|----------|-------------|
| **M0** | This file | Control doc, TOC, DoD, dependency order |
| **M1** | `01_Architecture.md` | Topology, data flows, SoT table |
| **M2** | `02_Systems_and_Integrations.md` | Runtimes, services, external APIs |
| **M3** | `03_Secrets_and_Configuration.md` | Secret names, operational rules, local dev |
| **M4** | `04_Implementation_Roadmap_Consolidated.md` | Roadmap pointers, release matrix, gates |
| **M5** | `05_Project_Retrospective.md` | Timeline, bugs, mitigations, watch-outs |
| **M6** | `README.md` | Start-here index, manifest, lineage |
| **M7** | `06_Handover_Current_Status.md` | Built vs open, next actions, evidence |
| **M8** | `07_Deployment_and_Operations.md` | Local dev procedures, smoke tests, mistakes |
| **M9** | `08_Debugging_and_Incident_Response.md` | Playbooks, symptoms, logging |

## Dependency order

1. **Architecture (M1)** grounds terminology: Next.js 16 App Router + SQLite + Ollama + optional Capacitor APK.
2. **Systems (M2)** names concrete components (Ollama, better-sqlite3, sqlite-vec, Readability, unpdf, JSZip).
3. **Secrets (M3)** stays consistent with M1–M2 — pre-v1.0.0 the app is local-only; the only "secret" is the user PIN (hashed).
4. **Roadmap (M4)** references `BUILD_PLAN.md`, `ROADMAP_TRACKER.md`, and the research spikes under `docs/research/`.
5. **Retrospective (M5)** gives incident + decision history; depends on M1–M4 terminology.
6. **README (M6)** is the navigation hub — accurate manifest depends on M1–M5 being written.
7. **Current Status (M7)** references `PROJECT_TRACKER.md` and `RUNNING_LOG.md` for evidence.
8. **Deployment (M8)** is currently **local-only**: `npm run dev` + SQLite file. No cloud deploy until v1.0.0.
9. **Debugging (M9)** when things break during development.

## Definition of done (per artifact)

| Artifact | Done when |
|----------|-----------|
| **M0** | TOC lists all files; dependency order documented; DoD rows filled; global rules stated |
| **M1** | Mermaid topology diagram present; data flows for URL/PDF/Note capture + enrichment queue; SoT table with ≥3 rows; decisions section |
| **M2** | Runtime stack table; components table with persistent-state column; external services (Ollama only, pre-v1.0.0) |
| **M3** | No real secrets; PIN auth + HMAC cookie keys documented by name only; operational rules for backup and DB path |
| **M4** | Points at `BUILD_PLAN.md`, `ROADMAP_TRACKER.md`, `PROJECT_TRACKER.md`; release matrix through v1.0.0 gate; research spike index |
| **M5** | Compressed timeline of this session; decisions (D-1..D-3); watch-outs for next agent; key bug/fix index |
| **M6** | Start-here order; full manifest table; lineage (first handover); repo root declared as `../../` |
| **M7** | Built/deployed table with evidence pointers; immediate next actions numbered; current commit pinned |
| **M8** | Local dev procedures with numbered steps; migration order; pre-commit checklist; mistake matrix |
| **M9** | Symptom-to-cause table covers the top session incidents (Ollama down, stale Turbopack cache, schema drift, etc.) |

## Global rules

1. **No secrets.** Names and `<placeholder>` patterns only. The repo is public at `github.com/arunpr614/ai-brain`, so assume any file here is world-readable.
2. **Repo-relative links** from this handover folder. Project root is `../../`. Files in `docs/research/` live at `../../docs/research/`.
3. **Replace placeholders.** `<pin>` for the user PIN, `<session-secret>` for the HMAC signing key.
4. **Markdown style guide:**
   - Backticks for: filenames (`src/db/client.ts`), function names (`enrichItem`), env vars (`OLLAMA_HOST`), commands (`npm run dev`)
   - **Bold** for: milestones (**M0**–**M9**), severity (**P0**, **P1**, **P2**), status (**draft**, **live**, **shipped**)
   - `**Bold code**` for emphasized flags (`**--max-old-space-size=8192**`)
   - Versioned artifact links: `[title](path) (version, **status**)`
5. **Severity language:** **P0** = blocking / data loss; **P1** = degraded but workaround exists; **P2** = cosmetic / low impact.
6. **SoT markers:** Use `**(SoT: code)**` when citing code as authoritative over docs. In this project, code in `src/` is authoritative; planning docs (`BUILD_PLAN.md`, `DESIGN.md`) describe intent.
7. **Evidence triples:** `[doc](path) (version, **status**) — see [code](path)` for major citations.
8. **Commit pinning:** All evidence assumes HEAD = `5d1c390` on `main` at handover time. Re-verify with `git log --oneline -1` before acting.

## Milestone mapping

| Plan milestone | Output file |
|----------------|-------------|
| M0 | `Handover_Implementation_Plan_2026-05-07_235000.md` |
| M1 | `01_Architecture.md` |
| M2 | `02_Systems_and_Integrations.md` |
| M3 | `03_Secrets_and_Configuration.md` |
| M4 | `04_Implementation_Roadmap_Consolidated.md` |
| M5 | `05_Project_Retrospective.md` |
| M6 | `README.md` |
| M7 | `06_Handover_Current_Status.md` |
| M8 | `07_Deployment_and_Operations.md` |
| M9 | `08_Debugging_and_Incident_Response.md` |
