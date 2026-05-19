# AI Brain: Debugging and incident response (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md](../Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** Use this for triage when something breaks. Two NEW symptoms surfaced today (silent 404 from CF tunnel; chunkless items from transaction rollback). Both have specific recipes below.

## 1. Primary playbooks

| Doc | Use when |
|-----|----------|
| This file §3 | First-pass triage by symptom |
| [Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md](../Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md) | Pre-cutover diagnostic recipes |
| [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) §8 | Rollback path |
| [RUNNING_LOG.md entry #44](../../RUNNING_LOG.md) | Today's session narrative for cross-reference |

## 2. Outside-in diagnostic layers

| Layer | What fails | Typical signature | First fix |
|-------|-----------|-------------------|-----------|
| DNS | CNAME drift / wrong target | `dig brain.arunp.in CNAME` doesn't show `64fb278e-...` | Re-run `cutover.sh` D-13 PATCH; or PATCH manually via CF API |
| Tunnel ingress | New hostname not in tunnel ingress | `curl https://<host>/api/health` returns silent 404 with empty body | Edit `/etc/cloudflared/config.yml` and restart cloudflared (see M8 §4) |
| systemd brain.service | Process crash / OOM / not active | `systemctl is-active brain` says `failed`; `journalctl -u brain` shows stack trace | `sudo systemctl restart brain`; investigate journal |
| Auth / bearer | `BRAIN_LAN_TOKEN` mismatch between client + server | `/api/health` returns 401 | `grep BRAIN_LAN_TOKEN /etc/brain/.env` on Hetzner; compare to client config |
| Embedding pipeline | `chunks` empty for an item with `enrichment_state='done'` | Vector search returns FTS-only results | Re-run `node --import tsx scripts/backfill-embeddings.mjs` (default mode) |
| Realtime enrich | `[enrich] LLM provider unreachable; backing off 30000ms` loop | Log spam every 30s; new captures stuck in `pending` | `sudo systemctl restart brain` |
| Cron schedule drift | Daily batch doesn't fire | No `[batch-cron] submit tick` in journal at 19:30 UTC | Restart brain.service; check `node-cron` stale-ref memory |
| Gemini billing | Billing unlinked → free tier 100 RPM | `EMBED_HTTP` 429 errors during backfill | Re-link billing in Cloud Console |

### 2.1 Quick health-check chain

```bash
# 1. CNAME
dig brain.arunp.in CNAME +short
# Expect: 64fb278e-15eb-4fe2-a1e1-2ca48ee490e7.cfargotunnel.com.

# 2. End-to-end
TOKEN=<bearer>
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" https://brain.arunp.in/api/health
# Expect: 200

# 3. Hetzner direct
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo systemctl is-active brain && sudo systemctl is-active cloudflared'
# Expect: active / active

# 4. Vector coverage
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; \
   node -e "const db=require(\"better-sqlite3\")(\"/opt/brain/data/brain.sqlite\"); \
   const sv=require(\"sqlite-vec\"); sv.load(db); \
   console.log(db.prepare(\"SELECT COUNT(*) AS items FROM items\").get(), \
   db.prepare(\"SELECT COUNT(*) AS vec FROM chunks_vec\").get())"'
# Expect: { items: N }, { vec: M } where M >= N
```

## 3. Symptom → quick reference

| Symptom | Likely cause | Pointer |
|---------|--------------|---------|
| `brain.arunp.in/api/health` returns **404 with empty body** | Tunnel ingress missing the hostname (silent 404) | M8 §4 — edit `/etc/cloudflared/config.yml`. |
| `brain.arunp.in/api/health` returns **502** | brain.service down OR bound to wrong port (the Mac 502 today was port mismatch) | `ssh ... 'sudo systemctl restart brain'`; or check `lsof -nP -iTCP:3000 -sTCP:LISTEN`. |
| `brain.arunp.in/api/health` returns **401** | `BRAIN_LAN_TOKEN` mismatch | Compare client `.env` with `/etc/brain/.env` on Hetzner. |
| `brain.arunp.in/api/health` returns **200 but slow (>3s)** | Hetzner box overloaded OR cold-start | Check `journalctl -u brain --since "5 min ago"`. |
| `[enrich] LLM provider unreachable; backing off 30000ms` log loop | `enrichment-worker.ts` `isAlive()` probe failing repeatedly | `sudo systemctl restart brain` (workaround). Long-term: instrument worker to self-heal without restart. |
| Item with `enrichment_state='done'` but vector search misses it | `pipeline.ts` transaction rollback left it chunkless | Re-run `node --import tsx scripts/backfill-embeddings.mjs` (default mode) on Hetzner. |
| Backfill 429s on Gemini | Billing unlinked from GCP project | Re-link billing in console.cloud.google.com. |
| `cloudflared tunnel ingress validate` errors | Malformed YAML in `config.yml` | Restore from `config.yml.pre-d13` or pre-DATE backup; fix YAML. |
| Daily batch doesn't fire at 01:00 IST | Cron stale-ref OR brain.service was restarted between schedule and tick | `journalctl -u brain --since "today" \| grep batch-cron`; if no `submit tick` log, restart brain. |
| Vector search returns empty for everything | sqlite-vec extension not loaded | Application code loads it via `factory()`; if you hit raw `node -e`, you need `require("sqlite-vec").load(db)` first. |

## 4. Logging / observability

| Prefix | Component | Use for |
|--------|-----------|---------|
| `[boot]` | Next.js instrumentation hook | Verify cron + worker + backup all start at boot |
| `[backup]` | Backup scheduler | Confirm 6h cadence + snapshot writes |
| `[enrich]` | Realtime enrichment worker | Track per-item enrich runs and unreachable-loop bug |
| `[batch-cron]` | Daily Anthropic batch | Confirm 01:00 IST submit + 5-min poll ticks |
| `[backfill]` | Manual backfill script | Per-item progress during re-embedding |

**Log search recipes:**

```bash
# Cron health
ssh ... 'sudo journalctl -u brain --since "today" | grep -E "batch-cron|backup"'

# Capture flow (for D-15 user-side validation)
ssh ... 'sudo journalctl -u brain --since "5 min ago" | grep "POST /api/items"'

# Enrich loop bug detection
ssh ... 'sudo journalctl -u brain --since "1 hour ago" | grep "LLM provider unreachable" | wc -l'
# >5 = the bug is recurring, restart brain

# Recent errors
ssh ... 'sudo journalctl -u brain --since "1 hour ago" -p err'
```

## 5. Filing new bugs

Use the `Bug_Report_Creator` skill (available in this session). Save to: `Bug_Report/<Bug_Report_YYYY-MM-DD_HHMMSS.md>`.

For known bugs surfaced this session that are NOT yet in the Bug_Report folder:

1. **`pipeline.ts` single-tx rollback leaves chunkless items.** Self-healing via backfill default mode; behavior is undocumented contract. Worth a regression test before formalizing.
2. **`enrichment-worker.ts` `isAlive()` 45-min unreachable loop.** Cause unconfirmed; resolved by process restart. Worth instrumenting before the next session sees it on production traffic.
3. **`config.yml` ingress map drift.** Procedural risk, not a code bug — but worth a "post-flip ingress validation" CI check or pre-flight script.

## 6. Related handover files

- [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — secret-related failures
- [06_Handover_Current_Status.md](./06_Handover_Current_Status.md) — what is deployed vs open
- [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — deploy procedures and rollback
- [Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md](../Handover_docs_19_05_2026_13:47/08_Debugging_and_Incident_Response.md) — pre-cutover triage recipes
