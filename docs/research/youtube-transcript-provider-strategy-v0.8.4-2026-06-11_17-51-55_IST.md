# YouTube Transcript Provider Strategy - v0.8.4

**Created:** 2026-06-11 17:51:55 IST  
**Branch:** `codex/v0.8.4-youtube-transcript-provider-resilience`  
**Context:** PR #3 shipped Review-focused recovery. v0.8.4 hardens provider behavior before adding heavier fallbacks.

## Evidence

- Local strict YouTube quality smoke on 2026-06-11 failed because YouTube timed-text returned HTTP `429` for known public transcript fixtures.
- Production post-deploy Telegram YouTube send/resend smoke on 2026-06-11 succeeded for save/review/requeue behavior, but automatic transcript recovery returned `youtube_antibot_metadata_only`.
- The product fallback is working: items are saved, weak captures are queued, duplicate resends requeue recovery, and `/review?focus=<itemId>` points to the exact item.

## Decision

Use the current InnerTube/timed-text provider path for v0.8.4, but wrap it with:

1. Structured provider events.
2. A global YouTube timed-text cooldown for `429` and anti-bot blocks.
3. Retry tuning that does not quickly convert provider-health issues into permanent manual-needed failures.
4. Bounded, dry-run-first backfill that respects the provider cooldown.

## Alternatives Deferred

- Alternate YouTube client contexts: defer until cooldown metrics show whether the current path is still consistently blocked.
- Browser-authorized transcript capture: promising, but needs a privacy and authorization design.
- Optional `yt-dlp`: useful as an operator fallback, but adds binary/deployment complexity.
- ASR fallback: defer because it is heavier, slower, and more expensive than provider control.

## Next Measurement

After v0.8.4 deploys, watch JSONL `transcript.provider` events for:

- `status_code=429`
- `error_code=youtube_antibot_metadata_only`
- cooldown duration and frequency
- transcript job queue volume
- success rate after cooldown expiry

If cooldowns dominate for several days, the next implementation path should be either alternate client contexts or a user-authorized browser capture flow.
