# Implementation Plan v1 - Web Integrated QA and Route-State Reconciliation

**Created:** 2026-06-15 23:59:27 IST
**Product source:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_V2_2026-06-15_23-58-23_IST.md`
**Status:** Draft for adversarial review. Do not execute until reviewed and revised.

## Objective

Produce a local integrated web QA evidence packet that reconciles every row in the original web route-state matrix, proves key cross-route flows, records accessibility smoke results, and updates trackers/logs without making deployment or Android claims.

## Inputs

- `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_2026-06-15_21-48-07_IST.md`
- Completed slice QA reports under `UX_v2/execution/`
- Browser evidence under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/`
- Seed scripts:
  - `scripts/ux-v2-seed-library-search-topics-collections.ts`
  - `scripts/ux-v2-seed-item-ask-needs-upgrade.ts`
  - `scripts/ux-v2-seed-capture-settings-pairing-export-provider.ts`
- Current app code and tests.

## Execution Steps

### 1. Build Evidence Inventory

Create an inventory table mapping completed slice evidence to route-state rows:

- Contrast QA report.
- Shell/navigation QA report.
- Library/search/topics/collections QA report.
- Item/Ask/Needs Upgrade QA report.
- Capture/settings/pairing/export/provider-health QA report.

For every reused item, record exact report path plus screenshot or JSON field.

### 2. Prepare Integrated QA Databases

Use temp SQLite databases only:

- Main integrated DB: seed all three web seed scripts.
- Empty-state DB: use fresh setup-only DB for public/auth/empty route checks if needed.

Rules:

- Use throwaway auth PIN through the UI.
- Do not use production DB.
- Remove QA-generated project-tree backup artifacts after stopping the dev server.

### 3. Start Local Dev Server

Run the app with:

- `BRAIN_DB_PATH` pointed at the temp integrated DB.
- `BRAIN_API_TOKEN` generated in shell without writing the raw token into docs.
- Provider host set to an unavailable local endpoint to prove provider-down states.

Do not copy the raw token into any markdown, JSON, or final response.

### 4. Browser Integrated QA

Use the in-app Browser with viewport capability:

- Desktop: 1280x720 or 1280x800.
- Mobile: 390x844.
- Optional 200 percent zoom checks by setting browser/page zoom or CSS zoom if browser capability supports it; otherwise record a blocker and perform visible overflow checks.

Capture new screenshots only for integration gaps and public/auth routes. Reuse prior slice screenshots for exact matches.

Required checked routes:

- `/unlock`
- `/setup`
- `/setup-apk`
- `/offline.html`
- `/library`
- `/search`
- `/items/[id]`
- `/items/[id]/repair`
- `/items/[id]/ask`
- `/needs-upgrade`
- `/ask`
- `/capture`
- `/more`
- `/settings`
- `/settings/collections`
- `/settings/tags`
- `/settings/device-pairing`
- `/topics/[slug]`
- `/collections/[id]`

### 5. API and Public Asset Checks

Use local HTTP checks with temp auth as needed:

- `/api/library/export.zip`
- `/api/settings/provider-status`
- `/manifest.webmanifest`
- `/favicon-32x32.png`
- `/favicon-16x16.png`
- `/apple-touch-icon.png`
- `/web-app-icon-192.png`
- `/web-app-icon-512.png`

Record status, content-type, no-store headers where relevant, and byte lengths only.

### 6. Accessibility Smoke

Record pass/fail for:

- Keyboard path on `/library`, `/ask`, `/capture`, `/settings/device-pairing`.
- `/unlock` and `/setup` form focusability.
- Mobile touch target sampling on `/capture`, `/library`, `/settings/device-pairing`.
- Horizontal overflow checks for all checked routes.
- 200 percent zoom spot checks for `/library`, `/items/[id]`, `/settings`, `/ask`; if tooling cannot set zoom, record exact fallback and residual blocker.
- Reduced-motion status.

### 7. Reconcile Route-State Matrix

Create:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_RECONCILED_<timestamp>.md`

For every source row, record:

- Route.
- State.
- Status from the allowed taxonomy.
- Evidence path or blocker.
- Release impact.
- Notes.

No row may remain blank.

### 8. Static Validation

Run:

- `git diff --check`
- Focused seed/browser support checks if any scripts are added.
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Record known unrelated warnings.

### 9. Documentation and Tracker Updates

Create:

- Integrated QA report.
- Accessibility smoke report.
- Browser JSON report.
- Project tracker update.
- Append-only running-log entries.

Update the active plan statuses.

### 10. Cleanup

- Stop the local dev server.
- Reset browser viewport.
- Close temporary browser tabs.
- Remove QA-only generated backup artifact from `data/backups` if created.
- Leave temp DBs in `/tmp` only if referenced in QA docs; otherwise they can be removed.

## Output Files

| Output | Path |
| --- | --- |
| Reconciled matrix | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_RECONCILED_<timestamp>.md` |
| Integrated QA report | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_INTEGRATED_WEB_QA_<timestamp>.md` |
| Browser report JSON | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/integrated-web-qa/integrated-web-qa-browser-report.json` |
| Accessibility smoke | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ACCESSIBILITY_SMOKE_<timestamp>.md` |
| Tracker update | `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` |

## Pass / Fail Rules

| Gate | Pass rule |
| --- | --- |
| Matrix reconciliation | Every original row classified; all `Pass` and `Covered by slice QA` rows have exact evidence. |
| Browser QA | 0 relevant console warnings/errors, 0 unhandled horizontal overflow issues on checked routes. |
| Token/pairing redaction | No raw token, session cookie, PIN, or active pairing code in markdown/JSON. |
| Public/auth | Public routes/assets return expected statuses; protected routes redirect while unauthenticated. |
| Accessibility smoke | Minimum matrix completed; failures listed as release blockers. |
| Static gates | Pass or explicit blocker. |

## Known Expected Blockers

- Android pairing completion remains blocked until Android execution.
- Live Ask citation quality remains blocked if provider is unavailable.
- Full manual keyboard/a11y release sweep remains a release gate even if smoke passes.
- Production backup/rollback/deploy/live smoke remain out of scope for this local pass.
