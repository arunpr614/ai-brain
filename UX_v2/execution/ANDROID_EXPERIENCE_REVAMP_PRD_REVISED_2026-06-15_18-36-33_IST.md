# **AI Memory Android Experience Revamp PRD**

**Team:** AI Memory, Android/WebView UX
**Author (PM):** Arun / Codex revised draft
**Triad Partners (Design, Engineering):** Magic Patterns design reference, Codex implementation, Arun product owner
**Legal Contact:** N/A - private single-user app. Re-review required before distribution, telemetry, encryption, account expansion, or third-party publication.
**Applicable Countries:** N/A - private personal app
**Market Segments:** N/A - private personal app

**Date last edited:** 2026-06-15 18:36:33 IST
**Doc Status:** Revised execution PRD. This file supersedes the prior Android PRD and closes the adversarial review findings. Arun's acceptance or use of this PRD as the execution source approves the decision table below.
**Related Links:**
- Magic Patterns mobile design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Magic Patterns active artifact checked on 2026-06-15: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`, `isGenerating=false`
- Prior PRD: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_2026-06-15_17-55-53_IST.md`
- PRD adversarial review: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_ADVERSARIAL_REVIEW_2026-06-15_18-16-26_IST.md`
- Revised implementation plan: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- Button contrast plan: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`
- Production release report: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md`
- Open decisions packet superseded where this PRD makes explicit revised Android revamp decisions: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`

---

# **Overview**

## **Context & Insights**

- AI Memory already ships an Android APK as a Capacitor WebView that loads `https://brain.arunp.in`.
- The previous UX v2 release proved the Android shell can load deployed assets, pair, persist token state, accept Android share capture, show offline fallback, and relaunch.
- The Android experience is still not a complete Magic Patterns mobile experience. Several protected routes were validated only as responsive browser views, and share/result flows still rely on alert-only outcomes in important states.
- The Magic Patterns mobile design gives the target visual and interaction direction across Library, Share Capture, Repair, Item Detail, Offline, Ask, Capture, More, Login, Needs Upgrade, Topic, and Collection.
- Magic Patterns is not production truth. It includes prototype-only behavior that must be adapted or excluded: QR pairing, offline item reads, offline sync, fake account data, `AI Brain` wording, fake synced states, telemetry controls, E2EE claims, biometric unlock, package migration, and unimplemented mutation actions.
- This PRD is the product source. The revised implementation plan remains the execution source. If they conflict, use this PRD for product decisions and the revised implementation plan for sequencing and safety mechanics.

## **Problem Statement**

AI Memory's Android app works as a deployed WebView, but the mobile UX still feels partly like responsive desktop web. Critical Android surfaces need native-quality mobile layout, durable share-result states, truthful offline/pairing/session handling, consistent bottom navigation, and APK-backed validation.

This project completes the Android/WebView experience revamp for the approved in-scope Magic Patterns mobile screens. Completion means implemented or production-truth adapted screens have shipped and passed the required validation. Deferred decision-gated behavior does not count as completion.

## **Adversarial Review Closure**

| Review finding | PRD resolution |
| --- | --- |
| PRD did not authorize the complete revamp | Adds a D-001 through D-014 decision table with explicit implementation/deferral/exclusion rules. |
| Deferrals could count as completion | Splits revamp completion from decision hygiene. Deferred rows are excluded from completion and release claims. |
| Screen acceptance was too generic | Adds a screen-by-screen acceptance matrix for all Magic Patterns mobile screens. |
| Share capture was under-specified | Adds a normative Android share result state/action contract. |
| Privacy/evidence handling was too loose | Adds storage, expiry, redaction, logging, and screenshot evidence rules. |
| APK channel was undecided | Adds an APK channel decision table with web-only default and no unsafe APK publication. |
| Magic Patterns staleness was not a PRD gate | Adds a staleness gate before coding and before release. |
| Android validation lacked fallback rules | Adds evidence levels and fallback handling when WebView automation fails. |
| Source PRDs were outside the worktree | Requires a source PRD snapshot/import manifest before coding. |
| D-006 route policy was contradictory | Resolves D-006 in favor of the Magic Patterns/current-code route policy. |
| Contrast gate needed to block redesign | Makes contrast repair the first mandatory implementation gate. |
| PRD template/launch-tier noise | Removes "Global PRD" framing and makes launch tier informational only. |

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Ship a coherent Android/WebView experience across every approved in-scope Magic Patterns mobile screen.
2. Make the Android app feel mobile-native while preserving truthful AI Memory behavior.
3. Eliminate critical dark-mode action and selected-control contrast failures before broader redesign work.
4. Replace Android share alert-only outcomes with durable, deterministic result states.
5. Validate changed Android behavior inside the APK, not only in browser mobile screenshots.
6. Keep release, rollback, cache recovery, APK channel, and private-data evidence safe.

## **Success Metrics**

### **Primary Metric**

- 100% of approved in-scope Magic Patterns mobile screens in the Screen Acceptance Matrix are implemented or production-truth adapted and validated at their required Android evidence level.

### **Supporting Metrics**

- 0 deferred or blocked D-decision rows counted as revamp completion.
- 100% of deferred/excluded D-decision rows are absent, hidden, disabled, or truthfully labeled in shipped UI.
- 0 P0/P1 release blockers before deploy.
- 0 critical contrast failures for primary actions, selected controls, or critical navigation in light and dark themes.
- 100% of Android share result states in this PRD have deterministic success/failure handling without alert-only outcomes.
- 100% of changed protected screens have authenticated APK evidence, or the final report does not claim Android-complete status for those screens.
- 100% of release evidence follows token/content redaction rules.
- Magic Patterns artifact status, active artifact ID, and file list are rechecked before coding and again before release.
- Live post-deploy smoke passes for web routes, Android WebView asset pickup, share, pairing/session, offline fallback, relaunch, and stale-cache recovery.

## **Non-Goals**

- No native Android rewrite of all screens.
- No QR scanner in this revamp.
- No active offline queue, offline library, offline Ask, offline capture, offline sync, or offline item read mode.
- No package ID migration away from `com.arunprakash.brain`.
- No embedded YouTube player.
- No product analytics or telemetry.
- No Chrome extension redesign.
- No same-version APK overwrite.
- No fake Magic Patterns account data, fake user identity, fake synced state, fake offline state, fake deletion, fake privacy control, or fake provider health.

---

# **User Personas / Stakeholders**

## **Users**

- **Primary user: Arun, Android AI Memory user**
  - Needs fast capture, review, Ask, repair, and reading on Android.
  - Uses Android share sheet as a high-frequency capture path.
  - Needs clear save/failure/duplicate/partial-save feedback.
  - Needs truthful offline, pairing, session, and privacy states.

- **Secondary user: AI implementation agent**
  - Needs unambiguous product decisions, screen acceptance criteria, no-go gates, and validation labels.
  - Must execute without turning prototype-only Magic Patterns behavior into production claims.
  - Must update tracker, running log, evidence, release notes, and final summary.

- **Secondary stakeholder: Arun as product/release owner**
  - Needs to know exactly what shipped, what was validated, what was excluded, what remains deferred, APK status, and live URL.

---

# **Product Decision Authorization**

This table is the approval record for the Android revamp once Arun accepts or uses this PRD as the execution source. Deferred rows are not incomplete implementation work; they are excluded from this revamp's completion metric and must not appear as shipped capability.

| ID | Decision | Status for this Android revamp | Product rule | Completion rule |
| --- | --- | --- | --- | --- |
| D-001 | Ask attached context, paste-link, write-note attachment behavior | Approved deferral and excluded | Implement the mobile Ask composer and supported saved-item/scoped Ask behavior only. Hide or disable paste-link/write-note attachment actions unless already supported without new persistence semantics. | Does not count toward completion. |
| D-002 | High-quality-only Ask control | Approved deferral and excluded | Do not change retrieval inclusion semantics. Show source-quality context only where truthful. | Does not count toward completion. |
| D-003 | Scope-history persistence semantics | Approved deferral and excluded | Do not add schema or persisted snapshot/history semantics. Existing approved history can remain. | Does not count toward completion. |
| D-004 | Mark-good-enough for weak sources | Approved deferral and excluded | Do not let users dismiss weak items from Needs Upgrade without real state semantics and audit trail. Hide this action. | Does not count toward completion. |
| D-005 | Android item detail tabs | Approved implementation, WebView only | Implement mobile WebView item detail tabs using existing data: Original, Digest, Ask, Related, Details. No native rewrite and no new mutation semantics. | Counts toward Item Detail completion. |
| D-006 | Raised Capture behavior on More and non-Ask/non-Capture routes | Approved implementation | Use the Magic Patterns/current-code route policy: standard Capture tab on `/ask` and `/capture`; raised Capture on Library, More, item, topic, collection, search, and Needs Upgrade surfaces unless overlap testing fails. Update old docs that said D-006 was deferred. | Counts toward shell/nav completion. |
| D-007 | Active offline controls, offline reads, offline Ask, offline capture, offline sync | Approved deferral and excluded | Offline UI must say the server is required. No offline item list/read claims unless a separate storage/sync project is approved. | Does not count toward completion. |
| D-008 | QR pairing | Approved deferral and excluded | Code-entry pairing only. Hide QR scan buttons and QR promises. | Does not count toward completion. |
| D-009 | Transcript operator visibility | Out of Android revamp scope | No user-facing Android implementation. | Excluded. |
| D-010 | Transcript fallback strategy | Out of Android revamp scope | No provider fallback promise or UI. | Excluded. |
| D-011 | Product analytics or telemetry | Approved deferral and excluded | Do not add analytics. Disabled roadmap privacy controls may appear only as clearly noninteractive and not active. | Does not count toward completion. |
| D-012 | Chrome extension redesign | Out of Android revamp scope | No extension work. | Excluded. |
| D-013 | Android package ID migration | Approved deferral and excluded | Keep `com.arunprakash.brain`. No package rename, migration, or same-version overwrite. | Does not count toward completion. |
| D-014 | YouTube embedded player/media | Partial approval | Implement only non-embedded metadata, thumbnail, and trust treatment if backed by existing data. Embedded player remains deferred. | Metadata/trust treatment may count toward Item Detail; embedded player does not. |

---

# **Requirements**

- **User Stories:** How users interact with the capability.
- **Requirements:** The capability that must exist, along with behavioral conditions that define correct behavior and when the work is done.
- **Mock ups & Prototypes (Magic Patterns, v0):** Magic Patterns is a visual and interaction reference, not production-ready code.

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | As Arun, I want the Android app to follow Magic Patterns mobile design without lying about unsupported features, so that the app feels polished and trustworthy. | Before coding, re-check Magic Patterns status/artifact/file list, snapshot source PRDs, and create the design truth matrix. Every visible prototype element must be classified as implement, adapt, hide, disable, excluded, or blocked. | Magic Patterns artifact; source PRD snapshot; revised implementation plan Phase -1. | All Magic Patterns mobile files. |
| P0 | As Arun, I want unreadable dark-mode buttons fixed first, so that the app is usable before broader redesign work. | Add semantic primary-action tokens and selected-control tokens. Migrate primary buttons and selected controls away from invalid dark-mode `accent` token pairings. No mobile parity phase begins until this passes. | Button contrast plan; `src/styles/tokens.css`; affected app/components. | Button and filter visual intent from Magic Patterns; Library screenshot. |
| P0 | As Arun, I want a consistent Android shell and bottom nav, so that navigation is predictable. | Implement approved D-006 route policy. Use MobileFrame only for safe-area/spacing intent. Never copy fake phone chrome. Bottom nav must not overlap critical actions. | `src/components/sidebar.tsx`; route tests; screenshots. | `components/MobileBottomNav.tsx`; `components/MobileFrame.tsx` spacing only. |
| P0 | As Arun, I want Library to match the mobile design, so that browsing, filtering, selecting, and asking are comfortable on Android. | Implement mobile hierarchy, search, filter sheet, compact rows, quality badges, Needs Upgrade entry, explicit selection, selected count, cancel, and Ask selected. Hide offline filter unless truthful. | Library data/routes; Ask selected cap. | `pages/MobileLibrary.tsx`; Drawer, Checkbox, Badge, Input. |
| P0 | As Arun, I want Android share capture to show durable result states, so that I know exactly what happened after sharing. | Implement the share result state/action contract in this PRD. Replace alert-only outcomes. Use safe sessionStorage payloads and opaque route keys. | `src/components/share-handler.tsx`; capture APIs; Android share intent validation. | `pages/MobileShareCapture.tsx`. |
| P0 | As Arun, I want Capture, Repair, and Needs Upgrade to be coherent on Android, so that weak captures are easy to fix. | Align visuals to Magic Patterns while using real capture and repair flows. Hide mark-good-enough. Show full/limited/duplicate/update/failure/needs-repair states truthfully. | Capture/repair APIs; D-004 deferral. | `pages/MobileCapture.tsx`; `pages/MobileRepair.tsx`; `pages/MobileNeedsUpgrade.tsx`. |
| P0 | As Arun, I want More, Settings, Offline, and provider status to be truthful, so that prototype roadmap ideas do not look active. | Replace fake account data with real device/server/app status. Use AI Memory naming and real version. Add Pair Device, Needs Upgrade, optional real provider health, and disabled roadmap controls only if clearly noninteractive. Offline must say server required. | Service worker/cache; optional provider health endpoint. | `pages/MobileMore.tsx`; `pages/MobileOffline.tsx`. |
| P0 | As Arun, I want login, unlock, pairing, setup, and session states to feel mobile-native while staying accurate. | Align visual design to Magic Patterns. Use AI Memory copy. Support first-time setup, unlock needed, session expired, code-entry pairing, expired code, token accepted/rejected, server unreachable, and offline before pairing. Hide QR, biometric, sync, and package migration claims. | Pairing/session APIs; Capacitor Preferences; D-008/D-013 deferrals. | `pages/MobileLogin.tsx`. |
| P0 | As Arun, I want Android validation to prove the actual APK experience. | Validate changed protected routes in APK with real session. Use exact evidence labels from this PRD. If automation fails, follow manual fallback or block Android-complete claims. | Android emulator or physical device; pairing/session path; WebView/manual tooling. | N/A |
| P0 | As Arun, I want safe deploy and rollback. | Before deploy, run tests/build, create SQLite backup, document rollback source, smoke live routes, verify Android WebView asset pickup, test stale-cache recovery, and document client-state recovery. | `scripts/deploy.sh`; backup path; service worker/cache; Android validation. | N/A |
| P1 | As Arun, I want Item Detail to feel designed for mobile. | Implement WebView mobile tabs approved by D-005 using existing data. Preserve focus mode. Show tags/topics/collections and related items truthfully. No untested mutation controls. No embedded player. | Item detail route; D-005 approval; D-014 partial approval. | `pages/MobileItemDetail.tsx`; Tabs. |
| P1 | As Arun, I want Ask on Android to use the mobile composer pattern. | Implement mobile-safe composer, scope banner, input, send icon, empty-send nudges, citations, keyboard-safe layout, and supported history. Hide unsupported attachment semantics. | Ask API/retrieval; D-001/D-002/D-003 deferrals. | `pages/MobileAsk.tsx`; Drawer, Input. |
| P1 | As Arun, I want Topic and Collection screens to match the mobile design. | Align read-only/mobile layouts, scoped Ask entry points, item rows, search, empty states, and badges. Hide create tag/add items sheets unless production mutation support exists and is tested. | Topic/collection routes and data. | `pages/MobileTopic.tsx`; `pages/MobileCollection.tsx`. |
| P1 | As Arun, I want Android keyboard, TalkBack, bottom-sheet, and gesture behavior to be usable. | Meet measurable accessibility criteria: 4.5:1 text contrast, 3:1 control boundary contrast, 44px tap targets, labels on icon buttons, visible focus, sheet close/back behavior, and keyboard-safe Ask/search/pairing/filter/repair flows. | Accessibility QA; emulator/physical device. | All Magic Patterns mobile screens. |
| P1 | As Arun, I want client-side state to survive or recover cleanly. | Document Capacitor Preferences, session cookies, service worker cache, sessionStorage result payload, localStorage UI keys, recovery steps, force stop/relaunch, data-clear fallback, and token preservation/recovery. | Client storage and service worker/cache behavior. | N/A |
| P2 | As Arun, I want direct Android VIEW intents for setup to behave predictably. | Fix `/setup-apk` VIEW intent only if native manifest scope is explicitly opened. Otherwise document as deferred and do not claim it works. | AndroidManifest intent filters; APK build/validation. | Login/setup states. |
| P2 | As Arun, I want APK release status to be unambiguous. | Use the APK channel decision table in this PRD. Default revamp channel is web-only Android WebView asset release. Do not publish a user-installable APK unless versioning/signing/checksum/install/rollback gates pass. | `android/app/build.gradle`; build scripts; artifact storage. | N/A |
| P3 | As Arun, I want visual evidence that catches regressions. | Capture screen/state matrix with route, auth state, fixture, device/viewport, theme, expected visible/absent text, screenshot path, and pass/fail notes. | Browser automation; Android screenshots; redaction rules. | All Magic Patterns screens. |
| P4 | As Arun, I want future QR/offline/analytics/media work captured without accidental shipment. | Keep deferred roadmap items documented with product decision, data safety, UX, and validation requirements. Do not code them in this revamp. | D-007, D-008, D-011, D-014 follow-ups. | Relevant prototype states. |

## **Screen Acceptance Matrix**

| Surface | Magic Patterns reference | Must ship in this revamp | Required adaptations and forbidden content | Required evidence |
| --- | --- | --- | --- | --- |
| Mobile shell and bottom nav | `components/MobileBottomNav.tsx`, `components/MobileFrame.tsx` | Bottom nav, approved D-006 route policy, safe-area clearance, no overlap with critical actions. | Do not copy fake phone frame, status bar, battery, signal, or gesture pill. Use MobileFrame only for spacing intent. | APK screenshots for Library, Ask, Capture, More, Item Detail, Topic, Collection, Needs Upgrade, Focus. |
| Library | `pages/MobileLibrary.tsx` | Mobile header, search, filter sheet, compact rows, quality badges, Needs Upgrade entry, select controls, selected count, cancel, Ask selected. | Hide offline filter unless real offline item availability exists. No fake source data. | Authenticated APK evidence plus screenshots for default, search, filtered, selected, empty, dark mode. |
| Share Capture | `pages/MobileShareCapture.tsx` | Durable result route/sheet for URL, note, PDF, duplicate/update, limited/full save, missing token, unsupported share, failures, expired result. | No hardcoded source/title. No alert-only production result path. No sensitive payload in query string. Multi-PDF policy is reject with explanation. | Android native share evidence for URL, note, PDF, missing token, unsupported share, server unreachable, PDF read/checksum/upload failures, duplicate/update. |
| Capture | `pages/MobileCapture.tsx` | Mobile URL/note/PDF capture visuals, validation, loading, saved full, saved limited, duplicate, updated existing, failed not saved. | No fake save/sync state. No unsupported capture type. | Authenticated APK evidence plus browser mobile screenshots for success/error/weak states. |
| Repair | `pages/MobileRepair.tsx` | Add text/transcript repair flow, weak-item explanation, validation errors, success state. | Hide mark-good-enough. No fake repair success. | Authenticated APK or manual device evidence for weak item, validation error, success. |
| Needs Upgrade | `pages/MobileNeedsUpgrade.tsx` | Queue, weak-source explanation, repair entry, empty state. | Hide mark-good-enough. No dismissal without quality change. | Authenticated APK evidence for queue and empty state. |
| Ask | `pages/MobileAsk.tsx` | Mobile composer, scope banner, text input, send icon, citations, supported history, empty-send nudge, keyboard-safe layout. | Hide/disable paste-link/write-note attachment semantics. No high-quality-only toggle. No unsupported persisted scope-history claim. | Authenticated APK evidence plus keyboard-open evidence for empty, scoped, answer with citations, error. |
| Item Detail | `pages/MobileItemDetail.tsx` | Mobile WebView tabs: Original, Digest, Ask, Related, Details; focus mode; repair affordance; related items; metadata. | No embedded YouTube player. No untested tag/collection mutation. Metadata/thumbnail only if backed by real data. | Authenticated APK evidence for full item, weak item, no-related item, focus mode, tabs. |
| More and Settings | `pages/MobileMore.tsx` | Mobile settings surface with Pair Device, Needs Upgrade, appearance/settings rows, real app version, real device/server/app status, optional real provider health. | No fake account name/email. No `AI Brain`. No active offline sync, telemetry, crash-report, E2EE, delete-all-data, or connected-device controls unless real. Disabled roadmap controls must be visibly noninteractive. | APK evidence for More, privacy roadmap view if included, copy scan for forbidden claims. |
| Offline | `pages/MobileOffline.tsx` | Server-required/offline fallback with retry/reload path and clear disabled state for Ask/capture. | No offline item list/read claims. No "available offline" count. No "your Brain" copy. | APK evidence with network unavailable/server stopped plus recovery after online relaunch. |
| Login, Unlock, Setup, Pairing, Session | `pages/MobileLogin.tsx` | AI Memory-branded unlock/setup/session-expired/pairing states, code-entry pairing, expired/rejected/accepted token, server unreachable, offline before pairing. | Hide QR scan, biometric unlock, sync copy, package migration, "AI Brain"/"Brain" branding. | APK unauthenticated route evidence, pairing success/rejection, token persistence with redacted evidence. |
| Topic | `pages/MobileTopic.tsx` | Read-only mobile topic layout, scoped Ask entry, item rows, search/filter if supported, empty state. | Topics are derived. Hide create-tag or mutation sheets unless real and tested. | Authenticated APK evidence plus browser mobile fallback only if APK cannot access route and final claim is downgraded. |
| Collection | `pages/MobileCollection.tsx` | Mobile collection layout, scoped Ask, item rows, empty state, search/filter if supported. | Hide add-items/mutation sheets unless real and tested. | Authenticated APK evidence plus browser mobile fallback only if APK cannot access route and final claim is downgraded. |

---

# **Milestones / Sequencing Plan**

Launch tier is informational only. This is a private single-user product, so GTM tier does not reduce release gates. Treat the work as Tier 4 for public/customer GTM and Tier 3-equivalent engineering complexity for validation rigor.

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **M0 - Source Freeze And Decision Lock** | Magic Patterns status recheck, source PRD snapshot, D-decision table acceptance, screen acceptance matrix, current-state screenshot matrix. | N | N/A private app | TBD | N/A |
| **M1 - Contrast And Shell Gate** | Button/selected-control contrast repair, D-006 route policy implementation, safe-area/bottom-nav baseline. | N | N/A private app | TBD | N/A |
| **M2 - Core Browsing And Status Surfaces** | Library, filters/select mode, More/settings truth cleanup, Offline server-required fallback. | N | N/A private app | TBD | N/A |
| **M3 - Share, Capture, Repair, Needs Upgrade** | Android share-result state machine, Capture result states, Repair, Needs Upgrade. | N | N/A private app | TBD | N/A |
| **M4 - Ask, Item Detail, Topic, Collection** | Mobile Ask composer within approved scope, WebView item tabs, Topic and Collection mobile parity. | N | N/A private app | TBD | N/A |
| **M5 - Login, Pairing, Session, Client State** | Login/unlock/setup/session states, code-entry pairing, client state recovery, cache refresh path. | N | N/A private app | TBD | N/A |
| **M6 - Release Candidate And Deploy** | Full QA, backup, rollback, web deploy, post-deploy smoke, Android WebView asset pickup, APK evidence, final release notes. | N | N/A private app | TBD | N/A |

---

# **Additional Components & Resources**

The sections below are included because this revamp touches auth/session states, client storage, WebView caches, APK artifacts, Android share intents, private saved content, and QA evidence.

---

## **Legal: Risk Checklist**

This is a private single-user app, not a commercial Toast launch. The checklist is used as a product-risk guardrail.

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | No payment/card flows. | N |
| **Card Linking** | No payment/card flows. | N |
| **Loyalty Program** | No loyalty flows. | N |
| **Guest Checkout** | No checkout flows. | N |
| **Toast User Auth** | N/A. App uses its own PIN/session and Android pairing token behavior. | N |
| **Marketing/Ads** | No marketing or ads. | N |
| **Built-in consent mechanism** | Not in scope. If telemetry/privacy controls are added later, review consent and retention. | N |
| **Guest Book feed-in functionality** | No CRM or guest book. | N |
| **Digital Receipts** | No receipts. | N |
| **Feedback Loop to Merchant** | No merchant feedback. | N |
| **Feedback Loop to Toast** | No Toast feedback. | N |

---

## **Legal: Personal Data Processed**

This revamp must not introduce new categories of personal data. It changes Android presentation and flow handling for existing AI Memory data. Any new logging, analytics, offline storage, QR scanner, account feature, or external distribution requires separate review.

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| Saved item title/source metadata | Existing app behavior; voluntary through capture/share | SQLite on AI Memory server | Persistent |
| Saved note/body/PDF extracted text | Existing app behavior; voluntary through capture/share/repair | SQLite/artifacts on AI Memory server | Persistent |
| Android pairing token | Existing app behavior; required for Android share capture | Capacitor Preferences on device | Persistent until unpaired/cleared |
| Session cookie/PIN session state | Existing app behavior; required for authenticated web routes | Browser/WebView cookie/session storage | Temporary/persistent per current auth behavior |
| Android share result display payload | New UI surface; generated from capture outcome | WebView `sessionStorage` | Temporary; max 30-minute expiry |
| Client/server error logs | Existing or extended observability; redacted error codes only | Server logs/client error endpoint | Temporary or retained per existing log policy |
| APK screenshots/log evidence | QA artifact; may contain private item titles if not controlled | Local evidence folder only | Temporary/project artifact; redact before sharing |

## **Privacy And Evidence Handling**

- Do not put full titles, URLs, note text, PDF names, tokens, cookies, raw errors, or sensitive payloads in query strings.
- Share-result routes must use an opaque result key and safe sessionStorage payload.
- Share-result sessionStorage payload expires within 30 minutes and falls back to `expired_result`.
- Client/server logs must use stable error codes and redact tokens, cookies, session identifiers, signed URLs, and file names.
- Screenshots and videos are local/private evidence by default.
- Before any screenshot or log is shared outside Arun's local workspace, redact private item titles, URLs, notes, PDF names, tokens, cookies, and pairing/session details.
- Final release notes may reference evidence paths, but must not quote private saved content.
- If evidence cannot be safely redacted, record pass/fail and keep the artifact local.

---

## **Ideal User Experience**

### **User Flows**

1. **Launch and unlock**
   - User opens Android APK.
   - App shows AI Memory-branded unlock/setup state.
   - Existing session lands on Library.
   - Missing/expired session shows mobile unlock or setup.
   - Pairing uses code-entry only.
   - Server unreachable shows truthful server-required copy.

2. **Browse Library**
   - User lands in mobile Library.
   - User searches, filters, checks quality badges, opens Needs Upgrade, and selects items.
   - Selected mode has visible controls, count, cancel, and Ask selected.
   - Bottom nav remains visible and does not cover actions.

3. **Ask**
   - User opens Ask from nav or scoped entry point.
   - Composer remains usable with Android keyboard open.
   - Scope and source quality are clear.
   - Unsupported attachment flows are hidden or disabled.
   - Citations and supported history are clear.

4. **Capture in app**
   - User captures URL, note/text, or PDF through supported flows.
   - Result state is visible and mobile-friendly.
   - Weak or limited captures point to repair/add text.

5. **Share from Android**
   - User shares URL/text/PDF into AI Memory from Android share sheet.
   - App shows a durable result sheet/route.
   - User can open item, open existing item, add text, ask, retry, pair device, or finish depending on state.
   - Failures are explicit and never imply save.

6. **Read item and repair**
   - User opens Item Detail.
   - Mobile tabs organize Original, Digest, Ask, Related, and Details.
   - Focus mode removes shell chrome.
   - Weak items show repair path.
   - Tags/topics/collections are visible only where production truth supports them.

7. **Use More and Offline**
   - User opens More for status, pairing, version, provider health if real, and privacy roadmap if clearly disabled.
   - Offline copy says the server is required and does not imply offline library/Ask/capture.

8. **Recover after deploy or stale asset**
   - User can relaunch or use refresh/reload path if implemented.
   - Pairing token is preserved or recovery is documented.
   - Android WebView picks up deployed assets after release.

### **Wireframes / Mockups (Optional)**

- Magic Patterns mobile design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Active artifact at PRD revision: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
- Required screen references:
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

---

## **Technical Considerations**

## **Source Authority Order**

When sources conflict, use this order:

1. This revised PRD's product decisions and hard gates.
2. Revised Android implementation plan for sequencing and execution mechanics.
3. Approved UX v2 final plan and source PRD snapshot.
4. Magic Patterns artifact for visual layout, hierarchy, gestures, spacing, and component intent.
5. Current production code and deployed Android WebView behavior.
6. Prior release reports and open-decision packets.

## **Source Freeze And Staleness Gate**

Before coding and again before release:

- Re-check Magic Patterns `isGenerating`, active artifact ID, and file list.
- If active artifact changed, refresh the screen acceptance matrix and design truth matrix before implementation continues.
- Snapshot required source PRDs into `UX_v2/execution/source-prds/<timestamp>/`.
- Create a source manifest with original path, copied path, file size, checksum, and read status.
- Create or update `ANDROID_REDESIGN_DESIGN_TRUTH_MATRIX_<timestamp>.md`.
- Create or update `ANDROID_REDESIGN_BASELINE_<timestamp>.md`.

## **Android Share Result Contract**

The share result contract is a product requirement, not just an implementation detail.

Allowed result states:

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
  | "expired_result";
```

Payload rules:

- Store only safe display fields in sessionStorage.
- Use an opaque result key in the URL.
- Do not store raw URL, full PDF name, note body, token, cookie, raw exception, or full private content in the route.
- Include `createdAt`, `expiresAt`, `sourceKind`, `retryable`, optional safe `itemId`, optional safe `existingItemId`, optional quality label, and stable `errorCode`.
- Missing/expired payload shows `expired_result` with Library and Capture actions.

Multi-PDF policy for this revamp:

- Reject multi-PDF shares with a clear `multi_pdf_rejected` state.
- Do not process first PDF silently.
- Do not process all PDFs without a separate storage/API/data plan.

| State | User-facing meaning | Required actions |
| --- | --- | --- |
| `processing` | AI Memory is handling the shared item. | Passive progress; Done only if safe. |
| `saved_full` | Saved with usable full text/content. | Open item, Ask, Done. |
| `saved_limited` | Saved but needs more text/transcript/context. | Add text, Open item, Done; Ask only if truthful. |
| `duplicate_existing` | This item already exists. | Open existing, Ask if eligible, Done. |
| `updated_existing` | Existing item was updated. | Open item, Add text if weak, Done. |
| `unsupported_share` | Shared content cannot be captured. | Capture manually, Done. |
| `missing_token` | Android app is not paired. | Pair device, Done. Do not imply save. |
| `server_unreachable` | Save could not reach server. | Retry, Done. Do not imply save. |
| `pdf_missing_uri` | Android did not provide a usable PDF file URI. | Retry, Done. |
| `pdf_read_failed` | PDF could not be read from Android share. | Retry, Done. |
| `pdf_checksum_failed` | PDF upload integrity check failed. | Retry, Done. |
| `pdf_upload_failed` | PDF upload failed. | Retry, Done. |
| `multi_pdf_rejected` | Multiple PDFs are not supported in this revamp. | Done, Capture one PDF. |
| `expired_result` | Result state is no longer available. | Library, Capture. |

## **Android Evidence Levels**

Use these exact labels in tracker, release notes, and final summary:

| Label | Meaning | Completion use |
| --- | --- | --- |
| Android shell loaded deployed assets | APK opens and renders deployed WebView shell. | Not enough for screen parity. |
| Android unauthenticated route validated | Unlock/setup/offline routes validated in APK. | Enough only for unauthenticated surfaces. |
| Android authenticated route validated | Protected route validated inside APK with real session. | Required for changed protected screens. |
| Android native entry path validated | Share intent, pairing/token, VIEW intent, install/upgrade validated. | Required for native Android claims. |
| Browser mobile only | Responsive browser evidence only. | Cannot claim Android parity. |

Fallback if automation fails:

- First fallback: physical device or emulator manual script with screenshots/video and `adb logcat`.
- Second fallback: browser mobile screenshot plus explicit `Browser mobile only` label.
- No final report may say "Android UX complete" for a changed protected route unless it has `Android authenticated route validated` evidence.
- Non-waivable changed protected routes: Library, Ask, Capture, Share Result after native share, Item Detail, Needs Upgrade, More, Topic, Collection.
- Non-waivable unauthenticated/native paths: Login/Unlock/Setup, Offline fallback, pairing/token persistence, Android share intent.

## **APK Channel Decision**

Default channel for this revamp is web-only Android WebView asset release. The existing APK loads the production URL, so UI revamp work should ship through web deploy unless native manifest/build changes are explicitly required.

| Channel | Status for this PRD | Requirements |
| --- | --- | --- |
| Web-only Android WebView asset release | Approved default | Deploy web assets, verify existing APK loads new assets, smoke stale-cache recovery, no APK publication claim. |
| Debug validation APK | Allowed only if needed for QA | Record artifact path, version, code, signing identity, checksum, install/reinstall result, and rollback/previous APK. Do not call this a published release. |
| User-installable APK publication | Blocked unless explicitly opened | Requires versionCode/versionName bump, signing/distribution decision, checksum, fresh install, upgrade install, rollback APK, install instructions, and Arun-facing release note. |

Current package/version baseline:

- Package: `com.arunprakash.brain`
- VersionName: `1.0.2`
- VersionCode: `3`
- App name: `AI Memory`
- WebView URL: `https://brain.arunp.in`

## **Contrast Gate**

This gate must pass before M2-M6 redesign work begins:

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

- Primary actions use action tokens, not the invalid dark-mode accent/on-accent pair.
- Selected controls use selected-control tokens, not bright raw `border-[var(--accent-9)]`.
- Library Capture button is readable in dark mode.
- Active filter pills have readable text and non-glaring selected border.
- Light and dark screenshots prove the fix on Library, Capture, Ask, Login, More, and Item Detail.

## **Storage, API, And Data Change Rules**

- No storage/API/data change without migration plan, backup/restore, rollback, test data validation, and failure notes.
- No offline storage, queue, or sync behavior in this revamp.
- No new analytics/event collection.
- No package ID migration.
- No destructive data controls.

---

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Prototype behavior copied literally | High | High | Use decision table and screen acceptance matrix before coding. Block QR/offline/sync/privacy claims unless approved. |
| Deferrals counted as completion | High | Medium | Completion metric counts only approved in-scope screens. Deferred rows are excluded. |
| Android parity overclaimed from browser screenshots | High | Medium | Use Android evidence labels. Block Android-complete claims without APK evidence. |
| Share result loses state or misreports failure as save | High | Medium | Implement required state/action contract, expiry handling, and native share validation. |
| Private evidence leaks saved content or tokens | High | Low | Redaction rules, local-only evidence default, stable error codes, no sensitive query strings. |
| Dark-mode controls remain unreadable | High | Medium | Contrast gate blocks broader redesign work and release. |
| More/Capture route policy remains inconsistent | Medium | Medium | D-006 is approved in this PRD; update code/docs/screenshots together. |
| Stale WebView assets after deploy | Medium | Medium | Test service worker/cache behavior and recovery path. |
| APK publication accidentally overwrites same version | High | Low | Web-only default. APK publication blocked unless version/signing/checksum/install/rollback gates pass. |
| Source PRDs missing from execution worktree | Medium | Medium | Snapshot source PRDs and manifest before coding. |

---

# **Agent Execution Contract**

The implementation agent must:

1. Treat this revised PRD as the product source and the revised implementation plan as the execution source.
2. Re-check Magic Patterns status and active artifact before coding.
3. Snapshot source PRDs into the execution worktree before coding.
4. Create the design truth matrix and baseline evidence before coding.
5. Implement only rows approved for this revamp.
6. Exclude deferred/blocked rows from completion metrics and release claims.
7. Fix the contrast gate before broader Android redesign work.
8. Maintain `UX_v2/execution/UX_V2_EXECUTION_TRACKER.md` and `/private/tmp/ai-brain-ux-v2-main-ready/RUNNING_LOG.md` after milestones, blockers, decisions, QA, deploy, and final result.
9. Run code review and fix P0/P1 before release.
10. Notify Arun before and after deploy. This is informational, not an approval wait, once gates pass.
11. Deploy only when every hard gate below passes.
12. Final summary must state shipped, validated, deferred, blocked, APK status, live URL, evidence paths, and next steps.

## **Release Gate**

No release if any of these are true:

- failing tests/build;
- unresolved P0/P1;
- missing backup or rollback source;
- broken primary action or selected-control contrast;
- Magic Patterns artifact status not freshly checked;
- missing source PRD snapshot/manifest;
- ambiguous D-decision status;
- deferred/blocked behavior visible as active shipped UI;
- unvalidated changed critical Android screen;
- Android UX complete claimed without authenticated APK evidence for changed protected routes;
- unknown data/client-state risk;
- missing deploy access;
- unsafe APK versioning;
- missing stale-cache recovery notes;
- unredacted token/content evidence in shared reports;
- QR/offline sync/biometric/E2EE/telemetry/media/player claim without approved implementation and validation.

## **Definition Of Done**

The Android revamp is done when:

- every approved in-scope screen in the Screen Acceptance Matrix is implemented or production-truth adapted;
- every deferred/excluded D-decision row is absent, disabled, or truthfully labeled and excluded from completion;
- contrast gate passes;
- Android share result state contract is implemented and validated;
- source PRD snapshot and Magic Patterns staleness checks are recorded;
- Android evidence labels are assigned honestly;
- tests/build/code review pass with no unresolved P0/P1;
- backup, rollback, deploy, stale-cache recovery, and live smoke are documented;
- Android WebView asset pickup is validated after deploy;
- final release notes state shipped, validated, deferred, blocked, APK status, live URL, evidence paths, and residual risk.
