# Design Traceability Matrix

Created: 2026-06-14 10:15 IST
Source of truth: this Markdown file. CSV is a convenience export.

Purpose: prove that design docs, screenshots, and source exports were considered and mapped to final planning scope, feature classification, PRDs, lightweight specs, or decisions. This is planning traceability, not production QA evidence.

## Freshness Gate

Before visual implementation, either re-open the live Magic Patterns refs and record whether they changed, or get explicit confirmation that the frozen local `../../UX_UI_DESIGN_PACKAGE` is authoritative. If live refs differ materially, update this matrix and affected PRDs before code work.

## Matrix

| ID | Design artifact | Shown state or requirement | Implied behavior | Classification | Mapped artifact | Confidence | Decision needed | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DOC-001 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` global shell | Desktop shell, nav, AI Memory identity | Verify web shell before feature work | Existing/QA-gated | PRD-11-SHELL, PRD-16 | High | No | Implementation agent |
| DOC-002 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` entry | Login, unlock, pair, session, offline | Entry states need trust copy | Partial/Missing | PRD-15 | High | QR/session details | Arun/Product |
| DOC-003 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Library | Search, filters, select, Ask selected | Library mostly exists, needs QA | Existing/QA-gated | LIB rows, PRD-16 | High | No | Implementation agent |
| DOC-004 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Needs Upgrade | Weak states and repair actions | Repair flow missing | Partial | PRD-10 | High | Mark-good-enough | Arun/Product |
| DOC-005 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Item Detail | Source trust, rail, focus, topics | Web mostly exists, Android tabs open | Partial | PRD-11-FU, YT-01 | High | Android tabs | Arun/Product |
| DOC-006 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Ask | History, scope, citations | Attachment/high-quality gaps | Partial/Missing | PRD-09-FU | High | Attachment model | Arun/Product |
| DOC-007 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Capture | URL/PDF/note/text result states | Canonical result contract needed | Partial | PRD-06-FU, EXT-01 | High | No | Implementation agent |
| DOC-008 | `docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md` Settings | Privacy, providers, backup, offline | Trust copy cannot overclaim | Partial | PRD-14 | High | Offline controls | Arun/Product |
| DOC-009 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` shell | Bottom nav and route-aware Capture | Mobile shell smoke blocks work | No-go until verification | PRD-11-SHELL | High | More route policy | Arun/Product |
| DOC-010 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` entry | Pairing, offline, session | Device/emulator evidence needed | Partial/Missing | PRD-15 | High | QR/package posture | Arun/Product |
| DOC-011 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` Library | Filters, select, Needs Upgrade | Long press/select needs proof | Partial | PRD-11-FU | High | Android tabs split | Arun/Product |
| DOC-012 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` Capture/share | Share result states | Durable share result surface needed | Partial/Missing | PRD-06-FU, PRD-13 | High | Multi-PDF policy | Arun/Product |
| DOC-013 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` Item detail | Original/Digest/Ask/Related/Details tabs | Tabbed mobile IA missing | Missing/decision-gated | PRD-11-FU or new PRD | High | Include tabs now? | Arun/Product |
| DOC-014 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` Ask | Unified composer, context, history | Depends on effective Ask scope | Missing | PRD-12 | High | Attachment model | Arun/Product |
| DOC-015 | `docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md` More/settings | Privacy/offline/provider status | Mobile trust posture needed | Partial | PRD-14 | High | Offline controls | Arun/Product |
| DOC-016 | `docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md` Ask rules | Attachments override route scope | Persist effective scope | Missing | PRD-09-FU | High | Snapshot semantics | Arun/Product |
| DOC-017 | `docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md` capture rules | Status, source, captured via, quality, next action | Generic success is insufficient | Partial | PRD-06-FU, PRD-13 | High | No | Implementation agent |
| DOC-018 | `docs/AI_MEMORY_DATA_CONTENT_AND_STATE_MODEL.md` source/conversation/capture | Source, conversation, Ask, capture, privacy fields | Data model choices remain | Partial/Missing | PRD-09-FU, PRD-10, PRD-14 | High | Multiple | Arun/Product |
| DOC-019 | `docs/AI_MEMORY_FEATURE_PARITY_AND_SCOPE_MATRIX.md` platform parity | Web workbench and Android companion | Parity is conceptual, not identical UI | Planning rule | Roadmap, PRDs | High | No | Implementation agent |
| DOC-020 | `checklists/AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md` | Acceptance checklist | Must be copied/evidenced during implementation | Missing evidence | PRD-16 | High | No | Implementation agent |
| SS-001 | `screenshots/SCREENSHOT_EXPORT_INDEX.md` | Screenshot index and caveat | Screenshots are reference, not QA evidence | Planning reference | PRD-16 | High | No | Implementation agent |
| SS-002 | `screenshots/web/desktop-library.png` | Desktop Library | Filter/search/select visual parity | Existing/QA-gated | LIB rows, DS-01 | Medium | No | Implementation agent |
| SS-003 | `screenshots/web/desktop-item-youtube.png` | Desktop YouTube item detail | Media metadata polish may be needed | Partial | YT-01, PRD-11-FU | Medium | Thumbnail/player | Arun/Product |
| SS-004 | `screenshots/web/desktop-item-focus.png` | Desktop focus mode | Focus must hide secondary UI | Partial/QA-gated | PRD-11-FU, PRD-16 | Medium | No | Implementation agent |
| SS-005 | `screenshots/web/desktop-ask.png` | Desktop Ask empty/new | Scope/history/citation truth | Partial | PRD-09-FU | Medium | Attachment model | Arun/Product |
| SS-006 | `screenshots/web/desktop-ask-conversation.png` | Restored conversation | History restore preserves scope/citations | Partial/Missing | PRD-09-FU | Medium | Snapshot semantics | Arun/Product |
| SS-007 | `screenshots/web/desktop-capture.png` | Desktop Capture | Result states and input modes | Partial | PRD-06-FU | Medium | No | Implementation agent |
| SS-008 | `screenshots/web/desktop-settings.png` | Desktop Settings | Trust/privacy/offline copy | Partial | PRD-14 | Medium | Offline controls | Arun/Product |
| SS-009 | `screenshots/web/desktop-login.png` | Desktop login | AI Memory entry branding | Partial | PRD-15 | Medium | No | Implementation agent |
| SS-010 | `screenshots/android/mobile-library.png` | Mobile Library | Compact filters/select/bottom nav | Partial | PRD-11-SHELL, PRD-11-FU | Medium | Long press/tabs | Arun/Product |
| SS-011 | `screenshots/android/mobile-item-youtube.png` | Mobile YouTube item | Tabbed/media treatment implied | Missing/decision-gated | PRD-11-FU, YT-01 | Medium | Tabs/player | Arun/Product |
| SS-012 | `screenshots/android/mobile-item-focus.png` | Mobile focus | Bottom nav/tabs hidden in focus | Partial | PRD-11-FU, PRD-16 | Medium | No | Implementation agent |
| SS-013 | `screenshots/android/mobile-ask.png` | Mobile Ask | Unified composer/context/history | Missing | PRD-12 | Medium | Attachment model | Arun/Product |
| SS-014 | `screenshots/android/mobile-capture.png` | Mobile Capture | Result states and quick input | Partial | PRD-06-FU, PRD-13 | Medium | No | Implementation agent |
| SS-015 | `screenshots/android/mobile-more-settings.png` | Mobile More/settings | Account/privacy/offline/provider | Partial | PRD-14 | Medium | Offline controls | Arun/Product |
| SS-016 | `screenshots/android/mobile-login.png` | Mobile login | Pair/unlock/offline entry | Partial/Missing | PRD-15 | Medium | QR/session | Arun/Product |
| SS-017 | `screenshots/android/mobile-needs-upgrade.png` | Mobile Needs Upgrade | Repair-oriented queue | Partial | PRD-10 | Medium | Mark-good-enough | Arun/Product |
| SRC-001 | `source-exports/README.md` | Source export instructions | Frozen reference package | Reference | Repro snapshot | High | No | Implementation agent |
| SRC-002 | `source-exports/SOURCE_EXPORT_MANIFEST.json` | Source export manifest | File inventory/provenance | Reference | Repro snapshot | High | No | Implementation agent |
| SRC-003 | `source-exports/android/magic-patterns-exact/App.tsx` | Android prototype app shell | Prototype navigation only | Reference | PRD-11-FU | Medium | No | Implementation agent |
| SRC-004 | `source-exports/android/magic-patterns-exact/canvas.manifest.js` | Prototype canvas metadata | Reference only | Reference | DS-01 | Low | No | Implementation agent |
| SRC-005 | `source-exports/android/magic-patterns-exact/components/MobileBottomNav.tsx` | Mobile bottom nav | Route-aware Capture and More policy | Partial | PRD-11-SHELL, PRD-11-FU | Medium | More route policy | Arun/Product |
| SRC-006 | `source-exports/android/magic-patterns-exact/components/MobileFrame.tsx` | Mobile frame | Visual shell framing | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-007 | `source-exports/android/magic-patterns-exact/components/ui/Badge.tsx` | UI badge | Badge parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-008 | `source-exports/android/magic-patterns-exact/components/ui/Button.tsx` | UI button | Button parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-009 | `source-exports/android/magic-patterns-exact/components/ui/Card.tsx` | UI card | Card parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-010 | `source-exports/android/magic-patterns-exact/components/ui/Checkbox.tsx` | UI checkbox | Select/accessibility affordance | UX redesign only | PRD-11-FU, DS-01 | Medium | No | Implementation agent |
| SRC-011 | `source-exports/android/magic-patterns-exact/components/ui/Drawer.tsx` | UI drawer | Sheet/drawer behavior reference | UX redesign only | PRD-12, PRD-14 | Medium | No | Implementation agent |
| SRC-012 | `source-exports/android/magic-patterns-exact/components/ui/Input.tsx` | UI input | Composer/forms styling | UX redesign only | PRD-12, DS-01 | Medium | No | Implementation agent |
| SRC-013 | `source-exports/android/magic-patterns-exact/components/ui/Select.tsx` | UI select | Filter/settings controls | UX redesign only | PRD-11-FU, PRD-14 | Medium | No | Implementation agent |
| SRC-014 | `source-exports/android/magic-patterns-exact/components/ui/Separator.tsx` | UI separator | Visual rhythm | UX redesign only | DS-01 | Low | No | Implementation agent |
| SRC-015 | `source-exports/android/magic-patterns-exact/components/ui/Tabs.tsx` | UI tabs | Android item detail tabs reference | Missing/decision-gated | PRD-11-FU or new PRD | Medium | D-005 | Arun/Product |
| SRC-016 | `source-exports/android/magic-patterns-exact/data/conversations.ts` | Simulated conversations | Do not treat as backend truth | Reference only | COPY-01, ANALYTICS-01 | High | No | Implementation agent |
| SRC-017 | `source-exports/android/magic-patterns-exact/data/sources.ts` | Simulated sources | Do not treat as backend truth | Reference only | COPY-01, DS-01 | High | No | Implementation agent |
| SRC-018 | `source-exports/android/magic-patterns-exact/index.css` | Prototype CSS | Visual tokens reference | UX redesign only | DS-01 | Medium | Magic freshness | Implementation agent |
| SRC-019 | `source-exports/android/magic-patterns-exact/index.tsx` | Prototype entry | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
| SRC-020 | `source-exports/android/magic-patterns-exact/package.json` | Prototype package | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
| SRC-021 | `source-exports/android/magic-patterns-exact/pages/MobileAsk.tsx` | Mobile Ask | Composer, context, history sheets | Missing | PRD-12 | High | Attachment model | Arun/Product |
| SRC-022 | `source-exports/android/magic-patterns-exact/pages/MobileCapture.tsx` | Mobile Capture | Capture input/result states | Partial | PRD-06-FU, PRD-13 | High | No | Implementation agent |
| SRC-023 | `source-exports/android/magic-patterns-exact/pages/MobileCollection.tsx` | Mobile collection | Collection detail/scoped Ask | Existing/QA-gated | TAX/COLL rows, PRD-16 | Medium | No | Implementation agent |
| SRC-024 | `source-exports/android/magic-patterns-exact/pages/MobileItemDetail.tsx` | Mobile item detail | Tabs and media treatment | Missing/decision-gated | PRD-11-FU, YT-01 | High | D-005/D-014 | Arun/Product |
| SRC-025 | `source-exports/android/magic-patterns-exact/pages/MobileLibrary.tsx` | Mobile Library | Filters/select/bottom nav | Partial | PRD-11-FU | High | No | Implementation agent |
| SRC-026 | `source-exports/android/magic-patterns-exact/pages/MobileLogin.tsx` | Mobile Login | Entry/pairing/session states | Partial/Missing | PRD-15 | High | QR/session | Arun/Product |
| SRC-027 | `source-exports/android/magic-patterns-exact/pages/MobileMore.tsx` | Mobile More | Settings/trust rows | Partial | PRD-14 | High | Offline controls | Arun/Product |
| SRC-028 | `source-exports/android/magic-patterns-exact/pages/MobileNeedsUpgrade.tsx` | Mobile Needs Upgrade | Repair queue | Partial | PRD-10 | High | Mark-good-enough | Arun/Product |
| SRC-029 | `source-exports/android/magic-patterns-exact/pages/MobileOffline.tsx` | Mobile Offline | Offline entry/fallback | Partial | PRD-14, PRD-15 | High | Active offline controls | Arun/Product |
| SRC-030 | `source-exports/android/magic-patterns-exact/pages/MobileRepair.tsx` | Mobile Repair | Weak-source repair | Partial | PRD-10 | High | D-004 | Arun/Product |
| SRC-031 | `source-exports/android/magic-patterns-exact/pages/MobileShareCapture.tsx` | Mobile Share Capture | Share result/repair surface | Missing | PRD-13 | High | Multi-PDF/offline queue | Arun/Product |
| SRC-032 | `source-exports/android/magic-patterns-exact/pages/MobileTopic.tsx` | Mobile Topic | Topic detail/scoped Ask | Existing/QA-gated | TAX/COLL rows, PRD-16 | Medium | No | Implementation agent |
| SRC-033 | `source-exports/android/magic-patterns-exact/tailwind.config.js` | Prototype styling | Token reference only | UX redesign only | DS-01 | Medium | Magic freshness | Implementation agent |
| SRC-034 | `source-exports/android/magic-patterns-exact/useScreenInit.js` | Prototype init | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
| SRC-035 | `source-exports/web/magic-patterns-exact/App.tsx` | Web prototype app | Prototype navigation only | Reference | WEB rows | Medium | No | Implementation agent |
| SRC-036 | `source-exports/web/magic-patterns-exact/canvas.manifest.js` | Prototype canvas metadata | Reference only | Reference | DS-01 | Low | No | Implementation agent |
| SRC-037 | `source-exports/web/magic-patterns-exact/components/DesktopLayout.tsx` | Desktop layout | Shell/sidebar visual reference | Existing/QA-gated | WEB-01, DS-01 | Medium | No | Implementation agent |
| SRC-038 | `source-exports/web/magic-patterns-exact/components/ui/Badge.tsx` | UI badge | Badge parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-039 | `source-exports/web/magic-patterns-exact/components/ui/Button.tsx` | UI button | Button parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-040 | `source-exports/web/magic-patterns-exact/components/ui/Card.tsx` | UI card | Card parity | UX redesign only | DS-01 | Medium | No | Implementation agent |
| SRC-041 | `source-exports/web/magic-patterns-exact/components/ui/Checkbox.tsx` | UI checkbox | Selection/control parity | UX redesign only | PRD-11-FU, DS-01 | Medium | No | Implementation agent |
| SRC-042 | `source-exports/web/magic-patterns-exact/components/ui/Drawer.tsx` | UI drawer | Sheet reference | UX redesign only | PRD-12, DS-01 | Medium | No | Implementation agent |
| SRC-043 | `source-exports/web/magic-patterns-exact/components/ui/Input.tsx` | UI input | Forms/composer styling | UX redesign only | PRD-06-FU, PRD-12, DS-01 | Medium | No | Implementation agent |
| SRC-044 | `source-exports/web/magic-patterns-exact/components/ui/Select.tsx` | UI select | Filter/settings controls | UX redesign only | LIB rows, PRD-14 | Medium | No | Implementation agent |
| SRC-045 | `source-exports/web/magic-patterns-exact/components/ui/Separator.tsx` | UI separator | Visual rhythm | UX redesign only | DS-01 | Low | No | Implementation agent |
| SRC-046 | `source-exports/web/magic-patterns-exact/components/ui/Tabs.tsx` | UI tabs | Tab behavior reference | UX redesign only | PRD-11-FU | Medium | D-005 if Android tabs | Arun/Product |
| SRC-047 | `source-exports/web/magic-patterns-exact/data/conversations.ts` | Simulated conversations | Do not treat as backend truth | Reference only | COPY-01, ANALYTICS-01 | High | No | Implementation agent |
| SRC-048 | `source-exports/web/magic-patterns-exact/data/sources.ts` | Simulated sources | Do not treat as backend truth | Reference only | COPY-01, DS-01 | High | No | Implementation agent |
| SRC-049 | `source-exports/web/magic-patterns-exact/index.css` | Prototype CSS | Visual token reference | UX redesign only | DS-01 | Medium | Magic freshness | Implementation agent |
| SRC-050 | `source-exports/web/magic-patterns-exact/index.tsx` | Prototype entry | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
| SRC-051 | `source-exports/web/magic-patterns-exact/package.json` | Prototype package | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
| SRC-052 | `source-exports/web/magic-patterns-exact/pages/DesktopAsk.tsx` | Desktop Ask | Scope/history/reference UI | Partial | PRD-09-FU | High | Attachment/history decisions | Arun/Product |
| SRC-053 | `source-exports/web/magic-patterns-exact/pages/DesktopCapture.tsx` | Desktop Capture | Capture result states | Partial | PRD-06-FU | High | No | Implementation agent |
| SRC-054 | `source-exports/web/magic-patterns-exact/pages/DesktopCollection.tsx` | Desktop Collection | Collection detail/scoped Ask | Existing/QA-gated | TAX/COLL rows, PRD-16 | Medium | No | Implementation agent |
| SRC-055 | `source-exports/web/magic-patterns-exact/pages/DesktopItemDetail.tsx` | Desktop item detail | Detail/focus/YouTube treatment | Partial | PRD-11-FU, YT-01 | High | Thumbnail/player | Arun/Product |
| SRC-056 | `source-exports/web/magic-patterns-exact/pages/DesktopLibrary.tsx` | Desktop Library | Library filters/select | Existing/QA-gated | LIB rows, PRD-16 | High | No | Implementation agent |
| SRC-057 | `source-exports/web/magic-patterns-exact/pages/DesktopLogin.tsx` | Desktop Login | Entry branding/session | Partial | PRD-15 | Medium | No | Implementation agent |
| SRC-058 | `source-exports/web/magic-patterns-exact/pages/DesktopNeedsUpgrade.tsx` | Desktop Needs Upgrade | Weak-source queue/repair | Partial | PRD-10 | High | D-004 | Arun/Product |
| SRC-059 | `source-exports/web/magic-patterns-exact/pages/DesktopPairDevice.tsx` | Pair Device | Pairing states | Partial | PRD-15 | High | QR/package posture | Arun/Product |
| SRC-060 | `source-exports/web/magic-patterns-exact/pages/DesktopSettings.tsx` | Desktop Settings | Trust/privacy/offline | Partial | PRD-14 | High | Offline controls | Arun/Product |
| SRC-061 | `source-exports/web/magic-patterns-exact/pages/DesktopTopic.tsx` | Desktop Topic | Topic detail/scoped Ask | Existing/QA-gated | TAX/COLL rows, PRD-16 | Medium | No | Implementation agent |
| SRC-062 | `source-exports/web/magic-patterns-exact/tailwind.config.js` | Prototype styling | Token reference only | UX redesign only | DS-01 | Medium | Magic freshness | Implementation agent |
| SRC-063 | `source-exports/web/magic-patterns-exact/useScreenInit.js` | Prototype init | Reference only | Reference | Repro snapshot | Low | No | Implementation agent |
