# AI Brain: Secrets and configuration (handover — 2026-05-07)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** This file lists every secret and config knob by **name only**. Use it to verify your environment is complete. The repo is **public** at `github.com/arunpr614/ai-brain` — never commit values.

> **Guardrail:** Never log, commit, or paste the user's PIN, session signing key, or the raw session cookie into any handover file, commit, or chat log. Names and `<placeholder>` patterns only.

## 1. Secret inventory (names only)

Pre-v1.0.0 AI Brain is a local-only app with a **very short** secret list. The only real secret is the user's PIN (hashed) and the derived session signing key.

### 1.1 Core auth (stored in SQLite `settings` table — see `src/lib/auth.ts`)

| Secret | Consumers | Purpose |
|--------|-----------|---------|
| `auth.pin_hash` | `src/lib/auth.ts` (`verifyPin`) | PBKDF2-HMAC-SHA256 of user PIN with per-install salt. Never store the raw PIN. |
| `auth.pin_salt` | `src/lib/auth.ts` | Per-install random salt for PIN hashing. |
| `auth.session_secret` | `src/lib/auth.ts` (`signSession` / `verifySession`) | HMAC-SHA256 signing key for session cookies. Generated once at first setup. |

### 1.2 Session cookie

| Cookie | Consumers | Purpose |
|--------|-----------|---------|
| `brain_session` | `src/proxy.ts` (Edge — presence check), `src/lib/auth.ts` (Node — HMAC verify) | Signed session token. `HttpOnly; SameSite=Lax; Secure` when served over HTTPS. Rotation on PIN change. |

### 1.3 Environment variables (optional)

| Env var | Consumers | Purpose | Default |
|---------|-----------|---------|---------|
| `OLLAMA_HOST` | `src/lib/llm/ollama.ts` | Ollama endpoint URL | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | `src/lib/llm/ollama.ts` | Default model name | `qwen2.5:7b-instruct` |
| `NODE_OPTIONS` | `package.json` scripts | V8 heap budget | `--max-old-space-size=8192` (mandatory — V8 OOMs without this on long dev sessions) |

### 1.4 Tuning knobs (hardcoded constants — adjust in code)

| Constant | Location | Purpose | Value at v0.3.0 |
|----------|----------|---------|-----------------|
| `BACKUP_INTERVAL_HOURS` | `src/lib/backup.ts` (or `settings.backup.interval_hours`) | Backup cadence | 6 |
| `BACKUP_RETENTION_COUNT` | `src/lib/backup.ts` (or `settings.backup.retention_count`) | Number of snapshots to keep | 28 |
| `MAX_ATTEMPTS` | `src/lib/queue/enrichment-worker.ts` | Job retry cap | 3 |
| `OLLAMA_DOWN_BACKOFF_MS` | `src/lib/queue/enrichment-worker.ts` | Back-off when Ollama unreachable | 30000 |
| `STALE_CLAIM_MS` | `src/lib/queue/enrichment-worker.ts` | Reclaim jobs stuck "running" past this age | 90000 |
| `POLL_INTERVAL_MS` | `src/lib/queue/enrichment-worker.ts` | Worker poll cadence | 1000 |
| `PAYWALL_CPP_THRESHOLD` | `src/lib/capture/pdf.ts` | Chars-per-page below which a PDF is flagged as paywalled | 301 |

### 1.5 No secrets that exist

Explicitly **not** present, by design (pre-v1.0.0):

- No API keys (Anthropic, OpenAI, etc.) — all LLM calls are to local Ollama.
- No cloud provider credentials (AWS, Vercel, Supabase, etc.) — app is local-only.
- No webhooks, OAuth client secrets, or third-party tokens.
- No Tailscale / VPN tokens — LAN auth strategy documented in [`docs/research/lan-auth.md`](../../docs/research/lan-auth.md) but not yet implemented (lands in v0.5.0).

## 2. Critical operational rules

| Severity | Rule | Recovery if violated |
|----------|------|---------------------|
| **P0** | The user PIN is stored **hashed only**. Never log the raw PIN, the decoded session, or reconstruct the PIN from the hash. | If a plaintext PIN leaks in logs, rotate immediately via the setup flow (which regenerates `pin_hash`, `pin_salt`, and `session_secret` — invalidates existing sessions). |
| **P0** | `data/brain.sqlite` contains all user content. **Never check the data directory into git.** It is in `.gitignore`. | If committed accidentally: `git rm --cached data/brain.sqlite`, force-overwrite commit, and rotate the session secret (since DB contents leaked). |
| **P1** | The backup directory `data/backups/` can grow unbounded without the retention sweep. Retention is 28 snapshots × ~MB per snapshot. | Delete old snapshots manually; verify `src/lib/backup.ts` retention is running via server logs on boot. |
| **P1** | `session_secret` rotation invalidates all existing sessions. **Expected and safe**, but the user will be logged out and must re-enter PIN. | Document this behavior when prompting for a PIN reset. |
| **P2** | `OLLAMA_HOST` pointing to a non-local host could leak content to a remote machine. | Keep default (`127.0.0.1`). If remote inference becomes needed, document and gate behind an explicit setting. |

### 2.1 Rotation recipe — session signing key

1. Go to `/setup` (or wire a "reset PIN" flow).
2. User re-enters a PIN. `src/lib/auth.ts` regenerates `auth.pin_salt` and `auth.session_secret` and writes a fresh `auth.pin_hash`.
3. All existing `brain_session` cookies now fail HMAC verification and get redirected to `/unlock`.
4. No server restart required.

### 2.2 Rotation recipe — none needed for Ollama

Ollama is a local process with no credentials. If the model changes, just edit `OLLAMA_MODEL` env var (or the constant in `src/lib/llm/ollama.ts`) and restart the dev server.

## 3. Local development

| File | Role |
|------|------|
| `.env.local` | Optional overrides for `OLLAMA_HOST` / `OLLAMA_MODEL`. **Not committed** (in `.gitignore`). |
| `data/brain.sqlite` | Live DB. Never committed. |
| `data/backups/` | Backup snapshots. Never committed. |
| `data/pdfs/` | Uploaded PDF blobs (if any are persisted beyond text extraction). Never committed. |
| `next.config.ts` | `turbopack.root` pin + `serverExternalPackages: ["better-sqlite3", "sqlite-vec"]` (required — Turbopack cannot bundle native modules). |
| `package.json` scripts | `dev`, `build`, `start` all set `NODE_OPTIONS='--max-old-space-size=8192'`. |

## 4. Logging prefixes

| Prefix | Component |
|--------|-----------|
| `[enrich]` | `src/lib/queue/enrichment-worker.ts` — job claim/run/complete/fail lines |
| `[backup]` | `src/lib/backup.ts` — snapshot start/end + retention sweep |
| `[ollama]` | `src/lib/llm/ollama.ts` — request/response errors, retries |
| `[auth]` | `src/lib/auth.ts` — setup, verify, and session-rotation events |
| `[db]` | `src/db/client.ts` — migration application |

Search dev logs with e.g. `npm run dev 2>&1 | grep '\[enrich\]'`.

## 5. Related docs

- [02_Systems_and_Integrations.md](./02_Systems_and_Integrations.md) — components that consume these secrets
- [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — local dev procedures referencing the config knobs above
- [`docs/research/lan-auth.md`](../../docs/research/lan-auth.md) — LAN auth strategy for v0.5.0 (Tailscale / SSH tunnel / token)
