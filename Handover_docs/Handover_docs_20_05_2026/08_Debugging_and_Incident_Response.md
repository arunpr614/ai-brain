# M8 — Debugging and Incident Response (delta)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — investigation patterns from today |

> ⚠️ **Safety guardrail:** Don't paste API responses or stack traces that contain user content into handover docs. The Anthropic 529 response below is generic; safe to keep.

> **For the next agent:** Three investigation patterns documented here. §1 is the cookie-stale lesson. §2 is the BUG-ANTHROPIC-OVERLOAD investigation flow. §3 is the tracker-drift detection.

---

## 1. Cookie-flag verification — always force a fresh issue

### 1.1 The trap

Today: T-2 cookie check showed `Secure ✗` in DevTools for `brain-session`. Investigation looked at `src/lib/auth.ts` (correct), `/etc/brain/.env` (correct), systemd unit (correct), `/proc/$PID/environ` (correct). All green. Cookie still showed `Secure ✗`.

**Cause:** the cookie in the browser was issued *before* the v0.6.1 deploy. Browser caches the cookie's attributes at issue-time; subsequent code fixes don't retroactively update the in-browser cookie.

### 1.2 The procedure (always do this)

When verifying any cookie attribute (`Secure`, `HttpOnly`, `SameSite`, `Path`, `Expires`):

1. Open DevTools → Application → Cookies → relevant origin.
2. Right-click the row → Delete.
3. Reload the page → expect redirect to `/unlock` (or whatever issues the cookie).
4. Re-authenticate.
5. Refresh the cookies view — read the **freshly-issued** cookie.

**Don't trust an existing cookie's attributes.** They reflect the issue moment, not current code.

### 1.3 Outcome today

After fresh re-issue, the cookie showed `Secure ✓ HttpOnly ✓ SameSite Lax`. T-2 PASS. Code at `../../src/lib/auth.ts:120` (`secure: process.env.NODE_ENV === "production"`) is correct.

---

## 2. BUG-ANTHROPIC-OVERLOAD investigation pattern

When users report "Ask hangs on '...'" or "enrichment seems stuck":

### 2.1 First — confirm Anthropic is actually 5xx-ing

```bash
# From Hetzner; see 07_Deployment_and_Operations.md §3.5 for the full command
for i in 1 2 3; do curl ... ; done
```

If responses include `HTTP=529` with `overloaded_error` → confirmed; this is BUG-ANTHROPIC-OVERLOAD; retry policy in v0.6.2 (or v0.6.1.1 hotfix) is the fix.

### 2.2 If responses are all 200 — different bug

The "hang on '...'" symptom could also come from:
- SSE stream emitting `error` frame but client not rendering it (UI affordance gap).
- Network drop during streaming.
- Browser tab in background killing the connection.

In that case: open DevTools → Network → filter `/api/ask` → inspect the EventSource. If the response has a `data: {"type":"error",...}` frame the server did its job; the bug is client-side.

### 2.3 Don't guess from log messages alone

The log line `[enrich] LLM provider unreachable; backing off 30000ms` reads like a network failure, but today's investigation proved it's actually a 5xx from Anthropic (network is fine; curl from same host works). The error wrapper conflates the two cases.

**Rule:** when a log says "unreachable," verify with curl from the same host before trusting the message.

---

## 3. Tracker drift detection

### 3.1 The trap

Earlier today, commit `c613179` added a row to PROJECT_TRACKER.md but didn't notice that an adjacent row (v0.6.1) was still `◐ in progress` despite being shipped + tagged. The drift was inherited from a prior tranche; the agent didn't fix it during the edit.

### 3.2 Detection procedure

When editing a tracker file (PROJECT_TRACKER, ROADMAP_TRACKER, BACKLOG):

1. Before saving the edit, scan the entire phase-status table for stale `◐` (in progress) rows.
2. Cross-check each `◐` row against `git tag -l | tail -10` and `git log --oneline -20`.
3. If a phase has a tag but the table says `◐`, fix it in the same commit.
4. If unsure, `git log --oneline <prior_tag>..HEAD` for that phase shows whether work continued or stopped.

### 3.3 Why this matters

A stale tracker is an information hazard. The next agent reads it, believes the state, and plans wrong work. Today's reconciliation cost ~10 minutes; catching it during the original edit would have cost ~30 seconds.

---

## 4. Recent investigation logs (for reference)

| Investigation | Where | Outcome |
|---|---|---|
| Anthropic 529 (today) | RUNNING_LOG #50, this file §2 | Confirmed; retry policy queued for v0.6.2 |
| BUG-RETRIEVE-ITEM revalidation | RUNNING_LOG #52 | Bug real but narrower — only 1-chunk items + generic queries |
| T-2 cookie stale (today) | RUNNING_LOG #51, this file §1 | Stale cookie pre-v0.6.1; fresh re-issue PASSes |
| D-17 batch cron (today) | RUNNING_LOG #49 | PASS — `nothing to submit` is expected on empty queue |
| D-16 cloud Ask (today) | RUNNING_LOG #50 | PASS — content-specific query streams correctly |

---

## 5. Open bugs not yet investigated this far

| Bug | Status | Where it'd surface |
|---|---|---|
| Stream `error` frame UI rendering | Hypothesised but not investigated | "..." UI hang despite server emitting error frame |
| Mac better-sqlite3 ABI mismatch | Known; v0.6.3 scope | Mac local dev only |
| BUG-ENRICH-UNREACHABLE-LOOP idle spam | Root cause confirmed; fix queued v0.6.2 | journalctl noise during quiet hours |
