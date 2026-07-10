# AI Memory Feature Parity And Scope Matrix

Created: 2026-06-13 21:57 IST

## Platform Philosophy

Web and Android should have product parity, not identical layout.

- Web is the workbench.
- Android is the mobile capture, lookup, read, repair, and Ask companion.

## Feature Matrix

| Feature | Web | Android | Notes |
| --- | --- | --- | --- |
| Login | Required | Required | Use AI Memory brand/logo |
| Unlock/PIN | Represented | Required | Stronger Android emphasis |
| Device pairing | Required | Required | Include success and failure states |
| Library browse | Required | Required | Web dense, Android compact |
| Search | Required | Required | Across Library |
| Filters | Required | Required | Android uses compact status plus bottom sheet |
| Multi-select | Required | Required | Supports Ask selected |
| Capture | Required | Required | Android has stronger quick-capture role |
| Share capture | Optional web reference | Required | Android share sheet path |
| Capture result states | Required | Required | Full, partial, duplicate, needs upgrade |
| Needs Upgrade queue | Required | Required | Repair-oriented copy |
| Item detail | Required | Required | Web right rail, Android tabs |
| Focus/read mode | Required | Required | Hide secondary UI |
| Tags | Required | Required | User-managed |
| Included topics | Required | Required | AI-detected, no Add |
| Collections | Required | Required | User-managed |
| Topic detail | Required | Required | Topic explanation and Ask topic |
| Collection detail | Required | Required | Collection items and Ask collection |
| Ask | Required | Required | Platform-native layout |
| Ask history | Collapsible sub-nav | Bottom sheet | Both must restore context |
| Ask citations | Required | Required | Match active scope |
| Add context in Ask | Required or equivalent | Required | Android unified composer required |
| Offline state | Required | Required | Stronger Android emphasis |
| Settings | Required | Required | Privacy honesty required |
| Data/privacy controls | Disabled if unavailable | Disabled if unavailable | No false success claims |

## Known Parity Decisions

- Android should not show a large rectangular Capture button at the top of Library because it already has capture access.
- Android Ask should not show the raised Capture FAB because it conflicts with the composer.
- Web Ask should include a collapsible history rail; Android Ask should use a bottom sheet.
- Web item detail can use a right rail; Android item detail should use tabs and sheets.
