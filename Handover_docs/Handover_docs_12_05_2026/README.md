# Handover Package — 2026-05-12 (v0.6.0 mid-flight + dual-lane split)

**Version:** 1.0
**Date:** 2026-05-12
**Previous package:** `../Handover_docs_11_05_2026/` (full, v0.5.1-ship)
**Baseline:** full — stands alone
**Scope:** state of AI Brain immediately after v0.6.0 research completes + dual-lane split initiates
**Applies to:** both Lane C (cloud) and Lane L (local features)
**Status:** COMPLETE (documentation) — awaiting user sign-off

> **For the next agent:** you are picking up AI Brain mid-flight. Two things happened in the session before this handover: (1) the v0.6.0 cloud migration research program completed (9 spikes + budget follow-up); (2) the project temporarily split into two parallel AI-agent lanes. **Your first step is identifying which lane you are**, then following the per-lane reading order below. Do NOT write code before running the catch-up protocol.

---

## 1. Which lane are you?

Run this:

```bash
git branch --show-current
```

- `lane-c/v0.6.0-cloud` → **You are Lane C.** Read order: §2.
- `lane-l/feature-work` → **You are Lane L.** Read order: §3.
- `main` → Ask the user which lane. Do not default.
- Any other branch → Probably an old branch. Ask the user.

---

## 2. Read order — Lane C (cloud migration v0.6.0)

1. **[Start here]** `README.md` — this file
2. `Handover_Implementation_Plan_2026-05-12.md` (M0) — rules of this package
3. `01_Architecture.md` (M1) — current + target architectures
4. **`09_Next_Actions_Per_Lane.md` §Lane C** — your backlog + exact next command
5. `07_Deployment_and_Operations.md` (M7) — Hetzner runbook, cutover procedure
6. `04_Implementation_Roadmap_Consolidated.md` (M4) — Phase A–F task breakdown for Lane C
7. `02_Systems_and_Integrations.md` (M2) — Anthropic/Gemini/B2/Hetzner integrations
8. `03_Secrets_and_Configuration.md` (M3) — env vars for the new providers
9. `05_Project_Retrospective.md` (M5) — decisions locked, bets made
10. `08_Debugging_and_Incident_Response.md` (M8) — known issues (starts with the SSH key problem)

**Your owned files:**
- `docs/plans/v0.6.0-*.md` (you'll write `v0.6.0-cloud-migration.md` next)
- `src/db/migrations/008_*.sql`
- `src/lib/enrich/batch*`, `src/lib/embed/gemini*`
- `scripts/migrate-*`, `scripts/backup-to-b2*`
- `.env.cloud.example`

**Your forbidden files:**
- Anything under `src/components/**`, `extension/**`, `android/**` (Lane L)
- `src/db/migrations/009_*` and higher (Lane L)

**Your catch-up protocol every session:**
```bash
git fetch origin
git checkout lane-c/v0.6.0-cloud
git rebase origin/main
git log --oneline origin/main ^HEAD | head -20   # what Lane L shipped
grep -A 5 "Lane L" RUNNING_LOG.md | tail -60       # read recent Lane L entries
```

---

## 3. Read order — Lane L (local feature development)

1. **[Start here]** `README.md` — this file
2. **`../../docs/plans/LANE-L-BOOTSTRAP.md`** — your dedicated onboarding doc (shorter than this package; covers the same ground operationally)
3. `../../docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` — full split contract
4. `Handover_Implementation_Plan_2026-05-12.md` (M0) — rules of this package
5. `01_Architecture.md` (M1) — current architecture (pre-v0.6.0 column; that's what you work on)
6. **`09_Next_Actions_Per_Lane.md` §Lane L** — your backlog + recommended P1 start
7. `04_Implementation_Roadmap_Consolidated.md` (M4) — Phase Lane L
8. `02_Systems_and_Integrations.md` (M2) — context for what NOT to touch
9. `08_Debugging_and_Incident_Response.md` (M8) — cross-lane emergency stop rules

**Your owned files:**
- `src/components/**`, `src/app/**` (except `/api/items/*/enrich`)
- `src/lib/capture/**`, `extension/**`, `android/**`
- `src/db/migrations/009_*` and higher

**Your forbidden files:**
- `docs/plans/v0.6.0-*.md` (Lane C)
- `src/db/migrations/008_*.sql` (Lane C)
- `src/lib/enrich/batch*`, `src/lib/embed/gemini*` (Lane C)
- `scripts/migrate-*`, `scripts/backup-to-b2*` (Lane C)
- **`package.json` version field** (no tagging until v0.6.0 ships — Lane C owns release)

**Your catch-up protocol every session:**
```bash
git fetch origin
git checkout lane-l/feature-work
git rebase origin/main
git log --oneline origin/main ^HEAD | head -20   # what Lane C shipped
grep -A 5 "Lane C" RUNNING_LOG.md | tail -60       # read recent Lane C entries
```

---

## 4. Read order — human reviewer

1. This `README.md`
2. `05_Project_Retrospective.md` (M5) — decisions + bets
3. `09_Next_Actions_Per_Lane.md` — where we go next
4. Skim `01_Architecture.md` for topology
5. Skim `08_Debugging_and_Incident_Response.md` for known issues

Skip everything else unless you want details.

---

## 5. Critical things both lanes must know

1. **Branch names:** `lane-c/v0.6.0-cloud` + `lane-l/feature-work`. Both pushed to `origin`.
2. **`main` is trunk.** Both lanes rebase-merge back to `main`.
3. **Only Lane C tags releases** until v0.6.0 ships.
4. **`RUNNING_LOG.md` has an OWNERSHIP BLOCK** at the top (HTML comments). Grep it before editing any "shared" file.
5. **Running log entries get tagged `[Lane C]` or `[Lane L]`** in the heading. Use the patched `running-log-updater` skill.
6. **Prefix user-facing questions** with `[Lane C question]` or `[Lane L question]`.
7. **If you see a commit with `BREAKING:` in the message**, stop and investigate before continuing.
8. **Kill switch** exists. If merge conflicts exceed 1/week or user asks, drop back to single-agent serial work. See `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md §7`.

---

## 6. Current repo state at package creation

- **`main`**: `5ebd903` (fix F3: unblock Ask streaming over Cloudflare tunnel) — v0.5.1-equivalent
- **`lane-c/v0.6.0-cloud`**: `60481fb` (docs(lane-split): initiate dual-agent workflow)
- **`lane-l/feature-work`**: forked from `5ebd903`, empty — awaiting first commit
- **Untracked:** 9 spike outputs in `docs/research/` + `docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md` (these are SIG of Lane C's session work but were not included in the `60481fb` commit — see M4 §1 note for mismatch)
- **Handover package:** `Handover_docs/Handover_docs_12_05_2026/` (this folder)

---

## 7. Hetzner server state

- Provisioned: `ubuntu-4gb-hel1-2` in Helsinki
- IP: `204.168.155.44`
- **SSH access: BLOCKED** (key wasn't attached at create time)
- See M7 §2 for recovery procedure (either rebuild or web-console paste)
- See M8 §2 for debugging details

---

## 8. Files in this package

| File | Purpose |
|---|---|
| `README.md` (this file) | Entry point + per-lane read order |
| `Handover_Implementation_Plan_2026-05-12.md` | M0 — rules + DoD |
| `01_Architecture.md` | M1 — pre + post v0.6.0 stack, Mermaid topology, SoT table |
| `02_Systems_and_Integrations.md` | M2 — external systems catalog |
| `03_Secrets_and_Configuration.md` | M3 — env-var catalog, rotation, safety |
| `04_Implementation_Roadmap_Consolidated.md` | M4 — phase history + per-lane Phase A–F breakdown |
| `05_Project_Retrospective.md` | M5 — decisions, bets, surprises, confidence |
| `07_Deployment_and_Operations.md` | M7 — Hetzner runbook (Lane C focus) |
| `08_Debugging_and_Incident_Response.md` | M8 — known issues, recovery playbook |
| `09_Next_Actions_Per_Lane.md` | M9 — split Lane C + Lane L backlogs with exact commands |

No M6 file in this package — this README serves that role (per skill's milestone layout).

---

## 9. If you're stuck

Ask the user. Prefix with `[Lane C question]` or `[Lane L question]` so they know which session it's coming from. Common decision points that need user input:

- Which Lane L backlog item to start with (P1 / P2 / P3)
- Whether to resolve Hetzner SSH by rebuild vs web-console paste
- Backblaze B2 account creation (user must sign up + provide app key to Lane C)
- When to schedule the 03:00 IST cutover window
- Kill-switch decision if friction exceeds budget

---

## 10. DoD for this package

- [x] All 10 milestones (M0–M9, minus M6 which is this README) delivered
- [x] Both lanes have clear entry paths
- [x] Architecture diagram in M1
- [x] SoT table in M1 + M2
- [x] Runbook in M7
- [x] Split backlogs in M9
- [x] No secrets in any file
- [ ] **User sign-off** — the only gate only a human can close

When user signs off, this package becomes the ground truth both lanes reference until v0.6.0 ships and lanes collapse.
