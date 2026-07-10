# YouTube Transcript Recovery and Single-Page Review Experience

Date: 2026-06-11

Status: research report and implementation recommendation

Trigger: Telegram saved a YouTube link but returned a metadata-only message: "Saved the YouTube link, but I could not read the transcript. To upgrade this item, send the same link again with the transcript or your notes pasted below it."

Example item: https://brain.arunp.in/items/92c2820748d88db388279085

## Executive recommendation

Do not try to make Telegram capture block until a transcript is guaranteed. The right product shape is:

1. Save the YouTube link immediately.
2. Tell the user Brain will keep trying in the background.
3. Queue a transcript recovery job.
4. Show all incomplete captures on one Review page.
5. Let the user manually paste notes/transcript only when automated recovery has genuinely failed.

The transcript recovery path should be a ladder:

1. Keep the current InnerTube/timed-text path as the fast first attempt.
2. Improve it with language-aware track selection, multiple track attempts, alternate InnerTube client contexts, and honest telemetry.
3. Add a batched retry worker that can re-run transcript extraction later.
4. Add `yt-dlp` as the first serious fallback for subtitles only, with no video download.
5. Add a browser/extension "save transcript from this YouTube page" path for videos where the logged-in browser can see the transcript UI.
6. Add audio transcription only as an explicit opt-in fallback because it is costlier, slower, and has copyright/privacy/terms risk.

The official YouTube Captions API is not a general solution for arbitrary public YouTube links. It can list caption tracks, but downloading captions requires OAuth authorization and permission to edit the video. Use it only for owned channels or future "connect my YouTube account" workflows, not for general Telegram saves.

## Current project state

Current capture path:

- Telegram URL handling is in `src/lib/telegram/dispatch.ts`.
- URL capture routes through `src/lib/capture/capture-url.ts`.
- YouTube detection calls `extractYoutubeVideo(videoId, originalUrl)` in `src/lib/capture/youtube.ts`.
- The extractor posts to InnerTube `/youtubei/v1/player` using an Android client context.
- It reads `player.captions.playerCaptionsTracklistRenderer.captionTracks`.
- It currently uses `tracks[0]?.baseUrl`.
- It fetches the timed-text XML and parses `<timedtext><p t="ms" d="ms">...`.
- Success is stored as `capture_quality = "metadata_plus_transcript"`.
- Failures are stored as `capture_quality = "metadata_only"` with warnings such as `no_transcript`, `youtube_transcript_fetch_metadata_only`, or `youtube_antibot_metadata_only`.

Current Telegram acknowledgement:

- For YouTube metadata-only captures, `captureAckMessage()` tells the user the link was saved but transcript extraction was blocked or unavailable.
- This is honest, but it makes the user responsible for recovery too early.

Current UI:

- Library and item detail already show capture quality and YouTube transcript warnings.
- The phase2 root sidebar has a disabled `/review` item, which is exactly the right destination to activate for this work queue.
- Item detail has a Capture panel, but no transcript recovery status, retry button, or paste-transcript flow.

Current batch precedent:

- The project already has a SQLite-backed `enrichment_jobs` queue and a worker in `src/lib/queue/enrichment-worker.ts`.
- It also has cron registration in `src/lib/queue/enrichment-batch-cron.ts`.
- Transcript recovery should reuse this pattern instead of inventing a new operational model.

Empirical check on 2026-06-11:

```text
npm run smoke:youtube:quality

fixture: jNQXAC9IVRw
name: Me at the zoo
ok: false
capture_quality: metadata_only
extraction_warning: youtube_transcript_fetch_metadata_only
reason observed from extractor body: Timed-text returned 429
```

This matters because `jNQXAC9IVRw` is the known public smoke fixture. The extractor is not merely failing on one obscure video; the current fast path can be rate-limited on a canonical public-caption case.

Also observed locally:

```text
yt-dlp not found
```

So `yt-dlp` is not currently installed in the local environment and would need an explicit dependency/ops decision.

## Why the current experience feels broken

The user did the right thing: send a YouTube link to Telegram. Brain did the safe thing: saved the item instead of dropping it. The experience still feels broken because the next step is pushed back onto the user:

- The bot says "send the same link again with transcript or notes."
- The item page is metadata-only.
- There is no obvious single place to see all weak captures.
- There is no "retry transcript now."
- There is no "try again tonight."
- There is no durable status like "queued", "retrying", "blocked", or "manual help needed."

This is a workflow problem as much as an extraction problem.

## Research findings

### Official YouTube Data API

The YouTube Data API has useful metadata signals, but it is not a general transcript download API for arbitrary videos.

Relevant docs:

- [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) returns caption track metadata for a video, but the response does not contain the actual captions. The docs say `captions.download` is the method that retrieves the track.
- [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) downloads a caption track, costs 200 quota units, requires OAuth scopes, and requires the user to have permission to edit the video.
- [`videos.contentDetails.caption`](https://developers.google.com/youtube/v3/docs/videos) only indicates whether captions are available with `true` or `false`.

Implication:

- Use `videos.list` as a cheap "captions exist" signal if API quota and key are available.
- Do not expect `captions.download` to work for random public videos saved through Telegram.
- Keep the existing Data API metadata fetch for title, description, duration, thumbnail, and published date.

### Current InnerTube timed-text path

This is still the best first attempt because it is already implemented and can succeed quickly without new services.

Problems to fix:

- It tries only the first caption track.
- It does not rank manual captions over auto-generated captions.
- It does not rank preferred languages.
- It does not try alternate formats such as `json3`, `vtt`, or track URL variants.
- It does not distinguish "no captions exist" from "captions exist but timed-text fetch got rate-limited."
- It returns metadata-only immediately without scheduling recovery.

Recommended upgrades:

- Parse richer caption track fields: `languageCode`, `name`, `kind`, `isTranslatable`, `vssId`.
- Prefer manual transcript in preferred languages first.
- Then generated transcript in preferred languages.
- Then translatable transcript translated to English if available.
- Try more than one track before giving up.
- Store the failed provider, status code, and selected track metadata as artifacts.
- Add backoff when YouTube returns 429.

### youtube-transcript-api

[`youtube-transcript-api`](https://github.com/jdepoix/youtube-transcript-api) is a Python library that retrieves YouTube transcripts/subtitles, including auto-generated subtitles, without an API key or a headless browser. It can list available transcripts, distinguish generated/manual transcripts, and access YouTube translation.

Pros:

- Purpose-built for the exact transcript use case.
- Better language/transcript abstraction than the current hand-rolled `tracks[0]` path.
- Easy to test from a sidecar script.

Cons:

- Python dependency in a TypeScript/Next app.
- Unofficial YouTube surface; it can break or face request blocking.
- The project documentation includes guidance for IP bans, which is a signal that reliability has operational concerns.

Recommendation:

- Use it only as a spike or optional fallback if `yt-dlp` is too heavy.
- Do not add it as the first production fallback until it is benchmarked against a 50 to 100 video fixture set.

### yt-dlp subtitle-only fallback

[`yt-dlp`](https://github.com/yt-dlp/yt-dlp) is a mature downloader/extractor. Its README documents subtitle options including `--write-subs`, `--write-auto-subs`, `--list-subs`, and language selection with `--sub-langs`.

This should be the first serious fallback after the built-in InnerTube path.

Recommended command shape:

```bash
yt-dlp \
  --skip-download \
  --write-subs \
  --write-auto-subs \
  --sub-langs "en.*,en,hi.*,hi,all,-live_chat" \
  --sub-format "json3/vtt/srv3/srv2/srv1/best" \
  --no-playlist \
  --sleep-subtitles 1 \
  --output "/tmp/brain-youtube-%(id)s.%(ext)s" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

Operational notes:

- Install explicitly and pin the chosen distribution channel.
- Prefer subtitle-only. Do not download video/audio for normal recovery.
- Run with a timeout and temp working directory.
- Capture stdout, stderr, exit code, output filenames, and selected language as artifacts.
- Treat 429 and extractor failures as retryable, not permanent.
- The yt-dlp README notes that stable releases can become stale when sites change and recommends nightly for regular users. That implies an ops decision: either pin stable and accept breakage, or use a controlled update process.

Recommendation:

- Add `yt-dlp` as Phase C fallback after the queue exists.
- Use it only in the background worker, not inline in Telegram capture.

### YouTube.js / youtubei.js

[`YouTube.js`](https://github.com/LuanRT/YouTube.js/) is a JavaScript client for YouTube's internal API, InnerTube. It is in the same ecosystem as the current approach, but wraps more of the moving target.

Pros:

- TypeScript-friendly.
- Same runtime family as the current app.
- Could reduce hand-rolled InnerTube parsing.

Cons:

- Still unofficial.
- May add a broad dependency for one use case.
- Does not remove the need for queueing, retries, or fallback behavior.

Recommendation:

- Consider it if the current hand-rolled InnerTube code grows beyond a small provider module.
- Do not use it as a substitute for the batch recovery design.

### Browser or extension transcript capture

This is probably the most user-friendly manual fallback.

If the user opens the YouTube page in their browser and the transcript panel is visible, the extension can read the transcript text from the DOM and send it to Brain as an upgrade.

Pros:

- Uses the user's own browser session and visible UI.
- No server-side bot/crawler behavior.
- Works naturally when YouTube shows transcript to the user but blocks the server.
- Great fit for a "Fix from current page" button.

Cons:

- Requires browser extension capability.
- Not batched unless the browser is open and user initiates it.
- YouTube DOM can change.

Recommendation:

- Add this after the server-side queue and `yt-dlp` fallback.
- It should be presented as a manual assist: "Open video and save visible transcript."

### Audio transcription fallback

Audio transcription is the most powerful fallback but should not be default.

OpenAI Speech-to-Text docs list transcription models including `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`, with audio uploads limited to 25 MB for the transcription API. Google Cloud Speech-to-Text supports asynchronous recognition for long audio, with an upper limit of 480 minutes and Cloud Storage input for batch recognition.

Relevant docs:

- [OpenAI Speech to Text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Google Cloud Speech-to-Text batch recognition](https://cloud.google.com/speech-to-text/docs/batch-recognize)
- [Google Cloud Speech-to-Text quotas](https://cloud.google.com/speech-to-text/docs/quotas)

Pros:

- Works even when no captions exist.
- Can recover lectures, interviews, and podcasts.

Cons:

- Requires audio acquisition, which is a bigger policy/terms/privacy surface.
- Costs more.
- Slower.
- OpenAI's Batch API is not currently the direct answer for audio transcription; it is useful for later summarization/classification jobs, but the published Batch API guide does not list audio transcription as a supported batch endpoint.
- Google batch transcription requires putting audio in Cloud Storage.

Recommendation:

- Make ASR an explicit opt-in per item or per setting: "Use paid audio transcription when captions are unavailable."
- Default it off.
- Store provenance clearly: generated from audio, model, language, timestamp, cost estimate.

## Recommended product experience

### Telegram message

Current product meaning:

> Saved, but you need to send the transcript yourself.

Recommended product meaning:

> Saved. Brain will keep trying the transcript in the background. If it still cannot recover it, it will appear in Review.

Suggested copy:

```text
Saved YouTube link: {title}
Transcript is queued for background recovery.
Review or add notes: https://brain.arunp.in/review?focus={itemId}
```

If the first attempt already gets transcript:

```text
Saved YouTube video with transcript: {title}
{itemUrl}
```

If captions truly appear unavailable after retries:

```text
Saved YouTube link: {title}
No captions were found after retrying. You can add notes or paste a transcript from Review:
https://brain.arunp.in/review?focus={itemId}
```

### Review page

Turn `/review` into the single place for incomplete captures.

Recommended lanes:

- Needs transcript: YouTube metadata-only items with no active recovery job.
- Retrying: queued/running transcript jobs.
- Needs manual help: retry-exhausted items where captions are unavailable or access is blocked.
- Weak captures: LinkedIn metadata-only, Substack paywall previews, short article captures.
- Ready: recently upgraded items, so the user sees the system working.

Each row should show:

- Title, source, captured date.
- Capture quality.
- Failure reason in human language.
- Last attempt time.
- Next retry time.
- Provider attempted.
- Buttons: Retry now, Paste transcript/notes, Open source, Ignore, Delete.

This page should avoid blame language. The user saved something; Brain is doing recovery work.

### Item page

Add a Transcript Recovery panel for YouTube metadata-only items:

- Status: queued, running, blocked, captions unavailable, recovered, manual transcript added.
- Last provider: InnerTube, yt-dlp, browser extension, manual, ASR.
- Last error: human-readable message.
- Next retry time.
- Retry now button.
- Paste transcript/notes button.
- Open YouTube source button.

### Library

Keep the existing small warning badges, but make them clickable to Review:

- `no transcript` -> `/review?focus={itemId}`
- `metadata only` -> `/review?focus={itemId}`
- `paywall preview` -> `/review?focus={itemId}`

## Recommended data model

Add a transcript-specific queue table instead of overloading `enrichment_jobs`.

```sql
CREATE TABLE IF NOT EXISTS transcript_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  video_id TEXT,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'running', 'done', 'error', 'manual_needed', 'ignored')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  provider TEXT,
  last_error TEXT,
  last_status_code INTEGER,
  next_run_at INTEGER,
  claimed_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_state_next_run
  ON transcript_jobs(state, next_run_at, priority, created_at);
```

Add item-level status fields only if the UI needs fast reads:

```sql
ALTER TABLE items ADD COLUMN transcript_status TEXT;
ALTER TABLE items ADD COLUMN transcript_provider TEXT;
ALTER TABLE items ADD COLUMN transcript_attempted_at INTEGER;
ALTER TABLE items ADD COLUMN transcript_next_retry_at INTEGER;
ALTER TABLE items ADD COLUMN transcript_failure_reason TEXT;
```

Alternative: derive status from `transcript_jobs` and artifacts to avoid widening `items`. Given this codebase already has several source-specific nullable fields, deriving from a queue table is cleaner.

## Worker design

Use the same mental model as the enrichment worker:

1. On YouTube capture insert, if `capture_quality = "metadata_only"`, enqueue `transcript_jobs`.
2. Worker polls pending jobs.
3. Worker atomically claims one job.
4. Worker runs provider ladder.
5. On success:
   - Update item body/title/metadata with transcript.
   - Set `capture_quality = "metadata_plus_transcript"` or `user_provided_full_text` for manual upgrades.
   - Clear transcript warning.
   - Save artifacts.
   - Requeue enrichment and embeddings, because the body changed materially.
6. On retryable failure:
   - Increment attempts.
   - Set `next_run_at` with exponential backoff.
   - Keep state pending.
7. On terminal failure:
   - Set `manual_needed`.
   - Surface in Review.

Backoff suggestion:

```text
attempt 1: immediately after capture
attempt 2: +15 minutes
attempt 3: +2 hours
attempt 4: next nightly batch
attempt 5: next nightly batch
then: manual_needed
```

Why not only daily?

- Immediate background retry keeps common transient failures invisible to the user.
- Nightly retry catches rate limits and temporary YouTube breakage.
- The Review page keeps the user in control.

## Provider ladder

Recommended first implementation:

```text
provider 1: innertube-current
provider 2: innertube-alt-client
provider 3: innertube-alt-track-language
provider 4: yt-dlp-subtitles
provider 5: manual-browser-transcript
provider 6: opt-in-audio-asr
```

Provider behavior:

- `innertube-current`: current implementation, but no longer final.
- `innertube-alt-client`: try a small curated set of client contexts, for example Android, iOS, Web, TV HTML5. Keep this behind a module so it can be changed quickly.
- `innertube-alt-track-language`: select and try tracks by quality/language instead of `tracks[0]`.
- `yt-dlp-subtitles`: background-only fallback, subtitle-only, with timeout.
- `manual-browser-transcript`: extension/user-session assisted.
- `opt-in-audio-asr`: only when user has opted in.

## Language strategy

Default preference order:

1. User preferred language if known.
2. English manual captions.
3. English generated captions.
4. Hindi/manual or other configured languages if the user wants them.
5. Any manually created caption track.
6. Any generated caption track.
7. Machine-translated English when the provider supports translation.

Store:

- Original transcript language.
- Whether it was manual, generated, translated, browser-captured, or ASR-generated.
- Provider and retrieval time.

Do not silently translate without marking it.

## Implementation plan

### Phase A: UX and state clarity

Scope: small, high impact.

Changes:

- Update Telegram metadata-only YouTube copy to say background recovery is queued.
- Add Review link to the Telegram acknowledgement.
- Add a transcript recovery status component on item detail.
- Enable `/review` in sidebar when the page exists in the active branch.

Acceptance criteria:

- A metadata-only YouTube capture no longer tells the user to manually paste transcript as the first step.
- User can click one link and see the item in Review.
- Existing full-transcript captures still get a normal success message.

### Phase B: Transcript queue with current extractor

Scope: core reliability.

Changes:

- Add `transcript_jobs` migration.
- Add enqueue-on-metadata-only behavior for YouTube.
- Add transcript worker and cron.
- Add retry/backoff.
- Add "Retry now" action.
- When recovery succeeds, update item content and requeue enrichment/embedding.

Acceptance criteria:

- Metadata-only YouTube item creates a transcript job.
- Failed timed-text 429 becomes retryable.
- Review shows queued/running/error state.
- Successful transcript upgrade changes `capture_quality` to `metadata_plus_transcript`.

### Phase C: Improve InnerTube provider and add yt-dlp fallback

Scope: real extraction improvement.

Changes:

- Rank caption tracks by language and manual/generated status.
- Try multiple tracks before failure.
- Try a small list of client contexts.
- Add optional `yt-dlp` provider.
- Add provider benchmark script using a fixture list.

Acceptance criteria:

- Known public videos with captions succeed above current baseline.
- `jNQXAC9IVRw` no longer stays terminal on a single timed-text 429.
- Provider attempts are stored as artifacts.
- Worker does not download video/audio in normal subtitle fallback mode.

### Phase D: Browser/extension assisted transcript save

Scope: user-assisted reliability.

Changes:

- Add extension action: "Save visible YouTube transcript to Brain."
- Send transcript with item URL/video ID.
- Use existing weak-capture upgrade path.

Acceptance criteria:

- User can open a YouTube video, reveal transcript, and upgrade the Brain item without copy/paste.
- Review item status changes to recovered/manual browser transcript.

### Phase E: Opt-in ASR fallback

Scope: optional power feature.

Changes:

- Add setting: "Use paid audio transcription when captions are unavailable."
- Add per-item action.
- Add cost/size guardrails.
- Store provider provenance and estimated cost.

Acceptance criteria:

- Disabled by default.
- User sees clear consent before audio is downloaded/transcribed.
- Long videos are chunked or routed to a long-audio provider.

## Files likely touched

Likely implementation files:

- `src/lib/capture/youtube.ts`
- `src/lib/capture/capture-url.ts`
- `src/lib/telegram/dispatch.ts`
- `src/db/migrations/014_transcript_jobs.sql`
- `src/db/transcript-jobs.ts`
- `src/lib/queue/transcript-worker.ts`
- `src/lib/queue/transcript-cron.ts`
- `src/instrumentation.ts`
- `src/app/review/page.tsx`
- `src/lib/review/attention.ts`
- `src/app/items/[id]/page.tsx`
- `src/components/sidebar.tsx`
- `scripts/smoke-youtube-quality.mjs`
- New provider benchmark script under `scripts/spikes/`

Tests to add/update:

- YouTube track ranking unit tests.
- Timed-text 429 classified as retryable.
- Telegram ack copy for queued transcript recovery.
- Transcript job enqueue on metadata-only YouTube capture.
- Worker success updates item and requeues enrichment.
- Review page lists transcript jobs by status.
- "Retry now" action transitions failed/manual-needed item back to pending.

## Risks and policy notes

YouTube internal endpoints:

- InnerTube and timed-text are unofficial surfaces and can change.
- 429/rate limiting must be normal operational input, not an exception that ends the workflow.

yt-dlp:

- Very practical, but still depends on YouTube extraction behavior.
- Needs binary/package management.
- Stable channel can lag site changes; update strategy matters.

Audio transcription:

- Highest coverage, highest risk.
- Requires audio retrieval.
- Has cost and privacy implications.
- Should require explicit opt-in.

Official API:

- Useful for metadata and caption-availability signal.
- Not sufficient for downloading arbitrary public captions.

## Final recommendation

Build the async transcript recovery queue and Review page first. Do not start with audio transcription and do not depend on the official captions download API for arbitrary public videos.

The best next engineering step is Phase B with the current extractor:

1. Add `transcript_jobs`.
2. Enqueue YouTube metadata-only captures.
3. Retry timed-text failures with backoff.
4. Show all of this on `/review`.
5. Change Telegram copy so the user sees "queued for recovery" instead of "you must paste the transcript."

Once that loop exists, add smarter providers. The provider ladder can evolve, but the product loop should be stable: save first, recover in background, review in one place, ask the user only when automation is exhausted.

## Source links

- YouTube Data API `captions.list`: https://developers.google.com/youtube/v3/docs/captions/list
- YouTube Data API `captions.download`: https://developers.google.com/youtube/v3/docs/captions/download
- YouTube Data API videos resource and `contentDetails.caption`: https://developers.google.com/youtube/v3/docs/videos
- youtube-transcript-api: https://github.com/jdepoix/youtube-transcript-api
- yt-dlp subtitle options: https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#subtitle-options
- YouTube.js: https://github.com/LuanRT/YouTube.js/
- OpenAI Speech to Text: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI Batch API: https://developers.openai.com/api/docs/guides/batch
- Google Cloud Speech-to-Text batch recognition: https://cloud.google.com/speech-to-text/docs/batch-recognize
- Google Cloud Speech-to-Text quotas: https://cloud.google.com/speech-to-text/docs/quotas
