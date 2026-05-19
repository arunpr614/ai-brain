# M9 — Debugging and incident response (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/08_Debugging_and_Incident_Response.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/08_Debugging_and_Incident_Response.md) |

> **For the next agent:** Use the cutover-done baseline §3 for all pre-existing symptoms. This file documents only NEW symptom→cause rows surfaced this session. Four new entries: CSS missing post-deploy, `cf_ip` log-grep recipe, `brain.service: deactivating` race, and Mac smoke failure.

## 1. New symptoms (today's afternoon session)

### 1.1 Page renders as raw HTML, all `/_next/static/*` return 404

| | |
|---|---|
| **First seen** | 2026-05-19 ~19:05 IST after T-1 deploy |
| **Symptom** | Browser loads `https://brain.arunp.in/setup` (or any page) and shows readable HTML but no CSS, no fonts, no client-side JS interactivity. DevTools Network shows `200` on the HTML doc but `404` on every `_next/static/chunks/*.css` and `*.js`. |
| **Root cause** | Next.js `output: "standalone"` in `next.config.ts` produces three independent output trees: `.next/standalone/` (server), `.next/static/` (client assets), `public/` (favicon, sw.js, offline.html). The pre-fix handover §6 rsync recipe only listed the standalone tree. The deploy looked successful (server.js up, API responses 200) but the asset trees on `/opt/brain/.next/static/` and `/opt/brain/public/` were empty. |
| **Diagnosis** | `ssh brain@... 'ls /opt/brain/.next/static'` → "No such file or directory". |
| **Fix** | Run the two missing rsync passes (see [M8 §3 step 3 + 4](./07_Deployment_and_Operations.md)). Restart brain.service. CSS load returns 200. |
| **Prevention** | M8 §3 now documents the corrected 3-step rsync. Both predecessor handover docs were patched in-place this session. |

### 1.2 401 surfaced no client IP — now: `cf_ip` field in `errors.jsonl`

| | |
|---|---|
| **First seen** | This was a known gap before T-4; T-4 closes it |
| **Symptom** (pre-T-4) | A 401/403 spray against `https://brain.arunp.in/api/*` produces log lines in `data/errors.jsonl` with no source IP. Forensic question "is someone hammering my server?" had no answer. |
| **Cause** | `src/proxy.ts` `logError()` calls did not include `cf-connecting-ip`. Cloudflare sets it; the server didn't read it. |
| **Fix (T-4, deployed in `7ec050e`)** | `src/proxy.ts:65-67` captures `req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? null` once; included as `cf_ip` field in all three bearer-rejection log entries (lines 73, 86, 95 in the new code). |
| **Verification recipe** | ```bash<br>curl -s -o /dev/null -H "Authorization: Bearer wrong" https://brain.arunp.in/api/health<br>ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 'tail -1 /opt/brain/data/errors.jsonl'<br># Expect: a JSON line containing "cf_ip":"<your IP>"<br>``` |

### 1.3 `systemctl is-active brain` returns "deactivating" briefly during restart

| | |
|---|---|
| **First seen** | 2026-05-19 ~18:03 (during a restart between T-1 deploy and CSS fix) |
| **Symptom** | After `sudo systemctl restart brain`, immediately querying `is-active` returns `deactivating` (exit 3) for ~10 seconds. Then `active`. The server is briefly down while old PID times out on stop-sigterm + new PID starts up. |
| **Cause** | systemd race during restart. Logged: `brain.service: State 'stop-sigterm' timed out. Killing.` Then SIGKILL. Then start. ~15s gap end-to-end. |
| **Fix** | None needed — wait 10–15 seconds before probing. `sleep 4` is too short on a slow restart; use `sleep 10` or poll. |
| **Recipe** | ```bash<br>sudo systemctl restart brain<br># Wait for it<br>for i in {1..6}; do<br>  sleep 3<br>  STATE=$(sudo systemctl is-active brain)<br>  echo "[$i] $STATE"<br>  [ "$STATE" = "active" ] && break<br>done<br>``` |
| **Note** | If `deactivating` persists >30s, check `journalctl -u brain --since "1 min ago"` for an OOM, port-bind failure, or Next.js startup error. |

### 1.4 `npm run smoke` fails on Mac with `better-sqlite3` "Could not locate the bindings file"

| | |
|---|---|
| **First seen** | Pre-existing carry-over from cutover handover §1.5; reproduced this session post-T-1 |
| **Symptom** | `npm run smoke` and unit tests fail with `Could not locate the bindings file. Tried: …better_sqlite3.node`. The "tried" list does not include any path that exists. |
| **Cause** | Mac local Node is `v26.0.0` (NODE_MODULE_VERSION 147). `node_modules/better-sqlite3/lib/binding/` directory does not exist. The package never built native bindings for Node 26 (likely no prebuilt and `npm install` skipped the build, or the install pre-dated the Node upgrade). |
| **Fix attempts NOT made this session** | `npm rebuild better-sqlite3`. Risky on Node 26 (bleeding-edge); may fail without matching native build tools. Deferred to v0.6.3. |
| **Workaround** | Verify code changes via cloud server, not local smoke. Hetzner has its own working bindings (Node version on Hetzner matches a supported prebuilt). |
| **Backlog** | New entry in `BACKLOG.md` v7.3 §"Out of scope here (deferred)" — Mac-side `better-sqlite3` ABI mismatch → v0.6.3. |

## 2. Verification recipes for T-1..T-4

### 2.1 T-1 — setup-page copy

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'grep -A 4 "Hetzner\|Anthropic" /opt/brain/src/app/setup/page.tsx | head -8'
# Expect: lines containing "stored on your Brain server (Hetzner)" and "Anthropic and Google APIs"
```

### 2.2 T-2 — Secure cookie flag (static)

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'grep -A 9 "^export const SESSION_COOKIE_OPTIONS" /opt/brain/src/lib/auth.ts'
# Expect: secure: process.env.NODE_ENV === "production"
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'cat /etc/brain/.env | grep NODE_ENV'
# Expect: NODE_ENV=production
```

### 2.3 T-2 — Secure cookie flag (interactive, gold-standard)

1. Open `https://brain.arunp.in/unlock` in a browser.
2. Log in with PIN.
3. DevTools → Application → Cookies → `brain.arunp.in`.
4. Confirm session cookie row shows `Secure ✓`.

### 2.4 T-3 — Security headers

```bash
curl -sI https://brain.arunp.in/ | grep -iE "x-frame-options|x-content-type-options|referrer-policy|strict-transport-security"
# Expect 4 lines:
#   x-frame-options: DENY
#   x-content-type-options: nosniff
#   referrer-policy: strict-origin-when-cross-origin
#   strict-transport-security: max-age=63072000; includeSubDomains
```

### 2.5 T-4 — `cf_ip` log

```bash
curl -s -o /dev/null -H "Authorization: Bearer wrong" https://brain.arunp.in/api/health
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'tail -1 /opt/brain/data/errors.jsonl'
# Expect: JSON line with "type":"lan.bearer.reject-…" AND "cf_ip":"<IP>"
```

## 3. Symptom → quick reference (delta-only — see baseline for the full table)

| Symptom | Likely cause | Pointer |
|---------|--------------|---------|
| Page loads as raw HTML; CSS 404s | `.next/static/` and/or `public/` not rsync'd | M8 §3 step 3 + 4 |
| 401 with no client IP in logs (pre-T-4) | `proxy.ts` did not capture `cf-connecting-ip` | T-4 fixed this |
| Bearer reject with `cf_ip` looking wrong | `cf-connecting-ip` is set by Cloudflare; if missing, request didn't go through tunnel | check Cloudflare tunnel ingress |
| `is-active brain` returns `deactivating` | Restart in flight; systemd waiting on stop-sigterm | wait 10–15s; if persistent, `journalctl -u brain` |
| `npm run smoke` "Could not locate bindings" | Mac local `better-sqlite3` ABI mismatch with Node 26 | use cloud verification; v0.6.3 backlog |
| Setup page still says "outside your Mac" | Old build cached; redeploy via M8 §3 | restart + cache-bust |

## 4. Logging / observability (delta only)

The `data/errors.jsonl` schema for bearer-reject entries is now:

```jsonc
{
  "type": "lan.bearer.reject-<reason>",
  "path": "/api/<path>",
  "method": "GET" | "POST" | …,
  "cf_ip": "<ipv4-or-ipv6>" | null,   // NEW from T-4
  "ts": <epoch-ms>
}
```

Reasons (from `verifyBearerToken()`): `length-mismatch`, `parse-error`, `signature-mismatch`, `server-token-unconfigured`.

## 5. Filing new bugs

Use the `Bug_Report_Creator` skill if available. For known issues NOT yet filed:

1. **Mac better-sqlite3 ABI mismatch** — captured in BACKLOG.md only; no formal Bug_Report file.
2. **`enrichment-worker.ts` 45-min unreachable loop** — carry-over from cutover-done.
3. **Share-target silently noop on unpaired devices** — surfaced in audit; not yet filed. Worth investigating with adb logcat / chrome://inspect.

## 6. Cross-references

- [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/08_Debugging_and_Incident_Response.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/08_Debugging_and_Incident_Response.md) — full pre-existing symptom table
- [M8 — deployment](./07_Deployment_and_Operations.md) — corrected rsync recipe
- [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md) — task spec
