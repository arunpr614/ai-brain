# YouTube Transcript Research

Research snapshot published on 2026-07-22. These artifacts evaluate open-source YouTube transcript retrieval and a local Chrome companion for AI Brain. They are decision records, not production authorization.

## Repository Landscape

- [Ranked GitHub repository landscape](./2026-07-22_10-32-45_IST_github_youtube_transcript_repository_landscape_v1.md)
- [105-repository inventory](./2026-07-22_10-32-45_IST_github_youtube_transcript_repository_inventory.csv)
- [Live adapter bakeoff](./2026-07-22_10-32-45_IST_youtube_transcript_live_adapter_bakeoff.csv)

## Chrome Companion

- [Chrome companion landscape and architecture](./2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md)
- [50-project Chrome companion inventory](./2026-07-22_11-05-48_IST_github_youtube_transcript_chrome_companion_inventory.csv)
- [Representative validation matrix](./2026-07-22_11-05-48_IST_github_youtube_transcript_chrome_companion_validation_matrix.csv)

## Decision

The preferred research architecture extends the existing Brain Manifest V3 extension with an explicit-click, `activeTab` plus `scripting`, visible-DOM transcript capture. It does not export cookies or browser credentials. Browser-mediated public transcript extraction remains disabled for production under the reviewed policy posture.
