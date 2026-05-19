---
date: 2026-05-19
author: Claude (Sonnet 4.6)
scope: "web surfaces + server middleware + Chrome extension + architectural rebuild questions"
companion_to: legacy-feature-audit.md
project_version: v0.6.0
revision: v2.1 (re-ranked 2026-05-19; security-theatre items demoted; "one thing this week" surfaced)
---

# Legacy Feature Audit v2 — AI Brain v0.6.0

**Purpose:** Close blind spots in the v1 audit. Scope covers three surfaces
v1 systematically skipped: web app pages (Ask, Inbox, Search, Setup, Unlock,
Settings tabs, components), server security/middleware (CSP, CORS, cookie
flags, rate-limit tuning, error leakage, `/api/health` exposure), and the
Chrome extension. Adds five architectural decision sections (A–E) and a
"What v1 missed" critique.

---

## What v1 Missed

| v1 claim | Correction from v2 |
|----------|-------------------|
| Settings page only has Mode/version strings to fix | Settings page also shows `App version: 0.3.0` (not `0.3.0`, and not `0.6.0`), and the Backup section shows `data/backups/` with no cloud-offsite caveat. |
| setup-apk/page.tsx partially covered | v1 cited lines 125-127 (verify-error string). Correct. But v1 missed that the same file also contains a boot log message at `instrumentation.ts:44` that says "open /settings/lan-info" — a third instance of the stale URL. |
| share-handler.tsx covered | The share-handler alert at line 183 was correctly identified. But the component also imports `BRAIN_TUNNEL_URL` at line 38 — correctly used, not stale. No false positive. |
| Chrome extension — entirely absent | v1 audit scope explicitly excluded it. v2 covers it end-to-end. |
| CORS policy not examined | v1 did not audit CORS at all. v2 finds it is governed by Origin validation in `bearer.ts` — not a wildcard CORS header, but the proxy only checks Origin on bearer paths. Cookie-authed routes have no Origin restriction at all. |
| CSP/HSTS/security headers — not mentioned | Zero HTTP security headers set. v2 flags this as a security finding. |
| Session cookie `Secure` flag — not mentioned | `Secure` is explicitly omitted from `SESSION_COOKIE_OPTIONS`. v2 flags this. |
| `src/app/layout.tsx` metadata | v1 missed `description: "Local-first personal knowledge app"` in the HTML `<meta>` tag — a public-facing privacy claim that is now factually wrong. |
| Rate limit adequacy | v1 noted the default 30/min but called it "mis-tuned" only for naming. v2 probes whether 30/min is correct for a cloud endpoint with multiple devices. |
| No robots.txt | v1 did not check. v2 confirms absence and flags it. |
| `/debug/quota` public discoverability | v1 missed this debug page entirely. v2 flags it. |
| Backup `data/backups/` shown in Settings UI | v1 covered backup at the code level (Item 17). v2 notes the Settings UI displays the local path with no cloud-offsite warning to the user. |

---

## Executive Summary — v2 Additions

| Metric | Count |
|--------|-------|
| New features audited (v2) | 16 |
| Security findings (HIGH) | 3 → **1 after re-rank** |
| Security findings (MED) | 4 → **1 after re-rank** |
| Security findings (LOW) | 2 (unchanged) |
| Mis-described (user-visible string lies) | 7 |
| Mis-named (code/identifier) | 3 |
| Missing (no such feature exists) | 2 |
| Architectural decision items (A–E) | 5 → **4 after merge of A+C** |

---

## Re-ranking by Exploit-Risk × Effort (v2.1)

The original v2 ratings were inflated. This section re-classifies each finding by
**actual exploit risk in the current topology** (not theoretical risk if Cloudflare
disappeared) × **effort to fix**. Items demoted from "security" to "hygiene" are not
deleted — they're just labelled honestly.

### Demotions (security-theatre cleared)

| Original tag | Item | Why demoted |
|--------------|------|-------------|
| HIGH security (S2) | Session cookie missing `Secure` flag | Cloudflare enforces HTTPS edge. Residual exploit needs an attacker who can both intercept plaintext HTTP **and** has already bypassed Cloudflare. Real classification: **HIGH hygiene, LOW exploit**. |
| HIGH security (S3) | No CSP / X-Frame-Options / HSTS | X-Frame-Options + nosniff + HSTS are LOW-effort and meaningfully close real frame/clickjack vectors → keep as MED. CSP is M-L effort with measurable UI-breakage risk → demote to **separate "hardening backlog" item**. |
| MED security (S4) | Rate limit shared across all devices | Not an exploit. A multi-device user hits 429s from their own activity. Real classification: **MED UX bug**. |
| MED security (S5) | CORS — implicit, not explicit | SameSite=Lax + single-user threat model + no other origins exist → **DROPPED** as security-theatre. Re-evaluate if multi-user is added. |
| MED security (S8) | No `robots.txt` | Doesn't stop scanners. Crawlers can't read auth-gated pages anyway. **DROPPED** as security finding. Keep as 2-line hygiene fix. |
| HIGH security (W4) | Setup page "never talks outside your Mac" claim | Real but mislabelled. It's a **truthfulness bug** in user-facing copy, not a security vulnerability. The exploit path ("user makes wrong privacy decision based on false claim") is real but not a CVE-class issue. Re-tag: **MED truthfulness**. |
| HIGH severity (D) | Privacy claims that no longer hold | Same as W4. Truthfulness, not security. |

### True risk × effort matrix (post-demotion)

| Item | Real risk | Real effort | Score | Tier |
|------|-----------|-------------|-------|------|
| W4 / D — Setup page false privacy claim ("never talks outside your Mac") | MED-truthfulness | S (5-line copy change) | 9 | **DO THIS WEEK** |
| S2 — Add `Secure` cookie flag | LOW exploit, HIGH hygiene | S (1 line + `process.env.NODE_ENV` guard) | 8 | T1 |
| S3a — X-Frame-Options + nosniff + HSTS headers | MED exploit (clickjack on token-display page) | S (one `headers()` block) | 8 | T1 |
| S11 — Add `cf-connecting-ip` to bearer-rejection logs | LOW exploit, MED ops value | S (one log line edit) | 6 | T1 |
| W7 / W8 / W6 — Stale "v0.1.0 · local" / "Local-first" / mode strings | LOW (truthfulness; one-time confusion) | S (string changes) | 6 | T2 |
| W5 — Unlock recovery instruction wrong | LOW (no harm; bad advice) | S | 5 | T2 |
| E2/E3/E4 — Extension "your Mac" copy (4 strings) | LOW | S | 5 | T2 |
| Item E — `BRAIN_LAN_TOKEN` rename | LOW | S (2 commits, not 3 phases) | 5 | T2 |
| S7 — Raw `err.message` in API responses | LOW (auth-gated, single user) | S | 4 | T3 |
| S9 — PDF magic-byte validation | LOW | S | 4 | T3 |
| S3b — CSP nonce wiring | LOW (no known XSS vector) | M-L (real UI risk) | 3 | T3 / backlog |
| Item A+C — Per-device tokens | LOW (single-user today) | M-L | 3 | T3 / backlog |
| S12 — `/debug/quota` page gating | LOW | S | 3 | T3 |
| S10 — PDF size limit configurable | LOW | S | 2 | backlog |
| S4 — Raise rate limit to 120/min | UX, not exploit | S | 2 | backlog |
| robots.txt | hygiene | S | 1 | backlog |

(Score = exploit-risk weight × effort multiplier; rough heuristic, not a formula.)

### Tiering

- **DO THIS WEEK** — single highest-leverage item; non-technical user can verify outcome.
- **T1** — bundle into one focused PR after the "this week" item lands. ~2–3 hours total.
- **T2** — one cleanup PR. Pure copy/rename/log changes. ~half a day.
- **T3 / backlog** — schedule when there's actual time, or after multi-device/multi-user is on the table.

### The single "do this one thing this week" recommendation

> **Fix the false privacy claim at `src/app/setup/page.tsx:25`.**
>
> Replace: *"AI Brain never talks to anything outside your Mac in v0.1.0."*
>
> With: *"Your library is stored on your Hetzner server. AI enrichment uses Anthropic and Google APIs — content is sent to those services for processing."*

**Why this one:**
- It is the **only finding in the entire audit that is delivered to a user at the highest-trust moment** (PIN setup).
- It is a **pure string change** — no migration, no deploy risk, no CSP-style UI breakage risk.
- It is **honest about the rest of v0.6.0** in 2 sentences. Nothing else in the audit matters until the app stops lying about what it does.
- Effort: 10 minutes to write, 5 minutes to deploy, 0 minutes to verify (re-open setup page, read the new string).

Everything else can wait one more week. This cannot.

---

## Web App Surfaces

---

### W1. `src/app/ask/` — Ask page and streaming UI

- **Files:**
  - `src/app/ask/page.tsx`
  - `src/app/ask/ask-client.tsx`
- **Purpose (legacy):** RAG chat with SSE streaming. Always relied on cookie auth.
- **Cloud-era status:** Clean — no LAN/Mac copy found.
- **Analysis:** `ask-client.tsx` is clean: no "Mac", "LAN", "wifi" strings. The error
  surface at lines 78-82 renders `errCode` and `errMsg` from the SSE stream — so
  `OLLAMA_OFFLINE` and "start Ollama with `ollama serve`" would surface here at
  runtime if the Anthropic API goes down. The page itself has no user-visible
  LAN/Mac copy. The page comment at `ask/page.tsx:8` says "session cookie check ...
  the middleware handles redirect for unauth'd users (see src/proxy.ts)" — proxy.ts
  is the actual filename (it is not `middleware.ts`), so the comment is accurate.
- **Cloud-era redesign:** No page-level string changes needed. The `OLLAMA_OFFLINE`
  / "ollama serve" message that appears in the Ask error box is tracked in v1 Item 10.
- **Effort: None (page clean). Risk: n/a.**

---

### W2. `src/app/inbox/inbox-client.tsx` — Inbox / outbox state surface

- **Files:**
  - `src/app/inbox/inbox-client.tsx`
- **Purpose (legacy):** Displays outbox entries (queued, stuck, synced) with
  sync-now and retry actions.
- **Cloud-era status:** Clean operationally; empty-state copy is fine.
- **Analysis:** No "Mac", "Wi-Fi", or LAN copy in user-visible strings. The empty
  state at line 290 reads "Outbox is empty. Shared items will appear here while
  syncing." — correct for cloud era. `getBearerToken()` at line 54 reads from
  `Preferences.get({ key: "brain_token" })` on native platform — the same key the
  APK share-handler writes. This is correct and cloud-compatible.
- **Finding:** The `onSyncNow` / `onRetryRow` handlers silently do nothing if
  `tokenRef.current` is null (line 153, 175). On a web browser (non-Capacitor)
  there is never a bearer token in Preferences, so clicking "Sync now" from a
  desktop browser is a no-op with no feedback. This is a UX bug — not a LAN/cloud
  naming issue, but worth noting for a future pass.
- **Effort: None for cloud-era naming. S for the token-null silent-failure UX bug. Risk: low.**

---

### W3. `src/app/search/page.tsx` — Search page

- **Files:**
  - `src/app/search/page.tsx` (lines 42, 91-99)
  - `src/app/api/search/route.ts` (lines 38-46)
- **Purpose (legacy):** Search with FTS / semantic / hybrid modes. Variable
  `ollamaDown` and visible label "Ollama offline" / instruction `ollama serve`.
- **Cloud-era status:** Mis-described (user-visible). Already captured in v1 Item 10.
- **Additional v2 finding:** The search API route at `api/search/route.ts:53` leaks
  the raw exception message to the caller: `{ error: err.message }`. If `searchUnified`
  throws an error that contains an internal path, DB schema detail, or environment
  string, that leaks to the authenticated browser. Severity: LOW (cookie-gated;
  single-user app).
- **Effort: S (error message hardening). Risk: low.**

---

### W4. `src/app/setup/page.tsx` — First-run setup page

- **Files:**
  - `src/app/setup/page.tsx:25`
- **Purpose (legacy):** First-run PIN setup. Copy says "AI Brain never talks to
  anything outside your Mac in v0.1.0."
- **Cloud-era status:** Mis-described. Already captured in v1 Item 15.
- **Additional v2 finding:** This is also a **privacy claim** that is now factually
  false (item D below). The user is told this at the moment they set their PIN —
  the most trust-critical moment in the onboarding flow. Anthropic and Gemini APIs
  receive user content at v0.6.0. The string as written is not just stale branding;
  it is a false privacy assurance. Severity: HIGH (privacy misrepresentation).
- **Effort: S. Risk: low (string change only).**

---

### W5. `src/app/unlock/page.tsx` — PIN unlock page

- **Files:**
  - `src/app/unlock/page.tsx:26`
- **Purpose (legacy):** PIN entry gate. Footer says: "Forgot it? Delete
  `data/brain.sqlite` and restart — a new PIN will be set on first run."
- **Cloud-era status:** Mis-described.
- **Why:** `data/brain.sqlite` is on the Hetzner server at
  `/opt/brain/data/brain.sqlite`, not on the user's device. The instruction implies
  the user can delete a file from their phone, which they cannot. The correct
  cloud-era recovery path is: SSH into Hetzner, `sudo systemctl stop brain`,
  `rm /opt/brain/data/brain.sqlite`, `sudo systemctl start brain`. This is an
  operator-only operation, not a user self-service one. The user-visible text should
  say "Contact the Brain admin to reset your PIN." For a single-user setup, this
  could say "SSH into your server and remove the database file to reset."
- **Effort: S. Risk: low.**

---

### W6. `src/app/settings/page.tsx` — Settings page additional tabs

- **Files:**
  - `src/app/settings/page.tsx:129` — "App version: 0.3.0" (not 0.6.0)
  - `src/app/settings/page.tsx:131` — "Mode: Local-only (pre-v1.0.0)"
  - `src/app/settings/page.tsx:94` — Backup location: `data/backups/`
- **Purpose (legacy):** Displays app version and mode. v1 caught the Mode and
  version strings but missed that the version hardcodes `0.3.0`, not the actual
  `0.6.0` shipping version.
- **Cloud-era status:** Mis-described (all three).
- **Additional v2 finding:** The Backup section shows `data/backups/` with no
  indication that this is a server-side path. A user reading this on their phone
  would think their data is backed up locally on the phone. The section needs
  a cloud-aware label: "Server-side snapshots at `/opt/brain/data/backups/`. No
  off-site backup is currently configured (B2 upload pending)." This sets honest
  expectations about backup resilience.
- **Effort: S. Risk: low.**

---

### W7. `src/app/layout.tsx` — Root layout metadata

- **Files:**
  - `src/app/layout.tsx:25`
- **Purpose (legacy):** Sets the HTML `<meta name="description">` to
  "Local-first personal knowledge app".
- **Cloud-era status:** Mis-described (public-facing metadata claim).
- **Why:** This description is served in the HTML `<head>` to any browser that
  fetches `brain.arunp.in`. It is also indexed by search engines and shown in
  social link previews. "Local-first" is architecturally inaccurate at v0.6.0
  (the server is Hetzner; LLM calls go to Anthropic/Gemini). Proposed:
  "Your personal knowledge base, hosted on Hetzner."
- **Effort: S. Risk: low.**

---

### W8. `src/components/sidebar.tsx` — Version footer

- **Files:**
  - `src/components/sidebar.tsx:56`
- **Purpose (legacy):** Footer in the desktop sidebar shows `v0.1.0 · local`.
- **Cloud-era status:** Mis-described. Already captured in v1 Item 15.
- **Additional v2 note:** No new finding — confirmed the string is still present.

---

### W9. `src/app/api/ask/route.ts` — "ollama serve" in SSE error

- **Files:**
  - `src/app/api/ask/route.ts:76-80`
- **Purpose (legacy):** When `getAskProvider().isAlive()` returns false, emits SSE
  error with code `OLLAMA_OFFLINE` and message including "start Ollama with
  `ollama serve`".
- **Cloud-era status:** Mis-described. Already captured in v1 Item 10.
- **Additional v2 note — security angle:** The SSE endpoint
  (`/api/ask`) is cookie-gated (line 40-45), so this message is only visible to
  authenticated users. No information leakage to unauthenticated callers.

---

## Server Middleware / Security / API Surface

---

### S1. `src/proxy.ts` — Auth proxy (not middleware.ts)

- **Files:** `src/proxy.ts` (entire file)
- **Cloud-era status:** Structurally sound; naming vestigial.
- **Finding:** There is no `src/middleware.ts`. The proxy is in `src/proxy.ts` and
  is invoked through Next.js's instrumentation or routing layer. The comment at
  line 2 says "Next.js 16 proxy (formerly middleware)." This is not a security
  gap — the proxy runs correctly — but the filename `proxy.ts` is non-standard
  and would confuse any developer who expects `middleware.ts`.
- **Effort: S (rename). Risk: low.**

---

### S2. Session cookie missing `Secure` flag — **SECURITY FINDING: HIGH**

- **Files:**
  - `src/lib/auth.ts:113-119`
- **Finding:** `SESSION_COOKIE_OPTIONS` (line 113) omits the `Secure` attribute
  with the comment "Secure left off — v0.1.0 runs on http://localhost. v0.5.0
  adds an option for LAN TLS." The server now serves exclusively over HTTPS at
  `brain.arunp.in` via Cloudflare tunnel. Without `Secure`, the session cookie
  would be sent on any HTTP request to `brain.arunp.in`. In practice, Cloudflare
  enforces HTTPS-only at the edge, so a plain-HTTP request to `brain.arunp.in`
  is redirected to HTTPS before it reaches the server. However, the defense
  is Cloudflare-dependent: if the tunnel config is changed or a staging domain
  without HSTS is used, the cookie becomes transmittable in plaintext.
  **Severity: HIGH.** The fix is a one-liner; the risk of not fixing it is session
  hijacking via any future HTTP-exposed surface.
- **Cloud-era redesign:** Add `secure: true` to `SESSION_COOKIE_OPTIONS`. The
  dev server behind the tunnel already serves HTTPS. If local `http://localhost`
  dev is needed, use `secure: process.env.NODE_ENV === "production"`.
  **Effort: S. Risk: low.**

---

### S3. No HTTP security headers — **SECURITY FINDING: HIGH**

- **Files:** `next.config.ts` (no `headers()` function), `src/app/layout.tsx`
  (no security meta tags).
- **Finding:** Zero security headers are configured:
  - No `Content-Security-Policy` — any XSS vector in the app could exfiltrate
    the session cookie or bearer token. The inline `themeScript` at
    `layout.tsx:36` uses `dangerouslySetInnerHTML`, which would be blocked by
    a strict CSP `script-src 'self'` unless nonce-based. This makes CSP harder
    but not impossible to add.
  - No `X-Frame-Options` or `frame-ancestors` CSP directive — `brain.arunp.in`
    can be framed by any page, enabling clickjacking on the PIN unlock or
    token copy UI.
  - No `X-Content-Type-Options: nosniff` — browsers may MIME-sniff responses
    from `/api/library/export.zip` or `/api/items/*/export.md` as scripts if
    served in a framed context.
  - No `Strict-Transport-Security` (HSTS) — browser-side HTTP→HTTPS upgrade is
    Cloudflare-dependent only.
  **Severity: HIGH** for the missing CSP + X-Frame-Options on a page that shows
  bearer tokens in plaintext (the `/settings/lan-info` page renders the raw
  64-char token in a `<dd>` element).
- **Cloud-era redesign:** Add a `headers()` function in `next.config.ts`:

  ```ts
  headers: async () => [{
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains" },
    ],
  }]
  ```

  CSP requires more work due to the inline `themeScript`. Use a nonce-based
  approach or move the theme script to a static JS file to allow `script-src 'self'`.
  **Effort: M (headers are S; CSP nonce wiring is M). Risk: low.**

---

### S4. Rate limit tuned for single LAN client — **SECURITY FINDING: MED**

- **Files:**
  - `src/lib/auth/bearer.ts:46` — `DEFAULT_RATE_LIMIT = 30`
  - `src/lib/auth/bearer.ts:44` — window = 60 seconds
  - `.env.example:26` — `BRAIN_LAN_RATE_LIMIT=30`
- **Finding:** 30 requests per 60 seconds was correct for a single LAN user with
  one APK and one extension occasionally sharing URLs. The rate limiter is keyed on
  `sha256(token).slice(0,16)` — effectively a single key for the entire system,
  since there is only one token. In cloud mode, ALL clients (APK, extension,
  future second device) share this same 30 req/min budget. A user who batch-shares
  URLs (e.g., a quick sequence of 5 URLs from the extension while also sharing from
  the APK) could hit the limit. The limit is configurable via `BRAIN_LAN_RATE_LIMIT`,
  but the default in `.env.example` is still tuned for single-LAN-device.
  More importantly: the rate limiter is in-process (a `Map` in `bearer.ts:192`).
  On Hetzner, if `brain.service` restarts (e.g., after a deploy), the in-process
  state resets. A burst attack could send up to 30 requests per restart event.
  This is acceptable for a single-user system but worth documenting.
  **Severity: MED** (no brute-force risk due to 256-bit token; real risk is
  multi-device budget exhaustion that causes false 429s).
- **Cloud-era redesign:** Raise the default to 120/min (two devices × 60 req/min
  each). Document the budget-per-device math in `.env.example`. Long term: move
  to a per-device token model (see item C below), at which point each device gets
  its own bucket. **Effort: S. Risk: low.**

---

### S5. CORS policy — implicit, not explicit — **SECURITY FINDING: MED**

- **Files:**
  - `src/lib/auth/bearer.ts:265-276` — `validateOrigin()`
  - `src/app/api/capture/url/route.ts:43` — calls `validateOrigin()`
  - `src/app/api/capture/pdf/route.ts:57` — calls `validateOrigin()`
  - `src/app/api/capture/note/route.ts` — (same pattern, by inference)
  - `src/app/api/ask/route.ts` — does NOT call `validateOrigin()` (cookie path only)
  - `src/app/api/search/route.ts` — does NOT call `validateOrigin()`
  - `src/app/api/threads/*.ts` — no `validateOrigin()` found
- **Finding:** There are no `Access-Control-Allow-Origin` response headers anywhere
  in the codebase. Origin restriction is enforced only on bearer-authed capture
  paths via `validateOrigin()`. Cookie-authed routes (`/api/ask`, `/api/search`,
  `/api/threads/*`, `/api/items/*`, `/api/library/export.zip`) have NO origin
  restriction — they rely entirely on the `SameSite=Lax` cookie attribute and
  the browser's same-origin policy to prevent cross-origin reads.
  `SameSite=Lax` does protect against CSRF for state-mutating POST/PUT requests
  triggered by top-level navigation, but does NOT protect against:
  - Cross-origin reads from `fetch()` in a framed or popup window that already
    has the session cookie (same-origin cookie → different-origin fetch).
  - Attacks from subdomains of `arunp.in` (if any exist) that share the cookie.
  For a single-user personal app this risk is low, but the defense is Cloudflare
  + SameSite only — no explicit `Access-Control-Allow-Origin` response.
  **Severity: MED** (mitigated by SameSite=Lax and the single-user threat model;
  would be HIGH for a multi-user app).
- **Cloud-era redesign:** Add explicit `Access-Control-Allow-Origin` headers on
  API routes, defaulting to same-origin only. Cookie-authed endpoints should not
  need cross-origin access. **Effort: S. Risk: low.**

---

### S6. `api/health` endpoint — information disclosure — **SECURITY FINDING: LOW**

- **Files:**
  - `src/app/api/health/route.ts:26-30`
- **Finding:** `GET /api/health` is in `BEARER_ROUTES` — it requires a valid
  bearer token (the proxy enforces this). The response body is `{ ok: true, ts: Date.now() }`.
  No version, hostname, env vars, or DB info is leaked. This is well-designed.
  However, the file comment at line 12-15 reveals that a 200 from this endpoint
  means "Brain is up AND paired correctly" while a 401 means "token mismatch (server
  token rotated, likely)." This distinction is intentional and useful for debugging.
  No significant information disclosure risk.
  **Severity: LOW (informational).** No change needed.

---

### S7. Error responses — raw exception messages in API routes — **SECURITY FINDING: LOW**

- **Files:**
  - `src/app/api/search/route.ts:53` — `{ error: err.message }`
  - `src/app/api/threads/route.ts:44` — `{ error: err.message }`
  - `src/app/api/threads/[id]/route.ts:43` — `{ error: err.message }`
  - `src/app/api/threads/[id]/messages/route.ts:59` — `{ error: err.message }`
  - `src/app/api/capture/url/route.ts:119` — `message: err.message` in response
  - `src/app/api/capture/pdf/route.ts:117` — `{ error: message }` (from err.message)
- **Finding:** Several cookie-gated API routes return raw `err.message` from
  caught exceptions. In Next.js production mode, unhandled errors produce a generic
  "Internal Server Error" page without stack traces, but caught exceptions that are
  forwarded verbatim to the JSON response can reveal internal details (SQLite
  constraint text, file paths, schema names). These are all behind cookie auth
  (single-user), so the blast radius is limited — but the pattern is bad hygiene.
  No stack traces are returned (only `err.message`), which is the right call already.
  **Severity: LOW.** Could be improved by normalizing errors to generic messages
  in production. **Effort: S. Risk: low.**

---

### S8. No `robots.txt` — **SECURITY FINDING: MED**

- **Files:** None — `robots.txt` does not exist in `public/`.
- **Finding:** `brain.arunp.in` has no `robots.txt`. Without it, web crawlers
  (Googlebot, Bing, etc.) will attempt to index all routes including
  `/settings/lan-info`, `/unlock`, `/setup`, and any authenticated pages. While
  search engines cannot actually GET authenticated content (they lack the session
  cookie), they will nonetheless:
  - Index URL paths discovered via `<a>` links in public responses (the 302
    redirect to `/unlock` is a public response that leaks the redirect target).
  - Log and store the domain structure.
  - Potentially trigger rate-limits by crawling authenticated endpoints.
  More critically: the `brain.arunp.in` domain is now publicly resolvable. Any
  internet scanner (Shodan, Censys, Project Discovery) can discover the Brain
  server and probe its API surface. A `robots.txt` with `Disallow: /` does not
  prevent this but is the standard signal.
  **Severity: MED** (real risk is automated scanner discovery of the token-rotation
  endpoint and the settings pages).
- **Cloud-era redesign:** Add `public/robots.txt`:
  ```
  User-agent: *
  Disallow: /
  ```
  This signals "do not index" to well-behaved crawlers. Does not stop malicious
  scanners, but reduces accidental indexing. **Effort: S. Risk: low.**

---

### S9. PDF upload — MIME type not validated

- **Files:**
  - `src/app/api/capture/pdf/route.ts:77-79`
  - `src/app/capture-actions.ts:64-79`
- **Finding:** The PDF upload endpoint at `/api/capture/pdf` checks that a `File`
  object is present and validates size (≤50 MB via `PDF_MAX_BYTES`). It does NOT
  validate the MIME type of the uploaded file. Any file type that passes the size
  check is accepted and passed to `capturePdfAction` → `extractPdf`. The PDF
  extractor (`src/lib/capture/pdf.ts`) presumably attempts to parse the bytes as
  a PDF, so a non-PDF file would cause an extraction error, not a security issue
  per se. However, a large binary file (49.9 MB) could be uploaded repeatedly to
  consume server disk space without being a valid PDF. The SHA256 check at line
  87-101 detects transmission corruption but does not filter file type.
  **Severity: LOW** (auth-gated; single user; extraction will fail anyway).
- **Cloud-era redesign:** Add a magic-byte check for PDF header (`%PDF-`) before
  calling the extractor. **Effort: S. Risk: low.**

---

### S10. PDF file size limit — 50 MB default for cloud

- **Files:**
  - `src/app/capture-actions.ts:64` — `PDF_MAX_BYTES = 50 * 1024 * 1024`
- **Finding:** The 50 MB limit is appropriate for a cloud server where disk space
  is managed. However, it is hardcoded — there is no env var to override it. On
  Hetzner (CX11, 20 GB disk assumed), a user who uploads many large PDFs could
  fill the disk faster than the 50 MB guard implies. The backup scheduler writes
  to the same disk. For now this is a tuning note, not a security finding.
- **Effort: S (make configurable). Risk: low.**

---

### S11. No IP-based access log or audit trail

- **Files:** `src/lib/errors/sink.ts` (implied), `src/proxy.ts`
- **Finding:** The proxy logs bearer auth rejections with `logError()` at
  `proxy.ts:70` and `proxy.ts:80`. These log entries include `path` and `method`
  but NOT the client IP address. In a cloud context where the endpoint is
  publicly reachable, any 401/403 spray from a malicious scanner will produce
  log entries with no source IP — making it impossible to identify or block
  an attacker. Cloudflare logs the real client IP, but that data is not accessible
  without a paid Cloudflare plan or the Cloudflare Logpush feature.
  **Finding level: Operational gap, not a security vulnerability.** A single-user
  app with a strong 256-bit token is not meaningfully at risk from brute-force.
  But having zero IP information in the server logs means a support/debug scenario
  ("is someone hammering my API?") has no answer from the logs alone.
- **Cloud-era redesign:** Log `req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")` in bearer rejection log entries. Cloudflare sets `cf-connecting-ip` on all requests through the tunnel. **Effort: S. Risk: low.**

---

### S12. `/debug/quota` page — publicly visible route

- **Files:**
  - `src/app/debug/quota/page.tsx`
  - `src/app/debug/quota/quota-probe.tsx`
- **Finding:** `/debug/quota` is a cookie-gated page (the proxy redirects
  unauthenticated requests to `/unlock`). No sensitive information is exposed
  to unauthenticated callers. However, the URL path itself is publicly visible
  (the proxy redirect response leaks the path). This is an internal measurement
  page that shipped in the offline-mode spike phase — it was never intended as a
  permanent production route. Its presence in the app router means it is always
  deployed.
- **Cloud-era redesign:** Remove or gate behind a `BRAIN_DEBUG_ENABLED` env flag
  in a future cleanup pass. Not urgent. **Effort: S. Risk: low.**

---

## Chrome Extension Audit

---

### E1. Extension description — "local" claim in manifest

- **Files:**
  - `extension/manifest.json:5`
- **Finding:** The manifest `description` field reads: "Save pages to your local
  AI Brain library over a Cloudflare tunnel." The phrase "your local AI Brain
  library" is vestigially local-era language. The library is on Hetzner, not local.
  This description appears in the Chrome Web Store listing and the
  `chrome://extensions` page.
- **Cloud-era redesign:** Change to "Save pages to your AI Brain library via
  Cloudflare." **Effort: S. Risk: low.**

---

### E2. `extension/src/options.html` — three Mac/LAN strings

- **Files:**
  - `extension/src/options.html:88`
  - `extension/src/options.html:106`
- **Finding (line 88):** Header paragraph reads "Configure the extension to talk to
  your local Brain over Cloudflare." The "local Brain" phrasing is wrong — Brain
  is on Hetzner. Should read: "Configure the extension to connect to your Brain
  server."
- **Finding (line 106):** Help section reads "On your Mac, open
  `https://brain.arunp.in/settings/lan-info` (or run `scripts/rotate-token.sh`
  from the project root)." Two errors: (1) "On your Mac" — the server is on
  Hetzner; the user accesses the settings page from any browser, not specifically
  their Mac; (2) the URL includes `lan-info` (stale, should be `device-pairing`
  once v1 rename is done); (3) `scripts/rotate-token.sh` is a server-side script
  — an extension user cannot run it.
- **Cloud-era redesign:**
  - Line 88: "Configure the extension to connect to your Brain server."
  - Line 106: "Open `https://brain.arunp.in/settings/device-pairing` in a browser
    and copy the 64-character hex token."
  **Effort: S. Risk: low.**

---

### E3. `extension/src/options.ts` — two Mac/LAN strings

- **Files:**
  - `extension/src/options.ts:44`
  - `extension/src/options.ts:47`
- **Finding (line 44):** "This token doesn't work. Open Brain settings on your
  Mac, generate a fresh one, and paste it here." — "your Mac" is wrong.
- **Finding (line 47):** "Can't reach Brain. Is your Mac awake and the tunnel
  running?" — "your Mac" is wrong; Mac is no longer the server.
- **Cloud-era redesign:**
  - Line 44: "This token doesn't work. Open Brain settings in a browser, generate
    a fresh one, and paste it here."
  - Line 47: "Can't reach Brain. Check your internet connection; the server may
    be temporarily down."
  **Effort: S. Risk: low.**

---

### E4. `extension/src/background.ts:69` and `src/popup.ts:77` — Mac strings

- **Files:**
  - `extension/src/background.ts:69`
  - `extension/src/popup.ts:77`
- **Finding:** Both files have the string "Can't reach Brain. Is your Mac awake
  and the tunnel running?" in their error handlers for network failures.
- **Cloud-era redesign:** Replace with: "Can't reach Brain. Check your internet
  connection or try again later." **Effort: S. Risk: low.**

---

### E5. Extension `host_permissions` — hardcoded to `brain.arunp.in`

- **Files:**
  - `extension/manifest.json:22-24`
- **Finding:** `host_permissions: ["https://brain.arunp.in/*"]` is hardcoded.
  The `BRAIN_BASE_URL` constant in `capture.ts:10` is also hardcoded to
  `"https://brain.arunp.in"`. There is no way for an extension user to configure
  a different server URL at runtime — the URL is baked into both the manifest and
  the JS bundle. The options page renders the URL read-only (`<code>` element,
  not `<input>`).
- **Cloud-era status:** This is intentional for the current single-user setup
  (the Brain URL is stable and owned). However, it means:
  1. The extension cannot be used with a staging environment without rebuilding.
  2. If the domain ever changes, the extension must be rebuilt and redistributed.
  3. The extension is effectively permanently bound to `brain.arunp.in` — any
     future multi-user or white-label scenario is blocked without an architectural
     change.
- **Effort: M to make URL configurable. Risk: low** (current behavior intentional).

---

### E6. Extension token storage — `chrome.storage.local` vs `sync`

- **Files:**
  - `extension/src/capture.ts:32-44`
- **Finding:** The token is stored in `chrome.storage.local` (not `sync`). This
  is the correct choice: `local` data stays on the device, while `sync` would
  push the bearer token to Google's servers via Chrome Sync, which is a credential
  leak. The implementation is secure here.
  The double-submit guard uses `chrome.storage.session` (line 55), which clears
  on browser close — also correct.
- **Cloud-era status:** Clean. No change needed.

---

### E7. Token rotation breaks all paired devices — no graceful deprecation

- **Files:**
  - `src/app/api/settings/rotate-token/route.ts:9`
- **Finding:** The rotate-token endpoint comments explicitly: "After rotation
  every paired APK and extension must re-pair via QR scan (for APK) or
  options-page paste (for extension)." There is no mechanism for a device to
  detect a rotation (other than receiving a 401) and prompt the user with a
  friendly "your token was rotated, please re-pair" flow. The extension shows
  the generic "Your token no longer works. Open Options..." message (background.ts:62).
  This is functional but abrupt. With multiple devices, a rotation silently breaks
  every device simultaneously. See item C below for the architectural redesign.

---

## Architectural Rebuild Questions (A–E)

---

### A. Authentication Redesign

**Context:** The current auth model uses a single shared `BRAIN_LAN_TOKEN` (256-bit
hex) as the bearer secret for all programmatic clients (APK, Chrome extension).
A PIN-derived session cookie handles the web UI (browser + APK WebView). In cloud
mode, multiple devices share one token. There is no concept of a per-device identity.

**Option 1 — Per-device tokens (recommended for near-term)**

Each device generates a unique token at first pairing. The server stores a table
`device_tokens(id, label, fingerprint, created_at, last_used_at, revoked_at)`.
The QR code encodes a single-use enrollment URL that the server exchanges for a
device-specific token on first scan.

- Pros: individual revocation without affecting other devices; audit log per device;
  rotation of one device doesn't break all devices.
- Cons: requires a DB migration and new API surface; QR flow becomes two-step
  (scan → server issues token → APK stores it).
- Effort: M-L.

**Option 2 — PIN + short-lived session tokens for APK (recommended long-term)**

APK users authenticate with the PIN (same as web UI). The server issues a
short-lived (24h) HMAC session token, which the APK stores in Capacitor Preferences.
Refresh tokens extend the session. No separate bearer token needed.

- Pros: single auth mechanism for all clients; consistent PIN-based security model.
- Cons: requires implementing refresh token flow; APK must handle 401 by prompting
  PIN re-entry.
- Effort: L.

**Option 3 — OAuth / email magic link**

Issue magic-link tokens to a registered email address. One auth system for web,
APK, and extension.

- Pros: standard; supports genuine multi-user; no PIN to forget.
- Cons: requires email delivery infrastructure; overengineered for a single-user
  personal app; privacy concern (email address now required).
- Effort: XL.

**Recommendation:** Option 1 (per-device tokens) in the next phase; Option 2
as a v1.0.0 goal. Option 3 only if second-user access is needed.

---

### B. Observability / Monitoring Redesign

**Context:** The SwiftBar plugin is dead (v1 Item 12). There is no current
monitoring for `brain.arunp.in` health, Anthropic/Gemini spend, or error rates.
The only telemetry is `data/errors.jsonl` on Hetzner.

**Minimum viable monitoring for a non-technical single-user operator:**

1. **Uptime monitoring:** UptimeRobot (free tier, 5-min checks) against
   `https://brain.arunp.in/api/health`. Alert via email/Telegram on downtime.
   Cost: free. Setup: 5 min.

2. **Spend alerting:** Anthropic has a spend notification feature in the
   Anthropic Console (email alerts at threshold). Gemini has a budget alert
   in Google Cloud. The `BRAIN_ANTHROPIC_MONTHLY_CAP` env var is set at $5/mo
   (per memory); this is enforced by the enrichment-batch-cron's spend tracking,
   but there is no external notification if the cap is exceeded.

3. **Error log surfacing:** The `data/errors.jsonl` file grows indefinitely.
   A weekly cron on Hetzner that tails the last 24h of `errors.jsonl` and emails
   a summary (count by type) is the minimum viable ops view.

4. **Disk space:** A Hetzner server alert (available in the Robot panel) on
   disk usage >75% would prevent silent failures from PDF storage growth.

**SwiftBar replacement:** For the developer's Mac, a simple curl-based healthcheck
that pings `brain.arunp.in/api/health` with the bearer token every 60 seconds,
using Argos (macOS) or a launchd plist. The SwiftBar script skeleton already exists
at `scripts/swiftbar/` and can be trimmed to one HTTP call.

---

### C. Multi-Device / Device Management Gap

**Current state:** There is one `BRAIN_LAN_TOKEN` shared by all devices. There
is no server-side record of which devices exist. A "device" is anyone who holds
a copy of the token.

**Gap analysis:**

| Capability | Current | Gap |
|-----------|---------|-----|
| List paired devices | Not possible | Full gap |
| Revoke one device | Not possible — rotation revokes all | Full gap |
| See last-used time per device | Not possible | Full gap |
| Friendly device label ("Pixel 7 Pro") | Not possible | Full gap |
| Detect compromised device | Not possible | Full gap |
| Token rotation without breaking all | Not possible | Full gap |

**Concrete gap:** The Settings → Device Pairing page (currently `/settings/lan-info`)
shows a QR code but does not list currently-paired devices. The user has no way to
know how many devices are paired or when they last connected.

**Minimal v0.7.x fix (per-device token table):**
- Add `device_tokens` table: `(id TEXT PK, label TEXT, fingerprint TEXT, created_at INT, last_used_at INT, revoked_at INT)`.
- On QR scan, the APK hits a one-time enrollment endpoint that issues a device
  token and inserts a row.
- The proxy updates `last_used_at` on every authenticated request.
- The Device Pairing page lists all active devices with revoke buttons.

This is the same as Option 1 in section A, viewed from the management angle.

---

### D. Privacy / Security Claims That No Longer Hold

**Confirmed false user-visible claims:**

| Location | String | Why it's false | Severity |
|----------|--------|---------------|----------|
| `src/app/setup/page.tsx:25` | "AI Brain never talks to anything outside your Mac in v0.1.0." | Brain talks to Anthropic API, Gemini API, and Cloudflare. | HIGH |
| `src/app/layout.tsx:25` | `description: "Local-first personal knowledge app"` | Server is Hetzner; LLM calls go to external APIs. | MED |
| `src/app/settings/page.tsx:131` | "Mode: Local-only (pre-v1.0.0)" | Cloud mode since v0.6.0. | HIGH |
| `src/components/sidebar.tsx:56` | `"v0.1.0 · local"` | Wrong version + wrong architecture label. | MED |
| `extension/manifest.json:5` | "Save pages to your **local** AI Brain library" | Library is on Hetzner. | LOW |
| `extension/src/options.html:88` | "talk to your **local** Brain over Cloudflare" | Brain is on Hetzner. | LOW |

**Most critical:** The `setup/page.tsx:25` string. It appears during first-run
PIN setup — the moment the user decides whether to trust the application with
their data. Telling a new user "AI Brain never talks to anything outside your Mac"
at v0.6.0 is a privacy misrepresentation, not just a naming convention lag.

**Recommended replacement for `setup/page.tsx:25`:**
> "The PIN is hashed on the server. Your library is stored on your Hetzner
> server. AI enrichment uses Anthropic and Google APIs — content is sent to
> those services for processing."

This is the minimum honest disclosure for a cloud app that sends user content
to third-party LLMs.

---

### E. Back-Compat / Sequencing for `BRAIN_LAN_TOKEN` Rename

**Problem:** Renaming `BRAIN_LAN_TOKEN` → `BRAIN_API_TOKEN` requires:
1. The `.env` file on Hetzner to be updated (a server-side change).
2. All code references to be updated atomically with the deploy.
3. The boot-time `ensureLanToken()` function to be renamed.
4. `instrumentation.ts:44`'s boot log message to be updated.
5. Tests that reference `BRAIN_LAN_TOKEN` to be updated.

**Safe rollout sequence for a live server:**

**Phase E-1 (dual-read, N weeks):**
- Add `loadApiToken()` that reads `BRAIN_API_TOKEN ?? BRAIN_LAN_TOKEN`.
- Log a deprecation warning if `BRAIN_LAN_TOKEN` is present and `BRAIN_API_TOKEN`
  is absent: `[boot] BRAIN_LAN_TOKEN is deprecated; rename to BRAIN_API_TOKEN in .env`.
- No behavior change; no server restart required for paired devices.

**Phase E-2 (rename code, update Hetzner `.env`):**
- Update `.env` on Hetzner: add `BRAIN_API_TOKEN=<same value>`, leave
  `BRAIN_LAN_TOKEN` present for one more cycle.
- Deploy code that reads `BRAIN_API_TOKEN` as primary, `BRAIN_LAN_TOKEN` as fallback.
- Paired APKs and the extension are NOT affected — they hold the token value,
  not the variable name. Server restart is the only required action.

**Phase E-3 (drop fallback):**
- Remove `BRAIN_LAN_TOKEN` fallback from code.
- Remove `BRAIN_LAN_TOKEN` line from Hetzner `.env`.
- Update `.env.example`, all test fixtures, and `rotate-token.sh`.

**Other vars to rename in the same sweep:**
- `BRAIN_LAN_RATE_LIMIT` → `BRAIN_API_RATE_LIMIT`
- `OLLAMA_DOWN_BACKOFF_MS` → `LLM_PROVIDER_DOWN_BACKOFF_MS`
- Log event types `lan.bearer.*` → `api.bearer.*` (long-term; not urgent since
  `errors.jsonl` is not user-facing)

**Risk of breaking live devices:** Zero, if E-1 precedes E-2 by at least one
server restart (so the deprecation warning is logged before the old name is
dropped). Paired devices hold the token value, not the env var name. The only
breaking change would be if `.env` on Hetzner was updated to `BRAIN_API_TOKEN`
and the code still tried to read `BRAIN_LAN_TOKEN` (the inverse of the above
sequence). The dual-read phase prevents this.

---

## Summary Table — v2 New Findings

| # | Feature / Finding | Status | Severity | Effort | Risk |
|---|-------------------|--------|----------|--------|------|
| W1 | Ask page | Clean | — | None | — |
| W2 | Inbox client / token-null silent failure | UX bug | — | S | low |
| W3 | Search page error leakage | LOW security | LOW | S | low |
| W4 | Setup page privacy claim ("never talks outside Mac") | Privacy misrepresentation | HIGH | S | low |
| W5 | Unlock page "delete brain.sqlite" recovery instruction | Mis-described | MED | S | low |
| W6 | Settings version `0.3.0`, backup path, local-only mode | Mis-described | MED | S | low |
| W7 | Layout metadata "Local-first personal knowledge app" | Mis-described | MED | S | low |
| W8 | Sidebar `v0.1.0 · local` | Mis-described (also in v1) | — | S | low |
| S1 | No `middleware.ts` — proxy is in `proxy.ts` | Naming | — | S | low |
| S2 | Session cookie missing `Secure` flag | Security | HIGH | S | low |
| S3 | No CSP, X-Frame-Options, HSTS, X-Content-Type-Options | Security | HIGH | M | low |
| S4 | Rate limit 30/min shared across all devices | Mis-tuned | MED | S | low |
| S5 | CORS — no explicit headers, relies on SameSite+Cloudflare | Security | MED | S | low |
| S6 | `/api/health` response — no info leak | Clean | LOW | None | — |
| S7 | Raw `err.message` in API error responses | Security | LOW | S | low |
| S8 | No `robots.txt` | Security | MED | S | low |
| S9 | PDF upload no MIME validation | Security | LOW | S | low |
| S10 | PDF 50 MB limit hardcoded | Mis-tuned | — | S | low |
| S11 | No IP in bearer rejection logs | Observability gap | — | S | low |
| S12 | `/debug/quota` always deployed | Cleanup | — | S | low |
| E1 | Extension manifest "local AI Brain library" | Mis-described | LOW | S | low |
| E2 | options.html "your local Brain" + "On your Mac" + stale URL | Mis-described | LOW | S | low |
| E3 | options.ts "your Mac" × 2 | Mis-described | LOW | S | low |
| E4 | background.ts + popup.ts "Mac awake" | Mis-described | LOW | S | low |
| E5 | Extension URL hardcoded, not configurable | Architecture limit | — | M | low |
| E6 | Token in `chrome.storage.local` (NOT sync) | Clean / correct | — | None | — |
| E7 | Token rotation breaks all devices simultaneously | Architecture gap | MED | M | low |
| A | Auth redesign — per-device tokens | Decision | — | M-L | med |
| B | Observability redesign — UptimeRobot + spend alerts | Decision | — | S | low |
| C | Device management — no revoke/list | Architecture gap | MED | M | med |
| D | Privacy claims that no longer hold | Privacy/legal | HIGH | S | low |
| E | `BRAIN_LAN_TOKEN` rename sequencing | Decision | — | S | low |

---

## Self-Critique of v2 Audit

1. **Did not read `src/lib/errors/sink.ts` directly** — confirmed the logError
   function exists by inference from imports, but did not verify whether it
   writes to `errors.jsonl` or a different sink in v0.6.0. The IP logging
   recommendation (S11) assumes the existing sink supports arbitrary fields,
   which is likely but not verified.

2. **Thread routes not read** — `src/app/api/threads/*.ts` were listed but not
   read. The error leakage finding (S7) includes them by grep pattern but the
   full auth model for thread routes was not verified. It is possible thread
   routes have additional guards.

3. **`src/app/items/[id]/page.tsx` not read** — individual item pages were not
   audited. They are likely cookie-gated standard pages but were not verified.

4. **`src/app/capture/page.tsx` and `pdf-dropzone.tsx` not read** — the web
   capture form was not audited for LAN/Mac copy. The API-layer was covered.

5. **`public/sw.js` not read** — the service worker was not audited. It is
   listed as unauthenticated in the proxy allow-list (`proxy.ts:48`). It may
   contain LAN/Mac references in its fetch-handler error messages.

6. **Extension `dist/` not audited** — the built extension in `extension/dist/`
   was not read. The build may contain stale strings that differ from the source
   if the source was updated after the last build. The dist is what Chrome
   actually runs.

7. **`src/lib/auth/api-version.ts` not read** — the `checkClientApiVersion`
   function called in capture routes was not audited. It may enforce version
   matching between APK and server, which is relevant to the back-compat
   sequencing in item E.
