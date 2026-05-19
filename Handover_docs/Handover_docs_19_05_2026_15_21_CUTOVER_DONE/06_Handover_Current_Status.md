# AI Brain: Current status (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/06_Handover_Current_Status.md](../Handover_docs_19_05_2026_13:47/06_Handover_Current_Status.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** Read this first for "where are we?" — what is built, what is open, and what you should do next. The baseline v1.0 said "the cutover is half-done." This v2.0 says "the cutover is done; D-15..D-18 user-side validation is open."

# 1. State at handover time (2026-05-19 15:30 IST)

## 1.1 Repo

| Property | Value |
|---|---|
| Branch | `main` |
| HEAD | `1413f9b` (`fix(deploy,D-12): wipe stale -wal/-shm during DB swap`) |
| Pushed to origin | ✅ |
| Working tree | **clean** (RUNNING_LOG, MEMORY, and Handover_docs are the only mods, all expected) |
| Recent commits this session | `6c03093` (gemini.ts serial-loop), `1413f9b` (cutover.sh WAL fix) |

## 1.2 Mac

| Component | Status | Notes |
|---|---|---|
| Mac next-server (was pid 32761) | ❌ **STOPPED** in D-14 | Was on :3099 not :3000 |
| Mac cloudflared launchdaemon | ⚠️ loaded but idle | CNAME no longer routes here; harmless |
| Mac DB `data/brain.sqlite` | 8 items | Source-of-truth role transferred to Hetzner |
| `brain.arunp.in` from Mac path | ❌ no longer routes via Mac | CNAME points at Hetzner tunnel |

## 1.3 Hetzner (live serving)

| Component | Status | Notes |
|---|---|---|
| `brain.service` (systemd) | ✅ active | Listening 127.0.0.1:3000 |
| `cloudflared.service` (systemd) | ✅ active | Tunnel UUID `64fb278e-...`; ingress includes both hostnames |
| `/opt/brain/data/brain.sqlite` | 8 items, 81 chunks, 81 vec rows | All vectors are gemini-embedding-001 @ 768 |
| `/opt/brain/data/brain.sqlite.pre-cutover` | 4 KB schema-only | Original (pre-D-12) Hetzner DB |
| `brain.arunp.in` | ✅ routes here | 200 in ~720ms, verified 3 probes |
| `brain-staging.arunp.in` | ✅ also routes here | Same tunnel, second ingress |
| `[batch-cron]` | ✅ scheduled | submit `30 19 * * *` UTC = 01:00 IST; poll `*/5 * * * *` |
| `[backup]` | ✅ scheduled | every 6h, keeps 28 snapshots; first snapshot at 14:32 today |
| `[enrich]` worker | ✅ running | Has the 45-min `unreachable` loop bug; degraded path only |

## 1.4 External

| Service | Status | Notes |
|---|---|---|
| Cloudflare CNAME `brain.arunp.in` | ✅ flipped | Now `64fb278e-...cfargotunnel.com` |
| Anthropic API | ✅ reachable from Hetzner | Probe 200 in 776ms |
| Gemini API | ✅ paid tier | Smoke 200 in 490ms; 65-chunk backfill green |
| Backblaze B2 | ⚠️ keys configured, script not wired | D-18 blocker |

## 1.5 Test counts (post-session)

| Test | Status |
|---|---|
| `npm run typecheck` | ✅ clean (verified pre-this-session; only edits since were small) |
| Unit tests (Mac) | ❌ Mac better-sqlite3 Node mismatch (carry-over) |
| `npm run smoke:batch` | ✅ green at session start |
| Hetzner `/api/health` (bearer) | ✅ HTTP 200 |
| `brain.arunp.in/api/health` (bearer) | ✅ HTTP 200 (3 probes, ~720ms) |
| `brain-staging.arunp.in/api/health` | ✅ HTTP 200 |

# 2. What is built and deployed

| Area | Status | Notes |
|------|--------|-------|
| Hetzner brain.service | **Live + verified** | 8 items, 81 chunks, 81 vec rows; systemd hardening active |
| brain.arunp.in cutover | **Live + verified** | CNAME → Hetzner tunnel; 3/3 health probes 200 |
| Daily Anthropic batch (01:00 IST) | **Deployed, unverified** | cron registered; first run is overnight tonight (D-17) |
| 5-min batch poll | **Deployed, unverified** | cron registered; ticks every 5 min from 14:32 onward |
| Backup snapshots (every 6h) | **Deployed, partially verified** | First snapshot at 14:32 written to `/opt/brain/data/backups/` |
| Embedding pipeline | **Live + verified** | Both fresh captures and backfill exercise the path |
| Mac as source-of-truth | **Retired** | Mac brain stopped in D-14 |
| `gemini.ts` serial-loop | **Shipped + tested** | Commit `6c03093`; Hetzner-tested via 65-chunk backfill |
| `cutover.sh` WAL fix | **Shipped, untested** | Commit `1413f9b`; correct path forward but not re-exercised today |

# 3. Immediate next actions (for next agent or for user)

In priority order:

1. **[USER] D-15** — Capture an item from the APK on phone. Confirm it lands in `brain.arunp.in` UI in `pending` state. Agent can verify post-hoc with: `ssh brain@204.168.155.44 'sudo journalctl -u brain --since "today" | grep "POST /api/items"'`.
2. **[USER] D-16** — Open `brain.arunp.in` in a browser, run an Ask query. Confirm Sonnet 4.6 streams tokens; click a citation to confirm it resolves to the source item.
3. **[OVERNIGHT] D-17** — Wait for 01:00 IST batch fire. Verify post-hoc with: `ssh brain@204.168.155.44 'sudo journalctl -u brain --since "01:00" --until "01:30" | grep batch-cron'`. Also verify any item in `pending` transitioned to `done` overnight.
4. **[AGENT] Set Gemini billing alert** — User indicated paid tier is OK; the budget alert wasn't yet confirmed set. Recommend $5/mo with 50/90/100% thresholds. See [03_Secrets_and_Configuration.md §2.2](./03_Secrets_and_Configuration.md).
5. **[AGENT/USER] D-18 (blocked)** — B2 backup script not yet written. Plan §3.5 specifies `sqlite3 .backup → gzip → gpg → rclone to B2`. Wire as a sub-task before v0.6.0 tag.
6. **[USER] Confirm Mac cloudflared disposition** — Leave loaded-but-idle, or `sudo launchctl bootout` for hygiene? Agent can't sudo from Claude.
7. **[AGENT] Phase E secret rotation** — After D-15..D-18 green. CF_API_TOKEN must be rotated (chat-pasted today). Full list in baseline §6.

# 4. Active endpoints

| URL | Method | Auth | Notes |
|-----|--------|------|-------|
| `https://brain.arunp.in/api/health` | GET | None / Bearer | Returns `{ok:true, ts}`; 200 in ~720ms |
| `https://brain.arunp.in/api/items` | POST | Bearer (`BRAIN_LAN_TOKEN`) | Capture from APK / extension |
| `https://brain.arunp.in/api/ask` | POST | Bearer | SSE Ask streaming |
| `https://brain-staging.arunp.in/api/*` | mirror of above | same | Same Hetzner instance — useful for debug isolation |

# 5. Program status line

`Roadmap v0.6.0 Phase D | Handover delta v2.0 | Tracking: BUILD_PLAN.md / ROADMAP_TRACKER.md / RUNNING_LOG entry #44 | Backlog: BACKLOG.md`

# 6. Pending decisions for the user

1. **Set Gemini paid-tier budget alert?** — Recommended $5/mo; would honor the $5/mo Anthropic-cap memory pattern.
2. **Stop Mac cloudflared launchdaemon?** — Currently loaded but idle. Hygiene vs. emergency-rollback assist.
3. **B2 backup script wiring** — Sub-phase under D-18 or absorbed into Phase E?
4. **`tsx` Hetzner runtime dep removal** — Phase E candidate. Switch to compile step at deploy time.

# 7. What the user authorized this session

| Action | Authorization |
|--------|---------------|
| Override 48h pacing rule | Explicit ("I am not using the brain now. We can override the 48 hour rule if nothing else breaks.") |
| Pasting CF_API_TOKEN in chat | Explicit (rotation queued for Phase E) |
| Editing Hetzner `/etc/cloudflared/config.yml` | Implicit (cutover was in flight; I logged the change immediately and backed up the prior config) |
| Killing Mac next-server pid 32761 | Implicit (D-14 is in scope of the cutover) |
| Selecting paid Gemini tier | Explicit ("Yes. give me detailed steps") |

# 8. What the user did NOT authorize

- Force-pushing
- Stopping Mac cloudflared launchdaemon
- Removing baseline handover folder
- Tagging v0.6.0
- Writing the B2 backup script
- Adding new dependencies
