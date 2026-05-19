---
Title: AI Brain Handover — Systems and Integrations (M2)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This file maps every external system AI Brain talks to, plus internal integration surfaces. Use it as the lookup table for "where does X live and who owns it." For secrets handling specifically, see M3.

# 1. External vendor inventory

| System | Purpose | Auth | Cost | Status |
|---|---|---|---|---|
| Anthropic API | LLM enrichment (Haiku 4.5) + Ask (Sonnet 4.6) | `ANTHROPIC_API_KEY` (sk-ant-...) | $5/mo hard cap | ✅ wire-verified Hetzner-side |
| Google AI Studio (Gemini) | Text embeddings (`gemini-embedding-001` @ 768) | `GEMINI_API_KEY` (AIza...) | Free tier | ⚠️ wire works but TPM throttle blocks 2 large items |
| OpenRouter | LLM standby (Claude Sonnet via OR) | `OPENROUTER_API_KEY` (sk-or-...) | $0 idle, $0.22/mo if activated | ⏸️ standby, not used |
| Backblaze B2 | Encrypted SQLite backups | `B2_KEY_ID` + `B2_APPLICATION_KEY` (scoped to one bucket) | Free tier | ⏳ not yet wired (D-18 prerequisite) |
| Cloudflare | Tunnel + DNS + DDoS | API token (Phase D-10, expires 2026-06-17) | Free | ✅ tunnel + CNAME live |
| Hetzner Cloud | VM (CX23 Helsinki) | SSH key `~/.ssh/ai_brain_hetzner` | €5.59/mo | ✅ hardened in Phase A |
| GitHub (`arunpr614`) | Source repo | SSH key `~/.ssh/id_ed25519` | Free | ✅ pushed to `origin/main` |

# 2. Internal HTTP surface (API routes)

Routes are session-cookie or bearer-token authed via `src/proxy.ts`. The bearer allow-list is in `src/lib/auth/bearer.ts:67`.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | bearer OR cookie | Health probe |
| `/api/capture/url` | POST | bearer OR cookie | URL capture (extension, APK, browser) |
| `/api/capture/note` | POST | bearer OR cookie | Note capture |
| `/api/capture/pdf` | POST | bearer OR cookie | PDF capture |
| `/api/items` | GET | bearer OR cookie | List items |
| `/api/items/[id]/enrich` | POST | **cookie only** | Manual enrich; `?force=realtime` opt-in |
| `/api/items/[id]/enrichment-status` | GET | **cookie only** | Status + batch_id surface |
| `/api/items/[id]/export.md` | GET | **cookie only** | Export single item |
| `/api/library/export.zip` | GET | **cookie only** | Bulk export |
| `/api/search` | GET | **cookie only** | Search (FTS5 + vector) |
| `/api/ask` | POST | **cookie only** | Sonnet streaming |
| `/api/threads` | GET/POST | **cookie only** | Thread CRUD |
| `/api/threads/[id]/messages` | GET/POST | **cookie only** | Thread messages |
| `/api/settings/lan-info` | GET | **cookie only** | LAN setup info |
| `/api/settings/rotate-token` | POST | **cookie only** | Rotate `BRAIN_LAN_TOKEN` |
| `/api/errors/client` | POST | bearer OR cookie | Client error log |

**Critical for testing:** curl-based smokes can ONLY exercise bearer routes. Cookie-only routes require either a real browser session or session-cookie reverse-engineering. **(SoT: code:** `src/lib/auth/bearer.ts:67-74` — `BEARER_ROUTES` is the source of truth.**)**

# 3. Cron jobs (node-cron, in-process)

Both run inside `brain.service` via `src/instrumentation.ts → startEnrichmentBatchCron()`.

| Cron | Schedule | Purpose | File |
|---|---|---|---|
| `enrichment-batch-submit` | `'30 19 * * *'` UTC = **01:00 IST** | Submit daily Anthropic batch | `src/lib/queue/enrichment-batch-cron.ts` |
| `enrichment-batch-poll` | `'*/5 * * * *'` (every 5 min) | Poll in-flight batches | same file |
| `backup-snapshot` | every 6h (in-process) | Local backup snapshot to `data/backups/` | (logged at brain.service start) |

**Not yet wired (D-18 prerequisite):**
- System cron for `sqlite3 .backup → gzip → gpg → rclone to B2`. Plan §3.5 specifies it but no script exists.

# 4. Storage

| Storage | Location | Schema / format | State |
|---|---|---|---|
| Mac SQLite | `data/brain.sqlite` (+ `-wal`, `-shm`) | 8 migrations applied | 8 items, **stale nomic-embed vectors** |
| Hetzner SQLite | `/opt/brain/data/brain.sqlite` (+ `-wal`, `-shm`) | 8 migrations applied | 8 items via D-12 swap, **6 of 8 re-embedded** |
| Hetzner local backups | `/opt/brain/data/backups/` | timestamped `.sqlite` snapshots | running every 6h |
| B2 bucket | `ai-brain-backups-arunpr614` (us-east-005) | gpg-encrypted .sqlite.gz | **0 objects** (D-18 not wired) |

# 5. Key paths on Hetzner

| Path | Owner | Mode | Purpose |
|---|---|---|---|
| `/opt/brain/` | `brain:brain` | 755 | Next.js standalone bundle + node_modules |
| `/opt/brain/data/brain.sqlite` | `brain:brain` | 600 | Live DB |
| `/opt/brain/data/brain.sqlite.pre-cutover` | `brain:brain` | 644 | Pre-D-12 backup (~empty, just init schema) |
| `/etc/brain/.env` | `brain:brain` | 600 | 13 production env vars |
| `/etc/brain/` | `brain:brain` | 700 | Secrets dir |
| `/etc/cloudflared/config.yml` | `root:root` | 644 | Tunnel ingress config |
| `/etc/cloudflared/tunnel-creds.json` | `root:root` | 600 | Tunnel JWT |
| `/etc/systemd/system/brain.service` | `root:root` | 644 | brain.service unit |
| `/etc/systemd/system/cloudflared.service` | `root:root` | 644 | cloudflared.service unit |
| `~brain/.gnupg/pubring.kbx` | `brain:brain` | 600 | Imported gpg public key (fp `950DF65D...`) |

# 6. Cloudflare resources

| Resource | ID / Value |
|---|---|
| Account | `Arunever614@gmail.com's Account` (id `633bb20e4b00be9e2d12970feffa6136`) |
| Zone | `arunp.in` (id `af88f945669d3e95174e20386a9d2feb`) |
| `brain.arunp.in` CNAME record | id `ac9ca4ca42f6c03a3e9970d4a89988d6`, currently → `58339d22-d0be-4fab-94d6-32fd24b04a72.cfargotunnel.com` (Mac) |
| `brain-staging.arunp.in` CNAME | currently → `64fb278e-15eb-4fe2-a1e1-2ca48ee490e7.cfargotunnel.com` (Hetzner) |
| Mac tunnel UUID | `58339d22-d0be-4fab-94d6-32fd24b04a72` |
| Hetzner tunnel UUID | `64fb278e-15eb-4fe2-a1e1-2ca48ee490e7` |

**Verify CNAME content** (don't paste keys):
```bash
TOKEN=<from Bitwarden "AI Brain — Cloudflare API token (Phase D-10)">
curl -s "https://api.cloudflare.com/client/v4/zones/af88f945669d3e95174e20386a9d2feb/dns_records/ac9ca4ca42f6c03a3e9970d4a89988d6" \
  -H "Authorization: Bearer $TOKEN" | jq '.result.content'
```

# 7. Mac-side processes (the live serving stack)

| Process | PID at session start | Owner | Started | Path |
|---|---|---|---|---|
| `cloudflared` | 73069 | root | 11 May | `/opt/homebrew/bin/cloudflared --config /etc/cloudflared/config.yml --no-autoupdate tunnel run` |
| `next-server (v16.2.5)` | 32761 | arun.prakash | Fri 7PM | brain dev server |
| `cloudflared tpc-dashboard` | 27334 | arun.prakash | Sun 8PM | UNRELATED — work project; **do not touch** |
| `next-server (v14.2.35)` | 27326 | arun.prakash | Sun 8PM | UNRELATED — work project port 3001 |
| Ollama daemon | (background) | arun.prakash | persistent | `localhost:11434`, used by Mac brain for embed |

**Mac launchd plist:** `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist` (root-owned). Stop with `sudo launchctl bootout system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist`.

# 8. Vendor dashboards

| Vendor | URL | What to check |
|---|---|---|
| Anthropic | `console.anthropic.com` | Spend, $5 cap, key list |
| Google AI Studio | `aistudio.google.com` | Key list, quota usage (free tier) |
| OpenRouter | `openrouter.ai` | Key list, idle balance |
| Backblaze B2 | `secure.backblaze.com` | Bucket, lifecycle, App Keys |
| Cloudflare | `dash.cloudflare.com` | Tunnels, DNS, API tokens |
| Hetzner Cloud | `console.hetzner.cloud` | VM, snapshots, billing |
| GitHub | `github.com/arunpr614/ai-brain` | Repo, branches, tags |

# 9. Source-of-truth markers

| System | Doc location | Code authoritative location |
|---|---|---|
| Bearer route allow-list | This file §2 | `src/lib/auth/bearer.ts:67` **(SoT: code)** |
| Cron schedule strings | This file §3 | `src/lib/queue/enrichment-batch-cron.ts` **(SoT: code)** |
| Embed dim | This file §4 (768) | `src/lib/embed/types.ts:EMBED_OUTPUT_DIM` **(SoT: code)** |
| Tunnel UUIDs | This file §6 | Cloudflare API (live state is authoritative) |
