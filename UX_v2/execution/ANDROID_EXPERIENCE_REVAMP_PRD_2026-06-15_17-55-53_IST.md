# **AI Memory Android Experience Revamp Global PRD**

**Team:** AI Memory, Android/WebView UX
**Author (PM):** Arun / Codex draft
**Triad Partners (Design, Engineering):** Magic Patterns design reference, Codex implementation, Arun product owner
**Legal Contact:** N/A - personal single-user app; review required if distribution, telemetry, encryption, or account features expand
**Applicable Countries:** N/A - private personal app
**Market Segments:** N/A - private personal app

**Date last edited:** 2026-06-15 17:55:53 IST
**Doc Status:** Draft - intended to become the product source for Android revamp execution after Arun review
**Related Links:**
- Magic Patterns mobile design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Revised implementation plan: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- Adversarial review: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_17-17-48_IST.md`
- Production release report: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md`
- Open decisions packet: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`

---

# **Overview**

## **Context & Insights**

- AI Memory already ships an Android APK as a Capacitor WebView that loads the deployed web app from `https://brain.arunp.in`.
- The previous UX v2 release updated responsive web assets and validated Android shell launch, pairing/token persistence, share capture, offline fallback, and relaunch.
- The Android experience is not yet a complete Magic Patterns mobile experience. Several screens are responsive web adaptations, and authenticated protected Android routes were not fully validated inside the APK with a real session.
- The Magic Patterns mobile design provides a complete target experience across Library, Share Capture, Repair, Item Detail, Offline, Ask, Capture, More, Login, Needs Upgrade, Topic, and Collection.
- The Magic Patterns artifact includes prototype-only behavior that must not be copied literally: QR scanning, offline sync/read claims, fake account data, "AI Brain" wording, fake synced states, and unimplemented mutation actions.
- The product goal is a complete Android experience revamp that feels native-quality inside the WebView while staying honest about what the app actually supports.
- The implementation agent must treat this PRD plus the revised implementation plan as a product-and-execution pair: this PRD defines what good means; the plan defines how to execute safely.

## **Problem Statement**

AI Memory's Android app currently loads the deployed WebView, but the mobile UX is only partially aligned with the Magic Patterns Android design system and screen set. Users can launch, pair, share, and recover from offline/server-unreachable states, but critical screens still lack full mobile-specific polish, share-result surfaces, authenticated APK validation, route-policy consistency, and truthful adaptation of prototype-only design states.

This project revamps the Android experience across all Magic Patterns mobile screens while preserving product truth. The result should feel like one coherent Android app, not a desktop web app squeezed into a phone, and it must not claim QR, offline sync, telemetry controls, E2EE, biometric unlock, package migration, or native features that are not implemented and validated.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Ship a complete Android/WebView UX revamp across every active Magic Patterns mobile screen.
2. Turn the revised implementation plan into an executable product-backed scope for an AI implementation agent.
3. Preserve trust by adapting prototype design elements to real AI Memory behavior before coding.
4. Validate Android-specific behavior in the APK, not only in browser mobile screenshots.
5. Remove critical usability defects, especially dark-mode primary button and selected-control contrast issues.
6. Ensure every shipped Android state has clear rollback, cache-recovery, and validation evidence.

## **Success Metrics**

### **Primary Metric**

- 100% of active Magic Patterns mobile screens are either implemented in Android/WebView with production-truth adaptations or explicitly deferred with blocker, owner, and evidence.

### **Supporting Metrics**

- 0 P0/P1 release blockers before deploy.
- 0 critical dark-mode contrast failures for primary actions and selected controls.
- 100% of changed protected screens have authenticated APK evidence, or are not claimed Android-complete.
- 100% of Android share result states have deterministic success/failure handling without alert-only outcomes.
- 100% of D-001 through D-014 decision-gated items have an authorization status before coding.
- Live post-deploy smoke passes for web routes, Android WebView asset pickup, share, pairing, offline fallback, and relaunch.
- No stale user-facing `AI Brain`, fake account data, QR promise, offline sync promise, E2EE claim, telemetry-control claim, or fake synced state appears in shipped Android UI.

## **Non-Goals**

- No native Android rewrite of all screens unless separately approved.
- No QR scanner unless D-008 is explicitly approved and camera/scanner/device QA are implemented.
- No active offline queue, offline library, offline Ask, offline capture, or offline sync unless D-007 is approved with storage and rollback plan.
- No package ID migration away from `com.arunprakash.brain` unless D-013 is approved with migration plan.
- No embedded YouTube player unless D-014 is approved with privacy/copyright review.
- No product analytics or telemetry unless D-011 is approved with privacy copy and retention policy.
- No Chrome extension redesign in this Android PRD.
- No same-version APK overwrite.
- No fake Magic Patterns data, fake user identity, or prototype-only success states in production.

---

# **User Personas / Stakeholders**

*Define key user personas and stakeholders of your feature:*

## **Users**

- **Primary user: Arun, Android AI Memory user**
  - Needs a reliable mobile memory app for capture, review, Ask, repair, and reading.
  - Uses Android share sheet as a fast capture entry point.
  - Needs clear feedback when capture succeeds, fails, duplicates, or saves with limited quality.
  - Needs truthful offline/server-unreachable states so trust is not damaged.
  - Most important persona because this is a single-user private memory tool.

- **Secondary user: AI implementation agent**
  - Needs unambiguous scope, decision gates, design references, acceptance criteria, and no-go rules.
  - Must execute autonomously without silently turning prototype UI into false production behavior.
  - Must produce evidence, release notes, and rollback readiness.

- **Secondary stakeholder: Arun as product/release owner**
  - Needs confidence that Android claims are backed by APK evidence.
  - Needs to know what shipped, what was validated, what was deferred, and what still needs a decision.

---

# **Requirements**

- **User Stories:** How users interact with the capability.
- **Requirements:** The capability that must exist, along with behavioral conditions that define correct behavior and when the work is done.
- **Mock ups & Prototypes (Magic Patterns, v0):** Share initial look and feel to illustrate ideas clearly.

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | As Arun, I want the Android app to follow the Magic Patterns mobile design without lying about unsupported features, so that the app feels polished and trustworthy. | Create a design truth matrix before coding. For every Magic Patterns screen/state, classify visible elements as implement as-is, adapt copy, disable, hide, needs decision, or out of scope. No code begins until this is complete. | Revised implementation plan Phase -1; Magic Patterns artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7`; open decisions packet. | Magic Patterns mobile link; all mobile artifact files. |
| P0 | As Arun, I want every D-001 through D-014 decision to be explicit, so that the agent does not make silent product assumptions. | Create a decision authorization table with `approved implementation`, `approved deferral`, or `blocked`. Defaults can document deferral only; they cannot authorize implementation. | `UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`; revised implementation plan. | N/A |
| P0 | As Arun, I want primary actions and selected controls to be readable in Android dark mode, so that I can use the app without invisible buttons. | Fix shared action tokens and selected-control tokens. Migrate filled primary actions away from `bg-[var(--accent-9)] text-[var(--on-accent)]`. Migrate selected filter/pill states away from raw bright dark-mode accent borders. | Button contrast plan; `src/styles/tokens.css`; affected app/components. | Library screenshot with unusable Capture button; Magic Patterns Button/Filter visual direction. |
| P0 | As Arun, I want a consistent Android shell and bottom nav, so that app navigation is predictable across Library, Capture, Ask, More, and content screens. | Resolve the More/Capture route-policy contradiction. Implement the approved route policy. Do not copy fake `MobileFrame` phone chrome. Ensure bottom nav never overlaps critical actions. | `src/components/sidebar.tsx`; D-006 decision; Phase 0 route-policy reconciliation. | `components/MobileBottomNav.tsx`; `components/MobileFrame.tsx` spacing only. |
| P0 | As Arun, I want Library to match the Magic Patterns mobile Library flow, so that I can scan, filter, select, and ask about saved items comfortably on Android. | Implement mobile Library visual hierarchy, search, filter sheet, compact rows, quality badges, Needs Upgrade entry, explicit select controls, selected count, cancel, and Ask selected. Offline filter appears only if truthful. | Current `/library`, `library-list`, filters, Ask selected cap. | `pages/MobileLibrary.tsx`; `components/ui/Drawer.tsx`; `components/ui/Checkbox.tsx`. |
| P0 | As Arun, I want Android share capture to show a durable result surface, so that I know whether a shared URL, note, or PDF was saved, partially saved, duplicated, failed, or needs pairing. | Implement typed Android share result state machine. Replace alert-only outcomes. Support missing token, unsupported share, server unreachable, PDF read failure, checksum failure, duplicate, updated existing, saved limited, saved full, retry, pair device, open item, add text, Ask, and Done. | `src/components/share-handler.tsx`; capture APIs; sessionStorage safe payload; Android share intent validation. | `pages/MobileShareCapture.tsx`. |
| P0 | As Arun, I want Capture, Repair, and Needs Upgrade flows to be coherent on Android, so that weak captures can be fixed without desktop-style friction. | Align Capture, Repair, and Needs Upgrade visuals with Magic Patterns while using real production flows. Show supported result states only. Hide mark-good-enough unless D-004 is approved and implemented. | Capture APIs/actions; repair route; D-004 decision. | `pages/MobileCapture.tsx`; `pages/MobileRepair.tsx`; `pages/MobileNeedsUpgrade.tsx`. |
| P0 | As Arun, I want More, Settings, Offline, and provider status to be truthful, so that I never mistake roadmap ideas for working privacy/offline features. | Replace prototype account data with real device/server/app status. Use AI Memory naming and real version. Add Pair Device, Needs Upgrade, provider health if real, disabled roadmap privacy controls if clearly noninteractive, server-required offline copy, and asset refresh path if feasible. | PRD-14/15 copy rules; service-worker/cache behavior; provider health endpoint if available. | `pages/MobileMore.tsx`; `pages/MobileOffline.tsx`. |
| P0 | As Arun, I want login, unlock, setup, pairing, and session states to feel mobile-native while staying accurate, so that Android setup and recovery are clear. | Align visual design to Magic Patterns but adapt copy to AI Memory. Support first-time setup, unlock needed, session expired, code-entry pairing, expired code, token accepted, token rejected, server unreachable, offline before pairing. Hide QR, sync, biometric, and package migration claims unless implemented and approved. | PRD-15; pairing/token APIs; Capacitor Preferences; D-008 and D-013. | `pages/MobileLogin.tsx`. |
| P0 | As Arun, I want Android validation to prove the actual APK experience, so that browser mobile screenshots do not overclaim completion. | Validate changed protected routes inside the APK with a real session. Use exact claim labels: shell loaded assets, unauthenticated route validated, authenticated route validated, native entry path validated, browser mobile only. | Android emulator/physical device; pairing/session path; WebView tooling. | N/A |
| P0 | As Arun, I want safe deploy and rollback, so that the Android revamp does not risk data or leave stale assets behind. | Before deploy, run tests/build, create SQLite backup, document rollback source, smoke live routes, verify Android WebView asset pickup, test stale-cache recovery, and document client-state recovery. | `scripts/deploy.sh`; production backup path; service worker/cache; APK validation. | N/A |
| P1 | As Arun, I want item detail to feel designed for mobile, so that reading, focus mode, Ask, details, related items, tags, topics, and collections are easy to use. | Implement mobile item detail parity. Tabs are included only if D-005 is approved. Tags/collections mutation controls require real semantics and tests. Embedded YouTube player stays hidden unless D-014 is approved. | D-005; D-014; item detail route; topics/collections/tag semantics. | `pages/MobileItemDetail.tsx`; `components/ui/Tabs.tsx`. |
| P1 | As Arun, I want Ask on Android to use the Magic Patterns mobile composer pattern, so that I can ask from Library, selected items, item detail, topics, and collections without layout pain. | Implement mobile-safe composer, scope banner, text input, send icon, empty-send nudges, citations, and approved history. Add Context sheet exposes only supported saved-item behavior. Paste link/write note attachments stay disabled/hidden unless D-001 is approved and implemented. | D-001, D-002, D-003; Ask API/retrieval; keyboard safe layout. | `pages/MobileAsk.tsx`; `components/ui/Drawer.tsx`; `components/ui/Input.tsx`. |
| P1 | As Arun, I want Topic and Collection mobile screens to match the Magic Patterns design, so that browsing organized memory feels consistent. | Align read-only layouts, scoped Ask entry points, item rows, search, empty states, and badges. Hide create tag/add items sheets unless real mutation support exists and is tested. | Topics/collections routes; mutation support if approved. | `pages/MobileTopic.tsx`; `pages/MobileCollection.tsx`. |
| P1 | As Arun, I want Android keyboard, TalkBack, bottom-sheet, and gesture behavior to be usable, so that the app works like a serious mobile app. | Meet measurable accessibility criteria: 4.5:1 normal text contrast, 3:1 control boundary contrast, 44px tap targets, labels on icon buttons, visible focus, sheet close/back behavior, keyboard-safe Ask/search/pairing/filter/repair flows, and TalkBack smoke path. | Accessibility QA; Android emulator/physical device. | All Magic Patterns mobile screens. |
| P1 | As Arun, I want client-side state to survive or recover cleanly, so that pairing tokens, session state, caches, and share-result payloads do not break after deploy. | Document Capacitor Preferences, session cookies, service worker cache, sessionStorage result payload, localStorage UI keys, and recovery steps. Verify force stop/relaunch, asset refresh, data clear fallback, and token preservation/recovery. | Service worker/cache; Capacitor Preferences; share-result storage. | N/A |
| P2 | As Arun, I want direct Android VIEW intents for setup to behave predictably, so that external setup links can land in the intended route. | Fix `/setup-apk` deep-link behavior only if native/manifest scope is approved. If not fixed, document as deferred and avoid claiming it works. | AndroidManifest intent filters; APK build/validation; D-013 if package identity changes. | Login/setup design states. |
| P2 | As Arun, I want a clear APK release path, so that a debug validation APK is not confused with a user-installable release. | Split debug validation APK from user-installable APK publication. If publishing, bump versionCode/versionName, record signing/distribution decision, checksum, fresh install, upgrade install, rollback APK, and install instructions. | `android/app/build.gradle`; build scripts; artifact storage; signing identity. | N/A |
| P3 | As Arun, I want visual screenshot evidence across compact/tall phones and themes, so that regressions are easy to spot. | Capture visual matrix for every screen/state with route, auth state, fixture, viewport/device, theme, expected visible/absent text, screenshot path, and pass/fail notes. | Browser automation; Android screenshots; seeded data. | All Magic Patterns screens. |
| P4 | As Arun, I want future offline, QR, analytics, and embedded media ideas captured without being shipped accidentally, so that roadmap work is easy to pick up later. | Document deferred follow-ups with product decision, data safety, UX, and validation requirements. Do not code them in this revamp unless approved. | D-007, D-008, D-011, D-014. | Relevant Magic Patterns prototype states. |

---

# **Milestones / Sequencing Plan**

*Each milestone maps to one releasable execution package. GA date is TBD and should be set only after Phase -1 and baseline validation.*

Recommended launch tier: **Tier 3 equivalent - Bug Fix / Small Change** for GTM purposes because this is a private single-user UX enhancement with visible workflow changes but no ARR/GTM motion. Internally, engineering complexity is higher than a typical Tier 3 because APK/WebView validation and release gates are nontrivial.

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **M0 - Truth Mapping And Source Freeze** | Magic Patterns source freeze, PRD source links/imports, design truth matrix, D-decision authorization table, current-state screenshot matrix. | N | Tier 4 equivalent | TBD | N/A |
| **M1 - Contrast, Route Policy, Shell Safety** | Button/selected-control contrast fix, More/Capture route-policy reconciliation, safe-area and bottom-nav baseline. | N | Tier 3 equivalent | TBD | N/A |
| **M2 - Core Browsing Surfaces** | Library, filters, select mode, More/settings/offline truth cleanup, visual QA and Android WebView validation. | N | Tier 3 equivalent | TBD | N/A |
| **M3 - Share, Capture, Repair, Needs Upgrade** | Android share-result surface, Capture result states, Repair flow, Needs Upgrade queue, Android native share validation. | N | Tier 3 equivalent | TBD | N/A |
| **M4 - Ask, Item Detail, Topic, Collection** | Mobile Ask composer within approved scope, item detail mobile parity, Topic and Collection mobile parity. | N | Tier 3 equivalent | TBD | N/A |
| **M5 - Entry, Pairing, Session, APK Identity** | Login/unlock/setup/pairing/session states, optional deep-link or APK work only if approved. | N | Tier 3 equivalent | TBD | N/A |
| **M6 - Release Candidate And Deploy** | Full tests/build, Android authenticated route validation, share/pair/offline/relaunch validation, backup, rollback, live smoke, final release notes. | N | Tier 3 equivalent | TBD | N/A |

---

# **Additional Components & Resources**

*The sections below are conditionally required based on the nature of the work. This PRD includes them because the Android revamp touches auth/session states, client storage, WebView caches, APK artifacts, share intents, and user-captured content.*

---

## **Legal: Risk Checklist**

*When to use: If the work touches any of these areas, flag all risks and dependencies. Your legal partner will advise on next steps for any features that intersect with these product areas.*

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | No payment/card flows. | N |
| **Card Linking** | No payment/card flows. | N |
| **Loyalty Program** | No loyalty flows. | N |
| **Guest Checkout** | No checkout flows. | N |
| **Toast User Auth** | N/A. App has its own PIN/session and Android pairing token behavior. | N |
| **Marketing/Ads** | No marketing or ads. | N |
| **Built-in consent mechanism** | Not in scope. If telemetry/privacy controls are added later, consent/privacy review is required. | N |
| **Guest Book feed-in functionality** | No CRM or guest book. | N |
| **Digital Receipts** | No receipts. | N |
| **Feedback Loop to Merchant** | No merchant feedback. | N |
| **Feedback Loop to Toast** | No Toast feedback. | N |

---

## **Legal: Personal Data Processed**

*When to use: Is this a new product or a change that results in any data capture changes from users? If so, review with Legal.*

This PRD should not introduce new categories of personal data. It changes Android presentation and flow handling for existing AI Memory data. Any new logging, analytics, offline storage, QR scanner, or account feature requires separate review.

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| Saved item title/source metadata | Existing app behavior; voluntary through capture/share | SQLite on AI Memory server | Persistent |
| Saved note/body/PDF extracted text | Existing app behavior; voluntary through capture/share/repair | SQLite/artifacts on AI Memory server | Persistent |
| Android pairing token | Existing app behavior; required for Android share capture | Capacitor Preferences on device | Persistent until unpaired/cleared |
| Session cookie/PIN session state | Existing app behavior; required for authenticated web routes | Browser/WebView cookie/session storage | Temporary/persistent per current auth behavior |
| Android share result display payload | New UI surface; generated from capture outcome | WebView `sessionStorage` | Temporary with expiry |
| Client/server error logs | Existing or extended observability; should be redacted | Server logs/client error endpoint | Temporary or retained per existing log policy |
| APK screenshots/log evidence | QA artifact; may include item titles | Local execution evidence folder | Temporary/project artifact; redact sensitive data when sharing |

---

## **Ideal User Experience**

*When to use: When coming up with a new product experience where the user flow is not immediately clear. Especially helpful for gaining alignment on experiences that span multiple product surfaces.*

### **User Flows**

1. **Launch and unlock**
   - User opens Android APK.
   - App shows AI Memory-branded unlock/setup state.
   - If session exists, user reaches Library.
   - If setup or pairing is needed, user sees code-entry pairing flow.
   - If server is unreachable, user sees truthful server-required/offline fallback copy.

2. **Browse Library**
   - User lands in a mobile-designed Library.
   - User can search, filter, inspect quality badges, open Needs Upgrade, and select items.
   - Selected mode has visible controls, cancel, count, and Ask selected action.
   - Bottom nav remains visible and does not overlap core actions.

3. **Ask**
   - User opens Ask from nav or scoped entry point.
   - Composer is keyboard-safe.
   - Scope and source quality are clear.
   - Unsupported attachment flows are hidden or disabled.
   - Citations and history stay within approved persistence behavior.

4. **Capture in app**
   - User opens Capture.
   - User saves URL, note/text, or PDF through supported flows.
   - Result state is visible and mobile-friendly.
   - Weak or limited captures point to repair/add text.

5. **Share from Android**
   - User shares URL/text/PDF into AI Memory from Android share sheet.
   - App shows a durable result sheet/route.
   - User can open item, add text, Ask, retry, pair device, or finish.
   - Failures are explicit and do not imply save.

6. **Read item and repair**
   - User opens item detail.
   - Mobile detail uses Magic Patterns visual hierarchy adapted to production truth.
   - Focus mode removes shell chrome.
   - Weak items show repair path.
   - Tags/topics/collections are shown or editable only where production semantics support it.

7. **Use More and Offline**
   - User opens More for status, pairing, provider health, version, privacy roadmap, and offline/server state.
   - App never implies active sync, E2EE, telemetry controls, delete-all-data, or offline Ask/capture unless implemented.

8. **Recover after deploy or stale asset**
   - User can relaunch or use an app refresh/reload path if feasible.
   - Pairing token is preserved or recovery is documented.
   - Android WebView picks up deployed assets after release.

### **Wireframes / Mockups (Optional)**

- Magic Patterns mobile design: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Active artifact at PRD creation: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
- Required screen references:
  - `components/MobileFrame.tsx`
  - `components/MobileBottomNav.tsx`
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

- Architecture is WebView-first. Native Android work should be limited to manifest, share intent, pairing/token storage, APK identity, and validation unless a native rewrite is separately approved.
- Magic Patterns source is inspiration and visual target, not production-ready code.
- `MobileFrame` is not production UI. Use it only for safe-area and spacing intent.
- Android share result must use a typed state model and safe temporary storage.
- Query strings must not contain full titles, URLs, note text, PDF names, tokens, raw errors, or sensitive payloads.
- Authenticated APK route validation is required for changed protected screens.
- Service worker/cache behavior must be tested to avoid stale Android assets after deploy.
- Any storage/API/data changes require migration plan, backup/restore, rollback, test data validation, and failure notes.
- Button contrast defect must be fixed before broader UI parity work.
- Existing package is `com.arunprakash.brain`, version `1.0.2`, code `3`; APK publication requires safe version bump and rollback artifact.
- Observability must include screenshots, WebView console where available, `adb logcat`, server/client error logs, and token redaction.

---

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Magic Patterns prototype behavior copied literally | High | High | Require design truth matrix before coding; block QR/offline/sync/privacy claims unless implemented. |
| Android parity overclaimed from browser screenshots | High | Medium | Use exact Android evidence levels; require authenticated APK validation for changed protected routes. |
| Share result loses state or misreports failure as save | High | Medium | Implement typed share-result state machine, expiry behavior, and failure-state tests. |
| Dark-mode buttons remain unreadable | High | Medium | Make contrast fix P0 and release-blocking. Add scans and visual validation. |
| More/Capture route policy remains inconsistent | Medium | High | Treat as current defect; reconcile code/docs/screenshots before shell milestone. |
| Stale WebView assets after deploy | Medium | Medium | Test service worker/cache behavior; document recovery and add refresh path if feasible. |
| APK publication overwrites same version | High | Low | No same-version overwrite. Require version bump, checksum, upgrade install, rollback artifact. |
| PRD sources missing from release worktree | Medium | Medium | Copy or link original PRD packages during Phase -1. |
| Unapproved data mutation appears in tags/topics/collections | Medium | Medium | Hide/disable mutation UI unless production semantics and tests exist. |
| Logs or evidence leak tokens/content | High | Low | Redact tokens/cookies/secrets; avoid raw sensitive query strings; sanitize evidence before sharing. |

---

# **Agent Execution Contract**

This PRD is written for an AI implementation agent. The agent must:

1. Treat this PRD and the revised implementation plan as joint source of truth.
2. Start with Phase -1 from the implementation plan.
3. Create the design truth matrix before coding.
4. Create the D-decision authorization table before coding.
5. Refuse to implement decision-gated behavior without approval status.
6. Use Magic Patterns only as visual and interaction reference after product-truth mapping.
7. Maintain tracker and running log after milestones, blockers, decisions, QA, deploy, and final result.
8. Run code review and fix P0/P1 before release.
9. Deploy only when hard gates pass.
10. Final summary must state shipped, validated, deferred, blocked, APK status, live URL, evidence paths, and next steps.

## **Release Gate**

No release if any of these are true:

- failing tests/build;
- unresolved P0/P1;
- missing backup or rollback;
- broken critical contrast;
- ambiguous D-decision status;
- unvalidated changed critical Android screen;
- unknown data/client-state risk;
- missing deploy access;
- unsafe APK versioning;
- Android UX completion claimed without authenticated APK evidence.
