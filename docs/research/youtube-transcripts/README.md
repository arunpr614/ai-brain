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
- [Post-planning verification and exact-item architecture addendum V2 final](./2026-07-22_18-23-41_IST_ai_brain_chrome_companion_post_planning_verification_v2_final.md)
- [Adversarial review of the verification addendum](./AI_BRAIN_CHROME_COMPANION_POST_PLANNING_VERIFICATION_ADVERSARIAL_REVIEW_2026-07-22_18-31-04_IST.md)
- [Current top-candidate snapshot](./2026-07-22_18-23-41_IST_github_chrome_companion_top_candidate_refresh.csv)

## Decision

The preferred research architecture extends the existing Brain Manifest V3 extension with explicit-click, `activeTab` plus `scripting`, visible-DOM transcript capture. The accepted exact-item UX also adds a tab-specific `sidePanel` and exact-origin external handoff; a popup-only version would not need `sidePanel`. It does not export cookies or browser credentials. Browser-mediated public transcript extraction remains disabled for production under the reviewed policy posture.
