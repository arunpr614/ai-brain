---
Title: AI Brain Handover — README + Reading Order (M6)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** Start here. This README is the entry point. The full handover is 10 files; you don't need to read all of them in sequence. The fastest path to "ready to continue work" is below in §3.

# 1. What this handover captures

A point-in-time snapshot of AI Brain at **2026-05-19 13:47 IST**, mid-Phase D cutover, with three known bugs and two pending decisions explicitly punted to you.

**State summary:**
- D-1..D-11 ✅ shipped + pushed to origin
- S-13 (embed model swap) ✅ shipped + pushed
- D-12 ⚠️ **partial** — Hetzner DB has all 8 Mac items; 6 of 8 have new gemini-embedding-001 vectors; 2 large transcripts remain un-embedded due to free-tier Gemini TPM throttle
- D-13 + D-14 ❌ NOT RUN — `brain.arunp.in` still serves Mac
- Working tree dirty: `src/lib/embed/gemini.ts` modified (serial loop + 1.1s delay) — pending commit decision

**Live system status:**
- Mac brain.service: ✅ running, serving `brain.arunp.in`
- Hetzner brain.service: ✅ running, serving `brain-staging.arunp.in`
- Both databases drift if Mac sees new captures (Mac is the source of truth UNTIL D-13)

# 2. Quick reference

| Lookup | Goes to |
|---|---|
| What's done, what's blocked, what's next? | [04_Implementation_Roadmap_Consolidated.md](04_Implementation_Roadmap_Consolidated.md) |
| What two decisions am I being asked to make? | [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §3 |
| How do I fix the 3 known bugs? | [07_Deployment_and_Operations.md](07_Deployment_and_Operations.md) §2 + [08_Debugging_and_Incident_Response.md](08_Debugging_and_Incident_Response.md) |
| Where do secrets live + how do I rotate? | [03_Secrets_and_Configuration.md](03_Secrets_and_Configuration.md) |
| Where does X run + how does Y connect? | [02_Systems_and_Integrations.md](02_Systems_and_Integrations.md) |
| What's the system topology? | [01_Architecture.md](01_Architecture.md) §2 (Mermaid) |
| What patterns should I avoid? | [05_Project_Retrospective.md](05_Project_Retrospective.md) §3 |

# 3. Recommended reading order (fastest path to ready)

If you're new to the project: **(1) → (2) → (3) → (5) → (8)** is enough to make a decision.

| Step | File | Why |
|---|---|---|
| 1 | [README.md](README.md) (this file) | Orientation |
| 2 | [06_Handover_Current_Status.md](06_Handover_Current_Status.md) | The half-state + open decisions |
| 3 | [01_Architecture.md](01_Architecture.md) | Topology snapshot + Mermaid diagram |
| 4 | [04_Implementation_Roadmap_Consolidated.md](04_Implementation_Roadmap_Consolidated.md) | Phase D progress + remaining tasks |
| 5 | [07_Deployment_and_Operations.md](07_Deployment_and_Operations.md) | Cutover runbook + bug fixes |
| 6 | [05_Project_Retrospective.md](05_Project_Retrospective.md) | Patterns + 3 deployment bugs |
| 7 | [02_Systems_and_Integrations.md](02_Systems_and_Integrations.md) | Reference: vendors, routes, paths |
| 8 | [08_Debugging_and_Incident_Response.md](08_Debugging_and_Incident_Response.md) | Diagnostic recipes |
| 9 | [03_Secrets_and_Configuration.md](03_Secrets_and_Configuration.md) | Reference: env vars, keys, rotation queue |
| 10 | [Handover_Implementation_Plan_2026-05-19_134700.md](Handover_Implementation_Plan_2026-05-19_134700.md) | Index + global rules |

# 4. First action checklist (do these in order)

Before you do ANYTHING with the cutover:

| # | Action | Why |
|---|---|---|
| 1 | Read [06_Handover_Current_Status.md](06_Handover_Current_Status.md) | Two pending decisions are blocking |
| 2 | Verify CNAME state: `curl -s "https://api.cloudflare.com/client/v4/zones/af88f945669d3e95174e20386a9d2feb/dns_records/ac9ca4ca42f6c03a3e9970d4a89988d6" -H "Authorization: Bearer <token>" \| jq .result.content` — must show `58339d22-...` (Mac). If shows Hetzner UUID, D-13 already ran. | Avoid double-cutover or unintended state |
| 3 | Verify working tree: `git status --short` — expect `M src/lib/embed/gemini.ts` | Pending commit decision |
| 4 | Read [07_Deployment_and_Operations.md](07_Deployment_and_Operations.md) §2 to understand the 3 bugs | Don't re-run `cutover.sh cutover` until these are fixed |
| 5 | Decide: rollback D-12 or continue? — see [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §3 | The user explicitly said "let the next agent decide rollback" |
| 6 | Decide: commit gemini.ts changes or discard? — see [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §3 | Strict improvement, partial fix |
| 7 | Decide: how to handle the 2 stuck transcripts — see [04_Implementation_Roadmap_Consolidated.md](04_Implementation_Roadmap_Consolidated.md) §5.1 | Blocks D-13 |
| 8 | THEN proceed with fixes + cutover resume | |

# 5. Sibling handover relationship

| Folder | Date | Status | Required reading? |
|---|---|---|---|
| [Handover_docs_19_05_2026_PHASE_D_PROGRESS](../Handover_docs_19_05_2026_PHASE_D_PROGRESS) | 2026-05-19 ~12:05 IST | ⚠️ **STALE** — written before D-12 was attempted | No (this handover supersedes) |
| [Handover_docs_16_05_2026_PHASE_D_KICKOFF](../Handover_docs_16_05_2026_PHASE_D_KICKOFF) | 2026-05-16 | Phase D kickoff context | No (covered by §1 + Architecture here) |
| [Handover_docs_15_05_2026_PHASE_C_KICKOFF](../Handover_docs_15_05_2026_PHASE_C_KICKOFF) | 2026-05-15 | Phase C kickoff (since shipped) | No |
| [Handover_docs_14_05_2026_LANE](../Handover_docs_14_05_2026_LANE) | 2026-05-14 | Pre-collapse lane state | Only if SSH key rotation needed (M3) |
| [Handover_docs_12_05_2026](../Handover_docs_12_05_2026) | 2026-05-12 | Original baseline | No |
| [Handover_docs_13_05_2026](../Handover_docs_13_05_2026) | 2026-05-13 | Earlier baseline | No |

This is **full mode** — every required fact for resuming is in this handover. No required-prior-reading dependency.

# 6. Glossary

| Term | Meaning |
|---|---|
| **D-N** | Phase D task N (per [docs/plans/v0.6.0-cloud-migration.md](../../docs/plans/v0.6.0-cloud-migration.md) §4) |
| **S-N** | Spike N (post-plan-lock investigation) |
| MRL | Matryoshka Representation Learning — embedding training that makes prefix truncations valid sub-embeddings |
| TPM | Tokens-per-minute (rate limit unit) |
| RPM | Requests-per-minute |
| WAL | Write-Ahead Log (SQLite journal mode) |
| chunks_vec | sqlite-vec virtual table holding 768-dim embedding vectors |
| Mac source-of-truth | Until D-13 runs, Mac DB is authoritative; after D-13, Hetzner |
| Half-state | The current condition: D-12 done, D-13/D-14 not done, both DBs exist |

# 7. If anything is unclear

1. Read [05_Project_Retrospective.md](05_Project_Retrospective.md) for context on what went wrong and why
2. Check [RUNNING_LOG.md](../../RUNNING_LOG.md) entries #37 and #43 for session-by-session detail
3. Run `git log --oneline -10` for the most recent commits
4. Confirm with user before proceeding with any rollback or live-URL change

# 8. Definition of "this handover is complete"

- [x] All 10 files exist
- [x] M1 includes Mermaid topology
- [x] No secrets pasted
- [x] Half-state explicitly documented in M6 + M7
- [x] 2 pending decisions punted to next agent (rollback + gemini.ts commit)
- [x] 3 bugs documented with reproducers + fixes (cutover.sh WAL, --reset wipe, Gemini TPM)
- [x] First-action checklist (§4) is sequential and unambiguous
- [x] Repo-relative links work
- [x] Sibling handovers cross-referenced
- [x] User's "let the next agent decide rollback" explicitly captured

**This handover is complete. The product is not.**
