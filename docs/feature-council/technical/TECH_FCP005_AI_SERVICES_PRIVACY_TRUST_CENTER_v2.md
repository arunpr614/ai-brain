# Technical Plan FCP-005 AI Services And Privacy Trust Center v2

Status: v2 final planning package  
Review addressed: `reviews/FCP005_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## Recommended Architecture

Create a Trust Center data service that composes provider status, usage accounting, source readiness counts, backup/export config, diagnostics policy, and offline capability flags. Keep it read-mostly and cheap.

## Likely Affected Modules

- `src/app/settings/page.tsx`
- new `src/app/settings/trust/page.tsx`
- `src/lib/providers/status.ts`
- `src/lib/llm/*`
- `src/lib/embed/*`
- `src/db/settings.ts`
- `src/db/items.ts`
- `src/lib/review/attention.ts`
- `src/lib/errors/sink.ts`
- scripts for backup/export metadata if surfaced.

## Prerequisites

- Fix provider-aware `llm_usage` labels before cost UI.
- Centralize verified auth guard before new diagnostics/export endpoints.
- Decide enrichment worker mode for provider readiness messaging.
- Add deploy artifact check for migration file presence before Trust Center depends on new schema.

## Data / DTO

Trust Center DTO:

- `providerStatuses[]`
- `featureReadiness[]`
- `sourceHealthCounts`
- `dataFlowRows[]`
- `diagnosticsPolicy`
- `backupStatus`
- `exportCapabilities`
- `offlineCapabilities`
- `lastCheckedAt`

Avoid returning secrets or raw content.

## Diagnostics Policy

Implement an allowlist serializer for any support/diagnostic export. Deny by default. Unit-test forbidden patterns including token-like strings, URLs with query params, source excerpts, body text, claims, and prompts.

## Security / Privacy

- No provider keys exposed to client.
- No raw prompts/excerpts in logs.
- Data-flow copy generated from provider configuration, not static assumptions.
- Support bundles require preview and explicit user action.

## Test Plan

- Provider status DTO tests.
- Usage provider label tests.
- Diagnostics allowlist/denylist tests.
- Trust Center render tests for provider down/unconfigured/quota.
- Offline capability copy tests.
- Backup/export status tests.

## Rollout

1. Add read-only Trust Center using existing status providers.
2. Fix provider-aware usage accounting and expose cost only after validation.
3. Add diagnostics policy/export preview.
4. Link Source Health and Review counts.

## Rollback

Trust Center route can be hidden without changing capture/Ask behavior. Diagnostics export should be disabled independently if redaction fails.
