# YT-01 YouTube Item Detail And Media Metadata

Created: 2026-06-14 07:40 IST
Status: Lightweight spec unless Arun makes it a major PRD
Classification: Partial

## Problem

YouTube capture has strong backend metadata and transcript/metadata fallback behavior, but item detail currently uses the generic item page. The design package includes YouTube item-detail screenshots and stronger media/source trust cues.

## Scope

- Visual/content treatment for YouTube items on web and Android/mobile.
- Thumbnail, duration, transcript quality, anti-bot warning, channel/author, source URL, captured via, and transcript state.
- No embedded player unless Arun explicitly wants it.

## Requirements

- Keep source trust strip visible.
- Surface transcript availability and warnings near the reading area.
- Metadata-only YouTube items must show repair/Needs Upgrade cues.
- Do not claim transcript recovery is solved; production handover says YouTube anti-bot blocks timed-text extraction in server environment.

## Acceptance Criteria

- YouTube full transcript and metadata-only examples look distinct.
- Ask warning appears for metadata-only YouTube.
- Repair action is visible for transcript failures.

## Open Questions

1. Should item detail include a video thumbnail/player, or keep source link only?
2. Should YouTube transcript operator state be visible to end users or ops only?
