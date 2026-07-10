# Feature PRD v1: Web and Android Light-First Theme Contract

**Created:** 2026-06-17 14:25:28 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch observed:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** PM sub-agent draft for Arun/Main Codex review
**Status:** Draft for adversarial review
**Recommended launch tier:** Tier 4 equivalent - private/internal UX behavior change; no public GTM motion.
**Related plan:** `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`

## 1. Purpose

Make AI Memory deterministically light-first on Web and Android. Fresh sessions, missing cookies, invalid cookies, legacy `brain-theme=system`, browser dark mode, and Android system dark mode should all resolve to Light unless the user explicitly chooses Dark.

Dark mode remains supported as an explicit preference. The product change is removing automatic OS/system-driven dark mode from first-run behavior.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Light-first implementation plan | Records Arun's product decision: first-run Web and Android should be Light; Dark is explicit only; Settings exposes Light/Dark only. |
| Current theme helper | `src/lib/theme.ts` still defines `Theme = "system" | "light" | "dark"` and validates `system`. |
| Current bootstrap | `src/components/theme-bootstrap.tsx` defaults invalid/no cookie to `system` and uses `matchMedia("(prefers-color-scheme: dark)")`. |
| Current layout | `src/app/layout.tsx` resolves SSR to Light except `dark`, but comments say client reconciles to real preference after hydration. |
| Current Settings | `src/app/settings/page.tsx` defaults missing cookie to `system`. |
| Current tokens | `src/styles/tokens.css` says system preference is applied server-side via a `theme` cookie, which is stale and conflicts with `brain-theme`. |
| Existing UX PRDs | Web and Android PRDs require contrast/dark-theme validation when theme support exists. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Fresh app opens predictably | Web and Android open in Light regardless of OS/browser dark preference. |
| Dark mode remains available | User can choose Dark explicitly and see it persist. |
| Legacy state is safe | Existing `brain-theme=system` does not surprise-switch to Dark. |
| Visual parity has a clear baseline | Magic Patterns light design is the parity source; dark is validated as an adaptation. |

## 4. Product Decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| LFT-001 | First-run Web theme is Light. | Approved. |
| LFT-002 | First-run Android WebView theme is Light. | Approved. |
| LFT-003 | Dark mode is explicit only. | Approved. |
| LFT-004 | Remove System from user-facing behavior. | Approved. Existing legacy cookie may be migrated or resolved to Light. |
| LFT-005 | Magic Patterns parity is evaluated against Light mode. | Approved. |
| LFT-006 | Dark support must still be tested. | Required. This feature must not weaken dark-mode contrast or usability. |

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| LFT-R1 | Introduce a Light/Dark resolver. | P0 | Missing, invalid, and `system` values resolve to `light`; `dark` resolves to `dark`; `light` resolves to `light`. |
| LFT-R2 | Preserve cookie name. | P0 | `THEME_COOKIE` remains `brain-theme` for backwards compatibility. |
| LFT-R3 | Remove automatic OS/browser dark resolution. | P0 | Client code no longer uses `matchMedia("(prefers-color-scheme: dark)")` to decide app theme. |
| LFT-R4 | Server paint is deterministic. | P0 | No-cookie, invalid cookie, and legacy `system` cookie render initial `data-theme="light"` on the server. |
| LFT-R5 | Client hydration does not flip Light to Dark from OS preference. | P0 | Fresh browser with OS dark remains Light before and after hydration. |
| LFT-R6 | Dark cookie still works. | P0 | `brain-theme=dark` renders and hydrates Dark, then persists after reload. |
| LFT-R7 | Remove or isolate public `system` type. | P1 | Public theme preference type accepts only `light` and `dark`, or legacy `system` is clearly isolated to migration handling. |
| LFT-R8 | Update stale theme comments. | P1 | Comments in `theme.ts`, `layout.tsx`, `theme-bootstrap.tsx`, and `tokens.css` no longer claim automatic system preference behavior. |
| LFT-R9 | Preserve contrast tests. | P0 | Light and Dark primary-action and selected-control contrast gates pass. |

## 6. Non-Goals

- No new "follow OS" preference.
- No runtime sync with Android native/system settings.
- No user profile sync of theme preference.
- No new analytics or telemetry pipeline.
- No removal of Dark mode.
- No redesign of Library, Capture, Ask, Settings, Pairing, or Android share-result flows beyond defects directly caused by theme behavior.
- No public/store APK release.

## 7. Dependencies

| Dependency | Why it matters |
| --- | --- |
| `src/lib/theme.ts` | Shared type, cookie name, resolver behavior. |
| `src/components/theme-bootstrap.tsx` | Client-side hydration behavior currently follows OS dark when `system`. |
| `src/app/layout.tsx` | Server-rendered `data-theme` and `data-theme-pref` behavior. |
| `src/styles/tokens.css` | Light default, dark token support, stale comments, `color-scheme`. |
| `src/styles/tokens.contrast.test.ts` | Contrast safety for explicit dark support. |
| Settings toggle PRD | User-facing control must match Light/Dark-only contract. |
| Android WebView shell PRD | Native/offline surfaces must not reintroduce OS dark leakage. |

## 8. Edge Cases

- `brain-theme=system` on a browser with OS dark should remain Light.
- `brain-theme=banana` or malformed cookie should remain Light.
- No cookie plus browser/OS dark should remain Light after hydration and after reload.
- Server render and client hydration should not visibly flicker between Light and Dark.
- Existing dark tokens must remain reachable through explicit Dark.
- Multiple tabs may have different old cookies until reload; behavior should settle predictably after each tab reloads.
- User should not get stuck in Dark if legacy system preference was previously stored.

## 9. Telemetry, Observability, and QA Expectations

No new analytics instrumentation is required. QA must record theme state directly.

Required QA:

| Gate | Required evidence |
| --- | --- |
| Unit/focused tests | Resolver tests for missing, `light`, `dark`, `system`, and invalid values. |
| Static scans | Review `prefers-color-scheme: dark`, `matchMedia`, `system`, `System follows your OS preference`, and `brain-theme` occurrences. |
| Browser matrix | Fresh no-cookie OS light, fresh no-cookie OS dark, explicit Light, explicit Dark, legacy System, invalid cookie, toggle Light to Dark, toggle Dark to Light. |
| First paint | No visible first-paint dark flash in fresh Light state. |
| Console snippet | QA report records `document.documentElement.dataset.theme`, redacted `brain-theme`, and diagnostic OS dark value only as evidence. |
| Visual parity | Light screenshots are compared to Magic Patterns; Dark screenshots are labeled adaptation evidence. |
| Contrast | Light and Dark contrast gates pass and manual checks find no P0/P1 accessibility issue. |

## 10. Rollout and Release Criteria

This feature should be implemented before or together with the Settings Light/Dark toggle. The resolver contract is the foundation; the toggle is the user-facing control.

Local completion requires:

1. PRD review complete and P0/P1 issues resolved or accepted.
2. Theme resolver implemented and tested.
3. No automatic OS/system dark behavior remains in app theme resolution.
4. Settings and Android companion PRDs are not contradicted by implementation.
5. Browser QA matrix passes.
6. Android QA matrix passes before claiming Android completion.

Release cannot proceed if fresh Web or fresh Android opens Dark without explicit user choice.

## 11. No-Go Conditions

- Fresh Web opens Dark because browser/OS is dark.
- Fresh Android opens Dark because Android OS is dark.
- `brain-theme=system` still follows OS preference.
- Dark mode is removed or broken.
- Comments still claim server-side system preference handling via a `theme` cookie.
- Magic Patterns parity is judged against Dark screenshots.
- Completion is claimed without Android WebView evidence.

## 12. Open Questions for Review

1. Should legacy `system` cookies be rewritten to `light` after hydration, or merely resolved as Light?
2. Should `data-theme-pref` remain on `<main>` after System is removed, and if so what value should it carry?
3. Should the app document this as a breaking behavior change for existing users who expected OS-following theme?
4. Should public offline assets use `color-scheme: light` only, or retain dark form-control hints when explicit Dark is selected?
