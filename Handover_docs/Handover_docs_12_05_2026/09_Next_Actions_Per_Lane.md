# M9 — Next Actions Per Lane

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/06_Handover_Current_Status.md` (replaces status doc)
**Baseline:** full
**Scope:** the actual "do this next" list, split by lane
**Applies to:** both lanes — but each lane reads ITS OWN section first
**Status:** COMPLETE (documentation)

> **For the next agent:** this is the "what do I do first" file. Read ONLY the section for your lane. Other-lane sections are informational — they tell you what the other agent is doing so you don't step on them.

---

## 1. Table of contents

- §2 — Lane C next actions (cloud migration)
- §3 — Lane L next actions (local features)
- §4 — Cross-lane synchronization points
- §5 — User-driven gates (things only the user can do)

---

## 2. Lane C next actions (cloud migration)

### 2.1 Exact next command

```bash
# Step 1: confirm you are Lane C
git branch --show-current
# Must print: lane-c/v0.6.0-cloud

# Step 2: sync with main
git fetch origin
git rebase origin/main

# Step 3: ask the user to resolve Hetzner SSH
# (Cannot proceed with any code or server work until SSH works)
```

Then say to the user:

> "[Lane C] Ready to resolve Hetzner SSH blocker (K-1 in M8). Two paths: (A) Hetzner web console paste, (B) Rebuild server. Recommend (A) — 2 min. Want to proceed?"

### 2.2 Tight task sequence (today's session, 60–90 min)

1. **Resolve K-1** (SSH): user picks path, Lane C walks through it, verifies with `ssh -i ~/.ssh/ai_brain_hetzner root@204.168.155.44 'hostname'`.
2. **Run M7 §2.2 hardening block** as root → creates `brain` user, disables root, disables password auth.
3. **Verify `brain@` works in second terminal** BEFORE closing root session.
4. **M7 §2.3** — Hetzner firewall (user clicks in console).
5. **M7 §2.4** — install Node 20 + cloudflared + rclone + gpg.
6. **M7 §2.5** — clone repo, `git checkout lane-c/v0.6.0-cloud`, `npm ci`.
7. **M7 §2.6** — smoke test sqlite-vec.
8. **Commit a running-log entry** tagged `[Lane C]` documenting "server hardened, dependencies installed, ready for plan draft."

### 2.3 Next session (plan draft)

1. Draft `docs/plans/v0.6.0-cloud-migration.md` v1.0.
2. Include: Phase A–F task breakdown (already in M4 §3 — expand with code-level detail per task), decision log citing S-1..S-9, data-flow diagrams, test plan.
3. Spawn Stage 4 cross-AI review agent.
4. Self-critique.
5. Revise to v1.2.
6. Present to user for sign-off.

### 2.4 Session after plan sign-off (code work)

Execute Phase C (C1–C10 in M4 §3) on `lane-c/v0.6.0-cloud`:
- Migration 008
- `src/lib/embed/gemini.ts` + env-flag dispatcher
- `src/lib/enrich/batch.ts` + node-cron scheduler
- `/api/items/[id]/enrich?mode=immediate` route
- UI "Enrich now" button
- `scripts/backup-to-b2.sh` + `scripts/migrate-to-cloud.sh`
- `.env.cloud.example`
- New deps in `package.json`

Run full `npm run smoke` + new v0.6.0 smoke before committing. Commit in small atomic pieces; each gets a running-log entry only if the chunk is a milestone (not per commit).

### 2.5 Cutover session (user-scheduled 03:00 IST)

Execute M7 §6 runbook. 10 min wall-clock. Verify D1–D8. If all green, tag v0.6.0, update README with privacy paragraph, write running-log entry.

### 2.6 Post-cutover (within 48h)

- First B2 restore drill (M7 §8.3)
- Monitor enrichment batch (will fire first 3 AM UTC after cutover)
- Lane collapse decision: merge `lane-c/v0.6.0-cloud` into `main`; update OWNERSHIP BLOCK; update auto-memory

### 2.7 Lane C shared-file release schedule

After v0.6.0 ships, Lane C releases locks on:
- `package.json` version bumps → Lane L can tag v0.6.1 if it has features
- `README.md` → shared
- `src/lib/embeddings/`, `src/lib/enrich/` → becomes shared (though stable — unlikely to change soon)
- `src/db/migrations/008_*` → frozen (migrations are additive)

### 2.8 Lane C open questions for the user

1. Hetzner SSH fix: Path A (web console) or Path B (rebuild)?
2. Backblaze B2 account: when will it be created and the app key shared? (Blocks §2.4 Phase C6 only.)
3. gpg key for backup encryption: generate fresh on Hetzner or import an existing key? Which email?
4. Cutover window: user available at 03:00 IST on which date?
5. Any feature you want backported to Mac fallback path before cutover?

---

## 3. Lane L next actions (local features)

### 3.1 Exact next command

```bash
# Step 1: confirm you are Lane L
git branch --show-current
# Must print: lane-l/feature-work

# Step 2: sync with main
git fetch origin
git rebase origin/main

# Step 3: read Lane C's recent running-log entries
grep -B 1 -A 30 "\[Lane C\]" RUNNING_LOG.md | tail -80
```

Then say to the user:

> "[Lane L question] Starting Lane L. Backlog per `docs/plans/LANE-L-BOOTSTRAP.md §3`: P1 = Chrome extension error polish (recommended), P2 = APK bugs (reactive), P3 = next feature from inventory (tags / collections / export). Which would you like me to start on? Recommend P1 if no strong preference."

### 3.2 If user picks P1 (recommended start)

**Chrome extension error-surface polish** — 1–2 sessions of work.

1. **Map the failure modes:**
   - Read `extension/capture.ts` and `extension/background.ts`
   - Grep for `fetch()` calls and error handling
   - Enumerate: tunnel down, 401 (bad/expired bearer), 403 (valid bearer but wrong target), 500 (server error), network offline, timeout, CORS (shouldn't happen with host_permissions, verify)
2. **Design the specific messages** (user-facing strings, not technical):
   - `tunnel down` → "Can't reach Brain. Is your laptop/server running?" (pre-v0.6.0) or "Brain server unreachable — try again in a minute." (post-v0.6.0)
   - `401` → "Pairing expired. Open extension options to re-pair."
   - `500` → "Brain had an error saving this. Try again — if it keeps failing, check logs."
   - `offline` → "You're offline. We'll retry when connection returns." (add offline queue? — **no, ask user first before scoping creep**)
3. **Implement in `extension/popup.ts`** toast/message system.
4. **Options page (`extension/options.ts`):** add "Clear bearer + re-pair" button.
5. **Right-click menu (`extension/background.ts`):** add "Save page as article to Brain" alternative.
6. **Manual smoke matrix:** test each error case by simulating the failure (stop Mac server, use wrong bearer, corrupt JSON, etc.).
7. **Commit in small atomic pieces**, each with a running-log entry only for meaningful milestones.
8. **Push + PR against main** (Lane L self-merges — single-user project).

### 3.3 If user picks P2 (APK bugs)

Reactive. User files a bug → triage → fix → commit. No pre-defined list.

### 3.4 If user picks P3 (next feature)

Ask user WHICH feature (tags / collections / export). Then:

- Research existing code: grep for `tag` / `collection` / `export` in the codebase — might have scaffolding
- Design migration + UI + API pattern following existing library-list components
- Follow the same 4-stage discipline as major features: research → plan → Stage 4 review → self-critique → execute
- Migration number: 009 (Lane L's first; Lane C owns 008)

### 3.5 Lane L forbidden zones (repeated for emphasis)

- `package.json` version field
- `src/lib/enrich/**` (Lane C)
- `src/lib/embed/**` (Lane C, pending v0.6.0 swap)
- `src/db/migrations/008_*` (Lane C)
- `scripts/migrate-*`, `scripts/backup-to-b2*` (Lane C)
- `docs/plans/v0.6.0-*` (Lane C)
- `README.md` until Lane C adds v0.6.0 privacy paragraph

### 3.6 Lane L end-of-session checklist

- [ ] `git status` clean (everything committed)
- [ ] `git push origin lane-l/feature-work`
- [ ] Run `running-log-updater` skill with Lane = `L`
- [ ] "Cross-lane notes" section populated (or "none")
- [ ] If touched a shared file: update SHARED-LOCKS block in `RUNNING_LOG.md` head
- [ ] Tell user what Lane C might need to know

### 3.7 Lane L open questions for the user

1. P1 / P2 / P3 priority for starting
2. If P1: add an offline retry queue to the extension, or keep it simple (show message and user re-tries manually)?
3. If P3-tags: tag autocomplete from existing tags, or free-form only?

---

## 4. Cross-lane synchronization points

### 4.1 When Lane C merges to main

Trigger: v0.6.0 tag pushed.

Lane L must then:
1. `git fetch origin`
2. `git checkout lane-l/feature-work`
3. `git rebase origin/main`
4. Resolve any conflicts (should be rare given clean file-ownership)
5. Run local smoke tests
6. Push

Lane C must:
1. Update OWNERSHIP BLOCK in `RUNNING_LOG.md` — release Lane C's shared-file locks
2. Update `docs/plans/LANE-L-BOOTSTRAP.md` §5 "Things that have changed" with v0.6.0 summary
3. Update auto-memory `project_ai_brain.md` to reflect post-v0.6.0 stack

### 4.2 When Lane L merges a feature to main

Trigger: Lane L finishes a feature.

Lane L:
1. Commit + push
2. Self-merge to main (PR optional for audit trail)
3. Running-log entry with Cross-lane notes if anything relevant

Lane C must:
1. At next session start, `git rebase origin/main` on `lane-c/v0.6.0-cloud`
2. Verify v0.6.0 code still works after rebase
3. If Lane L added new routes under `src/app/api/items/`, verify Lane C's enrichment route doesn't conflict

### 4.3 When user decides on kill-switch

Trigger: `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md §7` conditions met.

1. User tells Lane L: pause; everything on `lane-l/feature-work` stays safe
2. User tells Lane C: finish v0.6.0
3. After v0.6.0: resume Lane L or collapse permanently

### 4.4 Weekly cadence (if both lanes active)

- Monday start of week: both lanes run catch-up protocol
- Friday EOD: both lanes write running-log entries summarizing the week
- One shared open question: is the dual-lane overhead worth the parallelism?

---

## 5. User-driven gates

Things only the user can do; both lanes wait when blocked:

| Gate | What's blocked | Who needs |
|---|---|---|
| Sign off this handover package | Both lanes can work but without explicit go-ahead | both |
| Hetzner SSH recovery choice | Lane C Phase A | Lane C |
| Backblaze B2 account creation + app key | Lane C Phase C6 + D, E | Lane C |
| gpg key decision (new vs import) | Lane C Phase C6 | Lane C |
| Cutover window scheduling | Lane C Phase D | Lane C |
| Lane L priority pick (P1/P2/P3) | Lane L start | Lane L |
| Extension offline queue decision | Lane L P1 scope | Lane L |
| Kill-switch invocation | Only in emergency | either |

## 6. Blast-radius ordering for next 30 days

Ranked by "thing that if skipped would hurt the most":

1. **Lane C: Hetzner SSH fix** — blocks all of v0.6.0 (BLOCKING)
2. **Lane C: Backup/restore drill post-cutover** — data loss risk if not tested
3. **Lane C: Tag v0.6.0 cleanly** — version integrity for future work
4. **Both: running-log hygiene** — de-cohering notes produce agent drift
5. **Lane L: Extension error polish** — user-facing quality
6. **Lane L: APK bugs** — user-facing quality (when filed)
7. **Both: Monthly B2 restore drill** — after v0.6.0, perennial ops task
8. **Lane L: P3 feature work** — useful but skippable for a while
9. **Both: Dual-lane retro** — if active, revisit at day 20

---

## 7. "If I only had 5 minutes" TL;DR per lane

**Lane C:**
> Fix Hetzner SSH (M7 §2.1). Then hardening block (M7 §2.2). Then draft v0.6.0 plan (next session).

**Lane L:**
> `git fetch && git rebase origin/main`. Ask user: P1 extension polish, P2 APK bugs, or P3 new feature? Recommend P1.
