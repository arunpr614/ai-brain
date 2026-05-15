# AI Brain: Secrets and configuration (handover — 2026-05-14)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/03_Secrets_and_Configuration.md](../Handover_docs_12_05_2026/03_Secrets_and_Configuration.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** This file lists every secret and config knob by **name only**. The dual-lane phase did NOT introduce any new active secrets — the v0.6.0 plan introduces several, but they are documented as future state, not values that must be installed before the merge.

> **Guardrail:** Never log, commit, or paste API keys, SSH keys, gpg passphrases, bearer tokens, or webhook secrets into any handover file. The user's 1Password vault holds the real values. Names and `<placeholder>` patterns only.

## 1. Secret inventory (names only)

### 1.1 Core infrastructure (active today)

| Secret | Consumers | Purpose |
|--------|-----------|---------|
| `BRAIN_BEARER_TOKEN` | Next.js server, APK, Chrome extension | 32-byte hex; rotatable via `/settings/lan-info` UI |
| `OLLAMA_HOST` | `src/lib/llm/ollama.ts` | URL of local Ollama daemon; default `http://localhost:11434` |
| `OLLAMA_DEFAULT_MODEL` | `src/lib/llm/ollama.ts` | Model id string; default `qwen2.5:7b-instruct-q4_K_M` |
| `~/.ssh/ai_brain_hetzner` | User's Mac (SSH client) | Private key for Hetzner box; **passphrase stripped** during Phase A |
| `~/.ssh/ai_brain_hetzner.pub` | Hetzner `/root/.ssh/authorized_keys` and `/home/brain/.ssh/authorized_keys` | Public key counterpart |

### 1.2 Auth and webhooks

No webhooks active today. Bearer-only auth, single-user, no OAuth flows.

### 1.3 Providers / external APIs (introduced by v0.6.0 plan, NOT yet active)

These are documented in [`docs/plans/v0.6.0-cloud-migration.md §3.1`](../../docs/plans/v0.6.0-cloud-migration.md). They MUST NOT be installed until Phase D-1..D-5 of the plan executes.

| Secret | Consumers | Purpose | When set |
|--------|-----------|---------|----------|
| `ANTHROPIC_API_KEY` | `src/lib/llm/anthropic.ts` (planned) | Claude Haiku 4.5 batch enrichment + Sonnet 4.6 Ask | Phase D-1 |
| `OPENROUTER_API_KEY` | `src/lib/llm/openrouter.ts` (planned) | Standby for model swap; one-key access to GPT-4.1, Gemini, etc. | Phase D-3 (user already has key) |
| `GEMINI_API_KEY` | `src/lib/embed/gemini.ts` (planned) | text-embedding-004 (free tier) | Phase D-2 |
| `B2_APPLICATION_KEY_ID` | rclone on Hetzner | Backblaze B2 access | Phase D-4 |
| `B2_APPLICATION_KEY` | rclone on Hetzner | Backblaze B2 secret | Phase D-4 |
| `B2_BUCKET_NAME` | rclone on Hetzner | `brain-backups` bucket | Phase D-4 |
| gpg passphrase | rclone backup script on Hetzner; `gpg --decrypt` on Mac | Encrypts SQLite backups before B2 upload | Phase D-5 |

### 1.4 Provider-routing config (introduced by v0.6.0 plan)

These are NOT secrets but they belong in `.env` and govern provider selection. Both `anthropic` and `openrouter` providers will exist post-Phase B; routing is env-driven.

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_ENRICH_PROVIDER` | `anthropic` | One of `anthropic`, `openrouter`, `ollama` |
| `LLM_ENRICH_MODEL` | `claude-haiku-4-5-20251001` | Provider-specific model id |
| `LLM_ASK_PROVIDER` | `anthropic` | One of `anthropic`, `openrouter`, `ollama` |
| `LLM_ASK_MODEL` | `claude-sonnet-4-6` | Provider-specific model id |
| `LLM_ENRICH_BATCH` | `true` | Use Batch API when provider supports it |
| `EMBED_PROVIDER` | `gemini` | One of `gemini`, `ollama` |
| `EMBED_MODEL` | `text-embedding-004` | Provider-specific embedding model |

### 1.5 Per-service config (Hetzner box)

Already installed during Phase A:

| File on Hetzner | Role |
|-----------------|------|
| `/etc/ssh/sshd_config.d/99-brain-hardening.conf` | sshd hardening: `PermitRootLogin prohibit-password`, `PasswordAuthentication no`, etc. |
| `/etc/sudoers.d/90-brain` | `brain ALL=(ALL) NOPASSWD:ALL` |
| `/root/.ssh/authorized_keys` | Same key as `/home/brain/.ssh/authorized_keys` |
| `/home/brain/.ssh/authorized_keys` | Brain user SSH key |
| `/etc/cloudflared/` | Empty; will hold tunnel cred file in Phase D-10 |
| UFW rules | `allow 22/tcp`, `default deny incoming`, `allow outgoing` |

To-be-installed in Phase D:

| File on Hetzner | Role |
|-----------------|------|
| `/etc/brain/.env` | All `LLM_*`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `B2_*` (mode `0600`, owner `brain`) |
| `/etc/systemd/system/brain.service` | Next.js standalone service unit |
| `/etc/systemd/system/cloudflared.service` | Tunnel daemon unit |
| `/var/lib/brain/data/` | SQLite + chunks_vec |
| `/etc/cron.d/brain-backup` | 6-hour B2 backup cron |

## 2. Critical operational rules

| Severity | Rule | Recovery if violated |
|----------|------|---------------------|
| **P0** | Never commit `.env`, `.env.local`, `~/.cloudflared/*.json`, or any file containing real keys. `.gitignore` covers these but always sanity-check `git diff --cached` | Rotate all exposed keys immediately; revoke at provider; force-push history rewrite is NOT acceptable for personal repo with mirrors — issue new keys instead |
| **P0** | Never paste secret VALUES into any handover doc, RUNNING_LOG entry, or commit message | Same as above |
| **P0** | gpg backup passphrase MUST live only on user's Mac. The Hetzner box can write encrypted backups but cannot read them | If passphrase leaks, regenerate gpg key pair, re-encrypt all existing backups, revoke old key |
| **P1** | `BRAIN_BEARER_TOKEN` rotation: must be done via `/settings/lan-info` UI which updates BOTH server and the QR-pairing UI atomically. Don't edit `.env` by hand | If rotated incorrectly, all clients lose auth simultaneously; rebuild APK + re-pair Chrome extension |
| **P1** | Anthropic monthly hard cap MUST be set in console.anthropic.com → Usage → Spending Limits **before** the first prod call | If runaway usage hits, Anthropic returns 429; manually cancel + investigate |
| **P2** | Don't commit `node_modules/` or `data/*.sqlite*`; both are gitignored | `git rm --cached` to remove tracked copies |

### 2.1 Bearer token rotation recipe

1. Open `/settings/lan-info` page in browser (must be authenticated with current bearer)
2. Click "Rotate token" button
3. Server generates new token, updates server-side `.env.local`, returns new token in response
4. UI displays new QR code
5. Re-scan QR on APK and re-pair Chrome extension
6. Old token is invalidated server-side immediately

### 2.2 SSH key rotation (Hetzner box)

1. Generate new key pair on Mac: `ssh-keygen -t ed25519 -f ~/.ssh/ai_brain_hetzner_v2 -N ''`
2. Append public key: `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'cat >> ~/.ssh/authorized_keys' < ~/.ssh/ai_brain_hetzner_v2.pub`
3. Append to root: `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo tee -a /root/.ssh/authorized_keys' < ~/.ssh/ai_brain_hetzner_v2.pub`
4. Verify new key works: `ssh -i ~/.ssh/ai_brain_hetzner_v2 brain@204.168.155.44 whoami` → `brain`
5. Remove old key from `authorized_keys` files (manual edit via SSH)
6. Move old key to `~/.ssh/old/` (don't delete; archive)

## 3. Local development

| File | Role |
|------|------|
| `.env.local` | Local overrides; gitignored. Contains `BRAIN_BEARER_TOKEN`, `OLLAMA_HOST`, `OLLAMA_DEFAULT_MODEL` today |
| `.env.example` | Template; committed. Should be updated as part of v0.6.0 Phase B-13 to add `LLM_*` and `EMBED_*` vars |
| `~/.cloudflared/config.yml` | Mac-side tunnel config; gitignored by `.cloudflared/` not being in repo |
| `package.json` | NPM scripts. After collapse: `dev`, `build`, `build:apk`, `test`, `typecheck`, `lint` all valid |

## 4. Logging prefixes

Active prefixes from Lane L's recent work (search logs for these):

| Prefix | Component |
|--------|-----------|
| `[sw]` | Service worker (`public/sw.js`) |
| `[outbox]` | IndexedDB outbox (`src/lib/outbox/*`) |
| `[sync-worker]` | Outbox orchestrator (`src/lib/queue/sync-worker.ts`) |
| `[enrichment]` | Existing enrichment pipeline |
| `[ask]` | SSE streaming Ask path |
| `[capture]` | Article + YouTube capture |

After Phase B of v0.6.0, expect new prefixes:

| Prefix | Component |
|--------|-----------|
| `[llm:anthropic]` | Anthropic provider |
| `[llm:openrouter]` | OpenRouter provider |
| `[llm:ollama]` | Ollama provider (kept as fallback) |
| `[batch]` | Anthropic Batch API submitter + poller |
| `[cron]` | node-cron sweep at 03:00 UTC |
| `[embed:gemini]` | Gemini embedding wrapper |

## 5. Related docs

- [`02_Systems_and_Integrations.md`](./02_Systems_and_Integrations.md) — services that consume these secrets
- [`07_Deployment_and_Operations.md`](./07_Deployment_and_Operations.md) — merge procedure (no secrets touched)
- [`docs/plans/v0.6.0-cloud-migration.md`](../../docs/plans/v0.6.0-cloud-migration.md) — Phase D-1..D-6 (account creation + secret install)
- [`Handover_docs_12_05_2026/03_Secrets_and_Configuration.md`](../Handover_docs_12_05_2026/03_Secrets_and_Configuration.md) — pre-Lane L baseline secrets
