# AI Memory Data, Content, And State Model

Created: 2026-06-13 21:57 IST

## Core Entities

### Source

Represents a saved item.

Required fields:

- `id`
- `title`
- `sourceType`
- `capturedVia`
- `quality`
- `savedDate`
- `capturedTime`
- `snippet`
- `offlineAvailable`
- `needsUpgradeReason`
- `url`
- `tags`
- `topicSlugs`
- `collectionIds`
- `metadata`

Source types:

- YouTube
- LinkedIn
- Substack
- PDF
- Manual note

Captured via:

- Telegram
- Android share
- Chrome extension
- Web capture
- PDF upload
- Web note

Quality:

- Full text
- Transcript
- Preview only
- Metadata only
- Needs upgrade

### Tag

User-managed or AI-suggested label.

Required fields:

- `id`
- `label`
- `slug`
- `provenance`
- `itemIds`

Provenance:

- Suggested by Brain
- Added by you
- Suggested by Brain, kept by you

Implementation name should use AI Memory, but provenance labels can be product-adjusted if needed.

### Included Topic

AI-detected concept in a source.

Required fields:

- `id`
- `label`
- `slug`
- `itemIds`
- `explanation`
- `evidence`
- `related`

Topics are not manually added from item detail.

### Collection

User-created grouping.

Required fields:

- `id`
- `label`
- `slug`
- `description`
- `itemIds`
- `provenance`

### Conversation

Ask history item.

Required fields:

- `id`
- `title`
- `lastQuestion`
- `updatedLabel`
- `group`
- `scope`
- `scopeItem`
- `itemId`
- `sourceCount`
- `weakWarning`
- `pinned`
- `messages`
- `citations`
- `attachedSources`

## Ask State

Ask state should track:

- Current input.
- Current route scope.
- Attached sources.
- Effective source scope.
- Messages.
- Loading state.
- Source warnings.
- Active sheet/modal.
- Loaded history conversation.

## Capture State

Capture state should track:

- Entry path.
- Source type.
- Captured via.
- Result status.
- Quality outcome.
- Duplicate candidate.
- Repair action availability.

## Privacy Settings State

Privacy controls that are not implemented should be:

- Disabled.
- Labeled `Coming soon`.
- Excluded from active success summaries.

Do not persist fake enabled privacy toggles in production state.
