# PRD-15 Entry, Pairing, Session, And Offline States Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only
Feature classification: Partial/Missing
Primary paths: `src/app/setup`, `src/app/unlock`, `src/app/setup-apk`, `src/app/settings/device-pairing`, `src/proxy.ts`, `public/offline.html`, Android manifest/resources

## PRD v1

### User Goals

- Enter AI Memory with clear brand, trust, and recovery states.
- Pair Android without confusing QR/code/camera expectations.
- Understand session expired, unpaired, server unreachable, and offline states.

### Scope

- Login/setup PIN/unlock.
- Android setup and pairing code.
- Pairing success/failure/expired code.
- Session expired.
- Server unreachable/offline fallback.
- Brand/copy migration.

### Web UX

- First auth surface uses logo and AI Memory.
- Setup/unlock copy is sober and avoids false security claims.
- Session-expired redirects explain what happened.
- Pair device shows code, expiration, regenerate, success/failure.

### Android UX

- Android setup reflects current code-entry behavior unless QR scanning is actually implemented.
- If camera permission remains, copy should not promise QR scanning unless present.
- Offline fallback points to retry and re-pair.

### Interactions And States

- First-time setup.
- Unlock with existing PIN/session.
- Session expired.
- Pairing code shown.
- Pairing code expired.
- Pairing accepted and token stored.
- Token rejected and re-pair required.
- Server unreachable.
- Offline fallback before pairing.

### Edge Cases

- Pairing code expired.
- Token exists but server rejects it.
- Session cookie absent.
- Server reachable but not paired.
- Android config/assets stale after app name change.

### Data Needs

- Existing session cookie, pairing token, and Android Preferences storage only.
- No package ID migration or token migration unless D-013 is explicitly approved.
- No new QR/camera state unless D-008 approves QR scanning and implementation.

### Analytics / Events

Not applicable by default. Entry, pairing, and session states should not add telemetry unless Arun approves local-only diagnostics.

### Non-Goals

- No auth weakening or proxy behavior change unless required and separately reviewed.
- No package ID rename without Android migration plan.
- No QR scanner promise unless QR scanning is implemented in the same slice.

### Acceptance Criteria

- User-facing copy says AI Memory.
- QR/camera claims match actual setup behavior.
- Session expired and pairing failures are not generic errors.
- Offline fallback is branded and useful.

### Open Questions

1. Should QR scanning return, or should camera permission/comment debt be removed later?
2. Should package ID stay `com.arunprakash.brain` for compatibility?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-15-entry-pairing-session-offline-package.md`

### Executive Verdict

Conditional go. The PRD must separate user-facing requirements from stale manifest comments and package-name compatibility.

### Findings

P1:

1. QR scanning is represented in older comments but not current setup UI. Recommendation: do not promise QR scanning unless implemented.
2. Auth security review is out of scope but risk is noted. Recommendation: do not weaken auth; add focused review if touching proxy/auth.

P2:

1. Package ID containing `brain` may be compatibility-safe. Recommendation: do not rename package ID without explicit Android migration plan.

### Go / No-Go Recommendation

Go if v2 locks "code entry only unless QR is implemented" and treats package ID as a decision.

## PRD v2

### Final Product Requirements

1. User-facing entry surfaces use AI Memory logo/name.
2. Android pairing is code-entry only unless QR scanner is implemented in the same feature.
3. Do not remove camera permission or rename package ID as part of this feature without explicit decision.
4. Pairing states:
   - code shown
   - code expired
   - code accepted
   - token stored
   - token rejected
   - re-pair required
5. Session states:
   - setup needed
   - unlock needed
   - session expired
   - server unreachable
   - offline fallback
6. Android-specific claims for pairing, token storage, offline fallback, launcher label/icon, and APK install/open require emulator/device evidence or an exact blocker.

## Implementation Plan v1

### Architecture

- Inventory setup/unlock/pairing routes and copy.
- Add state-specific panels.
- Update Android setup copy to current behavior.
- Keep auth/proxy logic changes minimal unless tests require it.

### Tests

- Browser smoke setup/unlock.
- Pairing code success/failure where testable.
- Brand search.
- Offline page inspection.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. Entry work can accidentally touch auth behavior; tests must be explicit.

### Findings

P1:

1. Auth route changes can lock user out. Recommendation: do UI/copy first; separate auth logic changes.

P2:

1. Android generated config may be stale after Capacitor sync. Recommendation: include `cap sync`/APK verification in PRD-16, not this feature.

### Go / No-Go Recommendation

Go after v2 separates copy/UI from auth logic.

## Implementation Plan v2

### Revised Plan

1. UI/copy-only entry pass first.
2. Add explicit state messages for setup, unlock, expired session, pairing expired, pairing rejected, server unreachable.
3. Avoid proxy/auth changes unless a bug is proven and separately reviewed.
4. Keep package ID unchanged unless Arun asks for Android identity migration.
5. Document camera/QR mismatch as technical debt if not solved.
6. Coordinate with PRD-16 for emulator/device evidence; viewport smoke alone is not enough for Android entry or pairing claims.

### Implementation Acceptance

- Entry surfaces are AI Memory branded.
- No QR scanning promise without QR behavior.
- No auth behavior regression.
- Offline/session states have concrete copy and recovery actions.
- Android-specific entry and pairing claims have emulator/device evidence or an exact blocker.
