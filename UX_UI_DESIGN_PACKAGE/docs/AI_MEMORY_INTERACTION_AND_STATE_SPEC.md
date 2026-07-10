# AI Memory Interaction And State Spec

Created: 2026-06-13 21:57 IST

## Ask Scope Rules

Ask must always show what sources are being used.

Scope types:

- All saved items.
- This item.
- Selected items.
- Tag.
- Topic.
- Collection.
- Attached context.

Precedence:

- Attached context overrides route scope for the next answer.
- If no attached context exists, route scope is used.

Visible examples:

- `Scope: All saved items`
- `Scope: Topic: Capture quality`
- `Using attached context`
- `Using attached context instead of Topic: Capture quality`

Citation rule:

- Citations must come from the effective scope.
- Limited-source warnings must match cited or attached sources.

## Source Quality Rules

Full trust:

- Full text.
- Transcript.

Limited trust:

- Preview only.
- Metadata only.
- Needs upgrade.

Limited sources can be saved and browsed, but Ask must warn when answers depend on them.

## Capture Result Rules

Every capture result must state:

- What happened.
- What source was captured.
- How it was captured.
- What quality was achieved.
- What the user should do next.

Do not show a generic success state for weak captures.

## Tags, Topics, Collections

Tags:

- Editable by user.
- Click opens filtered Library.
- Add/remove available on item detail.

Included topics:

- AI-detected from readable content.
- Click opens topic detail.
- No manual Add button.
- If source is weak, show a warning that topic results depend on readable content.

Collections:

- User-created.
- Click opens collection detail.
- Add/remove available on item detail.

## Web Navigation

Global left navigation:

- Collapsible.
- Expanded and collapsed states required.

Ask history navigation:

- Secondary left sub-navigation in Ask.
- Collapsible independently from the global nav.
- Must not permanently consume large horizontal space.

## Android Navigation

Bottom nav:

- Library.
- Capture.
- Ask.
- More.

Capture presentation:

- Raised FAB on browsing/content routes.
- Standard tab on Ask and Capture routes.
- No raised FAB overlapping Ask composer.

## Android Ask Composer States

Required states:

- Idle.
- Input focused.
- Keyboard placeholder.
- Empty send nudge.
- Attached-empty send nudge.
- Loading answer.
- Answer with citations.
- Add Context sheet.
- Attach picker.
- Paste link empty.
- Paste link saving.
- Paste link full-text result.
- Paste link metadata-only warning.
- Paste link duplicate.
- Write note empty.
- Write note saved.
- Attached sources.
- Attached sources sheet.
- History sheet.
- Loaded history conversation.

## Focus/Read Mode

Open from:

- Item detail expand affordance.

Behavior:

- Hide normal secondary UI.
- Keep exit visible.
- Show source trust strip.
- Show readable content.
- Do not open empty read mode for items without readable content.

## Privacy And Trust States

Data/privacy section must not overclaim.

Required:

- Coming soon labels for unavailable privacy features.
- Disabled controls for unavailable privacy features.
- No active end-to-end encryption claim.
- Clear distinction between local UI prototype and real backend capability.
