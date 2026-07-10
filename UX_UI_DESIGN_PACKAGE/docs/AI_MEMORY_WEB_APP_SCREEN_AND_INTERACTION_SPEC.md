# AI Memory Web App Screen And Interaction Spec

Created: 2026-06-13 21:57 IST

## Web Role

The web app is the deeper workbench for AI Memory. It is optimized for browsing, organizing, repairing, reading, asking, and settings management.

## Global Shell

Required:

- Collapsible left navigation.
- Primary destinations: Library, Ask, Settings.
- Capture entry point.
- Needs Upgrade entry point or alert.
- Current section active state.
- App identity as AI Memory.

Left navigation:

- Expanded: icons plus labels.
- Collapsed: icons only with tooltips.
- Must not consume full width permanently.

## Login And Pairing

Screens:

- Login.
- Unlock.
- Setup PIN.
- Pair device.
- Pairing code.
- Pairing success.
- Session expired.
- Server unreachable or offline fallback.

Implementation notes:

- Keep trust messaging sober.
- Do not claim end-to-end encryption.
- Use the logo on the first authentication surface.

## Library

Primary content:

- Search.
- Source type filters.
- Quality filters.
- Recent item list.
- Needs Upgrade signal.
- Multi-select.
- Bulk actions: Ask selected, Add tags, Add to collection, Delete, Clear.

Item row must show:

- Title.
- Source platform.
- Captured via.
- Source quality.
- Saved date.
- Offline/searchable state when relevant.

Selection behavior:

- Selected row state must be visible.
- Bulk toolbar actions must be visible without hover.
- `Ask selected` opens Ask with selected item scope.

## Needs Upgrade

Purpose:

- Explain weak captures without blaming the user.
- Offer repair actions.

Weak states:

- Metadata only.
- Preview only.
- Needs upgrade.
- Extraction failed.

Actions:

- Add text.
- Paste transcript.
- Retry capture.
- Open item.

## Item Detail

Layout:

- Main reading/content area.
- Right rail with separate cards.

Right rail cards:

- Source and capture details.
- AI Digest.
- Tags.
- Included topics.
- Collections.
- Related items.
- Item actions.

Source and capture details must include:

- Original source.
- Captured via.
- Captured date/time.
- Searchable.
- Offline availability.
- Last updated if available.

Tags:

- User-managed.
- Can be AI-suggested.
- User can add/remove tags.
- Tag pill click opens filtered Library.

Included topics:

- AI-detected from content.
- Clickable pills.
- No manual Add action.
- Click opens topic detail page.

Collections:

- User-managed groupings.
- Add/remove item from collections.
- Click opens collection detail page.

Focus/read mode:

- Open from item detail expand affordance.
- Hide normal right rail and secondary controls.
- Show readable content, source trust strip, exit control.
- Metadata-only and failed extraction items should show repair CTAs instead of empty reading mode.

## Ask

Web Ask must include:

- Main Ask workspace.
- Collapsible global left navigation.
- Collapsible Ask history sub-navigation.
- New conversation state.
- Conversation detail state.
- Source evidence and citations.
- Scope banner.
- Limited source warning.
- Selected item, topic, tag, and collection scopes.

Ask history:

- Is a second left-side sub-navigation.
- Can collapse and expand independently from global nav.
- Shows past conversations and metadata.

Answer behavior:

- Answers must show citations.
- Citations must match active scope.
- Warnings must appear if sources are limited.
- Source evidence should be inspectable.

## Capture

Capture entry points:

- Paste URL.
- Upload PDF.
- Write note.
- Paste text.
- Browser/extension flow representation.

Capture result states:

- Full text saved.
- Metadata only.
- Preview only.
- Updated existing.
- Duplicate candidate.
- Needs upgrade.

Each result must show:

- Status.
- Source platform.
- Captured via.
- Quality.
- Recommended next action.

## Topic Detail

Purpose:

- Explain why an AI-detected topic appears.
- List related Library items.
- Offer Ask this topic.
- Allow creating a tag from topic if user wants manual organization.

## Collection Detail

Purpose:

- Show collection description and items.
- Add/remove items.
- Ask collection.

## Settings

Settings must include:

- Account/device basics.
- Capture preferences.
- Data and privacy section.
- Disabled privacy controls labeled `Coming soon`.

Data/privacy truth:

- End-to-end encryption is not active.
- Do not show success copy that suggests privacy features exist.
- Coming-soon features should be disabled.
