# Feature Implementation Plan V2 - Contrast And Token Safety

**Created:** 2026-06-15 22:20:00 IST
**Supersedes:** `FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_V1_2026-06-15_22-12-00_IST.md`
**Feature PRD:** `FEATURE_CONTRAST_TOKEN_SAFETY_PRD_V2_2026-06-15_22-08-00_IST.md`
**Review addressed:** `FEATURE_CONTRAST_TOKEN_SAFETY_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-16-00_IST.md`
**Status:** Approved for execution if no new blocker appears during inspection.

## Scope

Implement only contrast/token safety. No behavior, API, schema, routing, copy, or APK publication changes are allowed unless a direct compile issue requires a tiny supporting edit.

## Phase 1 - Inspect Current Token And Class Usage

Run and record before counts in the QA report:

```bash
rg -n "--accent-9|--on-accent|data-theme|--border|--surface" src
rg -n -e "bg-\\[var\\(--accent-9\\)\\].*text-\\[var\\(--on-accent\\)\\]|text-\\[var\\(--on-accent\\)\\].*bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "text-\\[var\\(--on-accent\\)\\]" src/app src/components
rg -n "border-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "bg-\\[var\\(--accent-3\\)\\].*text-\\[var\\(--accent-11\\)\\]|text-\\[var\\(--accent-11\\)\\].*bg-\\[var\\(--accent-3\\)\\]" src/app src/components
```

Rule: exact-pair scan is not enough. Every raw `accent-9`, `on-accent`, and selected-control-like `accent-3`/`accent-11` match must be reviewed after migration.

## Phase 2 - Add Semantic Tokens

Add tokens to the existing CSS token source:

- `--action-primary-bg`
- `--action-primary-bg-hover`
- `--action-primary-fg`
- `--action-primary-border`
- `--action-primary-focus`
- `--control-selected-bg`
- `--control-selected-fg`
- `--control-selected-border`

Acceptance:

- Light and dark primary foreground/background contrast >= `4.5:1`.
- Light and dark selected-control foreground/background contrast >= `4.5:1`.
- Hover background remains readable.
- Focus color remains visible against app surfaces.

## Phase 3 - Migrate Classes

1. Replace primary filled action classes with semantic action tokens.
2. Replace selected filter/tab/nav classes with semantic selected-control tokens.
3. Review conditional and multi-line class strings manually using raw-token scans.
4. Keep raw accent tokens only for true accent text, focus/content decoration, or status usage.

Remaining-match categories:

- `migrated`: changed in this feature.
- `safe-accent`: accent/highlight usage, not primary/selected control.
- `safe-focus`: focus ring or outline usage.
- `safe-content`: content/status decoration where contrast is acceptable.
- `follow-up/blocker`: must be fixed or explicitly deferred before release.

## Phase 4 - Add Contrast Test

Preferred strategy:

1. Parse actual CSS token values from the CSS file that defines `:root` and dark-theme tokens.
2. Assert the tested token names exist in CSS.
3. Compute contrast ratios from parsed values.

Manual token map fallback is allowed only if parsing proves impractical. If used, the test must include a guard that verifies the token names exist in the CSS file and a comment explaining why values are mirrored.

Test assertions:

- Primary action light/dark default contrast >= `4.5:1`.
- Primary action light/dark hover contrast >= `4.5:1`.
- Selected-control light/dark contrast >= `4.5:1`.
- Old failing pair `#F4F7FB` on `#ffffff` is < `4.5:1`.

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

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_CONTRAST_QA_2026-06-15_22-20-00_IST.md`

The QA report must include:

- Feature PRD and implementation plan paths.
- Changed files.
- Before/after scan counts.
- Remaining raw-token classification table.
- Contrast test result.
- Static/build/test results.
- Manual visual notes and screenshot paths if browser evidence is captured in this slice.
- Android WebView CSS pickup requirement if deployed.

## No-Go Gates

- Unclassified `bg-[var(--accent-9)]`, `text-[var(--on-accent)]`, or selected-control raw accent matches.
- Any `follow-up/blocker` raw match not fixed or explicitly deferred before release.
- Contrast test failure.
- Typecheck, lint error, test failure, or build failure.
- Source change outside the approved scope without rationale.

## Definition Of Done

- Semantic tokens added.
- Primary/selected classes migrated or classified.
- CSS-backed contrast test added and passing.
- QA report created with before/after scans.
- Static/build/test gates pass.
- Project tracker and route-state matrix updated for contrast feature status.
