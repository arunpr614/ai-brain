# PRD-11-SHELL Smoke Evidence

Captured: 2026-06-14 10:53 IST
Local app: `http://127.0.0.1:3000`
Browser: Codex in-app browser
Purpose: close `UX_Final_Plan` G-001 before feature implementation.

## Summary

PRD-11-SHELL renders the required mobile and desktop routes and has screenshot evidence. The smoke found visual/product caveats that should remain tracked:

- Mobile `/more` still shows raised Capture treatment; D-006 remains open, so do not treat that behavior as approved.
- Disabled Capture CTAs appear low-contrast in mobile Library/Capture.
- This smoke is responsive web evidence only. It is not Android emulator/device evidence.

## Evidence Matrix

| Check | Viewport | Result | Evidence |
| --- | --- | --- | --- |
| Mobile Library | 390 x 844 | Pass with visual caveat | `evidence/screenshots/2026-06-14-prd11-mobile-library.png` |
| Mobile Ask | 390 x 844 | Pass | `evidence/screenshots/2026-06-14-prd11-mobile-ask.png` |
| Mobile Capture | 390 x 844 | Pass with visual caveat | `evidence/screenshots/2026-06-14-prd11-mobile-capture.png` |
| Mobile More | 390 x 844 | Pass with product caveat | `evidence/screenshots/2026-06-14-prd11-mobile-more.png` |
| Desktop `/more` | 1280 x 720 | Pass | `evidence/screenshots/2026-06-14-prd11-desktop-more.png` |

## Observed Page State

Mobile Library:

- URL resolved to `/library`.
- Bottom nav showed Library, Capture, Ask, More.
- Empty library state rendered.
- Filters entry rendered.
- Capture entry rendered.

Mobile Ask:

- URL resolved to `/ask`.
- Bottom nav showed Library, Capture, Ask, More.
- Ask empty state and composer rendered.
- Scope text showed all saved sources with `0 sources`.

Mobile Capture:

- URL resolved to `/capture`.
- Bottom nav showed Library, Capture, Ask, More.
- URL/PDF/Note tabs rendered.
- URL input and Save URL action rendered.

Mobile More:

- URL resolved to `/more`.
- Bottom nav showed Library, Capture, Ask, More.
- Preferences, Sync & Devices, Data & Privacy, and Provider Health areas rendered.
- Raised Capture treatment remained visible on More.

Desktop `/more`:

- URL resolved to `/more`.
- Sidebar navigation rendered.
- More page content rendered.
- No visible mobile bottom nav in the screenshot.

Browser console:

- No browser console errors captured during the smoke matrix.

## Gate Decision

G-001 PRD-11-SHELL verification: completed with caveats.

This permits PRD-06-FU planning/implementation to begin, but it does not authorize:

- PRD-09-FU or PRD-12, because D-001/D-002/D-003 remain open.
- More-route Capture behavior changes, because D-006 remains open.
- Android-specific completion claims, because no emulator/device evidence exists.
- Production release, because release gate and user approval are still outstanding.

---

# PRD-06 Capture Result Banner Smoke

Captured: 2026-06-14 11:05 IST
Local app: `http://127.0.0.1:3000`
Purpose: verify PRD-06 canonical `capture_state` item-banner rendering after implementation.

## PRD-06 Evidence Matrix

Temporary local DB rows were inserted for browser evidence, then deleted. Cleanup result: local `countItems()` returned `0`.

| State | Result | Evidence |
| --- | --- | --- |
| `created_full_text` | Pass | `evidence/screenshots/2026-06-14-prd06-banner-created-full-text.png` |
| `created_metadata_only` | Pass | `evidence/screenshots/2026-06-14-prd06-banner-created-metadata-only.png` |
| `duplicate_existing` | Pass | `evidence/screenshots/2026-06-14-prd06-banner-duplicate-existing.png` |
| `updated_existing` | Pass | `evidence/screenshots/2026-06-14-prd06-banner-updated-existing.png` |
| `error_with_saved_item` | Pass | `evidence/screenshots/2026-06-14-prd06-banner-error-with-saved-item.png` |

Observed banner text covered:

- Note saved with readable text.
- Metadata-only YouTube save with Upgrade action.
- Duplicate existing item with no duplicate-created copy.
- Updated existing item with `via Android` source trust.
- Saved-with-issues state with Upgrade action.

Browser console:

- No browser console errors captured during the PRD-06 banner smoke.

Limitation:

- This is web item-detail evidence. Android share runtime evidence remains blocked by the missing device/emulator gate.
