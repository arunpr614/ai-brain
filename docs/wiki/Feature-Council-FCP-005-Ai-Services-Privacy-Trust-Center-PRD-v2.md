# PRD FCP-005 AI Services And Privacy Trust Center v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP005_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-005-v1-Adversarial-Review)  
Council outcome: Proceed  
Priority: P0

## Review Response

v2 adds provider-specific data-flow requirements, diagnostics allowlist/denylist, usage-accounting prerequisite, and separate trust sections for AI readiness, privacy, offline, backup, and export.

## Goal

Create an honest Trust Center that explains what AI Brain can do right now, which providers are involved, what data may leave the app, what is backed up/exportable, and what diagnostics can safely include.

## User Problem

As AI Brain adds repair, contextual Ask, and evidence features, users need to understand why AI features are unavailable, what content goes to configured providers, and which privacy/offline claims are true.

## Target Users

- Owner/operator of the single-user AI Brain instance.
- Mobile and extension user troubleshooting capture/Ask.
- Future implementer planning provider or privacy-sensitive features.

## Scope

- AI Services readiness: generation, embeddings, transcript/recovery helpers if applicable.
- Provider data-flow matrix.
- Source readiness summary: full, weak, unindexed, stale, repaired.
- Diagnostics policy and export controls.
- Backup/export/offline status.
- Optional local analytics policy with opt-in only.

## Non-Goals

- Paywall/subscription.
- New provider integration.
- Enterprise compliance center.
- Claiming fully local AI when cloud providers are configured.

## Provider Data-Flow Matrix

| Provider/path | Potential data sent | User-facing copy requirement |
| --- | --- | --- |
| Generation provider | Ask question, selected/retrieved excerpts, system prompt context | State provider name/model and that prompts/excerpts may be sent. |
| Embedding provider | Text chunks or query text | State provider name/model and whether source text/query text is sent. |
| Capture metadata helpers | URL metadata or source identifiers | State source URL/metadata handling. |
| Telegram/extension/mobile transport | Captured content through configured app server | State transport path and auth mode. |
| Backups | SQLite database and artifacts | State destination, encryption, retention if configured. |

## Diagnostics Allowlist

Allowed by default:

- provider name/model
- status category
- error code
- counts
- timestamps
- feature/version identifiers
- redacted route names

Forbidden by default:

- raw item body
- source excerpts
- prompts/questions/claims
- transcript text
- raw URLs with query strings
- bearer/session tokens
- API keys
- personal file paths unless user explicitly exports support bundle

## User Journeys

1. User opens Trust Center and sees Claude generation down but Gemini embeddings available.
2. User asks why Evidence Scan is disabled and sees source/index/provider prerequisites.
3. User views privacy data flow for Ask and embeddings.
4. User exports diagnostics and sees a redaction preview.
5. User checks backups/export/offline limits without misleading local-only claims.

## Acceptance Criteria

- Provider readiness surfaces are driven by actual provider checks.
- Usage accounting is provider-aware before cost/monthly UI is exposed.
- Privacy copy names configured provider classes and data categories.
- Diagnostics export uses allowlist by default and preview before export.
- Offline state distinguishes fallback page, cached shell, queued capture, and offline library only if implemented.
- Backup/export states distinguish local backup, off-site backup, and user export.
- Trust Center links to Source Health, Review, and provider settings.

## Risks And Open Questions

- Should Trust Center live under Settings or replace portions of Settings? Recommendation: Settings -> Trust Center first.
- Should analytics exist at all? Defer; if added, must be opt-in and content-free.
- How often should provider status refresh? Avoid expensive checks on every render.
