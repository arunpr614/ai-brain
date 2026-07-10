# Web Experience Revamp Authenticated QA Strategy

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

## Current Auth Behavior

- `/unlock` accepts a PIN and sets the `brain-session` cookie via `unlockAction`.
- `/setup` sets or resets the PIN only with explicit reset intent when a PIN exists.
- `src/proxy.ts` treats public paths as unauthenticated and lets protected browser routes through when `brain-session` cookie is present.
- Bearer auth is limited to allow-listed programmatic routes.
- `/api/settings/device-pairing/exchange` is public for Android code exchange. Code creation happens behind authenticated `/settings/device-pairing`.

## Local Browser QA Auth

| Need | Strategy | Secret handling |
|---|---|---|
| Logged-out screens | Use fresh browser context with no cookies | No secret |
| Logged-in protected routes | Unlock through `/unlock` using a local test PIN if already configured; otherwise use a local-only setup PIN | Never record PIN in docs, screenshots, or terminal summaries |
| Session persistence | Reuse browser context only within the QA run | Delete browser context/cookies after QA |
| Auth failure state | Clear `brain-session` and hit protected route | No secret |

If no local PIN is available and setup is unsafe because the current DB may contain the user's real PIN, block browser QA and ask for an approved local test session path before claiming authenticated browser QA.

## Production Auth Smoke

| Need | Strategy | Secret handling |
|---|---|---|
| Public routes | Direct unauthenticated requests to `/unlock`, `/setup-apk`, `/offline.html`, icons, manifest | No secret |
| Protected routes | Use an already-approved production browser session or user-provided temporary session path | Do not capture cookies/PINs/tokens |
| Auth failure | Verify protected route redirects to `/unlock` without cookie | No secret |
| Missing production session | Mark live authenticated smoke blocked; do not claim pass |

## Android Pairing Auth

- Generate short-lived code from authenticated web `/settings/device-pairing`.
- Exchange code on Android through `/api/settings/device-pairing/exchange`.
- Validate invalid and expired code states without exposing returned token.
- Redact bearer token in Android logs, browser console, network captures, screenshots, and release packet.
- Pairing persistence is validated by app relaunch and successful authenticated API access, with token value redacted.

## Redaction Rules

Never persist or quote raw:

- PIN values.
- `brain-session` cookie values.
- Bearer/API tokens.
- Provider keys.
- Telegram webhook secrets.
- Full private note content.
- Signed URLs or request headers containing credentials.

Use placeholders such as `<redacted:pin>`, `<redacted:cookie>`, `<redacted:token>`, and `<redacted:private-content>`.

## Blocked Vs Failed Labels

- `Blocked`: required credential/session/device is unavailable, and no safe fallback exists.
- `Failed`: credential/session/device was available and the route, API, or flow did not behave as expected.
- `Skipped`: only allowed for explicitly out-of-scope checks with owner/rationale in the release packet.
