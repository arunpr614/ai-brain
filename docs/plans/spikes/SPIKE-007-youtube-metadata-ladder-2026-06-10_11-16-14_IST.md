# SPIKE-007 — Does YouTube Need A Rich Metadata Ladder?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-007 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 4-6h; actual about 35m in partial mode |
| **Triggered by** | YouTube/Shorts capture quality recommendation |
| **Blocks** | YouTube Data API decision, Shorts metadata body design |
| **Verdict** | PROCEED-WITH-CHANGES |

## Question

Does YouTube Data API metadata materially improve Brain's YouTube and Shorts captures beyond the current InnerTube timed-text extractor plus oEmbed fallback?

## Method

Created spike script:

```text
scripts/spikes/youtube-metadata-ladder.mjs
```

Ran against 5 normal YouTube videos and 5 Shorts from:

```text
data/spikes/capture-quality/fixtures.json
```

For each fixture, the script attempted:

1. Current Brain capture.
2. YouTube oEmbed.
3. YouTube Data API `videos.list` if `YOUTUBE_DATA_API_KEY` is present.
4. Three body candidates:
   - `current_capture`
   - `metadata_header_plus_current_body`
   - `metadata_only`

Evidence file:

```text
data/spikes/capture-quality/results/youtube-metadata-ladder-2026-06-10_11-10-33.jsonl
```

Official docs checked:

- YouTube `videos` resource includes useful `snippet`, `contentDetails`, `status`, `statistics`, and `player` fields: https://developers.google.com/youtube/v3/docs/videos
- YouTube quota docs state API requests cost at least one quota point: https://developers.google.com/youtube/v3/determine_quota_cost

## Evidence

`YOUTUBE_DATA_API_KEY` was not set, so this spike ran in partial mode.

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Current capture | 10 | 0 | 2.70 | 8,233 |
| Metadata header + current body | 10 | 0 | 2.70 | 8,341 |
| Metadata only | 10 | 0 | 2.00 | 106 |

Current capture row highlights:

| Fixture | Platform | Score | Quality | Body Chars | Transcript Timestamps | Warning |
|---|---|---:|---|---:|---:|---|
| `yt-public-original` | video | 2 | metadata_only | 259 | 6 | none |
| `yt-user-reported-1` | video | 1 | transcript | 1,135 | 25 | none |
| `yt-user-reported-2` | video | 5 | transcript | 15,511 | 342 | none |
| `yt-user-reported-3` | video | 5 | transcript | 44,248 | 966 | none |
| `yt-substack-related` | video | 5 | transcript | 13,249 | 293 | none |
| `short-beginner-guide` | Short | 5 | transcript | 4,271 | 94 | none |
| `short-phone-posting` | Short | 1 | transcript | 1,187 | 26 | none |
| `short-playlist` | Short | 1 | transcript | 1,057 | 24 | none |
| `short-name-handle` | Short | 1 | transcript | 926 | 23 | none |
| `short-public-service` | Short | 1 | transcript | 490 | 11 | none |

All 10 oEmbed calls returned HTTP 200. Data API calls were skipped because no key was configured.

## Findings

The current extractor can now save all sampled YouTube/Shorts links, which is a major improvement over the original failure mode.

However, Shorts remain weak even when transcript extraction technically succeeds. Many Shorts have short, low-context transcripts. A metadata-only body built from oEmbed alone is too shallow: title/channel is useful as a bookmark, not enough for deep recall.

The Data API could still be worthwhile, but this spike could not prove it without a key. The official API exposes exactly the fields that would help weak Shorts and no-transcript videos: description, publish time, duration, caption status, privacy/embeddable status, thumbnails, statistics, and tags.

The small metadata header assembled from current/oEmbed fields did not move the average score because it added only about 108 characters per item. That means "metadata enrichment" needs real description/published/tag/status fields, not just title/channel duplication.

## Implementation Recommendation

Proceed with YouTube metadata work, but in two steps:

1. Implement a structured YouTube body builder using fields Brain already has:
   - title
   - channel
   - duration
   - transcript status
   - source URL
   - extraction warning

2. Add optional YouTube Data API only if the user provides `YOUTUBE_DATA_API_KEY`.
   - Use it as an enrichment layer, not a hard dependency.
   - Cache metadata artifacts.
   - Keep oEmbed as anti-bot fallback.
   - Respect quota and graceful fallback.

Likely files:

```text
src/lib/capture/youtube.ts
src/lib/capture/youtube-metadata.ts
src/lib/capture/youtube-body.ts
src/lib/capture/youtube.test.ts
.env.example
scripts/smoke-youtube-prod.mjs
```

## Risks / Gaps Surfaced

- No Data API key was available, so the official API value remains partially unvalidated.
- The Shorts fixture set used public examples, not the user's actual future Shorts.
- Current scoring treats short transcripts harshly; that is probably correct for deep Ask quality, but the UI should still show them as saved successfully.
- Anti-bot behavior was not reproduced during this local run.
