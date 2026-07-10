# Android A5 Login, Pairing, And Session Implementation Plan V1

Timestamp: 2026-06-16 12:40:00 IST
Owner: Main Codex execution agent
Source PRD: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_PRD_V2_2026-06-16_12-38-00_IST.md`

## Scope

Implement and verify the Android A5 milestone for mobile login/setup/pairing/session surfaces:

- `/setup`
- `/unlock`
- `/setup-apk`
- `/settings/device-pairing`
- A5 fixture, copy audit, and browser evidence scripts
- A5 QA and project tracker updates

## Implementation Steps

1. Update `/setup` and `/unlock` page layout for 390px Android viewport.
   - Add mobile-safe vertical padding and width constraints.
   - Replace dense reset instructions with calmer support/reset copy.
   - Preserve redirect logic and route contracts.

2. Update `SetupForm` and `UnlockForm`.
   - Add labels or accessible labels.
   - Add `inputMode="numeric"` and relevant `autoComplete` values.
   - Keep 44px+ input/button heights and stable error panels.

3. Update `/setup-apk`.
   - Add a full mobile page shell with AI Memory heading and clear code-entry copy.
   - Make empty submit visibly disabled.
   - Improve verifying, error, accepted-but-unreachable, reset, retry, and paired panels.
   - Preserve public exchange API and Capacitor preferences behavior.

4. Update `/settings/device-pairing`.
   - Make mobile padding, headings, code display, and action buttons safer.
   - Preserve token masking and explicit advanced disclosure.
   - Keep Android code creation behind auth.

5. Add `scripts/ux-v2-seed-android-a5-login-pairing.ts`.
   - Support `A5_SCENARIO=empty` and `A5_SCENARIO=paired`.
   - Require `BRAIN_DB_PATH`.
   - Only allow reset for `/tmp` DB paths.
   - For paired scenario, set PIN, issue a session token for browser cookie use, and create valid, expired, and used pairing codes.
   - Print a local-only JSON manifest.

6. Add `scripts/ux-v2-check-android-a5-copy.ts`.
   - Scan A5 source files for forbidden unsupported claims and stale brand language.
   - Fail on inline terminal reset paths/commands in mobile entry screens.

7. Add `scripts/ux-v2-browser-android-a5-login-pairing.ts`.
   - Drive Chrome via CDP on a 390x844 mobile viewport.
   - Capture screenshots and JSON report.
   - Check setup, unlock, session-expired unlock, unauthenticated redirect, settings code generation, invalid/expired/used code errors, and accepted-but-unreachable exchange.
   - Check no horizontal overflow, no clipped non-fixed controls, required text, forbidden copy, input attributes, and touch target sizes.
   - Omit raw session and bearer token values from report.

8. Run validation.
   - A5 copy audit
   - A5 seed empty and paired
   - A5 browser proof
   - `git diff --check`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`

9. Update A5 QA and tracker docs.
   - Record evidence, commands, screenshots, residual risks, and APK/tunnel evidence limits.
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

The browser proof verifies local route behavior, layout, exchange error mapping, and accepted-but-unreachable UI. It does not prove direct APK VIEW intents or production tunnel reachability.
