# Recall First Capped Apply and Production Deploy Execution Report - 2026-06-26 23:50 IST

## Purpose

Record the first approved capped Recall -> AI Brain apply, post-apply review, production deployment, security follow-up, and current completion gate without exposing Recall card content, source URLs, keys, private payloads, or raw private evidence.

## Scope

- Window: 2026-06-16 Recall snapshot window.
- Apply cap: maximum 5 planned imports.
- Actual planned imports: 3.
- Fidelity handling: explicit allowance for unverified API chunks and metadata-only Recall content, as approved for the first capped apply.
- Scheduler: not enabled in this report.

## User Approval Used

Arun approved the first capped apply with the exact scope:

```text
I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.
```

The prior exposed Recall API key was treated as unsafe for use. The apply used the ignored private Recall env file after the user-provided key-rotation acknowledgement and local evidence gate.

## Apply Result

Private evidence:

- `data/private/recall-live-spikes/first-apply-report.json`
- Owner-only mode: `600`
- Validator verdict: `PASS_POST_APPLY_REVIEW_GATE`

Machine-reviewed summary:

| Metric | Value |
| --- | ---: |
| Cards seen | 3 |
| Cards available | 3 |
| Enumeration complete | true |
| Cards planned for import | 3 |
| Cards imported | 3 |
| Cards upgraded | 0 |
| Cards skipped | 0 |
| Cards blocked | 0 |
| Cards changed remotely | 0 |
| Checkpoint advanced | true |

Fidelity counts:

| Fidelity class | Count |
| --- | ---: |
| `metadata_only` | 1 |
| `api_chunks_unverified` | 2 |

## Production Deploy Result

The first deploy after apply succeeded, then a second deploy was run after fixing the dependency-audit issue and completion-status smoke isolation.

Current private deploy evidence:

- Evidence: `data/private/recall-live-spikes/production-deploy-evidence.json`
- Command log: `data/private/recall-live-spikes/production-deploy-command-output-20260626T181006Z.log`
- Owner-only mode: `600`
- Validator verdict: `PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION`
- Production health: `https://brain.arunp.in/api/health` returned HTTP `200` using the production-host token.
- Production AI providers: enrichment, ask, and embedding provider checks passed on the production host.
- Recall timer: installed but disabled and inactive.
- Recall live-write flags on production: unset/disabled.

Deployment notes:

- The local deploy provider preflight was run in warn-only mode because local Ollama is not installed/running on this Mac.
- The production provider check passed on the remote host.
- Telegram smoke remained skipped because Telegram live validation was not in this scope.
- The scheduler was intentionally kept off.

## Security and Dependency Follow-up

`npm audit --omit=dev --json` initially reported a high-severity transitive `undici` issue. The project now pins:

- `package.json` override: `undici: 7.28.0`
- `package-lock.json` updated accordingly.

Post-fix verification:

- `npm audit --omit=dev --json` reports 0 vulnerabilities.
- Production was redeployed after the dependency fix.

## Completion Status Helper Fix

During post-deploy verification, `npm run recall:daily-sync:completion-status` correctly listed only `scheduler_enablement` as blocked, but the top-level `currentBlockingGate` still copied a stale first-apply readiness gate.

Fix implemented:

- `scripts/check-recall-daily-sync-completion-status.mjs` now promotes the first currently blocked requirement after first apply is done.
- `scripts/smoke-recall-daily-sync-completion-status.mjs` now covers the exact state where apply and deploy are done but scheduler evidence is missing.

Current real completion status:

- `completionAchieved`: false
- `currentBlockingGate`: `scheduler_enablement`
- `owner`: `Arun`
- `externalActionRequired`: true
- `blockedRequirements`: `scheduler_enablement`
- `blockedActions`: `scheduler`, `checkpoint`

## Verification Commands Run

- `npm run -s check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5 --max-age-minutes 180 --require-cards-seen --require-applied-imports --allow-unverified-fidelity --allow-metadata-only-fidelity --require-private-path`
- `npm run -s check:recall-production-deploy-evidence -- --evidence data/private/recall-live-spikes/production-deploy-evidence.json --max-age-minutes 120`
- `node --check scripts/check-recall-daily-sync-completion-status.mjs`
- `node --check scripts/smoke-recall-daily-sync-completion-status.mjs`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`
- `npm audit --omit=dev --json`

All listed checks passed except the final completion status is intentionally incomplete because scheduler enablement has not been approved or evidenced.

## Current Gate

The project is deployed with the first capped import applied and reviewed. The remaining gate is not a code/deploy failure. It is an operational approval gate:

1. Run or document the required repeated clean manual-run evidence.
2. Obtain explicit scheduler enablement approval.
3. Enable the production timer.
4. Verify the first scheduled service run.
5. Record `data/private/recall-live-spikes/scheduler-enable-evidence.json`.
6. Rerun `npm run recall:daily-sync:completion-status -- --require-complete`.
