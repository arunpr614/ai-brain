# A10 Live Ask Provider Proof PRD V1

Created: 2026-06-16 14:30:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source blocker: A7 release packet live Ask/provider proof

## Problem

UX v2 cannot claim release readiness for Ask quality until the configured live AI provider and embedding provider are reachable and an Ask route/API path can produce a source-grounded answer with citations or a truthful provider-blocked state.

## Goal

Verify live provider reachability and, if providers are reachable, run a redacted live Ask smoke with evidence. If providers are not reachable, document the blocker clearly and keep production release blocked.

## Scope

- Check configured enrichment, Ask, and embedding providers.
- Check whether local Ollama or configured remote providers are installed/reachable.
- If provider checks pass, run live Ask against local synthetic fixtures and capture a redacted result.
- If provider checks fail, create a blocked QA report and tracker update.

## Acceptance Criteria

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A10-PROVIDER | Provider reachability is known. | `npm run check:ai-providers -- --warn-only` result is recorded. |
| A10-ASK | Live Ask answer is proven if providers are reachable. | Answer contains source-grounded content and citation UI/API evidence without raw secrets. |
| A10-BLOCKER | Failure is actionable if providers are unreachable. | QA report identifies missing tool/service/provider and keeps release blocked. |

## Non-Goals

- Changing provider configuration without explicit environment owner approval.
- Installing large model runtimes as part of release without a separate environment decision.
- Production deploy.
