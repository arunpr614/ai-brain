# **AI Memory Web Experience Revamp PRD**

**Team:** AI Memory, Web/Desktop UX
**Author (PM):** Arun / Codex draft
**Triad Partners (Design, Engineering):** Magic Patterns desktop design reference, Codex implementation, Arun product owner
**Legal Contact:** N/A - private single-user app. Re-review required before distribution, telemetry, encryption, destructive data controls, or account expansion.
**Applicable Countries:** N/A - private personal app
**Market Segments:** N/A - private personal app

**Date last edited:** 2026-06-15 18:57:16 IST
**Doc Status:** Draft execution PRD for full web/desktop experience revamp. Arun's acceptance or use of this PRD as the execution source approves the web decision table below.
**Related Links:**
- Magic Patterns desktop design: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Magic Patterns active artifact checked on 2026-06-15: `f3312489-9172-4c3f-bcf8-2352ece9d417`, `isGenerating=false`
- Current web production URL: `https://brain.arunp.in`
- Existing UX v2 implementation matrix: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_IMPLEMENTATION_MATRIX_2026-06-15.md`
- Existing production release report: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md`
- Android companion PRD: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- Open decisions packet: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`

---

# **Overview**

## **Context & Insights**

- AI Memory's web app is the primary surface for reading, organizing, searching, asking, capturing, repairing, and managing a private memory library.
- The prior UX v2 release shipped a Magic Patterns-inspired web candidate, but this PRD is stricter: it asks for a complete desktop/web parity pass against the current Magic Patterns desktop design.
- The Magic Patterns desktop artifact provides the target screen set: `DesktopLayout`, `DesktopLibrary`, `DesktopNeedsUpgrade`, `DesktopItemDetail`, `DesktopAsk`, `DesktopCapture`, `DesktopSettings`, `DesktopLogin`, `DesktopPairDevice`, `DesktopTopic`, and `DesktopCollection`.
- Magic Patterns is a visual and interaction target, not production truth. It includes prototype-only behavior that must be adapted, disabled, hidden, or separately approved before shipment.
- Risky prototype elements in the desktop design include QR pairing, offline sync, fake connected devices, fake provider-health metrics, fake backups/export, destructive delete controls, bulk delete, mark-good-enough, unverified tag/collection mutations, and stale `AI Brain` copy.
- The web revamp must match the Magic Patterns desktop visual system as closely as possible while preserving truthful AI Memory behavior and release safety.

## **Problem Statement**

AI Memory's web app needs a complete desktop UX revamp that matches the Magic Patterns desktop design across every web screen and state. The current implementation is directionally aligned, but a complete revamp requires a screen-by-screen parity contract, product-truth decisions for prototype-only controls, visual fidelity validation, accessibility checks, and deploy-ready release gates.

This project makes the web experience feel like one coherent, polished AI Memory product. It must not ship fake QR pairing, offline sync, telemetry, E2EE, backup/export, connected-device, provider-health, destructive delete, or mutation behavior that the app does not actually support.

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Ship a complete web/desktop UX revamp across every Magic Patterns desktop screen.
2. Match Magic Patterns desktop visual hierarchy, navigation, density, component treatment, and interaction model after production-truth adaptation.
3. Make Library, Ask, Capture, Needs Upgrade, Item Detail, Topic, Collection, Settings, Login, and Pair Device feel like one polished desktop app.
4. Preserve trust by removing fake prototype claims and replacing them with real AI Memory state.
5. Validate visual fidelity, accessibility, responsive desktop behavior, data safety, rollback, and live deployment.

## **Success Metrics**

### **Primary Metric**

- 100% of screens in the Web Screen Acceptance Matrix are implemented or production-truth adapted and validated against the active Magic Patterns desktop artifact.

### **Supporting Metrics**

- 0 deferred or blocked prototype behaviors counted as web revamp completion.
- 0 stale user-facing `AI Brain`, fake account/device data, fake offline sync, QR promise, telemetry-control claim, E2EE claim, fake backup/export state, fake provider-health metric, or fake destructive delete state in shipped web UI.
- 0 critical contrast failures for primary actions, selected controls, navigation, badges, dialogs, drawers, and focus states in supported themes.
- 100% of changed protected web routes pass authenticated browser validation.
- 100% of destructive or mutating controls are backed by real production behavior and tests, or are absent/disabled with truthful copy.
- Magic Patterns artifact status, active artifact ID, and file list are rechecked before coding and before release.
- Full tests, typecheck, lint, build, backup, rollback, live smoke, and visual screenshot matrix pass before deploy.

## **Non-Goals**

- No Android-native redesign in this web PRD.
- No Chrome extension redesign.
- No active offline sync, offline library/cache controls, offline Ask, offline capture, or local download project.
- No QR pairing unless both web QR generation and Android QR scanning are separately approved and validated.
- No product analytics or telemetry.
- No active E2EE, crash-report controls, telemetry toggles, delete-all-data controls, or connected-device management unless fully implemented and validated.
- No fake backup/export, fake provider health, fake sync status, fake account identity, or fake destructive action.
- No package ID or APK release changes.
- No embedded YouTube player unless separately approved with privacy/copyright review.

---

# **User Personas / Stakeholders**

## **Users**

- **Primary user: Arun, web AI Memory user**
  - Needs a fast, polished desktop interface for reviewing, organizing, asking, capturing, repairing, and reading saved memory.
  - Needs trust signals that distinguish full-text items from weak or metadata-only captures.
  - Needs scoped Ask, topics, collections, tags, and Needs Upgrade to feel connected.
  - Needs settings and pairing screens that show real capability, not roadmap fiction.

- **Secondary user: AI implementation agent**
  - Needs explicit screen acceptance criteria, decision gates, source authority, validation labels, and no-go rules.
  - Must match the Magic Patterns design while adapting prototype-only controls to production truth.
  - Must produce tracker updates, screenshots, release notes, backup/rollback evidence, and live smoke results.

- **Secondary stakeholder: Arun as product/release owner**
  - Needs to know what shipped, what matched Magic Patterns, what was adapted, what was deferred, what was validated, and what remains risky.

---

# **Product Decision Authorization**

This table is the approval record for the web revamp once Arun accepts or uses this PRD as the execution source. Approved web screens must ship. Deferred feature rows are excluded from completion and must not appear as active working functionality.

| ID | Decision | Status for this web revamp | Product rule | Completion rule |
| --- | --- | --- | --- | --- |
| W-001 | Full desktop screen parity | Approved implementation | Implement every screen in the Web Screen Acceptance Matrix using the MP2 artifact as visual target after production-truth adaptation. | Counts toward web revamp completion. |
| W-002 | Desktop shell/sidebar/collapsed nav | Approved implementation | Match `DesktopLayout` navigation, AI Memory identity, Capture entry, active states, collapse behavior, Needs Upgrade badge, and lower utility rows. | Counts toward shell completion. |
| W-003 | Library filters, select mode, Ask selected | Approved implementation | Implement search, type/quality filters, tag view, selection, selected count, Ask selected, and safe bulk affordances. | Counts toward Library completion. |
| W-004 | Bulk add tags/collections | Conditional implementation | Implement only if production tag/collection mutation support exists with tests, undo/error handling, and no fake success. Otherwise hide or disable. | Counts only if real and tested. |
| W-005 | Bulk delete and item delete | Approved deferral and excluded | Do not ship destructive delete from Library/Needs Upgrade/Item Detail unless confirmation, audit/recovery, tests, and rollback plan exist. | Does not count toward completion. |
| W-006 | Mark-good-enough | Approved deferral and excluded | Hide this action unless a separate state model and audit/reversal behavior is approved. | Does not count toward completion. |
| W-007 | Ask scoped answers and citations | Approved implementation | Implement supported scopes: all/library, selected items, item, tag, topic, collection. Citations must map to real items. | Counts toward Ask completion. |
| W-008 | Ask attachments, high-quality-only control, persisted scope-history changes | Approved deferral and excluded | Do not add new attachment persistence, retrieval inclusion toggles, or scope snapshot schema in this web revamp. | Does not count toward completion. |
| W-009 | Capture result states | Approved implementation | Match MP2 Capture visual/result model using real capture APIs and existing result contract. No fake demo cycling. | Counts toward Capture completion. |
| W-010 | Topic and collection read/Ask views | Approved implementation | Implement read-oriented topic/collection pages, item lists, scope health, scoped Ask, empty states, and search/filter if supported. | Counts toward Topic/Collection completion. |
| W-011 | Topic create-tag and add-to-collection drawers | Conditional implementation | Implement only if backed by real tag/collection mutations and tests. Otherwise hide or disable with truthful copy. | Counts only if real and tested. |
| W-012 | Collection add-items and rename drawers | Conditional implementation | Implement only if backed by real collection mutation support and tests. Otherwise hide or disable with truthful copy. | Counts only if real and tested. |
| W-013 | Login/unlock/setup/session/offline states | Approved implementation with adaptation | Match visual treatment, but use AI Memory copy and real auth/session behavior. Offline copy must say server is required unless real offline mode exists. | Counts toward Login completion. |
| W-014 | Pair Device | Approved implementation with adaptation | Code-entry pairing is approved. QR pairing and fake synced-device claims are not approved. | Counts toward Pair Device completion. |
| W-015 | Settings appearance/access/provider/privacy/status | Conditional implementation | Implement only real settings. Appearance controls may ship if wired. Provider health may show only real provider state. Privacy roadmap controls must be clearly disabled. | Counts only when truthful. |
| W-016 | Offline sync, cache controls, backups/export | Approved deferral and excluded unless real endpoints exist | Hide or clearly disable fake offline sync, clear cache, backup/export, automatic backups, and storage charts unless implemented and tested. | Does not count toward completion. |
| W-017 | Product analytics, telemetry, crash-report controls | Approved deferral and excluded | No analytics or telemetry controls. Disabled roadmap placeholders allowed only if clearly noninteractive. | Does not count toward completion. |
| W-018 | E2EE and delete-all-data | Approved deferral and excluded | No active E2EE or destructive delete-all-data claim. Disabled roadmap placeholders only. | Does not count toward completion. |
| W-019 | YouTube embedded media | Approved deferral for embedded player | Metadata/thumbnail/trust treatment may ship if backed by real data. Embedded player remains excluded. | Metadata may count; player does not. |
| W-020 | Visual fidelity and accessibility | Approved implementation | Every screen must pass screenshot, contrast, keyboard, focus, tap/click target, and responsive desktop checks. | Release-blocking. |

---

# **Requirements**

- **User Stories:** How users interact with the web experience.
- **Requirements:** The capability that must exist, plus the behavioral conditions that define correct behavior and done.
- **Mock ups & Prototypes (Magic Patterns, v0):** MP2 is the visual and interaction reference. It is not production-ready code.

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | As Arun, I want the web app to match the Magic Patterns desktop design across every screen, so that AI Memory feels polished and coherent. | Re-check MP2 status/artifact/file list, snapshot source docs, create a web design truth matrix, and implement every screen in the Web Screen Acceptance Matrix. | MP2 artifact `f3312489-9172-4c3f-bcf8-2352ece9d417`; existing UX final plan; current app code. | All MP2 desktop files. |
| P0 | As Arun, I want the desktop shell to feel stable and intentional, so navigation is fast and predictable. | Implement shell/sidebar, collapsed state, route-active states, Capture entry, Needs Upgrade badge, Pair Device link, privacy/trust copy, and content overflow behavior. | `DesktopLayout.tsx`; current `src/components/sidebar.tsx`; route map. | `components/DesktopLayout.tsx`. |
| P0 | As Arun, I want Library to match the desktop design, so scanning, filtering, selecting, and asking are ergonomic. | Implement desktop Library visual hierarchy, search, type/quality filters, tag view, source rows, quality badges, selected count, Ask selected, and safe bulk affordances. | Library routes/data; tags/collections; Ask selected cap. | `pages/DesktopLibrary.tsx`. |
| P0 | As Arun, I want weak captures to be visible and repairable, so I can improve Ask quality. | Implement Needs Upgrade grouped queue, repair actions, weak-source reasons, empty state, and safe actions. Hide mark-good-enough unless separately approved. | Repair route/API; weak-source query; D-004/W-006. | `pages/DesktopNeedsUpgrade.tsx`. |
| P0 | As Arun, I want Item Detail to match the desktop design, so reading, metadata, trust, related items, tags/topics/collections, focus, and Ask item feel cohesive. | Implement visual parity for detail layout, trust strip, tabs/sections if present, repair affordance, focus mode, metadata, related items, and scoped Ask. Mutations require real support. | Item detail route; topics/collections/tags; repair; Ask item. | `pages/DesktopItemDetail.tsx`; `components/ui/Tabs.tsx`. |
| P0 | As Arun, I want Ask to use the desktop scoped-answer design, so answers are grounded and source scope is clear. | Implement Ask history/scope panel if backed by supported data, scope banner, readable-source warnings, citations, answer states, empty/not-enough-text state, and composer. Hide unsupported attachment/retrieval controls. | Ask API/retrieval; citation mapping; scopes. | `pages/DesktopAsk.tsx`. |
| P0 | As Arun, I want Capture to match the desktop design, so saving URL, PDF, and notes has clear outcomes. | Implement URL/PDF/note capture layout, validation, loading, result state surface, duplicate/update/full/limited/preview/needs-upgrade/failure states, and actions. Remove demo cycling. | Capture APIs; result contract; file upload. | `pages/DesktopCapture.tsx`. |
| P0 | As Arun, I want Settings to show real capability only, so I do not confuse roadmap ideas with working controls. | Implement desktop settings layout and categories with truthful content. Hide or disable fake offline sync, backup/export, provider metrics, telemetry, E2EE, delete-all-data, and connected-device controls unless real and tested. | Settings routes; provider health if real; theme controls if real. | `pages/DesktopSettings.tsx`. |
| P0 | As Arun, I want Login, setup, unlock, and session states to match the design without false offline/security claims. | Implement AI Memory-branded login/unlock/setup/session states, errors, loading, recovery copy, and server-required offline copy. Do not claim offline cache, device-only storage, or E2EE unless implemented. | Auth/session code; unlock/setup routes. | `pages/DesktopLogin.tsx`. |
| P0 | As Arun, I want Pair Device to be clear and truthful. | Implement code-entry pairing, generated code lifecycle, expiration, accepted/rejected states, and error handling. Hide QR and fake synced-device claims unless separately approved and validated. | Pairing APIs; token exchange; route. | `pages/DesktopPairDevice.tsx`. |
| P0 | As Arun, I want Topic and Collection pages to match the design, so organization and scoped Ask feel complete. | Implement topic/collection pages, item lists, scope health, scoped Ask, search/filter if supported, empty states, and safe mutation affordances only if real. | Topics/collections routes/data; Ask scopes. | `pages/DesktopTopic.tsx`; `pages/DesktopCollection.tsx`. |
| P0 | As Arun, I want visual fidelity evidence, so the implementation can be checked against the design. | Capture screenshot matrix for every screen/state at desktop viewports, compare expected visual structure, run copy scans, contrast checks, and interaction smoke. | Browser automation; seeded fixtures; MP2 file list. | All MP2 screens. |
| P0 | As Arun, I want safe deploy and rollback. | Before deploy, run tests/build, create SQLite backup, document rollback source, smoke live routes, verify protected routes, and document any storage/API changes. | `scripts/deploy.sh`; production backup path. | N/A |
| P1 | As Arun, I want keyboard and accessibility support, so the desktop app works like a serious tool. | Validate tab order, visible focus, labels, drawer close behavior, escape/back behavior, 4.5:1 text contrast, 3:1 control boundary contrast, and no hover-only critical actions. | Accessibility QA; browser automation. | All MP2 screens. |
| P1 | As Arun, I want production-safe organization controls, so tags and collections do not fake success. | Implement tag/collection add, rename, apply, and remove only if real APIs/tests exist. Otherwise adapt to read-only or disabled roadmap UI. | Tag/collection API and tests. | Library, Item Detail, Topic, Collection, Settings. |
| P1 | As Arun, I want provider and privacy settings to be useful without overclaiming. | Show provider health only from real endpoint or clearly label unavailable. Keep privacy controls disabled roadmap if not active. | Provider health endpoint; privacy copy. | `DesktopSettings.tsx`. |
| P2 | As Arun, I want web responsive safety beyond desktop, so the revamp does not regress tablet/small-window use. | Validate 1024px, 1280px, 1440px, and 1920px widths; no text overlap; drawers remain usable; main content scrolls correctly. | Browser screenshots. | All MP2 screens. |
| P3 | As Arun, I want future offline, QR, analytics, and destructive controls captured without accidental shipment. | Document deferred follow-ups with product decision, data safety, UX, and validation requirements. Do not code them in this revamp. | W-016, W-017, W-018, W-014 follow-ups. | Settings, Login, Pair Device. |

## **Web Screen Acceptance Matrix**

| Surface | Magic Patterns reference | Must ship in this revamp | Required adaptations and forbidden content | Required evidence |
| --- | --- | --- | --- | --- |
| Desktop shell/sidebar | `components/DesktopLayout.tsx` | AI Memory identity, sidebar, collapsed state, Capture entry, route-active states, Needs Upgrade badge, Pair Device link, lower trust/privacy row, overflow-safe main area. | Use real badge count. No fake privacy controls. Pair Device link must route to real pairing. | Authenticated browser screenshots expanded/collapsed, Library active, Item Detail collapsed, Settings active. |
| Library | `pages/DesktopLibrary.tsx` | Header, search, type filters, quality filters, tag context banner, item rows, quality badges, select controls, selected toolbar, Ask selected. | Bulk tags/collections only if real. Bulk delete hidden/disabled unless destructive flow is real. No fake success toast. | Screenshots for default, filtered, tag view, selected state, empty state, dark theme if supported. |
| Needs Upgrade | `pages/DesktopNeedsUpgrade.tsx` | Grouped weak-source queue, repair-oriented actions, reason groups, item metadata, empty state. | Hide mark-good-enough. Delete hidden/disabled unless real destructive flow. Retry only if real retry exists. | Screenshots for queue, each reason group where fixture exists, empty state; repair route smoke. |
| Item Detail | `pages/DesktopItemDetail.tsx` | Detail hierarchy, source metadata, trust/quality treatment, repair panel, tags/topics/collections, related items, Ask item, focus mode. | No fake mutation drawers. No embedded YouTube player unless approved. No fake source text. | Screenshots for full item, weak item, metadata-only item, related items, focus mode, tags/topics/collections. |
| Ask | `pages/DesktopAsk.tsx` | History/sidebar if backed by supported data, scope banner, readable-source count, weak-source warning, enough/not-enough-text states, citations, composer. | Replace `AI Brain` with `AI Memory`. No unsupported attachments, high-quality-only toggle, or new persisted scope-history. | Screenshots for library scope, selected scope, tag/topic/collection scope, not-enough-readable-text, answer with citations. |
| Capture | `pages/DesktopCapture.tsx` | URL/PDF/note tabs, validation, loading, result panel, full/metadata/preview/updated/duplicate/needs-upgrade/failure states. | No demo result cycling. Duplicate/merge/keep-both only if real. PDF size copy must match actual limit. | Screenshots and tests for URL, PDF, note, invalid input, duplicate/update, limited capture, failure. |
| Settings | `pages/DesktopSettings.tsx` | Settings navigation, access, devices, privacy roadmap, appearance if real, tags/collections if real, provider health if real. | Hide/disable offline sync, backup/export, automatic backups, fake connected devices, fake provider metrics, telemetry, E2EE, delete-all-data unless implemented. | Screenshots for each category, copy scan for forbidden active claims, disabled-state accessibility. |
| Login/setup/session | `pages/DesktopLogin.tsx` | Unlock, setup, expired session, server-unreachable/offline fallback, validation error, loading state. | No read-only offline cache claim unless real. No "data stays on your devices" if server stores data. AI Memory naming only. | Public route screenshots for unlock/setup/expired/offline/error/loading; copy scan. |
| Pair Device | `pages/DesktopPairDevice.tsx` | Code-entry pairing, code generation/expiry, regenerate, accepted, rejected, expired, server error states. | Hide QR unless Android QR scanner is approved. No "synced" device claim unless actual device state exists. No fake Pixel device. | Screenshots for code, expired, accepted, rejected, server error; pairing API tests. |
| Topic | `pages/DesktopTopic.tsx` | Topic header, explanation/evidence, item list, scope health, related topics, Ask this topic. | Topics are derived. Create tag/add to collection only if real and tested. Remove "prototype sample" copy from production. | Screenshots for topic with items, limited-source warning, no-topic/not-found, empty topic if possible. |
| Collection | `pages/DesktopCollection.tsx` | Collection header, description, item count, item list, Ask collection, search/sort if supported, empty state. | Add items/rename only if real and tested. No fake mutation success. | Screenshots for populated collection, empty collection, search/sort, mutation drawer only if real. |
| UI primitives | `components/ui/Button.tsx`, `Badge.tsx`, `Input.tsx`, `Drawer.tsx`, `Tabs.tsx`, `Card.tsx`, `Checkbox.tsx`, `Select.tsx`, `Separator.tsx` | Desktop component styling aligned to MP2: compact, tool-like, clear focus, consistent radii, readable badges, usable drawers. | No one-off button styles that reintroduce dark-mode contrast bug. No inaccessible icon-only buttons. | Component scan, contrast check, keyboard/focus smoke. |

---

# **Milestones / Sequencing Plan**

Launch tier is informational only. This is a private single-user product; GTM tier does not reduce release gates. Treat as Tier 4 for public/customer GTM and Tier 3-equivalent engineering validation rigor.

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **M0 - Source Freeze And Truth Matrix** | Re-check MP2 artifact, snapshot source docs, create web design truth matrix, current-state screenshot matrix, route inventory, decision table acceptance. | N | N/A private app | TBD | N/A |
| **M1 - Foundations And Shell** | Desktop tokens/components, contrast repair, sidebar/collapsed shell, route-active states, safe layout/overflow. | N | N/A private app | TBD | N/A |
| **M2 - Library And Organization Surfaces** | Library filters/select/Ask selected, Topic, Collection, safe tag/collection handling. | N | N/A private app | TBD | N/A |
| **M3 - Reading, Repair, And Ask** | Item Detail, focus mode, Needs Upgrade, Repair links, Desktop Ask scopes/citations/composer. | N | N/A private app | TBD | N/A |
| **M4 - Capture And Result States** | Desktop Capture URL/PDF/note flows, result states, duplicate/update/limited/failure handling. | N | N/A private app | TBD | N/A |
| **M5 - Settings, Login, Pairing Truth Cleanup** | Settings categories, Login/setup/session states, Pair Device, disabled roadmap controls, copy cleanup. | N | N/A private app | TBD | N/A |
| **M6 - QA, Release, Deploy** | Full tests/build, screenshot matrix, accessibility, backup, rollback, deploy, live smoke, release notes. | N | N/A private app | TBD | N/A |

---

# **Additional Components & Resources**

The sections below are included because the web revamp touches auth/session states, private content, mutating organization controls, destructive-control prototypes, provider/privacy settings, and production deploy gates.

---

## **Legal: Risk Checklist**

This is a private single-user app, not a commercial Toast launch. The checklist is used as a product-risk guardrail.

| Feature | Notes / Details | Included (Y/N) |
| :---- | :---- | :---- |
| **Card Saving** | No payment/card flows. | N |
| **Card Linking** | No payment/card flows. | N |
| **Loyalty Program** | No loyalty flows. | N |
| **Guest Checkout** | No checkout flows. | N |
| **Toast User Auth** | N/A. App uses its own PIN/session behavior. | N |
| **Marketing/Ads** | No marketing or ads. | N |
| **Built-in consent mechanism** | Not in scope. If telemetry/privacy controls are added later, consent and retention review required. | N |
| **Guest Book feed-in functionality** | No CRM or guest book. | N |
| **Digital Receipts** | No receipts. | N |
| **Feedback Loop to Merchant** | No merchant feedback. | N |
| **Feedback Loop to Toast** | No Toast feedback. | N |

---

## **Legal: Personal Data Processed**

This revamp should not introduce new categories of personal data. It changes presentation and flow handling for existing AI Memory data. Any new logging, analytics, offline storage, QR scanner, export, destructive delete, connected-device registry, or account feature requires separate review.

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| Saved item title/source metadata | Existing app behavior; voluntary through capture/share | SQLite on AI Memory server | Persistent |
| Saved note/body/PDF extracted text | Existing app behavior; voluntary through capture/share/repair | SQLite/artifacts on AI Memory server | Persistent |
| Tags/topics/collections | Existing or approved organization behavior | SQLite on AI Memory server | Persistent |
| Session cookie/PIN session state | Existing behavior for authenticated web routes | Browser cookie/session storage | Temporary/persistent per current auth behavior |
| Capture result display state | Existing or refined UI state | Browser session/local state and server response | Temporary UI state |
| Client/server error logs | Existing or extended observability; redacted error codes only | Server logs/client error endpoint | Temporary or retained per existing policy |
| Screenshot/log evidence | QA artifact; may include private item titles | Local execution evidence folder | Temporary/project artifact; redact before sharing |

## **Privacy And Evidence Handling**

- Do not put full titles, URLs, note text, PDF names, tokens, cookies, raw errors, or sensitive payloads in query strings.
- Client/server logs must use stable error codes and redact tokens, cookies, session identifiers, signed URLs, and file names.
- Screenshots and videos are local/private evidence by default.
- Before any screenshot or log is shared outside Arun's local workspace, redact private item titles, URLs, notes, PDF names, tokens, cookies, and session details.
- Final release notes may reference evidence paths, but must not quote private saved content.
- If evidence cannot be safely redacted, record pass/fail and keep the artifact local.

---

## **Ideal User Experience**

### **User Flows**

1. **Launch and unlock**
   - User opens the web app.
   - App shows AI Memory-branded unlock/setup/session state.
   - User unlocks and lands in Library.
   - Expired or failed sessions show clear recovery.
   - Server-unreachable states avoid offline/cache overclaims.

2. **Browse and filter Library**
   - User scans saved items in a dense but readable desktop table/card list.
   - User filters by type, quality, and tag.
   - User selects items and asks selected items.
   - Bulk tag/collection actions appear only if real.

3. **Ask**
   - User opens Ask from nav, Library selection, Item Detail, Topic, or Collection.
   - Scope banner and readable-source health are visible.
   - Answer citations link to real items.
   - Not-enough-readable-text states route to Needs Upgrade/repair.

4. **Capture**
   - User captures URL, PDF, or note.
   - Web app validates input, shows progress, and returns a durable result panel.
   - Duplicate, updated, limited, preview, needs-upgrade, and failure states are explicit.

5. **Read and repair**
   - User opens Item Detail.
   - Trust/quality state, topics, collections/tags, related items, and repair affordances are visible.
   - Focus mode removes shell chrome.
   - Weak items route to repair.

6. **Organize by topic and collection**
   - User opens Topic or Collection pages.
   - User sees item lists, scope health, and scoped Ask entry.
   - Mutation drawers appear only where production supports them.

7. **Use Settings and Pair Device**
   - User manages real access, pairing, appearance, tags/collections, and provider/privacy information.
   - Roadmap privacy/offline/backup/export/destructive controls are hidden or clearly disabled.
   - Pairing uses code-entry unless QR is separately implemented.

8. **Recover and release safely**
   - User receives fresh deployed assets after release.
   - Rollback can restore previous source and database state if needed.
   - Stale assets or broken protected routes block release.

### **Wireframes / Mockups (Optional)**

- Magic Patterns desktop design: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Active artifact at PRD creation: `f3312489-9172-4c3f-bcf8-2352ece9d417`
- Required screen references:
  - `components/DesktopLayout.tsx`
  - `components/ui/Button.tsx`
  - `components/ui/Card.tsx`
  - `components/ui/Drawer.tsx`
  - `components/ui/Input.tsx`
  - `components/ui/Tabs.tsx`
  - `components/ui/Badge.tsx`
  - `components/ui/Checkbox.tsx`
  - `components/ui/Select.tsx`
  - `components/ui/Separator.tsx`
  - `pages/DesktopLibrary.tsx`
  - `pages/DesktopNeedsUpgrade.tsx`
  - `pages/DesktopItemDetail.tsx`
  - `pages/DesktopAsk.tsx`
  - `pages/DesktopCapture.tsx`
  - `pages/DesktopSettings.tsx`
  - `pages/DesktopLogin.tsx`
  - `pages/DesktopPairDevice.tsx`
  - `pages/DesktopTopic.tsx`
  - `pages/DesktopCollection.tsx`

---

## **Technical Considerations**

## **Source Authority Order**

When sources conflict, use this order:

1. This web PRD's product decisions and hard gates.
2. Current product truth and existing production behavior.
3. Approved UX v2 final plan and source PRD snapshot.
4. Magic Patterns desktop artifact for visual layout, hierarchy, density, component treatment, spacing, and interaction intent.
5. Current production code and deploy constraints.
6. Prior release reports and open-decision packets.

## **Source Freeze And Staleness Gate**

Before coding and again before release:

- Re-check Magic Patterns `isGenerating`, active artifact ID, and file list.
- If active artifact changed, refresh the screen acceptance matrix and web design truth matrix before implementation continues.
- Snapshot required source docs into `UX_v2/execution/source-prds/web-<timestamp>/`.
- Create a source manifest with original path, copied path, file size, checksum, and read status.
- Create `WEB_EXPERIENCE_REVAMP_DESIGN_TRUTH_MATRIX_<timestamp>.md`.
- Create `WEB_EXPERIENCE_REVAMP_BASELINE_<timestamp>.md`.

## **Web Evidence Levels**

Use these exact labels in tracker, release notes, and final summary:

| Label | Meaning | Completion use |
| --- | --- | --- |
| Web public route validated | Public route loads and renders expected screen/state. | Enough only for public surfaces. |
| Web authenticated route validated | Protected route validated with real authenticated session. | Required for changed protected screens. |
| Web interaction path validated | User can complete the primary interaction using real data/API. | Required for capture, Ask, pairing, repair, and mutations. |
| Browser visual only | Screenshot confirms visual layout only, without real data/API interaction. | Cannot claim feature completion. |
| Deferred/disabled truth state | Prototype behavior is absent, hidden, disabled, or truthfully labeled. | Counts only as exclusion hygiene, not implementation. |

Non-waivable changed protected routes:

- `/library`
- `/needs-upgrade`
- `/items/[id]`
- `/items/[id]?mode=focus`
- `/ask`
- `/capture`
- `/settings`
- `/settings/device-pairing` or equivalent pairing route
- `/topics/[slug]`
- `/collections/[id]`

## **Visual Fidelity Gate**

Required screenshot matrix:

| Viewport | Purpose |
| --- | --- |
| 1024 x 768 | Small desktop/tablet-width safety. |
| 1280 x 800 | Common laptop viewport. |
| 1440 x 900 | Primary desktop design comparison. |
| 1920 x 1080 | Wide desktop spacing and max-width behavior. |

Acceptance:

- Every screen in the Web Screen Acceptance Matrix has screenshot evidence.
- Layout hierarchy, nav position, density, badges, cards, drawers, and action placement match MP2 intent after production-truth adaptation.
- No text overlaps, clipped controls, unstable layout shifts, or hidden critical actions.
- Sidebar collapsed/expanded states are captured.
- Drawer/modal states are captured where included.
- Empty/error/loading states are captured where applicable.

## **Contrast And UI Token Gate**

This gate must pass before broader web parity work proceeds:

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

- Primary actions use action tokens, not invalid dark-mode accent/on-accent pairings.
- Selected controls use selected-control tokens, not bright raw accent borders.
- Primary actions, selected controls, nav active states, badges, and drawers pass contrast in supported themes.
- Light/dark screenshots prove the fix on Library, Ask, Capture, Item Detail, Settings, Login, and Pair Device.

## **Storage, API, And Data Change Rules**

- No storage/API/data change without migration plan, backup/restore, rollback, test data validation, and failure notes.
- No destructive delete without confirmation, audit/recovery path, tests, and rollback notes.
- No offline storage, queue, cache, or sync behavior in this revamp.
- No new analytics/event collection.
- No fake backup/export.
- No fake provider health.

---

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Prototype behavior copied literally | High | High | Use web decision table and design truth matrix before coding. Block fake QR/offline/privacy/backup/delete/provider claims. |
| "Exact design" interpreted as fake functionality | High | Medium | Visual parity is required after production-truth adaptation. Deferred controls cannot count as implementation. |
| Destructive or mutating controls fake success | High | Medium | Require real APIs/tests/undo/error handling or hide/disable controls. |
| Ask scopes or citations overclaim source quality | High | Medium | Show readable-source health and citations only from real retrieved items. |
| Capture result states misreport save outcome | High | Medium | Use real capture responses and result contract. Remove demo cycling. |
| Private evidence leaks saved content | High | Low | Local-only evidence default, redaction checklist, no raw content in reports. |
| Dark-mode contrast remains broken | High | Medium | Contrast/token gate blocks broader parity work and release. |
| Magic Patterns artifact changes mid-work | Medium | Medium | Staleness gate before coding and release. Refresh truth matrix on change. |
| Web deploy risks production data | High | Low | Fresh SQLite backup, restore plan, tests/build, live smoke, rollback notes. |

---

# **Agent Execution Contract**

The implementation agent must:

1. Treat this PRD as the product source for web/desktop revamp.
2. Re-check Magic Patterns status and active artifact before coding.
3. Snapshot required source docs before coding.
4. Create the web design truth matrix and baseline evidence before coding.
5. Implement every screen in the Web Screen Acceptance Matrix.
6. Match Magic Patterns visual and interaction intent after production-truth adaptation.
7. Exclude deferred/blocked prototype behavior from completion metrics and release claims.
8. Fix contrast/token gate before broader web parity work.
9. Maintain `UX_v2/execution/UX_V2_EXECUTION_TRACKER.md` and `/private/tmp/ai-brain-ux-v2-main-ready/RUNNING_LOG.md` after milestones, blockers, decisions, QA, deploy, and final result.
10. Run code review and fix P0/P1 before release.
11. Deploy only when every hard gate below passes.
12. Final summary must state shipped, validated, adapted, deferred, blocked, live URL, evidence paths, and next steps.

## **Release Gate**

No release if any of these are true:

- failing tests/build;
- unresolved P0/P1;
- missing backup or rollback source;
- broken primary action, selected-control, nav, drawer, or badge contrast;
- Magic Patterns artifact status not freshly checked;
- missing source snapshot/manifest;
- incomplete Web Screen Acceptance Matrix validation;
- deferred/blocked prototype behavior visible as active shipped UI;
- destructive/mutating action visible without real behavior and tests;
- unvalidated changed critical web screen;
- unknown data/client-state risk;
- missing deploy access;
- stale `AI Brain`, fake offline sync, QR, telemetry, E2EE, backup/export, provider-health, connected-device, or delete-all-data claim;
- unredacted token/content evidence in shared reports.

## **Definition Of Done**

The web revamp is done when:

- every screen in the Web Screen Acceptance Matrix is implemented or production-truth adapted;
- every deferred/excluded prototype behavior is absent, disabled, or truthfully labeled and excluded from completion;
- visual fidelity evidence exists for required desktop viewports;
- contrast/token gate passes;
- authenticated web route validation passes for all changed protected routes;
- capture, Ask, pairing, repair, topic, collection, and safe organization interactions are validated with real data/API behavior;
- tests/build/code review pass with no unresolved P0/P1;
- backup, rollback, deploy, and live smoke are documented;
- final release notes state shipped, validated, adapted, deferred, blocked, live URL, evidence paths, and residual risk.
