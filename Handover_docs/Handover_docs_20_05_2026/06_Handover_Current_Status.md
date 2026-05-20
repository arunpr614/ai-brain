# M6 — Handover: Current Status

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — end-of-session state |

> **For the next agent:** This is the most operationally important file. Read in full before touching anything.

---

## 1. Repository state

### 1.1 Git

```
HEAD on main: e4891e5  docs(trackers): flip v0.6.1 → complete + audit orphan plans + entry #52
              c613179  docs(v0.7.0): queue Structured Calm Green visual refresh phase
              6725464  docs(v0.6.1): user-side validation close-out — D-15/D-16/D-17/T-2 PASS + 3 backlog entries

Tags pushed:  v0.6.1 on 17e32e0 (chore(v0.6.1,T-20): bump version 0.6.0 → 0.6.1)

Today's 3 commits are LOCAL ONLY. Not pushed. User has not authorised push.
```

### 1.2 Working tree

```
?? "Arun Claude Code Notes AI Brain.md"        — user scratch, leave alone
?? Attachments/                                — user scratch, leave alone
?? docs/plans/v0.6.2-backup-and-retrieval.md   — DRAFTED but overweight (380 lines), needs decision
```

### 1.3 Tracker versions

| File | Version | Date |
|---|---|---|
| `package.json` | 0.6.1 | post-v0.6.1 ship |
| `PROJECT_TRACKER.md` | v0.9.4-tracker | 2026-05-20 |
| `ROADMAP_TRACKER.md` | v0.9.5-roadmap | 2026-05-20 |
| `BACKLOG.md` | v7.6-backlog | 2026-05-20 |
| `RUNNING_LOG.md` | through entry #52 | 2026-05-20 |

---

## 2. Hetzner state

### 2.1 Service

| Property | Value |
|---|---|
| brain.service status | active |
| HEAD on Hetzner | matches local `17e32e0` (v0.6.1 tag) |
| Items / chunks / vec rows | 9 / 82 / 82 |
| Disk usage | not measured today |
| `NODE_ENV` in process environ | `production` (verified) |

### 2.2 Recent log signals (worth watching)

| Pattern | Meaning | Frequency observed |
|---|---|---|
| `[batch-cron] submit tick: nothing to submit` at 19:30 UTC | D-17 batch cron working correctly | Daily |
| `[enrich] LLM provider unreachable; backing off 30000ms` | BUG-ENRICH-UNREACHABLE-LOOP — actually 529, not network | ~5x in any quiet hour |
| `Anthropic stream returned 529` | BUG-ANTHROPIC-OVERLOAD — would appear if user runs an Ask during overload window | intermittent |

### 2.3 Cleanup

`/tmp/test-ask*.mjs` and `/tmp/spike-retrieve-*.mjs` cleaned up post-investigation.

---

## 3. Open asks (priority-ordered)

### 3.1 P1 — v0.6.2 phase shape

**Question for user:** split into v0.6.1.1 hotfix + v0.6.2 backup-only + v0.6.3 hygiene, or keep bundled?

**Why P1:** blocks all other phase planning. Determines whether the existing 380-line draft is deleted (split path) or restructured (bundled path).

**Where it goes when answered:** `Handover_Implementation_Plan_2026-05-20.md` §3 — execute the chosen branch.

### 3.2 P2 — Anthropic 529 retry policy

**Question for user (if v0.6.1.1 path approved):** retry-on-overload policy specifics — 3 attempts × 500ms/2s/5s exp backoff + Retry-After header? Or different?

**Why P2:** only relevant if the split path is approved. If bundled, this question rolls into the restructured plan's gate.

### 3.3 P3 — ROADMAP §3.5 orphan-plan sequencing

**Three independent yes/no questions:**

1. LIBOFF (Library-Offline-from-DB, 12 tasks) → v0.6.3? Yes / No / Defer.
2. AUG (Augmented Browsing, 7 tasks) → v0.7.5 companion? Yes / No / Defer.
3. GRAPH (Knowledge Graph, 10 tasks) → v0.8.x or v0.10.0?

**Why P3:** Not blocking; can be answered any time. Useful to surface early so the next 2–3 phases have full sequencing visibility.

### 3.4 P3 — v0.7.0 phase gates (still open since 2026-05-19)

- G-3: tertiary-rose policy (keep reserved for v0.8.0 SRS, or assign near-term home?)
- G-4: replace `DESIGN.md` + `DESIGN_SYSTEM.md` with green spec, or co-exist?

**Why P3:** Phase is queued; can't open until both gates close. Not urgent if v0.6.x work fills the next 1–2 sessions.

---

## 4. Carry-overs from this session

These were **logged in entry #52 action items** but not done — for tomorrow:

1. **[ASK]** Commit decision for the v0.6.2 plan — depends on the phase-shape decision in §3.1 above.
2. **[ASK]** §3.5 orphan sequencing ratification — see §3.3 above.
3. **[DO]** Tomorrow: draft `docs/plans/v0.6.1.1-hotfix.md` (if split) or restructured v0.6.2 (if bundled).
4. **[VERIFY]** Before drafting any retry policy: confirm policy specifics with user.
5. **[REMEMBER]** Cookie-flag verifications must include delete + re-login.
6. **[REMEMBER]** Probe-from-Hetzner pattern: source `.env` in same shell as `tsx`; scripts go under `/opt/brain/scripts/spike-*.mjs`; clean up post-test.

---

## 5. What's NOT in flight (don't accidentally pick these up)

- v0.7.0 Structured Calm Green visual refresh — queued, blocked on G-3 + G-4.
- v0.7.5 GenLink — no plan drafted.
- v0.8.0 Review (SRS) — blocked on R-FSRS spike.
- v0.6.5 GenPage + clusters — blocked on R-CLUSTER spike.
- All FUT-* items — explicitly out of scope until v1.0.0 decision.

---

## 6. Memory state

User-scope auto-memory has the following relevant entries (not exhaustive):

- AI Brain project context (`project_ai_brain.md`)
- Anthropic monthly cap ($5/mo hard cap, locked 2026-05-16)
- v0.6.0 cutover DONE (2026-05-19)
- Hetzner cloudflared ingress config
- Anthropic Batch wire details
- node-cron lifecycle quirks
- Empirical-evidence-first rule for UI bugs
- Non-technical user; full AI-assist (write all code; explain in plain language)

Three new memory candidates from today are listed in `05_Project_Retrospective.md` §5 but not yet saved.
