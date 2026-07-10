# OPS-02 Transcript Fallback Strategy

Created: 2026-06-14 07:40 IST
Status: Research spec
Classification: Needs user decision

## Problem

Production YouTube timed-text transcript extraction is blocked by anti-bot behavior. More backfill will not solve transcript success by itself.

## Research Options

1. Alternate YouTube client/provider contexts.
2. Operator-only `yt-dlp` fallback.
3. Browser-authorized transcript capture.
4. ASR/audio transcription fallback.
5. Manual transcript paste as repair workflow.

## Guardrails

- Do not add `yt-dlp`, browser scraping, or ASR inside a small UX slice.
- Evaluate privacy, cost, dependencies, legal risk, and reliability before implementation.
- Keep current backfill runner dry-run-first.

## Acceptance Criteria For Research

- Options compared on success likelihood, privacy, cost, maintenance, and user experience.
- Recommended fallback has rollout and rollback plan.
- User explicitly approves before implementation.
