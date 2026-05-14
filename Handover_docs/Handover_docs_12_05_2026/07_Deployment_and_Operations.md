# M7 — Deployment and Operations

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/07_Deployment_and_Operations.md`
**Baseline:** full
**Scope:** Hetzner setup, cutover runbook, backup/restore, rollback
**Applies to:** **Lane C primary** — Lane L reads §1 + §7 for awareness only
**Status:** COMPLETE (documentation)

> **For the next agent:** this is the operational manual for moving AI Brain from Mac to Hetzner and keeping it alive after. Procedures are numbered because agents follow numbers more reliably than bullets. **Lane L:** do not run any procedure in this file. If the Mac server has an issue during Lane C's migration window, that's Lane C's problem — redirect the user to Lane C.

---

## 1. Deployment topology (what runs where)

### 1.1 Current (pre-v0.6.0)

| Component | Host | How started |
|---|---|---|
| Next.js app | Mac (M1 Pro) | `npm run start` in user terminal |
| Ollama | Mac | `ollama serve` (launchd optional) |
| SQLite | Mac | embedded in Node process |
| cloudflared | Mac | launchd `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist` |
| Backups | Mac | internal scheduler in `src/db/client.ts`, every 6h → `data/backups/` |

### 1.2 Target (post-v0.6.0)

| Component | Host | How started |
|---|---|---|
| Next.js app | Hetzner CX23 Helsinki | systemd `brain.service` (to be created) |
| Anthropic + Gemini | Cloud API | outbound HTTPS; no daemon |
| SQLite | Hetzner (local SSD) | embedded in Node process |
| cloudflared | Hetzner | systemd `cloudflared.service` |
| Backups | Hetzner | cron + rclone → Backblaze B2, daily 3:15 AM UTC |

## 2. Hetzner server setup procedure

### 2.1 Prerequisite — resolve SSH key blocker (open issue)

The provisioned server rejects the local key. Pick one:

**Path A — Web console paste (recommended, 2 min):**
1. Open Hetzner Cloud Console
2. Click server `ubuntu-4gb-hel1-2`
3. Top-right toolbar → click `>_` icon (web console)
4. A root terminal opens (no password needed)
5. In that web terminal, paste (key replaced with Lane C's actual `~/.ssh/ai_brain_hetzner.pub` on Mac):
   ```bash
   mkdir -p /root/.ssh
   echo "<PUBLIC_KEY_LINE>" >> /root/.ssh/authorized_keys
   chmod 700 /root/.ssh
   chmod 600 /root/.ssh/authorized_keys
   ```
6. Test from Mac: `ssh -i ~/.ssh/ai_brain_hetzner root@204.168.155.44 'hostname'`

**Path B — Rebuild server (30 sec):**
1. Hetzner Console → server → Rebuild tab
2. Select Ubuntu 24.04
3. Tick SSH key `mac-arun`
4. Click Rebuild. Same IP retained; DB-less state reset.

### 2.2 Initial hardening (after SSH works)

Paste as single block as root:
```bash
apt update && apt upgrade -y
adduser brain --gecos "" --disabled-password
usermod -aG sudo brain
mkdir -p /home/brain/.ssh
cp /root/.ssh/authorized_keys /home/brain/.ssh/
chown -R brain:brain /home/brain/.ssh
chmod 700 /home/brain/.ssh
chmod 600 /home/brain/.ssh/authorized_keys
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
timedatectl set-timezone Asia/Kolkata
```

Verify in a SECOND terminal BEFORE closing root session:
```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo whoami'
# Must print: root
```

### 2.3 Hetzner Cloud firewall (console-side)

1. Hetzner Console → Firewalls → Create
2. Name: `brain-outbound-only`
3. Inbound rules: SSH TCP 22 from your IP (or `0.0.0.0/0` if dynamic); block everything else
4. Outbound rules: allow all (defaults)
5. Apply to: server `ubuntu-4gb-hel1-2`

Cloudflare tunnel is outbound-only, so no inbound ports other than SSH.

### 2.4 Install app dependencies

As `brain@hetzner`:
```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs sqlite3 git build-essential

# cloudflared
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
rm /tmp/cloudflared.deb

# gpg for backup encryption
sudo apt install -y gnupg

# rclone for B2
curl https://rclone.org/install.sh | sudo bash
```

### 2.5 Prepare app directory

```bash
sudo mkdir -p /var/lib/brain /opt/brain
sudo chown brain:brain /var/lib/brain /opt/brain
cd /opt/brain
git clone https://github.com/arunpr614/ai-brain.git .
git checkout lane-c/v0.6.0-cloud   # or whichever branch has the v0.6.0 code
npm ci --production=false
```

### 2.6 Smoke test

Validate sqlite-vec loads on this VM (glibc 2.35 on Ubuntu 24.04 is fine):
```bash
cd /opt/brain
node -e "const Database = require('better-sqlite3'); const db = new Database('/tmp/test.db'); const vec = require.resolve('sqlite-vec/vec0'); db.loadExtension(vec); console.log('sqlite-vec OK');" && rm /tmp/test.db
```

If this prints `sqlite-vec OK`, the stack is compatible. If it fails, **STOP** — do not continue; report to user.

## 3. Environment setup on Hetzner

Create `/opt/brain/.env` as `brain` user, with 600 perms, containing (values redacted in this doc):

```bash
BRAIN_BEARER=<copied from Mac's .env>
ANTHROPIC_API_KEY=<new from console.anthropic.com>
GEMINI_API_KEY=<new from aistudio.google.com>
EMBED_PROVIDER=gemini
BRAIN_ENRICH_BATCH_MODE=true
BRAIN_ENRICH_CRON_UTC="0 3 * * *"
BRAIN_BACKUP_GPG_RECIPIENT=<user's gpg key-ID>
BRAIN_BACKUP_B2_BUCKET=<b2 bucket name>
NODE_ENV=production
DATABASE_URL=/var/lib/brain/brain.sqlite
OLLAMA_HOST=unused_post_v0.6.0
```

```bash
chmod 600 /opt/brain/.env
```

## 4. Systemd unit for the app

Create `/etc/systemd/system/brain.service` (as root):

```ini
[Unit]
Description=AI Brain Next.js server
After=network.target

[Service]
Type=simple
User=brain
WorkingDirectory=/opt/brain
EnvironmentFile=/opt/brain/.env
ExecStart=/usr/bin/node node_modules/.bin/next start -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable brain.service
# Do NOT start yet — start at cutover, after DB copy
```

## 5. Cloudflare tunnel on Hetzner

### 5.1 Copy tunnel credentials from Mac

From Mac:
```bash
scp /etc/cloudflared/config.yml brain@204.168.155.44:/tmp/cf-config.yml
scp /etc/cloudflared/*.json brain@204.168.155.44:/tmp/cf-creds.json
```

(Requires `sudo cat` on Mac side first since `/etc/cloudflared` is root-owned. Do that via `sudo cat /etc/cloudflared/*.json > /tmp/mac-cf-creds.json && scp /tmp/mac-cf-creds.json brain@204...:/tmp/`)

### 5.2 Install on Hetzner

```bash
sudo mkdir -p /etc/cloudflared
sudo cp /tmp/cf-config.yml /etc/cloudflared/config.yml
sudo cp /tmp/cf-creds.json /etc/cloudflared/<uuid>.json   # match UUID in config.yml
sudo chmod 600 /etc/cloudflared/*
sudo cloudflared service install
```

### 5.3 Fix the known plist/systemd issue

cloudflared's auto-install may miss the `tunnel run` args (historical Mac issue; may or may not apply on systemd). After install, verify:
```bash
systemctl cat cloudflared
```

If the ExecStart doesn't include `--config /etc/cloudflared/config.yml tunnel run <UUID>`, manually edit:
```bash
sudo systemctl edit cloudflared
```

Override with:
```
[Service]
ExecStart=
ExecStart=/usr/local/bin/cloudflared --config /etc/cloudflared/config.yml --no-autoupdate tunnel run
```

## 6. Cutover runbook (the load-bearing procedure)

**Window:** 03:00 IST (user's dead zone per S-1; no captures expected 21–22 IST is the active window, 03 IST is deep dead).

**Duration:** ~10 minutes wall-clock.

**Data loss window:** any captures attempted between D1 and D4. At the 03 IST cutover, this should be zero.

### 6.1 Pre-cutover checklist (run before 03:00 IST)

- [ ] Hetzner server up, brain user created, firewall set, Node + cloudflared + rclone + gpg installed
- [ ] Repo cloned on Hetzner with v0.6.0 code
- [ ] `.env` on Hetzner populated with all new keys (Anthropic, Gemini, B2, GPG)
- [ ] `brain.service` systemd unit created and `enabled` (but not started)
- [ ] Tunnel config copied; cloudflared service installed (but not started)
- [ ] B2 bucket created + rclone configured + one test upload succeeded
- [ ] gpg key generated on Hetzner + exported + stored off-box (user's responsibility)
- [ ] `scripts/migrate-to-cloud.sh` written + dry-run tested
- [ ] User awake at 03:00 IST and available for the full 10-min window

### 6.2 Execution steps

All steps run from the MAC unless marked `[on Hetzner]`.

```bash
# D1 — Stop Mac server + cloudflared
pkill -f "next start" || true
sudo launchctl unload /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# D2 — Clean-backup the Mac DB (flush WAL)
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
sqlite3 data/brain.sqlite ".backup data/migration-snapshot.sqlite"
sha256sum data/migration-snapshot.sqlite > data/migration-snapshot.sha256
cat data/migration-snapshot.sha256
# Note the hash.

# D3 — Transfer
scp data/migration-snapshot.sqlite brain@204.168.155.44:/var/lib/brain/brain.sqlite
scp data/errors.jsonl brain@204.168.155.44:/var/lib/brain/   # optional; keep history

# D4 — Verify on Hetzner
ssh brain@204.168.155.44 'sha256sum /var/lib/brain/brain.sqlite'
# MUST match the D2 hash. If not: STOP.

# D5 — [on Hetzner] Start services
ssh brain@204.168.155.44
sudo systemctl start cloudflared
sleep 5
sudo systemctl status cloudflared    # must be active
sudo systemctl start brain
sleep 3
sudo systemctl status brain          # must be active
exit

# D6 — Sanity-check from Mac
curl https://brain.arunp.in/api/health
# Expect 401 (bearer-gated). If 502 → tunnel not reaching backend. STOP.

# D7 — Test capture from extension or APK
# User clicks "Save to Brain" on any URL
# Expect: 200 response, item appears in library

# D8 — Test Ask streaming
# User asks any question in UI
# Expect: SSE stream from Anthropic, answer appears

# D9 — Mac server stays stopped. DO NOT restart.
```

### 6.3 Success criteria for cutover

- [ ] D4 hash matches
- [ ] D6 returns 401 (not 502 or timeout)
- [ ] D7 capture succeeds end-to-end
- [ ] D8 Ask streams a real answer
- [ ] No errors in `/var/log/syslog` or `journalctl -u brain -n 100` on Hetzner

If all five: cutover succeeded. Tag v0.6.0.

If any fail: execute §7 rollback within 60 min.

## 7. Rollback (cloud → Mac)

**Trigger:** any D6/D7/D8 failure, or user decision post-cutover.

**Target: <60 min end-to-end.**

```bash
# R1 — Stop Hetzner services
ssh brain@204.168.155.44 'sudo systemctl stop brain cloudflared'

# R2 — Download latest DB from Hetzner to Mac
scp brain@204.168.155.44:/var/lib/brain/brain.sqlite /tmp/hetzner-brain.sqlite
sha256sum /tmp/hetzner-brain.sqlite
# Record the hash for audit.

# R3 — Stash current Mac DB
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
mv data/brain.sqlite "data/brain.sqlite.pre-rollback.$(date +%Y%m%d-%H%M%S)"

# R4 — Install the Hetzner DB as new Mac DB
cp /tmp/hetzner-brain.sqlite data/brain.sqlite
sqlite3 data/brain.sqlite "PRAGMA journal_mode=WAL;"

# R5 — Start Mac services
npm run start &
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# R6 — Sanity check
curl http://127.0.0.1:3000/api/health     # local 401
curl https://brain.arunp.in/api/health     # tunnel 401

# R7 — Test capture + Ask from APK + extension

# R8 — Delete the Hetzner server (or leave running at $5.59/mo if you want another attempt later)
```

**Post-rollback:** running-log entry explaining what failed. Update M8 with new known-issue.

## 8. Ongoing backup (post-cutover)

### 8.1 Cron entry (`brain` user crontab on Hetzner)

```cron
15 3 * * * /opt/brain/scripts/backup-to-b2.sh >> /var/log/brain-backup.log 2>&1
```

3:15 AM UTC = 12 min after enrichment batch submits; won't collide.

### 8.2 `scripts/backup-to-b2.sh` outline (Lane C writes this)

```bash
#!/bin/bash
set -euo pipefail

DB=/var/lib/brain/brain.sqlite
STAGE=/tmp/brain-backup-$(date +%Y%m%d-%H%M%S).sqlite
sqlite3 "$DB" ".backup $STAGE"

gpg --batch --yes --encrypt --recipient "${BRAIN_BACKUP_GPG_RECIPIENT}" --output "${STAGE}.gpg" "$STAGE"
rm "$STAGE"

rclone copy "${STAGE}.gpg" "b2:${BRAIN_BACKUP_B2_BUCKET}/daily/"
rm "${STAGE}.gpg"

# Retention: 30 daily kept by B2 lifecycle rules
echo "[$(date -u)] backup OK"
```

### 8.3 Restore drill (test monthly; first one within 1 week of cutover)

1. On a disposable VM or the Mac: `rclone copy b2:bucket/daily/latest.sqlite.gpg /tmp/`
2. `gpg --decrypt /tmp/latest.sqlite.gpg > /tmp/restore.sqlite`
3. `sqlite3 /tmp/restore.sqlite "SELECT COUNT(*) FROM items;"` → must return sensible count
4. Log the drill in running-log

## 9. Monitoring

- `journalctl -u brain -f` — live app logs
- `journalctl -u cloudflared -f` — tunnel health
- `/var/log/brain-backup.log` — daily backup outcomes
- Anthropic Console → Usage → alert when monthly > $5
- No formal uptime monitor (UptimeRobot / healthchecks.io) — deferred; Brain is single-user and user notices outages within an hour

## 10. Lane boundaries restated

Everything in this file is **Lane C's surface**. Lane L runs NONE of these procedures. If the Mac server misbehaves during the migration window, user pings Lane C (not Lane L). Lane L works on code that goes through normal git → main → rebase workflow and never touches ops.
