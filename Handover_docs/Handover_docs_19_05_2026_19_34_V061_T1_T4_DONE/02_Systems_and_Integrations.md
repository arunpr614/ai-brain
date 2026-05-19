# M2 — Systems and integrations (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/02_Systems_and_Integrations.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/02_Systems_and_Integrations.md) |

> **For the next agent:** No new external services were added or removed in this tranche. This file documents only configuration changes to existing services (Cloudflare edge headers, Hetzner systemd unit unchanged, Anthropic + Gemini providers untouched). If you're auditing for new SaaS dependencies, there are none.

## 1. Services unchanged from cutover-done

| Service | State | Where to look |
|---------|-------|---------------|
| **Cloudflare** | named tunnel UUID `64fb278e-…`; ingress map untouched | `/etc/cloudflared/config.yml` on Hetzner |
| **Hetzner brain.service** | systemd unit; `127.0.0.1:3000`; restarted twice this session (no config change) | `/etc/systemd/system/brain.service` |
| **Anthropic API** | Claude Sonnet 4.6 (Ask) + Haiku 4.5 (Batch enrichment) — unchanged | `BRAIN_ANTHROPIC_API_KEY` |
| **Gemini API** | gemini-embedding-001 @ 768; paid tier active since cutover | `GEMINI_API_KEY` |
| **GitHub** | `github.com/arunpr614/ai-brain` — pushed `5a0f2f1`, `7ec050e`, `87d9253` |
| **node-cron schedules** | `30 19 * * *` UTC submit + `*/5 * * * *` poll | `src/lib/cron/*.ts` |
| **Backup scheduler** | every 6h; 28-snapshot retention; first post-restart snapshot at `2026-05-19_1926.sqlite` | `src/lib/backup.ts` |

## 2. Configuration delta (this tranche)

| Layer | Change | Visibility |
|-------|--------|------------|
| Edge → server | `Strict-Transport-Security` header now sent on every response | browser-cached for 2 years; lock-in is intentional |
| Server → browser | `Set-Cookie: …; Secure` on session cookie in production | only via DevTools; affects every authenticated session post-deploy |
| Server → log sink | bearer-reject entries in `/opt/brain/data/errors.jsonl` now include `cf_ip` field | server-side observability gain |

## 3. New external dependency surface? — No

A v0.6.1 plan task (T-15) will trim the SwiftBar Mac plugin to a single `brain.arunp.in/api/health` probe, but that hasn't been done yet. **No new SaaS, no new CDN, no new analytics, no new logging vendor** in this delta.

## 4. Cron + scheduler health (verification recipe)

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo journalctl -u brain --since "today" | grep -E "batch-cron|backup"'
# Expect:
# [batch-cron] scheduled submit='30 19 * * *' (01:00 IST) poll='*/5 * * * *' (every 5m)
# [backup] scheduler started — every 6h, keeping 28 snapshots
# [backup] initial snapshot -> /opt/brain/data/backups/2026-05-19_NNNN.sqlite
```

## 5. Cross-references

- [M1 — architecture](./01_Architecture.md) — request-pipeline diff
- [M3 — secrets](./03_Secrets_and_Configuration.md) — env var landscape (no changes here either)
- [`Handover_docs_19_05_2026_15_21_CUTOVER_DONE/02_Systems_and_Integrations.md`](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/02_Systems_and_Integrations.md) — full service inventory
