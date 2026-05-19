---
date: 2026-05-19
author: Claude (Sonnet 4.6)
project_version: v0.6.0
audit_scope: >
  All source files under src/app, src/components, src/lib; scripts/; public/;
  capacitor.config.ts; android/app/src/main/AndroidManifest.xml.
  Handover baseline: Handover_docs_19_05_2026_15_21_CUTOVER_DONE/.
  Audit trigger: Mac→Hetzner cutover shipped 2026-05-19. Brain now serves
  exclusively from Hetzner via Cloudflare named tunnel (brain.arunp.in).
---

# Legacy Feature Audit — AI Brain v0.6.0

**Purpose:** Identify which features were designed for the legacy Mac/LAN setup and now need
renaming, re-tuning, or removal following the cloud cutover. Non-technical summary at the top;
technical detail in each section; concrete change actions at the bottom.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Features audited | 17 |
| Redundant (remove or gut) | 2 |
| Mis-named (rename, logic intact) | 6 |
| Mis-tuned (logic correct, parameters wrong for cloud) | 3 |
| Mis-described (user-visible string lies) | 4 |
| Still-needed-as-is | 2 |

### Top 5 highest-value cleanups (ranked by user-visible benefit / ROI)

1. **Rename `BRAIN_LAN_TOKEN` → `BRAIN_API_TOKEN`** — Every paired device, the `.env` file, the
   boot log, the Settings page, the rotate-token script, and the handover docs use this name. It
   tells future operators the token is "LAN-only," which will confuse anyone who correctly sees it
   working over the internet. S effort, zero risk.

2. **Rewrite `public/offline.html` user-visible strings** — Three strings on the page the user
   sees when their phone can't reach the server tell them to "wake the Mac," check "same Wi-Fi," or
   confirm `npm run dev:lan` is running. The Mac has been offline since 2026-05-19. When a real
   outage occurs, these instructions actively mislead. S effort, low risk.

3. **Rename `/settings/lan-info` URL and module** — The Settings page links to
   `/settings/lan-info`; the directory is `src/app/settings/lan-info/`; share-handler tells the
   user "Open Settings → LAN Info on your Mac." The page's own `<h1>` already reads "Device
   pairing" — the internal naming just hasn't caught up. M effort (Next.js route rename + one
   redirect), low risk.

4. **Fix `setup-apk/page.tsx` verify-error string** — The error message on the QR-scan screen
   says "Check that the Mac is awake, Brain is running, and the Cloudflare tunnel is up (look for
   `cloudflared` in the menu bar)." The Mac has no menu-bar `cloudflared` icon; the daemon is on
   Hetzner. The user reads this and looks for something that isn't there. S effort, low risk.

5. **Remove the dead `getLanIpv4()` function** — `src/lib/lan/info.ts:21` exports a function that
   enumerates `en*`/`wl*` network interfaces to find the Mac's LAN IP. Zero callers remain; it was
   only ever needed for the pre-pivot IP-in-QR flow. Leaving it in `lib/lan/` implies the IP
   matters, which it doesn't. S effort, zero risk.

### Surprises

- **`BRAIN_TUNNEL_URL` is the right name for the constant** — unlike most "tunnel" naming, the
  constant `BRAIN_TUNNEL_URL` in `tunnel.ts` accurately describes the Cloudflare named tunnel
  mechanism. No rename needed; the comment could be updated to say "Hetzner" instead of "Mac."
- **`getLanIpv4()` has zero callers** — the function was stripped of its consumers during the
  pivot but never deleted. It silently carries a macOS-specific network interface heuristic
  (`en*` or `wl*`) that would return Hetzner's bond0 IP on the VPS, not the user's Mac IP. It's
  dead weight but completely inert.
- **The offline outbox is MORE valuable post-cutover, not less** — Hetzner has >99.9% uptime but
  the phone is still on a mobile network that drops for seconds in tunnels, lifts, etc. The outbox
  correctly handles these. The only thing wrong is the retry backoff tuning (see §8 below).
- **The SwiftBar health plugin probes localhost:3000 and the local cloudflared daemon** — both
  of which stopped existing as live services on 2026-05-19. The plugin would show 🔴 Brain DOWN
  on the user's Mac forever from now on, even when Hetzner is healthy.

---

## Cross-Cutting Themes

1. **"LAN" as a naming prefix** appears in 10+ identifiers and user-facing strings:
   `BRAIN_LAN_TOKEN`, `BRAIN_LAN_RATE_LIMIT`, `/settings/lan-info`, `lan.bearer.*` log events,
   `src/lib/lan/`, `getLanIpv4()`, `.env.example` section header "LAN auth", `rotate-token.sh`
   comment "after a suspected token leak." A single rename pass would close all of these.

2. **"Your Mac"** appears in 5 user-facing strings across 3 files (`share-handler.tsx`,
   `reachability.ts`, `setup-apk/page.tsx`, `offline.html`). All give the user the wrong action
   when something goes wrong.

3. **Ollama as the assumed LLM/embed provider** is baked into error codes (`OLLAMA_OFFLINE`),
   user-facing UI strings ("Ollama offline", `ollama serve`), and a variable name
   (`OLLAMA_DOWN_BACKOFF_MS`). The Hetzner instance uses Anthropic for enrichment and Ask, and
   Gemini for embedding. The code is provider-agnostic internally but the surface layer hasn't
   caught up.

4. **Version strings stuck at v0.1.0** appear in the sidebar footer (`"v0.1.0 · local"`) and the
   first-run setup page ("AI Brain never talks to anything outside your Mac in v0.1.0"). The
   project is at v0.6.0 and the server is in the cloud.

5. **Mac-local tooling** (SwiftBar plugin, `restore-from-backup.sh`'s liveness check, `rotate-
   token.sh`'s base-URL default) still assumes Brain runs on `localhost:3000` on the developer's
   Mac, which is no longer true.

---

## Feature-by-Feature Audit

---

## 1. `BRAIN_LAN_TOKEN` / `BRAIN_LAN_RATE_LIMIT` — env var naming

- **Files:**
  - `src/lib/auth/bearer.ts:92` (`process.env.BRAIN_LAN_TOKEN`)
  - `src/lib/auth/bearer.ts:126,133,134,142,165` (all uses)
  - `src/instrumentation.ts:44` (boot log message)
  - `src/lib/lan/info.ts:37,55` (rotateLanToken writes it)
  - `.env.example:15,17,26,31` (section header + comments)
  - `proxy.ts:20` (comment)
  - Multiple `*.test.ts` files
- **Purpose (legacy intent):** Named `_LAN_` because in v0.5.0, the token only authenticated
  requests coming from devices on the same LAN as the Mac. The "LAN" qualifier distinguished this
  bearer path from a hypothetical internet-exposed path, which didn't exist yet.
- **Cloud-era status:** Mis-named
- **Why:** The token now authenticates requests arriving from the public internet via the Cloudflare
  tunnel. The "LAN" qualification is factually wrong and will mislead anyone who reads it into
  thinking the token is only good on Wi-Fi. The *function* (bearer auth for programmatic
  clients — APK, extension) is unchanged and correct. Only the name needs to change.
  Plain language: Imagine the lock on your front door is labelled "house key (only works in the
  garage)." It works fine — the label is just wrong, and it would confuse anyone reading it.
- **Cloud-era redesign:** Rename `BRAIN_LAN_TOKEN` → `BRAIN_API_TOKEN` and `BRAIN_LAN_RATE_LIMIT`
  → `BRAIN_API_RATE_LIMIT` across all files. Update `.env` on Hetzner. Existing APKs / the
  extension use the token value, not the variable name — the rename is purely server-side and
  requires only a server restart. **Effort: S. Risk: low** (one sed pass + server restart +
  `.env` update on Hetzner; `.env` is not in git).

---

## 2. `src/lib/lan/` directory and module

- **Files:**
  - `src/lib/lan/info.ts` — `getLanIpv4()`, `rotateLanToken()`, `buildSetupUri()`
  - `src/lib/lan/setup-uri.ts` — `parseSetupUri()`
  - `src/lib/lan/info.test.ts`, `src/lib/lan/setup-uri.test.ts`
- **Purpose (legacy intent):** Grouped the LAN-specific helpers: getting the Mac's IP address
  (for the pre-pivot IP-in-QR scheme), building the setup URI, parsing it in the APK.
- **Cloud-era status:** Mis-named (directory); partially dead (`getLanIpv4`)
- **Why:** `rotateLanToken()` and `buildSetupUri()` are still actively used. `parseSetupUri()`
  is still used by `setup-apk/page.tsx`. But `getLanIpv4()` (line 21) has zero callers anywhere
  in the codebase — confirmed by grep. The directory name `lan/` implies "local area network
  plumbing" which is misleading in a cloud context.
- **Cloud-era redesign:** (a) Delete `getLanIpv4()` from `info.ts` — zero callers, safe
  deletion. (b) Rename directory `src/lib/lan/` → `src/lib/pairing/` to reflect what the module
  actually does today: token lifecycle + setup URI encoding for device pairing. Update imports.
  **Effort: S. Risk: low.**

---

## 3. `/settings/lan-info` page and route

- **Files:**
  - `src/app/settings/lan-info/page.tsx` — the page itself
  - `src/app/settings/lan-info/actions-client.tsx`
  - `src/app/api/settings/lan-info/route.ts`
  - `src/app/settings/page.tsx:52` — Settings page links to `/settings/lan-info`
  - `src/components/share-handler.tsx:183` — alert message
  - `src/instrumentation.ts:44` — boot log
- **Purpose (legacy intent):** "LAN Info" was the v0.5.0 name for the page that showed the
  Mac's LAN IP and the QR code pairing the APK. The IP was the payload; the name made sense.
- **Cloud-era status:** Mis-named
- **Why:** The page's own `<h1>` tag already says "Device pairing" (line 67). The page
  description (lines 69-73) correctly says "via the Cloudflare tunnel." The IP is gone. The
  name `lan-info` only appears in the URL and directory — the *visible* UI has already been
  updated, but the URL and internal identifier haven't. The share-handler alert at line 183 says
  "Open Settings → LAN Info on your Mac" — doubly wrong (wrong page name AND wrong device).
- **Cloud-era redesign:** Rename route to `/settings/device-pairing`. Add a redirect from
  `/settings/lan-info` → `/settings/device-pairing` for any bookmarked links. Update the
  share-handler alert to "Open Settings → Device Pairing and scan the QR." Update the
  instrumentation.ts boot log message. **Effort: M. Risk: low** (Next.js folder rename + one
  redirect + 3 string changes).

---

## 4. `src/lib/client/reachability.ts` — `describeVerdict()` strings

- **Files:**
  - `src/lib/client/reachability.ts:134` — "Is your Mac awake and on the same Wi-Fi?"
  - `src/lib/client/reachability.ts:136` — "Check Wi-Fi and that Brain is running."
  - `src/lib/client/reachability.ts:138` — "re-scan the QR from Brain settings."
- **Purpose (legacy intent):** Human-readable explanations of why the reachability probe
  failed. Written when the server was the user's Mac on a LAN — "asleep Mac" and "same Wi-Fi"
  were the two most common failure causes.
- **Cloud-era status:** Mis-described
- **Why:** `probeReachability()` itself is perfectly correct — it probes `brain.arunp.in` using
  `fetch` with AbortController, returns a clean tagged-union result. Only the human-readable
  strings in `describeVerdict()` are wrong. "Is your Mac awake" and "same Wi-Fi" are never
  true failure causes anymore. Actual cloud-era causes: mobile data is off, Hetzner is down,
  Cloudflare is degraded, the token was rotated. Plain language: If your phone can't reach the
  server and you see "Is your Mac awake?" you'll waste time checking the wrong thing.
- **Cloud-era redesign:** Update `describeVerdict()` strings:
  - `timeout` → "Brain server did not respond in 2 s. Check your internet connection and try again."
  - `network` → "Cannot reach Brain server (${v.message}). Check your internet connection."
  - `unauthorized` → "Brain rejected the token. It may have been rotated — re-scan the QR in Settings → Device Pairing."
  - `forbidden` → "Brain rejected the request origin. Try re-pairing."
  **Effort: S. Risk: low.**

---

## 5. `public/offline.html` — user-visible copy

- **Files:**
  - `public/offline.html:129-131` — "your Mac is asleep, off the same Wi-Fi, or the Brain dev server is not running."
  - `public/offline.html:147-149` — "wake the Mac, confirm `npm run dev:lan` is running, and that both devices are on the same network."
  - `public/offline.html:219` — "Wake the Mac and retry."
  - `public/offline.html:221` — "Check Wi-Fi and retry."
- **Purpose (legacy intent):** The offline fallback page — served from `public/` as a static
  asset inside the APK — showed the user a helpful checklist when the server (the Mac) was
  unreachable. The Mac was the server. Wi-Fi was the network. `npm run dev:lan` was the start
  command.
- **Cloud-era status:** Mis-described
- **Why:** The probe logic in the inline script is correct and cloud-compatible (it probes
  `window.location.origin/api/health`, which resolves to `brain.arunp.in`). Only the text is
  wrong. A user who hits this page after a Hetzner outage or mobile data dropout and reads "wake
  the Mac, confirm `npm run dev:lan`" has no path forward. The restart instruction refers to a
  script that doesn't exist in the cloud setup.
- **Cloud-era redesign:** Update the three copy strings:
  - Main paragraph → "The app could not connect to your Brain server. This may be a temporary network issue — tap Retry."
  - Meta paragraph → "If retry keeps failing: check your internet connection and try again in a few minutes. If it keeps failing, the Brain server may be temporarily down."
  - Timeout string → "Brain did not respond in 2 s. Check your internet connection and retry."
  - Network error string → "Cannot reach Brain. Check your internet connection and retry."
  **Effort: S. Risk: low.**

---

## 6. `src/app/setup-apk/page.tsx` — verify-error copy

- **Files:**
  - `src/app/setup-apk/page.tsx:125-127`
- **Purpose (legacy intent):** When the QR-scan setup step probed the tunnel URL and got an
  error, the page showed instructions for debugging: check the Mac, check Brain is running,
  check the cloudflared menu-bar icon.
- **Cloud-era status:** Mis-described
- **Why:** Line 126-127 reads: "Check that the Mac is awake, Brain is running, and the
  Cloudflare tunnel is up (look for `cloudflared` in the menu bar)." The Mac no longer runs
  Brain. There is no `cloudflared` icon in the menu bar for the cloud setup. The user would
  look for a menu bar item that doesn't exist. The correct advice is to check internet
  connectivity and retry.
- **Cloud-era redesign:** Replace with: "Could not reach Brain. Check your internet connection,
  wait a moment, and retry. If this keeps failing, the server may be temporarily down."
  **Effort: S. Risk: low.**

---

## 7. `src/components/share-handler.tsx` — unpaired alert string

- **Files:**
  - `src/components/share-handler.tsx:183`
- **Purpose (legacy intent):** When the user shared something before the APK was paired (no
  `brain_token` in Preferences), an alert directed them to "Open Settings → LAN Info on your
  Mac and scan the QR."
- **Cloud-era status:** Mis-described (doubly — wrong page name and "your Mac" is wrong context)
- **Why:** The page is now called "Device Pairing" visually, not "LAN Info." The server is on
  Hetzner, not the Mac. The QR is displayed in the web UI at `brain.arunp.in/settings/lan-info`
  (soon `/settings/device-pairing`), which the user would access in a browser, not "on your Mac."
- **Cloud-era redesign:** Change to: "Brain is not paired yet. Open Settings → Device Pairing in
  a browser and scan the QR." **Effort: S. Risk: low.**

---

## 8. Outbox retry backoff — `src/lib/outbox/backoff.ts`

- **Files:**
  - `src/lib/outbox/backoff.ts:10-18` — the retry schedule comment
  - `src/lib/outbox/backoff.ts:25-26` — `BASE_DELAY_MS = 10_000`, `MAX_DELAY_MS = 3_600_000`
  - `src/lib/outbox/triggers.ts:34` — `FOREGROUND_TICK_MS = 30_000`
- **Purpose (legacy intent):** The outbox was designed for LAN flaps: the Mac going to sleep,
  waking up, Wi-Fi dropping. LAN flaps are typically short (seconds to minutes), so a starting
  retry of 10s, doubling up to 1h, made sense.
- **Cloud-era status:** Mis-tuned
- **Why:** Hetzner's uptime profile is fundamentally different from a Mac's. Hetzner goes down
  for minutes at most, not 8-hour sleep cycles. The more common failure mode is **mobile data
  dropout**: tunnel + train, lift, dense building. These are 5–60 second gaps followed by
  immediate reconnect. The current 30s foreground tick and 10s base delay are fine for mobile
  gaps. However, the 1h MAX_DELAY is tuned for "the Mac is off all night" — a scenario that
  no longer applies. If a row gets to MAX_DELAY on Hetzner, it's effectively stuck for an hour
  even though the server came back minutes after the outage started. More importantly, the
  `@capacitor/network` trigger already resets `next_retry_at` to `now` when the device goes
  online (`triggers.ts:80-84`) — so mobile reconnect is already fast-pathed. The backoff
  parameters are "fine but over-engineered for the LAN case" rather than "broken."
- **Cloud-era redesign:** Lower `MAX_DELAY_MS` from 3,600,000 (1h) to 300,000 (5 min). Rationale:
  in cloud mode, any outage lasting >5 min is an incident worth manual intervention; the user
  should see a "stuck" row sooner. The network-reconnect trigger already provides the fast path
  for mobile gaps. Keep `BASE_DELAY_MS` at 10s and `FOREGROUND_TICK_MS` at 30s — both are
  well-suited to cell-network gaps. **Effort: S. Risk: low.**

---

## 9. Enrichment worker `isAlive()` probe — `src/lib/queue/enrichment-worker.ts`

- **Files:**
  - `src/lib/queue/enrichment-worker.ts:37` — `const OLLAMA_DOWN_BACKOFF_MS = 30_000`
  - `src/lib/queue/enrichment-worker.ts:94-98` — `getEnrichProvider().isAlive()` check
- **Purpose (legacy intent):** Before each work cycle, the worker probes the enrichment provider
  (Ollama). If Ollama is down (which happened frequently when the Mac had power-nap issues or the
  user hadn't run `ollama serve`), the worker backs off 30s rather than hammering a dead endpoint.
- **Cloud-era status:** Still-needed-as-is (logic), Mis-named (variable)
- **Why:** The `isAlive()` probe is still correct — Anthropic API can be rate-limited or
  temporarily unreachable. However, `OLLAMA_DOWN_BACKOFF_MS` is a misleading name when the
  configured provider is Anthropic. The variable name is internal and doesn't affect user-visible
  behavior, but it will confuse the next developer who looks at this file.
  Note: the handover docs (05_Retrospective §3 incident table) flag a known bug at line 96
  where `isAlive()` loops for 45 minutes on start-up and self-resolves at process restart. That
  is a separate bug from the naming issue and is more urgent. The naming fix can piggyback on
  that bug fix.
- **Cloud-era redesign:** Rename `OLLAMA_DOWN_BACKOFF_MS` → `LLM_PROVIDER_DOWN_BACKOFF_MS`.
  Long-term: fix the 45-min `isAlive()` loop bug (tracked in retrospective §3). **Effort: S.
  Risk: low.**

---

## 10. `OLLAMA_OFFLINE` error code and "ollama serve" user-facing strings

- **Files:**
  - `src/app/api/ask/route.ts:14,69,75` — error code `OLLAMA_OFFLINE`, message includes "start Ollama with `ollama serve`"
  - `src/app/api/search/route.ts:40,42` — same error code, same string
  - `src/app/search/page.tsx:42,91-98` — variable `ollamaDown`, UI text "Ollama offline", instruction `ollama serve`
- **Purpose (legacy intent):** When the embed or Ask provider was unreachable, the UI showed
  "Ollama offline" and the instruction to run `ollama serve`. On a Mac with local Ollama, this
  was the correct and actionable advice.
- **Cloud-era status:** Mis-described (user-visible strings); Mis-named (error code)
- **Why:** The Hetzner instance uses `LLM_ASK_PROVIDER=anthropic` and `EMBED_PROVIDER=gemini`.
  Neither is Ollama. The error code `OLLAMA_OFFLINE` is preserved for client/test back-compat
  (noted in a code comment at ask/route.ts:69), but the user-facing message "start Ollama with
  `ollama serve`" is wrong on Hetzner — there is no Ollama to start. If the Anthropic API goes
  down (rate limit, network), the user sees "Ollama offline" and tries to start a program that
  isn't installed. The search page variable `ollamaDown` is an internal name; the UI label
  "Ollama offline" and "ollama serve" instruction are what the user sees.
  Note: the error code `OLLAMA_OFFLINE` is sent over SSE to the APK. If the APK renders this
  string, it too would show the wrong provider name. Search the extension source for any
  rendering of this code if the extension is in use.
- **Cloud-era redesign:** (a) Update user-facing strings to "AI provider unreachable — check
  server status." (b) Leave the SSE error code `OLLAMA_OFFLINE` for now (back-compat), add a
  TODO to rename it to `LLM_PROVIDER_OFFLINE` in Phase E. (c) Rename `ollamaDown` → `providerDown`
  in search page. **Effort: S. Risk: low** (strings only; no protocol change).

---

## 11. `src/lib/config/tunnel.ts` — file/constant naming

- **Files:**
  - `src/lib/config/tunnel.ts` (entire file, 9 lines)
  - `src/components/share-handler.tsx:38` (import)
  - `src/app/inbox/inbox-client.tsx:25` (import)
  - `src/app/settings/lan-info/page.tsx:24` (import)
  - (12+ other import sites)
- **Purpose (legacy intent):** Named `tunnel.ts` because when v0.5.0 shipped, the notable
  architectural fact was "we're using a Cloudflare tunnel instead of a direct LAN address."
  The constant was called `BRAIN_TUNNEL_URL` for the same reason.
- **Cloud-era status:** Mis-named (partially)
- **Why:** The constant's name `BRAIN_TUNNEL_URL` is still accurate — it is the URL of the
  Cloudflare named tunnel. However, the file comment at line 5-7 says "forwards to
  `localhost:3000` over an outbound QUIC connection" — that `localhost:3000` is on Hetzner now,
  not on the Mac. The comment also says "Post-pivot (2026-05-11), all Capacitor APK and Chrome
  extension traffic reaches the Mac-local Next.js server" — wrong, it reaches the Hetzner server.
  The constant itself and the file name are acceptable; only the comment needs updating.
- **Cloud-era redesign:** Update the file comment to say "reaches the Hetzner-hosted Next.js
  server." Consider renaming the constant to `BRAIN_SERVER_URL` in a future phase when the
  Cloudflare tunnel is understood to be an implementation detail, not the identity of the URL.
  **Effort: S. Risk: low** (comment only for now).

---

## 12. SwiftBar health plugin — `scripts/swiftbar/brain-health.30s.sh`

- **Files:**
  - `scripts/swiftbar/brain-health.30s.sh:29` — `NEXTJS_URL="http://127.0.0.1:3000"`
  - `scripts/swiftbar/brain-health.30s.sh:30` — `CLOUDFLARED_READY_URL="http://127.0.0.1:20241/ready"`
  - `scripts/swiftbar/brain-health.30s.sh:33` — `OLLAMA_URL="http://127.0.0.1:11434"`
  - `scripts/swiftbar/install.sh`
- **Purpose (legacy intent):** Showed a Mac menu-bar icon (green/red) reflecting the health of
  the local stack: Next.js on `:3000`, cloudflared daemon on `:20241`, Ollama on `:11434`, and
  tunnel end-to-end. Useful when all four layers ran on the developer's Mac.
- **Cloud-era status:** Redundant (Mac-local layer probes), Mis-tuned (Ollama check for a
  Gemini/Anthropic setup)
- **Why:** As of 2026-05-19, the Mac's `brain.service` is stopped (pid 32761 killed in D-14).
  `127.0.0.1:3000` and `127.0.0.1:20241` are both closed on the Mac. The plugin would show
  🔴 Brain DOWN every 30 seconds on the Mac's menu bar, even when `brain.arunp.in` is healthy.
  The only probe that still works is `TUNNEL_HEALTH_URL="https://brain.arunp.in/api/health"`.
  Ollama on the Mac may or may not be running; on Hetzner, Ollama is not used at all.
- **Cloud-era redesign:** Rewrite the plugin to probe only `brain.arunp.in/api/health`.
  Remove the `NEXTJS_URL`, `CLOUDFLARED_READY_URL`, and `OLLAMA_URL` probes. The plugin's
  only job in cloud mode is "is brain.arunp.in answering?" — one HTTP call, one icon color.
  Optionally add a probe for `brain-staging.arunp.in` as a secondary. **Effort: S. Risk: low.**

---

## 13. `scripts/rotate-token.sh` — `BASE_URL` default

- **Files:**
  - `scripts/rotate-token.sh:23` — `BASE_URL="${BRAIN_BASE_URL:-http://127.0.0.1:3000}"`
  - `scripts/rotate-token.sh:26-29` — error message references `${BASE_URL}/unlock`
  - `scripts/rotate-token.sh:4` — comment "The operator runs `npm run dev:lan`"
- **Purpose (legacy intent):** Rotate the bearer token from a shell prompt, defaulting to the
  Mac's local dev server address.
- **Cloud-era status:** Mis-tuned (default URL wrong), Mis-described (comment references dead npm script)
- **Why:** The default `http://127.0.0.1:3000` is the Mac dev server, which is stopped. Running
  this script without setting `BRAIN_BASE_URL` will silently fail (connection refused). The
  comment also references `npm run dev:lan`, which doesn't exist as a script in `package.json`
  (the repo only has `dev` and `start`, both binding to `127.0.0.1`). A user reading the script
  would set a session cookie on the Mac's server, which is dead.
- **Cloud-era redesign:** Change the default to `BASE_URL="${BRAIN_BASE_URL:-https://brain.arunp.in}"`.
  The operator would need to set `BRAIN_SESSION_COOKIE` from a browser session on
  `brain.arunp.in`. Update the comment to match. Note: token rotation via the web UI at
  `/settings/lan-info` (or the renamed `/settings/device-pairing`) is a simpler path for most
  users — the script is only needed when the web UI is inaccessible. **Effort: S. Risk: low.**

---

## 14. `scripts/restore-from-backup.sh` — server liveness check

- **Files:**
  - `scripts/restore-from-backup.sh:4-5` — "Refuses to run if the Next.js dev/prod server is listening on 127.0.0.1:3000"
  - `scripts/restore-from-backup.sh:39` — `nc -z 127.0.0.1 3000` check
  - `scripts/restore-from-backup.sh:64` — "npm run dev" restart instruction
- **Purpose (legacy intent):** Before overwriting `data/brain.sqlite`, the script checked that
  the local Next.js server was not running (to avoid corrupting the WAL). It used `nc` to probe
  `localhost:3000`.
- **Cloud-era status:** Mis-tuned (the local check is now always false on Hetzner; the script
  should check the Hetzner-local process instead)
- **Why:** On Hetzner, `brain.service` runs on `127.0.0.1:3000` (per Architecture §2 topology
  diagram). The `nc` check for `127.0.0.1:3000` would correctly detect the running process on
  Hetzner — so the logic accidentally still works in the Hetzner context. However, if someone
  runs this script on the Mac (which still has the repo), `nc` will return "not listening" even
  though the Mac has nothing to stop, creating a false-green. The restart instruction at line 64
  says "npm run dev" which starts a local server, not a Hetzner service. After a restore on
  Hetzner, the correct restart is `sudo systemctl restart brain`.
- **Cloud-era redesign:** The script should be flagged as "Hetzner-only tool" and the restart
  instruction changed to `sudo systemctl restart brain`. The `nc` check remains useful on Hetzner.
  Add a warning header: "This script is intended to run on the Hetzner server, not on the
  developer Mac." **Effort: S. Risk: low.**

---

## 15. `src/app/settings/page.tsx` — stale "Mode" and "App version" display

- **Files:**
  - `src/app/settings/page.tsx:130-131` — Mode: "Local-only (pre-v1.0.0)"
  - `src/components/sidebar.tsx:56` — `"v0.1.0 · local"`
  - `src/app/setup/page.tsx:25` — "AI Brain never talks to anything outside your Mac in v0.1.0."
- **Purpose (legacy intent):** Early versions were strictly local — no cloud, no external APIs,
  no tunnel. The "local-only" and "v0.1.0" labels communicated the privacy guarantee: nothing
  leaves the Mac.
- **Cloud-era status:** Mis-described (all three are user-visible)
- **Why:** At v0.6.0, AI Brain talks to `api.anthropic.com`, `generativelanguage.googleapis.com`,
  and Cloudflare. The "local-only" claim is false. The sidebar showing `v0.1.0 · local` is both
  the wrong version number and the wrong architecture description. The setup page's claim "never
  talks to anything outside your Mac" is a factual error that could mislead users about their
  privacy posture.
- **Cloud-era redesign:**
  - Settings page Mode → "Cloud (brain.arunp.in / Hetzner)"
  - Sidebar footer → "v0.6.0 · cloud" (or read from `package.json`)
  - Setup page → Remove or update the v0.1.0 copy; PIN-hash guarantee is still true, the
    "nothing leaves your Mac" claim is not.
  **Effort: S. Risk: low.**

---

## 16. `capacitor.config.ts` — comment stale but config correct

- **Files:**
  - `capacitor.config.ts:8-10` — comment says "loads the live Next.js server on the Mac"
  - `capacitor.config.ts:43` — `server.url: "https://brain.arunp.in"` (correct)
- **Purpose (legacy intent):** The APK is a thin WebView that loads the Next.js server. The
  comment described the Mac as the server host.
- **Cloud-era status:** Still-needed-as-is (config values); Mis-described (comment only)
- **Why:** The actual config values — `server.url: "https://brain.arunp.in"`,
  `androidScheme: "https"`, `CapacitorHttp: { enabled: false }` — are all correct for the
  cloud setup and correctly documented in the comment from line 13 onward. Only the opening
  sentence (line 9: "loads the live Next.js server on the Mac") is wrong. Everything else in
  the comment accurately describes the post-pivot rationale. No code change needed.
- **Cloud-era redesign:** Change line 9 from "on the Mac" to "on Hetzner". **Effort: S.
  Risk: low** (comment only).

---

## 17. Local backup only — `src/lib/backup.ts` (B2 not wired)

- **Files:**
  - `src/lib/backup.ts` — entire file
  - `Handover_docs_19_05_2026_15_21_CUTOVER_DONE/01_Architecture.md:29` — `B2 -.->|nightly TBD| B2`
  - `06_Handover_Current_Status.md:54` — B2: "keys configured, script not wired"
- **Purpose (legacy intent):** On the Mac, `data/backups/` was local-only and implicitly safe
  (the Mac's own disk). 6-hour snapshots + 28 retention count made sense for a Mac with a
  stable filesystem.
- **Cloud-era status:** Needs-rebuild (incomplete for cloud — local-only backup is
  insufficient for a cloud server)
- **Why:** `src/lib/backup.ts` writes snapshots to `/opt/brain/data/backups/` on Hetzner. Those
  snapshots are on the Hetzner disk. If Hetzner is lost (disk failure, billing lapse, datacenter
  event), the local backups are lost with it. The Architecture diagram explicitly marks B2 as
  "script not yet wired" — this is the one feature flagged as a blocker (D-18) in the handover.
  Plain language: Right now Brain has backups, but they're stored in the same building as the
  original. If the building burns down, you lose everything. B2 is the off-site copy.
- **Cloud-era redesign:** Wire the B2 backup as planned in the Architecture §2 and Current Status
  §3 item 5. Specifics from prior design: `sqlite3 .backup → gzip → gpg → rclone to B2`. This
  replaces/supplements the local snapshots; it does not change `backup.ts` itself.
  The local snapshots in `backup.ts` can stay (they're fast and useful for same-day restore).
  B2 upload is an additional step after each local snapshot. **Effort: M. Risk: med** (new
  external dependency; needs B2 API key management and gpg key backup).

---

## Summary Table

| # | Feature | Status | Files | Effort | Risk |
|---|---------|--------|-------|--------|------|
| 1 | `BRAIN_LAN_TOKEN` env var name | Mis-named | `bearer.ts`, `.env.example`, `instrumentation.ts`, `lan/info.ts` | S | low |
| 2 | `src/lib/lan/` directory + `getLanIpv4()` | Mis-named + dead code | `lan/info.ts` | S | low |
| 3 | `/settings/lan-info` route + share-handler alert | Mis-named + Mis-described | `settings/lan-info/page.tsx`, `share-handler.tsx:183`, `settings/page.tsx:52` | M | low |
| 4 | `reachability.ts` `describeVerdict()` strings | Mis-described | `reachability.ts:134,136,138` | S | low |
| 5 | `public/offline.html` Mac/Wi-Fi/dev copy | Mis-described | `offline.html:130,147,219,221` | S | low |
| 6 | `setup-apk/page.tsx` verify-error message | Mis-described | `setup-apk/page.tsx:126` | S | low |
| 7 | `share-handler.tsx` unpaired alert | Mis-described | `share-handler.tsx:183` | S | low |
| 8 | Outbox `MAX_DELAY_MS = 1h` | Mis-tuned | `backoff.ts:26` | S | low |
| 9 | `OLLAMA_DOWN_BACKOFF_MS` variable name | Mis-named | `enrichment-worker.ts:37` | S | low |
| 10 | `OLLAMA_OFFLINE` error code + "ollama serve" strings | Mis-described + Mis-named | `ask/route.ts:75,77`, `search/route.ts:42`, `search/page.tsx:94,98` | S | low |
| 11 | `tunnel.ts` comment | Mis-described | `config/tunnel.ts:5-7` | S | low |
| 12 | SwiftBar local-stack health plugin | Redundant (localhost probes dead) | `scripts/swiftbar/brain-health.30s.sh` | S | low |
| 13 | `rotate-token.sh` default URL | Mis-tuned | `rotate-token.sh:23` | S | low |
| 14 | `restore-from-backup.sh` restart instruction | Mis-described | `restore-from-backup.sh:64` | S | low |
| 15 | Settings/sidebar stale version + mode strings | Mis-described | `settings/page.tsx:131`, `sidebar.tsx:56`, `setup/page.tsx:25` | S | low |
| 16 | `capacitor.config.ts` comment | Mis-described | `capacitor.config.ts:9` | S | low |
| 17 | Local-only backup (no B2 off-site) | Needs-rebuild | `backup.ts`, D-18 backlog | M | med |
