# AI Memory Implementation Acceptance Checklist

Created: 2026-06-13 21:57 IST

## Brand And Design System

- [ ] Product name shown as AI Memory.
- [ ] No user-facing production copy says AI Brain.
- [ ] Logo asset used from `assets/logo/ai-memory-logo.png`.
- [ ] Web favicon assets are present and wired.
- [ ] Android launcher/adaptive icon assets are present and wired.
- [ ] Core colors match the design-system tokens.
- [ ] Color is used semantically, not decoratively.
- [ ] Cards use restrained radius and crisp borders.
- [ ] Text remains readable on mobile and desktop.
- [ ] Icon-only buttons have accessible labels.

## Web

- [ ] Implementation has been compared against screenshots in `screenshots/web/`.
- [ ] Implementation route list covers every web route in `screenshots/SCREENSHOT_EXPORT_INDEX.md`.
- [ ] Desktop viewport QA has been run at 1280 x 720 and one wider desktop size.
- [ ] Global left navigation collapses and expands.
- [ ] Library supports search, filters, multi-select, and visible bulk actions.
- [ ] Ask selected preserves selected item context.
- [ ] Item detail has a reading area and separate right-rail cards.
- [ ] Tags, Included topics, and Collections are separate cards.
- [ ] Included topics are clickable and not manually addable.
- [ ] Focus/read mode works from item detail.
- [ ] Ask has an independently collapsible history sub-navigation.
- [ ] Ask citations match active scope.
- [ ] Settings privacy controls do not overclaim unavailable features.

## Android

- [ ] Implementation has been compared against screenshots in `screenshots/android/`.
- [ ] Android viewport QA has been run at a compact phone width and a tall phone width.
- [ ] Bottom navigation includes Library, Capture, Ask, More.
- [ ] Ask and Capture routes do not show the raised Capture FAB.
- [ ] Library/content routes keep capture access.
- [ ] Library filters use compact status plus bottom sheet.
- [ ] Item detail uses Original, Digest, Ask, Related, Details tabs.
- [ ] Details tab separates Source and capture, Tags, Included topics, Collections.
- [ ] Focus/read mode hides bottom nav and tabs.
- [ ] Ask unified composer shows Add context, input, and send clearly.
- [ ] Ask composer is not blocked by Capture controls.
- [ ] Android Ask history opens as a bottom sheet.
- [ ] Keyboard placeholder or real keyboard state does not overlap composer.

## Data And Trust

- [ ] Web implementation uses artifact `f3312489-9172-4c3f-bcf8-2352ece9d417` or an explicitly user-approved newer artifact.
- [ ] Android implementation uses artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7` or an explicitly user-approved newer artifact.
- [ ] Source exports in `source-exports/` have been inspected for route/state coverage.
- [ ] `package-manifest.json` exists and file hashes were generated after the latest package update.
- [ ] Source platform and Captured via are separate fields.
- [ ] Source quality is visible wherever trust matters.
- [ ] Metadata-only, preview-only, and needs-upgrade items warn before Ask.
- [ ] Capture result states distinguish full, partial, duplicate, and failed outcomes.
- [ ] End-to-end encryption is not claimed as active.
- [ ] Coming-soon privacy controls are disabled.

## Interaction QA

- [ ] Evidence screenshots are captured after implementation for every major route/state.
- [ ] Screenshot comparison checks nav collapse, Ask history collapse, focus/read mode, item detail right rail/details tab, and Android keyboard/composer behavior.
- [ ] Library item opens item detail.
- [ ] Tag pill opens filtered Library.
- [ ] Topic pill opens topic detail.
- [ ] Collection opens collection detail.
- [ ] Ask topic and Ask collection use the correct scope.
- [ ] Attached Ask context overrides route scope visibly.
- [ ] Ask answer citations come from effective scope.
- [ ] Empty Ask send shows a nudge.
- [ ] Attached-empty Ask send shows a context-specific nudge.
- [ ] Bottom sheets and dialogs can always be closed.
