# Android A0 Evidence Strategy And Route Inventory

Created: 2026-06-16 08:32:30 IST
Status: Complete locally for planning/source-truth. Runtime evidence remains required per slice.

## Evidence Labels

| Label | Meaning | Can support Android-complete claim |
| --- | --- | --- |
| Browser mobile only | Responsive browser route checked at Android viewport | No |
| Android unauthenticated route validated | APK/WebView checked for public route such as unlock/setup/offline | Only for public surfaces |
| Android authenticated route validated | APK/WebView checked with real session for protected route | Yes for changed protected screens |
| Android native entry path validated | Native share/pairing/intent/install path checked on APK/device | Yes for native-entry claims |
| Production live smoke | Live deployed URL checked after backup/deploy | Required for release, not enough alone for APK native claims |

## Route And Evidence Inventory

| Mobile source screen | Production route or native entry | Auth state | Current production source files | Current tests | Existing evidence | Required Android evidence level | Mutation/data risk | Release blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MobileFrame | App shell | Session/public depending route | `src/app/layout.tsx`, `src/components/sidebar.tsx` | `src/components/sidebar-routing.test.ts` | Browser web integrated QA | Authenticated APK for protected screens | None | Yes for shell claim |
| MobileBottomNav | App shell navigation | Session/public depending route | `src/components/sidebar.tsx`, `src/components/sidebar-routing.ts` | `src/components/sidebar-routing.test.ts` | Browser web integrated QA | Authenticated APK | None | Yes |
| MobileLibrary | `/library`, `/search` | Session | `src/app/library/page.tsx`, `src/components/library-list.tsx`, `src/components/mobile-library-filters.tsx` | Library/topic tests and integrated browser QA | Browser mobile only | Android authenticated route validated | Read/select scoped Ask | Yes |
| MobileShareCapture | `/capture/share-result` plus Android share intent | Public result route plus bearer/native token for API | `src/components/share-handler.tsx`, `src/app/capture/share-result/*`, `src/lib/android-share/result.ts` | `src/lib/android-share/result.test.ts`, `src/proxy.test.ts` | Browser mobile result QA | Android native entry path validated | Capture mutation | Yes for native share claim |
| MobileCapture | `/capture` and capture APIs | Session/bearer | `src/app/capture/*`, `src/app/api/capture/*` | Capture API tests | Browser web QA | Android authenticated route validated | Capture mutation | Yes |
| MobileRepair | `/items/[id]/repair` | Session | `src/app/items/[id]/repair/*`, `src/lib/repair/*` | Repair tests | Browser web QA | Android authenticated route validated | Item content mutation | Yes |
| MobileNeedsUpgrade | `/needs-upgrade` | Session | `src/app/needs-upgrade/page.tsx`, `src/db/items.ts` | Items/tests plus browser QA | Browser web QA | Android authenticated route validated | Read/repair navigation | Yes |
| MobileAsk | `/ask`, `/items/[id]/ask` | Session | `src/app/ask/*`, `src/components/ask-input.tsx`, `src/lib/ask/*` | Ask tests | Browser web QA, provider-down proof | Android authenticated route validated plus live provider check before release | Ask API read | Yes |
| MobileItemDetail | `/items/[id]` | Session | `src/app/items/[id]/page.tsx` | Item/db tests | Browser web QA | Android authenticated route validated | Conditional tag/collection mutation | Yes |
| MobileMore | `/more`, `/settings`, `/settings/device-pairing` | Session/public for setup pieces | `src/app/more/page.tsx`, `src/app/settings/*` | Proxy/provider/export/token tests | Browser web QA | Android authenticated route validated | Settings actions/export/token | Yes |
| MobileOffline | `/offline.html`, offline fallback | Public/offline | `public/offline.html`, service worker/client registration | Proxy public path tests | Browser public asset/offline QA | Android unauthenticated route validated plus network recovery | None | Yes |
| MobileLogin | `/unlock`, `/setup`, `/setup-apk`, pairing exchange | Public/session | `src/app/unlock/*`, `src/app/setup/*`, `src/app/setup-apk`, `src/app/api/settings/device-pairing/*` | Proxy and pairing tests | Browser setup/unlock QA | Android unauthenticated route validated plus pairing token check | Pairing token | Yes |
| MobileTopic | `/topics/[slug]` | Session | `src/app/topics/[slug]/page.tsx`, `src/db/topics.ts` | Topic tests | Browser web QA | Android authenticated route validated | Read/scoped Ask; mutation hidden unless tested | Yes |
| MobileCollection | `/collections/[id]` | Session | `src/app/collections/[id]/page.tsx`, `src/db/topics.ts` | Collection/topic tests | Browser web QA | Android authenticated route validated | Read/scoped Ask; mutation hidden unless tested | Yes |

## Privacy And Redaction

- Do not put raw URLs, private titles, note bodies, PDF names, tokens, cookies, or pairing codes in screenshots intended for sharing.
- Browser/APK logs must redact bearer tokens, session identifiers, cookies, and signed URLs.
- Share-result route must keep payloads in sessionStorage behind opaque keys; no private payload in query strings.
- Production mutation smoke must use local fixtures by default; production temporary data requires cleanup proof.

## Release Blockers

| Gate | Required before release |
| --- | --- |
| Static gates | `git diff --check`, typecheck, lint, tests, build |
| Android runtime gates | Authenticated APK evidence for changed protected screens |
| Native entry gates | Android share URL/note/PDF/error states validated on APK/device |
| Accessibility | Keyboard, touch target, zoom, and Android TalkBack or accepted fallback |
| Backup/rollback | Predeploy SQLite backup, integrity check, restore command |
| Production deploy | Deploy command result, live smoke, observability |
| APK publication | Explicit approval, version bump, signing/channel, checksum, install/upgrade, rollback artifact |

## Next Slice Recommendation

Proceed to Android A1: shell, safe areas, bottom nav, Library, More, and Offline truth cleanup. A1 must use this A0 truth package and still run its own PRD/review/plan/review cycle before coding.
