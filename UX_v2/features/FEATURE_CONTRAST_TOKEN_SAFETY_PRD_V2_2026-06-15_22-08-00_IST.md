# Feature PRD V2 - Contrast And Token Safety

**Created:** 2026-06-15 22:08:00 IST
**Supersedes:** `FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V1_2026-06-15_22-00-00_IST.md`
**Review addressed:** `FEATURE_CONTRAST_TOKEN_SAFETY_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-04-00_IST.md`
**Feature owner:** Main Codex
**Status:** Revised product source for implementation planning.

## Problem

Dark-mode primary actions can become unreadable because the same accent token family is used for both filled action backgrounds and bright accent/highlight values. The documented failing pair is:

```css
--accent-9: #F4F7FB;
--on-accent: #ffffff;
```

That produces white text on a near-white background. The defect class also includes icon-only primary controls, hover states, focus rings, disabled states, and selected controls that use raw accent borders.

## Goals

1. Make primary filled actions, including text and icons, readable in light and dark themes.
2. Make selected controls readable and visually calmer in dark theme.
3. Introduce semantic action and selected-control tokens.
4. Add focused regression coverage for primary and selected-control contrast.
5. Classify any remaining raw accent token usage so future agents can distinguish safe accent usage from missed migrations.
6. Preserve product behavior, routes, API calls, storage, and Android APK versioning.

## Non-Goals

- Do not redesign the full color system.
- Do not implement broader Magic Patterns layout parity in this feature.
- Do not change auth, capture, Ask, export, provider, pairing, or storage behavior.
- Do not publish or overwrite an APK.

## Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| CT-001 | Add semantic primary action tokens | Light and dark themes define action background, hover background, foreground, border, and focus-ring-compatible values. |
| CT-002 | Add semantic selected-control tokens | Light and dark themes define selected background, foreground, and border values. |
| CT-003 | Migrate primary filled actions | No active primary action uses `bg-[var(--accent-9)] text-[var(--on-accent)]` after migration unless classified as safe non-action usage. |
| CT-004 | Migrate selected controls | Active filters/tabs/nav selected states stop using bright dark-mode `border-[var(--accent-9)]` when acting as selected controls. |
| CT-005 | Validate text, icon, and state contrast | Primary text/icon and selected-control text contrast is at least `4.5:1` for default and hover states where measurable; focus-visible remains visible; disabled state remains distinguishable and legible enough to identify the control. |
| CT-006 | Add contrast regression test | Automated test covers light/dark primary actions and selected controls, and proves the old white-on-near-white pair fails. |
| CT-007 | Classify remaining raw token matches | A contrast scan report lists remaining `accent-9`, `on-accent`, and selected-control-like raw accent usages as `migrated`, `safe-accent`, `safe-focus`, `safe-content`, or `follow-up/blocker`. |
| CT-008 | Produce visual evidence | Contrast QA report and screenshots/notes are saved under the web revamp evidence folder for affected critical routes. |
| CT-009 | Validate Android deployed CSS if released | If deployed to production, existing Android APK/WebView must load corrected CSS after fresh launch or cache behavior must be documented as a residual caveat. |
| CT-010 | No behavior/data drift | Typecheck, lint, tests, and build pass; no schema/API changes are introduced. |

## Affected Routes For Visual Evidence

Minimum contrast QA surface:

- `/library`
- `/capture`
- `/ask`
- `/unlock`
- `/setup`
- `/settings`
- `/settings/device-pairing`
- `/items/[id]`
- `/items/[id]/repair`
- `/needs-upgrade`
- `/topics/[slug]`
- `/collections/[id]`

## Evidence Artifacts

Required:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_CONTRAST_QA_<timestamp>.md`
- Screenshots/notes under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/`
- Contrast scan output included in the QA report.

## Technical Constraints

- Prefer token-level and shared-style fixes over route-specific patches.
- Keep the edit surface narrow: CSS tokens, small style helper/component changes, class migrations, tests, and QA docs.
- Avoid unrelated layout, copy, data, or routing changes.
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

This is code/CSS-only. Local validation does not require database backup. If this feature is included in a production deployment, use the umbrella backup/rollback runbook for the release.

Rollback is code-only: revert the contrast/token commit and redeploy previous known-good source.

## Definition Of Done

- PRD v2 exists and addresses review findings.
- Implementation plan v2 exists and addresses review findings.
- Semantic action and selected-control tokens exist.
- Primary and selected-control migrations are complete or classified.
- Contrast test passes.
- Static/build/test gates pass.
- Contrast QA report is created.
- Android WebView CSS pickup is validated or documented if deployed.
- Route-state matrix and project tracker are updated.
