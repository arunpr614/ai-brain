# Implementation Plan v2 - Web Integrated QA and Route-State Reconciliation

**Created:** 2026-06-16 00:00:44 IST
**Supersedes:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_IMPLEMENTATION_PLAN_V1_2026-06-15_23-59-27_IST.md`
**Review resolved:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_00-00-10_IST.md`
**Product source:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_V2_2026-06-15_23-58-23_IST.md`
**Status:** Approved for local execution.

## Objective

Produce a local integrated web QA evidence packet that reconciles every original route-state matrix row, proves key cross-route flows, records accessibility smoke results, and updates trackers/logs without deployment or Android claims.

## Execution Order

### 1. File-Backed Evidence Inventory

Create a source-backed inventory before assigning any `Covered by slice QA` status:

1. List existing slice QA reports.
2. List screenshot/report files in these evidence folders:
   - `shell-navigation/`
   - `library-search-topics-collections/`
   - `item-ask-needs-upgrade/`
   - `capture-settings-pairing-export-provider/`
3. Create an evidence inventory table inside the integrated QA report with exact report path and screenshot/report file.

No row can be marked `Covered by slice QA` unless the exact evidence file exists.

### 2. Deterministic Database Setup

Use temp DBs only:

| DB | Path | Purpose |
| --- | --- | --- |
| Integrated DB | `/tmp/ai-memory-integrated-web-qa.sqlite` | Main populated route/flow QA |
| Empty DB | `/tmp/ai-memory-integrated-web-empty-qa.sqlite` | Empty library, empty Needs Upgrade, setup/unlock/public checks |

Steps:

1. Remove existing temp DB, shm, and wal files.
2. Run seed scripts once, in order, against the integrated DB:
   - `scripts/ux-v2-seed-library-search-topics-collections.ts`
   - `scripts/ux-v2-seed-item-ask-needs-upgrade.ts`
   - `scripts/ux-v2-seed-capture-settings-pairing-export-provider.ts`
3. Save seed manifest JSON files under the integrated evidence folder.
4. Do not rerun seeds against the same temp DB.
5. Use setup UI with a throwaway PIN for both DBs; do not record the PIN.

### 3. Route Discovery

Before browser QA, run route discovery:

- Check whether `/review` exists in `src/app`.
- If missing, classify source matrix `/review` row as `Not applicable` with evidence from route discovery.
- If present, include it in browser QA.

### 4. Local Server Runs

Start one local server per DB as needed:

- Integrated populated DB for main route QA.
- Empty DB only for empty-state/auth checks if those states cannot be reached in the integrated DB.

Environment:

- `BRAIN_DB_PATH=<temp DB>`
- `BRAIN_API_TOKEN` generated in shell without literal token in docs.
- Provider host set to unavailable local endpoint for deterministic provider-down status.

Cleanup:

- Stop server after each run.
- Remove QA-generated backup artifact from `data/backups` if created.

### 5. Browser Integrated QA

Use the in-app Browser. Required route checks:

| Route/state | DB | Evidence rule |
| --- | --- | --- |
| `/unlock`, `/setup` | Empty DB/public unauth | Screenshot or direct route result; protected redirect checked separately |
| `/setup-apk`, `/offline.html` | Either DB/no cookie | HTTP/browser public route proof |
| `/library` populated | Integrated DB | Reuse slice evidence or fresh screenshot |
| `/library` empty | Empty DB | Fresh screenshot or `Needs follow-up` |
| `/search` results | Integrated DB | Reuse/fresh screenshot |
| `/search` no results | Integrated DB | Query guaranteed no match |
| `/items/[id]` full/weak | Integrated DB | Reuse exact slice evidence |
| `/items/[id]/repair` validation/success | Integrated DB | Reuse exact slice evidence |
| `/items/[id]/ask` | Integrated DB | Reuse exact provider-down evidence |
| `/needs-upgrade` populated | Integrated DB | Reuse exact slice evidence |
| `/needs-upgrade` empty | Empty DB | Fresh screenshot or `Needs follow-up` |
| `/ask` scopes | Integrated DB | Reuse exact slice evidence |
| `/capture` URL/PDF/note and banners | Integrated DB | Reuse/fresh evidence |
| `/review` | Route discovery decides | Test if present, else `Not applicable` |
| `/more` | Integrated DB/mobile | Reuse/fresh screenshot |
| `/settings`, `/settings/tags`, `/settings/collections`, `/settings/device-pairing` | Integrated DB | Reuse/fresh evidence |
| `/topics/[slug]`, missing topic | Integrated DB | Reuse/fresh populated and missing-state evidence |
| `/collections/[id]`, missing collection | Integrated DB | Reuse/fresh populated and missing-state evidence |

### 6. API and Asset Checks

Protected API checks use a stub/session cookie only where the route currently checks cookie presence:

- `/api/library/export.zip`
- `/api/settings/provider-status`

Public asset checks use no cookie:

- `/manifest.webmanifest`
- `/favicon-32x32.png`
- `/favicon-16x16.png`
- `/apple-touch-icon.png`
- `/web-app-icon-192.png`
- `/web-app-icon-512.png`

Record status, content-type, no-store headers where relevant, and byte length. Do not record private content.

### 7. Accessibility Smoke

Run the PRD v2 smoke matrix:

- Keyboard focus: `/library`, `/ask`, `/capture`, `/settings/device-pairing`.
- Form focusability: `/unlock`, `/setup`.
- Touch target sampling: mobile `/capture`, `/library`, `/settings/device-pairing`.
- Horizontal overflow: every checked browser route.
- 200 percent zoom: attempt only if the browser tool supports clean zoom. If not supported, record `Needs release follow-up`, not a local QA failure.
- Reduced motion: record `not applicable` if no essential animation is present.

### 8. Reconciled Matrix

Create:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_RECONCILED_<timestamp>.md`

Every source row must have:

- Route.
- State.
- Status from PRD v2 taxonomy.
- Evidence path or blocker.
- Release impact.
- Notes.

### 9. Static Validation

If source/test code changed during this integrated pass, rerun:

- `git diff --check`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

If only docs/evidence changed, run `git diff --check` and cite the same-turn full test/build results from the completed capture/settings slice, while naming that no source files changed during the integrated QA pass.

### 10. Output and Cleanup

Create:

- Integrated QA report.
- Accessibility smoke report.
- Browser report JSON.
- Reconciled matrix.
- Tracker update.
- Running-log entries.

Then:

- Stop servers.
- Reset browser viewport.
- Close temp tabs.
- Remove QA-generated backup artifact from project tree.

## Pass / Fail Rules

| Gate | Pass rule |
| --- | --- |
| Matrix reconciliation | Every original row classified; all `Pass` and `Covered by slice QA` rows have exact evidence. |
| Browser QA | 0 relevant console warnings/errors, 0 unhandled horizontal overflow issues on checked routes. |
| Redaction | No raw token, PIN, session cookie, or active pairing code in markdown/JSON. |
| Public/auth | Public routes/assets return expected statuses; protected routes redirect while unauthenticated. |
| Accessibility smoke | Minimum matrix completed; non-passing items listed as release follow-up or blocker. |
| Static gates | `git diff --check` passes; full gates rerun if source/test code changes. |

## Expected Remaining Blockers

- Android implementation and APK evidence.
- Live Ask citation quality if provider is unavailable.
- Full manual keyboard/accessibility release sweep.
- Code review/release packet.
- Backup/rollback.
- Production deploy and live smoke.
