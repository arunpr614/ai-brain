---
Title: AI Brain Handover — Debugging and Incident Response (M9)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This file is a recipe book for incidents you may hit during cutover resume. The 3 known bugs are diagnosed in M8 §2; this file covers diagnostic steps + mitigation patterns more broadly.

# 1. Quick incident triage

| Symptom | Likely cause | Goto |
|---|---|---|
| `cutover.sh cutover` reports row-count mismatch | Bug 1: WAL leak | M8 §2.1 |
| `--reset` migration says "wiped 0 rows" but vec table still has data | Bug 2: wipe predicate | M8 §2.2 |
| Gemini returns `429 RESOURCE_EXHAUSTED` | Bug 3: free-tier rate limit | M8 §2.3 + this file §3 |
| `brain.arunp.in` returns 502/503 | cloudflared down OR brain.service down | §2 |
| `sqlite3` CLI says "no such module: vec0" | system sqlite3 doesn't auto-load extension; use Node | §6 |
| First nightly batch didn't fire | cron didn't trigger or batch submit failed | §4 |
| Anthropic spend ramping unexpectedly | runaway batch loop OR new high-volume capture | §5 |

# 2. `brain.arunp.in` is down

```bash
# Step 1: which side is failing?
curl -s -o /dev/null -w "edge %{http_code}\n" https://brain.arunp.in
# 502 = tunnel can't reach origin
# 503 = tunnel down
# 200 (without auth) = unexpected
# 401 = healthy

# Step 2: check tunnels
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n systemctl is-active cloudflared brain'
# Both should be "active"

# Step 3: tail journals
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n journalctl -u cloudflared --since "10 min ago" --no-pager | tail -20'
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n journalctl -u brain --since "10 min ago" --no-pager | tail -20'

# Step 4: check origin port directly
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'curl -s -o /dev/null -w "origin %{http_code}\n" http://127.0.0.1:3000/api/health'
# 401 = origin healthy, tunnel issue
# 200 (without auth) = origin healthy, tunnel issue
# Connection refused = brain.service is down, restart it
```

If brain.service is down: `sudo systemctl restart brain`. If tunnel is down: `sudo systemctl restart cloudflared`.

If the issue persists, fall back to rollback (M8 §4).

# 3. Gemini 429 deep diagnostics

## 3.1 Determine which limit was hit

Run a single fresh `embedContent` call with a small input:
```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'set -a; source /etc/brain/.env; set +a; \
   curl -s -o /tmp/r.json -w "HTTP %{http_code}\n" \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}" \
     -H "Content-Type: application/json" \
     --data "{\"content\":{\"parts\":[{\"text\":\"q\"}]},\"outputDimensionality\":768}"; \
   head -c 300 /tmp/r.json; rm /tmp/r.json'
```

Interpretations:
- **HTTP 200 immediately:** quota is recovering. Per-minute throttle. Wait 60s.
- **HTTP 429 immediately even with single tiny input:** longer cooldown needed (1–5 min) OR per-day quota crossed.
- **HTTP 200 on small input but 429 on large items:** TPM (token-per-minute) cap. The mitigation is per M8 §2.3 (longer delays, smaller chunks, paid tier).

## 3.2 Probe size threshold

If you suspect TPM, find where it kicks in:
```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain; set -a; source /etc/brain/.env; set +a; \
   for sz in 1000 5000 10000 20000; do \
     r=$(curl -s -o /tmp/g.json -w "%{http_code}" \
       "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}" \
       -H "Content-Type: application/json" \
       --data "$(python3 -c "import json,sys; print(json.dumps({\"content\":{\"parts\":[{\"text\":\"a\"*$sz}]},\"outputDimensionality\":768}))")"); \
     echo "size=$sz status=$r"; \
     sleep 2; \
   done; rm -f /tmp/g.json'
```

If all sizes return 200 → not a per-call size issue; may be cumulative TPM.

## 3.3 Per-day cap suspicion

Wait 12+ hours and retry. If the same call works in the morning that 429d the night before, you crossed a daily cap.

# 4. First nightly batch didn't fire

Expected: cron at `'30 19 * * *'` UTC (= 01:00 IST) should submit a batch with all `pending` items.

```bash
# Step 1: check journald for the batch-cron line
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n journalctl -u brain --since "today 01:00" --no-pager | grep -i "batch-cron\|enrich"'
# Expect: a line like "[batch-cron] submitted batch ..." around 01:00 IST

# Step 2: inspect items state
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sqlite3 /opt/brain/data/brain.sqlite \
    "SELECT enrichment_state, COUNT(*) FROM items GROUP BY enrichment_state;"'
# Expect: most items "done", maybe some "pending" or "batched"

# Step 3: inspect Anthropic dashboard
# console.anthropic.com → Usage → today
# Expect: a few cents of Haiku batch spend if a batch ran
```

If cron didn't fire:
- brain.service may have restarted between 19:30 UTC and the cron tick
- node-cron task lifecycle issue (memory `reference_node_cron.md`: `.stop()` leaves dead refs; `.destroy()` is correct teardown)
- Manual trigger: hit `/api/items/<id>/enrich` for one item to test the path

# 5. Anthropic spend ramping

```bash
# Console (manual): https://console.anthropic.com → Usage
# Verify $5/mo cap is set: Settings → Plans & Billing → Limits

# Check if any item is in a runaway loop
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sqlite3 /opt/brain/data/brain.sqlite \
    "SELECT enrichment_state, batch_id, COUNT(*) FROM items GROUP BY enrichment_state, batch_id ORDER BY 3 DESC LIMIT 10;"'
# Look for a single batch_id with many "running" or "batched" entries → potentially stuck/looping

# Check brain journal for repeated failures
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n journalctl -u brain --since "1 hour ago" --no-pager | grep -i "error\|fail\|429"'
```

If runaway: `sudo systemctl stop brain` to halt processing, then investigate before restarting.

# 6. Inspecting `chunks_vec` content

System `sqlite3` CLI does NOT auto-load `vec0` extension. Use Node:

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; \
   node -e "
     const Database = require(\"better-sqlite3\");
     const sqliteVec = require(\"sqlite-vec\");
     const db = new Database(\"/opt/brain/data/brain.sqlite\");
     sqliteVec.load(db);
     console.log({
       chunks: db.prepare(\"SELECT COUNT(*) AS n FROM chunks\").get().n,
       chunks_vec: db.prepare(\"SELECT COUNT(*) AS n FROM chunks_vec\").get().n,
       sample_dim: db.prepare(\"SELECT length(embedding) AS bytes FROM chunks_vec LIMIT 1\").get()?.bytes / 4
     });
   "'
```

Expected (post-D-12 + 6/8 re-embed):
```
{ chunks: 16, chunks_vec: 16, sample_dim: 768 }
```

If `sample_dim` is anything other than 768, **stop** — there's a vector-space mismatch.

# 7. SSH or sudo issues

If `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44` fails:

```bash
# Add explicit verbosity
ssh -v -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'true'

# Verify key permissions
ls -la ~/.ssh/ai_brain_hetzner
# Expect: -rw------- (mode 600)

# Verify known_hosts has the entry
grep "204.168.155.44" ~/.ssh/known_hosts
```

If `sudo -n` returns "a password is required":
- The `brain` user must have NOPASSWD sudo. This was set up in Phase A.
- If lost (e.g., after a reboot or sudoers reset), reset via Hetzner Cloud Console:
  - Hetzner web console → server → Console → login as root via console password (in Bitwarden if saved during Phase A)
  - Edit `/etc/sudoers.d/brain` to add `brain ALL=(ALL) NOPASSWD:ALL`

# 8. Restoring the GPG round-trip on Mac

If you ever need to verify gpg works (e.g., before D-18 backup smoke):

```bash
echo "test" | gpg --encrypt --recipient brain@arunp.in > /tmp/test.gpg
gpg --batch --pinentry-mode loopback --passphrase <from Bitwarden> --decrypt /tmp/test.gpg
# Expect: "test"
rm /tmp/test.gpg
```

If passphrase is rejected:
- Bitwarden may have an outdated passphrase entry
- Try the secondary backup location (encrypted iCloud Note, printed copy, etc.)
- If lost permanently: backups in B2 are unrecoverable. Generate new keypair and rotate.

# 9. Useful one-liners

```bash
# Tail brain journal
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo -n journalctl -u brain -f'

# Tail cloudflared journal
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo -n journalctl -u cloudflared -f'

# Hetzner brain.service uptime
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'systemctl show brain --property=ActiveEnterTimestamp'

# How many items per state
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sqlite3 /opt/brain/data/brain.sqlite "SELECT enrichment_state, COUNT(*) FROM items GROUP BY enrichment_state"'

# What's in brain's PATH that uses Node
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'which node npm tsx'

# Disk usage
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'df -h / && du -sh /opt/brain /opt/brain/data /opt/brain/node_modules'

# Recent enrichment activity
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sqlite3 /opt/brain/data/brain.sqlite \
    "SELECT id, enrichment_state, batch_id FROM items ORDER BY captured_at DESC LIMIT 10;"'
```

# 10. Where to look first when something is wrong

| Where to look | What you can learn |
|---|---|
| `journalctl -u brain` | Brain runtime errors, cron firings, embed/enrich failures |
| `journalctl -u cloudflared` | Tunnel registration, edge connectivity |
| Anthropic console | Spend trajectory, key auth failures |
| Bitwarden notes | Passphrase, CF token, vendor key locations |
| `data/errors.jsonl` (in brain working dir) | Application-level error log written by brain |
| `RUNNING_LOG.md` entry #43 | Most recent session's narrative + bugs |
| This handover M5 §3 | Patterns to avoid + recurring concerns |
| `git log --oneline -20` | Recent commit history (for context on what changed) |

# 11. Escalation criteria — when to wake the user

The user accepts 2–3 hour latency for 03:00 IST cutover-window decisions. If you're hitting one of these:

- Anthropic spend > $1/hr (3-sigma over baseline)
- B2 bucket showing unauthorized access
- Hetzner box unreachable for >30 min
- Cutover failed in a way that rollback can't fix
- Discovered evidence of secret exfiltration (e.g., a key in chat history is being used from an unfamiliar IP)

For everything else: queue the decision in chat, fire rollback if it's an obvious "rollback or break" choice, and continue. The user's standing instruction is to err on the side of preserving service availability.

# 12. References to other handover files

- M5 [Project Retrospective](05_Project_Retrospective.md) for context on patterns + recurring failure modes
- M8 [Deployment and Operations](07_Deployment_and_Operations.md) for the cutover runbook + 3 bug fixes
- M3 [Secrets and Configuration](03_Secrets_and_Configuration.md) for rotation procedures
- M7 [Current Status](06_Handover_Current_Status.md) for the half-state details + sanity checks
