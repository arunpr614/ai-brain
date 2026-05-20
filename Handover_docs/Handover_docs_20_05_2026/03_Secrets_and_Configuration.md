# M3 — Secrets and Configuration (delta pointer)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — no secret changes this session |

> ⚠️ **Safety guardrail:** Never paste actual key values into handover docs. Names + `<placeholder>` patterns only.

> **For the next agent:** No secrets rotated, no env vars added, no config changes today. Read this file's §3 only if you're about to plan v0.6.2 backup work (GPG escrow note).

---

## 1. What this extends

**Required prior reading:** `../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md` for the full Hetzner `.env` inventory, Cloudflare tunnel credentials path, and Anthropic key name.

---

## 2. Confirmed today (no changes)

Inspected `/etc/brain/.env` on Hetzner via `sudo cat`. Verified the following are present:

| Var | State | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | set | live (verified by 200 response from curl probe) |
| `GEMINI_API_KEY` | set | live (used by retrieve probe today) |
| `LLM_ENRICH_PROVIDER` | `anthropic` | unchanged from cutover |
| `LLM_ASK_PROVIDER` | `anthropic` | unchanged |
| `EMBED_PROVIDER` | `gemini` | unchanged |
| `BRAIN_API_TOKEN` | set | post-T-11a; current canonical |
| `BRAIN_LAN_TOKEN` | set | legacy fallback; T-11b drops this in v0.6.2 (gated 2026-05-26+) |
| `NODE_ENV` | `production` | confirmed via `tr "\0" "\n" < /proc/$BRAIN_PID/environ` |

Process environ inheritance verified — systemd `EnvironmentFile=/etc/brain/.env` propagates correctly.

---

## 3. Forward-looking config gaps (v0.6.2 will need)

These are **not yet provisioned** but will be needed when v0.6.2 backup work begins:

| Concern | Decision needed | Where it lands |
|---|---|---|
| B2 bucket name | Recommend `brain-backups` | rclone config on Hetzner |
| B2 app key | scoped write-only to that bucket | rclone config |
| GPG keypair for encryption | new keypair or reuse existing? | `/etc/brain/backup-pubkey.asc` (public) + escrow (private) |
| GPG private key escrow location | 1Password vault? Paper? Hardware key? | runbook `docs/runbooks/backup-recovery.md` |
| rclone config file location | Recommend `/home/brain/.config/rclone/rclone.conf` mode 600 | NOT in `.env` (creds stay in rclone config, not env) |

**Do not provision any of the above in the next session before the user ratifies the v0.6.2 phase shape (split vs bundled).** If T-1 retry ships as v0.6.1.1 hotfix, these provisioning items move to v0.6.2 and don't block the hotfix.

---

## 4. Cookie discovery (lesson)

**Stale cookies persist their attributes** — the `Secure` flag is frozen at issue-time. Pre-v0.6.1 cookies in browsers will show `Secure ✗` even though current code is correct. The fix is to delete the cookie + re-login, not to chase a code bug. Documented in `08_Debugging_and_Incident_Response.md` §1.

This is an operational lesson, not a configuration change. Worth flagging because it could be misdiagnosed as a config bug by a fresh agent.
