# M3 — Secrets and Configuration

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/03_Secrets_and_Configuration.md`
**Baseline:** full
**Scope:** env vars, secret locations, rotation, safety guardrails
**Applies to:** both lanes (Lane C owns new additions; Lane L reads for awareness)
**Status:** COMPLETE (documentation)

> **For the next agent:** **NEVER paste real secret values into any file — not the codebase, not handover docs, not commit messages, not running logs.** This file lists env-var NAMES and WHERE values live. Values themselves live in `.env` (gitignored) on Mac and (post-v0.6.0) on the Hetzner VM. If you suspect a secret leaked to git, do NOT try to `git push --force` to hide it — read M8 Section 6 (secret-leak playbook) and follow the rotation procedure.

---

## 1. Safety guardrails (non-negotiable)

1. **Never `cat .env`** into any file you're writing.
2. **Never echo env vars** in log output. Use `echo "BRAIN_BEARER set: $([ -n "$BRAIN_BEARER" ] && echo yes || echo no)"` — report presence, not value.
3. **Never paste secrets into the running log** — even in the `Learned` section, even as an example.
4. **Never commit `.env`, `.env.cloud`, `credentials.json`, or `*.pem`** files. `scripts/check-env-gitignored.sh` exists to verify this.
5. **Never display bearer/API keys in terminal output visible to screenshot recording**.
6. **Never use wildcards** in bash allowlist patterns for commands that can read secrets (e.g., `Bash(cat .env)`).

## 2. Current env-var catalog (pre-v0.6.0)

| Var | Purpose | Required? | Default | Rotation |
|---|---|---|---|---|
| `BRAIN_BEARER` | shared-secret bearer token for APK + extension | **YES** | auto-generated on first run | user-triggered via `/settings/lan-info` |
| `BRAIN_LAN_MODE` | legacy LAN-binding toggle | NO (removed in v0.5.0 T-CF-12) | — | — |
| `BRAIN_BACKUP_INTERVAL_HOURS` | backup cadence | NO | 6 | config file |
| `OLLAMA_HOST` | Ollama endpoint | NO | `http://127.0.0.1:11434` | — |
| `OLLAMA_CHAT_MODEL` | model for Ask + enrichment | NO | `qwen3:8b` | — |
| `OLLAMA_EMBED_MODEL` | model for embeddings | NO | `nomic-embed-text` | — |
| `DATABASE_URL` | SQLite path | NO | `data/brain.sqlite` | — |
| `NODE_ENV` | Next.js mode | NO | `development` | — |

Source: grep `process.env\.` in `src/` — `src/lib/config/` holds the loader.

## 3. Incoming env-var catalog (post-v0.6.0)

| Var | Purpose | Required? | Default | Rotation |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API (Messages + Batch) | **YES** (v0.6.0+) | — | Anthropic Console rotate; update `.env.cloud`; restart app |
| `GEMINI_API_KEY` | Google Gemini embeddings | **YES** (v0.6.0+) | — | Google AI Studio rotate; update `.env.cloud`; restart app |
| `EMBED_PROVIDER` | feature flag: `ollama` or `gemini` | NO | `ollama` (flipped to `gemini` at cutover) | — |
| `BRAIN_ENRICH_BATCH_MODE` | `true` = use Anthropic Batch; `false` = realtime Ollama fallback | NO | `true` | — |
| `BRAIN_ENRICH_CRON_UTC` | cron expression for nightly batch | NO | `0 3 * * *` | — |
| `BRAIN_BACKUP_GPG_RECIPIENT` | email/key-ID for gpg encryption | **YES** (when B2 backups on) | — | — |
| `BRAIN_BACKUP_B2_BUCKET` | B2 bucket name | **YES** (when B2 backups on) | — | — |
| `B2_ACCOUNT_ID` | Backblaze B2 account | **YES** (in rclone config, not app env) | — | B2 UI rotate |
| `B2_APPLICATION_KEY` | Backblaze B2 app key | **YES** (in rclone config, not app env) | — | B2 UI rotate |

## 4. Where secrets live

| Environment | Location | Permissions |
|---|---|---|
| Mac (current prod) | `.env` in repo root (gitignored) | 600 (user read only) |
| Mac (Ollama) | Ollama manages own model files | — |
| Mac (Cloudflare) | `/etc/cloudflared/config.yml` + credentials JSON | 600 root |
| Hetzner (post-v0.6.0 prod) | `.env.cloud` in `/opt/brain/.env` (gitignored) | 600 brain-user |
| Hetzner (Cloudflare) | `/etc/cloudflared/config.yml` (copied from Mac) | 600 root |
| Hetzner (rclone) | `/home/brain/.config/rclone/rclone.conf` | 600 brain-user |
| Hetzner (gpg) | `/home/brain/.gnupg/` | 700 brain-user |

**None of these paths are in git.** All `.env*` patterns are in `.gitignore`. Verify: `git check-ignore .env` should output `.env`.

## 5. Rotation procedures

### 5.1 Bearer token (BRAIN_BEARER)

1. User opens `https://brain.arunp.in/settings/lan-info` on any paired device
2. Clicks "Regenerate token"
3. Server: generate new 32-byte hex, write to `.env`, restart Next.js (or hot-reload if supported)
4. Display new token + QR once on the settings page
5. User re-pairs APK + extension by scanning the new QR
6. Old token immediately rejected on subsequent requests

**Evidence:** `src/app/settings/lan-info/page.tsx` + `src/lib/auth/bearer.ts`.

### 5.2 Anthropic API key

1. Log into `https://console.anthropic.com`
2. API Keys → Create new key (label: `brain-hetzner-<date>`)
3. SSH to Hetzner: `sudo -u brain vi /opt/brain/.env` → update `ANTHROPIC_API_KEY`
4. Restart: `sudo systemctl restart brain`
5. Back in Anthropic Console: delete old key
6. Monitor `errors.jsonl` for any 401s for 5 minutes

### 5.3 Gemini API key

Mirror of Anthropic: Google AI Studio → new key → update `.env` → restart → revoke old.

### 5.4 B2 application key

1. B2 Console → App Keys → Add a New Application Key
2. Update `rclone config` on Hetzner: `rclone config` interactive
3. Test: `rclone lsd b2:<bucket-name>`
4. Delete old B2 app key

### 5.5 Cloudflare tunnel credentials

Only rotate if VM is suspected compromised. Procedure:
1. `cloudflared tunnel delete brain-tunnel` (destroys + recreates the tunnel)
2. `cloudflared tunnel create brain-tunnel` on the new host
3. Update DNS CNAME to new UUID.cfargotunnel.com
4. Re-install systemd unit with new credentials JSON

## 6. Security posture by scenario

| Scenario | What's exposed | Mitigation |
|---|---|---|
| `.env` leaks to public git | BRAIN_BEARER + API keys | rotate immediately per §5; `git filter-branch` to remove from history is weaker than rotate — prefer rotate |
| Hetzner VM compromised | Entire trust boundary | rotate bearer, Anthropic, Gemini, B2 keys; rotate Cloudflare tunnel; destroy + rebuild VM |
| Laptop stolen | `.env` on Mac | revoke bearer; rotate Anthropic + Gemini + B2 keys; Apple Find My + FileVault (already on) protects the DB at rest |
| Screenshot shared publicly | depends on what was in frame | if bearer visible → rotate; if API key visible → rotate |
| Public GitHub issue with logs | varies | scrub logs before posting; repo is public but `.env` is gitignored |

## 7. Lane boundaries for secrets

- **Lane C** manages all NEW secrets introduced by v0.6.0 (Anthropic, Gemini, B2, Hetzner SSH key). Lane L must not touch these.
- **Lane L** may read existing secret NAMES (not values) to understand existing auth flows, but must not add new env-var reads without coordination.
- **Both lanes** never paste values anywhere.

## 8. Secret scanning + audit trail

- Manual: `git log -p | grep -iE "(sk-ant-|AIzaSy|key-)"` scan the full history before any public push. Should return nothing.
- Automatic: `scripts/check-env-gitignored.sh` asserts `.env` is gitignored. Runs as part of `npm run smoke`.
- Incident audit: if a leak occurs, note in M8 + add a running-log entry tagged with the incident + all affected keys rotated.

## 9. Cost sanity check (incidentally tied to secrets)

Anthropic and Gemini charge per-request. A leaked API key is a DDoS vector for your billing. Set provider-side monthly caps:

- **Anthropic:** Console → Limits → Monthly spending cap = **$5**. Soft warn at $3.
- **Gemini:** Free tier is capped by rate limit, not spend; no additional cap needed at current tier.
- **Hetzner:** not a surprise-spend risk (fixed monthly).
- **B2:** billing alarm at $1/month (will never hit).

Per S-9 spec: if monthly bill > $12, something is wrong — rotate keys + investigate.
