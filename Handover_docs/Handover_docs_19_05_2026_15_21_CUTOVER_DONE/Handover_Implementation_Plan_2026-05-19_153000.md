# Handover implementation plan — AI Brain

| Field | Value |
|-------|--------|
| **Created** | 2026-05-19T15:30:00+05:30 |
| **Package folder** | [./](./) |
| **Supersedes** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (still required reading — see below) |
| **Mode** | **Additive** (extends `Handover_docs_19_05_2026_13:47` — does not replace it for architecture, secrets, or topology) |

## Purpose

Control document for this handover bundle. Reading order: **M0** (this file) → **M7** (06_Handover_Current_Status — fastest path to "what changed") → **M6** (README) → others by need.

> This tranche extends [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47). Read the baseline first for full context (architecture topology, secret inventory, runbook). The baseline was written ~2 hours before this one when the cutover was half-done.
>
> **This package adds:** the cutover-completion delta. D-13 (CNAME flip), D-14 (Mac brain stop), the resolved A/B/C decisions, the discovered `pipeline.ts` transaction-rollback bug, the new Hetzner cloudflared ingress entry, and the action plan for D-15..D-18 user-side validation.

## Package status

| Field | Value |
|-------|--------|
| **Handover complete** | Yes — 2026-05-19 15:30 IST |
| **What "complete" means** | **Documentation only.** Does not imply v0.6.0 product readiness or sign-off. v0.6.0 tag is gated on D-15..D-18 user-side validation (APK capture, Ask query, overnight batch, B2 backup smoke). |
| **Outstanding product work** | D-15..D-18 (4 validations); B2 backup script not yet wired; Phase E secret rotation; `tsx` runtime dep on Hetzner is a flagged zero-new-dep violation. |

## Table of contents

| Milestone | Artifact | Description |
|-----------|----------|-------------|
| **M0** | This file | Control doc, TOC, DoD, dependency order |
| **M1** | `01_Architecture.md` | Topology delta — Hetzner is now sole serving instance |
| **M2** | `02_Systems_and_Integrations.md` | Service delta — cloudflared ingress now lists both hostnames |
| **M3** | `03_Secrets_and_Configuration.md` | Secrets delta — Gemini paid tier now in effect; CF API token rotation queued for Phase E |
| **M4** | `04_Implementation_Roadmap_Consolidated.md` | Phase D progress — D-1..D-14 done; D-15..D-18 outstanding |
| **M5** | `05_Project_Retrospective.md` | New session learnings — 4 self-critiques; "ship today" drift pattern |
| **M6** | `README.md` | Start-here index, manifest, lineage |
| **M7** | `06_Handover_Current_Status.md` | The load-bearing file — what's live, what's open, next actions |
| **M8** | `07_Deployment_and_Operations.md` | Cutover-COMPLETE runbook + the cloudflared ingress gotcha |
| **M9** | `08_Debugging_and_Incident_Response.md` | New symptom: silent 404 from CF tunnel = missing ingress entry |

## Dependency order

This is a **delta**. The full topology, secret inventory, and runbook live in the baseline. Read order:
1. **Baseline M0** (`Handover_docs_19_05_2026_13:47/Handover_Implementation_Plan_2026-05-19_134700.md`) for original index
2. **This M0** (you are here) for what changed
3. **This M7** (`06_Handover_Current_Status.md`) for the load-bearing operational state
4. **Baseline M1–M3** for architecture / systems / secrets (still valid)
5. **This M4–M5** for roadmap progress + new lessons
6. **This M8–M9** when shipping or debugging

## Definition of done (per artifact)

| Artifact | Done when |
|----------|-----------|
| **M0** | TOC lists all files; "what changed since baseline" stated; dependency on baseline declared |
| **M1** | Mermaid topology updated: brain.arunp.in arrow points at Hetzner tunnel; SoT row added for cloudflared config |
| **M2** | New ingress entry documented; ports table reflects Hetzner-only serving |
| **M3** | Gemini paid-tier note added; CF API token rotation queued for Phase E |
| **M4** | D-13/D-14 marked **Shipped**; D-15..D-18 marked **Open** with checks |
| **M5** | Session self-critique themes captured; "ship today" pattern noted |
| **M6** | Lineage table extended; this folder declared additive to baseline |
| **M7** | Cutover state declared LIVE; immediate next actions numbered |
| **M8** | Cloudflared ingress fix added to runbook; rollback procedure includes Mac brain restart |
| **M9** | New symptom row added: silent 404 = missing tunnel ingress entry |

## Global rules

1. **No secrets.** Names and `<placeholder>` patterns only. Never paste `.env` values, tokens, or full prompts. The CF API token used in this session was passed in chat per user authorization and should be rotated in Phase E.
2. **Repo-relative links** from this handover folder. Use `../../` to reach project root.
3. **Replace placeholders.** Use `<CF_API_TOKEN>`, `<BRAIN_LAN_TOKEN>`, etc.
4. **Markdown style guide:** unchanged from baseline.
5. **Severity language:** **P0** = blocking / data loss; **P1** = degraded but workaround exists; **P2** = cosmetic / low impact.
6. **SoT markers:** Use `**(SoT: code)**` when citing code as authoritative over docs.

## Milestone mapping

| Plan milestone | Output file |
|----------------|-------------|
| M0 | `Handover_Implementation_Plan_2026-05-19_153000.md` |
| M1 | `01_Architecture.md` |
| M2 | `02_Systems_and_Integrations.md` |
| M3 | `03_Secrets_and_Configuration.md` |
| M4 | `04_Implementation_Roadmap_Consolidated.md` |
| M5 | `05_Project_Retrospective.md` |
| M6 | `README.md` |
| M7 | `06_Handover_Current_Status.md` |
| M8 | `07_Deployment_and_Operations.md` |
| M9 | `08_Debugging_and_Incident_Response.md` |
