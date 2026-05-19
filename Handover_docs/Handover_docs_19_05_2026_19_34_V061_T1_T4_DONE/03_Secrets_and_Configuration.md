# M3 — Secrets and configuration (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md) |

> **For the next agent:** No new secrets created or rotated this session. Two queued renames (`BRAIN_LAN_TOKEN` → `BRAIN_API_TOKEN`, `BRAIN_LAN_RATE_LIMIT` → `BRAIN_API_RATE_LIMIT`) are documented in [v0.6.1 plan T-11](../../docs/plans/v0.6.1-cloud-cleanup.md) with a dual-read sequencing strategy. CF_API_TOKEN remains chat-pasted from earlier today; Phase E rotation is still queued.

## 1. Safety guardrails

> **NEVER:** paste live secret values, full tokens, or raw `.env` content into any handover file. Use names + `<placeholder>` only.

> **NEVER:** edit `/etc/brain/.env` on Hetzner without first taking a backup (`sudo cp /etc/brain/.env /etc/brain/.env.<DATE>.backup`).

> **NEVER:** rotate `BRAIN_LAN_TOKEN` while paired devices (APK, Chrome extension) are in active use without coordinating a re-pair window. Devices hold the value, not the variable name.

## 2. Secret inventory (status delta from cutover-done)

| Secret | Current location | Status | Notes |
|--------|------------------|--------|-------|
| `BRAIN_LAN_TOKEN` | `/etc/brain/.env` (Hetzner) + APK Preferences + extension storage | **active** | Will be aliased to `BRAIN_API_TOKEN` in T-11a; old name kept for one cycle |
| `BRAIN_LAN_RATE_LIMIT` | `/etc/brain/.env` | **active**, default 30 | T-11 same rename treatment |
| `BRAIN_ANTHROPIC_API_KEY` | `/etc/brain/.env` | active | Cap $5/mo per memory `project_ai_brain_anthropic_cap` |
| `GEMINI_API_KEY` | `/etc/brain/.env` | active, paid tier | Set 2026-05-19 morning during cutover |
| `CF_API_TOKEN` | Bitwarden + (chat-pasted earlier today) | **compromised; rotate in Phase E** | Carry-over from cutover-done |
| `BRAIN_PIN_HASH` | `data/brain.sqlite` settings table | active | Server-side PBKDF2-HMAC-SHA256 |
| `BRAIN_SESSION_SIGNING_KEY` | `data/brain.sqlite` settings table | active | Used for HMAC session cookie; **(SoT: code)** in `src/lib/auth.ts` |

## 3. T-11 BRAIN_LAN_TOKEN → BRAIN_API_TOKEN — sequenced rename (NOT yet started)

The plan calls for a 2-phase deploy:

### 3.1 Phase 11a (in v0.6.1 release window)

1. Update `src/lib/auth/bearer.ts:92` to read `process.env.BRAIN_API_TOKEN ?? process.env.BRAIN_LAN_TOKEN`.
2. Add boot-time deprecation warning in `src/instrumentation.ts:44` if only the old name is set.
3. Update `.env.example` to document new name as primary, old as alias.
4. On Hetzner: `sudo cp /etc/brain/.env /etc/brain/.env.20260519.backup; sudo $EDITOR /etc/brain/.env` — add `BRAIN_API_TOKEN=<same value>` alongside (do NOT remove old name yet).
5. `sudo systemctl restart brain`.
6. Verify both names work via `/api/health` probe and verify the deprecation log does NOT fire (since both are present).

### 3.2 Phase 11b (deferred to v0.6.2)

1. Remove `process.env.BRAIN_LAN_TOKEN` fallback from code.
2. Remove old name from `/etc/brain/.env` on Hetzner.
3. Restart.
4. Verify `grep -r BRAIN_LAN_TOKEN src/` returns nothing.

**Risk if sequence is followed:** zero. The token VALUE never changes. Devices store the value. Only the variable NAME changes.

**Risk if sequence is reversed (do not):** instant break — all devices return 401 because server-side env reads fail.

## 4. NODE_ENV environment expectation

Confirmed during T-2 verification:

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cat /etc/brain/.env | grep NODE_ENV'
# Expect: NODE_ENV=production
```

This is what gates the new `Secure` cookie flag. If a future Hetzner re-provisioning loses this line, the cookie will silently drop the Secure flag (the server still works; the security regresses). Worth a `verify` step in any future Hetzner-bootstrap script.

## 5. Phase E secret rotation (carry-over from cutover-done)

Tracked in cutover-done [M3 §1.2](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md). Nothing new in this tranche. **Do not rotate during v0.6.1** — Phase E should run after v0.6.1 ships.

## 6. Cross-references

- [`docs/plans/v0.6.1-cloud-cleanup.md` §T-11](../../docs/plans/v0.6.1-cloud-cleanup.md) — full sequencing detail
- [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/03_Secrets_and_Configuration.md) — full secret inventory
- [`.planning/legacy-feature-audit.md` §1](../../.planning/legacy-feature-audit.md) — origin of the `BRAIN_LAN_TOKEN` rename recommendation
