# PRD-14 Informational Trust Copy Code Review

Created: 2026-06-14 11:40 IST
Reviewer: Codex lead integrator
Scope: PRD-14 informational privacy/offline copy slice only
Verdict: APPROVE for local deploy-ready state; production release remains gated

## Reviewed Files

- `src/lib/settings/trust-copy.ts`
- `src/app/settings/page.tsx`
- `src/app/more/page.tsx`
- `public/offline.html`
- `UX_v2/execution/PRD_14_TRUST_COPY_SMOKE_2026-06-14.md`

## Review Frame

The review checked only the PRD-14 files owned by this milestone. It focused on preventing privacy/offline overclaims, keeping Settings and More consistent, keeping unavailable controls visibly disabled, and avoiding unapproved offline queue, QR pairing, analytics, or package-ID changes.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

No P2 findings.

### P3

1. Fixed: More still used `Sync & Devices` as a section title.

   Risk: The label could imply active sync behavior even though PRD-14 only allows informational offline/server-required copy.

   Resolution: Renamed the section to `Devices`.

2. Fixed: More row descriptions truncated critical trust copy.

   Risk: On small screens, the visible text could hide `not active yet`, `coming soon`, or `no offline queue` even though the DOM contained the copy.

   Resolution: Allowed the privacy/offline descriptions to wrap and made badges non-shrinking.

3. Fixed: Settings backup copy included release-process wording.

   Risk: The Settings page should be user-readable and should not mix release-gate language into app UI.

   Resolution: Reworded backup copy to "Confirm backup status before relying on a restore."

## Data-Safety Review

- No schema migration was added.
- No storage/API behavior changed.
- No data writes were added.
- No active privacy toggle was added.
- No offline queue/download/sync behavior was added.
- No analytics or telemetry behavior was added.
- Rollback is a code-only copy/UI revert.
- Production DB backup remains mandatory before release.

## Verification

- `rg -n -i "end-to-end|encrypted|anonymous|AI Brain|Your Brain|offline|sync|QR|telemetry|private by default|private memory" src/app/settings src/app/more public/offline.html src/lib/settings/trust-copy.ts public/sw.js` reviewed; remaining matches are explicit negative/allowed copy or implementation comments.
- Browser smoke passed for `/settings`, mobile `/more` at 390 x 844, and `/offline.html`.
- `npm run typecheck` passed.
- `npm run lint` passed with the existing `src/lib/queue/enrichment-batch-cron.ts:49` unused-disable warning.
- `npm test` passed: 455 tests, 65 suites, 0 failures.
- `npm run build` passed with the known `unpdf` warning.

## Non-Findings / Deferred Gates

- End-to-end encryption is clearly stated as not active.
- Offline Ask, capture, export, and sync are clearly stated as server-required.
- QR pairing remains unimplemented and the offline page now says `Pair device`.
- Active offline controls remain blocked by D-007.
- Android validation remains blocked by unavailable device/emulator.
- Production/live deploy has not been requested or performed.

## Approval Rationale

The PRD-14 slice stays inside the approved informational-only lane. Settings, More, and the static offline page now use a consistent trust posture without adding unapproved behavior. No P0/P1/P2 release-blocking findings remain for this slice.
