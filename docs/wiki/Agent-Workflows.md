# Agent Workflows

Purpose: Provide repeatable, safety-scoped playbooks for common AI Brain tasks.
Audience: AI agents and engineers implementing or debugging changes.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22 at deployed protected-main application `167a15d57b8f70574a017ea4cda507870f3600d4`; workflow runtime evidence is task-specific.
Last reviewed: 2026-07-22.
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

Stop before execution. Current main contains both historical `017` migrations and applies them by full filename. Do not rename, renumber, merge, or assume numeric-prefix uniqueness. Design idempotency, rollback/forward repair, index cost, backup requirements, and compatibility before writing migration SQL.

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

## NotebookLM Read-Only Debugging

Start from the current rollout tuple, Settings/item safe status, redacted server state, connector load/pair state, and immutable release identity. Keep capture-bearer and scoped-connector auth distinct. The public entry/sign-in URL is `https://notebooklm.google/`; the signed-in app and optional permission use `https://notebooklm.google.com/`. Never expose the notebook URL, account route, target/source IDs, marker, token, session material, private content, or raw provider response/error.

Production is UI-only `1:0:0`; queue/provider writes are off and no extension pairing, target bind, source, or signed-in canary is proven. Do not enable a flag, grant permission, bind/rebind, create/retry/delete a source, clear a duplicate-risk latch, or treat a read-only diagnostic as canary authority. A provider-write canary requires the separately reviewed owner-only private synthetic matrix and an immediate stop on authentication/security friction or protocol/privacy uncertainty.

## Documentation Update

Edit canonical `docs/wiki/`, update baseline/coverage/command registries, run privacy/structure/coverage checks, commit canonical docs, then publish through the concurrency-safe wiki process. A local canonical edit is not publication evidence; verify the remote Wiki separately after merge. See [Documentation Maintenance](Documentation-Maintenance).
