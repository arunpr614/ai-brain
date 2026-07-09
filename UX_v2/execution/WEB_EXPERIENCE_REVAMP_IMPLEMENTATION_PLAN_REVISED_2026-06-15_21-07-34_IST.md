# AI Memory Web Experience Revamp Implementation Plan - Revised

Created: 2026-06-15 21:07:34 IST
Owner: Next-day AI implementation agent
Status: Revised execution plan. This plan supersedes `WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_2026-06-15_20-35-06_IST.md`.

## Inputs

- Project root: `/private/tmp/ai-brain-ux-v2-main-ready`
- Revised PRD: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
- Prior implementation plan: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_2026-06-15_20-35-06_IST.md`
- Adversarial review report: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_20-43-03_IST.md`
- Magic Patterns web design: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Related Android Magic Patterns design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Next-day handover: `/private/tmp/ai-brain-ux-v2-main-ready/Handover_docs/AI_MEMORY_WEB_REVAMP_NEXT_DAY_HANDOVER_2026-06-15_20-54-53_IST.md`

## Purpose

Execute a complete web experience revamp so every approved in-scope web screen matches the Magic Patterns web design, while protecting live data, preserving rollback safety, and proving the revamp through reproducible browser QA.

This revised plan exists because the adversarial review found that the prior plan had enough direction to start discovery, but not enough operational detail to safely proceed through implementation, QA, and deployment. The implementation agent must resolve the Phase 0 and Phase 1 gates in this document before coding the revamp.

## Adversarial Review Resolution Summary

| Review finding | Resolution in this plan | Gate |
|---|---|---|
| P1: No deterministic fixture or state-generation plan | Adds a required fixture plan with named local seeded states for every major screen and state | No implementation until fixture plan exists |
| P1: No authenticated browser QA credential/session strategy | Adds a required auth QA strategy with local test sessions, redaction rules, and production session handling | No browser QA until auth strategy exists |
| P1: Browser visual QA not reproducible from repo | Adds a required browser QA harness with route list, viewport matrix, output folders, console/network capture, and naming rules | No QA pass without captured evidence |
| P1: Smoke gates are waivable and mix code smoke with browser smoke | Splits static, local browser, interaction, visual, staging, and production smoke gates; critical smoke cannot be waived | No deploy with failed P0/P1 smoke |
| P1: Backup/rollback not operational enough | Adds exact backup, integrity, restore, status, and evidence requirements; deploy script backup is not assumed | No deploy without verified backup and rollback runbook |
| P1: Magic Patterns source capture underspecified | Requires source snapshot directory with screenshots, extracted component/source notes, responsive captures, and capture limitations | No coding without design-source snapshot |
| P1: Pair Device Android validation underspecified | Adds Android pairing runbook with install, pairing, relaunch, invalid/expired code, and log evidence | No paired-capture claim without validation |
| P2: Static asset/service-worker smoke regressed | Adds required public asset and offline route checks | No release-ready claim without asset smoke |
| P2: Observability checks too shallow | Adds runtime logs, health, service status, network, console, and API response checks | No post-deploy pass without observability evidence |
| P2: Data mutation QA not separated from production smoke | Separates local mutation tests from production read-only smoke; any production temp records need cleanup proof | No production destructive testing |
| P2: Staging fallback too permissive | Requires staging/deploy-preview attempt or documented unavailability plus local production-build compensation | No deploy if staging access exists but is skipped |
| P2: Untracked source-doc state not closed | Requires committing or explicitly listing changed source documents before coding | No implementation with unknown doc baseline |
| P3: No matrix templates | Adds templates in this plan | Matrices must use these templates or stricter equivalents |
| P3: Commit hash can go stale | Treats commit as observed baseline only and requires fresh baseline at start | Fresh baseline required |
| P3: Notifications lack content/evidence | Adds required notification templates and evidence checklist | Notify Arun before and after deploy |

## Scope

### In Scope

The implementation must cover every approved web screen, route, and state in the revised PRD and Magic Patterns web design:

- App shell, navigation, responsive layout, dark theme, spacing, icons, tokens, typography, and interaction states.
- Search.
- Library list, filters, source rows, quality/status badges, empty/loading/error states.
- Source detail/item detail, including metadata-only and full-text states.
- Needs Upgrade list and detail flows.
- Ask flow, answer states, citations, empty states, and error states.
- Capture flow for URL, text, YouTube, article, PDF, note, Telegram-supported sources, duplicate/update cases, and failed captures.
- Settings, including providers, capture modes, exports, storage, pairing, account/session states, and dangerous/advanced settings.
- Topic and collection routes that already exist and are approved in the PRD.
- Pair Device web flow and Android pairing validation required to prove deployed assets and cross-device UX behavior.
- Offline/service-worker/public asset checks required for release readiness.

### Out of Scope Unless Arun Approves

Do not implement features that are not approved by the revised PRD, the Magic Patterns web design, or the confirmed handover. If discovered during audit, record them as `Needs Arun decision`.

Examples that require explicit approval unless already present in the approved design/source set:

- New billing, subscription, or pricing surfaces beyond existing "Needs Upgrade" messaging.
- New collaboration/sharing/team features.
- New AI model marketplace, automation builder, or analytics dashboard features.
- New native Android-only screens unrelated to web pairing validation.
- New storage providers or export destinations not already present in product contracts.

## Non-Negotiable Release Rules

- No deploy with failing tests, failing build, unresolved P0/P1 issues, unknown data risk, missing rollback, missing backup/restore evidence, missing deploy access, or unvalidated critical UX screens.
- No coding begins until Phase 0 source capture and Phase 1 execution artifacts are complete.
- No Android UX v2 or paired-capture claim until Android loads the deployed web assets and pairing is validated on device or emulator.
- No production destructive QA. Production smoke is read-only unless the runbook defines a temporary object, cleanup path, and cleanup proof.
- No silent assumptions for existing decision IDs or deferred items. Resolve, defer with rationale, or mark blocker.
- No same-version Android APK overwrite.
- No screenshots or artifacts may expose PINs, tokens, cookies, private notes, provider keys, or personal data.

## Required Working Artifacts

Create these files under `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/` before or during the named phase. Use date/time in filenames.

| Artifact | Phase | Required content |
|---|---:|---|
| `WEB_EXPERIENCE_REVAMP_BASELINE_<timestamp>.md` | 0 | Branch, commit, dirty state, tool versions, app entrypoints, build/test baseline, deploy target, live URL, staging availability, known blockers |
| `WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_<timestamp>/` | 0 | Web design screenshots, responsive screenshots, extracted component/source notes, source URLs, capture method, limitations |
| `WEB_EXPERIENCE_REVAMP_SOURCE_MANIFEST_<timestamp>.md` | 0 | PRD, plan, review, Magic Patterns snapshot, handover, trackers, release packet, decisions, git refs |
| `WEB_EXPERIENCE_REVAMP_FIXTURE_PLAN_<timestamp>.md` | 1 | Deterministic local seeded states, screen coverage, data setup and teardown, production restrictions |
| `WEB_EXPERIENCE_REVAMP_AUTH_QA_STRATEGY_<timestamp>.md` | 1 | Local session setup, authenticated route access, redaction rules, production session handling, Android pairing auth |
| `WEB_EXPERIENCE_REVAMP_BROWSER_QA_HARNESS_<timestamp>.md` | 1 | Route list, viewport matrix, browser tool/script, output paths, naming convention, console/network/a11y checks |
| `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_<timestamp>.md` | 1 | Every route and state mapped to source, fixture, owner, implementation status, QA status |
| `WEB_EXPERIENCE_REVAMP_CAPABILITY_AUDIT_<timestamp>.md` | 1 | Search, capture, pairing, providers, export, storage, offline, Android shell contract |
| `WEB_EXPERIENCE_REVAMP_BACKUP_ROLLBACK_RUNBOOK_<timestamp>.md` | 1 | Exact backup, integrity, restore, service status, smoke, rollback owner, evidence paths |
| `WEB_EXPERIENCE_REVAMP_STAGING_FEASIBILITY_<timestamp>.md` | 1 | Staging/deploy-preview access result, URL, blocker if unavailable, local production-build compensation |
| `WEB_EXPERIENCE_REVAMP_ANDROID_PAIRING_RUNBOOK_<timestamp>.md` | 1 | APK path/version, install steps, pairing steps, relaunch persistence, invalid/expired code tests, logs |
| `WEB_EXPERIENCE_REVAMP_OBSERVABILITY_CHECKLIST_<timestamp>.md` | 1 | Health, logs, service status, browser console/network, API smoke, provider/export/pairing errors |
| `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_<timestamp>/` | 10 | Screenshots by route/state/viewport, console logs, network logs, accessibility notes, Magic Patterns comparisons |
| `WEB_EXPERIENCE_REVAMP_QA_REPORT_<timestamp>.md` | 10-13 | Static, browser, interaction, visual, accessibility, Android pairing, asset/offline, staging, production results |
| `WEB_EXPERIENCE_REVAMP_CODE_REVIEW_<timestamp>.md` | 11 | Findings, severity, fixes, deferrals |
| `WEB_EXPERIENCE_REVAMP_RELEASE_PACKET_<timestamp>.md` | 12-14 | Gate status, backup proof, rollback proof, deploy command/result, smoke result, release notes, deferred items |
| `RUNNING_LOG.md` updates | All | Milestones, blockers, decisions, QA, deploy steps, final result |

## Phase 0 - Baseline, Source Freeze, and Design Capture

### Goal

Create a reliable starting point before code changes. The next agent must be able to prove exactly what design source, code revision, docs, and release assumptions were used.

### Tasks

1. Confirm the repo root and current branch.
2. Capture fresh git status and commit hash. Treat any commit hash in older docs as historical only.
3. Identify changed or untracked source documents and decide whether to commit, stage, or list them in the baseline. Implementation cannot begin with unknown source-doc state.
4. Record tool versions:
   - Node and npm.
   - Android tooling, if available.
   - Browser QA tooling or connector availability.
   - Deployment CLI or SSH access method.
5. Identify app entrypoints:
   - Web app routes and start/build scripts.
   - Public asset directory.
   - API routes used by capture, search, providers, export, storage, pairing, health.
   - Android shell location and APK artifacts.
6. Run baseline static checks if available:
   - Typecheck.
   - Lint.
   - Unit tests.
   - Production build.
   - Existing smoke script.
7. Capture Magic Patterns source:
   - Open the Magic Patterns web design.
   - Capture desktop screenshots for every visible screen/state.
   - Capture responsive screenshots at minimum widths: 390, 768, 1024, 1440.
   - Extract or document component/source structure if Magic Patterns exposes source code.
   - Save the captured assets and notes under `WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_<timestamp>/`.
   - If Magic Patterns source cannot be accessed, document the exact blocker. Visual implementation may continue only from screenshots if the PRD allows it; otherwise block and ask Arun.
8. Create `WEB_EXPERIENCE_REVAMP_SOURCE_MANIFEST_<timestamp>.md`.
9. Update `RUNNING_LOG.md` with the baseline and source-capture milestone.

### Exit Criteria

- Baseline artifact exists.
- Magic Patterns source snapshot exists.
- Source manifest exists.
- Untracked or changed source-doc state is closed or explicitly listed.
- Baseline test/build results are documented.

## Phase 1 - Execution Artifacts and Hard Gates

### Goal

Close every P1 operational gap from the adversarial review before coding.

### 1. Fixture Plan

Create `WEB_EXPERIENCE_REVAMP_FIXTURE_PLAN_<timestamp>.md`.

Required fixture states:

| Screen/Area | Required local seeded states |
|---|---|
| App shell | Logged out, logged in, collapsed/expanded nav, desktop, tablet, mobile |
| Search | Empty query, results, no results, keyboard focus, loading, error |
| Library | Populated, empty, loading, failed load, all filters, selected filters, source quality variations |
| Library source rows | Full text, transcript, metadata only, needs upgrade, enrichment failed, duplicate, long title, long provider |
| Source detail | Full text, metadata only, failed enrichment, long content, provider metadata, missing provider |
| Needs Upgrade | Populated list, empty list, item detail, batch states if present |
| Ask | Empty prompt, loading answer, answer with citations, no citation, not enough context, failed answer |
| Capture | URL success, URL metadata only, YouTube transcript, article full text, PDF, note, duplicate/update, invalid URL, provider failure, limited mode |
| Settings | All tabs/categories, provider connected, provider missing, export configured, export error, storage available, storage warning |
| Pair Device | Code generated, code expired, code rejected, Android linked, unlink/error states |
| Topic routes | Populated, empty, not found, loading, error |
| Collection routes | Populated, empty, not found, loading, error |
| Offline/assets | Offline page, manifest, logo, favicon, icons |

Rules:

- Local seeded database is the default for mutation and error-state QA.
- Fixtures must be repeatable from a clean checkout.
- Fixture data must not contain secrets or personal notes.
- Production smoke must be read-only unless a temporary object and cleanup proof are documented.

### 2. Authenticated QA Strategy

Create `WEB_EXPERIENCE_REVAMP_AUTH_QA_STRATEGY_<timestamp>.md`.

Required decisions:

- How the local web app enters an authenticated state.
- How browser QA receives a valid local session.
- Which credentials, PINs, cookies, and tokens must never be saved in screenshots or docs.
- How production protected routes are smoked without exposing secrets.
- How Android pairing auth is established and validated.
- How failed/expired pairing states are tested safely.

Minimum requirements:

- Use a local test session or local test PIN for QA.
- Redact all tokens, cookies, PINs, provider keys, and personal data from artifacts.
- Do not commit credentials.
- If production session access is unavailable, block deploy rather than claiming live authenticated smoke passed.

### 3. Browser QA Harness

Create `WEB_EXPERIENCE_REVAMP_BROWSER_QA_HARNESS_<timestamp>.md`.

Required content:

- Browser tool choice: repo script, in-app browser, Chrome automation, or Playwright if already supported.
- Route/state list from the route-state matrix.
- Viewports:
  - 390x844 mobile.
  - 768x1024 tablet.
  - 1024x768 compact desktop.
  - 1280x800 laptop.
  - 1440x900 desktop.
  - 1920x1080 large desktop.
- Evidence folder:
  - `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_<timestamp>/screenshots/`
  - `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_<timestamp>/console/`
  - `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_<timestamp>/network/`
  - `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_<timestamp>/a11y/`
- Naming convention:
  - `<route-slug>__<state>__<viewport>__<theme>.png`
  - `<route-slug>__<state>__<viewport>__console.txt`
  - `<route-slug>__<state>__<viewport>__network.json`
- Checks:
  - Visual match to Magic Patterns source.
  - No white-on-white or low-contrast primary actions.
  - No text clipping or overlap.
  - No hidden critical controls.
  - Keyboard focus visible.
  - Browser console has no new errors.
  - Network has no failed critical requests.
  - Loading, empty, and error states render intentionally.
  - 200 percent browser zoom spot checks for dense views.
  - Reduced-motion behavior where animation is present.

### 4. Route and State Matrix

Create `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_<timestamp>.md`.

Every row must include:

- Screen/route.
- State.
- Source of truth.
- Fixture.
- Current implementation status.
- Required change.
- Owner.
- Validation method.
- Evidence artifact path.
- Release status.

### 5. Capability Audit

Create `WEB_EXPERIENCE_REVAMP_CAPABILITY_AUDIT_<timestamp>.md`.

Minimum coverage:

- Capture providers.
- Search.
- Ask/citations.
- Needs Upgrade and enrichment.
- Export.
- Storage.
- Provider settings.
- Pair Device web endpoint.
- Android web-asset shell contract.
- Offline/service-worker/public assets.
- Existing routes that are responsive-nav-only, such as `/more`, if present.

### 6. Backup and Rollback Runbook

Create `WEB_EXPERIENCE_REVAMP_BACKUP_ROLLBACK_RUNBOOK_<timestamp>.md`.

The runbook must not assume deploy scripts create backups. It must include exact commands adapted to the live host.

Required predeploy backup steps:

```bash
TS=<YYYYMMDD-HHMMSS>
ssh brain "sudo mkdir -p /opt/brain/data/backups"
ssh brain "sudo cp /opt/brain/data/brain.sqlite /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite"
ssh brain "sudo chown brain:brain /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite"
ssh brain "sudo -u brain sqlite3 /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite 'PRAGMA integrity_check;'"
ssh brain "sudo -u brain sqlite3 /opt/brain/data/brain.sqlite 'SELECT COUNT(*) AS item_count FROM items;'"
```

Required restore steps:

```bash
ssh brain "sudo systemctl stop brain"
ssh brain "sudo -u brain /opt/brain/scripts/restore-from-backup.sh /opt/brain/data/backups/<snapshot>.sqlite"
ssh brain "sudo systemctl start brain"
ssh brain "sudo systemctl status brain --no-pager"
```

If these commands do not match the host, update the runbook with verified host-specific commands before deploy.

Required evidence:

- Backup path.
- Backup timestamp.
- Integrity check output.
- Row-count sanity check.
- Restore command path.
- Service restart command.
- Rollback smoke route list.
- Person/agent responsible.

### 7. Staging or Deploy-Preview Feasibility

Create `WEB_EXPERIENCE_REVAMP_STAGING_FEASIBILITY_<timestamp>.md`.

Requirements:

- Attempt to identify staging or deploy-preview access.
- If available, use it for browser smoke before production.
- If unavailable, document the exact reason and compensate with local production-build browser QA.
- Staging cannot be skipped silently.

### 8. Android Pairing Runbook

Create `WEB_EXPERIENCE_REVAMP_ANDROID_PAIRING_RUNBOOK_<timestamp>.md`.

Required validation:

- Identify APK path, versionName, versionCode, and whether a rebuild is required.
- Install on emulator or physical Android device.
- Launch the Android shell.
- Confirm Android loads the deployed or target web assets.
- Generate Pair Device code on web.
- Enter code on Android.
- Verify successful pairing.
- Relaunch Android and confirm pairing persists.
- Test invalid code.
- Test expired code.
- Capture redacted Android logs.
- Capture redacted web logs/API responses.

Rules:

- Do not publish or overwrite an APK unless versionCode/versionName strategy is documented.
- Do not claim Android UX v2 from web-only evidence.
- Do not claim paired capture until pairing validation passes.

### 9. Observability Checklist

Create `WEB_EXPERIENCE_REVAMP_OBSERVABILITY_CHECKLIST_<timestamp>.md`.

Required checks:

- `/api/health` or equivalent health route.
- Critical API responses for search, library, capture, ask, settings, pair device.
- Browser console errors and warnings.
- Browser network failed requests.
- Server logs after deploy.
- Service status and restart count.
- Provider/export/storage errors.
- Pairing API errors.
- Public asset requests.

### Phase 1 Exit Criteria

- All Phase 1 artifacts exist.
- Route-state matrix covers every approved screen/state.
- Fixtures are defined and repeatable.
- Auth strategy is documented.
- Browser QA harness is reproducible.
- Backup and rollback are operational.
- Android pairing runbook is executable.
- Staging availability is decided with evidence.
- `RUNNING_LOG.md` is updated.

## Phase 2 - Design Tokens, Primitives, and Contrast Safety

### Goal

Create a shared visual foundation that matches Magic Patterns and prevents the white-button contrast regression from returning.

### Tasks

1. Audit existing CSS tokens and component-level Tailwind arbitrary values.
2. Introduce or finalize semantic tokens:
   - `--action-primary-bg`
   - `--action-primary-fg`
   - `--action-primary-hover-bg`
   - `--action-primary-border`
   - `--control-selected-bg`
   - `--control-selected-fg`
   - `--control-selected-border`
   - `--surface-*`
   - `--text-*`
   - `--status-*`
3. Migrate primary filled actions away from `bg-[var(--accent-9)] text-[var(--on-accent)]`.
4. Migrate selected filter pills away from `border-[var(--accent-9)]`.
5. Create or consolidate shared UI primitives:
   - Button.
   - Icon button.
   - Filter pill.
   - Badge/status chip.
   - Search input.
   - Card/list row.
   - Empty state.
   - Error state.
   - Loading/skeleton state.
   - Modal/sheet if present.
6. Run broad scans:

```bash
rg "bg-\[var\(--accent-9\)\]" src/app src/components
rg "text-\[var\(--on-accent\)\]" src/app src/components
rg "border-\[var\(--accent-9\)\]" src/app src/components
```

7. Add focused contrast checks where existing test infrastructure supports them.
8. Update route-state matrix entries affected by token migration.

### Exit Criteria

- Primary actions are readable in dark and light themes.
- Selected controls have intentional selected-control tokens.
- Reused primitives exist or existing local primitives are updated.
- No known low-contrast primary-action pair remains.

## Phase 3 - App Shell and Navigation

### Goal

Align the entire web shell to Magic Patterns before revamping individual screens.

### Tasks

1. Implement desktop shell:
   - Left navigation width, logo block, version/private-memory line.
   - Navigation groups, active states, badges, icons, spacing.
   - Main content container width and top spacing.
   - Header actions and responsive behavior.
2. Implement tablet and mobile shell:
   - Responsive navigation behavior from Magic Patterns.
   - Bottom or condensed navigation only if present in approved design.
   - Touch targets at least 44px.
3. Implement global states:
   - Loading.
   - Auth/session required.
   - App-level error.
   - Offline state if supported.
4. Validate no overlapping UI at all required viewports.

### Exit Criteria

- Shell matches Magic Patterns across required viewports.
- Navigation state is clear and accessible.
- No route loses critical actions on mobile/tablet.

## Phase 4 - Library, Search, Topic, and Collection Screens

### Goal

Revamp the high-traffic browsing experience.

### Tasks

1. Library screen:
   - Header, source count, search, filters, quality filters, list rows, badges.
   - Full text, transcript, metadata-only, needs-upgrade, enrichment-failed states.
   - Empty, loading, error states.
2. Search:
   - Search input styling and behavior.
   - Results, no results, loading, keyboard focus, error.
3. Topic routes:
   - Populated, empty, not found, loading, error.
   - Responsive behavior.
4. Collection routes:
   - Populated, empty, not found, loading, error.
   - Responsive behavior.
5. Verify long titles, provider labels, and status badges do not clip or overlap.

### Exit Criteria

- Library/search/topic/collection screens match Magic Patterns and route-state matrix.
- Filter selected states use selected-control tokens.
- All visual evidence is captured.

## Phase 5 - Source Detail, Needs Upgrade, and Ask

### Goal

Revamp source consumption and question-answering flows.

### Tasks

1. Source detail:
   - Metadata header.
   - Content body.
   - Metadata-only state.
   - Failed enrichment state.
   - Long content behavior.
2. Needs Upgrade:
   - List state.
   - Empty state.
   - Detail or remediation state if present.
   - Upgrade count badge behavior.
3. Ask:
   - Prompt input.
   - Answer loading.
   - Answer with citations.
   - Not enough context.
   - Error state.
   - Citation cards/links.
4. Validate keyboard and screen-reader affordances for prompt and citations.

### Exit Criteria

- All detail and Ask states are implemented and validated.
- Citation and metadata layouts are usable on mobile and desktop.

## Phase 6 - Capture Flow

### Goal

Revamp capture without risking existing capture behavior.

### Tasks

1. Implement capture UI from Magic Patterns:
   - URL capture.
   - Text/note capture if present.
   - Source-type detection if present.
   - Success, duplicate/update, metadata-only, provider failure, invalid URL, loading.
2. Validate capture contracts through local fixtures and local mutation QA.
3. Confirm production smoke is read-only unless temp object cleanup is documented.
4. Preserve existing data paths and avoid schema changes unless Phase 8 authorizes them.

### Exit Criteria

- Capture UI matches design.
- Local mutation tests pass.
- Production mutation risk is documented and controlled.

## Phase 7 - Settings, Providers, Export, Storage, and Pair Device Web

### Goal

Revamp operational settings and cross-device setup with enough clarity for release.

### Tasks

1. Settings shell and categories:
   - Account/session.
   - Providers.
   - Capture modes.
   - Export.
   - Storage.
   - Pair Device.
   - Advanced/dangerous actions if present.
2. Provider states:
   - Connected.
   - Missing.
   - Error.
   - Disabled/unavailable.
3. Export states:
   - Configured.
   - Missing destination.
   - Export success.
   - Export error.
4. Storage states:
   - Available.
   - Warning.
   - Error.
5. Pair Device web:
   - Generate code.
   - Code active.
   - Code expired.
   - Code rejected.
   - Android linked.
   - Unlink/error if present.
6. Validate Android pairing using the Phase 1 runbook after local and deployed builds.

### Exit Criteria

- Settings and pairing states match Magic Patterns.
- Provider/export/storage behavior is preserved.
- Pair Device web evidence is captured.

## Phase 8 - Storage, API, Schema, and Data Risk Review

### Goal

Prevent UI work from accidentally introducing unsafe data or API changes.

### Tasks

1. Review every changed API route and data access path.
2. Identify whether any schema, migration, storage, or provider changes are required.
3. If no data changes are required, document that explicitly in the release packet.
4. If data changes are required:
   - Create migration plan.
   - Create backup/restore plan.
   - Create rollback plan.
   - Validate against local test data.
   - Document failure modes.
   - Do not deploy until migration risk is resolved.
5. Separate local mutation QA from production smoke.

### Exit Criteria

- Data risk is known.
- Any schema/storage/API changes have a documented migration and rollback path.
- Unknown data risk is a deploy blocker.

## Phase 9 - Static, Unit, Build, and Asset Gates

### Goal

Prove the code is stable before visual/browser QA.

### Required Gates

Run and record:

- Typecheck.
- Lint.
- Unit tests.
- Production build.
- Existing smoke script.
- Public asset smoke.
- Service-worker/offline smoke if supported.

Public asset smoke must cover:

- `/offline.html`
- `/ai-memory-logo.png`
- `/manifest.webmanifest`
- Favicon and web-app icons.
- Any responsive-nav-only route such as `/more`, if it still exists.

### Rules

- Failed static/build/test gates block deploy.
- Critical smoke failures block deploy.
- A waiver is allowed only for unrelated legacy non-critical failures with evidence, owner, and rationale.
- A waiver cannot be used for failing build, failing typecheck, failing P0/P1 tests, broken critical route, broken auth, broken capture, broken pairing, broken backup, or broken rollback.

### Exit Criteria

- Static gates are green or blocked with documented non-deploy status.
- Asset/offline smoke is documented.

## Phase 10 - Browser Visual, Interaction, Accessibility, and Responsive QA

### Goal

Prove the web revamp matches Magic Patterns and is usable in real browser states.

### Required QA

Use the Phase 1 browser QA harness to validate every route/state in the route-state matrix.

For each critical route/state:

- Capture screenshot at required viewports.
- Capture console output.
- Capture failed network requests.
- Check keyboard focus.
- Check click/tap interaction.
- Check loading/empty/error state.
- Check contrast.
- Check text clipping and overlap.
- Compare against Magic Patterns screenshot/source.

### Required Interaction Smoke

- Navigate every primary nav item.
- Use Search.
- Filter Library.
- Open a source detail.
- Open Needs Upgrade.
- Ask a question in local fixture state.
- Open Capture and perform local fixture capture.
- Open Settings categories.
- Generate Pair Device code.
- Complete Android pairing validation where environment allows.

### Exit Criteria

- Visual evidence folder is complete.
- No unvalidated critical screen remains.
- No P0/P1 visual or interaction issues remain.

## Phase 11 - Code Review and Fix Pass

### Goal

Find and resolve release-blocking implementation risks.

### Tasks

1. Perform local code review focused on:
   - Broken behavior.
   - Data risk.
   - Security leaks.
   - Auth/session exposure.
   - Accessibility regressions.
   - Responsive regressions.
   - Missing tests.
   - Over-broad refactors.
2. Classify findings:
   - P0: must fix.
   - P1: must fix.
   - P2: fix or defer with evidence and owner.
   - P3: defer if safe.
3. Fix P0/P1 before release.
4. Update QA report and release packet.

### Exit Criteria

- Code review artifact exists.
- No unresolved P0/P1 remains.

## Phase 12 - Predeploy Backup, Rollback, and Release Gate

### Goal

Make the release safely reversible.

### Tasks

1. Run the verified backup command from the backup/rollback runbook.
2. Verify backup integrity.
3. Record backup path and timestamp.
4. Confirm rollback command and restore script path.
5. Confirm deploy target and access.
6. Confirm staging/deploy-preview smoke result or documented unavailability.
7. Confirm Android APK/version strategy if Android validation or publication is involved.
8. Prepare Arun notification with:
   - Release summary.
   - Gate status.
   - Backup path.
   - Rollback method.
   - Known deferrals.
   - Expected deploy time.

### No-Go Gate

Do not deploy if any of these are true:

- Failing build.
- Failing typecheck.
- Failing critical test.
- Unresolved P0/P1.
- Missing backup evidence.
- Missing rollback command.
- Missing deploy access.
- Unknown data risk.
- Missing authenticated browser smoke.
- Missing critical route visual QA.
- Missing Android pairing validation when pairing claims are included.
- Staging exists but was skipped.

### Exit Criteria

- Release packet says `Go`.
- Arun has been notified before deploy.

## Phase 13 - Deploy and Postdeploy Smoke

### Goal

Deploy only after gates pass, then prove the live app works.

### Tasks

1. Deploy using the verified deploy command or process.
2. Record deploy output.
3. Run live health check.
4. Run live authenticated smoke.
5. Run live public asset smoke.
6. Run live browser smoke on critical routes:
   - Library.
   - Search.
   - Source detail.
   - Needs Upgrade.
   - Ask.
   - Capture.
   - Settings.
   - Pair Device.
7. Check server logs and service status.
8. Validate Android loads deployed assets.
9. Validate Android pairing if pairing is part of release claim.
10. If any release-breaking failure occurs:
    - Stop.
    - Preserve evidence.
    - Roll back if needed.
    - Update release packet and running log.
    - Notify Arun with failure and remediation.
11. If deploy passes:
    - Update release packet.
    - Update running log.
    - Notify Arun after deploy with evidence links.

### Exit Criteria

- Live smoke passes.
- Observability checks pass.
- Android deployed-asset check passes or is documented as nonblocking with no Android UX/pairing claim.

## Phase 14 - Closure

### Goal

Leave a clean handoff and release record.

### Tasks

1. Finalize release packet.
2. Finalize QA report.
3. Finalize route-state matrix release statuses.
4. Finalize deferred/needs-decision register.
5. Update `RUNNING_LOG.md`.
6. Create next-agent handover only if work remains.
7. Final summary to Arun must state:
   - What shipped.
   - What was validated.
   - What was deferred.
   - Known risks.
   - Backup path.
   - Rollback path.
   - Live URL.
   - Android validation status.

### Done Definition

The web experience revamp is done only when:

- Every approved in-scope web screen/state is implemented or explicitly deferred with blocker/rationale.
- Magic Patterns visual comparison is complete.
- Tests/builds pass.
- Browser QA evidence exists.
- Backup and rollback are verified.
- Staging/deploy-preview is used or unavailable with documented compensation.
- Production deploy passes.
- Postdeploy smoke passes.
- Android deployed-asset and pairing validations pass if claimed.
- Tracker/log/release packet are current.

## Matrix Templates

### Baseline Template

| Field | Value | Evidence |
|---|---|---|
| Branch |  |  |
| Commit |  |  |
| Dirty state |  |  |
| Node/npm |  |  |
| Build command |  |  |
| Test command |  |  |
| Live URL |  |  |
| Staging URL |  |  |
| Deploy method |  |  |
| Backup method |  |  |
| Android APK path |  |  |
| Blockers |  |  |

### Route-State Matrix Template

| Route | State | Source | Fixture | Current status | Required change | Owner | Validation | Evidence | Release status |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  | Not started |  | Lead integrator | Screenshot + interaction |  | QA needed |

### Fixture Template

| Fixture ID | Screen/state | Data setup | Mutation? | Reset/cleanup | Used by QA |
|---|---|---|---|---|---|
|  |  |  | No |  |  |

### Auth QA Template

| Environment | Auth method | Secret handling | Evidence allowed | Blocker condition |
|---|---|---|---|---|
| Local |  | Redacted | Screenshot without secrets |  |
| Staging |  | Redacted | Screenshot without secrets |  |
| Production |  | Redacted | Smoke notes, redacted screenshots | Missing session blocks deploy |

### Browser Evidence Template

| Route | State | Viewport | Screenshot | Console | Network | A11y/contrast | Result |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  | Pending |

### Release Gate Template

| Gate | Required result | Actual result | Evidence | Status |
|---|---|---|---|---|
| Typecheck | Pass |  |  | Pending |
| Lint | Pass |  |  | Pending |
| Unit tests | Pass |  |  | Pending |
| Build | Pass |  |  | Pending |
| Local browser QA | Pass |  |  | Pending |
| Staging smoke | Pass or documented unavailable |  |  | Pending |
| Backup | Verified |  |  | Pending |
| Rollback | Verified command |  |  | Pending |
| Production smoke | Pass |  |  | Pending |
| Android deployed asset | Pass if claimed |  |  | Pending |
| Android pairing | Pass if claimed |  |  | Pending |

## Notification Templates

### Predeploy Notification

```text
Arun, the web experience revamp has passed the release gates and I am starting deploy.

Scope: <summary>
Tests/builds: <summary>
UX QA: <summary>
Backup: <path>
Rollback: <method>
Known deferrals: <summary or none>
Android validation status: <summary>
```

### Postdeploy Notification

```text
Arun, deploy is complete and postdeploy smoke has passed.

Live URL: <url>
Validated: <summary>
Backup: <path>
Rollback: <method>
Deferred/nonblocking items: <summary or none>
Evidence: <release packet path>
```

### Failed Release Notification

```text
Arun, the release did not pass and I stopped the deploy/release process.

Failure: <summary>
Evidence: <path>
Rollback status: <not needed / completed / blocked>
Current live status: <summary>
Next remediation: <summary>
```

## Final Notes for the Implementing Agent

- Treat this plan as the operative source over the prior implementation plan.
- Do not compress Phase 0 and Phase 1 into implementation work. They are gates.
- Keep the route-state matrix current while building; it is the control plane for the release.
- If a Magic Patterns screen/state conflicts with existing product behavior, document the conflict and classify it as `Needs Arun decision` unless the revised PRD already resolves it.
- If an environment limitation blocks Android or staging validation, do not hide it. Record the blocker, state what can still be safely released, and avoid unsupported claims.
