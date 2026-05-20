# M7 — Deployment and Operations (delta)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — no deploy this session |

> **For the next agent:** No deploys today. Read §2 (Hetzner probe pattern) before running diagnostic scripts on the box.

---

## 1. What this extends

**Required prior reading:** `../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/07_Deployment_and_Operations.md` for the full deploy procedure, systemd unit, Cloudflare tunnel topology, and rollback flow.

**Net deploy state changes 2026-05-20:** zero. brain.service unchanged. Tunnel unchanged. No rsync, no service restart.

---

## 2. Hetzner probe pattern (NEW — worth memorising)

Today's BUG-RETRIEVE-ITEM revalidation surfaced a working pattern for running diagnostic scripts on the Hetzner box.

### 2.1 The pattern

```bash
# Step 1 — write a probe script under /opt/brain/scripts/
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo -n -u brain bash -c "cat > /opt/brain/scripts/spike-<name>.mjs <<EOF
... script content ...
EOF
"'

# Step 2 — execute with .env sourced into the SAME SHELL as tsx
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 '
sudo -n cat /etc/brain/.env > /tmp/brain-env.sh.$$
cd /opt/brain && set -a && source /tmp/brain-env.sh.$$ && set +a && \
  /opt/brain/node_modules/.bin/tsx /opt/brain/scripts/spike-<name>.mjs
rm -f /tmp/brain-env.sh.$$
'

# Step 3 — clean up post-test
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n -u brain rm -f /opt/brain/scripts/spike-<name>.mjs'
```

### 2.2 Why each step matters

1. **Script under `/opt/brain/scripts/`** — needed for `import "../src/lib/..."` relative-path resolution. `/tmp` doesn't see `/opt/brain/node_modules`.
2. **`sudo cat /etc/brain/.env > /tmp/...`** — needed to read the env without dropping privileges twice. Direct nested `sudo + source` doesn't propagate vars.
3. **`set -a && source ... && set +a`** — exports each var. Without `set -a`, `source` only assigns; `tsx` doesn't see them.
4. **`/opt/brain/node_modules/.bin/tsx`** — explicit path to the project-local `tsx`; `which tsx` may return a different binary.
5. **Cleanup after** — leaves `/tmp` and `/opt/brain/scripts` clean for the next probe.

### 2.3 What signature mistakes burned 5 SSH round-trips today

| Mistake | Symptom |
|---|---|
| Used `{ scope: "item", item_id: ... }` | `retrieve()` doesn't have a scope field; takes `(query: string, opts: { itemId, topK, ... })` |
| Used `query` in opts object | Same — query is positional first arg |
| Ran probe from `/tmp` | `Cannot find module 'better-sqlite3'` (wrong cwd for module resolution) |
| Sourced .env outside the shell that runs tsx | Falls back to Ollama (default `EMBED_PROVIDER`) — `Cannot reach Ollama at http://localhost:11434` |

**Lesson:** read the function signature locally first (`grep -n "export.*function retrieve" src/lib/retrieve/index.ts`) before composing the probe.

---

## 3. Service health checks

Quick verification commands, ordered fastest → slowest:

### 3.1 Live tunnel

```bash
curl -sS https://brain.arunp.in/api/health
# Expected: {"ok":true,...}
```

### 3.2 Service unit

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo -n systemctl status brain --no-pager | head -10'
# Expected: Active: active (running)
```

### 3.3 Recent log

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo -n journalctl -u brain --since "1 hour ago" --no-pager | tail -30'
# Look for: nothing alarming. Expected pattern includes [enrich] LLM provider unreachable lines (BUG-ENRICH-UNREACHABLE-LOOP)
```

### 3.4 DB row counts

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo -n -u brain sqlite3 /opt/brain/data/brain.sqlite \
    "SELECT (SELECT COUNT(*) FROM items) as items, (SELECT COUNT(*) FROM chunks) as chunks;"'
# 2026-05-20: 9 | 82
```

### 3.5 Anthropic round-trip (when validating BUG-ANTHROPIC-OVERLOAD fix)

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 '
sudo -n cat /etc/brain/.env > /tmp/env-$$.sh
set -a && source /tmp/env-$$.sh && set +a
for i in 1 2 3; do
  curl -sS -o /dev/null -w "attempt $i: HTTP=%{http_code} time=%{time_total}s\n" \
    --max-time 15 https://api.anthropic.com/v1/messages \
    -X POST -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d "{\"model\":\"claude-haiku-4-5-20251001\",\"max_tokens\":20,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"
  sleep 2
done
rm -f /tmp/env-$$.sh
'
# 2026-05-20 result: 1× 529 + 2× 200 across 3 retries
```

---

## 4. Backup state (current — pre-D-18)

Local-only:

- `/opt/brain/data/backups/` retains 28 SQLite snapshots, every 6 hours, via `src/instrumentation.ts` boot scheduler.
- **No off-site backup.** That's D-18 / v0.6.2 work.
- Single point of failure: Hetzner host disk.

When v0.6.2 backup work begins, see `04_Implementation_Roadmap_Consolidated.md` §3.2 for the task sequence.
