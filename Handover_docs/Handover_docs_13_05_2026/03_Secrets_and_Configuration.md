# M3 — Secrets and Configuration

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/03_Secrets_and_Configuration.md`
**Baseline:** full
**Scope:** env vars, secret locations, rotation, safety guardrails
**Applies to:** both lanes (Lane C owns new additions; Lane L reads for awareness)
**Status:** COMPLETE (documentation)

> **For the next agent:** **NEVER paste real secret values into any file — not the codebase, not handover docs, not commit messages, not running logs.** This file lists env-var NAMES and WHERE values live. Values themselves live in `.env` (gitignored) on Mac and (post-v0.6.0) on the Hetzner VM. **Net change this session: zero new env vars.** The `X-Brain-Client-Api` header validation uses a CONSTANT in code (`EXPECTED_CLIENT_API = 1` at `src/lib/auth/api-version.ts:24`), not an env var.

---

## 1. Safety guardrails (non-negotiable)

1. **Never `cat .env`** into any file you're writing.
2. **Never echo env vars** in log output. Use `echo "BRAIN_LAN_TOKEN set: $([ -n "$BRAIN_LAN_TOKEN" ] && echo yes || echo no)"` — report presence, not value.
3. **Never paste secrets into the running log** — even in the `Learned` section, even as an example.
4. **Never commit `.env`, `.env.cloud`, `credentials.json`, or `*.pem`** files. `scripts/check-env-gitignored.sh` exists to verify this.
5. **Never display bearer/API keys in terminal output visible to screenshot recording**.
6. **Never use wildcards** in bash allowlist patterns for commands that can read secrets (e.g., `Bash(cat .env)`).
7. **Never paste auto-memory contents** into commit messages or handover docs. Memory at `~/.claude/projects/.../memory/` is for AI agent recall, not version-controlled artifacts.

## 2. Current env-var catalog (pre-v0.6.0 — unchanged from v4 baseline)

| Var | Required | Purpose | Where set |
|---|---|---|---|
| `BRAIN_LAN_TOKEN` | yes (LAN/extension/APK auth) | 32-byte hex bearer; rotated via `/settings/lan-info` | `.env` |
| `BRAIN_LAN_RATE_LIMIT` | no (default 30/min) | Per-token request cap | `.env` |
| `BRAIN_PIN_HASH` | yes | scrypt hash of the device PIN | `.env` |
| `BRAIN_SESSION_SECRET` | yes | HMAC for `brain-session` cookie | `.env` |
| `BRAIN_TUNNEL_URL` | yes | `https://brain.arunp.in` (build-time constant in client code too) | `.env` + `src/lib/config/tunnel.ts` |
| `OLLAMA_HOST` | no (default `http://127.0.0.1:11434`) | Ollama daemon | `.env` |

**No new env vars added this session.**

## 3. Compile-time constants (NOT env vars; documented for completeness)

| Constant | Where | Default | Notes |
|---|---|---|---|
| `EXPECTED_CLIENT_API` | `src/lib/auth/api-version.ts:24` | `1` | Server's accepted client API version. Bumped only on breaking outbox-payload schema change. (NEW v0.6.x) |
| `CLIENT_API_HEADER` | `src/lib/auth/api-version.ts:18` | `'x-brain-client-api'` | Header name. (NEW v0.6.x) |
| `MIN_TOKEN_LENGTH` | `src/lib/auth/bearer.ts` | 32 (hex chars = 128 bits) | Minimum bearer token length |
| `RATE_WINDOW_MS` | `src/lib/auth/bearer.ts` | 60000 | Rate-limit window |
| `DEFAULT_RATE_LIMIT` | `src/lib/auth/bearer.ts` | 30 | Default per-token cap |
| `QUOTA_REJECT_RATIO` | `src/lib/outbox/storage.ts` | 0.95 | Outbox quota pre-flight threshold (NEW v0.6.x) |
| `QUOTA_WARN_RATIO` | `src/lib/outbox/storage.ts` | 0.8 | Outbox quota warn threshold (NEW v0.6.x) |
| `BASE_DELAY_MS` | `src/lib/outbox/backoff.ts` | 10000 | Backoff base before jitter (NEW v0.6.x) |
| `MAX_DELAY_MS` | `src/lib/outbox/backoff.ts` | 3600000 | 1-hour cap on retry delay (NEW v0.6.x) |
| `JITTER_RATIO` | `src/lib/outbox/backoff.ts` | 0.25 | ±25% jitter on backoff (NEW v0.6.x) |
| `FOREGROUND_TICK_MS` | `src/lib/outbox/triggers.ts` | 30000 | Sync-worker tick while WebView unfrozen (NEW v0.6.x) |
| `NOTIFICATION_DEBOUNCE_MS` | `src/lib/outbox/notifications.ts` | 30000 | 0→≥1 stuck transition debounce (NEW v0.6.x) |

**Bumping any of these is a deliberate change requiring a code commit + manual re-test, not a runtime config change.**

## 4. Incoming env vars (v0.6.0 — Lane C)

Carried forward from v4 baseline; status unchanged this session:

| Var | Lane C task | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | Phase C (cloud setup) | not yet generated |
| `GEMINI_API_KEY` | Phase C | not yet generated |
| `B2_APPLICATION_KEY_ID` | Phase E (backups) | not yet generated |
| `B2_APPLICATION_KEY` | Phase E | not yet generated |
| `B2_BUCKET_NAME` | Phase E | not yet decided |
| `BRAIN_GPG_RECIPIENT` | Phase E | gpg key generation deferred to user |
| `BRAIN_ENRICH_BATCH_MODE` | Phase C | not yet defined |

## 5. Where secret values live

| Layer | Location | Mode | Backed up? |
|---|---|---|---|
| Mac development | `.env` (gitignored) | local file | manual; user's responsibility |
| Mac production (current) | `.env` | local file, runtime-loaded | mac-fs backup if user enables Time Machine |
| **APK bearer token** | Capacitor `@capacitor/preferences` key `brain_token` | encrypted KV on Android | wiped on app uninstall |
| **APK IDB outbox payloads** | IndexedDB `brain-outbox` store `outbox` (per-row `payload` field) | structured-clone in app-private storage | wiped on app uninstall |
| **APK PDF bytes** | `Directory.Data/outbox-pdfs/<rowId>__<safeName>` | app-private filesystem | wiped on app uninstall; deleted on sync per plan §4.4 |
| Hetzner VM (post-v0.6.0) | `.env.cloud` on the VM (root-readable, mode 600) | local file on cloud server | TBD per Phase E backup design |
| Backblaze B2 keys (post-v0.6.0) | App key generated via B2 console; key ID + secret pair | use restricted-permissions app key, not master | n/a |

## 6. Outbox-specific data sensitivity

The IDB outbox can hold:
- URL strings (publicly-routed; same sensitivity as the user's browser history)
- Note title + body (user content; same sensitivity as any captured note)
- PDF metadata (file name, size, sha256; bytes live on filesystem)

**It does NOT hold:**
- Bearer tokens (those live in `@capacitor/preferences`, separate)
- PIN or session cookies (browser-managed, separate)
- API keys for any third-party (none used by APK)

**Stolen-unlocked-phone exposure:** an attacker with an unlocked Pixel could:
1. Open Brain (no PIN re-prompt unless app was killed; the brain-session cookie persists in WebView)
2. Read the inbox → sees pending shares (URLs, note bodies, PDF filenames)
3. Cannot exfiltrate via the APK because there's no export-from-inbox button

This is the same threat model as the pre-offline APK (an unlocked phone with Brain logged-in already exposed library content). **No new threat introduced.** A future hardening could add a re-PIN gate on `/inbox` if user requests.

## 7. Rotation procedures (unchanged from v4 baseline)

| Secret | Rotation cadence | Procedure |
|---|---|---|
| `BRAIN_LAN_TOKEN` | on-demand | `/settings/lan-info` → "Rotate token" → re-scan QR on Pixel + extension |
| `BRAIN_PIN_HASH` | on-demand | TBD (no UI today; manual `.env` edit + restart) |
| `BRAIN_SESSION_SECRET` | annual or on suspected leak | manual `.env` edit + restart; existing sessions invalidate |
| Anthropic / Gemini / B2 keys | per-provider best practice | n/a (not yet active) |

## 8. Cross-references

- M2 §4 — `X-Brain-Client-Api` header (constant, not env var, but adjacent to auth)
- M7 — backup procedures (current local; future B2)
- M8 §6 — secret-leak playbook (carried forward from v4 baseline)
