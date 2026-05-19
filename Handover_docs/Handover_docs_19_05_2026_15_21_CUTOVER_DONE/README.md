# Handover package — `Handover_docs_19_05_2026_15_21_CUTOVER_DONE`

**Status:** Complete as of 2026-05-19 15:30 IST — AI Brain v0.6.0 cutover D-13 + D-14 shipped.
**Purpose:** Onboard the next agent with the **delta** from the half-state baseline to the cutover-complete state.

> **Required prior reading:** [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) — this package is **additive** and does not replace the baseline for full architecture, secret inventory, or topology context. Read the baseline first.

## Folder name vs file dates

The folder name (`Handover_docs_19_05_2026_15_21_CUTOVER_DONE`) is the **tranche identifier** — it stays fixed even if individual files are later revised. Per-file `Date` fields reflect the most recent edit. Do not rename the folder for date drift; bump the file **Version** field instead.

## Start here (fastest path to "ready to continue")

If you only have time for 3 files: **README → M7 → M0**. That tells you the cutover shipped, what's open, and how to navigate the rest.

1. [Handover_Implementation_Plan_2026-05-19_153000.md](./Handover_Implementation_Plan_2026-05-19_153000.md) — **M0** control doc + reading order
2. [06_Handover_Current_Status.md](./06_Handover_Current_Status.md) — **M7** — load-bearing operational state
3. [01_Architecture.md](./01_Architecture.md) — **M1** — post-cutover topology (Mermaid)
4. [04_Implementation_Roadmap_Consolidated.md](./04_Implementation_Roadmap_Consolidated.md) — **M4** — D-15..D-18 status
5. [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — **M8** — operational procedures (deploy, rollback, ingress edit)
6. [05_Project_Retrospective.md](./05_Project_Retrospective.md) — **M5** — patterns + watch-outs (READ before any architecture change)
7. [02_Systems_and_Integrations.md](./02_Systems_and_Integrations.md) — **M2** — services delta
8. [08_Debugging_and_Incident_Response.md](./08_Debugging_and_Incident_Response.md) — **M9** — symptom table (silent 404, etc.)
9. [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — **M3** — secrets delta + Phase E queue

## Full file manifest

| File | Topic |
|------|-------|
| `Handover_Implementation_Plan_2026-05-19_153000.md` | M0 — Control doc |
| `01_Architecture.md` | M1 — Post-cutover topology |
| `02_Systems_and_Integrations.md` | M2 — Services delta |
| `03_Secrets_and_Configuration.md` | M3 — Secrets delta |
| `04_Implementation_Roadmap_Consolidated.md` | M4 — Phase D progress |
| `05_Project_Retrospective.md` | M5 — Session patterns + watch-outs |
| `06_Handover_Current_Status.md` | M7 — Built/open/next-actions |
| `07_Deployment_and_Operations.md` | M8 — Cutover-complete runbook |
| `08_Debugging_and_Incident_Response.md` | M9 — Symptom table + playbooks |
| `README.md` | M6 — This file |

## What this tranche adds vs baseline

| Topic | Baseline (13:47) | This delta (15:21) |
|-------|------------------|---------------------|
| Cutover state | D-12 partial, D-13/D-14 not run | **D-12 + D-13 + D-14 all shipped** |
| Stuck transcripts | 2 of 8 items un-embedded | **All 8 embedded; 81 chunks; 81 vec rows** |
| Decisions A/B/C | Punted to next agent | **A2 + B1 + C3** (resolved) |
| Bug 1 (WAL leak) | Documented but not fixed | **Fixed + committed `1413f9b`** |
| Mac brain | Claimed "✅ active" | **Diagnosed: was on :3099 not :3000; killed in D-14** |
| brain.arunp.in CNAME | Mac UUID | **Hetzner UUID** (flipped 09:36:57 UTC) |
| Hetzner cloudflared ingress | Only `brain-staging.arunp.in` | **Both `brain.arunp.in` + `brain-staging.arunp.in`** |
| Gemini API tier | Free | **Paid** |
| Open decisions | A/B/C | **D-15..D-18 user-side validation** + Phase E secret rotation |

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
| [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) | **Baseline for this delta** — half-state, 3 punted decisions |
| **Handover_docs_19_05_2026_15_21_CUTOVER_DONE** (this folder) | Cutover-complete delta |

## Repo root for this project

Relative path from this folder to project root: `../../`
Relative path to Mac repo working tree: `../../`
Relative path to RUNNING_LOG: `../../RUNNING_LOG.md`

## Verify links (optional)

```bash
cd Handover_docs/Handover_docs_19_05_2026_15_21_CUTOVER_DONE
npx markdown-link-check *.md
```

External URLs may fail offline; internal links should all resolve.
