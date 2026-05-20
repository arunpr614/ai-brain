# M0 — Handover Implementation Plan (2026-05-20)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta |

> **For the next agent:** This file tells you what to do FIRST in the next session. Don't draft anything before reading §2 below.

---

## 1. Global rules for this tranche

1. **Path convention:** all repo paths are repo-relative from the project root (`/Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/`). Handover-internal links are relative from this folder (`../../` to project root).
2. **Markdown style:** backticks for `filenames`, `functions()`, `ENV_VARS`. **Bold** for milestones, severity, status verdicts. `**bold-code**` for emphasised commands (e.g., **`git push`**).
3. **Code is source of truth** when docs disagree. Mark with `**(SoT: code)**` inline.
4. **No secrets.** Token names + `<placeholder>` patterns only.
5. **Numbered procedures.** Multi-step actions use `1. 2. 3.` not bullets — AI agents follow numbered lists more reliably.
6. **Honest framing.** When uncertain, say "I don't know" or "needs verification" rather than guessing.

---

## 2. First action when next session starts

**Do NOT start by drafting v0.6.2. Do this sequence first:**

1. Read `STATUS.md` (one page).
2. Read `06_Handover_Current_Status.md` (working-tree details + open asks).
3. Verify state: run `git log --oneline -5 && git status --short`. Should show `e4891e5` at HEAD plus 3 untracked items.
4. **Ask the user the v0.6.2 phase-shape question** (see §3 below) BEFORE touching `docs/plans/v0.6.2-backup-and-retrieval.md`.
5. Only after the user answers, proceed.

**Why this ordering:** the existing draft is wrong-shaped. Working from it without the user's split decision will compound the over-shoot. Working without reading the working tree will miss the un-pushed commits.

---

## 3. The v0.6.2 phase-shape question

Frame this to the user as a **single binary choice with two alternatives presented as trade-offs** (NOT a 3-option menu):

> "The v0.6.2 plan I drafted last night bundles four separable concerns into one phase, which means a P1 reliability fix (Anthropic 529 retry) blocks on multi-day backup infrastructure work. I'd recommend splitting it into a v0.6.1.1 hotfix (Anthropic retry + per-item retrieve fix, ~2 hours total) followed by v0.6.2 backup-only (the original BACKLOG scope: D-18 + T-11b). Alternative: keep them bundled and accept the latency. Which?"

If user says **split**: delete or archive the existing draft, then draft v0.6.1.1 hotfix plan first (smaller, focused, ships fast).

If user says **keep bundled**: restructure the existing draft to fix the §6 ASK pre-anchoring problem and tighten the line count toward ~200.

Either way, **don't write any code in the next session** until the plan is approved.

---

## 4. Definition of done for this handover

- [x] All 11 files exist in `Handover_docs_20_05_2026/`.
- [x] `STATUS.md` is one-page navigable.
- [x] `06_Handover_Current_Status.md` documents the un-committed v0.6.2 draft.
- [x] `04_Implementation_Roadmap_Consolidated.md` explains the v0.6.2 split rationale.
- [x] `05_Project_Retrospective.md` captures today's learnings, especially the plan over-shoot pattern.
- [x] No secrets pasted. Token names only.
- [x] All evidence pointers use repo-relative paths from this folder.

**Out of scope for this handover:**

- Drafting v0.6.1.1 / v0.6.2 / v0.6.3 plans. The next session does that with the user's input.
- Pushing today's 3 commits to remote. User has not authorised push.
- Deciding orphan-plan sequencing (§3.5). Surfaced as recommendation only.

---

## 5. Files in this tranche

```
Handover_docs_20_05_2026/
├── README.md                                    Navigation + reading order
├── STATUS.md                                    One-page truth
├── Handover_Implementation_Plan_2026-05-20.md   This file (M0)
├── 01_Architecture.md                           Delta pointer (unchanged)
├── 02_Systems_and_Integrations.md               Anthropic 529 + retrieve revalidation
├── 03_Secrets_and_Configuration.md              Delta pointer (unchanged)
├── 04_Implementation_Roadmap_Consolidated.md    v0.6.2 split rationale
├── 05_Project_Retrospective.md                  Today's learnings
├── 06_Handover_Current_Status.md                Working-tree + open asks
├── 07_Deployment_and_Operations.md              Hetzner probe pattern
└── 08_Debugging_and_Incident_Response.md        BUG-ANTHROPIC-OVERLOAD investigation pattern
```
