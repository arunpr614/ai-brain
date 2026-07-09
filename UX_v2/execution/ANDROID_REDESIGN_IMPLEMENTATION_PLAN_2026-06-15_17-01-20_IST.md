# Android Redesign Implementation Plan

Created: 2026-06-15 17:01:20 IST
Owner: Codex
Branch: `codex/ai-brain-ux-v2-magic-patterns`
Production URL: `https://brain.arunp.in`
Magic Patterns mobile editor: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
Magic Patterns editor ID: `d5w3fb6rzxdeht7urnye5r`
Magic Patterns active artifact: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
Magic Patterns status checked: `isGenerating=false`

## Purpose

This plan covers the remaining Android redesign work after the UX v2 Magic Patterns production release. The previous release shipped responsive WebView Android UI assets, but several Android-specific redesign requirements remain deferred, incomplete, or only browser-mobile validated.

The plan has two hard principles:

1. Every Android/mobile screen must match the active Magic Patterns mobile design unless the mismatch is explicitly documented and approved.
2. Android-specific claims require APK/WebView validation, not only desktop browser or responsive viewport evidence.

## Magic Patterns Source Of Truth

The current Magic Patterns mobile artifact exposes these files and screens:

- `components/MobileFrame.tsx`
- `components/MobileBottomNav.tsx`
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Input.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Select.tsx`
- `components/ui/Separator.tsx`
- `pages/MobileLibrary.tsx`
- `pages/MobileShareCapture.tsx`
- `pages/MobileRepair.tsx`
- `pages/MobileItemDetail.tsx`
- `pages/MobileOffline.tsx`
- `pages/MobileAsk.tsx`
- `pages/MobileCapture.tsx`
- `pages/MobileMore.tsx`
- `pages/MobileLogin.tsx`
- `pages/MobileNeedsUpgrade.tsx`
- `pages/MobileTopic.tsx`
- `pages/MobileCollection.tsx`
- `data/sources.ts`
- `data/conversations.ts`

Recent Magic Patterns artifact history also indicates Android-specific design work already exists for privacy settings honesty, filter/tab access, compact filter bottom sheet, tags/topics/collections interactions, and the Android unified Ask composer. These should be treated as design intent, not optional polish.

Magic Patterns changed by this planning step: no.
Published by this planning step: no.

## Current Baseline

Already shipped:

- Android WebView loads deployed AI Memory assets.
- Bottom mobile nav exists.
- More route exists.
- Library, Ask, Capture, Needs Upgrade, More, Login, Offline, Topic, and Collection have responsive web implementations.
- Pairing exchange/token persistence passed through a redacted-token validation method.
- Paired Android share capture passed through the existing capture API.
- Offline fallback after data clear passed.
- Existing APK remains `1.0.2` / code `3`; no new APK was published in the Magic Patterns pass.

Known caveats:

- Android protected authenticated routes were not directly navigated inside the APK with a real PIN session because WebView CDP page control reset.
- Several Android UI claims rely on browser mobile screenshots plus Android shell/runtime checks, not full authenticated APK navigation.
- Native Android redesign work was not implemented.
- Dark-mode button contrast is currently broken in shared CSS and affects Android WebView too.

## Scope

This plan includes all previously identified deferred/missing Android redesign requirements:

1. Native/responsive Android item detail tabs.
2. Raised Capture route policy, including More route decision.
3. Active offline queues/download controls or explicit no-offline state.
4. QR pairing or explicit code-entry-only cleanup.
5. Android package ID migration decision and versioning plan.
6. Android deep-link/setup intent behavior.
7. Dedicated Android share-result UI.
8. APK publication/version bump path.
9. Mobile YouTube/media treatment.
10. Native Android-only versus WebView implementation boundary.
11. Mobile Library select-mode polish and accessibility.
12. Android unified Ask composer and add-context sheets.
13. Android Ask keyboard/nav safety.
14. Android Ask attachment/scope truth.
15. Android share sub-states.
16. Multi-PDF share policy.
17. Android entry/session state details.
18. More/settings content completeness.
19. Android accessibility QA.
20. Protected authenticated Android route validation.
21. Service-worker/cache freshness behavior.
22. Route-policy consistency for raised Capture.
23. Shared Android/WebView button contrast.

## Non-Goals

- Do not add product analytics unless approved.
- Do not silently implement offline queueing, QR pairing, package migration, or item-tab IA without recording the decision state.
- Do not publish an APK without a versionCode/versionName change and full install/upgrade validation.
- Do not claim native Android completion if a screen is still responsive WebView only.
- Do not copy fake Magic Patterns data into production behavior.

## Decision Gates

| Gate | Decision Required | Default Recommendation | Blocks |
| --- | --- | --- | --- |
| A-001 | WebView-only versus native Android screen implementation | Continue WebView-first; use native only for manifest/share/intent/token pieces | Native rewrite claims |
| A-002 | Android item tabs included now? | Yes, implement as mobile WebView tabs first, not native tabs | Mobile item detail parity |
| A-003 | Raised Capture on More | Make route policy explicit; default normal Capture on Ask/Capture/More, raised on browsing/content routes | Bottom nav parity |
| A-004 | Offline controls | Keep informational unless offline queue/download project is approved | Offline screens/settings |
| A-005 | QR pairing | Keep code-entry only unless QR scanner/permission/device QA is approved | Pairing UI/manifest |
| A-006 | Android package ID | Keep `com.arunprakash.brain` unless migration plan is approved | APK identity |
| A-007 | Multi-PDF share | Process first PDF with explanation, or reject with explanation; choose before coding | Share-result UI |
| A-008 | APK publication | Publish only with version bump and full validation | Release |
| A-009 | YouTube embedded media | Start with thumbnail/metadata; embedded player needs separate approval | Item detail |

If Arun wants no additional approval loop, use the default recommendations above and record them as release decisions before implementation.

## Implementation Phases

### Phase 0: Design Lock And Baseline Audit

Tasks:

- Re-open Magic Patterns mobile design and record active artifact ID.
- Read or export the active artifact files if the read tool is available; otherwise use the current file list plus existing source exports and screenshots.
- Create a screen-by-screen parity matrix from Magic Patterns to production routes.
- Capture current production screenshots for each Android/mobile screen before changes.
- Audit current route policy for mobile Capture and More.
- Audit all shared CSS primary/selected-control token issues from the button contrast RCA.

Deliverables:

- `ANDROID_REDESIGN_PARITY_MATRIX_<timestamp>.md`
- Current-state screenshot directory.
- Decision log for A-001 through A-009.

Acceptance:

- Every Magic Patterns mobile screen has a mapped production route, status, owner, and validation method.
- All open decisions have a default or explicit answer before coding starts.

### Phase 1: Shared Mobile Design System Repair

Purpose:

Make the WebView app capable of matching Magic Patterns consistently before touching each screen.

Tasks:

- Fix shared dark-mode button contrast.
- Add semantic action tokens:
  - `--action-primary-bg`
  - `--action-primary-bg-hover`
  - `--action-primary-fg`
- Add selected-control tokens:
  - `--control-selected-bg`
  - `--control-selected-border`
  - `--control-selected-fg`
- Migrate filled primary buttons away from `bg-[var(--accent-9)] text-[var(--on-accent)]`.
- Migrate selected pills/navigation states away from raw `border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]` where they represent selection.
- Create or adopt shared mobile primitives matching Magic Patterns:
  - Button variants.
  - Drawer/bottom sheet.
  - Tabs.
  - Cards/list rows.
  - Badge/chip styles.
  - Checkbox/select controls.
- Normalize safe-area, bottom-nav spacing, sheet height, and mobile toolbar spacing.

Validation:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
rg -n "bg-\\[var\\(--accent-9\\)\\]" src/app src/components
rg -n "text-\\[var\\(--on-accent\\)\\]" src/app src/components
rg -n "border-\\[var\\(--accent-9\\)\\]" src/app src/components
```

Acceptance:

- Primary buttons are readable in dark and light themes.
- Active filters/nav states are readable and visually balanced.
- Shared primitives match Magic Patterns enough to support later screen parity.

### Phase 2: Android Shell, Frame, Navigation, And Route Policy

Magic Patterns target:

- `components/MobileFrame.tsx`
- `components/MobileBottomNav.tsx`

Tasks:

- Define one mobile route policy:
  - Library/content routes: raised Capture if approved.
  - Ask and Capture routes: normal tab, no raised Capture.
  - More route: explicitly normal or raised based on A-003.
- Ensure bottom nav never overlaps:
  - Ask composer.
  - Bulk selection toolbar.
  - Share result actions.
  - Offline fallback actions.
  - Focus mode.
- Add safe-area padding for Android gesture navigation.
- Verify mobile bottom nav active states against Magic Patterns.
- Add screenshot assertions for bottom nav location and active tab.

Acceptance:

- Mobile bottom nav matches Magic Patterns route behavior.
- Focus mode hides bottom nav.
- No critical action is covered by bottom nav.
- Route policy is documented in tracker and tests.

### Phase 3: Mobile Library, Filters, Select Mode, And Bulk Actions

Magic Patterns target:

- `pages/MobileLibrary.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Select.tsx`
- `components/ui/Drawer.tsx`

Tasks:

- Match Magic Patterns Library layout:
  - Search.
  - Source/quality/tag filter entry.
  - Compact source rows.
  - Needs Upgrade signal.
  - Selected count and bulk actions.
- Add explicit accessible select controls.
- Add optional long-press select enhancement only if it does not conflict with link navigation.
- Add cancel select mode.
- Ensure bulk toolbar sits above bottom nav and respects safe area.
- Preserve Ask selected cap and warnings.
- Verify screen-reader labels for row selection.

Acceptance:

- Mobile select mode is discoverable without hover or long press.
- Bulk toolbar does not overlap bottom nav or Capture.
- Library, filter sheet, selected state, and empty state match Magic Patterns.

### Phase 4: Mobile Item Detail, Tabs, Focus, Related, And YouTube Treatment

Magic Patterns target:

- `pages/MobileItemDetail.tsx`
- `components/ui/Tabs.tsx`

Tasks:

- Implement mobile-only item detail tab IA if A-002 is accepted:
  - Original.
  - Digest.
  - Ask.
  - Related.
  - Details.
- Preserve desktop item detail layout.
- Move source trust, repair cue, topics, tags, collections, related items, and Ask item into tab-appropriate locations.
- Ensure focus/read mode hides tabs and bottom nav.
- Add mobile YouTube/media treatment according to A-009:
  - Minimum: thumbnail/metadata/trust strip.
  - Optional: embedded player only if explicitly approved.
- Handle empty states:
  - No summary.
  - No topics.
  - No related items.
  - Metadata-only/weak item.

Acceptance:

- Mobile item detail matches Magic Patterns structure.
- Focus mode is clean and readable on compact and tall phones.
- No desktop regression.

### Phase 5: Android Unified Ask Composer And Context Sheets

Magic Patterns target:

- `pages/MobileAsk.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Input.tsx`

Tasks:

- Implement mobile Ask composer with:
  - `Ask AI Memory` label or current approved AI Memory wording.
  - Add Context button.
  - Text input.
  - Send icon button.
  - Attached context chips.
  - Empty-send nudges.
  - Scope banner.
  - Citation display.
- Implement Add Context sheet:
  - Attach saved item.
  - Paste link.
  - Write note.
- Implement saved item picker:
  - Search.
  - Source/quality badges.
  - Select/deselect.
  - Attach selected.
  - Result cap.
- Attach pasted link/write note only after saved item IDs exist.
- Add history bottom sheet.
- Extract shared Ask state/hook if needed to avoid duplicating desktop logic.
- Implement keyboard-safe layout:
  - Composer remains visible above keyboard.
  - Bottom nav hides or is safely pushed while typing.
  - Send button remains tappable.

Dependencies:

- D-001 attached context.
- D-002 high-quality-only Ask.
- D-003 scope-history persistence.

Default path:

- Implement visible composer/sheets only with supported saved-item attachment behavior.
- Keep unsupported paste/write attachment flows disabled or explicitly `Coming soon` unless PRD-09 scope decisions are closed.

Acceptance:

- Mobile Ask matches Magic Patterns.
- Empty input shows `Type a question first`.
- Empty input with attachment shows `Ask a question about the attached context`.
- Attachments override route scope only when scope model supports it.
- Keyboard/nav overlap is tested in Android WebView.

### Phase 6: Android Share Capture Result Flow

Magic Patterns target:

- `pages/MobileShareCapture.tsx`

Tasks:

- Add durable share result route or sheet:
  - Prefer `/capture/share-result`.
  - Use sessionStorage or short-lived result key.
  - Do not put full titles, URLs, document text, or sensitive payloads in query strings.
- Map capture result states:
  - Processing.
  - Full success.
  - Metadata-only / needs upgrade.
  - Duplicate existing.
  - Updated existing.
  - PDF read failure.
  - Missing token / unpaired.
  - Server unreachable.
  - Retry.
  - Done.
- Add actions:
  - Open item.
  - Add text / repair.
  - Ask.
  - Open existing.
  - Retry.
  - Pair device.
- Implement multi-PDF policy from A-007.
- Keep offline share honest: no queued/saved claim unless real outbox exists.
- Preserve double-fire suppression.

Acceptance:

- No share outcome depends only on `alert()`.
- Android share into the APK shows the designed result surface.
- Offline/server-down share says `Not saved yet` or equivalent honest copy.
- Smoke data is cleaned up after validation.

### Phase 7: Mobile Capture And Repair Flow Parity

Magic Patterns target:

- `pages/MobileCapture.tsx`
- `pages/MobileRepair.tsx`

Tasks:

- Align Capture page layout and result states with Magic Patterns:
  - URL.
  - PDF.
  - Note/text.
  - Duplicate.
  - Updated existing.
  - Metadata-only.
  - Error with saved item.
  - Failed not saved.
- Ensure result actions are reachable above bottom nav.
- Align Repair page:
  - Add text/transcript.
  - Weak item context.
  - Repair success.
  - Validation errors.
- Keep `mark good enough` deferred unless D-004 is closed.

Acceptance:

- Mobile Capture and Repair match Magic Patterns for supported states.
- No unsupported state is visually implied.

### Phase 8: Mobile More, Settings, Privacy, Offline, And Provider Status

Magic Patterns target:

- `pages/MobileMore.tsx`
- `pages/MobileOffline.tsx`

Tasks:

- Complete More screen rows:
  - Account/device.
  - Capture settings.
  - Backup/export.
  - Data/privacy.
  - Provider health.
  - Needs Upgrade.
  - Offline/server state.
  - Pair Device.
- Keep unsupported privacy controls disabled and labeled `Coming soon`.
- Keep offline informational unless A-004 approves active offline.
- Add provider health status in user-readable copy.
- Add stale service-worker/cache state copy if relevant.
- Add an app asset refresh/reload path if feasible:
  - Reload app.
  - Clear service worker cache.
  - Re-open live server.

Acceptance:

- More/settings match Magic Patterns mobile design.
- No active E2EE, offline Ask, offline capture, sync, or telemetry claim appears unless implemented.
- Offline fallback is branded and useful.

### Phase 9: Mobile Login, Unlock, Pairing, Session, Deep Links, And APK Identity

Magic Patterns target:

- `pages/MobileLogin.tsx`

Tasks:

- Complete Android entry/session states:
  - First-time setup.
  - Unlock.
  - Session expired.
  - Pairing code shown.
  - Pairing code expired.
  - Pairing accepted.
  - Token stored.
  - Token rejected.
  - Re-pair required.
  - Server unreachable.
  - Offline before pairing.
- Make QR/code-entry decision explicit:
  - If code-entry only, remove QR/camera promises from user-facing copy.
  - If QR approved, add camera permission, scanner, QR rendering, and device QA.
- Fix direct `/setup-apk` Android VIEW intent if A-006/A-008 scope allows:
  - Add deep-link intent filter.
  - Validate external VIEW intent opens the intended route.
- Decide package ID:
  - Keep `com.arunprakash.brain`, or
  - Create migration plan before any rename.
- If APK publication is required:
  - Bump `versionName` and `versionCode`.
  - Build.
  - Install fresh.
  - Upgrade from existing.
  - Relaunch.
  - Pair.
  - Share.
  - Offline.

Acceptance:

- Entry/pairing/session flows match Magic Patterns and current product truth.
- Direct setup/deep-link behavior is either fixed or explicitly documented.
- No same-version APK overwrite occurs.

### Phase 10: Mobile Needs Upgrade, Repair Queue, And Mark-Good-Enough Decision

Magic Patterns target:

- `pages/MobileNeedsUpgrade.tsx`
- `pages/MobileRepair.tsx`

Tasks:

- Align Needs Upgrade queue with Magic Patterns.
- Ensure weak item warning, repair path, and source quality are visible.
- If D-004 is approved, implement mark-good-enough semantics:
  - State model.
  - Audit trail.
  - Removal from Needs Upgrade.
  - Ask/retrieval behavior.
- If D-004 remains deferred, do not show a mark-good-enough affordance.

Acceptance:

- Needs Upgrade and Repair are coherent and truthful on Android.
- No unsupported queue action appears.

### Phase 11: Topic And Collection Mobile Parity

Magic Patterns target:

- `pages/MobileTopic.tsx`
- `pages/MobileCollection.tsx`

Tasks:

- Match Magic Patterns mobile layout for Topic and Collection.
- Ensure scoped Ask entry points use the mobile Ask composer state.
- Ensure item rows, filters, source badges, and empty states match Library patterns.
- Validate route behavior inside Android APK authenticated session.

Acceptance:

- Topic and Collection screens match Magic Patterns at compact and tall mobile sizes.

### Phase 12: Accessibility, Keyboard, Gesture, And Safe-Area QA

Tasks:

- Audit tap targets, labels, focus rings, and roles.
- Verify sheet dismissal:
  - Close button.
  - Escape where applicable.
  - Back gesture/back button behavior.
  - Outside tap where safe.
- Verify keyboard-safe behavior:
  - Ask composer.
  - Search.
  - Filter sheets.
  - Pairing code entry.
  - Repair text area.
- Verify Android gesture nav safe areas.
- Verify screen-reader text for icon-only buttons.

Acceptance:

- No critical mobile flow relies on hover.
- No critical mobile flow relies only on long press.
- Keyboard/nav overlap is not present in validated screens.

### Phase 13: Android Runtime Validation

Tasks:

- Use emulator and, if available, a physical Android device.
- Validate existing APK loads deployed assets.
- Validate authenticated protected routes inside the APK with a real session:
  - Library.
  - Filters.
  - Ask.
  - Capture.
  - Item detail.
  - Focus.
  - More.
  - Needs Upgrade.
  - Topic.
  - Collection.
- Validate Android share:
  - URL.
  - Plain text note.
  - PDF.
  - Failure/server down if feasible.
- Validate pairing:
  - Code-entry flow through UI if CDP/tooling allows.
  - Token persistence redacted.
  - Token rejected/re-pair flow if feasible.
- Validate offline:
  - Fresh data clear.
  - Existing app cache.
  - Online recovery.
- Validate APK install/open/relaunch.
- Validate direct VIEW intents if implemented.

Acceptance:

- Android-specific claims have APK evidence, not only responsive browser screenshots.
- Any blocked APK validation has an exact blocker and is not called complete.

### Phase 14: Release, APK, And Rollback

Tasks:

- Run web checks:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

- Run APK checks if native/manifest/APK artifacts changed:

```bash
npm run build:apk
```

- If deploying web-only changes:
  - Create production SQLite backup.
  - Deploy with `scripts/deploy.sh`.
  - Smoke live routes.
  - Validate Android WebView picks up deployed assets.

- If publishing APK:
  - Bump version metadata.
  - Build artifact.
  - Compute SHA-256.
  - Install fresh.
  - Upgrade from previous.
  - Pair/share/offline/relaunch validation.
  - Record artifact path and version.

Rollback:

- Web-only rollback: redeploy prior source with `scripts/deploy.sh`.
- DB rollback: restore verified SQLite backup only if data/schema change requires it.
- APK rollback: keep prior APK artifact available; do not replace same version/code.

Acceptance:

- No deploy with failing tests, unresolved P0/P1, missing rollback, missing backup, unvalidated critical Android screen, or unsafe APK versioning.

## Screen Parity Matrix

| Magic Patterns Screen | Production Target | Current Status | Required Work |
| --- | --- | --- | --- |
| `MobileFrame` | Global mobile WebView shell | Partial | Safe-area, frame spacing, authenticated APK validation |
| `MobileBottomNav` | `src/components/sidebar.tsx` mobile nav | Partial | Route policy audit, More/Capture decision, overlap checks |
| `MobileLibrary` | `/library` | Partial | Select mode, long-press optional, bulk toolbar, filter parity |
| `MobileShareCapture` | `/capture/share-result` or sheet | Missing | Durable share result states and actions |
| `MobileRepair` | `/items/[id]/repair` | Partial | Visual parity, result states, no mark-good-enough unless approved |
| `MobileItemDetail` | `/items/[id]` mobile | Partial/Missing | Tabs, media treatment, focus integration |
| `MobileOffline` | `/offline.html` / server-unreachable state | Partial | Existing-cache behavior, refresh/retry copy, no offline overclaim |
| `MobileAsk` | `/ask` mobile | Missing/Partial | Unified composer, add-context sheets, history, keyboard safety |
| `MobileCapture` | `/capture` | Partial | Result states and bottom-nav-safe action layout |
| `MobileMore` | `/more` | Partial | Full rows, provider status, privacy/offline completeness |
| `MobileLogin` | `/unlock`, `/setup`, `/setup-apk` | Partial/Missing | Session/pairing state detail, QR/code-entry cleanup, deep-link decision |
| `MobileNeedsUpgrade` | `/needs-upgrade` | Partial | Queue parity, repair/quality actions, D-004 decision |
| `MobileTopic` | `/topics/[slug]` | Partial | Visual parity and APK protected-route validation |
| `MobileCollection` | `/collections/[id]` | Partial | Visual parity and APK protected-route validation |

## Validation Evidence Matrix

| Area | Required Evidence |
| --- | --- |
| Design parity | Before/after screenshots for every Magic Patterns mobile screen |
| Web build | Typecheck, lint, tests, build |
| Android WebView | APK screenshots for authenticated and unauthenticated routes |
| Share | Android share intent evidence for URL/text/PDF/failure states |
| Pairing | Pairing UI or redacted token-persistence evidence |
| Offline | Fresh data clear, existing-cache behavior, online recovery |
| Accessibility | Tap targets, labels, sheet dismissal, keyboard safety |
| APK | Build, version, SHA, install, upgrade if published |
| Release | Backup, rollback, live smoke, tracker/log updates |

## Suggested Milestones

| Milestone | Scope | Release Type |
| --- | --- | --- |
| M1 | Contrast/design-system repair + shell/nav route policy | Web deploy, Android WebView validation |
| M2 | Library select mode + More/settings completeness | Web deploy, Android WebView validation |
| M3 | Ask composer + add-context/history sheets | Web deploy; may depend on Ask scope decisions |
| M4 | Share result flow + multi-PDF policy | Web deploy plus Android share validation |
| M5 | Item detail tabs + media/focus polish | Web deploy, Android protected-route validation |
| M6 | Entry/session/deep-link/APK identity | Web or APK release depending on native changes |
| M7 | Full Android parity QA + optional APK publication | Release candidate |

## Done Criteria

- Every active Magic Patterns mobile screen has a matching production Android/WebView route or an explicit approved deferral.
- Library, Ask, Capture, ShareCapture, Repair, ItemDetail, Offline, More, Login, NeedsUpgrade, Topic, and Collection are validated against Magic Patterns screenshots.
- Primary buttons and selected controls are readable in dark and light modes.
- Mobile select, sheets, tabs, composer, and share result states are accessible and safe-area aware.
- Android protected authenticated routes are validated inside APK, or exact blocker is recorded and not claimed complete.
- Android share, pairing, offline, install, relaunch, and APK versioning are validated.
- No same-version APK overwrite occurs.
- Tracker, running log, release notes, and evidence paths are current.

## Immediate Next Step

Start with Phase 0 and Phase 1:

1. Lock Magic Patterns artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7` as the current mobile design reference.
2. Build the parity matrix.
3. Fix shared button/selected-control contrast.
4. Validate Library and mobile shell first, because they affect almost every other Android screen.
