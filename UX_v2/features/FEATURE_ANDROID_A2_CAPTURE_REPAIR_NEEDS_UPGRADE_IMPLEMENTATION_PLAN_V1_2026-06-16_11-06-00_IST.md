# Android A2 Capture / Repair / Needs Upgrade Implementation Plan V1

Created: 2026-06-16 11:06:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Draft for adversarial review. Do not execute until revised.

## Product Source

`UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V2_2026-06-16_11-04-00_IST.md`

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

- Reduce mobile horizontal padding from desktop-like spacing to compact mobile spacing while preserving desktop max width.
- Make tabs full-width or wrap-safe on mobile.
- Add concise mobile support copy for URL, PDF, and Note.
- Ensure Save URL, Save note, PDF browse/dropzone, errors, duplicate controls, and Cancel have bottom-nav clearance.
- Preserve existing actions and server/API behavior.

### 2. Needs Upgrade Mobile Layout

File:

- `src/app/needs-upgrade/page.tsx`

Tasks:

- Reduce mobile padding and use compact mobile cards.
- Keep reason grouping and count.
- Make weak item rows wrap long titles instead of truncating.
- Keep Add text and Source actions.
- Preserve empty state.
- Do not add mark-good-enough or dismissal controls.

### 3. Repair Mobile Layout

Files:

- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`

Tasks:

- Add mobile-appropriate spacing, item context, weak-source explanation, and bottom-nav clearance.
- Make repair type selector wrap-safe.
- Keep Save repair, Cancel, and Open source when available.
- Preserve action redirect and validation.

### 4. A2 Fixtures And Guards

Files:

- `scripts/ux-v2-seed-android-a2-capture-repair-needs-upgrade.ts`
- `scripts/ux-v2-check-android-a2-copy.ts`

Tasks:

- Seed deterministic queue, duplicate, repair, and empty states into isolated temporary DBs or a manifest-supported reset flow.
- Include item IDs, weak item ID, duplicate URL, tag, collection, and route paths in the manifest.
- Add forbidden copy/action scanner for A2 surfaces.

### 5. Focused Tests

Possible files:

- `src/app/actions.bulk.test.ts` only if reused behavior changes.
- Existing capture/repair tests if behavior changes.
- Add helper tests only if new helper logic is introduced.

Tasks:

- Prefer no new app logic. If only layout classes change, rely on existing capture/repair action tests plus A2 scripts.
- If a helper is added for A2 state labels or copy, test it.

## Browser QA Plan

Use temporary DB(s), local authenticated session, and Android-like viewports.

Required evidence:

- 390 x 844 and 430 x 932:
  - capture URL tab
  - capture PDF tab
  - capture Note tab
  - Needs Upgrade grouped queue
  - Repair default
- 390 x 844:
  - URL duplicate state
  - PDF non-PDF error
  - Needs Upgrade empty state
  - Repair validation error
  - Repair success path
  - post-repair Needs Upgrade absence

Report:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a2-capture-repair-needs-upgrade/android-a2-capture-repair-needs-upgrade-browser-report.json`

Assertions:

- no horizontal overflow;
- bottom nav present on protected app routes;
- critical controls visible/tappable above bottom nav;
- forbidden prototype controls absent;
- action-backed states are produced by real UI/action paths where possible;
- repair success removes the weak item from Needs Upgrade.

## Validation Commands

Minimum before A2 QA doc:

- `node --import tsx scripts/ux-v2-check-android-a2-copy.ts`
- A2 seed smoke command
- focused capture/repair tests impacted by changes
- `git diff --check`

If time and local state allow:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

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
