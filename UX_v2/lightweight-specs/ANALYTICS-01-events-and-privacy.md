# ANALYTICS-01 Events And Privacy

Created: 2026-06-14 07:40 IST
Status: Lightweight decision spec
Classification: Needs user decision

## Problem

The feature PRDs include analytics/events only where relevant, but AI Memory is a private personal app. Event tracking should not be assumed.

## Recommendation

Default to no product analytics. Use local operational logs only where they help debug capture, repair, Ask scope, or provider failures.

## Candidate Local Events If Approved

- Capture result state.
- Repair action and outcome.
- Ask scope kind and high-quality-only usage.
- Attachment added/removed.
- Android share result state.
- Offline/server unreachable events.

## Privacy Rules

- Do not log raw question text, source body, transcript text, full URLs, tokens, or secrets.
- Redact or hash item IDs if logs leave local storage.
- Prefer aggregate counters in local DB over third-party telemetry.

## Open Decision

Should AI Memory collect any UX events beyond existing operational logs?
