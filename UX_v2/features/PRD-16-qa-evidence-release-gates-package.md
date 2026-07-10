# PRD-16 QA Evidence And Release Gates Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only release gate
Feature classification: Missing
Primary paths: `UX_UI_DESIGN_PACKAGE/checklists`, `src`, `android`, `public`, `package.json`

## PRD v1

### User Goals

- Trust that AI Memory UX v2 was verified across web and Android before release.
- See what passed, what failed, and what remains.

### Scope

- Evidence checklist copied or referenced with pass/fail status.
- Automated checks.
- Browser/mobile screenshots.
- Brand/privacy search.
- Web build and Android APK build evidence.
- Final handoff.

### Web UX QA

- Library, Needs Upgrade, Capture, item detail, focus, Ask, Settings, Login/Pair.
- Desktop 1280 x 720 and wider viewport.

### Android UX QA

- Library, filters sheet, Capture, share result, item detail/tabs if implemented, focus, Ask composer, More, Needs Upgrade, Login/Unlock/Offline.
- Compact phone and tall phone viewport.
- APK build plus Android emulator/device checks for Android-specific claims, or exact blocker.

### Data/Trust QA

- Source platform and captured-via separate.
- Quality visible.
- Weak-source warnings visible.
- No active E2EE claim.
- Coming-soon controls disabled.

### Interactions And States

- Pass.
- Fail.
- Blocked.
- Not applicable with reason.
- Evidence path recorded.
- Exact blocker recorded.

### Data Needs

- Evidence files, command snippets, screenshot paths, and blocker notes only.
- No production app data or user content should be copied into QA artifacts unless redacted.

### Analytics / Events

Not applicable. PRD-16 validates evidence; it does not add product telemetry.

### Non-Goals

- No release or deployment claim without build and evidence.
- No replacement for feature-specific tests.
- No acceptance of Android viewport screenshots as device/emulator proof for Android share, pairing, offline, or APK-specific claims.

### Acceptance Criteria

- No feature is marked complete without evidence.
- Failed checks have owner, reason, and next step.
- Final handoff references evidence paths.

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-16-qa-evidence-release-gates-package.md`

### Executive Verdict

Go, but only if this is treated as a blocking release gate, not documentation polish.

### Findings

P1:

1. QA can become checkbox theater. Recommendation: require evidence path or failure note for every row.
2. Android shell requires real APK/build check. Recommendation: do not accept responsive screenshots alone.

P2:

1. Service worker can mask stale assets. Recommendation: include `?nosw=1` and cache-reset notes.

### Go / No-Go Recommendation

Go as mandatory release gate.

## PRD v2

### Final Product Requirements

1. Create `UX_v2/qa/` or `UX_v2/screenshots/` evidence folders during implementation.
2. Copy acceptance checklist into UX_v2 with evidence columns.
3. Run:
   - `npm run typecheck`
   - `npm run lint`
   - relevant focused tests
   - `npm run build`
   - `npm run build:apk` or document exact blocker
4. Capture web and mobile screenshots after implementation.
5. Run Android emulator/device checks for share, pairing, offline fallback, and APK-specific claims; if unavailable, record the blocker and do not claim Android verification.
6. Run brand and privacy searches.
7. Produce final handoff.

## Implementation Plan v1

### Architecture

- Add QA checklist document with evidence columns.
- Use Browser for screenshots.
- Use existing package scripts.
- Store outputs as text snippets or referenced files.

### Tests

- All relevant tests; this PRD is itself the test plan.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. The plan needs deterministic viewport list and command-output handling.

### Findings

P1:

1. Screenshots can miss interaction states. Recommendation: specify state list.

P2:

1. Build failures must not be summarized away. Recommendation: capture exact error and next action.

### Go / No-Go Recommendation

Go after v2 defines viewport/state matrix.

## Implementation Plan v2

### Revised Plan

1. QA matrix:
   - Desktop: 1280 x 720, 1440 x 900.
   - Mobile: 390 x 844, 430 x 932.
2. State screenshots:
   - Web Library, Needs Upgrade, Capture, capture result, item detail, focus, Ask empty, Ask scoped/history, Settings, Login/Unlock/Pair.
   - Android/mobile Library, filters sheet, selected mode, Capture, share result, item detail/focus, Ask composer/add context/history, More, Needs Upgrade, Login/Offline.
   - Android device/emulator: share intent, pairing/token state, offline fallback, launcher label/icon, APK install/open.
3. Commands:
   - Typecheck/lint/focused tests after each feature cluster.
   - Full build and APK build only near release gate.
4. Searches:
   - AI Brain legacy strings.
   - privacy/encryption overclaims.
   - disabled coming-soon controls.
5. Handoff:
   - implemented features
   - failed checks
   - residual risks
   - open decisions
   - exact next actions

### Implementation Acceptance

- Every checklist item has pass/fail/not-applicable plus evidence.
- Any release-blocking failure is visible.
- No deployment-readiness claim is made without build evidence.
- Android-specific claims require device/emulator evidence or an explicit blocker.
