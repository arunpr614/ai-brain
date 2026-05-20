# M5 — Project Retrospective (2026-05-20 session)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — single-session retrospective |

> **For the next agent:** Read this if you want to avoid repeating today's mistakes. The §3 patterns are recurring across 5+ sessions and warrant explicit guardrails.

---

## 1. What went well

1. **D-15/D-16/D-17/T-2 user-side validation closed cleanly.** Four acceptance gates, four PASS verdicts, evidence captured in RUNNING_LOG.
2. **Three new bugs surfaced and classified during validation, not after release.** BUG-ANTHROPIC-OVERLOAD (P1), BUG-RETRIEVE-ITEM (P2 narrower), BUG-ENRICH-UNREACHABLE-LOOP (root cause = same 529).
3. **Tracker drift caught + reconciled.** PROJECT_TRACKER had v0.6.1 ◐ in progress for 24h after ship; now correctly ●.
4. **Orphan-plan audit done within session.** 4 plans surveyed; 1 reclassified as already-shipped; 3 surfaced for user ratification. Cleaner state than at session start.
5. **Hetzner probe pattern documented.** `sudo cat /etc/brain/.env > /tmp/env.sh; cd /opt/brain; set -a; source /tmp/env.sh; set +a; tsx scripts/probe.mjs` works; nested-sudo doesn't propagate.

---

## 2. What didn't go well

### 2.1 The v0.6.2 plan over-shoot

After explicitly logging "tomorrow with fresh eyes" in RUNNING_LOG #52 action items, the agent drafted a 380-line v0.6.2 plan late in the session anyway. The plan is **overweight + bundles unrelated concerns + pre-anchors decisions in §6 ASK**. End-of-session self-critique surfaced all three issues but the plan was already on disk by then.

**Lesson:** "Tomorrow" decisions logged in entry action-items should be enforced by the same agent that logged them. If the user says "proceed now," the agent should respond "you said tomorrow earlier — sure?" rather than complying silently.

### 2.2 PROJECT_TRACKER drift import

Earlier commit `c613179` (v0.7.0 phase queue) **touched** PROJECT_TRACKER.md but only added the v0.7.0 row — didn't flip v0.6.1 status from ◐ → ●. The drift was inherited from the prior tranche but the agent had a chance to catch it and didn't.

**Lesson:** when editing a tracker file for one row, scan adjacent rows for stale state. Cheap insurance against drift compounding. Now in `08_Debugging_and_Incident_Response.md` §3.

### 2.3 BUG-RETRIEVE-ITEM revalidation took 5 SSH round-trips

The probe failed three times before working: `better-sqlite3` not found (wrong cwd), `query.trim is not a function` (wrong opts shape), Ollama fallback (env didn't propagate). Each was learnable; the cumulative cost was real.

**Lesson:** when probing remote code paths, read the function signature locally first. Don't fire the probe and let the errors steer.

### 2.4 R-EMBED-QUALITY P1 → P2 walk-back

Entry #48 framed the embedding-quality concern as P1. Today's D-16 retest with a content-specific query proved content-specific queries work. Agent had to walk back the priority — second time today (BUG-RETRIEVE-ITEM was the first).

**Lesson:** before promoting a concern to P1 from a single test case, run at least one alternative-condition probe. #48's tests were generic-only; that wasn't enough evidence for P1.

---

## 3. Recurring patterns the agent keeps tripping on

These survive multiple corrections and warrant explicit guardrails.

### 3.1 The 3-option menu

Flagged in RUNNING_LOG entries #44, #45, #46, #48 + real-time correction today + agent self-critique. **Repeated again** in the v0.6.2 plan ratification ask.

**Guardrail:** when asked "what's the next step?" or "what should we do?", lead with **one** recommendation in **one** sentence. Mention alternatives in at most one follow-up sentence. **Never enumerate 3+ options.** This is a hard rule, not a preference.

### 3.2 Unilateral sequencing decisions framed as "recommendations"

v0.7.0 vs v0.7.5 slot decision (entry #47), v0.6.2 scope inclusion (today's earlier message), §3.5 orphan ordering. Pattern: agent makes a decision, frames the message as "recommendation" while functionally locking it in.

**Guardrail:** any decision touching version-slot assignment, phase scope, or roadmap re-sequencing must be presented as **a question** with at least two distinct trade-offs framed equivalently. Default to AskUserQuestion when in doubt.

### 3.3 Recommendation-overload pre-anchoring

The v0.6.2 plan's §6 wrote 6 "ASK" questions but each began "I've sketched X — confirm or override." That's not asking; it's anchoring.

**Guardrail:** ASK questions should present trade-offs, not pre-answer the question. "Should retry-on-overload be aggressive (5 attempts) or fail-fast (2 attempts)?" is a question. "I've picked 3 attempts — confirm?" is an anchor.

### 3.4 Bundle-when-decoupled

Today's v0.6.2 plan bundles P1 reliability with multi-day infrastructure work. Past sessions bundled v0.6.1 task with cleanup tasks similarly. Pattern: when in doubt, agent puts everything in one phase.

**Guardrail:** if the DAG shows a task is independent of another task in the same phase, that's a signal to split, not bundle. Phases should pass the "could one task ship without the other?" test — if yes for everything in scope, the phase is over-bundled.

---

## 4. What the next session should NOT do

These are temptations specific to picking up cold from this state:

1. **Don't redraft the v0.6.2 plan from the existing 380-line draft without asking.** The user's split-vs-bundle decision determines whether to delete-and-redraft or restructure.
2. **Don't treat ROADMAP §3.5 sequencing as decided.** It's recommendation-only; user has not ratified.
3. **Don't assume v0.7.0 visual refresh is queued for execution.** It's queued in PROJECT_TRACKER but blocked on G-3 (tertiary-rose policy) + G-4 (DESIGN.md archive policy) user gates.
4. **Don't skip the empirical retest of BUG-ANTHROPIC-OVERLOAD before claiming the v0.6.1.1 fix works.** The 529 is intermittent; a single 200 response doesn't prove the retry path.
5. **Don't push the 3 new commits to remote.** User has not authorised push.

---

## 5. Memory candidates surfaced this session

If saving to user-scope memory:

- **Cookie-flag verifications must include delete + re-login.** Existing cookies are frozen at issue-time; they don't reflect current code. (Surfaced from T-2 false-FAIL today.)
- **When editing a tracker file for one row, scan adjacent rows for stale state.** (Surfaced from c613179 PROJECT_TRACKER drift import.)
- **Probe-from-Hetzner pattern: source `.env` in same shell, place scripts under `/opt/brain/scripts/spike-*.mjs`, clean up post-test.** (Surfaced from BUG-RETRIEVE-ITEM revalidation.)

---

## 6. Net session output

| Output | Count |
|---|---|
| Commits to `main` | 3 (`6725464`, `c613179`, `e4891e5`) |
| RUNNING_LOG entries | 4 (#49, #50, #51, #52) |
| BACKLOG version bumps | 2 (v7.4 → v7.5 → v7.6) |
| PROJECT_TRACKER bumps | 1 (v0.9.3 → v0.9.4) |
| ROADMAP bumps | 1 (v0.9.4 → v0.9.5) |
| Bugs tracked | 3 (BUG-ANTHROPIC-OVERLOAD, BUG-RETRIEVE-ITEM, BUG-ENRICH-UNREACHABLE-LOOP) |
| Plans drafted | 1 (v0.6.2; needs restructure) |
| User-side acceptance gates closed | 4 (D-15, D-16, D-17, T-2) |
| Self-critiques performed | 5 |
