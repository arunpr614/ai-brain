# AI Brain: Systems and integrations (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/02_Systems_and_Integrations.md](../Handover_docs_19_05_2026_13:47/02_Systems_and_Integrations.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** This file documents what changed in the systems map post-cutover. Baseline v1 has the full inventory; this file lists only deltas.

> **Delta scope:** Hetzner cloudflared now serves both `brain.arunp.in` and `brain-staging.arunp.in`; Mac next-server stopped; Mac cloudflared idle. Gemini API moved to paid tier.

## 1. Runtime stack

Unchanged from baseline. Hetzner Ubuntu 24.04 / Node 20.20.2 / better-sqlite3 + sqlite-vec / Next.js 16.2.5 standalone. Mac dev box was the previous primary; now retired from serving.

## 2. Components / services (delta)

| Component | Role | Status delta | Notes |
|-----------|------|--------------|-------|
| Hetzner `brain.service` (systemd) | Sole serving instance for `brain.arunp.in` | **Promoted** from staging-only to primary | port 3000; restarted twice today (gemini.ts push, ingress edit) |
| Hetzner `cloudflared.service` | Routes both `brain.arunp.in` + `brain-staging.arunp.in` | **Updated** — ingress map extended | Restarted after config edit; validated via `cloudflared tunnel ingress validate` |
| Mac next-server (pid 32761) | Was serving Mac dev | **STOPPED** | Was on :3099 not :3000 (port mismatch was the 502 root cause); killed in D-14 |
| Mac cloudflared launchdaemon | Was tunneling `brain.arunp.in` | **IDLE** (still loaded, no traffic) | Mac tunnel UUID `58339d22-...`; CNAME no longer routes here |
| Embedding pipeline (`pipeline.ts`) | embed-on-capture + backfill | **Re-discovered** transaction-rollback semantics | chunks + chunks_vec written in single tx; failure rolls both back |

## 3. External services matrix (delta)

| Service | Purpose | Status delta | Config / secret names |
|---------|---------|--------------|----------------------|
| Cloudflare DNS | CNAME for `brain.arunp.in` | **Flipped** — now points at Hetzner tunnel | `CF_API_TOKEN` (from D-10, expires 2026-06-17) |
| Cloudflare named tunnel (Hetzner UUID `64fb278e-...`) | Inbound HTTPS routing | **Now primary** for `brain.arunp.in` | `/etc/cloudflared/tunnel-creds.json` on Hetzner |
| Cloudflare named tunnel (Mac UUID `58339d22-...`) | Was inbound for Mac | **Idle** (launchdaemon up, no DNS pointing) | Can be left alone; Phase E candidate to bootout |
| Google Generative Language API | Embeddings (`gemini-embedding-001@768`) | **Paid tier active** as of today | `GEMINI_API_KEY`; billing linked via aistudio.google.com → console.cloud.google.com |
| Anthropic API | Realtime + batch enrichment | Unchanged | `ANTHROPIC_API_KEY`; $5/mo cap, $3/mo soft alert |
| Backblaze B2 | Encrypted nightly backup | **Still not wired** | `B2_*` env vars; script TBD |

> Secret names only — never paste values. See [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md).

## 4. Hetzner cloudflared config (current)

`/etc/cloudflared/config.yml` (live):

```yaml
tunnel: 64fb278e-15eb-4fe2-a1e1-2ca48ee490e7
credentials-file: /etc/cloudflared/tunnel-creds.json

ingress:
  - hostname: brain.arunp.in
    service: http://127.0.0.1:3000
  - hostname: brain-staging.arunp.in
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Pre-D-13 config preserved at `/etc/cloudflared/config.yml.pre-d13` (only `brain-staging.arunp.in` was listed).

**Operational rule:** any new hostname pointed at this tunnel via CNAME MUST also be added to the `ingress` block. Otherwise CF returns silent 404 (not 502/503) and the symptom looks like the CNAME flip didn't take.

## 5. Internal API surfaces (post-cutover)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/health` | None (or bearer) | Returns `{ok:true, ts}` — the cutover smoke endpoint |
| `POST` | `/api/items` | Bearer (`BRAIN_LAN_TOKEN`) | Capture from APK / extension |
| `POST` | `/api/ask` | Bearer | SSE-streaming Ask endpoint |
| `POST` | `/api/items/[id]/enrich` | Bearer | C-5 — enqueue or force-realtime |

## 6. Cross-links

- [Handover_docs_19_05_2026_13:47/02_Systems_and_Integrations.md](../Handover_docs_19_05_2026_13:47/02_Systems_and_Integrations.md) — baseline inventory
- [01_Architecture.md](./01_Architecture.md) — topology delta
- [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — secret names referenced above
