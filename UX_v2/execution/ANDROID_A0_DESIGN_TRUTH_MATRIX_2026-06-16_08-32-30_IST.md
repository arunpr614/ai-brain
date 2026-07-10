# Android A0 Design Truth Matrix

Created: 2026-06-16 08:32:30 IST
Status: Complete locally. Use this as the source-truth gate for later Android slices.

## Source Coverage Summary

| Source | Status |
| --- | --- |
| Magic Patterns active artifact | `d7eeaec6-0272-40fa-a7ca-4de7871182e7` |
| Generation status | `isGenerating=false` |
| Local source files | 32 captured, all `captured_full` |
| Source snapshot | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/` |
| Coverage checklist rows | 34 rows, all mapped below |

## Decision Authorization

| Decision | Product status | Visible source impact | Production UI rule | Implementation action | Completion eligible |
| --- | --- | --- | --- | --- | --- |
| D-001 Ask attached context | Approved deferral/excluded | `MobileAsk` paste-link/write-note/attachments | Hide/disable unsupported attachment semantics unless current app support is verified | hide/disable | No |
| D-002 high-quality-only Ask | Approved deferral/excluded | Ask quality controls/warnings | Do not change retrieval semantics; show source-quality warnings only | adapt copy | No |
| D-003 scope-history persistence | Approved deferral/excluded | Ask history/restored attachments | Do not add schema or persisted snapshot semantics | hide/disable unsupported persistence | No |
| D-004 mark good enough | Approved deferral/excluded | Repair/Needs Upgrade dismissal concepts | No weak-source dismissal without real state/audit trail | hide | No |
| D-005 Android item detail tabs | Approved implementation, WebView only | `MobileItemDetail` tabs | Implement WebView tabs using existing data only | implement | Yes |
| D-006 raised Capture route policy | Approved implementation | `MobileBottomNav` raised capture | Standard on Ask/Capture; raised elsewhere if no overlap | implement with validation | Yes |
| D-007 active offline controls | Approved deferral/excluded | `MobileOffline`, Library offline filter, More offline sync | Server-required fallback only; no offline item list/read/sync | hide/disable/adapt copy | No |
| D-008 QR pairing | Approved deferral/excluded | `MobileLogin` QR scan | Code-entry pairing only | hide | No |
| D-009 transcript operator visibility | Out of scope | None for mobile UI | No user-facing operator UI | out of scope | No |
| D-010 transcript fallback strategy | Out of scope | None for mobile UI | No fallback provider promise | out of scope | No |
| D-011 analytics/telemetry | Approved deferral/excluded | `MobileMore` privacy controls | No active analytics/telemetry toggle | disable/hide | No |
| D-012 Chrome extension redesign | Out of scope | None for Android revamp | No extension work | out of scope | No |
| D-013 package ID migration | Approved deferral/excluded | Login/package/app identity claims | Keep `com.arunprakash.brain`; no migration claim | hide/adapt copy | No |
| D-014 YouTube embedded player/media | Partial approval | Item detail metadata/media | Metadata/thumbnail only if existing data supports it; no embedded player | adapt/hide | Partial |

## Screen And Element Truth Matrix

| Coverage ID | Source file | Source element/state | Prototype behavior/copy | Production truth | Decision ID | Implementation action | Validation required | Completion eligible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A0-COV-001 | `components/MobileFrame.tsx` | Fake phone frame/status/nav chrome | Fixed 390px phone, fake 10:00, Wi-Fi, signal, battery, gesture pill | Production Android/WebView already supplies device chrome | none | out of scope | Source scan and APK screenshots | No |
| A0-COV-002 | `components/MobileBottomNav.tsx` | Library/Capture/Ask/More nav | Bottom nav with four destinations | Production has mobile shell/sidebar routing; adapt visual hierarchy | D-006 | implement | Route tests, browser and APK screenshots | Yes |
| A0-COV-003 | `components/MobileBottomNav.tsx` | Raised Capture | Raised on routes except Ask/Capture | Approved if overlap-free | D-006 | implement with validation | Overlap screenshots on Library/More/item/topic/collection/search/Needs Upgrade | Yes |
| A0-COV-004 | `pages/MobileLibrary.tsx` | Search/filter row | Mobile search and primary filters | Production supports search/filter concepts; adapt to existing routes/data | none | implement | Browser mobile and authenticated APK evidence | Yes |
| A0-COV-005 | `pages/MobileLibrary.tsx` | Offline filter | Filters `offlineAvailable` fixture data | No active offline library/read feature in revamp | D-007 | hide/disable | Copy scan; no offline-read UI | No |
| A0-COV-006 | `pages/MobileLibrary.tsx` | Select and Ask selected | User selects rows and asks selected items | Production supports scoped Ask concepts; enforce existing limits | D-001/D-003 | implement/adapt | Tests and APK/browser interaction evidence | Yes |
| A0-COV-007 | `pages/MobileShareCapture.tsx` | Share result | Single metadata-only happy path | Completed local state matrix covers full/limited/duplicate/update/failure/expired | none | implemented locally | Existing share-result QA plus later native share evidence | Yes local, native pending |
| A0-COV-008 | `pages/MobileCapture.tsx` | URL/note/PDF capture | Mobile capture form states | Production APIs exist; use real success/limited/duplicate/update/failure states | none | implement/adapt | API tests, browser and APK evidence | Yes |
| A0-COV-009 | `pages/MobileRepair.tsx` | Add transcript/text | Improves weak source for Ask | Production repair path exists | none | implement/adapt | Repair tests and APK evidence | Yes |
| A0-COV-010 | `pages/MobileRepair.tsx` | Good-enough/dismissal possibility | Prototype repair context could imply manual completion | No mark-good-enough behavior approved | D-004 | hide | Copy/action scan | No |
| A0-COV-011 | `pages/MobileNeedsUpgrade.tsx` | Weak queue/empty | Items need text to be useful in Ask | Production has Needs Upgrade surface | D-004 | implement/adapt, no dismissal | Browser and APK evidence | Yes |
| A0-COV-012 | `pages/MobileAsk.tsx` | Ask composer/citations/scope | Mobile chat with citations and scope | Production Ask exists; adapt with real provider/error states | D-001/D-002/D-003 | implement/adapt | Ask tests, provider-down and live-provider evidence | Yes |
| A0-COV-013 | `pages/MobileAsk.tsx` | Paste-link/write-note/attached sources | Prototype attachment/session behavior | Not approved as new persistence semantics | D-001/D-003 | hide/disable unless existing support verified | Copy scan and interaction tests | No |
| A0-COV-014 | `pages/MobileAsk.tsx` | AI Brain wording | Uses AI Brain labels | Product name is AI Memory | none | adapt copy | Forbidden copy scan | Yes |
| A0-COV-015 | `pages/MobileItemDetail.tsx` | Original/Digest/Ask/Related/Details tabs | WebView item tabs | Approved WebView tabs using existing data only | D-005/D-014 | implement/adapt | Authenticated APK evidence | Yes |
| A0-COV-016 | `pages/MobileItemDetail.tsx` | Offline field | Shows available/not saved offline | Offline item read is not approved | D-007 | hide/adapt copy | Copy scan | No |
| A0-COV-017 | `pages/MobileItemDetail.tsx` | Add tag/add collection sheets | Mutates tags/collections in prototype | Only ship if existing mutations are real and tested | none | needs decision or implement with tests | Mutation tests and rollback/cleanup proof | Conditional |
| A0-COV-018 | `pages/MobileMore.tsx` | Account/version identity | Shows fake account and `AI Brain v1.0.0` | Use real app/device/server status and AI Memory naming | none/D-013 | adapt copy | Copy scan and APK evidence | Yes |
| A0-COV-019 | `pages/MobileMore.tsx` | Offline sync/connected devices | Roadmap-like sync/device controls | No active offline sync/device management in revamp | D-007 | hide/disable | Copy/action scan | No |
| A0-COV-020 | `pages/MobileMore.tsx` | Privacy/telemetry/E2EE/delete controls | Disabled roadmap controls in prototype | May appear only disabled and explicitly not active, or be hidden | D-011 | disable/hide | Manual copy audit | No |
| A0-COV-021 | `pages/MobileOffline.tsx` | Offline items/count | Reads items while offline | Not approved; server-required fallback only | D-007 | hide | APK offline evidence and copy scan | No |
| A0-COV-022 | `pages/MobileOffline.tsx` | Server unreachable/Ask unavailable | Shows offline state | Implement truthful server-required fallback | D-007 | adapt copy | Offline/recovery APK evidence | Yes |
| A0-COV-023 | `pages/MobileLogin.tsx` | Unlock AI Brain | Uses stale brand | Must say AI Memory | none | adapt copy | Copy scan | Yes |
| A0-COV-024 | `pages/MobileLogin.tsx` | Biometric/device unlock | Fingerprint icon action | Not implemented/validated | none | hide | Copy/action scan | No |
| A0-COV-025 | `pages/MobileLogin.tsx` | Scan QR from web | QR pairing | D-008 deferred; code-entry only | D-008 | hide | Copy/action scan | No |
| A0-COV-026 | `pages/MobileLogin.tsx` | Enter pairing code | Pairing code state | Production code-entry pairing exists | D-008 | implement/adapt | Pairing tests and APK evidence | Yes |
| A0-COV-027 | `pages/MobileLogin.tsx` | Synced/offline-read copy | "Your Brain is now synced", read offline items | No sync/offline-read claim | D-007/D-013 | adapt copy/hide | Copy scan | No |
| A0-COV-028 | `pages/MobileTopic.tsx` | Ask this topic | Scoped topic Ask | Production topic route/scoped Ask exists locally | none | implement/adapt | Browser and APK evidence | Yes |
| A0-COV-029 | `pages/MobileTopic.tsx` | Create tag/add collection | Mutations from topic | Requires real mutation support and tests | none | hide/disable unless tested | Mutation tests | Conditional |
| A0-COV-030 | `pages/MobileCollection.tsx` | Ask collection | Scoped collection Ask | Production collection route/scoped Ask exists locally | none | implement/adapt | Browser and APK evidence | Yes |
| A0-COV-031 | `pages/MobileCollection.tsx` | Add items sheet | Collection mutation | Requires real mutation support and tests | none | hide/disable unless tested | Mutation tests | Conditional |
| A0-COV-032 | `data/sources.ts` | Fixture titles/authors/channels/offline flags | Prototype fake/private-like content | Reference only; do not copy as production content | none | out of scope | Source scan | No |
| A0-COV-033 | `data/conversations.ts` | Prototype Ask history | Simulated conversations | Reference only; no new persistence claim | D-003 | out of scope/adapt | Copy scan | No |
| A0-COV-034 | shared UI primitives | Buttons/drawers/tabs/badges/cards | Tailwind prototype primitives | Adapt to existing production components/tokens | none | adapt | Lint/tests/screenshots | Yes |

## Forbidden Prototype Behavior Table

| Behavior | Production action |
| --- | --- |
| QR pairing | Hide |
| Offline item read/list/count | Hide |
| Offline sync | Hide or disabled roadmap only |
| Telemetry/analytics controls | Disabled roadmap only or hide |
| E2EE claim | Disabled roadmap only or hide |
| Delete-all-data control | Disabled roadmap only or hide |
| Biometric unlock | Hide |
| Package migration/rename | Hide |
| Embedded media/player | Hide unless separately approved |
| Fake account/name/email/version | Replace with real app/device/server status |

## Share Result Slice Reference

`UX_v2/execution/ANDROID_SHARE_RESULT_QA_2026-06-16_08-16-53_IST.md` is complete locally for the web result surface. Final Android native share claims still require native entry-path validation.
