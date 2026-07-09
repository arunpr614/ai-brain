# Feature PRD v1: Settings Light/Dark Appearance Toggle

**Created:** 2026-06-17 14:25:28 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch observed:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** PM sub-agent draft for Arun/Main Codex review
**Status:** Draft for adversarial review
**Recommended launch tier:** Tier 4 equivalent - private/internal settings UX improvement.
**Related plan:** `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`

## 1. Purpose

Replace the current System/Light/Dark Settings control with a two-choice Light/Dark control. The control is the explicit user-facing path for choosing Dark, while fresh sessions default to Light through the shared theme contract.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Light-first plan | Requires Settings to expose exactly Light and Dark and remove "System follows your OS preference" copy. |
| Current `ThemeToggle` | `src/components/theme-toggle.tsx` exposes System, Light, Dark with `Monitor`, `Sun`, `Moon`, and reactivity to OS preference when System is selected. |
| Current Settings page | `src/app/settings/page.tsx` initializes missing theme cookie as `system` and displays "System follows your OS preference." |
| Existing UI expectations | Settings is reachable from Web shell and Android More route; controls need mobile touch targets and accessible selected state. |
| Theme contract PRD | Defines Light as default and Dark as explicit-only. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Choose appearance deliberately | User sees only Light and Dark choices and can switch immediately. |
| Avoid surprising System behavior | No Settings copy or control implies OS-following theme. |
| Keep preference persistent | Choice persists across reloads and Android relaunches through `brain-theme`. |
| Use control accessibly | Keyboard, screen reader, and touch users can understand and operate the control. |

## 4. Product Decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| LDT-001 | Settings exposes exactly two choices: Light and Dark. | Approved. |
| LDT-002 | Light is selected by default for missing/legacy/invalid preference. | Required. |
| LDT-003 | Use Sun and Moon icons. | Required by implementation plan. |
| LDT-004 | Persist `brain-theme=light` or `brain-theme=dark`. | Required. |
| LDT-005 | Do not show System option or OS-following copy. | Required. |

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| LDT-R1 | Remove System from visible options. | P0 | Settings Theme control shows only Light and Dark; no Monitor/System button remains. |
| LDT-R2 | Use Light/Dark initial value. | P0 | Missing, invalid, or `system` cookie initializes the control to Light. `dark` initializes to Dark. |
| LDT-R3 | Persist selected preference. | P0 | Selecting Light writes `brain-theme=light`; selecting Dark writes `brain-theme=dark`; cookie path/max-age/same-site behavior remains compatible with existing app. |
| LDT-R4 | Apply theme immediately. | P0 | User selection updates `document.documentElement.dataset.theme` without requiring reload. |
| LDT-R5 | Persist after reload/relaunch. | P0 | Selected Light/Dark remains after browser reload and Android app relaunch. |
| LDT-R6 | Replace user-facing copy. | P0 | Settings no longer says "System follows your OS preference" or equivalent OS-following behavior. |
| LDT-R7 | Keep accessible semantics. | P0 | Control exposes selected state via `role="radio"`/`aria-checked` or equivalent; buttons have labels; keyboard focus is visible. |
| LDT-R8 | Keep mobile touch targets safe. | P0 | Touch targets are at least 44px on mobile/Android and no text/icons overflow. |
| LDT-R9 | Preserve Settings route content. | P1 | Organization, provider health, privacy, offline, backup/export, and pairing settings remain unaffected. |

## 6. Non-Goals

- No new System/Auto/Follow OS option.
- No profile/account-level preference sync.
- No redesign of Settings beyond the Appearance row/control and necessary copy.
- No new settings section or onboarding modal.
- No new telemetry pipeline.
- No change to backup/provider/privacy/device pairing functionality.

## 7. Dependencies

| Dependency | Why it matters |
| --- | --- |
| Theme contract PRD | Defines resolver behavior and valid values for `brain-theme`. |
| `src/components/theme-toggle.tsx` | Primary control implementation. |
| `src/app/settings/page.tsx` | Server-side initial value and Settings copy. |
| `src/app/more/page.tsx` | Android/mobile route to Appearance should remain clear. |
| `lucide-react` | Existing icon library includes Sun and Moon. |
| Android WebView shell PRD | Android relaunch persistence must be validated in WebView, not just browser. |

## 8. Edge Cases

- User with old `brain-theme=system` visits Settings: Light is selected and no System option appears.
- User with invalid cookie visits Settings: Light is selected.
- User toggles Dark while another tab is Light: current tab updates immediately; other tab can update on reload unless cross-tab sync is separately added.
- User toggles rapidly between Light and Dark: final cookie value and visual state should match final selection.
- Android WebView cookie persistence may differ from desktop browser; relaunch must be validated.
- Control must remain readable at 390px mobile width and 200% zoom.

## 9. Telemetry, Observability, and QA Expectations

No new analytics are required. QA should record direct state evidence.

Required QA:

| Gate | Required evidence |
| --- | --- |
| Browser interaction | Settings fresh state shows Light, toggling Dark changes UI immediately, reload stays Dark, toggling Light restores Light and persists. |
| Cookie evidence | QA report records redacted `brain-theme` value only, not full cookies. |
| Accessibility | Keyboard operation, focus visibility, selected state, accessible labels, and 44px mobile touch target. |
| Copy scan | No user-facing "System follows your OS preference" remains. |
| Layout | Settings Appearance row works at 390x844, 768x1024, and desktop widths; no text overflow. |
| Android | Toggle works in APK/WebView and persists across relaunch. |
| Dark support | Dark remains visually usable and contrast-safe after explicit toggle. |

## 10. Rollout and Release Criteria

This feature should ship only with the shared light-first resolver, because the control should not write or display values that the rest of the app interprets differently.

Local completion requires:

1. PRD review complete and P0/P1 issues resolved or accepted.
2. Settings exposes Light/Dark only.
3. Missing/legacy/invalid preferences initialize to Light.
4. Light and Dark choices apply immediately and persist.
5. Browser and Android evidence exists.
6. Copy and static scans pass.

## 11. No-Go Conditions

- Settings still exposes System.
- Settings copy still implies OS-following behavior.
- Dark cannot be selected or does not persist.
- Missing/legacy/invalid cookies initialize the control to System or Dark.
- Control is inaccessible or too small on Android/mobile.
- Android completion is claimed without WebView/relaunch evidence.

## 12. Open Questions for Review

1. Should the UI write `brain-theme=light` immediately when a legacy System cookie is seen, or wait until user interaction?
2. Should the Appearance row include short copy like "Choose the app theme" or remain minimal?
3. Should a future preference restore "Follow system" behind a separate product decision, or is it permanently excluded?
