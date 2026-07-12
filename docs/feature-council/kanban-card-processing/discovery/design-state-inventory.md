# Kanban Card Processing — design-state inventory

**Audit viewports:** 1440×1024 desktop and 390×844 mobile
**Canonical direction:** Direction B — Processing, Inbox-first
**Evidence:** `discovery/screenshots/`

## HTML coverage

All eight source HTML entries and all eight built mirrors were opened and rendered at both audit viewports. Primary interactions were exercised on the source Direction B application; built mirrors were checked for equivalent rendering.

| Entry | Desktop | Mobile | Purpose/result |
|---|---|---|---|
| Gallery/index | Pass | Pass | A/B/C comparison and classification visible |
| Direction A | Pass | Pass | Board-first alternative retained, not selected |
| Direction B | Pass | Pass | Selected Inbox/Board/List/Archived experience |
| Direction C | Pass | Pass | Library-integrated alternative retained |
| Item detail | Pass | Pass | Route simulation, workflow controls, note guard |
| Design handoff | Pass | Pass | Selected composition/measurements and comparisons |
| Group/sort specimen | Pass | Pass | Compact utility-control anatomy/density |
| Agent pickup | Pass | Pass | Cold-start source/decision/verification map |

## Direction B state coverage

| State/interaction | Result | Evidence/notes |
|---|---|---|
| Normal Inbox/no selection | Pass | Stable metrics/count/filter shell; no preselection |
| Process next | **Conflict found** | Selects first/newest visible 50-minute card, while PRD/copy require oldest current Inbox entry first |
| Leave in Inbox/advance | Pass prototype behavior | Does not mutate state; advances selection |
| Native Move + 10s Undo | Pass prototype behavior | Move and expiry visible; production server truth remains unproven |
| Board | Pass | Four columns desktop; one selected group mobile |
| List | Pass | Dense grouped rows and actions |
| Group & sort open/reset | Pass | Compact dimensions; non-status grouping copy is explicit |
| User-tag + AI-topic filters/Clear | Pass for one value/facet | Multi-value OR/chips/no-tag/no-topic remain production requirements |
| Loading | Pass | Metrics unavailable rather than false zero |
| Initial load error/Retry | Pass | Stable shell and source-unchanged copy |
| Offline | Pass | Loaded data visible; workflow writes disabled; no queue promise |
| Empty Inbox | Pass | Other lifecycle possibility not misrepresented |
| Filtered empty/Clear | Pass | Total Inbox health remains separately visible |
| Local move failure/Retry | Pass | Source-local rollback copy |
| Version conflict | Pass | Current status shown; intent not silently applied |
| Archived/Restore/Reprocess | Pass | Processing-only archive semantics visible |
| Item detail status actions | Pass | Separate from note editor |
| Notes edit/save/return guard | Pass simulation | Save/Discard/Keep editing route behavior exists |
| Light/Dark | Pass prototype parity | Production must use existing global theme system |
| Skip link/keyboard focus | Pass sampled prototype path | Full production keyboard/AT matrix remains a no-go gate |

## Missing or specification-only states

The prototype does not constitute production proof for exact mutation-outcome lookup, deleted/inaccessible item, dynamic AI-topic removal, replay after later mutation, real multi-tab/device concurrency, server-time Undo boundary, full multi-select filters, keyset pagination, 10k/50k performance, or real note conflict/offline lifecycle.

Manual production gates remain: NVDA, VoiceOver, TalkBack, switch control, 200%/400% zoom, text spacing, forced/high contrast, reduced motion, real-device safe-area/fixed-nav behavior, and focus through any virtualization.

## Responsive observations

- Desktop selected layout uses header/metrics/view/filter chrome plus split Inbox queue and read-only preview; Board is four columns.
- At mobile width, quick preview is hidden, Inbox/List linearize, Board renders one group/status, actions remain exposed, and fixed-navigation clearance is represented.
- Canonical handoff dimensions: Group & sort trigger 36px desktop/≥44px mobile, 322px popover, ~50px desktop rows/~54px mobile rows, 12–13px text, 18px icons.
- Production must map these measurements to current tokens/components rather than copy the throwaway app shell.

## Implementation resolution for the found defect

Production `Process next` must select the first result of `workflow_inbox_entered_at ASC, id ASC`, not DOM fixture order or capture age. An automated fixture and manual focus trace are mandatory.
