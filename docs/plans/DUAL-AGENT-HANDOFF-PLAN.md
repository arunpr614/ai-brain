# Dual-Agent Parallel Work Plan — v0.6.0 Cloud Migration + v0.6.x Features

**Author:** Primary Cloud Agent (the agent currently doing the Hetzner setup)
**Date created:** 2026-05-12
**Purpose:** Split AI Brain development into two parallel lanes — one agent handles the cloud migration, the other continues feature work — and define the handshake + catch-up mechanics so both agents can work without stepping on each other.

---

## 0. Why split at all

The cloud migration (v0.6.0) is a **long sequence of one-time setup steps** on the user's Hetzner server — SSH hardening, package installs, DB migration, cloudflared reconfiguration, DNS flips, backup validation. Each step is mostly blocking but mostly mechanical. The user is in the loop for most of it (clicks, SSH commands, domain changes).

Meanwhile the app itself still has a backlog: Android APK polish, extension improvements, new Recall/Knowly features from the feature inventory, bug fixes users find during real use. These are **codebase-bound** — they can be drafted, reviewed, and committed without ever touching the cloud server.

**Running them serially wastes 1–2 weeks of calendar time.** Running in parallel risks merge conflicts, duplicated edits, or worse — one agent deploying code the other agent is mid-rewrite on. This document is the contract that makes parallel work safe.

---

## 1. The two lanes

### Lane C — Cloud Migration (this agent continues)

**Charter:** Move Brain from the Mac to the Hetzner Helsinki server without losing data, keep the CF tunnel pointing at the right place, swap enrichment to Anthropic Batch + Gemini embeddings per S-3/S-5 decisions, cut the release.

**Deliverables:**
- Server up, hardened, app running
- DB migrated with hash-verified integrity
- Cloudflared re-pointed to the Helsinki IP
- Backup pipeline to Backblaze B2 active
- Gemini embeddings swapped in per `docs/research/embedding-strategy.md`
- Anthropic Batch enrichment wired per `docs/research/enrichment-flow.md`
- `docs/plans/v0.6.0-cloud-migration.md` plan written, reviewed (Stage 4), self-critiqued, executed
- Tagged `v0.6.0`
- README updated with new privacy paragraph from `docs/research/privacy-threat-delta.md`

**Files this lane OWNS (exclusive write access — Lane L must not touch):**
- `docs/plans/v0.6.0-cloud-migration.md` (and its REVIEW / SELF-CRITIQUE siblings)
- `docs/plans/spikes/v0.6.0-cloud-migration/` (any new spike artifacts)
- `src/db/migrations/008_*.sql` (enrichment batch schema per S-3)
- `src/lib/enrich/batch.ts` (new file)
- `src/lib/embeddings/gemini.ts` (new file)
- `scripts/migrate-to-cloud.sh` (new)
- `scripts/backup-to-b2.sh` (new)
- `.env.cloud.example` (new)
- `package.json` — only the `"version"` bump and **new** deps for Anthropic SDK / Google GenAI / rclone wrappers

**Branch:** `lane-c/v0.6.0-cloud`

### Lane L — Local Feature Development (new agent)

**Charter:** Keep shipping Brain features on the Mac stack that's currently live. Focus on the backlog items that don't depend on the cloud move.

**Deliverables (suggested priority — new agent can re-rank with user):**
- `v0.5.2` — UX polish the cloud migration won't touch:
  - Mobile APK: fix any bugs from real use during the migration period
  - Chrome extension: better error surfaces, options-page polish
  - Library list: source-type filtering UI, search-within-results
- `v0.5.3` — next Recall/Knowly feature from `FEATURE_INVENTORY.md` (tagging? collections? export?)
- Any bug reports the user files during the migration

**Files this lane OWNS:**
- All `src/components/**` (UI)
- All `src/app/**` (pages, API routes) EXCEPT `/api/items/*/enrich` (Lane C touches this per S-3)
- `src/lib/capture/**` (except YouTube, which just shipped — stable)
- `extension/**` (Chrome extension)
- `android/**` (APK code)
- `src/db/migrations/009_*.sql` and later (Lane L starts at 009 since Lane C is taking 008)
- `RUNNING_LOG.md` entries with role = `L`

**Branch:** `lane-l/feature-work`

### Shared files — CO-OWNED (requires handshake)

These files MAY be edited by either lane, but only with coordination via the running log + a head-of-log "CURRENT OWNER" marker (see §4):

- `package.json` (version number, new deps)
- `README.md`
- `RUNNING_LOG.md` (append-only, never collides)
- `.planning/PROJECT.md`, `.planning/STATE.md`
- `docs/plans/` (both lanes write their own plan files; shared README optional)
- `CLAUDE.md` (if present — project-wide AI instructions)

---

## 2. Branching + merge strategy

### The trunk

`main` stays the release trunk. Both lanes branch from `main` and rebase-merge back.

### Sync cadence

- **End of each agent's session:** commit → push to origin
- **Start of each agent's session:** `git fetch origin && git rebase origin/main` (or merge if conflicts) BEFORE any new work
- If a lane has been dormant >48h, agent must explicitly re-read the running log before touching code

### PR mechanics

Each lane opens PRs against `main`. Self-merge is allowed (single-user project) but the PR description must include:

```
**Lane:** C (cloud) | L (local)
**Overlaps with other lane:** none | list
**Running log entry:** linked
```

### Hard rule: who releases

Only **Lane C** bumps version + tags releases while v0.6.0 is in flight. Lane L's work lands as commits on `main` but gets tagged under Lane C's version bump when the migration ships. This avoids two agents racing on `package.json version` and competing tags.

After v0.6.0 ships, Lane L resumes normal v0.6.1, v0.6.2 cadence.

---

## 3. The handoff packet (what Lane C gives to Lane L on day 1)

Lane L spawns as a fresh agent with no conversation history. It needs a bootstrap package. Lane C writes this ONE file:

**`docs/plans/LANE-L-BOOTSTRAP.md`** (Lane C creates this; Lane L reads it first thing every session)

Structure:

```markdown
# Lane L Bootstrap — read me first

## You are
Lane L = local feature development agent. You work on the Brain codebase while Lane C migrates the backend to Hetzner.

## Ground rules
1. Never touch files in Lane C's owned list (see DUAL-AGENT-HANDOFF-PLAN.md §1)
2. Never bump package.json version until told
3. Before writing code: `git fetch && git rebase origin/main`
4. Before writing code: read RUNNING_LOG.md entries tagged [Lane C] since your last session
5. Append your own entry tagged [Lane L] before you sign off

## Your current backlog (ranked)
- [ ] ...
- [ ] ...

## Your current branch
`lane-l/feature-work`

## Things that have changed in the repo since you last worked
[Lane C updates this section after each cloud-move milestone]

## Things Lane C needs from you
[empty or list]

## Things you need from Lane C before proceeding
[empty or list]

## How to ask the user a question
The user runs both agents — they see both. Prefix user-facing questions with `[Lane L question]` so they know which agent asked.

## Emergency stop
If you see a commit on main from Lane C that contains the string `BREAKING` in its message, stop writing code and wait for the user to confirm it's safe to continue.
```

This is the ONLY handshake document Lane L needs. Everything else it learns from `RUNNING_LOG.md`.

---

## 4. Running Log v2 — multi-author support

The current running-log skill has no author field (everything is "AI agent (Claude)"). For dual-agent work, we upgrade it with three small changes:

### 4.1 Entry header adds LANE tag

Old:
```markdown
## <date> — <title>
**Entry author:** AI agent (Claude) · **Triggered by:** ...
```

New:
```markdown
## <date> — [Lane C|L] <title>
**Entry author:** AI agent (Claude) — Lane C (cloud migration) | Lane L (local features)
**Session ID:** <first 8 chars of git HEAD at session start>
**Triggered by:** ...
```

The lane tag appears in the heading (so you can scan the file with `grep "## " RUNNING_LOG.md` and see who did what when). The session ID ties the entry to a specific commit point — future agents can `git checkout <session-id>` to reproduce the repo state the author was looking at.

### 4.2 New section: "Cross-lane notes"

Added to the entry template between `Done` and `Learned`:

```markdown
### Cross-lane notes
<What the OTHER lane needs to know. Empty if nothing.>
- **To Lane C:** ...
- **To Lane L:** ...
- **Shared files touched:** list (e.g., package.json — bumped version, no other changes)
- **Owned files touched:** list (so the other lane knows what's new)
```

### 4.3 Head-of-log CURRENT OWNER marker

Top of `RUNNING_LOG.md` (right under the purpose paragraph) gets a machine-readable block that says who's currently "live" on what shared file. Pattern:

```markdown
<!-- OWNERSHIP BLOCK (update atomically when acquiring / releasing shared files) -->
<!-- LANE-C-ACTIVE: <branch>  LAST-ENTRY: <date-time> -->
<!-- LANE-L-ACTIVE: <branch>  LAST-ENTRY: <date-time> -->
<!-- SHARED-LOCKS: { "package.json": "Lane C until v0.6.0 ships" } -->
```

Rule: **before editing a shared file, the agent grep's the OWNERSHIP BLOCK**. If the shared-locks entry names the other lane, the agent stops and asks the user. If it names itself or no one, proceed.

### 4.4 Catch-up protocol (the "I just woke up" flow)

When either agent starts a session, mandatory first-3 actions:

1. `git fetch origin && git log --oneline origin/main ^HEAD` — see what the other lane committed since I last worked
2. Read the last 3 entries of `RUNNING_LOG.md`, filter for entries from the OTHER lane
3. Read `docs/plans/LANE-*-BOOTSTRAP.md` for my lane — check the "Things that have changed" and "Things [other lane] needs from you" sections

If any of those surface a decision that needs the user (e.g., "Lane C wants to deprecate `src/lib/embed/ollama.ts`, Lane L please confirm you're not actively editing it"), agent pauses and asks before writing any code.

---

## 5. Risk analysis — what can go wrong

### R-1 Both lanes edit the same file at the same time
**Likelihood:** Medium (happens even with clear lanes)
**Impact:** Merge conflict. Minor if caught on rebase; worse if missed.
**Mitigation:** Shared-file list in §1 is small (package.json, README, CLAUDE.md, trackers). Ownership block at top of RUNNING_LOG.md is the hot-path check. Rebase before work is the safety net.

### R-2 Lane L accidentally uses Ollama embeddings after Lane C has switched to Gemini
**Likelihood:** Low, but high-impact if it happens
**Impact:** Silent data drift — chunks inserted by Lane L would be in a different vector space, query quality degrades
**Mitigation:** Lane C's S-5 swap MUST land on main with a feature flag (`EMBED_PROVIDER=ollama|gemini`) and default to ollama. Only switched to gemini during the migration cutover. Lane L never touches the embedding code.

### R-3 Version-number race
**Likelihood:** Guaranteed if not managed
**Impact:** Lane L tags v0.5.2 while Lane C is mid-way through v0.6.0 work → git tag ordering confusion, npm version conflict
**Mitigation:** Hard rule in §2: only Lane C bumps version until v0.6.0 ships. Lane L's feature work accumulates commits on main but doesn't tag. After v0.6.0, Lane L can tag v0.6.1 etc.

### R-4 Lane L ships a DB migration Lane C isn't ready for
**Likelihood:** Low
**Impact:** Lane C does the cloud cutover, Mac has migration 009, cloud DB doesn't → first capture post-cutover crashes
**Mitigation:** Migration runner is idempotent. Cloud migration runbook explicitly re-runs all migrations on the new host after DB copy. Lane L's migrations just flow through.

### R-5 One agent goes silent for a week, returns with stale context
**Likelihood:** Medium (real sessions have gaps)
**Impact:** Stale assumptions → bad work
**Mitigation:** §4.4 catch-up protocol is mandatory. If `git log origin/main ^HEAD` shows >20 new commits on main, the agent MUST re-read the last full month of running log before touching anything.

### R-6 User confusion about which agent to ask
**Likelihood:** Medium
**Impact:** User asks Lane C "can you add dark mode" → Lane C has to refuse and re-route → annoying
**Mitigation:** Both agents prefix user-facing questions with `[Lane C question]` / `[Lane L question]`. User's end-of-session instructions can also prefix the intended recipient.

### R-7 Lane C breaks something on main that Lane L depends on
**Likelihood:** Medium
**Impact:** Lane L's branch won't rebase cleanly
**Mitigation:** Any Lane C commit that's a breaking change puts `BREAKING:` in the commit message (standard conventional-commits rule). Lane L's emergency-stop rule (see bootstrap §5) triggers on this.

---

## 6. Success criteria for the dual-lane experiment

- [ ] Both lanes commit code within 7 days of this plan being signed off
- [ ] Zero merge conflicts that cause lost work (conflicts that get resolved cleanly are fine)
- [ ] Running log has clearly-tagged entries from both lanes, in chronological order
- [ ] User can, at any moment, ask "what's the state of Lane C?" and get an answer from reading only the last Lane C entry
- [ ] v0.6.0 ships without Lane L's work rolling back
- [ ] Lane L ships at least one feature on main during the migration window

---

## 7. Kill switch

If at any point the dual-lane approach is creating more friction than it saves (merge conflicts, duplicate work, confused user), fall back to serial: finish v0.6.0 on Lane C, pause Lane L, resume Lane L after the cutover. The code already written by Lane L is safe on its branch and can be resumed.

Trigger for kill switch:
- >1 merge conflict per week OR
- User explicitly asks "can we just go back to one agent" OR
- Lane L's work depends on Lane C's cloud-only infrastructure and can't be tested locally

---

## 8. Step-by-step: starting Lane L today

Here's the exact sequence the user runs to spin up Lane L:

1. **User (or Lane C) creates Lane L's branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b lane-l/feature-work
   git push -u origin lane-l/feature-work
   ```

2. **Lane C writes `docs/plans/LANE-L-BOOTSTRAP.md`** with the current backlog, current branch, and an empty "changes since you last worked" section.

3. **User opens a new Claude Code session** (new terminal window, same repo). First message to Lane L:
   ```
   You are Lane L. Read docs/plans/DUAL-AGENT-HANDOFF-PLAN.md then docs/plans/LANE-L-BOOTSTRAP.md. Then check out the lane-l/feature-work branch and ask me what to work on first. Don't write code yet.
   ```

4. **Lane L's first session:** reads both docs, checks out branch, proposes a work item from the backlog, gets user signoff, writes code, commits, writes running-log entry tagged `[Lane L]`, pushes, done.

5. **Subsequent sessions:** Lane L runs the §4.4 catch-up protocol every time.

---

## 9. Step-by-step: Lane C's continuing work

Right now (mid-session):
1. Finish the Hetzner SSH problem (either rebuild the server or paste the key via web console)
2. Complete Step 5–11 of the setup (hardening, Node install, cloudflared, app clone)
3. Draft `docs/plans/v0.6.0-cloud-migration.md`
4. Stage 4 cross-AI review
5. Self-critique
6. Migration cutover window (3 AM IST)
7. Tag v0.6.0
8. README update

All on branch `lane-c/v0.6.0-cloud`.

---

## 10. Running-log skill update (one-time edit needed)

The global `running-log-updater` skill at `/Users/arun.prakash/.claude/skills/running-log-updater/` needs a small patch to support the lane tag:

**Change:** add a mandatory "Lane" field to the entry-gathering step.

**Prompt the skill to ask:**
> "Which lane are you working in? (C=cloud migration, L=local features). If unsure, check the git branch — `lane-c/*` → C, `lane-l/*` → L, `main` → prompt user."

**Change the entry-header template from:**
```
## <YYYY-MM-DD HH:MM> — <one-line entry title>
**Entry author:** AI agent (Claude) · **Triggered by:** ...
```

**To:**
```
## <YYYY-MM-DD HH:MM> — [Lane <X>] <one-line entry title>
**Entry author:** AI agent (Claude) — Lane <X> (<cloud migration | local features>)
**Session ID:** <first 8 chars of git HEAD at session start>
**Triggered by:** ...
```

**Add the "Cross-lane notes" section** to the template (between Done and Learned) per §4.2.

**Add the OWNERSHIP BLOCK check** to the skill's step 2 (locate running log): before appending, read the OWNERSHIP BLOCK at the top, warn user if the entry's lane is currently locked out of a file the entry claims to have touched.

This patch is minor and backwards-compatible (old single-agent logs remain valid — no lane tag just means "pre-split").

---

## 11. Pre-split TODO (must complete before Lane L starts)

- [ ] Sign off this plan with user
- [ ] Patch `running-log-updater` skill per §10
- [ ] Write `docs/plans/LANE-L-BOOTSTRAP.md` (Lane C does this)
- [ ] Create `lane-c/v0.6.0-cloud` branch and push
- [ ] Add OWNERSHIP BLOCK to top of `RUNNING_LOG.md`
- [ ] Current Lane C writes a "kickoff" running-log entry declaring the split and the owned-files list
- [ ] Update auto-memory with `project_dual_lane.md` so future sessions of both agents inherit the split context
- [ ] User opens new terminal for Lane L and runs the §8 startup sequence

---

## 12. Open questions for user sign-off

1. **Accept the lane boundaries in §1?** Especially the shared-file list.
2. **Accept "only Lane C bumps version until v0.6.0 ships" hard rule?**
3. **Who does the running-log skill patch — me now, or skip it and use plain-text lane tags manually for the first week, then formalize?** Recommendation: formalize now, it's 10 minutes.
4. **Lane L's initial backlog priority** — Chrome extension polish, APK bugs, next feature from inventory, or user-chosen?
5. **How should Lane L be spawned — fresh Claude Code session with CLAUDE.md guidance, or an explicit Agent-tool subagent?** (I recommend fresh session — it has real tools; subagents are for time-bounded tasks.)

---

## 13. TL;DR

- Two lanes. Lane C = me = cloud migration. Lane L = new agent = local features.
- Clear file ownership (§1). Shared files get a head-of-log ownership block.
- Both lanes commit to `main` via their own branches. Rebase before work. PR-merge when done.
- Running log gets a `[Lane C]` / `[Lane L]` tag per entry + a new "Cross-lane notes" section.
- Catch-up protocol on session start: `git log origin/main ^HEAD`, read last Lane-X entries, read bootstrap doc.
- Hard rule: only Lane C bumps version until v0.6.0 ships.
- Kill switch: if friction > savings, drop back to serial.
