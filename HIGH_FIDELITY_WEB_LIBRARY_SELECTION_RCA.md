# High-Fidelity Web Library Selection RCA

Created: 2026-06-13
Project: AI Brain Web - High Fidelity
Magic Patterns editor: https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx
Artifact reviewed: `2ec436e0-3291-43ff-9043-56d79ec1f008`
Fix artifact: `dd5eb357-5f7b-4433-9816-527bff9a0e3e`

## Summary

Two separate issues are present in the high-fidelity web Library selection experience.

1. The second and third bulk action buttons in the selection bar are not visible until hover.
2. The "Ask selected" flow is structurally broken because the selected item context is not passed into the Ask screen.

There is also a related secondary gap: the hidden "Add tags" and "Add to collection" buttons are visual-only actions. They do not currently open any supporting bulk-edit UI.

## Implementation Update

Status: fixed and published in Magic Patterns artifact `dd5eb357-5f7b-4433-9816-527bff9a0e3e`.

Files updated:

- `pages/DesktopLibrary.tsx`
- `pages/DesktopAsk.tsx`

What changed:

- Replaced the conflicting shared-button variant usage in the Library selection bar with explicit toolbar button styling so all actions are visible in their normal state.
- Added visible Tag and Collection icons to the secondary bulk actions.
- Added supporting bulk-action dialogs for `Add tags` and `Add to collection`, including selected-item count, existing choices, create-new input, and apply/cancel actions.
- Changed `Ask selected` to pass selected Library item IDs through the URL as `scope=selected&items=...`.
- Updated Ask to parse selected item IDs, show the selected source list, show selected source count, warn when selected sources have weak quality, and route submitted selected-item questions into a selected-items conversation state.

Publish status: published to Magic Patterns. Magic Patterns compiled artifact `dd5eb357-5f7b-4433-9816-527bff9a0e3e` and reports it as the active artifact.

Rollback candidate: `2ec436e0-3291-43ff-9043-56d79ec1f008`.

## Issue 1: Bulk Action Buttons Are Invisible Until Hover

### What The User Sees

After selecting an item in Library, the dark selection bar appears.

- "Ask selected" is visible.
- The next two actions appear as blank white buttons.
- Their labels become visible only on hover.
- "Delete" is visible, but the overall action bar feels inconsistent.

### Code Evidence

The selection bar is in `pages/DesktopLibrary.tsx`.

The problematic actions are rendered as `Button variant="secondary"` with extra dark-toolbar classes:

```tsx
<Button
  variant="secondary"
  className="bg-ink-800 text-white border-ink-700 hover:bg-ink-700"
>
  Add tags
</Button>
```

The shared `Button` component defines the `secondary` variant as:

```tsx
secondary: 'bg-panel text-ink border-line-strong hover:bg-canvas'
```

The component then concatenates both sets of classes:

```tsx
className={`${base} ${variantClasses[variant]} ... ${className}`}
```

The project includes `tailwind-merge` in `package.json`, but the `Button` component does not use it.

### Root Cause

The buttons have conflicting Tailwind utility classes in the same element:

- `bg-panel` conflicts with `bg-ink-800`
- `text-ink` conflicts with `text-white`
- `border-line-strong` conflicts with `border-ink-700`
- `hover:bg-canvas` conflicts with `hover:bg-ink-700`

Because the classes are not merged, the final visual result depends on Tailwind's generated CSS order rather than the order in the `className` string. In the current build, the normal state resolves to a white button with white or near-invisible text. On hover, the dark hover background wins, so the label becomes visible.

### Why The First Button Works

"Ask selected" uses `variant="violet"` with no conflicting dark-toolbar overrides. It receives one coherent visual definition, so it stays visible.

### Design Impact

This is a high-severity UX issue for the review prototype:

- Primary bulk actions appear unavailable or broken.
- The user must hover to discover action labels.
- The design violates the rule that controls should not depend on hover for basic visibility.
- It weakens confidence in the high-fidelity design system.

## Issue 2: "Ask Selected" Supporting Screen Is Broken

### What The User Expects

After selecting one or more Library items and clicking "Ask selected," Ask should open with a selected-items scope and clear evidence of the selected sources.

Expected visible elements:

- Scope: `Selected items`
- Selected item count
- Selected item chips or compact source list
- Source quality warning if weak sources are included
- Ask input scoped to those selected items
- Citation/evidence panel restricted to those selected items

### Code Evidence

In `pages/DesktopLibrary.tsx`, selection is stored locally:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

But the action discards that state:

```tsx
const handleAskSelected = () => {
  navigate('/ask?scope=selected')
}
```

No selected item IDs are passed in the URL, router state, or shared store.

In `pages/DesktopAsk.tsx`, the query string only sets the visual scope selector:

```tsx
value={scopeFromUrl ? mapScope(scopeFromUrl) : 'All sources'}
```

When the user submits a question from the empty Ask screen, it navigates to a hard-coded conversation:

```tsx
navigate('/ask/c1')
```

But `c1` in `data/conversations.ts` has scope `All sources`, not `Selected items`.

### Root Cause

"Ask selected" was implemented as a visual route hint, not as a real selected-items flow.

The design has:

- Local selection state in Library.
- A URL flag for selected scope.
- A static Ask screen.
- A hard-coded conversation destination.

It does not have:

- Selected item handoff.
- Selected source summary.
- Selected-items conversation state.
- Evidence panel scoped to selected items.
- Guard state for missing/expired selection.

### Design Impact

This breaks the mental model of scoped Ask.

The user believes they are asking across selected Library items, but the screen either has no selected-source evidence or falls into a generic conversation. That undermines one of AI Brain's central trust promises: Ask must make retrieval scope obvious.

## Related Gap: Add Tags And Add To Collection Are Not Wired

### Code Evidence

In `pages/DesktopLibrary.tsx`, the two actions are rendered as buttons:

- `Add tags`
- `Add to collection`

But neither has an `onClick` handler or supporting modal/drawer.

### Root Cause

The bulk organization actions were represented visually but not designed as complete interaction states.

### Design Impact

Once the visibility bug is fixed, users will discover actions that still do nothing. That is a second-order UX break.

## Recommended Fix

### Fix 1: Make Selection Bar Buttons Always Visible

Do not override `variant="secondary"` into a dark toolbar button through conflicting utility classes.

Preferred fix:

- Add a dedicated `toolbar` or `inverse` button variant to `components/ui/Button.tsx`.
- Use it for selection-bar actions on dark backgrounds.

Example variant:

```tsx
toolbar: 'bg-ink-800 text-white border-ink-700 hover:bg-ink-700'
```

Alternative technical fix:

- Use `twMerge` in the Button component so consumer classes override variant classes predictably.

Best design outcome:

- `Ask selected`: violet primary action.
- `Add tags`: visible inverse action with Tag icon.
- `Add to collection`: visible inverse action with Collection icon.
- `Delete`: visible destructive action.
- `Clear`: visible low-emphasis text or icon action with adequate contrast.

### Fix 2: Pass Selected Item Context Into Ask

The Library should pass selected IDs to Ask.

Prototype-friendly option:

```tsx
navigate(`/ask?scope=selected&items=${Array.from(selectedIds).join(',')}`)
```

Ask should parse `items`, look up the selected sources, and show:

- `Selected items` scope pill.
- Count, for example `1 selected source`.
- Source chips/cards for the selected items.
- Source quality summary.
- Weak-source warning if any selected item is `Metadata only`, `Preview only`, or `Needs upgrade`.

When the user submits a question, the prototype should route to a selected-items conversation, not hard-code `/ask/c1`.

Prototype-friendly option:

- Add a static selected-items conversation, for example `/ask/selected-review`.
- Or generate a temporary selected conversation state in `DesktopAsk`.

### Fix 3: Add Bulk Tag And Collection States

The `Add tags` and `Add to collection` actions need supporting interaction states.

Recommended web pattern:

- Keep the bulk selection bar.
- Open a right-side drawer or centered modal for each action.
- Show selected item count at the top.
- For Add tags:
  - search existing tags,
  - selected tag chips,
  - create new tag,
  - apply button.
- For Add to collection:
  - search collections,
  - existing collection list,
  - create new collection,
  - apply button.

## Acceptance Criteria

Selection bar:

- All bulk action labels are visible without hover.
- All bulk actions meet contrast requirements in normal, hover, and disabled states.
- The selection bar does not rely on hover for discoverability.
- The bar remains usable with one or many selected items.

Ask selected:

- Selecting item `1` and clicking `Ask selected` opens Ask with selected scope and that item visible.
- Ask does not fall back to an all-sources conversation.
- The selected source count and selected source quality are visible before the user asks.
- Submitting a selected-items question opens or displays a selected-items conversation.
- Evidence/citations are scoped to the selected sources.

Add tags / Add to collection:

- Both buttons are visible.
- Both buttons open a supporting modal or drawer.
- The modal/drawer shows selected item count.
- Apply/cancel states are clear.
- Empty states are handled.

## Recommended Magic Patterns Fix Prompt

Use a tightly scoped prompt against the web high-fidelity project:

```text
Fix the web Library bulk selection bar and selected-items Ask flow only.

1. Make all selection-bar actions visible without hover. Do not use conflicting secondary-button overrides on a dark bar. Add or use a dark-toolbar button style for Add tags and Add to collection. Keep Ask selected as violet, Delete as destructive, and Clear visible but low-emphasis.

2. Wire Ask selected so Library passes selected item IDs to Ask, for example /ask?scope=selected&items=1,5. Ask should parse selected item IDs, show a Selected items scope summary, selected item chips/cards, source count, and weak-source warning when relevant. Submitting a question should not route to an all-sources hard-coded conversation.

3. Add supporting bulk actions for Add tags and Add to collection. Each should open a modal or drawer with selected item count, existing options, create-new affordance, Apply, and Cancel.

Do not redesign unrelated screens. Preserve the AI Memory visual system, collapsible global nav, and collapsible Ask history sub-navigation.
```
