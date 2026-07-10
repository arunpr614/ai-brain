# Feature Release A20 P1 Blocker Fixes Implementation Plan V1

Created: 2026-06-16 20:55:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V2_2026-06-16_20-54-00_IST.md`

## Step Plan

1. Add verified-session helpers in `src/lib/auth.ts`.
2. Update `src/lib/device-pairing/create-route-handler.ts` to use verified-session helper with injectable verifier for tests.
3. Update `/settings/device-pairing`, `/library`, and `/more` server pages to redirect when the cookie is missing or invalid.
4. Update staged private API routes that currently check only cookie presence to use the helper where tests can be adjusted safely.
5. Add invalid-cookie tests and update stub-cookie happy paths to use valid injected verifiers or signed session tokens.
6. Add Ask client reset logic with a small exported helper for test coverage.
7. Run focused tests, then full validation.
8. Create A20 QA report, PM update, tracker updates, and running-log entry.

## No-Go Conditions

- Any sensitive token/private data route still returns data for an invalid stub cookie without explicit follow-up risk.
- Ask client still keeps stale `activeThreadId` after thread prop changes.
- Tests fail without documented blocker.
- A20 claims release completion, APK publication, or deployment.
