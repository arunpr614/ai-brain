# Feature Implementation Plan V1 - Contrast And Token Safety

**Created:** 2026-06-15 22:12:00 IST
**Feature PRD:** `FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V2_2026-06-15_22-08-00_IST.md`
**Status:** Draft for adversarial review.

## Scope

Implement the contrast/token safety feature only. Do not redesign routes, change behavior, touch schema, or publish APK artifacts.

## Target Files

Likely files:

- `src/app/globals.css`
- `src/styles/tokens.css` if present after inspection; otherwise existing global token file.
- Primary action surfaces under `src/app/**` and `src/components/**`
- Selected control surfaces under `src/app/**` and `src/components/**`
- New or existing test file under `src/styles/` or `src/lib/`
- New QA report under `UX_v2/execution/`

## Phase 1 - Inspect Current Token And Class Usage

1. Locate token definitions:
   ```bash
   rg -n "--accent-9|--on-accent|data-theme|--border|--surface" src
   ```
2. Locate primary action patterns:
   ```bash
   rg -n -e "bg-\\[var\\(--accent-9\\)\\].*text-\\[var\\(--on-accent\\)\\]|text-\\[var\\(--on-accent\\)\\].*bg-\\[var\\(--accent-9\\)\\]" src/app src/components
   ```
3. Locate selected-control patterns:
   ```bash
   rg -n "border-\\[var\\(--accent-9\\)\\]|bg-\\[var\\(--accent-3\\)\\].*text-\\[var\\(--accent-11\\)\\]|text-\\[var\\(--accent-11\\)\\].*bg-\\[var\\(--accent-3\\)\\]" src/app src/components
   ```
4. Record initial scan counts in the contrast QA report.

## Phase 2 - Add Semantic Tokens

Add light and dark theme values:

- `--action-primary-bg`
- `--action-primary-bg-hover`
- `--action-primary-fg`
- `--action-primary-border`
- `--action-primary-focus`
- `--control-selected-bg`
- `--control-selected-fg`
- `--control-selected-border`

Acceptance:

- Primary action foreground/background contrast >= `4.5:1` in light and dark.
- Selected-control foreground/background contrast >= `4.5:1` in light and dark.
- Focus token visible against adjacent surfaces.

## Phase 3 - Migrate Classes

1. Replace filled primary button classes with semantic action tokens.
2. Replace selected filter/tab/nav classes with semantic selected-control tokens.
3. Keep raw accent tokens only for true accent text, focus, content decoration, or non-selected status usage.
4. Record any remaining raw token usage in a scan classification table.

## Phase 4 - Add Contrast Test

Create a small test that:

- Defines contrast ratio helpers.
- Reads token values from a single test-local token map or, if simple enough, parses `src/app/globals.css`.
- Asserts primary action light/dark contrast.
- Asserts selected-control light/dark contrast.
- Asserts the old `#F4F7FB` on `#ffffff` pair fails.

## Phase 5 - Validate And Document

Run:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Create:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_CONTRAST_QA_<timestamp>.md`

Include:

- Changed files.
- Scan output/classification.
- Test/build results.
- Manual visual notes for critical routes where browser evidence is available.
- Android WebView CSS pickup requirement if this feature deploys.

## No-Go Gates

- Any remaining unclassified primary/selected raw token match.
- Contrast test failure.
- Typecheck, lint error, test failure, or build failure.
- Any code change outside contrast/token/class/test/QA docs without explicit rationale.
