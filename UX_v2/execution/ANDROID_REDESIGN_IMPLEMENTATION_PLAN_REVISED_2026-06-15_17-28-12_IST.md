# Android Redesign Implementation Plan - Revised After Adversarial Review

Created: 2026-06-15 17:28:12 IST
Owner: Codex
Branch: `codex/ai-brain-ux-v2-magic-patterns`
Production URL: `https://brain.arunp.in`
Supersedes: `ANDROID_REDESIGN_IMPLEMENTATION_PLAN_2026-06-15_17-01-20_IST.md`
Adversarial review: `ANDROID_REDESIGN_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_17-17-48_IST.md`
Magic Patterns mobile editor: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
Magic Patterns active artifact checked: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
Magic Patterns status checked: `isGenerating=false`

## Executive Position

This revised plan closes the adversarial-review gaps before implementation. The key correction is that Magic Patterns is a visual and interaction reference, not a literal production contract. Every mobile screen must first pass through a production-truth mapping step so prototype-only behavior is adapted, disabled, hidden, or decision-gated before code changes begin.

Direct implementation from the older plan is no-go. Implementation may begin only after Phase -1 creates the required design truth matrix and decision authorization table.

## Source Authority Order

When sources conflict, use this order:

1. Current product truth and open decision gates.
2. Approved UX v2 final plan and PRD packages.
3. Magic Patterns mobile artifact for visual layout, hierarchy, gestures, spacing, and component intent.
4. Current production code and deployed Android WebView behavior.
5. Release, backup, rollback, and APK safety gates.

This means "match Magic Patterns" always means: match the visual intent after adapting copy, states, and actions to real production behavior.

## Required Source Files

Release worktree:

- `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`
- `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_IMPLEMENTATION_MATRIX_2026-06-15.md`
- `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md`
- `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_EXECUTION_TRACKER.md`
- `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`

Original planning package sources currently outside this release worktree:

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/UX_Final_Plan`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-09-FU-ask-context-scope-history-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-11-FU-mobile-shell-select-item-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-12-android-unified-ask-composer-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-13-android-share-capture-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-14-settings-privacy-offline-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-15-entry-pairing-session-offline-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-16-qa-evidence-release-gates-package.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/lightweight-specs/YT-01-youtube-item-detail-and-media-metadata.md`

Phase -1 must either copy the required PRD sources into this worktree or record stable absolute links in the implementation tracker before coding starts.

## Magic Patterns Mobile Artifact Scope

Current active artifact files:

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

Magic Patterns changed by this planning step: no.
Magic Patterns published by this planning step: no.

## Non-Negotiable Rules

1. Do not implement D-001 through D-014 behavior unless the decision row says `approved implementation`.
2. Default recommendations may only document deferral, not authorize implementation.
3. Do not copy prototype-only Magic Patterns data, user names, emails, version strings, sync claims, QR claims, offline claims, or fake state.
4. Do not copy `MobileFrame` phone chrome into production. It is a visual wrapper only.
5. Do not show QR scanning unless scanner, permission posture, device QA, and D-008 approval exist.
6. Do not show offline reads, offline sync, offline Ask, offline capture, or queued/saved claims unless real underlying storage and sync behavior exists and D-007 is approved.
7. Do not show active privacy, telemetry, crash-report, encryption, delete-all-data, or account controls unless they work.
8. Do not claim Android UX complete without authenticated APK evidence for changed protected routes.
9. Do not publish or overwrite an APK without version bump, signing/distribution decision, checksum, install/upgrade validation, and rollback artifact.
10. Do not deploy with broken primary-button or selected-control contrast.

## Adversarial Review Closure Matrix

| Review Finding | Required Plan Change | Where Addressed |
| --- | --- | --- |
| No production-truth layer | Add Phase -1 truth mapping before coding | Phase -1, Design Truth Matrix schema |
| Defaults could silently close decisions | Add D-decision authorization table and no-go rules | Decision Authorization section |
| MobileFrame could be copied literally | Add prototype frame exclusion rule | Prototype Frame Exclusion section |
| Share result under-specified | Add state machine, storage, mapping, expiry, validation | Android Share Result Contract section |
| Android authenticated validation too soft | Split Android claim levels and hard gate completion | Android Evidence Levels section |
| More/Capture route contradiction buried | Treat D-006 route policy as a current defect | Phase 0, Route Policy Defect section |
| PRD sources absent in worktree | Add source import/link task | Required Source Files, Phase -1 |
| Screenshot validation too weak | Add screenshot matrix, assertions, device/theme coverage | Evidence Matrix, Visual QA section |
| APK publication too vague | Split debug validation APK from user-installable APK | APK Channel section |
| Client local storage under-covered | Add local state safety plan | Client State Safety section |
| Observability under-covered | Add WebView, adb, client/server log evidence | Observability section |
| Contrast plan untracked | Inline contrast requirements here | Phase 1, Contrast Gate |
| Accessibility generic | Add measurable accessibility criteria | Accessibility Gate |

## Decision Authorization

Each decision-gated item must be set to one of these statuses before coding:

- `approved implementation`: may code the exact approved behavior.
- `approved deferral`: must hide, disable, or truthfully label the behavior.
- `blocked`: no code except documentation or safe removal of misleading UI.

| ID | Current Default In This Plan | Implementation Rule | Truthful UI Rule |
| --- | --- | --- | --- |
| D-001 Ask attached context | Blocked until approved | Do not implement new persistent attachment semantics | Hide/disable paste-link/write-note attachment if not supported |
| D-002 high-quality-only Ask | Blocked until approved | Do not change retrieval inclusion semantics | Show source quality warnings only |
| D-003 scope-history persistence | Blocked until approved | Do not add schema or persistent snapshot semantics | Avoid copy implying saved scope history |
| D-004 mark good enough | Blocked until approved | Do not remove items from Needs Upgrade by user dismissal | Keep repair/add text path only |
| D-005 Android item tabs | Requires approval or explicit follow-up authorization | If approved, implement as mobile WebView tabs first | If deferred, keep existing responsive detail and do not claim tab parity |
| D-006 raised Capture on More | Must be reconciled before shell work | Resolve code/docs/design contradiction | Document More as standard or raised with screenshots |
| D-007 active offline controls | Blocked until approved | Do not add offline queue/download/sync behavior | Use server-required/offline fallback copy only |
| D-008 QR pairing | Blocked until approved | Do not add scanner or QR promise | Code-entry pairing only |
| D-009 transcript operator visibility | Out of Android redesign unless reopened | No user-facing Android implementation | No ops claims in mobile UI |
| D-010 transcript fallback strategy | Out of Android redesign unless reopened | No provider fallback implementation | No fallback promise |
| D-011 product analytics | Blocked until approved | Do not add telemetry | No active analytics toggle |
| D-012 Chrome extension redesign | Out of Android plan | No extension work | N/A |
| D-013 package ID migration | Blocked until migration plan approved | Keep `com.arunprakash.brain` | No rename claim |
| D-014 YouTube embedded player/media | Blocked for embedded player; metadata/thumbnail needs approval | No embedded player without scope and privacy review | Show generic metadata/trust strip only if supported |

## Prototype Frame Exclusion

`components/MobileFrame.tsx` is not production UI. Use it only to infer:

- compact mobile spacing;
- status-bar and gesture-nav safe-area awareness;
- bottom-nav clearance;
- sheet height and visual hierarchy.

Do not implement:

- fake Android time, battery, Wi-Fi, signal icons;
- device bezel or fixed 390px phone frame;
- fake Android gesture pill;
- production content constrained to Magic Patterns preview dimensions;
- duplicate system chrome inside Capacitor WebView.

## Design Truth Matrix

Phase -1 must create:

`UX_v2/execution/ANDROID_REDESIGN_DESIGN_TRUTH_MATRIX_<timestamp>.md`

Required columns:

| Column | Meaning |
| --- | --- |
| Magic Patterns screen/file | Exact source file and state |
| Visible element/state | Button, copy, sheet, row, tab, badge, result state |
| Prototype behavior | What the artifact appears to do |
| Production truth | What the real app can truthfully do |
| Decision ID | D-ID or `none` |
| Implementation action | `implement as-is`, `adapt copy`, `disable`, `hide`, `needs decision`, `out of scope` |
| Validation | Screenshot, unit test, Android APK, copy scan, log evidence |
| Release gate | Whether missing validation blocks release |

Minimum required truth-mapping examples:

| Magic Patterns Element | Risk | Required Production Action |
| --- | --- | --- |
| `MobileLogin` `Unlock AI Brain` | Stale brand | Adapt to `Unlock AI Memory` |
| `MobileLogin` `Scan QR from web` | D-008 blocked | Hide unless QR approved and implemented |
| `MobileLogin` `Your Brain is now synced` | Sync overclaim | Adapt to truthful pair/token stored copy |
| `MobileOffline` offline item list | D-007 blocked unless real offline library exists | Hide or present server-required fallback only |
| `MobileMore` fake account name/email | Fake user/account data | Replace with device/server status or hide |
| `MobileMore` `Offline sync` | Offline overclaim | Disable as roadmap or hide |
| `MobileMore` `AI Brain v1.0.0` | Stale brand/version | Use real package/app version and AI Memory |
| `MobileTopic` create tag from topic | Possible unapproved mutation | Requires data semantics and approval |
| `MobileCollection` add items sheet | Possible unapproved mutation | Requires real collection mutation support |
| `MobileItemDetail` tag/collection edit sheets | Possible data mutation | Implement only if existing supported path is wired and tested |
| `MobileFrame` fake phone chrome | Duplicate Android chrome | Exclude from production |

## Android Evidence Levels

Claims must use one of these exact labels:

| Label | Meaning | Completion Use |
| --- | --- | --- |
| Android shell loaded deployed assets | APK opens and renders deployed WebView shell | Not enough for screen parity |
| Android unauthenticated route validated | Unlock/setup/offline routes validated in APK | Enough only for unauthenticated surfaces |
| Android authenticated route validated | Protected route validated inside APK with real session | Required for changed protected screens |
| Android native entry path validated | Share intent, pairing/token, VIEW intent, install/upgrade validated | Required for native Android claims |
| Browser mobile only | Responsive browser evidence only | Cannot claim Android parity |

No final report may say "Android UX complete" unless all changed critical protected routes have `Android authenticated route validated` evidence or are explicitly blocked and not claimed.

## Current Baseline

Already shipped:

- Android WebView loads deployed AI Memory assets.
- Bottom mobile nav exists.
- More route exists.
- Library, Ask, Capture, Needs Upgrade, More, Login, Offline, Topic, and Collection have responsive web implementations.
- Pairing exchange/token persistence passed with redacted-token validation.
- Paired Android share capture passed through existing capture API.
- Offline fallback after data clear passed.
- Existing APK remains `1.0.2` / code `3`.

Known unresolved issues:

- Authenticated protected Android routes were not navigated inside the APK with a real session in the prior production validation.
- Dark-mode primary-action contrast is broken in shared CSS and affects Android WebView.
- Selected filter/control borders can remain too bright in dark mode.
- Current bottom-nav code and release documentation disagree about raised Capture behavior on More.
- Dedicated Android share-result UI is missing; current handler still uses alerts for many outcomes.
- This release worktree is missing the `UX_v2/features` PRD source folder.

## Route Policy Defect

Current documented release state says D-006 raised Capture on More is deferred. Current code renders raised Capture on routes other than Ask and Capture, which includes More.

Phase 0 must resolve this before broader shell work:

1. Compare Magic Patterns `MobileBottomNav`: standard Capture only on `/ask` and `/capture`, raised Capture elsewhere.
2. Compare open decision D-006: previously recommended "More route without special raised Capture behavior."
3. Decide and record one route policy.
4. Update `src/components/sidebar.tsx`, tests, screenshots, implementation matrix, and release tracker.

Release gate: no shell/nav milestone can pass while code, docs, and screenshots disagree.

## Android Share Result Contract

Do not implement `/capture/share-result` until this contract is written in code or a companion spec.

Required state payload:

```ts
type AndroidShareResultState =
  | "processing"
  | "saved_full"
  | "saved_limited"
  | "duplicate_existing"
  | "updated_existing"
  | "unsupported_share"
  | "missing_token"
  | "server_unreachable"
  | "pdf_missing_uri"
  | "pdf_read_failed"
  | "pdf_checksum_failed"
  | "pdf_upload_failed"
  | "multi_pdf_rejected"
  | "multi_pdf_first_processed"
  | "expired_result";

interface AndroidShareResultPayload {
  state: AndroidShareResultState;
  sourceKind: "url" | "note" | "pdf" | "unknown";
  title?: string;
  platform?: string;
  quality?: string;
  itemId?: string;
  existingItemId?: string;
  retryable: boolean;
  createdAt: number;
  expiresAt: number;
  errorCode?: string;
}
```

Storage rules:

- Do not put full titles, URLs, PDF names, document text, notes, tokens, or raw error strings in query strings.
- Use a short opaque result key in the URL if a route is needed.
- Store only safe display payload in `sessionStorage`.
- If result state is missing or expired, show an expired state with actions to return to Library or retry capture.
- Missing token must preserve safe context and navigate to pairing without implying save.

Alert branch mapping:

| Existing Handler Branch | Required Result State |
| --- | --- |
| no token | `missing_token` |
| no text/file | `unsupported_share` |
| URL/network fetch failure | `server_unreachable` or endpoint-specific upload failure |
| PDF missing URI | `pdf_missing_uri` |
| PDF read failure | `pdf_read_failed` |
| PDF upload network failure | `pdf_upload_failed` |
| PDF SHA mismatch | `pdf_checksum_failed` |
| duplicate result | `duplicate_existing` |
| updated existing | `updated_existing` |
| metadata/weak result | `saved_limited` |
| successful full text | `saved_full` |
| multi-PDF with no approved policy | `multi_pdf_rejected` |

Validation:

- Unit tests for parser and state mapping.
- Android share tests for URL, note, PDF, unsupported share, missing token, server unreachable, and multi-PDF policy.
- No production share path may rely only on `alert()`.

## Client State Safety

Document and test local Android/WebView state before release:

| State | Risk | Required Plan |
| --- | --- | --- |
| Capacitor Preferences `brain_token` | Pairing loss or stale token | Preserve across web deploy; verify redacted persistence |
| Session cookies | Auth route validation failure | Test unlock/session path inside APK |
| Service worker/cache | Stale assets after deploy | Add refresh/reload path and stale asset smoke |
| `sessionStorage` share result | Lost result state | Expiry and fallback UI |
| Local storage theme/sidebar keys | UI drift only | Noncritical; do not reset unless needed |
| Future IndexedDB/offline state | Data loss/overclaim | No offline project without migration/rollback plan |

Rollback must include user recovery instructions for stale Android assets:

- force stop and relaunch;
- in-app reload if implemented;
- clear app cache/data only as a last resort, with warning that pairing token/session may be lost.

## Observability

Every Android validation run must collect:

- APK version/package/signature information.
- Screenshot or video evidence.
- WebView console logs where tooling allows.
- `adb logcat` filtered to `com.arunprakash.brain`.
- Client error endpoint output or `data/errors.jsonl` entries for share/pairing failures.
- Server logs for capture/pairing requests.
- Network/server state for offline and recovery tests.
- Redaction note confirming no raw token, cookie, or secret is printed.

## Accessibility Gate

Minimum measurable criteria:

- Text contrast at least 4.5:1 for normal text.
- Icon/control boundary contrast at least 3:1 where visual state depends on it.
- Primary buttons and selected controls readable in light and dark themes.
- Touch targets at least 44px by 44px for critical actions.
- Icon-only buttons have accessible labels.
- Focus is visible for keyboard/browser flows.
- Bottom sheets have close control, back/escape behavior, and safe dismissal.
- No critical action relies only on hover or long press.
- Ask composer, search, pairing code entry, filter sheets, and repair textarea remain usable with Android keyboard open.
- TalkBack smoke path for Login, Library, Ask, Capture, Share result, and More.

## APK Channel Rules

Separate two channels:

| Channel | Meaning | Requirements |
| --- | --- | --- |
| Debug validation APK | Local or shared debug artifact for QA | Version bump only if artifact is published/shared; checksum; install/reinstall validation |
| User-installable APK publication | APK Arun may install/use as release artifact | Version bump, signing/distribution decision, checksum, fresh install, upgrade install, rollback artifact, install instructions |

Do not call a debug APK "published" unless the artifact path, checksum, signing identity, intended install path, previous version, upgrade result, and rollback APK are recorded.

## Phase -1: Source Freeze And Truth Mapping

Purpose:

Make implementation safe by freezing source references and translating prototype screens into truthful production behavior.

Tasks:

- Re-check Magic Patterns `isGenerating` and active artifact ID.
- Read or export all active Magic Patterns files listed in this plan.
- Create local evidence folder: `UX_v2/execution/evidence/magic-patterns-mobile/<timestamp>/`.
- Record source artifact ID and file list.
- Import or link required PRD packages from the original planning path.
- Create `ANDROID_REDESIGN_DESIGN_TRUTH_MATRIX_<timestamp>.md`.
- Create `ANDROID_REDESIGN_DECISION_AUTHORIZATION_<timestamp>.md`.
- Mark every D-001 through D-014 item as `approved implementation`, `approved deferral`, or `blocked`.
- Create a current-state screenshot matrix with route, auth state, fixture, viewport/device, theme, and expected key text.

Acceptance:

- Every Magic Patterns screen and every visible risky prototype element is classified.
- No D-gated behavior is left ambiguous.
- Implementation owner can tell exactly what to implement, adapt, disable, or hide.
- No code changes begin until this phase is complete.

## Phase 0: Baseline And Defect Reconciliation

Purpose:

Make the current state trustworthy before redesign work begins.

Tasks:

- Record branch, commit hash, dirty state, tool versions, APK version, production URL, and deploy access.
- Verify the original feature PRD sources are available to the executor.
- Reconcile D-006 More/Capture route policy as a current defect.
- Audit current shared CSS token contrast.
- Audit current Android share alert branches.
- Audit current service-worker/cache behavior.
- Audit protected-route Android validation blocker and decide tooling path.

Deliverables:

- `ANDROID_REDESIGN_BASELINE_<timestamp>.md`
- Updated tracker entry for D-006 route-policy defect.
- Current code/doc contradiction list.

Acceptance:

- Code, docs, and screenshots agree on the mobile bottom-nav route policy.
- Any unresolved baseline contradiction is marked blocker or explicitly deferred.

## Phase 1: Contrast And Shared UI Safety

Purpose:

Fix the critical usability defect that affects all Android WebView screens before visual parity work.

Tasks:

- Add semantic action tokens:
  - `--action-primary-bg`
  - `--action-primary-bg-hover`
  - `--action-primary-fg`
- Add selected-control tokens:
  - `--control-selected-bg`
  - `--control-selected-border`
  - `--control-selected-fg`
- Migrate filled primary actions away from `bg-[var(--accent-9)] text-[var(--on-accent)]`.
- Migrate selected pills/filters away from raw `border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]` when they represent selected state.
- Preserve use of accent tokens for non-filled highlights where contrast is valid.
- Add focused contrast regression checks for all primary and selected controls.

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

- Library Capture button is readable in dark mode.
- Active `All` filter pills do not have bright near-white borders in dark mode.
- All critical action buttons pass contrast checks in light and dark themes.
- No Android redesign milestone proceeds if this gate fails.

## Phase 2: Mobile Shell, Safe Areas, And Bottom Nav

Magic Patterns references:

- `components/MobileBottomNav.tsx`
- `components/MobileFrame.tsx` for spacing only.

Tasks:

- Implement the reconciled mobile route policy.
- Ensure bottom nav never overlaps:
  - Ask composer;
  - filter sheets;
  - bulk select toolbar;
  - share result actions;
  - offline/server fallback actions;
  - repair textarea/buttons;
  - focus mode.
- Use real Android/WebView safe-area handling, not fake phone chrome.
- Preserve focus mode shell hiding.
- Add route-policy tests or screenshot assertions for Library, Ask, Capture, More, Item detail, Topic, Collection, Needs Upgrade, and Focus.

Acceptance:

- Bottom nav matches the approved route policy.
- More/Capture behavior is documented and visually evidenced.
- No duplicated Android status/nav chrome appears in production.
- Critical actions remain visible above bottom nav.

## Phase 3: Library, Filters, Select Mode, And Bulk Actions

Magic Patterns reference:

- `pages/MobileLibrary.tsx`

Production-truth constraints:

- Offline filter is allowed only if it maps to real offline availability; otherwise hide or adapt.
- Select mode must be discoverable without long press.
- Long press may be enhancement only, never the only path.

Tasks:

- Align mobile Library hierarchy, sticky header, search, filter entry, item rows, quality badges, and Needs Upgrade entry.
- Implement or refine filter bottom sheet from Magic Patterns.
- Add accessible row selection controls.
- Add selected count, cancel, and Ask selected actions.
- Preserve selected-item cap and warnings.
- Keep toolbar clear of bottom nav and Android safe area.

Acceptance:

- Library default, filtered, empty, selected, and Needs Upgrade states have screenshot evidence.
- Select mode works with touch, keyboard/browser, and screen reader labels.
- No unsupported offline capability is implied.

## Phase 4: Item Detail, Tabs, Focus, Related, Tags, Collections, And Media

Magic Patterns reference:

- `pages/MobileItemDetail.tsx`

Production-truth constraints:

- D-005 item tabs require approved implementation.
- Tag/collection mutation controls require real production semantics and tests.
- D-014 embedded YouTube player is blocked unless approved.

Tasks:

- If D-005 is approved, implement mobile WebView tabs:
  - Original;
  - Digest;
  - Ask;
  - Related;
  - Details.
- If D-005 is not approved, keep current responsive detail and do not claim tab parity.
- Adapt Magic Patterns tag/topic/collection sections:
  - topics are derived;
  - tags are user-managed or suggested only if existing semantics support it;
  - collections are user-managed only if existing mutation support is wired.
- Preserve repair affordance for weak items.
- Preserve focus mode, hiding bottom nav and tabs.
- Add YouTube thumbnail/metadata/trust treatment only if approved; no embedded player unless D-014 is approved.

Acceptance:

- Mobile item detail has evidence for full-text item, weak item, no-topics item, no-related item, and focus mode.
- No mutation affordance appears without working data behavior.
- No embedded media claim appears without approved implementation.

## Phase 5: Android Ask Composer And Context Sheets

Magic Patterns reference:

- `pages/MobileAsk.tsx`

Production-truth constraints:

- D-001, D-002, and D-003 block attachment persistence, high-quality-only control, and scope-history persistence unless approved.

Tasks:

- Implement mobile-safe Ask composer layout:
  - scope banner;
  - text input;
  - send icon button;
  - empty-send nudges;
  - citations;
  - history only within approved persistence boundaries.
- Add Context sheet may expose only supported behavior:
  - saved item picker if it maps to current selected/scoped item support;
  - paste link/write note disabled or hidden unless D-001 semantics are approved and implemented.
- Ensure keyboard-safe layout inside Android WebView.
- Ensure bottom nav hides, moves, or clears safely while typing.

Acceptance:

- No visible attachment action implies unsupported retrieval or persistence behavior.
- Empty-send and scoped-Ask states are tested.
- Android keyboard evidence shows composer and send button remain usable.

## Phase 6: Android Share Capture Result Surface

Magic Patterns reference:

- `pages/MobileShareCapture.tsx`

Tasks:

- Implement the Android share result contract from this plan.
- Replace alert-only result paths with route/sheet states.
- Preserve double-fire suppression.
- Implement multi-PDF policy only after decision:
  - reject with explanation; or
  - process first PDF with explanation; or
  - process all only if storage/API behavior is approved.
- Avoid sensitive data in URLs.
- Add actions:
  - Open item;
  - Add text/repair;
  - Ask;
  - Open existing;
  - Retry;
  - Pair device;
  - Done.

Acceptance:

- Android share URL, note, PDF, missing token, unsupported share, server unreachable, PDF read failure, checksum failure, duplicate, updated existing, and multi-PDF policy are validated.
- No share result overclaims save when save did not happen.
- Smoke data is cleaned up after production validation.

## Phase 7: Capture, Repair, And Needs Upgrade

Magic Patterns references:

- `pages/MobileCapture.tsx`
- `pages/MobileRepair.tsx`
- `pages/MobileNeedsUpgrade.tsx`

Production-truth constraints:

- D-004 mark-good-enough is blocked unless approved.

Tasks:

- Align Capture page visual hierarchy with Magic Patterns while using real capture flows.
- Show supported result states:
  - saved full;
  - saved limited;
  - duplicate;
  - updated existing;
  - failed not saved;
  - needs repair.
- Align Repair page:
  - add text/transcript;
  - weak item explanation;
  - validation errors;
  - success state.
- Align Needs Upgrade queue and empty state.
- Hide mark-good-enough unless approved and implemented with audit trail.

Acceptance:

- Capture, Repair, and Needs Upgrade screenshots are present for success, weak, error, and empty states.
- No unsupported queue action appears.

## Phase 8: More, Settings, Privacy, Offline, Provider Health

Magic Patterns references:

- `pages/MobileMore.tsx`
- `pages/MobileOffline.tsx`

Production-truth constraints:

- No fake account name/email.
- No active offline sync unless D-007 approved.
- No active telemetry/privacy controls unless implemented.
- No `AI Brain` wording.

Tasks:

- Replace prototype account block with truthful device/server/app status.
- Add real version info from package/app metadata.
- Add Pair Device row.
- Add Needs Upgrade row.
- Add provider health row if real status can be fetched or truthfully labeled.
- Add disabled roadmap privacy controls only if clearly noninteractive.
- Add server-required/offline fallback copy.
- Add reload/asset refresh path if feasible and tested.

Acceptance:

- Copy scan passes for stale `AI Brain`, fake user data, QR promises, offline sync promises, telemetry promises, and E2EE overclaims.
- More and Offline are useful without implying unbuilt behavior.

## Phase 9: Login, Unlock, Pairing, Session, Deep Links, And APK Identity

Magic Patterns reference:

- `pages/MobileLogin.tsx`

Production-truth constraints:

- AI Memory naming only.
- Code-entry pairing only unless D-008 approved.
- No biometric/device unlock unless implemented.
- Package remains `com.arunprakash.brain` unless D-013 approved.

Tasks:

- Align unlock/setup/session-expired visual design with Magic Patterns.
- Adapt prototype copy to real AI Memory wording.
- Implement clear states:
  - first-time setup;
  - unlock needed;
  - session expired;
  - pairing code entry;
  - expired code;
  - token accepted;
  - token rejected;
  - server unreachable;
  - offline before pairing.
- Resolve direct `/setup-apk` VIEW intent only if native/manifest scope is approved.
- If manifest/native changes are made, build and validate APK.

Acceptance:

- No QR, sync, biometric, or package migration claim appears unless implemented.
- Pairing/token persistence is validated with redacted evidence.
- Direct VIEW intent is either fixed and validated or explicitly documented as deferred.

## Phase 10: Topics And Collections

Magic Patterns references:

- `pages/MobileTopic.tsx`
- `pages/MobileCollection.tsx`

Production-truth constraints:

- Topic creation from AI-derived topic and collection mutation need real data semantics before implementation.

Tasks:

- Align read-only Topic and Collection layouts to Magic Patterns.
- Preserve topic truth: derived, not user-authored.
- Preserve collection truth: user-managed only where mutation support exists.
- Route scoped Ask entry points through approved Ask scope behavior.
- Hide or disable create tag/add items sheets unless supported and tested.

Acceptance:

- Topic and Collection screens pass browser mobile and authenticated APK validation.
- No fake mutation success appears.

## Phase 11: Client State, Service Worker, And Cache Freshness

Tasks:

- Document service-worker behavior for Android WebView.
- Add or validate asset refresh path.
- Test fresh install, existing app data, relaunch after deploy, and offline fallback.
- Verify rollback behavior after web deploy.
- Verify pairing token survival or recovery instructions.

Acceptance:

- Android does not silently keep stale UX after deploy.
- Recovery path is documented and tested.

## Phase 12: Accessibility, Keyboard, Gesture, And Safe Area

Tasks:

- Apply measurable accessibility gate from this plan.
- Validate TalkBack path for critical screens.
- Validate bottom sheets with Android back gesture.
- Validate keyboard behavior for Ask, search, pairing, filters, and repair.
- Validate compact and tall phone sizes.

Acceptance:

- Accessibility matrix is filled with pass/fail evidence.
- No critical mobile flow relies on hover or long press.

## Phase 13: Android Runtime Validation

Required APK validation:

- Install/open/relaunch.
- Authenticated protected routes:
  - Library;
  - Filters;
  - Ask;
  - Capture;
  - Item detail;
  - Focus;
  - More;
  - Needs Upgrade;
  - Topic;
  - Collection.
- Native entry paths:
  - share URL;
  - share note;
  - share PDF;
  - share failure states;
  - pairing/token persistence;
  - offline fallback;
  - online recovery;
  - direct VIEW intents if implemented.
- Observability package:
  - screenshots;
  - WebView console if available;
  - `adb logcat`;
  - server/client error logs;
  - redaction note.

Acceptance:

- Any screen changed in this implementation has APK evidence at the right claim level.
- If authenticated APK control remains blocked, the changed protected screen cannot be called Android-complete.

## Phase 14: Release, Deploy, APK, Rollback

Web validation:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
npm run check:env
npm run check:build-artifacts
```

APK validation if native/manifest/APK artifact changes:

```bash
npm run build:apk
```

Web-only deploy requirements:

- Production SQLite backup with integrity check.
- Rollback source/commit recorded.
- Deploy access confirmed.
- Live smoke routes pass.
- Android WebView picks up deployed assets.
- Stale-asset/cache recovery tested.

APK publication requirements:

- Explicit channel: debug validation APK or user-installable APK publication.
- VersionCode and versionName bump.
- Signing/distribution decision recorded.
- SHA-256 recorded.
- Fresh install and upgrade install pass.
- Pair/share/offline/relaunch pass.
- Prior rollback APK retained.
- No same-version overwrite.

No deploy if:

- tests fail;
- unresolved P0/P1 remains;
- contrast gate fails;
- D-decision status is ambiguous;
- rollback or backup is missing;
- critical Android changed screen lacks required APK evidence;
- data/client-state risk is unknown.

## Screen Implementation Matrix

| Magic Patterns Screen | Production Target | Implementation Action | Blocked/Adapted Prototype Elements | Required Validation |
| --- | --- | --- | --- | --- |
| `MobileFrame` | Global WebView shell | Use spacing intent only | Fake phone chrome, fixed frame, fake status/nav bars | Safe-area screenshots |
| `MobileBottomNav` | `src/components/sidebar.tsx` mobile nav | Implement approved route policy | More/Capture contradiction | Route screenshots and tests |
| `MobileLibrary` | `/library` | Adapt visual layout | Offline filter if unsupported | Browser + authenticated APK |
| `MobileShareCapture` | `/capture/share-result` or sheet | Implement real state machine | Single happy-path-only prototype | Android share matrix |
| `MobileRepair` | `/items/[id]/repair` | Adapt supported repair flow | Fake confirmation not backed by action | Repair tests + screenshots |
| `MobileItemDetail` | `/items/[id]` | Tabs only if D-005 approved | Unsupported mutation, embedded media | Browser + authenticated APK |
| `MobileOffline` | `/offline.html` / server fallback | Adapt to server-required truth | Offline item list/sync if unsupported | Offline/recovery APK evidence |
| `MobileAsk` | `/ask` | Adapt composer to approved scope | Unsupported paste/write attachments, persistent scope history | Ask tests + keyboard APK |
| `MobileCapture` | `/capture` | Adapt real capture flows | Fake sample result states | Capture tests + screenshots |
| `MobileMore` | `/more` | Adapt truthful settings/status | Fake user/email, offline sync, AI Brain, fake controls | Copy scan + APK |
| `MobileLogin` | `/unlock`, `/setup`, `/setup-apk` | Adapt visual flow | QR, sync, biometric, AI Brain | Pairing/session APK |
| `MobileNeedsUpgrade` | `/needs-upgrade` | Adapt queue | Mark-good-enough unless approved | Queue/repair evidence |
| `MobileTopic` | `/topics/[slug]` | Mostly read-only parity | Create tag/add collection unless supported | Topic APK |
| `MobileCollection` | `/collections/[id]` | Mostly read-only parity | Add items unless supported | Collection APK |

## Visual QA Matrix

For every screen/state, capture:

- route;
- auth state;
- data fixture or seed;
- viewport/device;
- theme;
- Magic Patterns source file;
- expected visible text;
- expected absent text;
- screenshot path;
- pass/fail notes.

Required device/viewport coverage:

- Browser mobile compact: 390 x 844.
- Browser mobile tall/wide: 412 x 915 or equivalent.
- Android emulator or physical device with APK.
- Dark and light theme for shared control/contrast screens.

Required absence checks:

- `AI Brain` where production should say `AI Memory`;
- fake account names/emails;
- QR scan promise unless approved;
- offline sync/offline Ask/offline capture claims unless approved;
- active telemetry/privacy controls unless implemented;
- end-to-end encryption claim unless implemented;
- fake synced/device-connected state not backed by real pairing.

## Suggested Milestones

| Milestone | Scope | Release Type |
| --- | --- | --- |
| M0 | Phase -1 source freeze, truth matrix, decision authorization | No deploy |
| M1 | Contrast fix, selected-control fix, D-006 route-policy reconciliation | Web deploy only if gates pass |
| M2 | Shell/nav, Library, More truth cleanup | Web deploy + Android WebView validation |
| M3 | Share result state machine and Android share validation | Web deploy + Android native entry validation |
| M4 | Ask composer and item detail, only within approved decisions | Web deploy + authenticated APK validation |
| M5 | Capture/Repair/Needs Upgrade, Topic/Collection parity | Web deploy + authenticated APK validation |
| M6 | Entry/pairing/deep-link/APK identity, only if native scope approved | APK validation or publication path |
| M7 | Full Android release candidate, accessibility, cache, rollback, smoke | Release candidate |

## Done Criteria

- Phase -1 truth matrix and decision authorization are complete.
- Every Magic Patterns mobile screen is mapped to production route and production truth.
- All D-001 through D-014 items are approved implementation, approved deferral, or blocked.
- The More/Capture route-policy contradiction is resolved in code, docs, and screenshots.
- Button and selected-control contrast pass in light and dark modes.
- Share result states are typed, safe, and validated across success and failure paths.
- No fake prototype data or misleading capability claims remain in mobile UI.
- Android authenticated protected routes are validated for all changed protected screens.
- Android native share, pairing, offline, relaunch, and install paths are validated where affected.
- Client-state/cache recovery is documented and tested.
- Accessibility criteria are measured, not merely asserted.
- Backup, rollback, deploy, and APK publication gates pass.
- Final release notes state shipped, validated, deferred, blocked, APK status, and residual risks.

## Immediate Next Step

Start with Phase -1 only:

1. Read/export the active Magic Patterns artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7`.
2. Copy or link the missing PRD packages into the release worktree.
3. Create the design truth matrix and D-decision authorization table.
4. Reconcile the More/Capture route-policy contradiction.
5. Then implement the contrast fix as the first code milestone.
