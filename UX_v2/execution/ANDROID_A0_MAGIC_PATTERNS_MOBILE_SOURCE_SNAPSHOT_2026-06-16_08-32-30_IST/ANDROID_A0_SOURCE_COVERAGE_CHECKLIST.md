# Android A0 Source Coverage Checklist

Created: 2026-06-16 08:32:30 IST
Status: Complete. Every row below is mapped in `ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`.

| Coverage ID | Source file | Element/state to classify | Required truth action |
| --- | --- | --- | --- |
| A0-COV-001 | `components/MobileFrame.tsx` | Fake phone frame, status bar, time, Wi-Fi, signal, battery, gesture pill | Exclude from production; spacing intent only |
| A0-COV-002 | `components/MobileBottomNav.tsx` | Library/Capture/Ask/More bottom nav | Implement/adapt to production route policy |
| A0-COV-003 | `components/MobileBottomNav.tsx` | Raised Capture on non-Ask/non-Capture routes | Implement only with overlap validation |
| A0-COV-004 | `pages/MobileLibrary.tsx` | Search and primary filters | Implement/adapt |
| A0-COV-005 | `pages/MobileLibrary.tsx` | Offline filter | Hide or disable unless real offline item availability exists |
| A0-COV-006 | `pages/MobileLibrary.tsx` | Select items and Ask selected | Implement/adapt within real Ask scope limits |
| A0-COV-007 | `pages/MobileShareCapture.tsx` | Single happy-path metadata-only result | Replace with completed full result state matrix |
| A0-COV-008 | `pages/MobileCapture.tsx` | URL, note, PDF capture tabs/states | Implement/adapt using real capture APIs |
| A0-COV-009 | `pages/MobileRepair.tsx` | Add transcript/text repair | Implement/adapt using real repair path |
| A0-COV-010 | `pages/MobileRepair.tsx` | Any mark-good-enough/dismiss weak state | Hide; D-004 deferred |
| A0-COV-011 | `pages/MobileNeedsUpgrade.tsx` | Needs Upgrade queue and empty state | Implement/adapt |
| A0-COV-012 | `pages/MobileAsk.tsx` | Mobile Ask composer, citations, scope banner | Implement/adapt |
| A0-COV-013 | `pages/MobileAsk.tsx` | Paste-link/write-note/attached source semantics | Hide/disable unless existing supported behavior is verified; D-001/D-003 deferred |
| A0-COV-014 | `pages/MobileAsk.tsx` | AI Brain wording | Adapt to AI Memory |
| A0-COV-015 | `pages/MobileItemDetail.tsx` | Original/Digest/Ask/Related/Details tabs | Implement/adapt; D-005 approved WebView only |
| A0-COV-016 | `pages/MobileItemDetail.tsx` | Offline field | Hide/adapt to server-required truth; no offline item-read claim |
| A0-COV-017 | `pages/MobileItemDetail.tsx` | Add tag/add collection sheets | Needs real mutation support and tests; otherwise hide/disable |
| A0-COV-018 | `pages/MobileMore.tsx` | Fake account name/email and AI Brain version | Replace with real app/device/server status |
| A0-COV-019 | `pages/MobileMore.tsx` | Offline sync and connected devices | Hide/disable as roadmap; no active claim |
| A0-COV-020 | `pages/MobileMore.tsx` | Privacy, telemetry, crash controls, E2EE, delete-all-data | Disabled roadmap only or hide |
| A0-COV-021 | `pages/MobileOffline.tsx` | Offline item list and available offline count | Hide; no offline item-read claim in this revamp |
| A0-COV-022 | `pages/MobileOffline.tsx` | Server unreachable and Ask unavailable | Implement/adapt truthfully |
| A0-COV-023 | `pages/MobileLogin.tsx` | Unlock AI Brain wording | Adapt to AI Memory |
| A0-COV-024 | `pages/MobileLogin.tsx` | Biometric/device unlock icon action | Hide unless implemented and validated |
| A0-COV-025 | `pages/MobileLogin.tsx` | QR scan pairing | Hide; D-008 deferred |
| A0-COV-026 | `pages/MobileLogin.tsx` | Pairing code entry | Implement/adapt |
| A0-COV-027 | `pages/MobileLogin.tsx` | Synced/offline-read copy | Adapt to token/session truth; no sync/offline-read overclaim |
| A0-COV-028 | `pages/MobileTopic.tsx` | Ask this topic | Implement/adapt to scoped Ask |
| A0-COV-029 | `pages/MobileTopic.tsx` | Create tag from topic and add items to collection | Hide/disable unless mutation support exists and is tested |
| A0-COV-030 | `pages/MobileCollection.tsx` | Ask collection | Implement/adapt to scoped Ask |
| A0-COV-031 | `pages/MobileCollection.tsx` | Add items sheet | Hide/disable unless mutation support exists and is tested |
| A0-COV-032 | `data/sources.ts` | Prototype fixture titles, authors, channels, offlineAvailable flags | Reference only; do not copy private/fake fixture data |
| A0-COV-033 | `data/conversations.ts` | Prototype Ask history and simulated conversations | Reference only; do not claim real persisted history beyond current app truth |
| A0-COV-034 | shared UI primitives | Button, drawer, tabs, badges, inputs, cards | Visual intent only; adapt to existing tokens/components |
