# Android A2 Capture / Repair / Needs Upgrade Implementation Plan V2

Created: 2026-06-16 11:10:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Revised execution source. Proceed with implementation.

## Product Source

`UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V2_2026-06-16_11-04-00_IST.md`

## Review Closure

This plan resolves `FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-08-00_IST.md` by:

- making typecheck and lint mandatory for local completion;
- defining exact repair success data checks;
- requiring seed DB path guardrails;
- defining a practical PDF error evidence fallback;
- requiring harness false positives to remain recorded in the browser report.

## Scope

Implement Android A2 local/browser-mobile completion for:

- `/capture`
- `/needs-upgrade`
- `/items/[id]/repair`

Do not claim APK evidence or production release.

## Planned Code Changes

### 1. Capture Mobile Layout

Files:

- `src/app/capture/page.tsx`
- `src/app/capture/tabs.tsx`
- `src/app/capture/pdf-dropzone.tsx`

Tasks:

- Use compact mobile padding with desktop max-width preserved.
- Make tabs full-width or wrap-safe on mobile.
- Add concise production-truth copy for URL, PDF, and Note.
- Add bottom padding so fixed mobile nav cannot cover Save URL, duplicate controls, PDF dropzone/error, Note title/body, Save note, or Cancel.
- Preserve existing server actions and API behavior.
- Do not add inline simulated result cards.

### 2. Needs Upgrade Mobile Layout

File:

- `src/app/needs-upgrade/page.tsx`

Tasks:

- Use compact mobile header and cards.
- Keep reason grouping and count.
- Change weak item titles from truncation to wrapping.
- Keep Add text and Source actions with mobile-safe wrapping.
- Preserve empty state.
- Do not add mark-good-enough or dismissal controls.

### 3. Repair Mobile Layout

Files:

- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`

Tasks:

- Use compact mobile spacing and bottom padding.
- Add item context and weak-source explanation if missing from the page wrapper.
- Make repair type selector wrap-safe.
- Keep Save repair, Cancel, and Open source when available.
- Preserve action redirect and validation.

### 4. A2 Fixtures And Guards

Files:

- `scripts/ux-v2-seed-android-a2-capture-repair-needs-upgrade.ts`
- `scripts/ux-v2-check-android-a2-copy.ts`

Seed rules:

- Script must read `process.env.BRAIN_DB_PATH` and fail if unset.
- The command must pass `BRAIN_DB_PATH=/tmp/<a2-db>.sqlite` before imports bind the DB singleton.
- Manifest must include DB path, weak item IDs, duplicate URL, tag ID/name, collection ID/name, and route paths.
- Use temporary DBs only; never production data.

Forbidden scanner must fail on active A2 surfaces for:

- `Mark good enough`
- `Good enough`
- `Merge`
- `Keep both`
- `Offline queue`
- `Available offline`
- `Offline sync`
- `Paste Text` as a capture action label
- `AI Brain`
- `Your Brain`
- QR/biometric/package-migration/telemetry/delete-all-data claims

### 5. Repair Success Data Checks

The A2 browser/report harness or a companion script must verify after successful repair:

- repaired item exists;
- repaired item body contains the submitted repair text;
- repaired item `capture_quality` is no longer one of the weak values used by Needs Upgrade;
- repaired item no longer appears in `listNeedsUpgradeItems`;
- manual tag relation count for the item remains at least 1;
- collection membership count for the item remains at least 1;
- item detail route renders the repair success banner or repaired body cue.

### 6. PDF Error Evidence

Preferred evidence:

- Browser action dispatches a synthetic drop/change with a non-PDF `File` if Browser MCP supports it and captures the rendered "Only PDF files are supported." error.

Fallback evidence:

- Add a focused test or script harness for the `PdfDropzone` non-PDF branch if browser file/drop cannot be performed reliably.
- Browser QA may then capture the normal PDF tab/dropzone, and the QA report must label PDF non-PDF proof as script-backed rather than browser-action-backed.

## Browser QA Plan

Evidence folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a2-capture-repair-needs-upgrade/`

Report:

`android-a2-capture-repair-needs-upgrade-browser-report.json`

Required states:

- 390 x 844 and 430 x 932:
  - capture URL tab
  - capture PDF tab
  - capture Note tab
  - Needs Upgrade grouped queue
  - Repair default
- 390 x 844:
  - URL duplicate state
  - PDF non-PDF error, or script-backed fallback with rendered error if feasible
  - Needs Upgrade empty state
  - Repair validation error
  - Repair success path
  - post-repair Needs Upgrade absence

Assertions:

- no horizontal overflow;
- bottom nav present on protected app routes;
- named critical controls visible/tappable above bottom nav;
- forbidden prototype controls absent;
- URL duplicate, repair validation, and repair success are action-backed;
- repair success data checks pass;
- any harness false positives are retained in `harnessCorrections` with raw sample and resolution.

## Mandatory Validation Commands Before A2 Completion

- `node --import tsx scripts/ux-v2-check-android-a2-copy.ts`
- A2 seed smoke command with `BRAIN_DB_PATH=/tmp/<a2-db>.sqlite`
- focused tests impacted by capture/repair changes
- `git diff --check`
- `npm run typecheck`
- `npm run lint`

Strongly expected unless blocked:

- `npm test`
- `npm run build`

If full suite or build cannot be rerun, the QA doc must state the exact blocker and keep release status no-go.

## Deliverables

- A2 code changes.
- A2 seed/check scripts.
- Browser evidence folder/report.
- `UX_v2/execution/ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_QA_<timestamp>.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`
- Master tracker overlay update.
- Running log milestone entry through the Codex running-log skill.

## No-Go Gates

- Do not execute production deploy.
- Do not claim APK/device validation.
- Do not include Magic Patterns simulated controls: Merge, Keep both, mark-good-enough, standalone Paste Text capture, offline queue/read/sync.
- Do not claim repair success without data-state proof.
- Do not claim local A2 completion without typecheck and lint unless explicitly blocked and reported.
