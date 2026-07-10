# Recall Daily Sync Final Implementation Options

Created: 2026-06-24 10:09 IST
Author: Codex
Status: Preliminary final options after offline spikes; live Recall API gates still blocked
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Executive Recommendation

Choose **Option A: REST API daily pull with dry-run-first apply**, but do not enable production imports until the live Recall account proves enumeration and content fidelity.

This is the strongest path because Recall's current developer docs expose a read-only REST API with:

- card listing via `GET /api/v1/cards`;
- date filters via `date_from` and `date_to`;
- source URL filtering;
- card detail retrieval via `GET /api/v1/cards/{card_id}`;
- content chunks with `max_chunks` capped at 50;
- API-key authentication suitable for a server-side scheduled job.

However, production implementation remains gated because local research found an older empirical conflict: a prior live-account probe observed incomplete `/cards` enumeration behavior. The documentation alone is not enough to promise daily completeness.

Recommended product framing:

```text
Recall snapshot import
```

Avoid:

```text
Recall sync
```

until update/delete/two-way semantics are intentionally designed.

## Current Evidence Base

### Current Recall Docs Rechecked

Docs checked on 2026-06-24:

- [Recall REST API](https://docs.recall.it/developer/api)
- [Recall MCP Server](https://docs.recall.it/developer/mcp)
- [Recall introduction](https://docs.recall.it/)

Relevant doc facts:

- REST API base URL is documented as `https://backend.getrecall.ai/api/v1`.
- REST API is currently read-only.
- API keys are created in the Recall web app under Settings -> API & MCP.
- Requests use `Authorization: Bearer <key>`.
- List cards supports `date_from`, `date_to`, `tags`, and `source_url_contains`.
- Get card returns content chunks.
- `max_chunks` is documented as 1-50, default 20.
- MCP is also read-only and uses browser OAuth with `kb:read`.
- MCP exposes `search`, `filter_by_metadata`, `get_document_content`, and `explore_kb`.

### Local Artifacts

| Artifact | Status | Path |
|---|---|---|
| Research V2 | Done | `docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md` |
| Spike requirements V2 | Done | `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V2_2026-06-24_09-13-12_IST.md` |
| Project tracker | Active | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` |
| SPIKE-015 privacy fixtures | Done | `docs/plans/spikes/SPIKE-015-recall-privacy-fixtures-2026-06-24_09-19-39_IST.md` |
| SPIKE-016 import fixture | Done | `docs/plans/spikes/SPIKE-016-recall-import-fixture-2026-06-24_09-25-55_IST.md` |
| SPIKE-017 weak item upgrade | Done | `docs/plans/spikes/SPIKE-017-recall-weak-item-upgrade-2026-06-24_10-07-17_IST.md` |
| SPIKE-018 scheduler/checkpoint | Done | `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-2026-06-24_09-51-39_IST.md` |
| SPIKE-020 deployment operability | Done | `docs/plans/spikes/SPIKE-020-recall-deployment-operability-2026-06-24_09-57-15_IST.md` |

## Option A - REST API Daily Pull

### Summary

A production CLI job runs once daily on the AI Brain host. It lists Recall cards in a checkpointed date window, fetches card details, maps Recall chunks into AI Brain's capture model, writes through `insertCaptured()` or an optional weak-upgrade path, then lets AI Brain's existing enrichment and embedding queues process the imported items.

### Flow

```text
cron/systemd timer
  -> scripts/sync-recall-prod.mjs --apply
  -> Recall REST API /cards?date_from&date_to
  -> Recall REST API /cards/{id}?max_chunks=50
  -> Recall mapper
  -> Recall importer
  -> items / recall_sync_items / recall_sync_state
  -> enrichment_jobs
  -> embedding_jobs
  -> Library / Ask / Search
```

### Local Proof Already Completed

Implemented and validated locally:

- `capture_source='recall'` schema and UI label support.
- `recall_sync_items`, `recall_sync_runs`, and `recall_sync_state` schema.
- Synthetic Recall mapper/importer.
- Card-ID idempotency.
- Changed-remote detection without overwrite.
- Metadata-only no-URL card handling.
- Exact 50-chunk response marked `possibly_truncated`.
- Dry-run/apply scheduler primitives.
- Checkpoint advancement only after successful apply.
- Run locks and stale-lock recovery.
- Safety caps before writes.
- Redacted report helpers.
- Deployment operability design.
- Optional weak-item upgrade by exact source URL, disabled by default.

### Strengths

- Best fit for unattended daily job.
- Uses API-key auth rather than browser automation.
- Keeps AI Brain as the importing system of record.
- Maps naturally to current AI Brain database and enrichment queue.
- Easy to dry-run and cap before writes.
- Supports checkpointing and idempotency.

### Weaknesses

- Live enumeration remains unproven in the user's current Recall account.
- Date filtering may not be enough if Recall API has hidden pagination or fixed result caps.
- `max_chunks=50` may be partial for long PDFs/videos/podcasts.
- REST is read-only, so this cannot update or delete Recall content.
- No webhook is documented, so "whenever I add new content" must mean "daily pull sees it later."

### Required Live Gates

| Gate | Proof Required | Status |
|---|---|---|
| GATE-001 REST enumeration | Controlled new cards appear completely via date-window list. | Blocked |
| GATE-002 Content fidelity | Representative article, YouTube, PDF, note, and long-card samples can be classified accurately. | Blocked |
| GATE-003 Privacy-safe persistence | Live dry-run/report redaction verified with real private cards. | Partially proven offline |
| GATE-005 Queue/cost safety | Caps protect first live run volume. | Proven offline, live values pending |
| GATE-006 Deployment operability | Production CLI packaging solved and dry-run works on host. | Design complete, implementation pending |

### Recommended Shape

Phase 1 production should run only in dry-run mode:

```text
scripts/sync-recall-prod.mjs --dry-run --max-cards 20 --max-imports 0
```

Then a manual first apply:

```text
scripts/sync-recall-prod.mjs --apply --max-imports 5
```

Only after multiple clean dry-runs and one successful narrow apply should a scheduled daily apply be enabled.

### Verdict

Best primary path. Proceed to PRD only after live GATE-001 and GATE-002 pass, or write the PRD with those gates as explicit pre-implementation blockers.

## Option B - REST Daily Pull With Weak-Upgrade Mode

### Summary

This extends Option A. When enabled, Recall can upgrade an existing weak AI Brain item if both systems point at the exact same `source_url`.

The local spike proved this can work safely when:

- exact source URL matches;
- existing item is weak according to `needsUpgradeReason()`;
- repair uses `repairItemWithText()`;
- old chunks/vectors/summaries are cleared;
- strong existing items are skipped and not overwritten.

### Flow

```text
Recall card detail
  -> exact source_url lookup in AI Brain
  -> if no match: normal Recall import
  -> if weak match: repair existing item with Recall body
  -> if strong match: skip and record source-URL match
```

### Strengths

- Prevents duplicate records for content already captured weakly through Android, Telegram, extension, or web.
- Turns Recall into a repair source for metadata-only items.
- Preserves AI Brain item identity, collections, manual tags, and source URL.
- Keeps strong existing content protected.

### Weaknesses

- Exact URL matching is conservative and may miss canonical equivalents.
- Non-exact matching would be riskier and needs a separate canonicalization PRD.
- Recall chunks may be incomplete; using them to overwrite weak captures requires stronger fidelity proof.
- UI currently explains this through provenance body and extraction metadata, not a dedicated "Upgraded by Recall" badge.

### Recommended Policy

Keep disabled by default:

```text
RECALL_SYNC_UPGRADE_WEAK_BY_URL=0
```

Offer as later opt-in:

```text
RECALL_SYNC_UPGRADE_WEAK_BY_URL=1
```

Before enabling:

- live fidelity gate must pass;
- first dry-run must list exact upgrade candidates;
- user must approve first apply with upgrades enabled.

### Verdict

Good V1.1/V2 enhancement. Do not include in the default V1 apply path.

## Option C - MCP-Assisted Pull

### Summary

Use Recall MCP as a fallback or operator-assisted bridge. MCP can list/filter/search content and retrieve document content through OAuth in compatible clients.

### Flow

```text
MCP-compatible client / agent
  -> Recall MCP OAuth
  -> filter_by_metadata or search
  -> get_document_content
  -> export/import into AI Brain through controlled local script
```

### Strengths

- No API key management in AI Brain host if used interactively.
- May expose richer or differently deduplicated document content than REST.
- Useful as an investigation and reconciliation tool.

### Weaknesses

- Not proven suitable for unattended server cron.
- OAuth/session lifecycle is client-dependent.
- Tool outputs may be less stable as an integration contract than REST.
- More difficult to operationalize, test, and deploy on Hetzner.

### Verdict

Use as fallback/research path if REST enumeration or fidelity fails. Do not choose as the default daily job unless a stable server-side MCP auth path is proven.

## Option D - Markdown Export Reconciliation

### Summary

Use Recall's web-app export to create Markdown snapshots, then import or reconcile those snapshots into AI Brain.

### Strengths

- May provide richer content for cards where REST chunk detail is partial.
- Good for one-time bootstrap imports.
- Useful as a human-reviewed reconciliation safety net.

### Weaknesses

- Not a documented headless daily API.
- Likely manual or browser-driven.
- Hard to checkpoint reliably.
- More privacy risk if large exports are written to disk.
- Harder to map back to original Recall card IDs unless export embeds stable IDs.

### Verdict

Good fallback for bootstrap/reconciliation, not the main daily automation.

## Option E - Browser Automation

### Summary

Use Chrome/Playwright against the Recall web app to find and export new cards.

### Strengths

- Can work even when API coverage is incomplete.
- Might access exactly what the user sees.

### Weaknesses

- Fragile against UI changes.
- Requires logged-in browser profile/session handling.
- High privacy and operational complexity.
- Hard to run safely as a production server job.
- Not a clean developer integration.

### Verdict

Last resort only. Prefer REST, then MCP/export, before browser automation.

## Recommendation Matrix

| Option | Automation Fit | Fidelity Potential | Operational Risk | Privacy Risk | Recommendation |
|---|---:|---:|---:|---:|---|
| A. REST daily pull | High | Medium until live-proven | Medium | Medium | Primary candidate |
| B. REST + weak upgrade | Medium | Medium until live-proven | Medium-high | Medium | Optional later mode |
| C. MCP-assisted pull | Low-medium | Unknown | Medium-high | Medium | Fallback/research |
| D. Markdown export reconciliation | Low | Medium-high for exports | Medium | High if mishandled | Bootstrap/fallback |
| E. Browser automation | Low | Medium | High | High | Last resort |

## Proposed V1 Scope

Include:

1. REST API client.
2. Dry-run command.
3. Apply command with hard caps.
4. Date-window checkpoint with overlap.
5. Card-ID idempotency.
6. Recall provenance table and item metadata.
7. Content fidelity classification.
8. Redacted run reports.
9. Manual first apply workflow.
10. Disabled-by-default production scheduling.

Exclude:

1. Two-way sync.
2. Deletion propagation.
3. Automatic overwrite/update of already imported Recall card content.
4. Weak-item upgrades by default.
5. Browser automation.
6. MCP cron.
7. Full fidelity claims for long PDFs/videos.

## Proposed V1.1 / V2 Scope

Consider after V1:

1. Optional weak-item upgrade by exact URL.
2. Canonical URL matching.
3. Dedicated "Upgraded by Recall" UI badge.
4. Markdown export reconciliation.
5. MCP fallback for blocked card types.
6. Changed-remote review queue.
7. Backfill mode for historical Recall library.

## Live API Spike Plan Still Required

Before PRD approval, run:

### SPIKE-013 - REST Enumeration

Use `scripts/spikes/recall-rest-enumeration.ts` after user-approved API-key setup.

Must prove:

- API key auth works.
- Narrow date window returns controlled new cards.
- `total_count` matches expectations.
- No silent fixed first-page cap.
- Logs redact secrets and private titles unless explicitly approved.

### SPIKE-014 - Content Fidelity

Use controlled cards:

- one short note;
- one web article;
- one YouTube card;
- one PDF;
- one long item likely to hit 50 chunks.

Must prove:

- detail endpoint returns usable content chunks;
- ordering is stable enough;
- exactly-50 chunks are classified as `possibly_truncated`;
- metadata-only/blocked cases are not imported as full text;
- dry-run report remains privacy-safe.

## PRD Recommendation

Create the PRD for **Option A with Option B explicitly out of default scope**.

Suggested PRD title:

```text
Recall Daily Snapshot Import into AI Brain
```

PRD should state:

- "daily" means scheduled pull, not instant webhook.
- "snapshot" means one-way import, not two-way sync.
- production apply requires live enumeration and fidelity gates.
- weak-item upgrade is opt-in and disabled by default.
- user can review dry-run before first apply.

## Implementation Plan Recommendation

The implementation plan should be split into phases:

1. Live API validation.
2. REST client and CLI packaging.
3. Dry-run report and redaction.
4. Apply mode with caps/checkpoint/lock.
5. Production deployment dry-run.
6. Manual first apply.
7. Scheduled job enablement.
8. Optional weak-upgrade enablement after separate approval.

Production CLI packaging must resolve the SPIKE-020 finding: Hetzner deploy does not currently ship the full TypeScript source tree or dev dependencies. A production-safe JS bundle/script is required.

## Current Go / No-Go

### Go

Allowed now:

- draft PRD for Option A;
- draft adversarial review of the PRD;
- create implementation plan skeleton;
- continue local CLI packaging design;
- prepare live API-key handling instructions.

### No-Go

Blocked now:

- production cron;
- production apply;
- claiming complete daily import coverage;
- enabling weak upgrades by default;
- importing real Recall content without user-approved API-key handling and sample-card privacy rules.

## Final Verdict

The project has enough offline evidence to choose a primary architecture: REST API daily pull into AI Brain's existing capture/enrichment pipeline.

The project does not yet have enough live evidence to deploy it.

Next best action:

1. Ask user to approve local Recall API-key handling and controlled sample-card privacy rules.
2. Run SPIKE-013 and SPIKE-014.
3. If they pass, create PRD v1 for Option A.
4. Run adversarial review.
5. Create PRD v2.
6. Create implementation plan v1, adversarial review, and implementation plan v2.
7. Execute production-safe implementation.
