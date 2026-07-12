# Kanban Card Processing — design QA

**Date:** 2026-07-12
**Selected target:** Direction B Inbox, desktop 1440×1024 and mobile 390×844/320×844
**Deployed application:** `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`
**Final result:** passed

final result: passed

## Evidence compared

- Direction B desktop reference: `docs/feature-council/kanban-card-processing/discovery/screenshots/20-direction-b-desktop-1440x1024.png`
- Deployed desktop captures: `docs/feature-council/kanban-card-processing/qa/production-desktop-light-1440x1024.png` and `production-desktop-dark-1440x1024.png`
- Direction B mobile reference: `docs/feature-council/kanban-card-processing/discovery/screenshots/30-direction-b-mobile-390x844.png`
- Deployed mobile captures: `docs/feature-council/kanban-card-processing/qa/production-mobile-light-390x844.png`, `production-mobile-dark-390x844.png`, and `production-mobile-dark-320x844.png`
- Same-theme, same-state comparisons: `docs/feature-council/kanban-card-processing/qa/production-reference-comparison-desktop-1440x1024.png` and `production-reference-comparison-mobile-390x844.png`

## Final assessment

The authenticated deployed experience preserves Direction B's dark information hierarchy, serif title, neutral metrics, four work views, bounded filters, split queue/detail model, current application navigation, and mobile bottom navigation. Prototype-only banners and review controls are correctly omitted. Light and dark themes use the existing application tokens and remain visually coherent. No broken layout, clipped content, incorrect type treatment, border/radius mismatch, or horizontal overflow was found at the release viewports.

### Resolved findings

1. **Resolved P1 — 320px view navigation clipping:** all four tabs are visible, enabled, selectable, 44px high, and contained with `scrollWidth === innerWidth` at 320 and 390. The deployed 320×844 capture reconfirms the earlier implementation fix.
2. **Resolved P2 — mobile metric density:** the metrics intentionally stack above the first result on a narrow screen, but both primary actions, all four view controls, exact count copy, and Filters remain visible without overlap. This matches the approved information priority and does not block the task.
3. **Accepted P3 — live-data differences:** the production comparison uses the owner's bounded live backlog rather than prototype fixtures. Layout, hierarchy, empty/detail behavior, and interaction affordances remain faithful.

## Authenticated interaction pass

- Process next selects the oldest Inbox source and moves focus to its decision heading.
- Open uses the canonical detail route; My notes remains independently editable and is never saved, cleared, or submitted by Processing.
- Browser Back and Forward preserve the validated return route and detail context.
- Board and List retain action parity; native Move, Archive, Restore, Reprocess, and timed Undo all work from the keyboard and announce current truth.
- Group by Source type, reset to Status · Oldest, No User tags, filter chips, URL persistence, and Clear all behave as specified.
- Add existing sources opens the exact frozen-set preview dialog; Escape closes it and restores focus to the opener without mutating data.
- Library shows the Processing Inbox summary; mobile More exposes Processing; command-palette search opens Processing.
- Archived recovery was exercised both as Restore to Done and Reprocess to Inbox.

## Responsive and accessibility evidence

- Desktop 1440×1024: light/dark, no horizontal overflow, four views, live regions, filters, selection/detail layout, and current app navigation passed.
- Mobile 390×844 and 320×844: no horizontal overflow; four 44px tabs; bottom navigation and fixed controls remain unobscured; More → Processing passed.
- Keyboard-only activation passed for theme controls, views, Process next, Archive, Restore, Reprocess, Undo, dialog dismissal/focus return, navigation, and command palette.
- Native button/select/radio/checkbox semantics, polite/assertive live regions, visible current/pressed state, and permanent reversal paths are present in the deployed accessibility tree.
- The only captured console errors were stale browser-extension connection messages from the pre-unlock page; no application error was emitted during the authenticated task pass.

Physical screen-reader speech, switch hardware, and Android TalkBack remain documented manual-device coverage rather than claims made from browser automation. They do not change this visual/interaction result.
