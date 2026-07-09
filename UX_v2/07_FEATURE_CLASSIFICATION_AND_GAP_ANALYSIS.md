# AI Memory UX v2 Feature Classification And Gap Analysis

Created: 2026-06-14 07:40 IST
Status: Canonical planning inventory

## Classification Legend

- Existing: feature is present in the current worktree or historical production line, with enough source evidence to plan around it.
- Partial: some behavior exists, but required UX v2 states, platform parity, verification, or data handling remain.
- Missing: no working implementation found in source evidence.
- UX redesign only: behavior exists; remaining work is primarily visual/copy/layout/design-system alignment.
- Inferred from design: appears in prototype/design source, but production scope is not explicitly confirmed.
- Needs user decision: do not implement until Arun confirms scope, privacy posture, provider strategy, or product behavior.

## Codebase Verification

Snapshot reference: `trackers/source_snapshot_2026-06-14.md` records the branch, HEAD, dirty-worktree count, artifact counts, and line-level source citations used for this planning pass. Recreate that snapshot before implementation because the worktree is dirty.

Web codebase found:

- Path: `../src`
- Framework: Next.js 16, React 19, SQLite, API routes, server actions, service worker.
- Key areas: `src/app`, `src/components`, `src/db`, `src/lib`, `src/styles/tokens.css`.

Android codebase found:

- Path: `../android`
- Architecture: Capacitor Android shell loading the hosted web app configured by `../capacitor.config.ts`.
- Key resources: `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml`, launcher mipmaps, share-intent filters, `public/offline.html`, `src/components/share-handler.tsx`.
- Planning implication: most Android UX work is mobile-responsive web behavior plus Capacitor-specific share/offline/pairing flows, not a separate native UI stack.

## Master Feature Inventory

| ID | Feature | Web status | Android status | Classification | Evidence | Planning action |
| --- | --- | --- | --- | --- | --- | --- |
| BRAND-01 | Product name AI Memory | Present in many surfaces | Android label present | UX redesign only | `layout.tsx`, `strings.xml`, design docs | Keep brand audit in QA gate |
| BRAND-02 | Logo and app icons | Present | Launcher assets present | UX redesign only | `public/ai-memory-logo.png`, Android mipmaps | Verify in screenshots/APK |
| DS-01 | Prism Memory tokens | Present | Shared web tokens | UX redesign only | `src/styles/tokens.css`, design spec | Token audit in QA |
| WEB-01 | Collapsible desktop shell | Present | N/A | Existing | `src/components/sidebar.tsx` | Verify collapse evidence |
| MOB-01 | Bottom nav Library/Capture/Ask/More | Coded in mobile web | Coded via web shell | Partial | `src/components/sidebar.tsx`, handover says smoke incomplete | Finish PRD-11-SHELL verification |
| MOB-02 | Route-aware raised Capture | Coded | Coded via web shell | Partial | `src/components/sidebar.tsx` | Decide More route behavior, verify |
| AUTH-01 | Login/unlock/setup PIN | Existing older flows | Existing older flows | Partial | `src/app/setup`, `src/app/unlock`, design entry spec | PRD-15 |
| AUTH-02 | Pair device success/failure states | Existing route | Required | Partial | `src/app/settings/device-pairing`, Android setup | PRD-15 |
| AUTH-03 | Session expired state | Not clearly found | Not clearly found | Missing | Design spec, no direct source evidence | PRD-15 |
| OFFLINE-01 | Offline fallback | Present static page | Present via Capacitor fallback | Partial | `public/offline.html`, `public/sw.js` | PRD-14/15 verification |
| LIB-01 | Library browse and search | Present | Present via responsive web | Existing | `src/app/library/page.tsx`, `src/components/library-list.tsx` | QA evidence |
| LIB-02 | Source and quality filters | Present | Mobile bottom sheet present | Existing | `src/app/library/page.tsx`, `mobile-library-filters.tsx` | QA evidence |
| LIB-03 | Multi-select and Ask selected | Present | Selection controls present; long-press not verified | Partial | `library-list.tsx`, prototype long-press | PRD-11-FU |
| CAP-01 | URL/PDF/note capture | Present | Present via web and share APIs | Existing | `capture/page.tsx`, API routes | QA evidence |
| CAP-02 | Paste text capture mode | Partial via note/user text | Partial | Partial | Design requires paste text; UI has Note and URL note upgrade path | PRD-06-FU/PRD-10 |
| CAP-03 | Full/metadata/preview result states | Basic banner present | No share result surface | Partial | `CaptureResultBanner`, design capture spec | PRD-06-FU/PRD-13 |
| CAP-04 | Duplicate result state | Backend/API and form warning exist | Share routes to existing item | Partial | `capture/tabs.tsx`, API duplicate responses | PRD-06-FU |
| CAP-05 | Updated-existing result state | API supports upgraded action for weak URL | Not surfaced clearly | Partial | `/api/capture/url` returns `action: upgraded` | PRD-06-FU/PRD-10 |
| CAP-06 | Error-with-save result state | Not found | Not found | Missing | Design result states | PRD-06-FU |
| SHARE-01 | Android share intent capture | N/A | Existing | Partial | Android manifest, `share-handler.tsx` | PRD-13 |
| SHARE-02 | Android share landing/result/repair UI | N/A | Missing | Missing | Design `MobileShareCapture.tsx` | PRD-13 |
| NEEDS-01 | Needs Upgrade queue | Present | Reachable via More/bottom nav | Existing | `needs-upgrade/page.tsx`, `countNeedsUpgradeItems` | Add repair flow |
| REPAIR-01 | Add text/transcript repair | Backend partial | Backend partial | Partial | URL API upgrade path; no dedicated repair UI | PRD-10 |
| REPAIR-02 | Retry capture/mark good enough/delete/merge duplicate | Some links/delete exist | Some links exist | Partial | Needs Upgrade actions; no end-to-end repair flow | PRD-10 |
| REPAIR-03 | Derived-state reset after repair | Not proven | Not proven | Missing | `updateItemCaptureContent` updates item fields only | PRD-10 |
| ITEM-01 | Web item detail right rail | Present | Responsive web only | Existing web, partial Android | `items/[id]/page.tsx` | Android tabs decision |
| ITEM-02 | Android item detail tabs | N/A | Missing | Missing | Design `MobileItemDetail.tsx` | PRD-11-FU or new PRD |
| ITEM-03 | Focus/read mode | Present web | Present responsive, not Android-native | Partial | `items/[id]?mode=focus`, design says hide tabs/nav | PRD-11-FU/QA |
| ITEM-04 | YouTube item detail and video metadata treatment | Generic item detail present | Generic responsive detail present | Partial | YouTube capture metadata exists; design has item-youtube screenshots | Lightweight visual/content spec |
| TAX-01 | User tags | Present | Present via responsive web | Existing | `TagEditor`, `tags.ts` | QA |
| TAX-02 | Included Topics | Present | Present via responsive web | Existing | `topics.ts`, `topics/[slug]`, item rail | QA |
| TAX-03 | Topic detail and Ask topic | Present | Present via responsive web | Existing | `topics/[slug]`, `/ask?scope=topic` | QA |
| COLL-01 | Collections and Ask collection | Present | Present via responsive web | Existing | `collections/[id]`, `/ask?scope=collection` | QA |
| ASK-01 | Global/item/selected/tag/topic/collection scope | Present | Present via responsive web | Existing | `ask/page.tsx`, `retrieve`, `scope.ts` | QA |
| ASK-02 | Scope banner and weak-source warning | Present | Present but mobile layout not sheet-native | Existing web, partial Android | `ask-client.tsx` | PRD-12/QA |
| ASK-03 | Citation source quality metadata | Present | Present in shared component | Existing | `citation-chip.tsx`, API citations | QA |
| ASK-04 | Web history rail | Present, not independently collapsible | Mobile details disclosure | Partial | `AskHistoryPanel` | PRD-09-FU |
| ASK-05 | Android history bottom sheet | Not applicable | Missing | Missing | Design `MobileAsk.tsx` | PRD-12 |
| ASK-06 | Attached context override | Not implemented | Missing | Missing | Design/interaction spec | PRD-09-FU/PRD-12 |
| ASK-07 | High-quality-only scope | Token exists, behavior missing | Missing | Missing | `tokens.css`, design spec | PRD-09-FU |
| ASK-08 | Durable tag/topic/collection/attached history | Missing | Missing | Missing | `chat.ts` only library/item scopes | PRD-09-FU |
| SETTINGS-01 | Settings account/device/backup/provider/export | Present | More links to partial settings | Partial | `settings/page.tsx`, `more/page.tsx` | PRD-14 |
| PRIV-01 | Disabled privacy controls, no E2EE overclaim | Partial | Partial | Partial | `more/page.tsx` says not active; settings lacks full design treatment | PRD-14 |
| OFFLINE-02 | Offline/download/readable cache controls | Not proven | Not proven | Inferred from design | Design settings/offline | Needs user decision/PRD-14 |
| OPS-01 | Transcript operator visibility page | Missing | N/A | Needs user decision | v0.8.5 handover recommends page | Lightweight ops spec |
| OPS-02 | Transcript fallback strategy | Missing | N/A | Needs user decision | v0.8.5 handover says timed-text blocked | Research spec |
| QA-01 | Evidence checklist and release gates | Missing | Missing | Missing | No complete evidence package found | PRD-16 |
| ANALYTICS-01 | UX analytics/events | Not found | Not found | Needs user decision | User requested analytics/events if relevant | Track as decision |
| READ-01 | Continue reading / reading position | Not implemented | Not implemented | Needs user decision | Design package warns not to invent | Do not implement without decision |
| EXT-01 | Chrome extension capture parity | Existing URL-focused extension | N/A | Partial | `extension/src`, design mentions browser/extension representation | Lightweight follow-up unless Arun prioritizes |

## Priority Gaps

P0 for planning continuity:

- Finish PRD-11-SHELL verification and record evidence.
- Do not start code until one feature package is selected.

P1 product/trust gaps:

- PRD-06-FU capture result state completeness.
- PRD-09-FU attached context and high-quality-only Ask.
- PRD-10 weak-source repair with derived-state reset.
- PRD-12 Android unified Ask composer.
- PRD-13 Android share result flow.

P2 polish/trust gaps:

- PRD-11-FU long-press/select-mode and mobile item detail tabs.
- PRD-14 settings/privacy/offline trust states.
- PRD-15 login/pairing/session/offline entry states.
- YouTube item detail polish if visual parity review shows generic detail is insufficient.

P3 release readiness:

- PRD-16 QA evidence and release gates.
- OPS-01/OPS-02 decisions.
- Analytics/events decision.

## Assumptions

- AI Memory is the final product name for user-facing UI.
- Local frozen design package is sufficient for implementation planning.
- Exact Magic Patterns prototype source may contain legacy copy or simulated states; production behavior must follow the Markdown design docs and this package.
- Android UX implementation will mostly happen in shared Next.js/mobile web components unless Arun decides to build separate native Android screens.

## Required User Decisions

1. Should Android item detail tabs be included in PRD-11-FU, or become a separate PRD?
2. Should high-quality-only Ask be a visible user toggle, a scope chip, or an automatic option inside limited-source warnings?
3. Should attached context be persisted as real saved items, temporary conversation attachments, or both?
4. Is "mark good enough" allowed to remove an item from Needs Upgrade, or should it only suppress one warning type?
5. Should offline controls actually download readable content, or remain informational for UX v2?
6. Should transcript operator visibility be in this UX v2 roadmap, or handled as a separate ops/admin track?
7. Are product analytics/events desired for a private personal app, and if so where are they stored?
8. Should Chrome extension capture be redesigned in this UX v2 pass, or left as an integration follow-up?
