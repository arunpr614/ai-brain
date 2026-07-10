# A9 Accessibility Final Sweep Implementation Plan V1

Created: 2026-06-16 14:03:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source PRD: `FEATURE_RELEASE_A9_ACCESSIBILITY_FINAL_SWEEP_PRD_V2_2026-06-16_14-02-00_IST.md`

## Steps

1. Create a CDP-based local accessibility sweep script.
   - Use a temporary SQLite database.
   - Seed library, item/Ask, capture/settings, and login/pairing fixtures.
   - Use the A5 seed secret manifest only under `/tmp` for session injection.
   - Write redacted JSON evidence and screenshots.

2. Validate keyboard focus.
   - Navigate core public/authenticated routes.
   - Dispatch Tab key events.
   - Record focus sequence, accessible names, and focus style.
   - Fail protected routes that stay on BODY.

3. Validate mobile touch targets.
   - Use 390x844 mobile metrics.
   - Measure visible primary controls and fail below-44px targets outside documented exceptions.

4. Validate 200 percent reflow proxy.
   - Use 720px desktop/zoom-equivalent metrics.
   - Check horizontal overflow and clipped primary controls.

5. Fix any clear failures and rerun.

6. Update QA and trackers.

## Validation Gates

- A9 script exits zero.
- Evidence redaction scan passes.
- `git diff --check`.
- Focused tests if code is changed.
- Full static gates if source changes are made.
