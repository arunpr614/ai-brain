# AI Brain: Secrets and configuration (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/03_Secrets_and_Configuration.md](../Handover_docs_19_05_2026_13:47/03_Secrets_and_Configuration.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** Baseline v1 has the full secret inventory. This file lists deltas only: what's new, what changed status, what's queued for Phase E rotation.

> **Guardrail:** Never log, commit, or paste API keys, tokens, webhook secrets, or full system prompts from production. Names and `<placeholder>` patterns only.

## 1. Secret inventory deltas

### 1.1 Newly billed (no key change)

| Secret | Consumers | Delta |
|--------|-----------|-------|
| `GEMINI_API_KEY` | Embedding worker, backfill script | **Project moved to paid tier** today via console.cloud.google.com billing link. Same key value; rate limits lifted from 100 RPM free → 3,000 RPM paid. |

### 1.2 Used in this session, queued for Phase E rotation

| Secret | Consumers | Why queued |
|--------|-----------|------------|
| `CF_API_TOKEN` | `cutover.sh` (D-13) | Pasted in chat for the CNAME flip per user authorization. Rotate during Phase E. Token name was `cfut_0...` — assume entire token is compromised by chat-paste norm. |

> The full Phase E rotation list is in baseline §6. This delta adds CF_API_TOKEN to that queue.

### 1.3 Unchanged — still required

| Secret | Consumers | Notes |
|--------|-----------|-------|
| `BRAIN_LAN_TOKEN` | All API auth | Bearer; auto-generated in `instrumentation.ts` if absent; written to `.env` |
| `ANTHROPIC_API_KEY` | Realtime + batch enrichment | $5/mo hard cap, $3/mo soft alert per memory |
| `B2_*` | Backup script (not yet wired) | See baseline §1.5 |

## 2. Critical operational rules (delta)

| Severity | Rule | Recovery if violated |
|----------|------|---------------------|
| **P0** | Gemini API project must remain billing-linked. If billing is unlinked, Gemini falls back to free-tier 100 RPM and large-transcript backfill 429s mid-item. | Re-link billing; re-run `node --import tsx scripts/backfill-embeddings.mjs` for any items with 0 chunks |
| **P1** | When adding a new hostname to a Cloudflare named tunnel, update both the CNAME (Cloudflare DNS) AND the tunnel's `/etc/cloudflared/config.yml` ingress block, then `systemctl restart cloudflared`. Missing the second step → silent 404. | See [09 Debugging](./08_Debugging_and_Incident_Response.md) §3 |
| **P1** | `chunks` and `chunks_vec` are written in a single transaction in `pipeline.ts` (lines 113–128). If embed fails mid-item, BOTH roll back. Re-running backfill in default mode (no `--reset`) self-heals. | `node --import tsx scripts/backfill-embeddings.mjs` (default mode) |

### 2.1 CF_API_TOKEN rotation recipe (Phase E)

1. Cloudflare dashboard → My Profile → API Tokens → revoke `cfut_0P7b263y...` (D-10 token)
2. Create new token with same scope (Zone DNS edit on `arunp.in`)
3. Save new token in Bitwarden as `AI Brain — CF_API_TOKEN — v2`
4. No code change needed — `cutover.sh` reads `CF_API_TOKEN` from env at invocation time
5. Verify by running `CF_API_TOKEN=<new> ./scripts/deploy/cutover.sh verify`

### 2.2 Gemini billing alert

Per the cutover memory and user agreement on paid tier:
1. https://console.cloud.google.com/billing → billing account → Budgets & alerts
2. Create budget scoped to the Gemini API project
3. Amount: **$5/month**; thresholds 50% / 90% / 100%
4. (Step recommended in chat but not yet confirmed completed by user — flag in M7 next-actions)

## 3. Local development

Unchanged from baseline.

## 4. Logging prefixes (current state)

| Prefix | Component | Active on Hetzner? |
|--------|-----------|---------------------|
| `[boot]` | Next.js instrumentation | Yes |
| `[backup]` | Backup scheduler | Yes — every 6h, keeps 28 snapshots |
| `[enrich]` | Realtime enrichment worker | Yes (with the unreachable-loop bug) |
| `[batch-cron]` | Daily batch + 5-min poll | Yes (`30 19 * * *` UTC = 01:00 IST) |

## 5. Related docs

- [Handover_docs_19_05_2026_13:47/03_Secrets_and_Configuration.md](../Handover_docs_19_05_2026_13:47/03_Secrets_and_Configuration.md) — baseline inventory
- [02_Systems_and_Integrations.md](./02_Systems_and_Integrations.md) — services that consume these secrets
- [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — ingress edit + restart procedure
