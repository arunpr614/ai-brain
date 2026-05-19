# Handover package — `Handover_docs_19_05_2026_19_34_V061_T1_T4_DONE`

**Status:** Complete as of 2026-05-19 19:34 IST.
**Purpose:** Onboard the next agent with the **delta** from the cutover-complete state to the v0.6.1 Cloud-Cleanup phase opening (T-1..T-4 deployed, 16 tasks remaining).

> **Required prior reading (in order):**
> 1. [`Handover_docs_19_05_2026_13:47/`](../Handover_docs_19_05_2026_13:47) — pre-cutover baseline (architecture, secrets, original cutover runbook).
> 2. [`Handover_docs_19_05_2026_15_21_CUTOVER_DONE/`](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE) — Mac→Hetzner cutover shipped.
> 3. **This package** — v0.6.1 phase opened, T-1..T-4 deployed.
>
> This delta is **additive**. It does not replace either prior tranche.

## Folder name vs file dates

The folder name `Handover_docs_19_05_2026_19_34_V061_T1_T4_DONE` is a fixed tranche identifier — keep it stable even if individual files are later revised. Per-file `Date` fields reflect the most recent edit. Per the skill spec, do not rename the folder for date drift; bump the file `Version` field instead.

## Start here (fastest path)

If you only have time for 3 files: **README → M0 → M7**. That tells you the tranche shape, the implementation plan, and the live operational state.

1. [Handover_Implementation_Plan_2026-05-19_193400.md](./Handover_Implementation_Plan_2026-05-19_193400.md) — **M0** control doc + reading order
2. [06_Handover_Current_Status.md](./06_Handover_Current_Status.md) — **M7** load-bearing state
3. [04_Implementation_Roadmap_Consolidated.md](./04_Implementation_Roadmap_Consolidated.md) — **M4** v0.6.1 task DAG
4. [01_Architecture.md](./01_Architecture.md) — **M1** what's new in the request pipeline
5. [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — **M8** corrected rsync (load-bearing fix)
6. [05_Project_Retrospective.md](./05_Project_Retrospective.md) — **M5** patterns + watch-outs (read before any architecture change)
7. [02_Systems_and_Integrations.md](./02_Systems_and_Integrations.md) — **M2** services delta (none new, only config)
8. [08_Debugging_and_Incident_Response.md](./08_Debugging_and_Incident_Response.md) — **M9** four new symptom→cause rows
9. [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — **M3** `BRAIN_API_TOKEN` rename queue + Phase E

## Full file manifest

| File | Topic |
|------|-------|
| `Handover_Implementation_Plan_2026-05-19_193400.md` | M0 — Control doc |
| `01_Architecture.md` | M1 — Security-header layer + Secure cookie |
| `02_Systems_and_Integrations.md` | M2 — Services unchanged; config delta only |
| `03_Secrets_and_Configuration.md` | M3 — `BRAIN_API_TOKEN` rename sequencing (T-11) |
| `04_Implementation_Roadmap_Consolidated.md` | M4 — v0.6.1 20-task table + DAG + acceptance gate |
| `05_Project_Retrospective.md` | M5 — Today's session patterns + watch-outs |
| `06_Handover_Current_Status.md` | M7 — Built/open/next-actions |
| `07_Deployment_and_Operations.md` | M8 — Corrected 3-tree rsync recipe |
| `08_Debugging_and_Incident_Response.md` | M9 — 4 new symptom→cause rows |
| `README.md` | M6 — This file |

## What this tranche adds vs cutover-done

| Topic | Cutover-done (15:21) | This delta (19:34) |
|-------|----------------------|---------------------|
| Active phase | v0.6.0 done; D-15..D-18 user-side pending | **v0.6.1 Cloud-Cleanup OPENED**; T-1..T-4 deployed |
| Setup page privacy claim | "AI Brain never talks to anything outside your Mac" (false) | **Honest disclosure** of Hetzner + Anthropic + Google |
| Session cookie | `Secure` flag deferred since v0.5.0 | **`secure: NODE_ENV==='production'`** in production |
| Public security headers | none | **4 headers** (XFO, nosniff, Referrer-Policy, HSTS 2y) |
| Bearer-rejection logs | no client IP | **`cf_ip` field** included |
| Phase planning | none | [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md) (20 tasks, 12-criterion gate) |
| Audit reports | none | Two passes: `.planning/legacy-feature-audit.md` + `-v2.md` v2.1 |
| Tracker docs | unchanged | ROADMAP_TRACKER v0.9.3, PROJECT_TRACKER v0.9.2, BACKLOG v7.3 |
| Deploy recipe | `.next/standalone/` only (incomplete) | **Corrected** to 3-tree rsync (standalone + .next/static + public) |
| Mac unit tests | broken (carry-over) | Documented in BACKLOG; deferred to v0.6.3 |
| RUNNING_LOG | entry #44 | entry #45 added |

## Lineage (sibling folders)

| Folder | Notes |
|--------|-------|
| [Handover_docs_07_05_2026](../Handover_docs_07_05_2026) | Pre-Phase A baseline |
| [Handover_docs_12_05_2026](../Handover_docs_12_05_2026) | Phase A complete |
| [Handover_docs_13_05_2026](../Handover_docs_13_05_2026) | Phase B in flight |
| [Handover_docs_14_05_2026_LANE](../Handover_docs_14_05_2026_LANE) | Pre-collapse dual-lane state |
| [Handover_docs_15_05_2026_LANE_COLLAPSE](../Handover_docs_15_05_2026_LANE_COLLAPSE) | Lane collapse to main |
| [Handover_docs_15_05_2026_PHASE_C_KICKOFF](../Handover_docs_15_05_2026_PHASE_C_KICKOFF) | Phase C kickoff context |
| [Handover_docs_16_05_2026_PHASE_D_KICKOFF](../Handover_docs_16_05_2026_PHASE_D_KICKOFF) | Phase D kickoff |
| [Handover_docs_19_05_2026_PHASE_D_PROGRESS](../Handover_docs_19_05_2026_PHASE_D_PROGRESS) | **STALE** — pre-D-12 attempt |
| [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) | Pre-cutover baseline (3 punted decisions) |
| [Handover_docs_19_05_2026_15_21_CUTOVER_DONE](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE) | **Cutover shipped** (D-12..D-14) |
| **Handover_docs_19_05_2026_19_34_V061_T1_T4_DONE** (this folder) | v0.6.1 phase open + T-1..T-4 deployed |

## Repo root for this project

Relative path from this folder to project root: `../../`
RUNNING_LOG: `../../RUNNING_LOG.md`

## Verify links (optional)

```bash
cd Handover_docs/Handover_docs_19_05_2026_19_34_V061_T1_T4_DONE
npx markdown-link-check *.md
```

External URLs may fail offline; internal links should all resolve.
