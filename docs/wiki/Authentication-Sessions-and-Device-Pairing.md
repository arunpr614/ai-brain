# Authentication, Sessions, and Device Pairing

Purpose: Document the single-owner trust model and browser/API/device authentication flows.
Audience: AI agents, security reviewers, and client developers.
Verified against: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-10 for deployed session/pairing boundaries.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Confidence:** High for current-main code/tests; runtime confidence is limited to dated session/pairing evidence.

| Capability | Status | Boundary |
|---|---|---|
| PIN setup/unlock/session | Implemented | Single owner; no roles/SSO |
| Bearer API authentication | Implemented | One shared token across API clients |
| Short-lived pairing code | Implemented | One-use code exchanges for shared bearer token |
| Per-device revocation/audit | Planned/absent | Rotation invalidates every paired client |

The PIN hash uses PBKDF2-HMAC-SHA256. Browser sessions use a signed HttpOnly/SameSite cookie. The bearer credential is the primary API-client control. Client version is validated when the header is present. Origin may be absent for server-to-server callers, and Chrome-extension origins are broadly accepted. Pairing codes are short-lived and stored as HMAC-derived state; the raw code is shown once.

Important limitations: four-character minimum PIN, no discovered unlock-attempt limiter, in-process rate limits, and one global bearer identity. Do not publish real tokens, pairing codes, endpoints, or environment details.

Primary files: `src/proxy.ts`, `src/lib/auth/`, auth actions/pages, `src/lib/device-pairing/`, pairing APIs/clients and tests.

## User journey and states

Browser first use is `/setup` → choose PIN → signed session → Library; later access redirects through `/unlock` and preserves the complete requested path/query. Android pairing is Settings → generate expiring code → enter on `/setup-apk` → exchange/store shared token → reachability result → Library.

| State | Behavior |
|---|---|
| Empty input / no code | Form remains incomplete and performs no exchange |
| Loading | Setup, unlock or pairing exchange presents pending state without exposing credentials |
| No PIN | Setup is public; protected pages redirect |
| Locked/expired session | Unlock preserves the intended deep link |
| Pairing pending | Code shown once with expiry; raw credential remains hidden |
| Success | Session cookie or client-local shared bearer permits its route family |
| Failure | Invalid PIN/code/token, used/expired code, rate limit, origin/version rejection when applicable, or unreachable service |

## Architecture, data, configuration, and operations

`src/proxy.ts` separates public, session and bearer paths; route-local checks remain authoritative. Settings stores PIN/session/bearer configuration; `device_pairing_codes` stores one-use HMAC-derived code state. Android stores the returned token in Capacitor Preferences; extension storage is separate. Configuration controls session secret, token, origins, optional client-version policy and rate limits. Restart-local limit state is not a durable audit trail.

## Tests and change impact

Protecting tests: `src/lib/auth.test.ts`, `src/lib/auth/bearer.test.ts`, `src/lib/auth/api-version.test.ts`, `src/lib/auth/no-destructive-gets.test.ts`, `src/proxy.test.ts`, `src/lib/device-pairing/codes.test.ts`, token-display tests, pairing route tests, `src/lib/client/setup-apk-pairing.test.ts` and reachability tests. Auth changes can expose every page/API/client; trace proxy prefix matching, route-local auth, deep-link recovery, clients, token rotation and logging. Pinned evidence: [current auth source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/auth).

Related current features are Android, Browser Extension, Telegram, Recall and every protected browser/API route. Related ideas include per-device identity/revocation, WebAuthn and multi-user roles.
