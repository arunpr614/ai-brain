---
Title: AI Brain Handover — Secrets and Configuration (M3)
Version: 1.0
Date: 2026-05-19
Previous version: n/a
Baseline: n/a
Mode: full
Author: AI agent (Claude)
---

> **For the next agent:** This file lists every secret, where it lives, and how to rotate it. **No actual secret values are pasted anywhere in this handover** — only names + `<placeholder>` patterns. If you need a value, look in Bitwarden or the project `.env`.
>
> ⚠️ **Safety guardrail:** 6 secrets in this project were pasted as plaintext in chat during D-1..D-10. They are now in conversation history. The Phase E rotation queue (§6) is mandatory before tagging v0.6.0.

# 1. Secret inventory

| Secret | Type | Lives at | Used by | Status |
|---|---|---|---|---|
| `BRAIN_LAN_TOKEN` | 64-char hex bearer | Mac `.env` + Hetzner `/etc/brain/.env` | APK + extension + curl | Same value on both (transparent cutover) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Mac `.env` + Hetzner `/etc/brain/.env` | enrich + Ask | ⚠️ chat-exposed; rotate Phase E |
| `GEMINI_API_KEY` | `AIza...` | Mac `.env` + Hetzner `/etc/brain/.env` | embeddings | ⚠️ chat-exposed; rotate Phase E |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Mac `.env` + Hetzner `/etc/brain/.env` | standby | ⚠️ chat-exposed; rotate Phase E |
| `B2_KEY_ID` | `005...` | Mac `.env` + Hetzner `/etc/brain/.env` | B2 backups | ⚠️ chat-exposed; rotate Phase E |
| `B2_APPLICATION_KEY` | `K005...` | Mac `.env` + Hetzner `/etc/brain/.env` | B2 backups | ⚠️ chat-exposed; rotate Phase E |
| `B2_ENDPOINT` | hostname (not secret) | Mac `.env` + Hetzner `/etc/brain/.env` | rclone | not a secret |
| `B2_BUCKET_NAME` | string (not secret) | Mac `.env` + Hetzner `/etc/brain/.env` | rclone | not a secret |
| Cloudflare API token | `cfut_...` | Bitwarden only | cutover.sh (passed via env) | ⚠️ chat-exposed; auto-expires 2026-06-17, rotate Phase E |
| GPG private key | RSA 4096 | `~/.gnupg/` on Mac | decrypt B2 backups | ✅ never in chat |
| GPG passphrase | 6-word diceware | Bitwarden + secondary backup location | unlock private key | ⚠️ chat-exposed; rotate Phase E |
| GPG public key | RSA 4096 | Hetzner `~brain/.gnupg/` | encrypt outgoing backups | ✅ public, no secret |
| SSH key (Hetzner) | ed25519 | Mac `~/.ssh/ai_brain_hetzner` (priv) + Hetzner `~brain/.ssh/authorized_keys` (pub) | SSH to Hetzner | ✅ never in chat |
| SSH key (GitHub) | ed25519 | Mac `~/.ssh/id_ed25519` | git push | ✅ never in chat |

# 2. Env files

## 2.1 Mac `.env` (gitignored, project root)

```
BRAIN_LAN_TOKEN=<64 hex chars>
ANTHROPIC_API_KEY=<sk-ant-api03-...>
GEMINI_API_KEY=<AIza...>
OPENROUTER_API_KEY=<sk-or-v1-...>
B2_KEY_ID=<005...>
B2_APPLICATION_KEY=<K005...>
B2_ENDPOINT=s3.us-east-005.backblazeb2.com
B2_BUCKET_NAME=ai-brain-backups-arunpr614
```

Mac defaults to Ollama for LLM + embed (no `*_PROVIDER` env vars set).

**Verify gitignored:** `git check-ignore -v .env` returns `.gitignore:26:.env  .env`.

## 2.2 Hetzner `/etc/brain/.env` (mode 0600 brain:brain)

Same secrets as Mac PLUS:
```
NODE_ENV=production
BRAIN_DB_PATH=/opt/brain/data/brain.sqlite
LLM_ENRICH_PROVIDER=anthropic
LLM_ASK_PROVIDER=anthropic
EMBED_PROVIDER=gemini
```

13 vars total. Verify with: `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'grep -c "^[A-Z]" /etc/brain/.env'` → expect `13`.

## 2.3 `.env.example` (committed, no values)

Documentation reference. Updated in S-13 to reflect `gemini-embedding-001`. Always grep here first to understand what env vars exist.

# 3. SSH key reference

| Key | Lives at | Used for |
|---|---|---|
| `~/.ssh/ai_brain_hetzner` (priv) | Mac, mode 0600 | All Hetzner SSH (D-6+) |
| `~/.ssh/ai_brain_hetzner.pub` | Mac, mode 0644 | matches Hetzner `authorized_keys` |
| Hetzner `/root/.ssh/authorized_keys` | Hetzner | Phase A initial setup |
| Hetzner `/home/brain/.ssh/authorized_keys` | Hetzner | Production access |

**Connect:** `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44`

**SSH key rotation (Phase E candidate):** see [Handover_docs_14_05_2026_LANE/03_Secrets_and_Configuration.md](../Handover_docs_14_05_2026_LANE/03_Secrets_and_Configuration.md) §rotation procedure (4 steps; never reset Hetzner without verifying new key works first).

# 4. GPG keypair (D-5)

| Property | Value |
|---|---|
| Type | RSA 4096 |
| Identity | `ai-brain-backup-2026-05-18 <brain@arunp.in>` |
| Fingerprint | `950D F65D 8792 145A 06D2  263F BC1C CA58 4E82 D84B` |
| Private key location | Mac `~/.gnupg/` only — NEVER on Hetzner |
| Public key location | Hetzner `~brain/.gnupg/` (imported, ultimate-trust) |
| Passphrase | 6-word diceware, in Bitwarden + secondary location |
| Revocation cert | Mac `~/.gnupg/openpgp-revocs.d/950DF65D...rev` |

**Verify on Hetzner:**
```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'gpg --list-keys brain@arunp.in'
# Expect: pub rsa4096 2026-05-18 [SCEAR], fp 950DF65D...4E82D84B, [ultimate]
```

**Round-trip test (Mac):**
```bash
echo "test" | gpg --encrypt --recipient brain@arunp.in | \
  gpg --batch --pinentry-mode loopback --passphrase <passphrase-from-bitwarden> --decrypt
# Expect: "test"
```

# 5. Cloudflare API token (D-10)

| Property | Value |
|---|---|
| Token | `cfut_...` (in Bitwarden as "AI Brain — Cloudflare API token (Phase D-10)") |
| Permissions | Cloudflare Tunnel:Edit, Account Settings:Read, DNS:Edit (zone-scoped) |
| Account scope | Arunever614@gmail.com's Account |
| Zone scope | `arunp.in` only |
| TTL | Created 2026-05-18, expires **2026-06-17** |
| Auto-revoked? | Yes via TTL — even if forgotten, CF kills it |

**Verify still valid:**
```bash
curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <token>" | jq '.success'
# Expect: true
```

# 6. Phase E rotation queue (mandatory before tagging v0.6.0)

These secrets were pasted in plaintext chat during D-1..D-10 + S-13. Rotate ALL of them after 24-hour validation passes (post-D-18) and BEFORE tagging v0.6.0:

1. **Anthropic API key** — `console.anthropic.com → Settings → API Keys → revoke + create new`. Update Mac `.env` + Hetzner `/etc/brain/.env`. Restart `brain.service`.
2. **Gemini API key** — `aistudio.google.com → Get API key → revoke + create new`. Same update.
3. **OpenRouter API key** — `openrouter.ai → Settings → API Keys → revoke + create new`. Same update.
4. **B2 Application Key** — `secure.backblaze.com → App Keys → delete + add new (scope: ai-brain-backups-arunpr614, read+write only)`. Same update.
5. **GPG keypair** — generate new RSA 4096 with new diceware passphrase; re-encrypt the workflow; retire the chat-exposed key via revocation cert. **More involved**: also re-export public key, re-import on Hetzner, mark ultimate trust. ~15 min.
6. **Cloudflare API token** — `dash.cloudflare.com → My Profile → API Tokens → roll`. Update wherever stored (Bitwarden); do NOT bake into the repo.

**Rotation procedure for env-var-stored secrets** (steps 1-4):
```bash
# 1. Get new key from vendor dashboard
# 2. Update Mac .env (do NOT echo in chat)
# 3. Push to Hetzner
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  "sudo -n sed -i 's|^<VAR>=.*|<VAR>=<new-value>|' /etc/brain/.env"
# 4. Restart brain.service
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  "sudo -n systemctl restart brain"
# 5. Verify health
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'set -a; source /etc/brain/.env; set +a; curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $BRAIN_LAN_TOKEN" http://127.0.0.1:3000/api/health'
# Expect: 200
```

# 7. Secret hygiene rules (locked precedents)

| Rule | Source |
|---|---|
| `.env` is gitignored at `.gitignore:26` | repo |
| `data/brain.sqlite` is gitignored | repo |
| Don't commit secrets, even in commit messages | locked since v0.5.0 |
| Don't echo secrets back in chat | this session's pattern (rotate after) |
| Bearer token rotation invalidates ALL paired clients (APK + extension) | repo `scripts/rotate-token.sh` comment |
| GPG passphrase loss = backups unrecoverable | this session's user briefing |
| `arunpr614` GitHub identity, NEVER ToastTab work | memory `feedback_never_use_work_github.md` |

# 8. Configuration toggles (not secrets, but related)

| Var | Mac default | Hetzner prod | Notes |
|---|---|---|---|
| `LLM_ENRICH_PROVIDER` | (unset → `ollama`) | `anthropic` | Set in `/etc/brain/.env` |
| `LLM_ASK_PROVIDER` | (unset → `ollama`) | `anthropic` | Set in `/etc/brain/.env` |
| `LLM_ENRICH_MODEL` | (default per provider) | (default → `claude-haiku-4-5`) | Override in `.env` if needed |
| `LLM_ASK_MODEL` | (default per provider) | (default → `claude-sonnet-4-6`) | Override in `.env` if needed |
| `EMBED_PROVIDER` | (unset → `ollama`) | `gemini` | Set in `/etc/brain/.env` |
| `EMBED_MODEL` | (unset → `nomic-embed-text` for Ollama) | (default → `gemini-embedding-001`) | Override only if benchmarking |
| `BRAIN_LAN_RATE_LIMIT` | 30 (req per 60s per token) | inherited | Tune in `.env` |
| `OLLAMA_HOST` | `http://localhost:11434` | unset (no Ollama on Hetzner) | Phase E: delete from prod config explicitly |

Full env contract: [docs/llm-providers.md](../../docs/llm-providers.md).
