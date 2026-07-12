# Telegram Capture

Purpose: Document the private-owner Telegram ingestion path.
Audience: AI agents and integration maintainers.
Verified against: `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: 2026-07-10 webhook boundary checks; content flows remain capability-specific.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Configured private integration

The webhook verifies its secret and restricts processing to the configured owner in a private chat. It durably claims update IDs before dispatch, silently ignores non-owner/non-private traffic, rate-limits failures, and routes supported URL/text/document inputs through the same capture helpers used by other clients. Replies report success, limited capture, duplicate, repair or retryable failure without creating a second data model.

This is not a public or multi-user bot. In-memory bad-secret/dedup state resets with the process, while claimed update IDs persist. Operational secrets, identifiers, and live commands remain private.

Primary files: Telegram webhook route, `src/lib/telegram/`, `src/db/telegram-updates.ts`, migration `011`, and tests.

## User journey and states

The configured owner sends text, URL or supported PDF in a private chat → webhook authenticates and durably claims update ID → dispatcher acknowledges/validates → shared capture helper saves or reports duplicate/limited/failure → bot edits/replies with item or repair guidance. Non-owner/non-private traffic is ignored; duplicate updates are idempotent; oversized/unsupported documents and provider/network failures are explicit.

Empty or unsupported messages produce no item. Loading/processing begins after acknowledgement and ends only with a canonical result or explicit retryable failure.

## Architecture, data, APIs, AI, and security

`src/app/api/telegram/webhook/route.ts` calls webhook handler/dispatch/client modules. `telegram_updates` records durable update state before capture writes the normal item/provenance/queue model. No model runs in the webhook itself; later enrichment follows configured provider policy. Webhook secret, owner/private-chat identity, bot credential and in-memory bad-secret/dedup limits form the boundary.

## Configuration, tests, operations, and impact

Private configuration supplies webhook/bot/owner data and rate limits; none belongs in public docs. Protecting tests: webhook route, `src/lib/telegram/client.test.ts`, `dispatch.test.ts`, `src/db/telegram-updates.test.ts` and migration `009` test, plus shared capture tests. Operational checks should validate unauthenticated rejection without logging content/secrets. Changes affect capture result wording, dedup, update claims, PDF limits, enrichment and review links. Pinned evidence: [current Telegram source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/telegram).

Related current features are shared capture, quality/repair, enrichment and API authentication boundaries. Related ideas include additional inbound channels; a public/multi-user bot is outside the current model.
