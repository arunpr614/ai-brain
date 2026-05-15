# M2 — Systems and Integrations

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/02_Systems_and_Integrations.md`
**Baseline:** full
**Scope:** external systems Brain depends on — current + incoming
**Applies to:** both lanes (Lane C owns changes; Lane L needs awareness)
**Status:** COMPLETE (documentation)

> **For the next agent:** external dependencies for AI Brain almost doubled in this session. Before v0.6.0 we had 1 active third-party (Cloudflare) + 1 dormant (GitHub, for the repo only). After v0.6.0 we add Anthropic, Google Gemini, Backblaze B2, and Hetzner. This file is the catalog. **Lane L:** do not add calls to any of these external providers — that's Lane C's surface. **Lane C:** every provider here needs an account, keys, and rotation procedure; see M3 for env-var names.

---

## 1. Integration matrix

| System | Status | What it provides | Who uses it | Lane |
|---|---|---|---|---|
| **Cloudflare Named Tunnel** | **ACTIVE** (since v0.5.0) | HTTPS entry point `brain.arunp.in` | All clients | shared (Lane C migrates; Lane L doesn't touch) |
| **GitHub** | **ACTIVE** (repo only) | Source hosting | Both agents | shared |
| **Anthropic (Messages + Batch API)** | **INCOMING** (v0.6.0) | LLM for Ask + enrichment | Lane C | Lane C owns integration |
| **Google Gemini API** | **INCOMING** (v0.6.0) | Text embeddings | Lane C | Lane C owns integration |
| **Backblaze B2** | **INCOMING** (v0.6.0) | Encrypted backup storage | Lane C | Lane C owns integration |
| **Hetzner Cloud** | **INCOMING** (v0.6.0, provisioned today) | VM hosting | Lane C | Lane C owns |
| **Ollama (local)** | **ACTIVE → DEPRECATED post-v0.6.0** | LLM + embeddings on Mac | Both | retained as fallback via `BRAIN_ENRICH_BATCH_MODE=false` |

## 2. Cloudflare (active, unchanged)

**Purpose:** public HTTPS entry point with outbound-only tunnel from the app host. No inbound ports open on Mac or (post-v0.6.0) Hetzner.

**Components:**
- Named Tunnel: `brain-tunnel` (UUID stored in `/etc/cloudflared/config.yml` on Mac; will move to Hetzner)
- DNS: `brain.arunp.in` → CNAME → `<tunnel-uuid>.cfargotunnel.com`
- Zone: `arunp.in` (user-owned, ~$10/yr)

**Migration at v0.6.0 cutover:**
1. `scp /etc/cloudflared/config.yml + credentials JSON` from Mac to Hetzner
2. `sudo cloudflared service install` on Hetzner
3. Start cloudflared on Hetzner FIRST (overlapping with Mac briefly)
4. Stop cloudflared on Mac (Cloudflare load-balances between active ingress points; when only Hetzner is active, all traffic flows there)
5. DNS does NOT change — same `brain.arunp.in`, same tunnel UUID

**Auth:** bearer token (not Cloudflare Access). Cloudflare is purely transport.

**Rotation:** Cloudflare tunnel credentials rotate via `cloudflared tunnel token <UUID>` if compromised. Tunnel UUID stable.

**Docs:**
- Config: `/etc/cloudflared/config.yml` on Mac (600 perms, root-owned)
- Launchd: `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`
- Research: [`docs/research/lan-auth.md`](../../../docs/research/lan-auth.md) — original rationale
- Pivot history: `project_ai_brain_cloudflare_pivot.md` in auto-memory

## 3. Anthropic (incoming, v0.6.0)

**Purpose:** all LLM calls. Two distinct usage patterns with different models + endpoints.

### 3.1 Claude Haiku 4.5 via Batch API (enrichment)

**Why:** 50% cheaper than realtime; 24h SLA; enrichment is async by design.

**Endpoint:** `POST https://api.anthropic.com/v1/messages/batches`

**Job shape:** JSONL, one line per item to enrich. Request format = standard Messages API (model + messages + max_tokens + system). No streaming.

**Submission pattern:**
1. Every night at 3 AM UTC, node-cron picks `SELECT id FROM items WHERE enrichment_state = 'pending'`
2. Bundle all pending items into one `requests[]` array
3. POST to `/v1/messages/batches` → returns `batch_id`
4. Store `batch_id` on each row
5. Poll `GET /v1/messages/batches/{batch_id}` every 15 min for up to 26h
6. On completion, fetch JSONL results, apply to `items.enriched_*` columns in a single transaction

**Rate limits:** per-account. Brain's volume is 30 items/month in batches → trivially under limit.

**Failure modes:**
- Batch partially fails: completed items get applied, failed items reset to `pending` for next night's batch
- Anthropic API outage: entire batch stays pending; retry next night
- Duplicate submission (cron fires twice): batch_id idempotency key — same items get the same batch

### 3.2 Claude Sonnet 4.6 via realtime streaming (Ask + manual Enrich-now)

**Endpoint:** `POST https://api.anthropic.com/v1/messages` with `stream: true`

**Why Sonnet not Haiku:** Ask produces long reasoned answers; quality matters. Haiku for batch is fine because enrichment is short structured output.

**Usage:** existing `/api/ask/stream` SSE endpoint swaps Ollama client for Anthropic client. Server-sent events unchanged from client perspective.

**Manual Enrich-now:** new `POST /api/items/[id]/enrich?mode=immediate` route. Hits Sonnet? No — also Haiku. Difference is realtime vs batch; same model family.

**Privacy:** Anthropic paid tier = **no training on inputs** per their ToS. 30-day retention for abuse monitoring. Free tier has softer terms; we use paid. Source: `docs/research/ai-provider-matrix.md` + `docs/research/privacy-threat-delta.md`.

**SDK:** `@anthropic-ai/sdk` (npm) — **not yet installed**. Lane C adds as dep in v0.6.0 plan.

**Env vars:** `ANTHROPIC_API_KEY` (secret). See M3.

**Cost (moderate usage, 30 items/mo):** ~$0.26/month combined.

## 4. Google Gemini (incoming, v0.6.0)

**Purpose:** text embeddings only. Replaces Ollama `nomic-embed-text`.

**Endpoint:** Google GenAI SDK `embedContent()` with model `text-embedding-004`.

**Dim:** 768 (matches existing `chunks_vec float[768]` schema exactly → no re-embedding of existing chunks needed beyond migration cutover).

**Why Gemini not OpenAI/Voyage:** free tier (1M tokens/day) covers Brain's lifetime volume. OpenAI `text-embedding-3-small` is cheap ($0.02/1M tokens) but not free. Voyage quality similar but not free. Source: `docs/research/embedding-strategy.md`.

**Privacy:** Gemini paid tier terms = no training. Free tier has softer terms but Brain's volume never exits free, and the content is personal notes (not highly sensitive).

**SDK:** `@google/generative-ai` (npm) — not yet installed.

**Env vars:** `GOOGLE_API_KEY` or `GEMINI_API_KEY` (secret). See M3.

**Cost:** $0.00/month at Brain's volume (free tier).

**Feature flag:** `EMBED_PROVIDER=ollama|gemini`. Default = `ollama` during pre-cutover period. Swap to `gemini` at v0.6.0 cutover. Lane L keeps using Ollama locally via the flag — they never touch embedding code.

## 5. Backblaze B2 (incoming, v0.6.0)

**Purpose:** off-host encrypted backup storage.

**Access:** S3-compatible API. Tool: `rclone` (not custom SDK).

**Bucket:** `brain-backups-<random-suffix>` (private, versioning ON).

**Backup flow (from S-7 runbook):**
1. Daily cron on Hetzner: `sqlite3 data/brain.sqlite ".backup /tmp/snap.sqlite"`
2. `gpg --encrypt --recipient <user-gpg-key>` on the snapshot (client-side encryption)
3. `rclone copy` the ciphertext to B2 bucket
4. Retention: 30 daily + 12 monthly versions; B2 lifecycle rules handle pruning

**Encryption:** **client-side gpg** (not server-side B2 encryption alone). B2 sees only ciphertext. This is the load-bearing privacy mitigation per S-8.

**SDK:** none — `rclone` is a CLI tool configured via `~/.config/rclone/rclone.conf`.

**Env vars (in rclone config, not app env):** `B2_ACCOUNT_ID`, `B2_APPLICATION_KEY`. Plus `BRAIN_BACKUP_GPG_RECIPIENT` on the app side for which key to encrypt to.

**Cost:** ~$0.005/GB/month. At Brain's size (<1 GB for years), total ~$0.01/month.

**Restore:** `scripts/restore-from-backup.sh` (F-034 in existing codebase, dating from v0.3.1) handles the decrypt + WAL-aware restore.

## 6. Hetzner Cloud (incoming, v0.6.0, server provisioned today)

**Purpose:** VM hosting post-migration.

**Current state:**
- Server: `ubuntu-4gb-hel1-2` in Helsinki
- IP: `204.168.155.44` (IPv4) + `2a01:4f9:c015:250b::/64` (IPv6)
- Spec: CX23, 2 vCPU, 4 GB RAM, 40 GB SSD, Ubuntu 24.04
- Cost: ~$5.59/mo (€4.99 server + $0.60 IPv4)
- SSH key attached: NO (yellow-warning was skipped at create time) — currently unreachable
- Firewall: not configured yet

**Authentication to Hetzner Console:** user-email + password. No API programmatic access yet.

**Billing:** credit card on file; hourly-prorated — deletable at any time with no commitment.

**What Lane C does with it (high-level):** resolve SSH issue → harden → install Node/sqlite3/cloudflared → clone repo → wait for cutover window → DB migrate.

## 7. Ollama (active, local, deprecated path post-v0.6.0)

**Purpose (pre-v0.6.0):** all LLM + embedding work, runs on Mac.

**Status (post-v0.6.0):** kept on Mac as **offline-fallback** when `BRAIN_ENRICH_BATCH_MODE=false`. Not installed on Hetzner (2GB RAM too tight per S-5).

**Models used:**
- `qwen3:8b` (quantized Q4_K_M) for chat + enrichment
- `nomic-embed-text` for 768-dim embeddings

**Endpoint:** `http://127.0.0.1:11434` on Mac.

**Why kept:** kill-switch for v0.6.0. If Anthropic has an outage, user can flip the flag and Brain runs entirely local from the Mac (assuming the Mac is on and the tunnel points there). Not elegant but a real fallback.

## 8. Dependency graph (post-v0.6.0)

```
Client request
    ↓
Cloudflare Tunnel
    ↓
Hetzner VM (Next.js + Node)
    ├── Anthropic API (Ask + manual enrich)
    ├── Anthropic Batch API (nightly enrichment)
    ├── Gemini API (embeddings at capture time)
    ├── Source website (Readability fetch) or youtube.com (InnerTube)
    └── SQLite on local SSD
           └── rclone + gpg → Backblaze B2 (nightly)
```

Loss of Cloudflare = clients can't reach the app. Loss of Anthropic = enrichment + Ask degrade (Ollama fallback works if `BRAIN_ENRICH_BATCH_MODE=false` AND Mac is reachable). Loss of Gemini = new captures skip embedding (row still saves; retrieval degrades until next embedding backfill run). Loss of B2 = backups fail silently; ops alert recommended but not life-threatening for this tool.

## 9. SoT table — where each integration is implemented

| Integration | Current SoT | Post-v0.6.0 SoT |
|---|---|---|
| Cloudflare tunnel | `/etc/cloudflared/config.yml` on Mac **(SoT: ops)** | same on Hetzner |
| Anthropic (ask) | not yet — **(SoT: planned in S-4)** | `src/lib/ask/anthropic.ts` (new, Lane C) |
| Anthropic (batch enrich) | not yet — **(SoT: planned in S-3)** | `src/lib/enrich/batch.ts` (new, Lane C) |
| Gemini embeddings | not yet — **(SoT: planned in S-5)** | `src/lib/embed/gemini.ts` (new, Lane C) |
| B2 backup | not yet | `scripts/backup-to-b2.sh` (new, Lane C) |
| Ollama | `src/lib/embed/ollama.ts` + `src/lib/enrich/pipeline.ts` **(SoT: code)** | unchanged (fallback) |
| Bearer auth | `src/lib/auth/bearer.ts` **(SoT: code)** | unchanged |
