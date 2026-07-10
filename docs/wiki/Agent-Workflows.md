# Agent Workflows

Purpose: Provide repeatable, safety-scoped playbooks for common AI Brain tasks.
Audience: AI agents and engineers implementing or debugging changes.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Common Opening

For every task:

1. Inspect worktree status and branch divergence.
2. Identify product, code, and runtime baseline.
3. Read the owning route/action, domain module, database module, and tests.
4. Check every planned command in [Command Safety](Command-Safety).
5. Preserve unrelated user changes and private data.

## UI Route Change

Trace page loaders, server actions, shared components, auth state, responsive behavior, and empty/error/loading states. Add focused tests where logic can be separated. Verify keyboard, mobile layout, private-data gating, and navigation.

## API Route Change

Trace authentication, API version, origin/content-type policy, input size/schema, service call, transaction boundaries, error redaction, and client callers. Confirm GET remains non-destructive. Update client and route tests together.

## Schema or Migration Design

Stop before execution. Compare both baseline migration trees and deployed schema evidence. The conflicting `017` migrations require a dedicated reconciliation. Design idempotency, rollback/forward repair, index cost, backup requirements, and compatibility before writing migration SQL.

## Capture Quality Debugging

Classify the stage: client attribution, URL/source normalization, deduplication, extraction, metadata, quality policy, artifact persistence, enrichment, or embedding. Reproduce with synthetic/public fixtures. Do not use private library URLs in reports.

## Ask/Retrieval Debugging

Inspect item body, enrichment state, chunks, embedding job, vector dimension/provider, scope, retrieved chunks, SSE frames, and citations in that order. Prompt changes are late-stage fixes, not the first response to missing retrieval evidence.

## Enrichment or Embedding Debugging

Separate queue claiming, provider request, generated-content writes, chunking, vector writes, and job finalization. Preserve successful enrichment when repairing embeddings. Backfills are W2 or W4 and require separate authorization.

## Android or Extension Debugging

Confirm client baseline, API version, pairing state, request attribution, reachability, and result handling. Keep native bridge logs free of credentials and payloads. Builds are W2 and device/public distribution has separate gates.

## Telegram Debugging

Use synthetic updates for schema, chat policy, idempotency, rate limiting, and dispatch tests. Live webhook changes or messages require current private context. Never expose webhook material.

## Recall Read-Only Debugging

Use static code, redacted local metadata, and existing public-safe reports. Do not call Recall, inspect the key, run a live diagnostic, apply, alter a checkpoint, or change scheduler state from this workflow. Escalate to the current private runbook.

## Documentation Update

Edit canonical `docs/wiki/`, update baseline/coverage/command registries, run privacy/structure/coverage checks, commit canonical docs, then publish through the concurrency-safe wiki process. See [Documentation Maintenance](Documentation-Maintenance).
