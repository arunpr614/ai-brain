# Feature Android A5 Login, Pairing, And Session PRD V1

Timestamp: 2026-06-16 12:34:00 IST
Owner: Main Codex execution agent
Parent plans:
- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`

## Problem

Android A5 covers the first-use and re-entry surfaces that determine whether AI Memory feels trustworthy on a phone: first PIN setup, unlock after session expiry, Android code-entry pairing, and authenticated device-pairing settings. Current implementation has functional routes, but the mobile presentation still exposes technical recovery copy, small/desktop-biased controls, and incomplete repeatable evidence for pairing failure states.

## Source Truth

| Source | A5 interpretation |
| --- | --- |
| Android revised PRD | Adapt MobileLogin to real AI Memory product truth. Support setup, unlock, session-expired, and pairing states without unsupported biometric, sync, or QR promises. |
| Android revised implementation plan | Phase 9/M5 is Login, Pairing, Session, Client State. Direct `/setup-apk` VIEW intent is only in scope if native/manifest scope is explicitly opened. |
| A0 truth matrix | Keep package identity as `com.arunprakash.brain`. Use AI Memory naming only. Use code-entry pairing only. Do not claim offline sync, E2EE, telemetry, biometric unlock, package migration, or APK production proof without evidence. |
| Current app | `/setup`, `/unlock`, `/setup-apk`, `/settings/device-pairing`, and pairing APIs already exist and must be improved without breaking auth contracts. |

## Goals

1. Make first-run setup and unlock/session recovery feel polished on a 390px Android viewport.
2. Keep copy user-facing and accurate: AI Memory naming, clear PIN/session language, no terminal-only recovery instructions as primary mobile guidance.
3. Make `/setup-apk` a complete code-entry pairing surface with clear entry, verifying, invalid, expired, used, rate-limited, token-missing, accepted-but-unreachable, reset, and paired states.
4. Make `/settings/device-pairing` mobile-safe for authenticated code creation, expiry, regeneration, and advanced token disclosure.
5. Add deterministic fixture and browser QA proof for setup/unlock/pairing states, including forbidden-copy and layout checks.

## Non-Goals

- Do not change native package identity or claim package migration.
- Do not add QR pairing, biometric unlock, passkeys, local offline sync, background sync, E2EE, or telemetry copy.
- Do not change the hard-coded production `BRAIN_TUNNEL_URL` in this slice.
- Do not claim direct Android VIEW intent handling unless an APK/manifest validation scope is opened and completed.
- Do not expose raw bearer tokens on ordinary device-pairing page load.

## Users And Scenarios

| Scenario | User need | Expected result |
| --- | --- | --- |
| First run setup | Set a local PIN quickly on phone | `/setup` shows a compact AI Memory setup surface with strong touch targets and understandable privacy copy. |
| Session expired | Return to requested work | `/unlock?next=...&reason=session-expired` shows an explicit session-expired note and unlock returns to `next` after valid PIN. |
| Wrong PIN | Recover from entry mistake | Error is visible, non-destructive, and does not shift layout into overlap. |
| Pair Android app | Enter a short code from web settings | `/setup-apk` accepts code entry, disables empty submit, and communicates progress. |
| Invalid pairing code | Fix or retry code entry | Error says the code was not recognized and offers a clear retry. |
| Expired code | Generate a fresh code | Error explains expiry and points to Device pairing in the web app. |
| Used code | Avoid false success | Error says the code already worked once and requires a fresh code. |
| Accepted but unreachable | Preserve token and retry | Token remains saved; page offers retry connection and reset pairing. |
| Web code generation | Add Android device from authenticated settings | `/settings/device-pairing` produces a one-time code, shows countdown/expiry, and stays mobile-safe. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| A5-R1 | `/setup` must render correctly at 390x844 with no horizontal overflow, clipped primary controls, or unsupported claims. | P0 |
| A5-R2 | `/unlock` must render correctly at 390x844 and distinguish normal unlock from `reason=session-expired`. | P0 |
| A5-R3 | PIN inputs must use mobile-appropriate attributes: numeric input mode, current/new password autocomplete, visible labels or accessible labels, and 44px minimum tap targets. | P0 |
| A5-R4 | The unlock recovery copy must avoid making terminal commands the primary mobile experience. It can mention server reset in calmer support language. | P0 |
| A5-R5 | `/setup-apk` must include a complete page layout, heading, code input, disabled empty submit, retry path, reset path, and clear state panels. | P0 |
| A5-R6 | Pairing exchange errors must map to user-facing invalid, expired, used, rate-limited, token-not-configured, and fallback states. | P0 |
| A5-R7 | `/settings/device-pairing` Android code generation must remain behind auth, use the current pairing API, and keep raw token hidden until explicit advanced disclosure. | P0 |
| A5-R8 | Auth contracts must remain unchanged: `/settings/device-pairing` redirects without `brain-session`; `/setup-apk` and exchange API stay public. | P0 |
| A5-R9 | Browser proof must cover setup, unlock, session expired, settings code generation, invalid/expired/used code, and accepted-but-unreachable pairing without logging secrets. | P0 |
| A5-R10 | QA reports must state that APK direct VIEW intent and production tunnel reachability are not proven by local browser evidence. | P0 |

## Acceptance Criteria

1. `node --import tsx scripts/ux-v2-check-android-a5-copy.ts` returns `issueCount: 0`.
2. `node --import tsx scripts/ux-v2-seed-android-a5-login-pairing.ts` creates deterministic fixture manifests for empty and paired states.
3. `node --import tsx scripts/ux-v2-browser-android-a5-login-pairing.ts` captures mobile screenshots and returns `issueCount: 0`.
4. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass, allowing only previously documented unrelated warnings.
5. A5 QA markdown records routes, fixture DBs, screenshots, pairing-state coverage, and explicit evidence limits.

## Risks

| Risk | Mitigation |
| --- | --- |
| Pairing success may depend on production tunnel reachability | Treat local proof as exchange/UI proof; use accepted-but-unreachable state as deterministic proof unless APK/tunnel smoke is separately run. |
| Hidden raw token leakage in reports | Browser report must not capture token text; settings advanced token remains collapsed by default and masked when expanded. |
| Auth fixture contamination | Use `/tmp` databases only and guard destructive reset behind A5-specific env flags. |
| Existing dirty worktree | Touch only A5 files and new A5 docs/scripts. |

## Open Decisions

1. Whether to open a later native/APK verification slice for direct `/setup-apk` VIEW intent.
2. Whether advanced Chrome extension token setup should eventually move away from the Android-focused page.
