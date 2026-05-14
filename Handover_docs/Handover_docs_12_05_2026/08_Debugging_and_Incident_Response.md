# M8 — Debugging and Incident Response

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/08_Debugging_and_Incident_Response.md`
**Baseline:** full
**Scope:** known issues, recovery playbooks, who-owns-what during incidents
**Applies to:** both lanes (with clear lane ownership per issue)
**Status:** COMPLETE (documentation)

> **For the next agent:** if something is broken, find the issue here first. If it's not here, add it. Lane ownership matters: the wrong lane attempting a fix can make things worse. Default rule: **production-path issues are Lane C**, **codebase bugs that don't involve the cloud are Lane L**, **ambiguous issues go to the user to route**.

---

## 1. Known-issues register (at package creation)

| ID | Severity | Component | Description | Lane | Status |
|---|---|---|---|---|---|
| K-1 | **HIGH** | Hetzner SSH | Provisioned server rejects local SSH key (key wasn't attached at create time) | Lane C | OPEN |
| K-2 | **LOW** | Docs/tag | `main` may not be at `cee808c` (v0.5.1 ship). Verify before rebase. | shared | audit |
| K-3 | **INFO** | package.json | Version still `0.5.1` — expected; v0.6.0 bump happens at Lane C Phase E | Lane C | by design |
| K-4 | **INFO** | `docs/research/` files untracked | 9 spike outputs written this session but not in Lane C commit `60481fb` yet | Lane C | pending commit |

## 2. K-1 — Hetzner SSH rejects key (BLOCKING Lane C's Phase A)

**Symptom:**
```
$ ssh -i ~/.ssh/ai_brain_hetzner root@204.168.155.44 'hostname'
Permission denied, please try again.
root@204.168.155.44: Permission denied (publickey,password).
```

**Root cause:** the server-create form had a yellow-warning SSH key section that was never clicked. Create & Buy proceeded without a key attached. Server came up with root password-auth only (and no root password was set via Hetzner, so no access at all except via web console).

**Fix options** — see M7 §2.1. Both take <2 min:
- Path A: Hetzner web console → paste public key into `/root/.ssh/authorized_keys`
- Path B: Hetzner Rebuild tab → re-do OS install, this time with SSH key ticked

**Verification after fix:**
```bash
ssh -i ~/.ssh/ai_brain_hetzner root@204.168.155.44 'hostname'
# Must print: ubuntu-4gb-hel1-2 (or similar)
```

**Ownership:** Lane C. Lane L MUST NOT attempt this.

## 3. K-2 — Possible main/tag drift

**Symptom:** `origin/main` may not reflect the v0.5.1 ship commit. Prior session pushed commits but we're not certain `cee808c` actually landed on origin.

**Verify:**
```bash
git fetch origin
git log --oneline origin/main | head -5
# If 'cee808c release(v0.5.1)' is in top 3: OK
# If not: push it from local main
```

**Fix if drifted:**
```bash
git checkout main
git push origin main
git push origin v0.5.1   # push the tag if it didn't land either
```

**Ownership:** shared — whoever catches it first fixes it. Coordinate via running-log.

## 4. Incident response playbooks

### 4.1 Production app down (post-cutover)

**Symptom:** `https://brain.arunp.in/api/health` returns 502 or times out.

**Owner:** **Lane C.** (Lane L: redirect user here.)

**Steps:**
1. Check Hetzner server reachable: `ssh brain@204.168.155.44 'uptime'`
2. Check cloudflared: `ssh brain@... 'sudo systemctl status cloudflared'`
3. Check app: `ssh brain@... 'sudo systemctl status brain'`
4. Tail logs: `ssh brain@... 'sudo journalctl -u brain -n 100'`
5. Quick fix: `sudo systemctl restart brain && sudo systemctl restart cloudflared`
6. If not recovering within 15 min: execute rollback (M7 §7)
7. Running-log entry after recovery: what failed, what worked, what to prevent

### 4.2 SQLite WAL corruption

**Symptom:** queries fail with `database disk image is malformed` or `database is locked`.

**Owner:** Lane C (prod) or Lane L (if reproducible on Mac during feature dev).

**Immediate steps:**
1. Do NOT write to the DB.
2. `.backup` the current file to a safe location
3. Try `PRAGMA integrity_check;` — if OK, just WAL checkpoint: `PRAGMA wal_checkpoint(TRUNCATE);`
4. If not OK: restore from most recent backup (B2 for prod, `data/backups/` for Mac)

### 4.3 Anthropic / Gemini API outage

**Symptom:** `429 Too Many Requests` or `503 Service Unavailable` from provider.

**Owner:** Lane C.

**Mitigation:**
- For Ask (Anthropic Sonnet): fail-open to a "Sorry, LLM provider is down" toast in UI. Already should be handled by existing error boundary in `/api/ask/stream`.
- For batch enrichment: batch will retry next night; already designed for this.
- For manual Enrich-now: same toast as Ask failure.
- For embeddings (Gemini): new captures lag — row saves, embedding column null, backfill job catches up when provider recovers. Lane C writes `scripts/backfill-embeddings.mjs` (already exists for Ollama; extend for Gemini).

If outage >24h, consider flipping `EMBED_PROVIDER=ollama` and `BRAIN_ENRICH_BATCH_MODE=false` to use Mac fallback. **Requires Mac to be on.**

### 4.4 Backup failure

**Symptom:** `/var/log/brain-backup.log` shows error for >2 consecutive days.

**Owner:** Lane C.

**Steps:**
1. SSH to Hetzner, run the backup script manually: `bash /opt/brain/scripts/backup-to-b2.sh`
2. Common causes: B2 app key expired, gpg key missing, disk full on `/tmp`
3. Fix root cause
4. Verify by listing recent B2 objects: `rclone ls b2:bucket/daily/ | tail`
5. If missed day: run manual backup immediately to catch up

### 4.5 Secret leak suspected

**Symptom:** API key or bearer posted to public git, Slack, screenshot, etc.

**Owner:** shared (whoever discovers it).

**Steps (fast path, <10 min):**
1. **Rotate first, investigate second.**
2. Anthropic key: Console → delete key → create new → update `.env.cloud` → restart `brain.service`
3. Gemini key: Google AI Studio → same pattern
4. B2 key: B2 Console → expire → generate new → update rclone config → test
5. Bearer: user opens `/settings/lan-info` → regenerate → re-pair all clients
6. Cloudflare tunnel (if VM compromise suspected): delete + recreate tunnel, rotate credentials, update DNS CNAME
7. Running-log: document the incident, timestamps, what was rotated, what wasn't

### 4.6 Running log OWNERSHIP BLOCK edit conflict

**Symptom:** Both lanes want to claim/release a shared-file lock at the same time.

**Owner:** coordinate via user.

**Steps:**
1. Lane that sees the conflict (merge conflict in the HTML comment block) pauses
2. Ping user: `[Lane X question] Conflict on OWNERSHIP BLOCK — Lane Y also wants <file>. Who gets it first?`
3. User resolves; losing lane waits

## 5. Debugging tips by area

### 5.1 Cloudflare tunnel

- Dashboard: https://one.dash.cloudflare.com → Networks → Tunnels → `brain-tunnel` → status
- Logs on Hetzner: `sudo journalctl -u cloudflared -f`
- Common issue: error 1033 = tunnel registered but not running (backend down). Check `systemctl status brain`.

### 5.2 SQLite

- Quick shape check: `sqlite3 data/brain.sqlite '.schema items'`
- Row counts: `sqlite3 ... 'SELECT source_type, COUNT(*) FROM items GROUP BY source_type;'`
- WAL status: `sqlite3 ... 'PRAGMA journal_mode;'` → should be `wal`
- Vector table: `sqlite3 ... 'SELECT COUNT(*) FROM chunks_vec;'`

### 5.3 Anthropic

- Batch status: `curl https://api.anthropic.com/v1/messages/batches/<batch_id> -H 'x-api-key: $ANTHROPIC_API_KEY' -H 'anthropic-version: 2023-06-01'`
- Usage: Console → Usage tab

### 5.4 Gemini

- Test embed: `curl 'https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=<KEY>' -d '{"content": {"parts":[{"text":"test"}]}}'`
- Quota: AI Studio → API → Usage

### 5.5 Extension (Lane L area)

- Chrome: `chrome://extensions` → Developer mode ON → Inspect views: service worker
- Manifest issues: check `extension/dist/manifest.json` after `npm run build` in extension dir
- CORS: extension uses `host_permissions` to bypass CORS for `brain.arunp.in` — if adding new domains, update manifest

### 5.6 APK (Lane L area)

- AVD console: logs via `adb logcat | grep -i brain`
- Webview inspector: `chrome://inspect` when AVD + USB debugging connected
- Intent issues: check `android/app/src/main/AndroidManifest.xml` intent-filters

## 6. Cross-lane emergency stop rules

A lane MUST stop writing code and ping the user if:

1. A commit lands on `main` with `BREAKING:` prefix
2. `git rebase origin/main` produces >3 conflicts
3. You're about to touch a file you're not sure you own (check OWNERSHIP BLOCK)
4. An incident in §4 is in progress and you're not the owning lane
5. User asks `[Lane X]` a question meant for the other lane — redirect, don't answer

## 7. Auto-memory notes for debugging

These memories (in `~/.claude/projects/.../memory/`) can mislead debugging if not verified:

- `project_ai_brain.md` — still says "local-first, Next.js + SQLite + Ollama + Capacitor" — true pre-v0.6.0, partial post-v0.6.0. Update after cutover.
- `project_ai_brain_cloudflare_pivot.md` — correct about the tunnel.
- `project_ai_brain_android_env.md` — APK build env. Lane L: if APK won't build, this is where to start.
- `reference_mac_hardware.md` — M1 Pro 32GB. Don't use this for sizing Hetzner.
- `project_ai_brain_dual_lane.md` (NEW this session) — current split contract.

Always verify memory claims against current code before acting.

## 8. Escalation path

1. Agent self-debug via this file + M7 + research docs → 10 min budget
2. Ping user with specific question `[Lane X question]` → user researches or decides
3. User requests cross-lane consultation (C & L together) → both agents pause, user mediates
4. Kill-switch: user invokes per `DUAL-AGENT-HANDOFF-PLAN.md §7`, lanes collapse to single agent

## 9. Quick-reference commands

```bash
# Who am I?
git branch --show-current

# What did the other lane ship?
git fetch origin && git log --oneline origin/main ^HEAD | head -20

# What's the shared-file lock state?
grep -A 12 "OWNERSHIP BLOCK" RUNNING_LOG.md

# Am I about to touch a locked file?
grep "SHARED-LOCKS:" RUNNING_LOG.md -A 10 | grep "<filename>"

# Did BREAKING land on main?
git log --oneline origin/main | grep -i BREAKING

# Hetzner health
ssh brain@204.168.155.44 'sudo systemctl status brain cloudflared'

# Recent running-log entries
grep "^## " RUNNING_LOG.md | tail -10

# What lane am I tagging log entries as?
# If branch = lane-c/* → C. If lane-l/* → L. If main → ask user.
```
