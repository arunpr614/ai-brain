---
Title: AI Brain Handover — Deployment and Operations (M8)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This file documents the cutover runbook AND the 3 known bugs that must be fixed before re-running it. **Do not run `cutover.sh cutover` until §2 fixes are applied.**
>
> ⚠️ **Safety guardrail:** The cutover script can disrupt the live `brain.arunp.in` URL. Verify pre-conditions in [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §6 before any execution.

# 1. Cutover script overview

`scripts/deploy/cutover.sh` is a single bash script with three subcommands:

| Subcommand | What it does |
|---|---|
| `verify` | Pre-flight invariants: sqlite3, jq, rsync, ssh-key, Mac DB exists, Hetzner SSH works, Hetzner brain.service active. ~5 sec. |
| `cutover` | D-12 (DB swap) + D-13 (DNS flip) + D-14 (kill Mac brain). ~5–10 min if all green. |
| `rollback` | Reverts D-13 (CNAME → Mac) + D-14 (`launchctl bootstrap` to restart Mac cloudflared). D-12 is forward-only — Mac DB is the rollback target. |

**Invocation:**
```bash
CF_API_TOKEN=<from Bitwarden> ./scripts/deploy/cutover.sh <subcommand>
```

**Required env:** `CF_API_TOKEN` (Cloudflare API token from D-10, in Bitwarden).
**Optional env:** `HETZNER_SSH_KEY` (default `~/.ssh/ai_brain_hetzner`), `HETZNER_HOST` (default `brain@204.168.155.44`).

# 2. **THE 3 KNOWN BUGS — fix BEFORE re-running cutover**

## 2.1 Bug 1: WAL leak during DB swap (HIGH severity)

**Where:** [scripts/deploy/cutover.sh](../../scripts/deploy/cutover.sh), function `d12_db_migrate()`.

**Symptom:** `mv /tmp/brain-cutover.sqlite /opt/brain/data/brain.sqlite` swaps the file, but pre-existing `.sqlite-wal` and `.sqlite-shm` remain. SQLite mounts the new file with stale WAL pages → corrupted view (1 item visible instead of 8).

**Reproducer (do NOT run on production):** spin up an empty SQLite DB on Hetzner, write some rows to populate `-wal`, run `mv` over `.sqlite` while `-wal` exists, restart the service, observe corrupted SELECTs.

**Fix:** add `rm -f` after the `mv` step. Specifically:

Find this block in `d12_db_migrate()`:
```bash
log "D-12: backing up Hetzner's existing DB"
ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" \
  'mv /opt/brain/data/brain.sqlite /opt/brain/data/brain.sqlite.pre-cutover 2>/dev/null || true; \
   mv /tmp/brain-cutover.sqlite /opt/brain/data/brain.sqlite; \
   chmod 600 /opt/brain/data/brain.sqlite'
```

Replace with:
```bash
log "D-12: backing up Hetzner's existing DB and clearing stale WAL"
ssh -i "$SSH_KEY" -o BatchMode=yes "$HOST" \
  'mv /opt/brain/data/brain.sqlite /opt/brain/data/brain.sqlite.pre-cutover 2>/dev/null || true; \
   rm -f /opt/brain/data/brain.sqlite-wal /opt/brain/data/brain.sqlite-shm; \
   mv /tmp/brain-cutover.sqlite /opt/brain/data/brain.sqlite; \
   chmod 600 /opt/brain/data/brain.sqlite'
```

**Verification after fix:** rerun cutover (in a non-production simulator if possible) and confirm row count parity check passes on the first try.

**Lesson:** SQLite is not a single-file database. Always treat `.sqlite + -wal + -shm` as a unit.

## 2.2 Bug 2: `--reset` wipe predicate (MEDIUM severity)

**Where:** [scripts/backfill-embeddings.mjs](../../scripts/backfill-embeddings.mjs), function `wipeChunksFor()`.

**Symptom:** `--reset` reports `wiped 0 chunk row(s) and 0 vec row(s)` even when `chunks_vec` has stale rows. Subsequent re-embed hits `UNIQUE constraint failed on chunks_vec primary key`.

**Root cause:** the wipe joins `chunks_vec` to `chunks` via rowid:
```sql
DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)
```
But Mac's DB had 0 rows in `chunks` (somehow `chunks_vec` was populated directly without `chunks` rows). The SELECT returns empty → DELETE is a no-op → vec rows persist.

**Reproducer:**
```sql
-- Set up: 1 row in chunks_vec, 0 rows in chunks
INSERT INTO chunks_vec(rowid, embedding) VALUES (1, X'...');
-- Run the buggy wipe:
DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = 'foo');
SELECT COUNT(*) FROM chunks_vec;  -- still 1, expected 0
```

**Fix:** wipe `chunks_vec` directly. Replace `wipeChunksFor()` with:

```javascript
async function wipeChunksFor(itemIds) {
  const { getDb } = await import("../src/db/client.ts");
  const db = getDb();
  const wipe = db.transaction((ids) => {
    // Delete chunks_vec rows whose rowids correspond to chunks for these items.
    // Belt-and-suspenders: also nuke any orphan vec rows (vec0 doesn't enforce
    // referential integrity, so vectors can survive their parent chunks).
    const delVecOrphans = db.prepare(
      `DELETE FROM chunks_vec WHERE rowid NOT IN (SELECT rowid FROM chunks)`,
    );
    const delVecScoped = db.prepare(
      `DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)`,
    );
    const delChunks = db.prepare(`DELETE FROM chunks WHERE item_id = ?`);
    let v = delVecOrphans.run().changes;
    let c = 0;
    for (const id of ids) {
      v += delVecScoped.run(id).changes;
      c += delChunks.run(id).changes;
    }
    return { vec: v, chunks: c };
  });
  return wipe(itemIds);
}
```

**Verification:** before and after, query `SELECT COUNT(*) FROM chunks_vec` via Node (CLI sqlite3 can't load `vec0`). Should show 0 after wipe.

**Lesson:** `chunks_vec` is a vec0 virtual table. It does not auto-cascade from `chunks`. Treat it as an independent storage that needs explicit cleanup.

## 2.3 Bug 3: Gemini free-tier TPM throttle (MEDIUM severity, partly mitigated)

**Where:** [src/lib/embed/gemini.ts](../../src/lib/embed/gemini.ts) (working tree, uncommitted) + [src/lib/embed/pipeline.ts](../../src/lib/embed/pipeline.ts).

**Symptom:** `gemini-embedding-001` returns HTTP 429 RESOURCE_EXHAUSTED for large transcripts (~50k chars and up). 6 of 8 items in the Mac DB embed cleanly; the 2 large transcripts fail.

**Diagnosis (empirical):**
- `embedContent` (single) caps at ~100 RPM free tier
- `batchEmbedContents` caps much lower (~1 batch/min observed, with 16 large parts)
- TPM cap (~30,000 estimated) exhausts on a single large transcript before the item completes

**Mitigation in working tree:**
- Replaced `batchEmbedContents` with serial `embedContent` loop in `gemini.ts`
- Added 1.1s inter-call delay (~55 RPM ceiling)
- Still 429s on the 2 large transcripts because TPM exhausts mid-item

**Resolution options (NOT YET IMPLEMENTED — see [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §3.3 Decision C):**

Option C1 — Longer delay:
```diff
- if (i > 0) await new Promise((r) => setTimeout(r, 1100));
+ if (i > 0) await new Promise((r) => setTimeout(r, 5000));
```
Result: 5 RPM, 44 chunks × 5s = ~4 min/item. May still 429 if TPM is the bottleneck rather than RPM.

Option C2 — Smaller chunks:
```diff
// in src/lib/chunk/index.ts (or equivalent chunker config)
- const TARGET_TOKENS = 2000;
+ const TARGET_TOKENS = 500;
```
Result: 4× more chunks, but each below ~700 tokens. Total tokens unchanged but TPM bursts smaller.

Option C3 — Paid Gemini tier:
- Add billing at `aistudio.google.com`
- No code change needed
- Cost ~$0.0018/mo at projected volume
- **Breaks the "free tier" lock from plan §1 #6** — needs explicit user re-confirmation

Option C4 — Accept partial coverage:
- No code change
- 2 items remain searchable via FTS5 only
- Re-embed manually later when needed

**Verification of any chosen fix:**
```bash
# After applying fix and pushing to Hetzner:
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; node --import tsx scripts/backfill-embeddings.mjs --limit 2'
# Expect: 2 ok · 0 fail (after fix is applied to the 2 stuck transcripts)
```

# 3. Cutover runbook (after bug fixes)

**Pre-conditions** (verify with [06_Handover_Current_Status.md](06_Handover_Current_Status.md) §6):
1. CNAME state confirms `brain.arunp.in` → Mac
2. Mac brain.service responding 200
3. Hetzner brain.service responding 200
4. Bug 1 fixed in `cutover.sh`
5. Bug 2 fixed in `backfill-embeddings.mjs`
6. Bug 3 mitigation chosen + applied
7. Working tree clean OR `gemini.ts` changes committed (Decision B)

## 3.1 Step 1 — Pre-flight verify

```bash
CF_API_TOKEN=<from Bitwarden> ./scripts/deploy/cutover.sh verify
```
**Expected output:** `pre-cutover invariants OK`

## 3.2 Step 2 — Cutover

```bash
CF_API_TOKEN=<from Bitwarden> ./scripts/deploy/cutover.sh cutover
```

**What happens (with Bug 1 fixed):**
1. D-12: snapshot Mac DB via `sqlite3 .backup`, scp to Hetzner, **wipe stale WAL/SHM**, swap DB, restart brain.service, verify row count parity.
2. **MANUAL STEP** — agent must run the embed migration after D-12 completes but before D-13 fires (current `cutover.sh` does NOT do this):
   ```bash
   ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
     'cd /opt/brain && set -a; source /etc/brain/.env; set +a; node --import tsx scripts/backfill-embeddings.mjs --reset'
   ```
   Wait for `8 ok · 0 fail` (assuming Bug 3 mitigation works for large transcripts).
3. D-13: PATCH Cloudflare CNAME for `brain.arunp.in` to point at Hetzner tunnel UUID. Stop Mac cloudflared via `sudo launchctl bootout`.
4. D-14: `pkill -f "next-server.*v16"` to free Mac port 3000.
5. Verify `brain.arunp.in/api/health` returns 200 from Hetzner (journald shows the request).

## 3.3 Step 3 — Post-cutover validation (D-15..D-18)

| Step | Action | Expected |
|---|---|---|
| D-15 | Capture from APK on phone | Item appears at `https://brain.arunp.in` in `pending` state |
| D-16 | Ask query in browser | Sonnet 4.6 streams tokens; citations resolve |
| D-17 | Wait for 01:00 IST batch | Item transitions `pending` → `batched` → `done` overnight |
| D-18 | B2 backup smoke (needs system cron written first) | gpg-decrypt downloaded backup matches live DB row count |

# 4. Rollback runbook

If anything goes wrong AFTER D-13 (live URL flipped to Hetzner):

```bash
CF_API_TOKEN=<from Bitwarden> ./scripts/deploy/cutover.sh rollback
```

**What it does:**
1. PATCH `brain.arunp.in` CNAME back to Mac tunnel UUID `58339d22-...`
2. `sudo launchctl bootstrap` (or `load`) the Mac cloudflared plist

**What it does NOT do:**
- Restart Mac next-server (you may need to manually run `cd <repo> && PORT=3000 npm run start:lan`)
- Touch Hetzner brain.service (it stays running but won't receive traffic)
- Stop Hetzner cloudflared (you can `ssh ... 'sudo systemctl stop cloudflared'` to free the tunnel)
- Revert D-12 DB swap

**When to fire rollback:**
- First nightly batch fails to fire
- Anthropic spend trajectory spikes (>$5/hr)
- HTTP 5xx storm on `brain.arunp.in`
- Hetzner box becomes unreachable

# 5. systemd unit reference

`/etc/systemd/system/brain.service`:
- User: `brain`, Group: `brain`
- WorkingDirectory: `/opt/brain`
- EnvironmentFile: `/etc/brain/.env`
- ExecStart: `/usr/bin/node /opt/brain/server.js`
- Restart: `always`, RestartSec: 5
- Hardening: `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ReadWritePaths=/opt/brain/data`

`/etc/systemd/system/cloudflared.service`:
- Auto-installed by `cloudflared service install`
- Reads `/etc/cloudflared/config.yml` + `/etc/cloudflared/tunnel-creds.json`
- ExecStart: `/usr/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run`

**Common operations:**
```bash
# Check status
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl status brain --no-pager'

# Restart after env or code change
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl restart brain'

# Tail logs
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n journalctl -u brain -f'

# After installing new env file content
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl daemon-reload && sudo -n systemctl restart brain'
```

# 6. Updating /opt/brain after a code change

When code changes and you need to redeploy to Hetzner:

> **GOTCHA — burned 2026-05-19 during v0.6.1 T-1 deploy.** Next.js standalone build
> produces THREE separate output trees (`.next/standalone/`, `.next/static/`,
> `public/`). The standalone tree alone serves blank/broken CSS. You must rsync
> all three. Steps 2a/2b/2c below are mandatory together.

```bash
# 1. Build standalone (Mac)
npm run build

# 2a. Rsync standalone server bundle (server.js + node_modules + .next + src + scripts)
rsync -avz -e "ssh -i ~/.ssh/ai_brain_hetzner" \
  .next/standalone/server.js \
  .next/standalone/.next \
  .next/standalone/src \
  .next/standalone/scripts \
  brain@204.168.155.44:/opt/brain/

# 2b. Rsync .next/static — REQUIRED: standalone build does NOT include client assets.
#     Without this, all chunks (CSS, JS) 404 and the page renders unstyled HTML.
rsync -avz --delete -e "ssh -i ~/.ssh/ai_brain_hetzner" \
  .next/static/ \
  brain@204.168.155.44:/opt/brain/.next/static/

# 2c. Rsync public/ — REQUIRED: favicon, sw.js, offline.html, theme assets live here.
rsync -avz --delete -e "ssh -i ~/.ssh/ai_brain_hetzner" \
  public/ \
  brain@204.168.155.44:/opt/brain/public/

# 3. Restart
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl restart brain'

# 4. Verify (all four must pass)
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl is-active brain'
TOKEN=$(grep ^BRAIN_LAN_TOKEN .env | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
  https://brain.arunp.in/api/health   # expect 200
# Open https://brain.arunp.in/unlock in a browser; confirm the layout has CSS.
# If the page renders as raw HTML with no styling, step 2b was skipped.
```

**For TS-only file edits (no rebuild needed if working tree is just dev):**
```bash
scp -i ~/.ssh/ai_brain_hetzner src/lib/embed/gemini.ts \
  brain@204.168.155.44:/opt/brain/src/lib/embed/gemini.ts
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl restart brain'
```

(Note: this only works because `tsx` was installed on Hetzner — see M5 §3.4 — to interpret `.ts` files at runtime. Phase E candidate to remove this dependency.)

# 7. Backup operations (D-18 prerequisite)

**Status:** the system cron for `sqlite3 .backup → gzip → gpg → rclone to B2` is **NOT yet written.** Plan §3.5 specifies it.

**To wire (D-18 prerequisite):**
1. Install `rclone` on Hetzner (or use `aws-cli` with S3-compatible endpoint).
2. Configure rclone with B2 credentials from `/etc/brain/.env`.
3. Write a script: `scripts/deploy/backup.sh` that does:
   - `sqlite3 /opt/brain/data/brain.sqlite ".backup /tmp/brain-snap.sqlite"`
   - `gzip /tmp/brain-snap.sqlite`
   - `gpg --batch --yes --trust-model always --encrypt --recipient brain@arunp.in /tmp/brain-snap.sqlite.gz`
   - `rclone copy /tmp/brain-snap.sqlite.gz.gpg b2:ai-brain-backups-arunpr614/<datestamp>.sqlite.gz.gpg`
   - `rm /tmp/brain-snap.*`
4. Add system cron entry: `0 */6 * * * /opt/brain/scripts/backup.sh` for every-6-hour runs.
5. Test by manually invoking and decrypting on Mac.

# 8. Glossary of operations terms

| Term | Meaning in this project |
|---|---|
| Cutover | The act of flipping `brain.arunp.in` from Mac to Hetzner |
| Half-state | Current condition: D-12 done but D-13 not |
| Rollback | Revert D-13 + D-14 (NOT D-12 — that's forward-only) |
| Re-embed | Apply S-13's gemini-embedding-001 vectors to existing items |
| Wipe | Delete `chunks` + `chunks_vec` rows for items being re-embedded |
| Smoke | Live wire test against the actual production target |
| Backup loop | Hetzner → B2 encrypted snapshot every 6h (NOT YET WIRED) |
