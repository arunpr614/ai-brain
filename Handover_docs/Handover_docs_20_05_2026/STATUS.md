# STATUS — 2026-05-20 end of session

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 (superseded same day) |
| **Baseline** | RUNNING_LOG entries #46–#52 |

> **For the next agent:** This is the one-page truth. If you only read one file, read this one.

---

## 1. Where things stand

**v0.6.1 is fully shipped + validated.** Tag `v0.6.1` on commit `17e32e0`. All four user-side acceptance gates passed (D-15 APK share, D-16 cloud Ask, D-17 overnight batch, T-2 Secure cookie). brain.arunp.in serves from Hetzner. 9 items / 82 chunks / 82 vec rows.

**Three commits shipped today on `main` (not pushed):**

```
e4891e5  docs(trackers): flip v0.6.1 → complete + audit orphan plans + entry #52
c613179  docs(v0.7.0): queue Structured Calm Green visual refresh phase
6725464  docs(v0.6.1): user-side validation close-out — D-15/D-16/D-17/T-2 PASS + 3 backlog entries
```

**Working tree (uncommitted):**
- `docs/plans/v0.6.2-backup-and-retrieval.md` — **drafted but overweight (380 lines).** Needs restructure or deletion. See §4 below.
- `Arun Claude Code Notes AI Brain.md` — user scratch. Leave alone.
- `Attachments/` — user scratch. Leave alone.

---

## 2. What got done today

| Concern | Outcome |
|---|---|
| D-15 APK share-target retest | ✅ PASS — Substack post captured (`48667e476f58d69a71509d9c`); `short_article` warning is correct behaviour |
| D-16 cloud Ask end-to-end | ✅ PASS — content-specific query → 8 chunks + Anthropic streamed 4.48s + content-accurate answer |
| D-17 overnight batch cron | ✅ PASS — `[batch-cron] submit tick: nothing to submit` at 19:30 UTC = 01:00 IST |
| T-2 Secure cookie | ✅ PASS — verified after fresh re-issue (existing cookies were stale pre-v0.6.1) |
| BUG-RETRIEVE-ITEM revalidation | **Confirmed real but narrower** — only 1-chunk items + generic queries return 0; multi-chunk works |
| BUG-ANTHROPIC-OVERLOAD | **NEW finding (P1).** Anthropic returns HTTP 529 intermittently; adapter has no retry; UI hangs on "..." |
| BUG-ENRICH-UNREACHABLE-LOOP | **Root cause confirmed** — same 529 as BUG-ANTHROPIC-OVERLOAD; log message misleading |
| R-EMBED-QUALITY | **Down-scoped P1 → P2** — D-16 proves content-specific queries surface right item |
| Tracker drift | Fixed — PROJECT_TRACKER v0.9.4, ROADMAP v0.9.5 |
| Orphan v0.6.x plans audit | 4 plans surveyed; offline-mode-apk reclassified as shipped-via-lane-L; 3 real orphans surfaced in ROADMAP §3.5 with proposed sequencing |

---

## 3. What's open (for next session)

### Decision-required asks

1. **v0.6.2 phase shape (lead with this)** — current 380-line draft bundles 4 unrelated concerns. Recommended split: v0.6.1.1 hotfix (T-1 retry + T-6 retrieve) → v0.6.2 (D-18 + T-11b backup-only) → v0.6.3 (hygiene tail). See `04_Implementation_Roadmap_Consolidated.md`.
2. **ROADMAP §3.5 orphan sequencing** — 3 yes/no decisions:
   - LIBOFF → v0.6.3? (highest user-value)
   - AUG → v0.7.5 companion? (after visual refresh)
   - GRAPH → v0.8.x or v0.10.0?
3. **v0.7.0 visual refresh** — slot ratification (v0.7.0 vs v0.7.5) + DESIGN.md archive policy (G-4). Open since entry #47.
4. **Anthropic 529 retry policy** — if v0.6.1.1 gets greenlit, decide: 3 attempts with 500ms/2s/5s exp backoff + Retry-After header? Or different.

### Tracked but not yet executed

- **D-18** B2 off-site backup (in v0.6.2 scope)
- **T-11b** drop legacy `BRAIN_LAN_TOKEN` (gated on 2026-05-26+)
- **BUG-ANTHROPIC-OVERLOAD** P1 fix
- **BUG-RETRIEVE-ITEM** P2 fix (push `c.item_id = ?` into JOIN at `src/lib/retrieve/index.ts:99-114`)
- **BUG-ENRICH-UNREACHABLE-LOOP** log hygiene (mostly closed by Anthropic retry)
- **CSP nonces** → v0.6.3
- **Mac better-sqlite3 ABI** → v0.6.3
- **`tsx` removal from Hetzner runtime** → v0.6.3

---

## 4. The v0.6.2 plan situation

`docs/plans/v0.6.2-backup-and-retrieval.md` was drafted at session-end (380 lines, 9 tasks). End-of-session self-critique flagged it as **overweight + bundling unrelated concerns**:

- Bundles **P1 reliability** (Anthropic retry — 60 min) with **multi-day infrastructure** (B2 backup setup) — the user hitting a 529 right now would wait for B2 setup before getting the fix.
- Pre-anchors decisions in §6 ASK ("I've sketched 3 attempts × exp backoff... confirm or override") rather than presenting trade-offs.
- 380 lines for 9 tasks (~42 lines/task) vs v0.6.1's ~17 lines/task. Padded with implementation sketches that belong in execution, not planning.

**Recommended fix paths for next session (pick one):**

- **(a)** Delete the draft. Redraft v0.6.2 from scratch with original BACKLOG-defined scope only (D-18 + T-11b). Open a separate v0.6.1.1 hotfix plan for T-1 + T-6.
- **(b)** Keep the draft as a starting point. Restructure into three sub-plans (v0.6.1.1 hotfix / v0.6.2 backup-only / v0.6.3 hygiene). More work but preserves the writing.

My recommendation tonight was **(a)** but it's the next session's call.

---

## 5. Hetzner state

- `brain.service` active.
- Anthropic intermittently 529 — confirmed by curl probe (1× 529 + 2× 200 across 3 retries).
- `/etc/brain/.env` has both `BRAIN_API_TOKEN` and `BRAIN_LAN_TOKEN` (T-11b drop is the gated cleanup).
- DB: 9 items / 82 chunks / 82 vec rows.
- No deploy this session.
- `/tmp` cleaned (test-ask scripts removed).

---

## 6. Source of truth

- **Canonical state:** RUNNING_LOG entries #50–52, BACKLOG v7.6, PROJECT_TRACKER v0.9.4, ROADMAP v0.9.5.
- **Code:** main at `e4891e5` (locally; not pushed).
- **Tag:** `v0.6.1` on `17e32e0` (pushed).
- **Don't trust:** the v0.6.2 draft plan's §6 ASK section (those are pre-anchored decisions, not real questions).
