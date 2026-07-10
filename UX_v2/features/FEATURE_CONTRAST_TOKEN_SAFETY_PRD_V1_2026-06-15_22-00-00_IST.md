# Feature PRD V1 - Contrast And Token Safety

**Created:** 2026-06-15 22:00:00 IST
**Feature owner:** Main Codex
**Source umbrella PRD:** `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
**Source implementation plan:** `UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`
**Status:** Draft for adversarial review.

## Problem

Dark-mode primary actions can become unreadable because the same accent token family is used for both filled action backgrounds and bright accent/highlight values. The documented failing pair is:

```css
--accent-9: #F4F7FB;
--on-accent: #ffffff;
```

That produces white text on a near-white background. Selected controls also use raw accent borders, creating overly bright active borders in dark mode.

## Users And Impact

| User | Impact |
|---|---|
| Arun using dark mode on desktop or Android WebView | Primary actions such as Capture, Unlock, Ask, and Settings actions may be unreadable or low-trust. |
| Future AI/code agents | Raw accent token usage makes it easy to reintroduce the defect while building the broader revamp. |
| Release reviewer | Without automated contrast coverage, visual QA must rediscover the same class of failure route by route. |

## Goals

1. Make primary filled actions readable in light and dark themes.
2. Make selected controls readable and visually calmer in dark theme.
3. Introduce semantic action and selected-control tokens so future UI work does not depend on overloaded accent tokens.
4. Add a focused regression test for the token contrast class.
5. Preserve existing product behavior, routes, API calls, and data storage.

## Non-Goals

- Do not redesign the full color system.
- Do not change capture, Ask, auth, export, provider, pairing, or storage behavior.
- Do not publish a new APK for this feature.
- Do not implement broader Magic Patterns layout parity in this feature.

## Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| CT-001 | Add semantic primary action tokens | Light and dark themes define action background, hover background, foreground, and border values. |
| CT-002 | Add semantic selected-control tokens | Light and dark themes define selected background, foreground, and border values. |
| CT-003 | Migrate primary filled actions | No active primary action uses `bg-[var(--accent-9)] text-[var(--on-accent)]` after migration unless documented safe. |
| CT-004 | Migrate selected controls | Active filters/tabs/nav selected states stop using bright dark-mode `border-[var(--accent-9)]` when acting as selected controls. |
| CT-005 | Contrast regression coverage | Automated test asserts primary and selected-control text contrast is at least `4.5:1` in light and dark themes. |
| CT-006 | Visual QA coverage | Screenshots or manual visual notes cover `/library`, `/capture`, `/ask`, `/unlock`, `/settings`, `/settings/device-pairing`, `/items/[id]`, `/needs-upgrade`, `/topics/[slug]`, and `/collections/[id]` in dark and light where feasible. |
| CT-007 | No behavior/data drift | Typecheck, lint, unit tests, and build pass; no schema/API behavior changes are introduced. |

## User Experience Contract

- Primary buttons should look intentionally actionable and be readable at a glance.
- Selected controls should show state clearly without glowing or near-white borders in dark mode.
- Disabled states should stay distinguishable from active states.
- Focus rings must remain visible.
- Long button labels should not overflow on mobile.

## Technical Constraints

- Prefer token-level and shared-style fixes over one-off per-button color overrides.
- Keep changes inside CSS tokens, UI helper/component styles, narrow class migrations, and contrast tests.
- Avoid unrelated layout rewrites.
- Use existing test runner: `node --import tsx --test`.

## Validation

Required commands:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Required scans:

```bash
rg -n -e "bg-\\[var\\(--accent-9\\)\\].*text-\\[var\\(--on-accent\\)\\]|text-\\[var\\(--on-accent\\)\\].*bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "text-\\[var\\(--on-accent\\)\\]" src/app src/components
rg -n "border-\\[var\\(--accent-9\\)\\]" src/app src/components
```

## Release And Rollback

This is a code/CSS-only feature. It does not require database backup for local validation. If included in production deployment, use the umbrella backup/rollback runbook before deploy because the release as a whole touches production.

Rollback is code-only: revert the contrast/token commit and redeploy previous known-good source.

## Definition Of Done

- PRD is adversarially reviewed and revised to v2.
- Implementation plan is adversarially reviewed and revised to v2.
- Semantic action and selected-control tokens exist.
- Primary and selected-control migrations are complete or documented.
- Contrast test passes.
- Static/build/test gates pass.
- Browser visual checks show readable primary actions and selected controls.
- Route-state matrix and project tracker are updated.
