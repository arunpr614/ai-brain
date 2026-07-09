# Web Experience Revamp Browser QA Harness

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

## Tool Choice

Primary harness: Playwright-style browser automation if available through repo dependencies or the in-app Browser/Chrome tooling. For local visual QA, start the Next.js dev server or production build server, authenticate once, then capture screenshots, console, and network evidence for each route/state.

Because the repo does not currently list Playwright as a dependency, do not add it unless implementation needs a durable script. The acceptable first pass is an in-app browser or Chrome automation harness with saved artifacts and deterministic route/state coverage.

## Viewports

| Viewport | Purpose |
|---|---|
| `390x844` | Mobile Android/WebView-like |
| `768x1024` | Tablet portrait |
| `1024x768` | Compact desktop/tablet landscape |
| `1280x800` | Laptop |
| `1440x900` | Desktop acceptance |
| `1920x1080` | Large desktop |

## Evidence Folder

Use:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/console/`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/network/`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/a11y/`

Naming convention:

- Screenshots: `<route-slug>__<state>__<viewport>__<theme>.png`
- Console: `<route-slug>__<state>__<viewport>__console.txt`
- Network: `<route-slug>__<state>__<viewport>__network.json`
- A11y/contrast notes: `<route-slug>__<state>__<viewport>__a11y.md`

## Route List

Critical routes:

- `/unlock`
- `/setup`
- `/setup-apk`
- `/library`
- `/search`
- `/items/[id]`
- `/items/[id]/repair`
- `/items/[id]/ask`
- `/needs-upgrade`
- `/ask`
- `/capture`
- `/review`
- `/more`
- `/settings`
- `/settings/collections`
- `/settings/tags`
- `/settings/device-pairing`
- `/topics/[slug]`
- `/collections/[id]`
- `/offline.html`

## Checks Per Route

- Page loads without uncaught browser console errors.
- No failed critical network request.
- Primary actions have readable contrast in light and dark themes.
- Selected filters/tabs do not use the known bright-border dark-mode regression.
- Text does not clip, overlap, or occlude controls at required viewports.
- Touch targets are at least 44px on mobile.
- Keyboard focus is visible for interactive controls.
- Loading, empty, error, and blocked states render intentionally.
- 200 percent zoom spot checks on dense Library, Settings, Detail, and Ask screens.
- Reduced-motion behavior is acceptable where animation exists.

## Harness Output Rule

Every route-state row in `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_2026-06-15_21-48-07_IST.md` must point to either:

1. Screenshot/console/network evidence, or
2. A blocker entry explaining why the state could not be reached.
