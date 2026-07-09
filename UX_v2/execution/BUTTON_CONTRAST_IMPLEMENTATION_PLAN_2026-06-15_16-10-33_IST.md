# Button Contrast Implementation Plan

Created: 2026-06-15 16:10:33 IST
Revised: 2026-06-15 after verification against the selected-filter visual defect
Owner: Codex
Branch: `codex/ai-brain-ux-v2-magic-patterns`
Production URL: `https://brain.arunp.in`
Related RCA: dark-mode primary buttons render near-white on white because `--accent-9` is near-white while `--on-accent` remains white.

## Problem Statement

Some primary buttons are visually unusable in dark mode. The clearest example is the Library page `Capture` button, where the background is near-white and the label/icon are also white.

The immediate CSS pair is:

```css
--accent-9: #F4F7FB;
--on-accent: #ffffff;
```

Any control using:

```tsx
bg-[var(--accent-9)] text-[var(--on-accent)]
```

has a dark-mode contrast ratio of about `1.07:1`. This fails basic usability and WCAG contrast expectations.

There is a second visual defect in the selected Library filter pills. The active `All` pills remain readable, but they use `border-[var(--accent-9)]`, so dark mode gives them a near-white border. That is not the same severity as the primary button text failure, but it is part of the same token-semantic collision and should be fixed in the same implementation.

## Root Cause

The Magic Patterns UI pass reused the `--accent-*` token family for two different meanings:

1. Primary filled action background.
2. Bright foreground/accent highlight in dark mode.

In light mode this worked because `--accent-9` was dark and `--on-accent` was white. In dark mode, `--accent-9` was changed to a near-white value to support accent/highlight usage, but `--on-accent` was not changed. That created white text on a near-white filled background.

There is also no shared button component or automated contrast check, so the bad token pair propagated to many primary action controls.

## Goals

- Restore readable primary actions in dark mode.
- Restore selected filter/control styling so active pills are readable without a glaring near-white border.
- Keep light-mode primary actions unchanged or visually equivalent.
- Avoid one-off per-button patches when a token-level fix is safer.
- Add enough validation to catch this class of regression before deploy.
- Preserve the Magic Patterns visual direction where possible, but prioritize usability.

## Non-Goals

- Do not redesign the entire color system.
- Do not change product flows, routing, or backend behavior.
- Do not introduce new decision-gated UX features.
- Do not publish a new APK unless explicitly required by a later release path. Android WebView should pick up deployed web assets.

## Affected Surface

Primary affected pattern:

```tsx
bg-[var(--accent-9)] text-[var(--on-accent)]
```

Known affected files include:

- `src/app/library/page.tsx`
- `src/app/capture/tabs.tsx`
- `src/app/ask/page.tsx`
- `src/app/unlock/form.tsx`
- `src/app/setup/form.tsx`
- `src/app/items/[id]/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`
- `src/app/items/[id]/upgrade-text-form.tsx`
- `src/app/needs-upgrade/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/settings/collections/page.tsx`
- `src/app/topics/[slug]/page.tsx`
- `src/app/collections/[id]/page.tsx`
- `src/app/review/page.tsx`
- `src/components/ask-input.tsx`
- `src/components/library-list.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/collection-editor.tsx`
- `src/components/tag-editor.tsx`

Related selected-control pattern:

```tsx
border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]
```

Known selected-control files and areas include:

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/ask/ask-client.tsx`
- `src/app/search/page.tsx`
- `src/app/capture/tabs.tsx`
- `src/components/theme-toggle.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`

Related patterns to review:

- `border-[var(--accent-9)]` can create overly bright selected borders in dark mode.
- `text-[var(--accent-11)]` remains readable, but should be reviewed wherever it acts like muted text rather than an accent.
- `accent-[var(--accent-9)]` affects native checkbox/radio accent color and should be visually checked.

## Recommended Fix Strategy

Use a token-level hotfix first, then follow with component hardening.

### Option A: Minimal Token Fix

Update the dark-theme `--on-accent` token:

```css
:root[data-theme="dark"] {
  --on-accent: #101825;
}
```

Benefits:

- Fixes all filled primary controls using the existing `bg-[var(--accent-9)] text-[var(--on-accent)]` pattern.
- Smallest blast radius.
- High confidence for an urgent production fix.

Risk:

- Primary dark-mode buttons become light-filled with dark text. This is usable, but may still feel visually loud.
- Hover state uses `--accent-10: #D8E0EC`; dark text remains readable.

### Option B: Better Semantic Token Split

Add explicit action and selected-control tokens:

```css
:root {
  --action-primary-bg: var(--ink-950);
  --action-primary-bg-hover: var(--ink-800);
  --action-primary-fg: #ffffff;

  --control-selected-bg: #EEF4FF;
  --control-selected-border: #A9B8CD;
  --control-selected-fg: var(--ink-950);
}

:root[data-theme="dark"] {
  --action-primary-bg: #F4F7FB;
  --action-primary-bg-hover: #D8E0EC;
  --action-primary-fg: #101825;

  --control-selected-bg: #22334E;
  --control-selected-border: #52647C;
  --control-selected-fg: #D8E0EC;
}
```

Then migrate filled primary controls from:

```tsx
bg-[var(--accent-9)] text-[var(--on-accent)] hover:bg-[var(--accent-10)]
```

to:

```tsx
bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]
```

Then migrate selected controls from:

```tsx
border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]
```

to:

```tsx
border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]
```

Benefits:

- Separates primary actions from accent/highlight usage.
- Separates selected controls from primary action fill.
- Reduces future semantic drift.
- Easier to enforce in review.

Risk:

- Touches many files.
- Higher chance of missing a control.

### Recommended Path

Implement Option B directly if there is enough time to validate all touched controls. If a production hotfix is needed immediately, do Option A first, deploy, then follow with Option B.

For the current branch, implement Option B because the root problem is semantic token collision, not a single button typo.

## Implementation Steps

### Phase 1: Token Repair

1. Edit `src/styles/tokens.css`.
2. Add explicit primary action tokens in `:root`:
   - `--action-primary-bg`
   - `--action-primary-bg-hover`
   - `--action-primary-fg`
3. Add explicit selected-control tokens in `:root`:
   - `--control-selected-bg`
   - `--control-selected-border`
   - `--control-selected-fg`
4. Add dark-theme values with dark text on light action fill.
5. Add dark-theme selected-control values that avoid the bright near-white border.
6. Keep existing `--accent-*` tokens for accent text, focus, highlighting, and other non-action/non-selected usage.
7. Consider adding secondary action tokens only if duplication becomes obvious:
   - `--action-secondary-bg`
   - `--action-secondary-border`
   - `--action-secondary-fg`

Acceptance criteria:

- Dark primary action contrast is at least `4.5:1`.
- Light primary action contrast remains at least `4.5:1`.
- Selected filter/control text contrast is at least `4.5:1`.
- Selected filter/control border does not use the near-white dark-mode `--accent-9` token.

### Phase 2: Primary Button Migration

Replace all filled primary action class patterns:

```tsx
bg-[var(--accent-9)]
text-[var(--on-accent)]
hover:bg-[var(--accent-10)]
```

with:

```tsx
bg-[var(--action-primary-bg)]
text-[var(--action-primary-fg)]
hover:bg-[var(--action-primary-bg-hover)]
```

Run:

```bash
rg -n -e "bg-\\[var\\(--accent-9\\)\\].*text-\\[var\\(--on-accent\\)\\]|text-\\[var\\(--on-accent\\)\\].*bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "text-\\[var\\(--on-accent\\)\\]" src/app src/components
```

Acceptance criteria:

- No primary filled button still uses the old accent/on-accent pair.
- Any remaining `bg-[var(--accent-9)]` or `text-[var(--on-accent)]` match is reviewed and documented as safe.

### Phase 3: Selected-Control Migration

Replace selected pill/control class patterns:

```tsx
border-[var(--accent-9)]
bg-[var(--accent-3)]
text-[var(--accent-11)]
```

with:

```tsx
border-[var(--control-selected-border)]
bg-[var(--control-selected-bg)]
text-[var(--control-selected-fg)]
```

Run:

```bash
rg -n "border-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-3\\)\\].*text-\\[var\\(--accent-11\\)\\]|text-\\[var\\(--accent-11\\)\\].*bg-\\[var\\(--accent-3\\)\\]" src/app src/components
```

Acceptance criteria:

- Library active `All` filter uses selected-control tokens.
- Mobile filter sheet active controls use selected-control tokens.
- Sidebar active navigation and other selected/toggled controls are reviewed and migrated when they represent selection, not content emphasis.
- Remaining `border-[var(--accent-9)]` usages are limited to focus/accent/content cases and documented as safe.

### Phase 4: Shared Button Follow-Up

Create a small shared button style helper or component if the migration shows repeated button variants.

Recommended incremental approach:

- Add a `buttonStyles` helper under `src/components/ui/button.ts` or similar if the codebase already has a UI utility pattern.
- Support variants:
  - `primary`
  - `secondary`
  - `danger`
  - `ghost`
  - `icon`
- Start with new or heavily touched screens only. Do not refactor every button in the same hotfix unless required for safety.

Acceptance criteria:

- Future primary buttons do not need to manually compose token pairs.
- Future selected controls do not need to manually compose raw accent token triples.
- The helper uses semantic action tokens, not raw accent tokens.

### Phase 5: Automated Contrast Guard

Add a small contrast test for design tokens.

Suggested test:

- Create `src/styles/tokens.contrast.test.ts` or `src/lib/design-tokens/contrast.test.ts`.
- Parse or mirror the token values for:
  - light primary action background/foreground
  - dark primary action background/foreground
  - light selected-control background/foreground
  - dark selected-control background/foreground
  - danger text on raised/surface backgrounds
- Assert minimum contrast:
  - Primary button text: `>= 4.5`
  - Selected-control text: `>= 4.5`
  - Important small text badges: `>= 4.5`
  - Non-text focus/borders: document separately, not as text contrast.

Acceptance criteria:

- The previous failing pair `#F4F7FB` on `#ffffff` fails the test if reintroduced.
- Selected-control tokens keep active filter pills readable in both themes.
- Test runs in `npm test`.

### Phase 6: Visual QA

Capture before/after screenshots for:

- `/library`
- `/capture`
- `/ask`
- `/needs-upgrade`
- `/items/[id]`
- `/items/[id]/repair`
- `/settings`
- `/settings/device-pairing`
- `/topics/[slug]`
- `/collections/[id]`
- `/unlock`
- `/setup`

Desktop viewport:

- `1440 x 900`

Mobile viewport:

- `390 x 844`

Manual checks:

- Top-right `Capture` is readable.
- Header and empty-state primary Capture buttons are readable.
- Ask send button is readable.
- Capture submit buttons are readable.
- Repair/upgrade buttons are readable.
- Selected filter pills remain readable and no longer have the bright near-white dark-mode border.
- Sidebar active navigation and mobile bottom-nav active state remain readable and visually balanced.
- Focus rings remain visible.
- Disabled buttons remain distinguishable but legible.

Android WebView checks:

- Existing APK loads deployed web assets after deploy.
- Fresh launch shows readable primary controls.
- Pairing/setup flow primary buttons are readable.
- Share/offline fallback screens do not regress.

## Validation Commands

Run before deploy:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Run contrast scan:

```bash
rg -n -e "bg-\\[var\\(--accent-9\\)\\].*text-\\[var\\(--on-accent\\)\\]|text-\\[var\\(--on-accent\\)\\].*bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "text-\\[var\\(--on-accent\\)\\]" src/app src/components
rg -n "border-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-3\\)\\].*text-\\[var\\(--accent-11\\)\\]|text-\\[var\\(--accent-11\\)\\].*bg-\\[var\\(--accent-3\\)\\]" src/app src/components
```

Expected result after migration:

- No matches for filled primary buttons.
- No selected filter/control matches using the old raw accent border/background/text triple.
- Any remaining matches require explicit review comments explaining why they are safe.

## Release Plan

1. Implement token split, primary button migration, and selected-control migration.
2. Add contrast regression test.
3. Run local validation.
4. Capture desktop/mobile screenshots.
5. Create predeploy production backup if deploying.
6. Deploy through `scripts/deploy.sh` only after gates pass.
7. Run live smoke on affected routes.
8. Validate Android WebView loaded the deployed assets.
9. Update tracker and running log with evidence.

## Rollback Plan

Code-only rollback:

1. Revert the contrast fix commit.
2. Redeploy previous known-good source with `scripts/deploy.sh`.
3. Smoke `/library`, `/capture`, `/ask`, `/unlock`, and Android fresh launch.

Database rollback:

- Not required. This plan has no database migration and no data writes.

APK rollback:

- Not applicable unless a future step publishes a new APK. This plan should not publish or overwrite the existing APK.

## Risk Assessment

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Fixing `--on-accent` alone leaves semantic confusion | Medium | Prefer action-token split. |
| Migrating many buttons misses one control | Medium | Use `rg` scan and screenshot QA. |
| Selected active states keep the bright white border | Medium | Add and migrate to `--control-selected-*` tokens. |
| Active states become too subtle after token split | Low | Tune `--control-selected-*` tokens and verify screenshots. |
| Android WebView cache shows old CSS briefly | Low | Validate fresh launch/data-clear path and note cache behavior if needed. |
| Contrast test duplicates token values manually and drifts | Medium | Keep test small and route it through exported token constants if a parser becomes worthwhile. |

## Definition Of Done

- All primary filled buttons are readable in dark and light themes.
- No known primary action uses the failing `--accent-9` plus `--on-accent` pair.
- Selected filter/control pills use `--control-selected-*` tokens or have a documented reason not to.
- Active `All` filter pills no longer show a bright near-white dark-mode border.
- Contrast regression test covers the token pair.
- Contrast regression test covers selected-control tokens.
- Typecheck, lint, tests, and build pass.
- Visual QA screenshots confirm Library/Capture/Ask/Repair/Settings/Unlock readability and selected-control balance.
- Android WebView deployed-asset validation passes if deployed.
- Tracker and running log are updated with results.
