# Android A5 Login, Pairing, And Session Implementation Plan V2

Timestamp: 2026-06-16 12:44:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review
Source PRD: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_PRD_V2_2026-06-16_12-38-00_IST.md`
Supersedes: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_IMPLEMENTATION_PLAN_V1_2026-06-16_12-40-00_IST.md`

## Scope

Implement and verify the Android A5 milestone for mobile login/setup/pairing/session surfaces:

- `/setup`
- `/unlock`
- `/setup-apk`
- `/settings/device-pairing`
- A5 fixture, copy audit, and browser evidence scripts
- A5 QA and project tracker updates

## Execution Steps

1. Update `/setup` and `/unlock` page layout for 390px Android viewport.
   - Add mobile-safe vertical padding and width constraints.
   - Replace inline terminal reset instructions with calmer reset/support copy.
   - Preserve redirect logic and route contracts.

2. Update `SetupForm` and `UnlockForm`.
   - Add accessible labels.
   - Add `inputMode="numeric"`.
   - Add `autoComplete="new-password"` for setup fields and `autoComplete="current-password"` for unlock.
   - Keep 44px+ input/button heights and stable error panels.

3. Update `/setup-apk`.
   - Add a complete mobile page shell with AI Memory heading and clear code-entry copy.
   - Make empty submit disabled.
   - Improve verifying, error, accepted-but-unreachable, reset, retry, and paired panels.
   - Preserve public exchange API and Capacitor preferences behavior.

4. Update `/settings/device-pairing`.
   - Make mobile padding, headings, code display, and action buttons safer.
   - Preserve token masking and explicit advanced disclosure.
   - Keep Android code creation behind auth.

5. Add `scripts/ux-v2-seed-android-a5-login-pairing.ts`.
   - Support `A5_SCENARIO=empty` and `A5_SCENARIO=paired`.
   - Require `BRAIN_DB_PATH`.
   - Only allow destructive reset when `A5_RESET_DB=1` and `BRAIN_DB_PATH` starts with `/tmp/`.
   - Empty scenario creates only migrations and returns setup route metadata.
   - Paired scenario sets a test PIN, issues a session token for CDP cookie injection, and creates valid, expired, and used pairing-code fixtures.
   - Local JSON may contain temporary fixture codes and session token for automation, but markdown QA must not transcribe session or bearer values.

6. Add `scripts/ux-v2-check-android-a5-copy.ts`.
   - Strictly fail on rendered-risk strings in A5 source files: `AI Brain`, `Your Brain`, QR pairing promises, biometric unlock, offline sync/read promises, package migration, E2EE, telemetry, and inline terminal reset paths/commands on setup/unlock/setup-apk.
   - Keep the target set to A5 files to avoid unrelated dirty-tree noise.

7. Add `scripts/ux-v2-browser-android-a5-login-pairing.ts`.
   - Use Chrome CDP at 390x844.
   - Run in two server phases:
     - Empty DB server phase: prove `/setup` first-run state and setup form attributes/layout.
     - Paired DB server phase after server restart: prove `/unlock`, session-expired unlock, unauthenticated `/settings/device-pairing` redirect, authenticated device-pairing settings, code generation, invalid/expired/used pairing errors, and accepted-but-unreachable exchange.
   - Inject the paired session cookie from the fixture manifest for authenticated settings, but record only `sessionCookieInjected: true`.
   - Record pairing states by labels (`invalid`, `expired`, `used`, `accepted_unreachable`) rather than transcribing codes in markdown.
   - Assert no horizontal overflow and no clipped non-fixed primary controls.
   - Assert required input attributes and 44px minimum height/width for A5 primary controls.
   - Report other sub-44 controls as observations, not hard failures, unless they are primary controls.
   - Omit raw bearer token and session values from JSON reports.

8. Run validation.
   - A5 copy audit
   - A5 empty seed
   - A5 paired seed
   - A5 browser proof across both server phases
   - `git diff --check`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`

9. Update A5 QA and tracker docs.
   - Record evidence, commands, screenshots, residual risks, and APK/tunnel evidence limits.
   - Redact session cookie and bearer token values.
   - Update master tracker status for A5.

## Files Expected To Change

- `src/app/setup/page.tsx`
- `src/app/setup/form.tsx`
- `src/app/unlock/page.tsx`
- `src/app/unlock/form.tsx`
- `src/app/setup-apk/page.tsx`
- `src/app/settings/device-pairing/page.tsx`
- `src/app/settings/device-pairing/actions-client.tsx`
- `scripts/ux-v2-seed-android-a5-login-pairing.ts`
- `scripts/ux-v2-check-android-a5-copy.ts`
- `scripts/ux-v2-browser-android-a5-login-pairing.ts`
- `UX_v2/execution/ANDROID_A5_LOGIN_PAIRING_SESSION_QA_*.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_*.md`
- `UX_v2/project_management/UX_V2_MASTER_PROJECT_TRACKER.md`

## Rollback

Revert only the A5 app/script/doc changes. Do not touch unrelated dirty worktree files.

## Evidence Limits

The browser proof verifies local route behavior, layout, exchange error mapping, auth redirect behavior, and accepted-but-unreachable UI. It does not prove direct APK VIEW intents or production tunnel reachability.
