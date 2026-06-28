# Recall Live SPIKE Execution Report

Created: 2026-06-24 19:06 IST
Owner: Codex
Status: Live SPIKE-013/SPIKE-014 executed; production apply remains blocked
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Record the first approved read-only live Recall API validation run for the Recall -> AI Brain daily sync workstream.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, or card content.

## Official API Basis

The current Recall developer documentation says:

- the API is read-only;
- the base URL is `https://backend.getrecall.ai/api/v1`;
- requests authenticate with an `Authorization` header;
- `GET /api/v1/cards` supports date-window filters;
- `GET /api/v1/cards/{card_id}` returns card details and content chunks with `max_chunks` capped at 50.

## Private Setup Outcome

The previously failing private gates were fixed locally:

- `data/private/recall-live-spikes/recall.env` is ignored, untracked, owner-only, and now has local Recall API key presence plus live confirmation;
- `data/private/recall-live-spikes/controlled-samples.json` is ignored, untracked, owner-only, and now validates with six positive controlled samples plus an outside-window negative control;
- public report exposure booleans remain false;
- no secret or private Recall payload was printed into public artifacts.

## Readiness Evidence

Passed:

```text
npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Note: the full pre-live suite must be run without a globally exported live-confirmation flag because one smoke test intentionally verifies the unconfirmed-live path. The strict live gate and live runner were run with confirmation.

## Live Reports Generated

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_19-05-32_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_19-05-32_IST.md`

## SPIKE-013 Result

Verdict: `CLEAR`

Redacted aggregate evidence:

- filtered date-window total count: 86;
- filtered date-window result count: 86;
- repeated filtered query was stable;
- positive controlled cards were present;
- outside-window negative control was absent;
- no unexplained filtered result cap was observed.

## SPIKE-014 Result

Verdict: `PROCEED-WITH-CHANGES`

Redacted aggregate evidence:

- six controlled card details were fetched;
- content fidelity distribution was five `api_chunks_unverified` cards and one `metadata_only` card;
- all six controlled cards were blocked by the conservative import policy by default;
- the accepted fidelity risk for report-gate purposes is that live Recall API detail chunks are unverified, so production import must stay blocked by default unless explicit fidelity flags and review are used.

## Post-Live Gates

Passed:

```text
npm run check:recall-public-privacy -- docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_19-05-32_IST.md docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_19-05-32_IST.md
npm run check:recall-public-manifest-privacy -- --manifest data/private/recall-live-spikes/controlled-samples.json docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_19-05-32_IST.md docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_19-05-32_IST.md
npm run check:recall-live-spike-reports -- --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_19-05-32_IST.md --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_19-05-32_IST.md --manifest data/private/recall-live-spikes/controlled-samples.json --allow-fidelity-changes --accepted-fidelity-risk "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used."
```

Expected fail-closed result:

```text
npm run check:recall-live-spike-reports -- --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_19-05-32_IST.md --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_19-05-32_IST.md --manifest data/private/recall-live-spikes/controlled-samples.json
```

This correctly fails because `PROCEED-WITH-CHANGES` requires explicit accepted-fidelity-risk review before any production dry-run can rely on the report pair.

## Fixes Made During Live Execution

- Updated the SPIKE-013 report wording from a phrase that triggered a false positive token-shaped privacy finding to `Authorization header`.
- Updated SPIKE-013/SPIKE-014 report generators so manifest summaries include `sampleCount`, `requiredLabels`, and `publicPrivacy`, matching the post-live acceptance gate.

## Current Production State

No production dry-run, production apply, production deploy, or scheduler enablement was performed.

The next allowed gate is a private production-capable dry-run using accepted live-spike report proof. Apply and scheduler work remain blocked until dry-run proof is reviewed and Arun separately approves write execution.
