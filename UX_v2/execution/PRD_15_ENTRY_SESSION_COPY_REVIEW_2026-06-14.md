# PRD-15 Entry / Session / Pairing Copy Review

Created: 2026-06-14 12:52 IST
Updated: 2026-06-14 12:56 IST
Reviewer: Codex lead integrator
Scope: PRD-15 UI/copy-only entry, unlock, setup, and pairing recovery states
Verdict: APPROVE for local deploy-ready state; production release remains gated

## Reviewed Files

- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/app/unlock/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/setup-apk/page.tsx`
- `android/app/src/main/AndroidManifest.xml`

## Review Frame

This review checked the approved PRD-15 UI/copy lane: AI Memory entry branding, setup-needed and unlock-needed states, session-expired recovery copy, code-entry Android pairing copy, expired-code guidance, and server-unreachable wording. It intentionally avoided proxy/auth weakening, token behavior changes, QR scanning, Android package-ID changes, and production deployment.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

No P2 findings.

### P3

1. Fixed: setup/unlock logo rendering triggered a local Next image optimizer warning during Browser smoke.

   Risk: The logo asset itself was valid, but relying on optimizer handling for the large local PNG created noisy smoke evidence and could hide a visual regression in entry surfaces.

   Resolution: `src/app/setup/page.tsx` and `src/app/unlock/page.tsx` now match the sidebar and render `/ai-memory-logo.png` with `unoptimized`.

2. Fixed: Android manifest comments still described QR scanning as implemented.

   Risk: The manifest correctly retained optional camera permission, but the comment contradicted PRD-15 by saying the setup screen streams camera frames and decodes QR codes.

   Resolution: The comment now documents D-008 technical debt: pairing is code-entry only, QR must not be promised unless implemented and validated, and camera permission should not be removed without an Android migration/release decision.

## Data-Safety Review

- No schema migration was added.
- No token, PIN, session verification, or API authorization behavior was weakened.
- The only proxy behavior change is adding `reason=session-expired` to existing unauthenticated HTML redirects to `/unlock`.
- The Android manifest behavior is unchanged; only the stale QR/camera comment was corrected.
- Browser smoke used a throwaway `BRAIN_DB_PATH=/tmp/ai-memory-uxv2-prd15-smoke.sqlite` database, created a dummy PIN, and removed the temp SQLite files afterward.
- No production data was copied into evidence.
- Production DB backup remains mandatory before release.

## Verification

- `node --import tsx --test src/proxy.test.ts` passed: 17 tests.
- `node --import tsx --test src/proxy.test.ts src/app/api/settings/device-pairing/route.test.ts src/app/api/settings/device-pairing/exchange/route.test.ts src/app/api/settings/rotate-token/route.test.ts` passed: 32 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with the existing `src/lib/queue/enrichment-batch-cron.ts:49` unused-disable warning.
- `npm run build` passed with the known `unpdf` warning.
- Browser smoke with temp DB passed:
  - `/setup` rendered `Welcome to AI Memory` and a direct `/ai-memory-logo.png` image.
  - Dummy PIN creation in the temp DB redirected to `/library`.
  - `/unlock?next=%2Fitems%2Fabc&reason=session-expired` rendered `Unlock AI Memory`, the session recovery note, the return-to-requested-page copy, and no `Unlock AI Brain` heading.
  - `/setup-apk` rendered pairing-code/code-entry copy with no QR/re-scan copy and no legacy cloud wording.
  - Browser warning/error log check returned `[]` after the logo fix.
- Text audit found no stale QR implementation promises in `android/app/src/main/AndroidManifest.xml`, `src/app/setup-apk`, `src/app/settings/device-pairing`, or `public/offline.html`; the only remaining QR/camera mention is the D-008 technical-debt comment and optional camera feature declaration.

## Non-Findings / Deferred Gates

- Camera permission and package ID remain unchanged because D-008 and D-013 are open.
- Full Android pairing/token validation remains blocked by missing authenticated pairing-code access in live/staging.
- Production/live deploy has not been requested or performed.

## Approval Rationale

The PRD-15 copy/session slice now gives protected-page redirects a concrete unlock recovery state, keeps setup/unlock branded as AI Memory, aligns Android pairing copy with the current code-entry behavior, and removes a logo-rendering smoke warning without changing auth semantics. No P0/P1/P2 release-blocking findings remain for this slice.
