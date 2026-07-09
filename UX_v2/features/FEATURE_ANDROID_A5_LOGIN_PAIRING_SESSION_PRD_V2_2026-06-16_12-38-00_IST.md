# Feature Android A5 Login, Pairing, And Session PRD V2

Timestamp: 2026-06-16 12:38:00 IST
Owner: Main Codex execution agent
Status: Approved for implementation after adversarial review
Supersedes: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_PRD_V1_2026-06-16_12-34-00_IST.md`

## Problem

Android A5 covers the first-use and re-entry surfaces that determine whether AI Memory feels trustworthy on a phone: first PIN setup, unlock after session expiry, Android code-entry pairing, and authenticated device-pairing settings. The routes already exist, but mobile polish and deterministic evidence are not complete enough for the Android redesign milestone.

## Source Truth

| Source | A5 interpretation |
| --- | --- |
| Android revised PRD | Adapt MobileLogin to real AI Memory product truth. Support setup, unlock, session-expired, and pairing states without unsupported biometric, sync, or QR promises. |
| Android revised implementation plan | Phase 9/M5 is Login, Pairing, Session, Client State. Direct `/setup-apk` VIEW intent is only in scope if native/manifest scope is explicitly opened. |
| A0 truth matrix | Keep package identity as `com.arunprakash.brain`. Use AI Memory naming only. Use code-entry pairing only. Do not claim offline sync, E2EE, telemetry, biometric unlock, package migration, or APK production proof without evidence. |
| Current app | `/setup`, `/unlock`, `/setup-apk`, `/settings/device-pairing`, and pairing APIs already exist and must be improved without breaking auth contracts. |

## Goals

1. Make first-run setup and unlock/session recovery polished and stable on a 390px Android viewport.
2. Keep copy accurate and calm: AI Memory naming, clear PIN/session language, and no inline mobile-first terminal reset instructions.
3. Make `/setup-apk` a complete code-entry pairing surface with clear entry, verifying, invalid, expired, used, rate-limited, token-missing, accepted-but-unreachable, reset, and paired UI states.
4. Make `/settings/device-pairing` mobile-safe for authenticated code creation, expiry, regeneration, and advanced token disclosure.
5. Add deterministic fixture and browser QA proof for setup/unlock/pairing states, auth redirects, mobile input attributes, forbidden copy, and layout safety.

## Non-Goals

- Do not change native package identity or claim package migration.
- Do not add QR pairing, biometric unlock, passkeys, local offline sync, background sync, E2EE, or telemetry copy.
- Do not change the hard-coded production `BRAIN_TUNNEL_URL` in this slice.
- Do not claim direct Android VIEW intent handling unless an APK/manifest validation scope is opened and completed.
- Do not expose raw bearer tokens on ordinary device-pairing page load or in QA reports.

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| A5-R1 | `/setup` must render correctly at 390x844 with no horizontal overflow, clipped primary controls, unsupported claims, or inline terminal reset instructions. | P0 |
| A5-R2 | `/unlock` must render correctly at 390x844 and distinguish normal unlock from `reason=session-expired`. | P0 |
| A5-R3 | PIN inputs must use mobile-appropriate attributes: numeric input mode, `current-password`/`new-password` autocomplete, explicit accessible labels, and 44px minimum tap targets. | P0 |
| A5-R4 | Recovery copy must say a forgotten PIN requires server reset or existing runbook/operator action, without showing shell commands or database paths on the phone. | P0 |
| A5-R5 | `/setup-apk` must include a complete page layout, heading, code input, disabled empty submit, retry path, reset path, and clear state panels. | P0 |
| A5-R6 | Pairing exchange errors must map to user-facing invalid, expired, used, rate-limited, token-not-configured, and fallback states. | P0 |
| A5-R7 | `/settings/device-pairing` Android code generation must remain behind auth, use the current pairing API, and keep raw token hidden until explicit advanced disclosure. | P0 |
| A5-R8 | Auth contracts must remain unchanged and proven: unauthenticated `/settings/device-pairing` redirects to `/unlock?next=/settings/device-pairing`; `/setup-apk` and exchange API stay public. | P0 |
| A5-R9 | Browser proof must cover setup, unlock, session expired, unauthenticated redirect, settings code generation, invalid code, expired code, used code, and accepted-but-unreachable exchange. | P0 |
| A5-R10 | Browser proof must inspect setup/unlock/pairing input attributes and minimum target sizes, not only text presence. | P0 |
| A5-R11 | QA reports must state that APK direct VIEW intent and production tunnel reachability are not proven by local browser evidence. | P0 |

## Secret Handling

- Markdown QA/tracker documents must never include `brain-session` values or raw bearer tokens.
- Browser JSON reports must not include raw bearer tokens or session cookie values.
- Short-lived local-only pairing codes may appear in local fixture JSON when necessary to drive deterministic exchange states; markdown reports should refer to state labels rather than transcribe codes.
- Screenshots must keep advanced token setup collapsed or masked.

## Acceptance Criteria

1. `node --import tsx scripts/ux-v2-check-android-a5-copy.ts` returns `issueCount: 0`.
2. `node --import tsx scripts/ux-v2-seed-android-a5-login-pairing.ts` creates deterministic fixture manifests for empty and paired states using `/tmp` databases only when reset is requested.
3. `node --import tsx scripts/ux-v2-browser-android-a5-login-pairing.ts` captures mobile screenshots and returns `issueCount: 0`.
4. Browser report includes pass/fail evidence for unauthenticated redirect, input attributes, target sizes, layout overflow, forbidden copy, invalid/expired/used code states, and accepted-but-unreachable exchange state.
5. `git diff --check`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass, allowing only previously documented unrelated warnings.
6. A5 QA markdown records routes, fixture DBs, screenshot folder, pairing-state coverage, validation commands, and explicit evidence limits.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Pairing success may depend on production tunnel reachability | Treat local proof as exchange/UI proof; use accepted-but-unreachable as deterministic proof unless APK/tunnel smoke is separately run. |
| Hidden raw token leakage in reports | Keep settings advanced token collapsed by default, mask when expanded, and omit token/session values from markdown and JSON. |
| Auth fixture contamination | Use `/tmp` databases only and guard destructive reset behind A5-specific env flags. |
| Existing dirty worktree | Touch only A5 files and new A5 docs/scripts. |

## Open Decisions

1. Whether to open a later native/APK verification slice for direct `/setup-apk` VIEW intent.
2. Whether advanced Chrome extension token setup should eventually move away from the Android-focused page.
