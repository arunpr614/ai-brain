# Troubleshooting

Purpose: Map symptoms to safe diagnostic areas without exposing production-write instructions.
Audience: AI agents and engineers diagnosing AI Brain.
Verified against: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-12 at deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`; current diagnosis remains evidence-specific.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

## Safe Local Baseline

```bash
git status --short --branch
npm run typecheck
npm run lint
npm test
```

Do not broaden into builds, live probes, backfills, deploys, restores, migrations, or Recall operations without checking [Command Safety](Command-Safety).

## Symptom Guide

| Symptom | Inspect first | Common causes | Stop condition |
|---|---|---|---|
| App will not start | Node version, dependency state, build/runtime logs | Wrong Node ABI, missing build, SQLite native module mismatch | Production runtime involved |
| Setup or unlock fails | session auth tests and settings DB | stale cookie, PIN state, secret/config mismatch | Private session material would be exposed |
| Pairing fails | code creation/exchange, expiry, API version | expired/used code, wrong runtime, client mismatch | Credential display or logs required |
| Capture fails | route validation and capture stage | unsafe URL, extraction error, unsupported payload | Private source would enter evidence |
| Item is metadata-only | quality warning, artifact/cache, extractor | protected/dynamic page, transcript unavailable | Live/private refetch required |
| Enrichment is stuck | queue state, claim/attempt/error | worker unavailable, provider timeout, stale running job | Reset/backfill proposed |
| Embeddings are missing | enrichment completion, embedding job, vector dimension | provider unavailable, dimension mismatch, partial write | Persistent backfill proposed |
| Search misses an item | FTS projection, chunks, scope, vector rows | unindexed content, scope filter, stale vector state | Production DB inspection required |
| Processing is unavailable | read/write/navigation flags, readiness checkpoint, audit timer, migration/config identity | staged flag order, stale/red checkpoint, migration hash/config mismatch | Live flag/audit mutation proposed |
| Processing action conflicts or is unknown | current item version, mutation outcome, actor-tab Undo slot | stale tab, lost response, replay after later mutation, expired/superseded Undo | Manual DB edit proposed |
| Ask has weak/no citations | retrieval chunks, SSE, citation parser | weak capture, missing vectors, malformed model markers | Private answer/source would be logged |
| Recall status is stale | local redacted status, timer metadata, latest report | scheduler failure, lock, policy block, no new cards | Live call or write is required |
| Telegram rejects updates | webhook auth result, schema, chat policy, idempotency | secret mismatch, non-private chat, duplicate update | Live webhook material required |
| Android share fails | reachability, pairing, MIME/content, attribution, result | stale client, expired auth, server quality failure | Device logs contain payload/credential |
| Extension fails | options, auth, API version, background logs | stale endpoint, missing auth, page restrictions | Logs contain selected/private text |
| Wiki publish fails | remote base SHA, validation output, Git auth | concurrent edit, privacy/structure failure, auth | Force-push would be required |

## Diagnosis Principles

- Preserve the earliest failing stage.
- Use synthetic or public fixtures.
- Record states and verdicts, not private payloads.
- Treat main/worktree differences as a possible cause.
- Do not convert a diagnostic task into a write-path repair without new scope.

Related pages: [Capture and Ingestion](Capture-and-Ingestion), [Search, RAG, and Ask](Search-RAG-and-Ask), [Deployment and Operations](Deployment-and-Operations).
