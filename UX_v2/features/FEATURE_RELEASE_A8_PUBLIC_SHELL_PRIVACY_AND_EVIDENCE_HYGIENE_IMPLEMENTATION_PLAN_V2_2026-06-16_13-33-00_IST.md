# A8 Public Shell Privacy Implementation Plan V2

Created: 2026-06-16 13:33:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review
Source PRD: `FEATURE_RELEASE_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_PRD_V2_2026-06-16_13-30-00_IST.md`

## Scope

Fix the P1 public-shell private-count leak and P2 evidence-hygiene issues from the A7 release-review sidecar. This is not a production deploy or Android runtime validation.

## Steps

1. Add `src/lib/shell/private-counts.ts` and test.
   - Use dependency injection so the test does not need to mock Next layout.
   - Verify false/invalid session returns zero.
   - Verify true/valid session calls the count function.

2. Update `src/app/layout.tsx`.
   - Read `cookies()` once.
   - Resolve theme from the same cookie store.
   - Gate `countNeedsUpgradeItems()` behind `verifySessionToken(sessionCookie)`.

3. Harden `scripts/ux-v2-seed-android-a5-login-pairing.ts`.
   - Redact stdout fields: `auth.pin`, `auth.sessionToken`, `pairingCodes.expired.code`, `pairingCodes.used.code`, `pairingCodes.valid.code`.
   - Allow full secret manifest writes only under `/tmp`.
   - Write secret manifest with `0600` permissions.

4. Refresh packaged Android public assets.
   - Run `npx cap sync android`.
   - If it fails, record the stale asset risk as unresolved.
   - Even if it succeeds, Android runtime remains blocked until APK/device evidence exists.

5. Validate.
   - A5 seed redaction stdout and `/tmp` path guard.
   - Focused private-count unit test.
   - Focused proxy/public tests if useful.
   - `git diff --check`.
   - `npm run typecheck`.
   - `npm run lint`.
   - `npm test`.
   - `npm run build`.

6. Update reports.
   - A7 code review and release packet with sidecar completed findings and A8 disposition.
   - A8 QA report and tracker update.
   - Master tracker and milestone tracker.

## Release Status

A8 can remove one P1 code blocker and one P2 evidence-hygiene blocker, but final release remains `local_candidate_only` until Android runtime, backup/rollback, deploy/live smoke, observability, accessibility, and live Ask/provider proof pass.
