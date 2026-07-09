# Recall Live Auth Probe Local Gate Fix Execution Report

Created: 2026-06-25 00:11 IST
Owner: Codex
Status: Done; live Recall auth/read probe ran successfully
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Fix the operational ambiguity where `npm run recall:first-apply:status` and proof-refresh commands stopped on local first-write/private proof gates before making any live Recall API call.

The fix is not to weaken first-apply safety. Instead, this adds a separate read-only live auth probe that verifies Recall API connectivity without invoking first-apply readiness, dry-run proof refresh, apply proof, backup proof, database import, deploy, scheduler enablement, or checkpoint movement.

## Official API Basis

The current Recall developer API docs observed on 2026-06-25 state:

- API base URL: `https://backend.getrecall.ai/api/v1`.
- API authentication uses `Authorization: Bearer <key>`.
- The API currently supports read-only operations.
- `GET /api/v1/cards` supports `date_from` and `date_to` filters and returns matching cards.

The probe therefore uses exactly one `GET /cards` request with a future date window and prints only response metadata.

## Code Changes

| Area | File | Change |
|---|---|---|
| Live auth probe | `scripts/run-recall-live-auth-probe.mjs` | New no-write command that loads a safe ignored private env file if present, requires explicit live API confirmation, calls read-only `GET /cards`, and prints only status/count metadata. |
| Probe smoke | `scripts/smoke-recall-live-auth-probe.mjs` | Local mock-server smoke proves the command refuses missing confirmation/key, sends bearer auth to `/cards`, redacts private response fields, and maps `401` to auth failure without leaking the key. |
| Package scripts | `package.json` | Added `recall:live-auth-probe` and `smoke:recall-live-auth-probe`. |

## Safety Contract

The probe:

- makes exactly one read-only Recall API request;
- does not fetch card details;
- uses a default future date window: `2100-01-01T00:00:00.000Z` through `2100-01-02T00:00:00.000Z`;
- prints only HTTP status, auth/reachability booleans, timing, `total_count`, and result count;
- does not print card IDs, titles, source URLs, chunks, raw response bodies, or the API key;
- does not read or write the AI Brain database;
- does not create dry-run proof, apply proof, backup proof, or an apply report;
- does not deploy, enable a scheduler, or advance a checkpoint;
- does not satisfy first-apply key-rotation evidence, proof freshness, write approval, or key acknowledgement gates.

## Validation

Focused validation passed:

```text
node --check scripts/run-recall-live-auth-probe.mjs
node --check scripts/smoke-recall-live-auth-probe.mjs
npm run smoke:recall-live-auth-probe
npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
```

The real live probe returned:

```text
ok: true
mode: live_read_only_auth_probe
endpoint: /cards
method: GET
httpStatus: 200
authenticated: true
reachable: true
totalCount: 0
resultCount: 0
responseHadResultsArray: true
```

The live result used the future date window and contained no private Recall card IDs, titles, source URLs, chunks, raw response body, API key, database rows, dry-run proof payload, apply payload, backup payload, or private manifest values.

No private Recall card IDs, titles, source URLs, chunks, raw response body, API key, database rows, dry-run proof payload, apply payload, backup payload, or private manifest values were included in this public report.

## Current Production State

Live Recall auth/read connectivity is now proven independently of first-apply readiness.

First capped apply is still blocked. The current `npm run recall:first-apply:status` output remains `blocked_key_rotation_evidence` because the ignored private env file metadata predates the required key-rotation checkpoint, and the existing dry-run/backup proof is stale. That is still the correct first-write behavior after a Recall API key was pasted into chat.

## Next Gate

Use this command only as a no-write connectivity diagnostic:

```text
npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
```

For first capped apply, continue to use the stricter ordered sequence:

```text
npm run check:recall-key-rotation-evidence
npm run recall:first-apply:status
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed
npm run recall:first-capped-apply
```
