# Recall Daily Sync Final Implementation Options V3

Created: 2026-06-24 18:17 IST
Author: Codex
Status: Live-gate-ready offline recommendation; live Recall and production rollout remain gated
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Executive Recommendation

Choose **Option A: REST API daily pull with dry-run-first apply** as the V1 path.

The recommendation is now stronger than the earlier options documents: the local AI Brain side is implemented and heavily gated for offline safety. The remaining uncertainty is live Recall account behavior, not local architecture feasibility.

Do **not** enable production import, production deploy, or the daily scheduler until:

1. Arun approves local Recall API-key handling.
2. The private controlled sample manifest is filled with real Recall card IDs/titles/source URLs.
3. SPIKE-013 and SPIKE-014 pass against Arun's live Recall account.
4. A production-capable dry-run is reviewed.
5. A first capped apply succeeds with backup proof.
6. Repeated manual runs are clean.
7. Scheduler enablement is explicitly approved.

Use the product phrase:

```text
Recall snapshot import
```

Avoid calling the V1 feature "Recall sync" in user-facing UI because V1 is one-way, read-only, and does not handle delete/update propagation back to Recall.

## Official Recall Docs Spot-Check

Official docs were re-opened on 2026-06-24 before creating this V3:

- [Recall REST API](https://docs.recall.it/developer/api)
- [Recall MCP Server](https://docs.recall.it/developer/mcp)
- [Recall Markdown export](https://docs.recall.it/getting-started/7-exporting-content)

Current observed facts:

- REST remains read-only.
- REST base URL remains `https://backend.getrecall.ai/api/v1`.
- REST API keys are created in Recall web app Settings -> API & MCP and are sent as bearer tokens.
- `GET /api/v1/cards` supports date filtering via `date_from` and `date_to`, plus tag and source URL substring filters.
- `GET /api/v1/cards/{card_id}` returns content chunks, with `max_chunks` constrained to 1-50.
- REST search exists but is not the best daily import primitive because the requested feature is newly-added-card ingestion, not semantic retrieval.
- MCP remains read-only, browser/OAuth authenticated, and exposes search, metadata filtering, document-content retrieval, and knowledge-base exploration.
- Markdown export is available through the web app, including single-page export and full knowledge-base zip export; it is not a documented headless daily API.

No current doc change invalidates the REST-first recommendation. The docs still do not prove Arun's live account enumeration completeness or content fidelity, so live gates remain mandatory.

## Current Offline Implementation State

AI Brain now has a production-shaped offline implementation:

- Recall provenance schema and migrations:
  - `src/db/migrations/020_recall_sync.sql`
  - `src/db/recall-sync.ts`
- Recall client, mapper, importer, fidelity policy, scheduler, and runner:
  - `src/lib/recall/client.ts`
  - `src/lib/recall/mapper.ts`
  - `src/lib/recall/importer.ts`
  - `src/lib/recall/fidelity.ts`
  - `src/lib/recall/scheduler.ts`
  - `src/lib/recall/sync-runner.ts`
- Production-capable CLI and bundle:
  - `scripts/sync-recall.ts`
  - `scripts/build-recall-cli.mjs`
  - `scripts/dist/sync-recall-prod.mjs`
- Live spike runner and probes:
  - `scripts/run-recall-live-spikes.mjs`
  - `scripts/spikes/recall-rest-enumeration.ts`
  - `scripts/spikes/recall-content-fidelity.ts`
  - `scripts/spikes/recall-spike-report.ts`
- Production scheduler wrapper and disabled systemd artifacts:
  - `scripts/recall-scheduled-apply.sh`
  - `scripts/deploy/brain-recall-sync.service`
  - `scripts/deploy/brain-recall-sync.timer`

Major safety behavior now implemented:

- dry-run-first CLI;
- explicit apply confirmation;
- live API confirmation before any live Recall call;
- hard caps and planned import-write counts;
- card-ID idempotency;
- changed-remote blocking;
- conservative fidelity-policy blocking;
- apply-time blocker checkpoint protection;
- dry-run proof validation;
- backup proof validation;
- live-spike report proof validation;
- future-dated proof-file rejection;
- disabled-by-default scheduler path;
- deploy guards against already-enabled Recall timer and remote Recall enable flags.

## Latest Privacy And Approval Hardening

After V2, the offline safety envelope was tightened further:

| Area | Current state |
|---|---|
| Private evidence path | `data/private/recall-live-spikes/` is ignored and untracked. |
| Manifest template | `data/private/recall-live-spikes/controlled-samples.json` exists, is ignored/untracked, and owner-only, but still contains placeholders. |
| Recall env template | `data/private/recall-live-spikes/recall.env` exists, is ignored/untracked, owner-only, empty-key, and confirmation-disabled. |
| Live status command | `recall:live-gate:status` returns `ok: true` only when `readyForApprovedLiveSpikes` is true. |
| Strict readiness command | `recall:live-gate:require-ready` exits nonzero for all not-ready states. |
| Pre-live preview redaction | `stdoutPreview` and `stderrPreview` redact private manifest values, Recall API-key-shaped strings, and bearer tokens. |
| Public report privacy scan | `--require-files` fails closed when expected SPIKE reports are missing, and failure previews redact secret-shaped values. |
| Current public-doc privacy scan | `check:recall-public-docs-privacy` fails closed if curated current approval/runbook/evidence docs are missing and checks them for obvious secret leaks. |
| Manifest-aware privacy scan | Catches exact and normalized private manifest values, including case, whitespace, HTML-entity, and percent-encoding variants. |
| Manifest file-safety scan | The standalone manifest-aware scanner now rejects unsafe manifest files by default. |
| Smoke-only bypass | `--allow-unsafe-manifest-for-smoke` is only for synthetic temporary manifests in offline fixture smokes and must not be used for real live reports or production/scheduled proof. |
| Approval packet consistency | Checklist, operating packet, runbook, audit, tracker, and required scripts are machine-checked before live work. |

## Option A - REST API Daily Pull

### Product Shape

A server-side job imports new Recall cards into AI Brain once per scheduled run:

```text
systemd timer
  -> scripts/recall-scheduled-apply.sh
  -> scripts/sync-recall-prod.mjs
  -> Recall REST /cards date-window enumeration
  -> Recall REST /cards/{card_id}?max_chunks=50
  -> Recall mapper and fidelity classifier
  -> Recall importer
  -> items, recall_sync_items, recall_sync_runs, recall_sync_state
  -> enrichment_jobs and embedding_jobs
  -> Library, Ask, Search
```

### Why Option A Is Recommended

- Best fit for unattended daily import.
- Uses server-side API-key auth instead of browser/session automation.
- Aligns with Recall's read-only REST API.
- Uses Recall card ID as a durable idempotency key.
- Supports dry-run review, import caps, checkpoint overlap, and rollback discipline.
- Avoids claiming real-time behavior when Recall does not document webhooks.

### Remaining Risks

- Live `/cards` enumeration may miss cards or expose undocumented cap/pagination behavior.
- Card detail chunks may be incomplete for long PDFs/videos, especially with the 50-chunk maximum.
- Recall REST is read-only, so AI Brain cannot update or delete Recall content.
- Production scheduler behavior remains unproven until manual live runs are clean.

### Verdict

Proceed to approved live validation. Do not deploy, apply, or schedule yet.

## Option B - REST Pull With Weak-Item Upgrade

### Product Shape

Recall can optionally repair an existing weak AI Brain item when both systems share an exact source URL.

### Current State

The exact-URL weak upgrade path is implemented and tested, but disabled by default.

Default:

```text
--allow-weak-upgrade-by-url omitted
BRAIN_RECALL_ALLOW_WEAK_UPGRADE_BY_URL=0
```

Opt-in after approval:

```text
--allow-weak-upgrade-by-url
BRAIN_RECALL_ALLOW_WEAK_UPGRADE_BY_URL=1
```

### Verdict

Good V1.1/V2 enhancement. Keep out of default V1 apply until live fidelity proof and dry-run upgrade candidates are reviewed.

## Option C - MCP-Assisted Pull

### Product Shape

Use Recall MCP interactively to search/filter/read content when REST evidence is insufficient.

### Verdict

Useful fallback and investigation path. Not the default scheduler path because MCP is browser/OAuth-oriented and less suitable for a headless Hetzner timer.

## Option D - Markdown Export Reconciliation

### Product Shape

Use Recall Markdown export for bootstrap, reconciliation, or recovery of content classes where REST chunks are insufficient.

### Verdict

Useful fallback. Not the default daily path because export is web-app driven and can create large private files that require separate handling.

## Option E - Browser Automation

### Product Shape

Use Chrome/Playwright against the Recall web app to discover or export new cards.

### Verdict

Last resort only. Highest fragility, highest privacy burden, and poorest production-operability fit.

## Recommendation Matrix

| Option | Automation fit | Fidelity potential | Operational risk | Privacy risk | Current recommendation |
|---|---:|---:|---:|---:|---|
| A. REST daily pull | High | Medium until live-proven | Medium | Medium | Primary V1 path |
| B. REST + weak upgrade | Medium | Medium until live-proven | Medium-high | Medium | Optional V1.1/V2 opt-in |
| C. MCP-assisted pull | Low-medium | Unknown | Medium-high | Medium | Fallback/research |
| D. Markdown export reconciliation | Low | Medium-high for exports | Medium | High | Bootstrap/reconciliation fallback |
| E. Browser automation | Low | Medium | High | High | Last resort |

## Exact Remaining Gate Sequence

1. Run the private ignore check:

```text
npm run check:recall-private-ignore
```

2. Choose API-key handling from:

```text
docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md
```

3. Use the no-secret approval checklist:

```text
docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md
```

4. Review the controlled sample setup guide:

```text
npm run recall:controlled-samples:guide
```

5. Fill the private manifest:

```text
npm run recall:controlled-samples:init
$EDITOR data/private/recall-live-spikes/controlled-samples.json
```

6. Confirm strict live readiness:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

7. Run the approved live SPIKE-013/SPIKE-014 pair:

```text
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --confirm-live-api
```

8. Validate generated public reports with the manifest-aware privacy gate:

```text
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json
```

9. If SPIKE-014 returns `PROCEED-WITH-CHANGES`, use explicit acceptance only after human review:

```text
npm run check:recall-live-spike-reports -- \
  --enumeration <SPIKE-013.md> \
  --fidelity <SPIKE-014.md> \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --allow-fidelity-changes \
  --accepted-fidelity-risk "<reviewed reason>"
```

10. Only after accepted live reports, run private production-capable dry-run with live-spike proof.

11. Validate private dry-run report:

```text
npm run check:recall-dry-run-report -- \
  --report data/private/recall-live-spikes/dry-run-report.json \
  --max-planned-imports 5 \
  --max-age-minutes 120 \
  --require-private-path \
  --require-cards-seen
```

12. Only after reviewed dry-run and backup proof, run first capped apply.

13. Only after repeated clean manual runs, deploy and explicitly enable the disabled scheduler.

## Current Evidence

Latest validation passed before this V3 was created:

```text
npm run smoke:recall-public-manifest-privacy
npm run smoke:recall-public-docs-privacy
npm run check:recall-public-docs-privacy
npm run smoke:recall-live-spike-reports
npm run smoke:recall-live-spikes
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run smoke:recall-scheduler-wrapper
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

Expected blockers still hold:

```text
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Both fail on the placeholder private manifest, as intended. The strict live gate reports:

```text
status: needs_manifest_fix
readyForApprovedLiveSpikes: false
privateEvidenceOk: true
```

No live Recall API call, production dry-run, production apply, production deploy, or scheduler enablement has been performed.

## Final Product Decision

Ship V1 as:

```text
Option A: REST daily snapshot import, dry-run first, scheduler disabled until live proof and manual runs are clean.
```

Keep Option B as:

```text
Disabled opt-in weak-item upgrade by exact source URL after live fidelity proof.
```

Keep Options C, D, and E as:

```text
Fallbacks only, in this order: MCP-assisted investigation, Markdown export reconciliation, browser automation.
```

The active goal is not complete until the live Recall account, production dry-run/apply, production deploy, and scheduler path are all verified end to end.
