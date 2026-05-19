# M8 — Deployment and operations (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/07_Deployment_and_Operations.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/07_Deployment_and_Operations.md) (which itself layers on the 13:47 baseline §6 — note: that §6 was corrected today; details below) |

> **For the next agent:** **Use the corrected 3-tree rsync recipe in §3 of this file.** The original baseline §6 listed only `.next/standalone/` and shipped a CSS-broken page when followed verbatim. Both predecessor handover docs were patched in-place earlier this session.

## 1. Safety guardrails

> **NEVER:** `cutover.sh cutover` again. Hetzner is the source of truth for the DB. Re-running the cutover would overwrite live state.

> **NEVER:** edit `/etc/cloudflared/config.yml` without first taking a backup (`sudo cp …config.yml.<DATE>.backup`) and validating with `sudo cloudflared tunnel ingress validate /etc/cloudflared/config.yml` before restart.

> **NEVER:** skip `.next/static/` or `public/` in the rsync. Those trees are NOT bundled into `.next/standalone/` and the deploy will appear successful but render unstyled HTML.

## 2. Standing operational notes (unchanged from cutover-done)

- `cutover.sh` Bug 1 (WAL leak) — **FIXED** in `1413f9b`.
- `cutover.sh` Bug 2 (`--reset` wipe predicate) — still present, **moot** for forward path.
- Gemini billing — paid tier active.
- `tsx` on Hetzner — flagged zero-new-dep violation; cleanup in v0.6.3.

## 3. Code deploy to Hetzner — corrected procedure

> **GOTCHA — burned 2026-05-19 during T-1.** Next.js standalone build produces THREE separate output trees. The standalone tree alone serves a working API but the page renders as raw HTML with all `/_next/static/*.css` 404'ing. You MUST rsync all three trees together.

### 3.1 Step-by-step

1. **Build standalone (Mac):**
   ```bash
   npm run build
   # Output goes to .next/standalone/, .next/static/, public/
   ```

2. **Rsync the standalone bundle** (server.js + node_modules + .next + src + scripts):
   ```bash
   rsync -avz -e "ssh -i ~/.ssh/ai_brain_hetzner -o BatchMode=yes" \
     .next/standalone/server.js \
     .next/standalone/.next \
     .next/standalone/src \
     .next/standalone/scripts \
     brain@204.168.155.44:/opt/brain/
   ```

3. **Rsync `.next/static/`** — REQUIRED (CSS + chunk hashes live here):
   ```bash
   rsync -avz --delete -e "ssh -i ~/.ssh/ai_brain_hetzner -o BatchMode=yes" \
     .next/static/ \
     brain@204.168.155.44:/opt/brain/.next/static/
   ```

4. **Rsync `public/`** — REQUIRED (favicon, sw.js, offline.html, theme assets):
   ```bash
   rsync -avz --delete -e "ssh -i ~/.ssh/ai_brain_hetzner -o BatchMode=yes" \
     public/ \
     brain@204.168.155.44:/opt/brain/public/
   ```

5. **Restart brain.service:**
   ```bash
   ssh -i ~/.ssh/ai_brain_hetzner -o BatchMode=yes brain@204.168.155.44 \
     'sudo -n systemctl restart brain && sleep 4 && sudo -n systemctl is-active brain'
   # Expect: active
   ```

6. **Verify post-deploy** (all four must pass):
   ```bash
   # 6a. Health probe
   TOKEN=$(grep ^BRAIN_LAN_TOKEN .env | cut -d= -f2)
   curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
     https://brain.arunp.in/api/health
   # Expect: 200

   # 6b. CSS asset reachable
   CSS_PATH=$(curl -sL -H "Authorization: Bearer $TOKEN" https://brain.arunp.in/setup \
     | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1)
   curl -s -o /dev/null -w "%{http_code}\n" "https://brain.arunp.in${CSS_PATH}"
   # Expect: 200

   # 6c. Security headers (T-3 acceptance)
   curl -sI https://brain.arunp.in/ | grep -iE "x-frame-options|x-content-type-options|referrer-policy|strict-transport-security"
   # Expect: all four lines

   # 6d. Visual confirmation: open https://brain.arunp.in/unlock in a browser; CSS must load
   ```

### 3.2 What goes wrong if you skip a step

| Skipped step | Symptom | Recovery |
|-------------|---------|----------|
| Step 3 (`.next/static/`) | Page renders raw HTML with no styles; all `/_next/static/*.css` and `/_next/static/chunks/*.js` return 404 | Run step 3, restart |
| Step 4 (`public/`) | Favicon missing; `sw.js` 404; `offline.html` 404 (no fallback for offline mode) | Run step 4, restart |
| Step 5 (restart) | Old code still serving | `sudo systemctl restart brain` |

## 4. T-1..T-4 specifics (this tranche)

### 4.1 What was deployed

| Task | File touched | Verification |
|------|--------------|--------------|
| T-1 | `src/app/setup/page.tsx:25` | Source on Hetzner has new copy: `grep "Anthropic" /opt/brain/src/app/setup/page.tsx` returns the disclosure line |
| T-2 | `src/lib/auth.ts:113-119` | Source on Hetzner: `grep -A 9 SESSION_COOKIE_OPTIONS /opt/brain/src/lib/auth.ts` shows `secure: process.env.NODE_ENV === "production"` |
| T-3 | `next.config.ts` | `curl -sI https://brain.arunp.in/` returns all 4 headers |
| T-4 | `src/proxy.ts:65-100` | `errors.jsonl` tail after a wrong-bearer probe contains `"cf_ip":"..."` |

### 4.2 Rollback

If anything is wrong post-deploy:

```bash
# Revert just T-1
git revert 5a0f2f1
# Or revert just T-2/T-3/T-4 bundle
git revert 7ec050e
# Or both
git revert 5a0f2f1 7ec050e
# Then re-deploy via §3
```

The `cutover.sh rollback` flow is for CNAME flip; it does not roll back code changes. Use `git revert` + standard deploy.

## 5. Pre-deploy checklist (any future code change)

- [ ] No secrets in source control (`git diff --cached | grep -iE "key|token|secret"`)
- [ ] Working tree clean
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds and produces `.next/standalone/`, `.next/static/`, `public/` (all three)
- [ ] (Don't run smoke on Mac — broken; v0.6.3 backlog)
- [ ] Anthropic spend trajectory checked

## 6. Post-deploy checklist

- [ ] §3.1 step 6 — all four sub-checks pass
- [ ] If touching auth/proxy: force a 401 and confirm `cf_ip` lands in `errors.jsonl`
- [ ] If touching response headers or CSP: re-grep `curl -I` for all expected headers
- [ ] Update RUNNING_LOG with the deploy outcome

## 7. Cross-references

- [Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md §6](../Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md) — corrected baseline (this is now the canonical recipe)
- [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/07_Deployment_and_Operations.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/07_Deployment_and_Operations.md) — pointer note added
- [`scripts/deploy/cutover.sh`](../../scripts/deploy/cutover.sh) — DB cutover (NOT for code redeploys)
- [M9 — debugging](./08_Debugging_and_Incident_Response.md) — symptom → cause for the CSS-broken case
