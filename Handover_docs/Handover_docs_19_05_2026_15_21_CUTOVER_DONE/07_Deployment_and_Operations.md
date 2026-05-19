# AI Brain: Deployment and operations (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md](../Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** Baseline v1 has the full cutover runbook. This file documents (a) what changed since baseline (Bug 1 is now fixed), (b) the new ingress edit procedure, and (c) the post-cutover rollback path which was not in baseline.

> **Guardrail:** `cutover.sh cutover` will overwrite the Hetzner DB. Do not re-run it unless you've intentionally rolled back to pre-cutover state. Re-running destroys the gemini-embedded vectors that were generated this session.

## 1. Bug 1 (WAL leak) — now fixed

**Status:** Fixed in commit `1413f9b` on `main`. `scripts/deploy/cutover.sh` `d12_db_migrate()` now `rm -f`s `.sqlite-wal` and `.sqlite-shm` before swapping the DB.

**Implication:** Future D-12 runs will not corrupt with stale WAL pages. The fix is forward-only — it doesn't help if you've already corrupted state from a prior buggy run.

## 2. Bug 2 (--reset wipe predicate) — still present, currently moot

**Status:** NOT fixed. The `wipeChunksFor()` function in `scripts/backfill-embeddings.mjs` still uses the buggy predicate (joins `chunks_vec` to `chunks` via rowid; misses orphan vec rows).

**Why moot for next forward path:** the backfill on Hetzner now succeeds in default mode (no `--reset`). All 8 items have proper `chunks` rows. If you do need `--reset` in the future (e.g., another embed model swap), apply the fix from baseline §2.2 first.

## 3. Bug 3 (Gemini free-tier TPM) — resolved by paid tier

**Status:** Resolved by upgrading the GCP project linked to `GEMINI_API_KEY` to paid tier (today's session). Free-tier 100 RPM ceiling lifted to 3,000 RPM. The `gemini.ts` serial-loop + 1.1s delay was kept anyway as a defensive measure.

## 4. Cloudflared ingress edit procedure (NEW — not in baseline)

When you need to add a new hostname pointed at the Hetzner tunnel:

1. SSH to Hetzner: `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44`
2. Backup current config:
   ```bash
   sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.<DATE>-backup
   ```
3. Edit `/etc/cloudflared/config.yml` to add a new entry to the `ingress:` list, **above** the catch-all:
   ```yaml
   - hostname: <new-hostname>
     service: http://127.0.0.1:3000
   ```
4. Validate before restart:
   ```bash
   sudo cloudflared tunnel ingress validate /etc/cloudflared/config.yml
   ```
   Must print `OK`. If it errors, fix the YAML before proceeding.
5. Restart cloudflared:
   ```bash
   sudo systemctl restart cloudflared && sudo systemctl is-active cloudflared
   ```
6. Verify via curl:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <BRAIN_LAN_TOKEN>" \
     https://<new-hostname>/api/health
   ```
   Expect 200 within ~10 seconds (CF edge propagation).

## 5. Code deploy to Hetzner (interim — `tsx` runtime path)

**Disclaimer:** the `scp src/lib/embed/gemini.ts` shortcut works because `tsx` is installed on Hetzner — that's a flagged zero-new-dep violation per baseline M5 §3.4. Use the build-and-rsync path for non-trivial changes.

**Quick interim path (single-file `.ts` edits, used today for `gemini.ts`):**
1. `scp -i ~/.ssh/ai_brain_hetzner <local-file> brain@204.168.155.44:/opt/brain/<remote-path>`
2. `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo systemctl restart brain'`
3. Verify: `ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'sudo systemctl is-active brain'`

**Proper path (build + rsync):** see baseline §6 — **and note the post-2026-05-19 fix to that section: you MUST rsync `.next/static/` and `public/` separately, not just `.next/standalone/`.** Skipping either tree produces an unstyled page (CSS chunks 404). Lesson burned during v0.6.1 T-1 deploy.

## 6. Smoke checks (post-cutover)

### 6.1 End-to-end health probe

```bash
TOKEN=$(grep ^BRAIN_LAN_TOKEN .env | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code} in %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://brain.arunp.in/api/health
# Expect: 200 in ~0.7s
```

### 6.2 Hetzner-side direct probe

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'curl -s -o /dev/null -w "%{http_code}\n" \
   -H "Authorization: Bearer $(grep ^BRAIN_LAN_TOKEN /etc/brain/.env | cut -d= -f2)" \
   http://127.0.0.1:3000/api/health'
# Expect: 200
```

### 6.3 Cron schedule verify

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'sudo journalctl -u brain --no-pager -n 100 | grep -E "batch-cron|backup"'
# Expect: '[batch-cron] scheduled submit=...' '[backup] scheduler started ...'
```

### 6.4 Vector coverage parity

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cd /opt/brain && set -a; source /etc/brain/.env; set +a; \
   node -e "const db=require(\"better-sqlite3\")(\"/opt/brain/data/brain.sqlite\"); \
   const sv=require(\"sqlite-vec\"); sv.load(db); \
   console.log(\"items:\", db.prepare(\"SELECT COUNT(*) AS n FROM items\").get(), \
   \"chunks:\", db.prepare(\"SELECT COUNT(*) AS n FROM chunks\").get(), \
   \"vec:\", db.prepare(\"SELECT COUNT(*) AS n FROM chunks_vec\").get())"'
# Expect (current): items 8, chunks 81, vec 81
```

## 7. Pre-deploy checklist (before next code push to Hetzner)

- [ ] No secrets in source control (`git diff --cached | grep -iE "key|token|secret"`)
- [ ] Working tree clean (`git status` shows expected files only)
- [ ] Smoke check §6.1 returns 200 BEFORE you change anything
- [ ] If the change is in `embed/`, `chunk/`, or `pipeline.ts`, plan how you'll re-verify vector coverage after deploy
- [ ] Anthropic spend trajectory checked (avoid surprise burn)

## 8. Rollback (cutover-aware)

If something is wrong with Hetzner brain post-cutover:

### 8.1 Quick CNAME rollback

```bash
CF_API_TOKEN=<from Bitwarden — note this token was rotated in Phase E if shipped> \
  ./scripts/deploy/cutover.sh rollback
```
What it does: PATCHes CNAME back to Mac UUID `58339d22-...`; bootstraps Mac cloudflared launchdaemon.

### 8.2 Mac brain restart (REQUIRED — script doesn't do this)

After the CNAME flip back, Mac needs a serving brain on **port 3000** (the cloudflared config expects 3000):

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
PORT=3000 npm run start &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $(grep ^BRAIN_LAN_TOKEN .env | cut -d= -f2)" https://brain.arunp.in/api/health
# Expect: 200 within ~10s
```

If you find a stale next-server on the wrong port (as we did today on :3099), kill it first.

### 8.3 What rollback does NOT do

- Does NOT undo the D-12 DB swap. Hetzner's DB stays the way it was post-D-12 (8 items + new vectors).
- Does NOT stop Hetzner brain.service. To do that: `ssh ... 'sudo systemctl stop brain'`
- Does NOT restart Mac brain (manual, see §8.2)

## 9. Common deployment mistakes (current)

| Severity | Mistake | Recovery |
|----------|---------|----------|
| **P0** | Re-running `cutover.sh cutover` over the post-D-12 Hetzner state | Restore `/opt/brain/data/brain.sqlite.pre-cutover`, then re-run with intent (see baseline §3.2 manual-step note) |
| **P0** | Editing `/etc/cloudflared/config.yml` without `tunnel ingress validate` first | YAML errors take cloudflared down; SSH back, restore `config.yml.pre-d13`, restart |
| **P1** | Pushing `.ts` file changes via `scp` without restart | brain.service has cached the old code; symptom is "code change not reflected"; `sudo systemctl restart brain` |
| **P1** | Running `backfill-embeddings.mjs --reset` against post-cutover Hetzner | Wastes Gemini API spend re-embedding everything; possible Bug-2 ghost vectors. Default mode (no `--reset`) is correct unless you're swapping models. |
| **P2** | Adding a new hostname's CNAME without updating Hetzner ingress | Silent 404 for ~indefinite. See §4. |

## 10. Cross-references

- Original cutover runbook: [Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md](../Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md)
- Ingress edit details + memory note: [memory: reference_hetzner_cloudflared_ingress.md](../../../../.claude/projects/-Users-arun-prakash-Documents-GitHub-arun-cursor/memory/reference_hetzner_cloudflared_ingress.md)
- Cutover script: [`scripts/deploy/cutover.sh`](../../scripts/deploy/cutover.sh)
