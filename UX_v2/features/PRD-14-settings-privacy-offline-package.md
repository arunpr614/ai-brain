# PRD-14 Settings, Privacy, Offline, And Trust States Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, decision needed for offline controls
Feature classification: Partial
Primary paths: `src/app/settings/page.tsx`, `src/app/more/page.tsx`, `public/offline.html`, `public/sw.js`, provider status modules

## PRD v1

### User Goals

- Understand account/device status, provider health, backup/export, data/privacy, and offline behavior.
- See unavailable privacy controls as disabled, not active.
- Know what works when the server is unreachable.

### Scope

- Web Settings and Android More/settings surfaces.
- Data/privacy disabled controls.
- Offline/server state copy and status panels.
- Provider health presentation.
- Backup/export and tags/collections links.

### Web UX

- Settings sections: account/device, capture preferences, providers, backup/export, tags/collections, data/privacy, appearance, offline.
- Disabled privacy controls labeled `Coming soon`.
- Provider/storage copy user-readable.

### Android UX

- More includes account/device, capture settings, backup/export, data/privacy, provider health, Needs Upgrade, offline/server state.
- No active E2EE claim.

### Interactions And States

- Open Settings on web.
- Open More on Android/mobile.
- View provider/storage status.
- Try unavailable privacy controls and see disabled state.
- View offline/server-unavailable fallback copy.
- Start export/backup action only if already supported by existing behavior.

### Edge Cases

- Provider unreachable.
- Backup enabled but remote copy unavailable.
- Offline fallback loaded before pairing.
- Service worker stale assets.
- User expects offline Ask or offline capture.

### Data Needs

- No new active privacy-control data should be persisted for unavailable features.
- Optional shared content constants may back both Settings and More so copy does not drift.
- Real offline download/queue data is out of scope unless D-007 is approved.

### Analytics / Events

Not applicable by default. Privacy/offline settings should not introduce telemetry unless Arun explicitly approves local-only diagnostics.

### Non-Goals

- No active end-to-end encryption claim or toggle.
- No offline Ask or offline capture queue.
- No new backup/sync provider behavior unless separately scoped.

### Acceptance Criteria

- No privacy overclaims.
- Coming-soon controls are disabled.
- Offline copy says APIs are network-only unless offline queue is built.
- Settings and More share the same trust posture.

### Open Questions

1. Should offline settings actually download readable content, or only explain fallback?
2. Should capture preferences be editable in UX v2?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-14-settings-privacy-offline-package.md`

### Executive Verdict

Conditional go. The PRD must treat offline as partial, not imply real sync/offline Ask.

### Findings

P1:

1. Offline controls can overpromise. Evidence: no outbox or offline API queue found. Recommendation: default to informational offline state.
2. Privacy controls can look active in settings if not disabled. Recommendation: use disabled controls plus Coming soon label.

P2:

1. Provider status can be too technical. Recommendation: include user-readable summary and technical detail secondary.

### Go / No-Go Recommendation

Go after offline scope is explicitly informational unless Arun approves real offline work.

## PRD v2

### Final Product Requirements

1. Offline UX v2 is informational and fallback-only unless Arun approves offline queue/download implementation.
2. Settings must not show toggles that can be mistaken as enabled for unavailable privacy features.
3. More and Settings must use consistent provider names and health status.
4. Data/privacy section must state:
   - End-to-end encryption is not active yet.
   - Privacy controls are coming soon.
   - Saved content remains in AI Memory storage.
5. Offline page must say capture/Ask require server access unless offline feature exists.

## Implementation Plan v1

### Architecture

- Restructure Settings into design sections.
- Expand More rows for mobile status.
- Update offline page copy and visual styling to Prism Memory tokens where feasible without external assets.
- Add copy audit.

### Tests

- Brand/privacy text search.
- Browser smoke for Settings, More, offline page.
- Provider health simulated statuses if test helpers exist.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. Copy-only work can still create false claims if not tested.

### Findings

P1:

1. Search terms must include indirect overclaims like "encrypted" and "private by default." Recommendation: broad privacy-copy audit.

P2:

1. More and Settings can drift. Recommendation: share data structures where practical.

### Go / No-Go Recommendation

Go after plan v2 adds explicit search terms and shared content source.

## Implementation Plan v2

### Revised Plan

1. Create a shared settings content model or constants file for provider/privacy/offline rows.
2. Render web Settings and mobile More from consistent labels where possible.
3. Keep unavailable controls disabled with `Coming soon`.
4. Update `public/offline.html` to match AI Memory tone and no-outbox truth.
5. Run copy searches for:
   - `end-to-end`
   - `encrypted`
   - `anonymous`
   - `AI Brain`
   - `Your Brain`
   - `offline`
   - `sync`
6. Document allowed historical matches.

### Implementation Acceptance

- No active privacy/security feature is implied unless implemented.
- Offline state is honest about no offline queue.
- Settings and More are consistent.
