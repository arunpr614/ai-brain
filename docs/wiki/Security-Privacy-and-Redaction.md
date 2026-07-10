# Security, Privacy, and Redaction

Purpose: Document authentication, trust boundaries, sensitive-data handling, and public documentation rules.
Audience: AI agents and engineers touching auth, integrations, logs, or operations.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-06-17 for tied security evidence; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Authentication Layers

- Browser sessions use the single-user PIN/session model.
- Remote clients use bearer authentication.
- Pairing exchanges short-lived codes for the existing client credential.
- API version checks prevent incompatible clients from silently mutating state.
- Origin policy constrains browser-originated requests.
- Telegram verifies webhook authenticity and applies chat policy before dispatch.

Pinned source: [session auth](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/auth.ts), [bearer auth](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/auth/bearer.ts), [API version](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/auth/api-version.ts), and [redaction](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/security/redaction.ts).

## Sensitive Data

Library content, captured URLs, transcripts, Recall card data, chat messages, provider payloads, session values, client credentials, webhook material, private evidence, and production identifiers are sensitive. Error handling and diagnostics should minimize content, redact token-like strings, and avoid persisting raw provider responses.

Attached My notes are private application data but are not end-to-end encrypted. Note responses are authenticated and private/no-store; browser mutations require exact same origin. Default library export excludes notes. Remote note processing requires an acknowledgement fingerprinted to the provider, destination, purpose, and effective model; only parsed loopback Ollama is considered local.

Deletion has a broader boundary than deleting the current note row: FTS, semantic chunks/vectors, recent versions, queued work, and assistant answers proven to cite the note are cleaned up. Backup retention and already-started remote requests remain explicit residual limits.

## Public Documentation Denylist

Do not publish:

- Credential or environment values.
- Bearer, session, cookie, bot, webhook, private-key, or signed-link material.
- Exact dangerous approval text.
- Private Recall titles, URLs, IDs, samples, chunks, or reports.
- Live host, SSH, tunnel, DNS, account, or private path identifiers.
- Executable deploy, restore, migration, backfill, key, scheduler, checkpoint, or production-write instructions.
- Screenshots or logs containing private library or operational data.

The public privacy scanner detects common secret shapes and redacts its own findings. Pattern matching is defense in depth; a human semantic review remains required before publication.

## Private Runbooks

Private owner runbooks live outside the repository and synced workspace. They are single-machine by design and use owner-only permissions. They do not contain raw key values. If unavailable, sensitive operations stop.

## Security Failure Modes

- UI reveals private counts before session validation.
- Client bridge logs capture credentials or user payloads.
- Error messages preserve provider secrets or signed links.
- A write route accepts destructive GET requests.
- Pairing codes remain valid too long or can be reused.
- Public evidence contains operational identifiers even without a raw key.

Security changes require focused tests plus a review of logs, screenshots, evidence files, and public documentation output.
