# S-7: Migration Runbook — Mac → Lightsail + Ongoing Backup + Rollback

**Host:** AWS Lightsail 2 GB / 1 vCPU / 60 GB SSD — Mumbai ap-south-1
**DB:** `data/brain.sqlite` (WAL mode, sqlite-vec virtual tables) — 184 KB live today
**Written:** 2026-05-12

---

## Preconditions

- [ ] Lightsail Ubuntu 22.04 instance running (S-6)
- [ ] SSH key authorised: `ssh ubuntu@<LIGHTSAIL-IP>` succeeds without prompt
- [ ] Node 20 + npm installed on VM (`node --version` ≥ 20)
- [ ] `better-sqlite3` native build confirmed on VM (`npm ci` in `/var/lib/brain` completes cleanly)
- [ ] `sqlite-vec` extension loads on VM (smoke-test: `node -e "require('better-sqlite3')(':memory:').loadExtension('./vec0')"`)
- [ ] cloudflared credentials JSON on VM at `/etc/cloudflared/58339d22-d0be-4fab-94d6-32fd24b04a72.json`
- [ ] cloudflared systemd service installed but **not yet started** on VM
- [ ] `brain` systemd service unit written on VM but **not yet started**
- [ ] `.env` copied to VM at `/var/lib/brain/.env` (API keys intact — DO NOT commit)
- [ ] `data/artifacts/` directory on VM at `/var/lib/brain/data/artifacts/` (`brain-debug-*.apk` files — low-value but copy for completeness)
- [ ] Latest Mac backup exists: `data/backups/` — most recent `*.sqlite` file
- [ ] `sqlite3` CLI installed on Mac (`brew install sqlite3` or confirm `which sqlite3`)
- [ ] Mac server **not** in use — no captures in flight

---

## Migration window

**Target time:** 03:00 IST (all capture activity observed 21:00–22:00 IST; 03:00 is cleanest idle window)
**Expected duration:** 10 minutes
**Writes lost during window:** 0 (zero write activity between 22:00–06:00 based on S-1 baseline; user is asleep)

---

## Steps

### 1 — Stop Mac server

```bash
# On Mac
kill $(pgrep -f "next start") 2>/dev/null || echo "server already stopped"
# Confirm nothing listening on 3000:
lsof -nP -iTCP:3000 -sTCP:LISTEN || echo "clear"
```

### 2 — Clean-backup Mac DB (WAL flush + snapshot)

```bash
# On Mac — run from the repo root
sqlite3 /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/brain.sqlite \
  ".backup /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/migration-snapshot.sqlite"

shasum -a 256 \
  /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/migration-snapshot.sqlite \
  | tee /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/migration-snapshot.sha256
```

`sqlite3 .backup` flushes the WAL into the snapshot before copying — safe even with WAL mode active.

### 3 — Transfer snapshot + errors log to VM

```bash
# On Mac
scp /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/migration-snapshot.sqlite \
    ubuntu@<LIGHTSAIL-IP>:/var/lib/brain/data/migration-snapshot.sqlite

scp /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/errors.jsonl \
    ubuntu@<LIGHTSAIL-IP>:/var/lib/brain/data/errors.jsonl

# artifacts dir (APKs) — optional, skip if you want to re-download later
scp -r /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/artifacts/ \
    ubuntu@<LIGHTSAIL-IP>:/var/lib/brain/data/artifacts/
```

`data/backups/` is intentionally NOT transferred. Old snapshots stay on Mac as an offline archive. The VM starts a fresh rotation.

### 4 — Verify hash on VM

```bash
# On VM
sha256sum /var/lib/brain/data/migration-snapshot.sqlite
# Must match the hash printed in Step 2.
# If hashes differ: STOP — re-run Steps 2–3; do not proceed.
```

### 5 — Activate DB on VM

```bash
# On VM
mv /var/lib/brain/data/migration-snapshot.sqlite /var/lib/brain/data/brain.sqlite
# Ensure correct ownership
chown ubuntu:ubuntu /var/lib/brain/data/brain.sqlite
```

### 6 — Start cloud services

```bash
# On VM — start brain app first, then tunnel
sudo systemctl start brain
sudo systemctl enable brain

# Verify app is up before opening the tunnel
curl -s http://127.0.0.1:3000/api/health
# Expected: HTTP 401 {"error":"Unauthorized"} — that means the app is running.

sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 7 — Sanity-check + confirm cutover

```bash
# From your phone or another device — NOT the Mac where server is stopped
curl -I https://brain.arunp.in/api/health
# Expected: HTTP 401

# Open the Brain UI in browser → unlock with PIN → verify library shows 2 items
# Capture a test note via the extension → confirm it appears in the library
```

Mac server stays stopped. Do not restart it. Rollback plan below if anything is wrong.

---

## What moves vs what stays

| Artefact | Action | Notes |
|----------|--------|-------|
| `data/brain.sqlite` | Copy via Step 2–5 | WAL flushed via `.backup`; includes sqlite-vec chunk data |
| `data/brain.sqlite-shm`, `-wal` | Do NOT copy | Generated fresh on first VM start |
| `data/errors.jsonl` | Copy | Useful for debugging; non-critical |
| `data/artifacts/*.apk` | Copy (optional) | Low-value; can re-download |
| `data/backups/` | Stay on Mac | Mac archive; VM creates fresh rotation |
| `.env` | Pre-copied (Precondition) | API keys; never committed to git |
| `~/.cloudflared/*.json` | Pre-copied (Precondition) | Tunnel credentials |
| `data/migration-snapshot.sqlite` | Delete after cutover | Cleanup: `rm data/migration-snapshot.sqlite data/migration-snapshot.sha256` |

---

## Ongoing backup — Primary: cron + rclone to Backblaze B2

**Why B2:** $0.005/GB/month. At 5 MB DB size, cost is effectively $0.00/month for years. No AWS account complexity.
**Why not Litestream:** Adds daemon complexity for a 184 KB DB with 1–5 writes/day. Overkill. Re-evaluate if DB exceeds 100 MB or write rate exceeds 10/min.
**Why not Lightsail snapshots:** $0.05/GB/month, host-tied (useless if Lightsail account is the failure), requires AWS Console for restore.

**Cadence:** Every 6 hours (matches existing Mac schedule; data loss window ≤ 6 h, acceptable for a personal notes tool).
**Retention:** 7 daily + 4 weekly snapshots (rclone `--max-age` + separate B2 lifecycle rule).

```
# /etc/cron.d/brain-backup on VM
0 */6 * * * ubuntu /usr/local/bin/rclone copy /var/lib/brain/data/brain.sqlite \
  b2:brain-backups/$(date +\%Y-\%m-\%d_\%H\%M).sqlite --b2-hard-delete >> /var/log/brain-backup.log 2>&1
```

> Setup steps (execution phase, not this runbook): create B2 bucket `brain-backups`, run `rclone config` on VM to add B2 remote, install rclone via `curl https://rclone.org/install.sh | sudo bash`.

**Secondary (paranoia tier): Mac pull-sync once per day**

```bash
# On Mac — add to crontab: daily at 04:00 IST
0 4 * * * scp ubuntu@<LIGHTSAIL-IP>:/var/lib/brain/data/brain.sqlite \
  /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/backups/cloud-pull-$(date +\%Y-\%m-\%d).sqlite
```

Gives an offline copy on the Mac independent of B2. Belt and braces; not required for recovery.

---

## Rollback (cloud → Mac)

Trigger: VM unreachable, unexpected cost, privacy concern, or any decision to revert.
Target: < 60 minutes end-to-end.

1. **Revoke tunnel on VM** (or if VM is down, skip — cloudflared will stop routing automatically within ~30 s of the daemon going offline)
   ```bash
   sudo systemctl stop cloudflared brain
   ```

2. **Download latest backup from B2 to Mac**
   ```bash
   rclone copy b2:brain-backups/ \
     /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/data/rollback-restore/ \
     --max-age 24h
   # Pick the most recent file in rollback-restore/
   ```
   Or use the Mac pull-sync copy if B2 is unavailable:
   `data/backups/cloud-pull-<latest-date>.sqlite`

3. **Verify hash** (if B2 backup includes a `.sha256` sidecar; else skip — file-size sanity-check suffices)

4. **Restore on Mac** using the existing script:
   ```bash
   cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
   scripts/restore-from-backup.sh data/rollback-restore/<latest>.sqlite
   ```
   The script moves the old DB aside (`.pre-restore-*.bak`) rather than deleting it.

5. **Start Mac server**
   ```bash
   npm run start
   ```

6. **Start cloudflared on Mac**
   ```bash
   sudo cloudflared service start
   # Or if using launchd: launchctl start com.cloudflare.cloudflared
   ```

7. **Verify** — `curl -I https://brain.arunp.in/api/health` returns 401 and the library loads.

**Data loss from rollback:** At most 6 hours (last B2 backup cadence). If Mac pull-sync ran at 04:00 and rollback happens at 09:00, loss is 5 hours of cloud captures. Acceptable for a personal tool.

---

## Success criteria

- [ ] `brain.arunp.in` serves 401 on `/api/health` from cloud VM
- [ ] Library shows the 2 pre-migration items
- [ ] New capture round-trips correctly (extension → VM → DB → appears in library)
- [ ] Mac server confirmed stopped (no double-capture path)
- [ ] B2 backup cron running: `crontab -l | grep brain-backup`
- [ ] First B2 backup uploaded and verified
- [ ] Mac pull-sync scheduled (secondary)
- [ ] Migration snapshot deleted from both Mac and VM
