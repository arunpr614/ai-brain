# **AI Memory Web Experience Revamp PRD - Revised**

**Team:** AI Memory, Web/Desktop UX
**Author (PM):** Arun / Codex draft
**Triad Partners (Design, Engineering):** Magic Patterns desktop design reference, Codex implementation, Arun product owner
**Legal Contact:** N/A - private single-user app. Re-review required before distribution, telemetry, encryption, destructive data controls, connected-device registry, or account expansion.
**Applicable Countries:** N/A - private personal app
**Market Segments:** N/A - private personal app

**Date last edited:** 2026-06-15 20:27:04 IST
**Doc Status:** Revised execution PRD. This version resolves the adversarial review findings from `WEB_EXPERIENCE_REVAMP_PRD_ADVERSARIAL_REVIEW_2026-06-15_20-20-16_IST.md` and supersedes `WEB_EXPERIENCE_REVAMP_PRD_2026-06-15_18-57-16_IST.md` for web revamp execution.
**Related Links:**
- Magic Patterns desktop design: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Magic Patterns active artifact checked on 2026-06-15: `f3312489-9172-4c3f-bcf8-2352ece9d417`, `isGenerating=false`
- Current web production URL: `https://brain.arunp.in`
- Original web PRD: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_2026-06-15_18-57-16_IST.md`
- Adversarial review: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_ADVERSARIAL_REVIEW_2026-06-15_20-20-16_IST.md`
- Existing UX v2 implementation matrix: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_IMPLEMENTATION_MATRIX_2026-06-15.md`
- Existing production release report: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md`
- Android companion PRD: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- Button contrast implementation plan: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md`
- Open decisions packet: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`

---

# **Overview**

## **Context & Insights**

- AI Memory's web app is the primary desktop surface for reading, organizing, searching, asking, capturing, repairing, pairing, and managing a private memory library.
- The prior UX v2 release shipped a Magic Patterns-inspired web candidate. This revised PRD is stricter: every Magic Patterns desktop screen must map to a production route, every conditional control must pass a capability audit, and every high-trust claim must be backed by real behavior.
- The Magic Patterns desktop artifact provides the target screen set: `DesktopLayout`, `DesktopLibrary`, `DesktopNeedsUpgrade`, `DesktopItemDetail`, `DesktopAsk`, `DesktopCapture`, `DesktopSettings`, `DesktopLogin`, `DesktopPairDevice`, `DesktopTopic`, and `DesktopCollection`.
- Magic Patterns is the visual and interaction source. It is not production truth. It contains prototype-only behavior that must be adapted, disabled, hidden, or separately approved before shipment.
- Risky prototype elements include QR pairing, offline mode, offline sync, fake connected devices, fake provider-health metrics, fake backup/storage charts, destructive delete controls, bulk delete, mark-good-enough, unverified tag/collection mutation drawers, and stale `AI Brain` copy.
- Current production code already includes some real capabilities that must not be accidentally removed: manual library export at `/api/library/export.zip`, provider status at `/api/settings/provider-status`, tag/collection server actions, and code-entry device pairing under `/settings/device-pairing`.
- This PRD resolves the adversarial review by adding required execution artifacts: Web Capability Audit Matrix, Magic Patterns To Production Route Map, Settings Capability Inventory, Pairing Contract, Manual Export Validation, Provider Health Validation Matrix, Mutation Validation Matrix, Forbidden Copy Scan List, Visual Acceptance Rubric, Pre-Production Visual Smoke Gate, and Execution Source Versioning Gate.

## **Problem Statement**

AI Memory's web app needs a complete desktop UX revamp that matches the Magic Patterns desktop design across every approved web screen and state. The current implementation is directionally aligned, but a complete revamp requires a stricter execution contract: screen-by-screen parity, production route mapping, real capability audits, objective visual evidence, accessibility validation, safe deploy gates, and no fake product claims.

This project makes the web experience feel like one coherent, polished AI Memory product. It must not ship fake QR pairing, offline sync, offline cache, telemetry, E2EE, backup, provider-health, connected-device, destructive delete, or mutation behavior that the app does not actually support. It must also preserve real existing capabilities, including manual library export, provider status, code-entry pairing, and safe tag/collection functionality where validated.

## **Adversarial Review Resolution Summary**

| Review finding | Resolution in this PRD | Release impact |
| --- | --- | --- |
| Conditional feature scope was not operationalized | Added required Web Capability Audit Matrix and fail-closed rule for every conditional control. | Release-blocking |
| Magic Patterns route names were not mapped to production routes | Added Magic Patterns To Production Route Map with production URLs and route files. | Release-blocking |
| Visual parity criteria were too subjective | Added Visual Acceptance Rubric with required regions, forbidden text, states, screenshots, and pass/fail evidence. | Release-blocking |
| Backup/export was treated too broadly as fake | Split manual library export from fake backups, storage charts, and automatic backups. | Release-blocking if export is shown |
| Pair Device omitted production pairing contract | Added Pairing Contract covering route, APIs, expiry, exchange, token redaction, and Android validation. | Release-blocking |
| Settings scope could balloon or regress | Added Settings Capability Inventory with Active, Disabled Roadmap, Hidden, or Deferred classification. | Release-blocking |
| Forbidden copy scan was too generic | Added literal forbidden-string scan list. | Release-blocking |
| Source snapshot docs were not explicit | Added required source snapshot checklist and manifest gate. | Release-blocking before coding |
| Provider health lacked state validation | Added Provider Health Validation Matrix. | Release-blocking if shown |
| Mutation validation lacked negative/persistence tests | Added Mutation Validation Matrix. | Release-blocking if mutations are active |
| No explicit pre-production visual smoke | Added local plus staging/deploy-preview smoke gate before production. | Release-blocking |
| Execution docs untracked risk | Added Execution Source Versioning Gate. | Release-blocking before coding |
| Evidence threshold was vague | Added 100% P0 screenshot and interaction evidence thresholds. | Release-blocking |
| Accessibility missed zoom/reduced motion | Added 200% zoom and reduced-motion checks. | Release-blocking for key flows |

---

# **Goals & Metrics**

## **Goals** *What are the key business and customer goals (quant or qual) of this project?*

1. Ship a complete web/desktop UX revamp across every approved Magic Patterns desktop screen.
2. Match Magic Patterns desktop visual hierarchy, navigation, density, component treatment, and interaction model after production-truth adaptation.
3. Make Library, Ask, Capture, Needs Upgrade, Item Detail, Topic, Collection, Settings, Login/Unlock, and Pair Device feel like one polished desktop app.
4. Preserve trust by removing fake prototype claims and replacing them with real AI Memory state.
5. Preserve existing real capabilities such as manual export, provider status, code-entry pairing, and safe organization controls where validated.
6. Validate visual fidelity, accessibility, responsive desktop behavior, data safety, backup, rollback, pre-production smoke, live deployment, and post-deploy smoke.

## **Success Metrics**

### **Primary Metric**

- 100% of P0 screens in the Web Screen Acceptance Matrix are implemented or production-truth adapted and validated against the active Magic Patterns desktop artifact.

### **Supporting Metrics**

- 100% of P0 screen rows have screenshot evidence at required desktop viewports.
- 100% of functional P0 flows have `Web interaction path validated`, not only `Browser visual only`.
- 0 deferred or blocked prototype behaviors counted as web revamp completion.
- 0 stale user-facing `AI Brain`, fake account/device data, fake offline sync, offline cache claim, QR promise, telemetry-control claim, E2EE claim, fake backup state, fake provider-health metric, fake connected-device state, or fake destructive delete state in shipped web UI.
- 0 critical contrast failures for primary actions, selected controls, navigation, badges, dialogs, drawers, and focus states in supported themes.
- 100% of changed protected web routes pass authenticated browser validation.
- 100% of destructive or mutating controls are backed by real production behavior and tests, or are absent/disabled with truthful copy.
- 100% of conditional controls have a completed audit row before implementation, hiding, or deferral.
- Manual library export passes auth, download, filename, zip content, and no-secret validation if visible anywhere in the UI.
- Pair Device passes generate, expire, regenerate, exchange success, exchange failure, token redaction, and Android code-entry validation if claimed complete.
- Provider health passes authenticated success, unauthenticated rejection, degraded/missing-config, user-facing copy, and no-secret leakage validation if visible.
- Magic Patterns artifact status, active artifact ID, and file list are rechecked before coding and before release.
- Full tests, typecheck, lint, build, backup, rollback, local smoke, staging/deploy-preview smoke, live smoke, and visual screenshot matrix pass before deploy.

## **Non-Goals**

- No Android-native redesign in this web PRD.
- No Chrome extension redesign.
- No active offline sync, offline library/cache controls, offline Ask, offline capture, or local download project.
- No QR pairing unless both web QR generation and Android QR scanning are separately approved and validated.
- No product analytics or telemetry.
- No active E2EE, crash-report controls, telemetry toggles, delete-all-data controls, or connected-device management unless fully implemented and validated.
- No fake backup, fake storage chart, fake automatic backup, fake provider health, fake sync status, fake account identity, or fake destructive action.
- No removal of existing real manual library export unless a completed capability audit proves it is broken, unsafe, or intentionally deferred.
- No package ID or APK release changes.
- No embedded YouTube player unless separately approved with privacy/copyright review.

---

# **User Personas / Stakeholders**

## **Users**

- **Primary user: Arun, web AI Memory user**
  - Needs a fast, polished desktop interface for reviewing, organizing, asking, capturing, repairing, pairing, and reading saved memory.
  - Needs trust signals that distinguish full-text items from weak or metadata-only captures.
  - Needs scoped Ask, topics, collections, tags, and Needs Upgrade to feel connected.
  - Needs settings and pairing screens that show real capability, not roadmap fiction.

- **Secondary user: AI implementation agent**
  - Needs explicit route mapping, screen acceptance criteria, capability audits, decision gates, source authority, validation labels, and no-go rules.
  - Must match the Magic Patterns design while adapting prototype-only controls to production truth.
  - Must produce tracker updates, screenshots, release notes, backup/rollback evidence, pre-production smoke evidence, and live smoke results.

- **Secondary stakeholder: Arun as product/release owner**
  - Needs to know what shipped, what matched Magic Patterns, what was adapted, what was deferred, what was validated, and what remains risky.

---

# **Product Decision Authorization**

This table is the approval record for the web revamp once Arun accepts or uses this revised PRD as the execution source. Approved web screens must ship. Deferred feature rows are excluded from completion and must not appear as active working functionality. Conditional rows fail closed: if no completed capability audit row exists, the control must remain hidden or disabled and cannot count toward completion.

| ID | Decision | Status for this web revamp | Product rule | Completion rule |
| --- | --- | --- | --- | --- |
| W-001 | Full desktop screen parity | Approved implementation | Implement every screen in the Web Screen Acceptance Matrix using the MP2 artifact as visual target after production-truth adaptation. | Counts only after route map, visual rubric, screenshot evidence, and interaction evidence pass. |
| W-002 | Desktop shell/sidebar/collapsed nav | Approved implementation | Match `DesktopLayout` navigation, AI Memory identity, Capture entry, active states, collapse behavior, Needs Upgrade badge, and lower utility rows. | Counts toward shell completion after expanded/collapsed screenshots and route-active validation. |
| W-003 | Library filters, select mode, Ask selected | Approved implementation | Implement search, type/quality filters, tag view, selection, selected count, Ask selected, and safe bulk affordances. | Counts toward Library completion after real data and selected Ask validation. |
| W-004 | Bulk add tags/collections | Conditional implementation | Implement only if Web Capability Audit proves production tag/collection mutation support, tests, error handling, persistence, and no fake success. Otherwise hide or disable. | Counts only with completed audit row and mutation validation. |
| W-005 | Bulk delete and item delete | Approved deferral and excluded | Do not ship destructive delete from Library/Needs Upgrade/Item Detail unless confirmation, audit/recovery, tests, and rollback plan exist. | Does not count toward completion. |
| W-006 | Mark-good-enough | Approved deferral and excluded | Hide this action unless a separate state model and audit/reversal behavior is approved. | Does not count toward completion. |
| W-007 | Ask scoped answers and citations | Approved implementation | Implement supported scopes: all/library, selected items, item, tag, topic, collection. Citations must map to real items. | Counts after Ask interaction validation with citations and weak-source states. |
| W-008 | Ask attachments, high-quality-only control, persisted scope-history changes | Approved deferral and excluded | Do not add new attachment persistence, retrieval inclusion toggles, or scope snapshot schema in this web revamp. | Does not count toward completion. |
| W-009 | Capture result states | Approved implementation | Match MP2 Capture visual/result model using real capture APIs and existing result contract. No fake demo cycling. | Counts after URL/PDF/note result-state validation. |
| W-010 | Topic and collection read/Ask views | Approved implementation | Implement read-oriented topic/collection pages, item lists, scope health, scoped Ask, empty states, and search/filter if supported. | Counts after route, visual, scoped Ask, and empty-state validation. |
| W-011 | Topic create-tag and add-to-collection drawers | Conditional implementation | Implement only if backed by real tag/collection mutations and tests. Otherwise hide or disable with truthful copy. | Counts only with completed audit row and mutation validation. |
| W-012 | Collection add-items and rename drawers | Conditional implementation | Implement only if backed by real collection mutation support and tests. Otherwise hide or disable with truthful copy. | Counts only with completed audit row and mutation validation. |
| W-013 | Login/unlock/setup/session/offline states | Approved implementation with adaptation | Match visual treatment, but use AI Memory copy and real auth/session behavior. Offline copy must say server is required unless real offline mode exists. | Counts after public-route screenshots, auth redirect validation, and forbidden-copy scan. |
| W-014 | Pair Device | Approved implementation with adaptation | Code-entry pairing is approved. QR pairing and fake synced-device claims are not approved. | Counts after Pairing Contract validation and Android code-entry validation. |
| W-015 | Settings appearance/access/provider/privacy/status | Conditional implementation | Implement only real settings. Appearance controls may ship if wired. Provider health may show only real provider state. Privacy roadmap controls must be clearly disabled. | Counts only when every setting category is classified in Settings Capability Inventory. |
| W-016A | Manual library export | Conditional implementation as existing real capability | Preserve and restyle manual export if `/api/library/export.zip` passes auth/download/zip/no-secret validation. Hide only with documented audit failure or explicit Arun decision. | Counts only after Manual Export Validation passes. |
| W-016B | Backups, automatic backups, storage charts | Approved deferral and excluded | Hide or clearly disable backup scheduling, automatic backup controls, storage charts, and backup status unless implemented and tested separately. | Does not count toward completion. |
| W-016C | Offline sync, cache controls, clear cache | Approved deferral and excluded | Hide or clearly disable offline sync, offline cache, clear cache, offline Ask, and offline capture unless real offline system exists. | Does not count toward completion. |
| W-017 | Product analytics, telemetry, crash-report controls | Approved deferral and excluded | No analytics or telemetry controls. Disabled roadmap placeholders allowed only if clearly noninteractive. | Does not count toward completion. |
| W-018 | E2EE and delete-all-data | Approved deferral and excluded | No active E2EE or destructive delete-all-data claim. Disabled roadmap placeholders only. | Does not count toward completion. |
| W-019 | YouTube embedded media | Approved deferral for embedded player | Metadata/thumbnail/trust treatment may ship if backed by real data. Embedded player remains excluded. | Metadata may count; player does not. |
| W-020 | Visual fidelity and accessibility | Approved implementation | Every screen must pass screenshot, contrast, keyboard, focus, target size, responsive desktop, 200% zoom, and reduced-motion checks. | Release-blocking. |
| W-021 | Execution source versioning | Approved implementation | All execution-source docs and review artifacts must be committed, copied into source snapshot, or attached to tracker before coding. | Release-blocking before coding. |

---

# **Requirements**

- **User Stories:** How users interact with the web experience.
- **Requirements:** The capability that must exist, plus the behavioral conditions that define correct behavior and done.
- **Mock ups & Prototypes (Magic Patterns, v0):** MP2 is the visual and interaction reference. It is not production-ready code.

## **Requirements**

| Priority | User Stories | Requirements | Dependencies | Mock ups & Prototypes |
| :---- | :---- | :---- | :---- | :---- |
| P0 | As Arun, I want the web app to match the Magic Patterns desktop design across every screen, so that AI Memory feels polished and coherent. | Re-check MP2 status/artifact/file list, snapshot source docs, create a web design truth matrix, create the route map, and implement every screen in the Web Screen Acceptance Matrix. | MP2 artifact `f3312489-9172-4c3f-bcf8-2352ece9d417`; revised PRD; source snapshot; current app code. | All MP2 desktop files. |
| P0 | As Arun, I want route-safe implementation, so prototype route names do not create duplicate or broken screens. | Complete the Magic Patterns To Production Route Map before coding and validate every changed production route. | Current `src/app` route tree; sidebar routing; auth redirects. | All MP2 desktop files. |
| P0 | As Arun, I want conditional controls to be safe, so real capabilities are preserved and fake controls are blocked. | Complete the Web Capability Audit Matrix before implementing, hiding, or counting any conditional control. | Current app APIs/actions/routes; tests; source docs. | Settings, Library, Topic, Collection, Item Detail. |
| P0 | As Arun, I want the desktop shell to feel stable and intentional, so navigation is fast and predictable. | Implement shell/sidebar, collapsed state, route-active states, Capture entry, Needs Upgrade badge, Pair Device link, privacy/trust copy, and content overflow behavior. | `DesktopLayout.tsx`; current `src/components/sidebar.tsx`; route map. | `components/DesktopLayout.tsx`. |
| P0 | As Arun, I want Library to match the desktop design, so scanning, filtering, selecting, and asking are ergonomic. | Implement desktop Library visual hierarchy, search, type/quality filters, tag view, source rows, quality badges, selected count, Ask selected, and safe bulk affordances. | Library routes/data; tags/collections; Ask selected cap. | `pages/DesktopLibrary.tsx`. |
| P0 | As Arun, I want weak captures to be visible and repairable, so I can improve Ask quality. | Implement Needs Upgrade grouped queue, repair actions, weak-source reasons, empty state, and safe actions. Hide mark-good-enough unless separately approved. | Repair route/API; weak-source query; W-006. | `pages/DesktopNeedsUpgrade.tsx`. |
| P0 | As Arun, I want Item Detail to match the desktop design, so reading, metadata, trust, related items, tags/topics/collections, focus, and Ask item feel cohesive. | Implement visual parity for detail layout, trust strip, tabs/sections if present, repair affordance, focus mode, metadata, related items, and scoped Ask. Mutations require real support. | Item detail route; topics/collections/tags; repair; Ask item. | `pages/DesktopItemDetail.tsx`; `components/ui/Tabs.tsx`. |
| P0 | As Arun, I want Ask to use the desktop scoped-answer design, so answers are grounded and source scope is clear. | Implement Ask history/scope panel only if backed by supported data, scope banner, readable-source warnings, citations, answer states, empty/not-enough-text state, and composer. Hide unsupported attachment/retrieval controls. | Ask API/retrieval; citation mapping; scopes. | `pages/DesktopAsk.tsx`. |
| P0 | As Arun, I want Capture to match the desktop design, so saving URL, PDF, and notes has clear outcomes. | Implement URL/PDF/note capture layout, validation, loading, result state surface, duplicate/update/full/limited/preview/needs-upgrade/failure states, and actions. Remove demo cycling. | Capture APIs; result contract; file upload. | `pages/DesktopCapture.tsx`. |
| P0 | As Arun, I want Settings to show real capability only, so I do not confuse roadmap ideas with working controls. | Complete Settings Capability Inventory. Implement active settings only. Disable or hide roadmap/fake settings. Preserve manual export only if validation passes. | Settings routes; export endpoint; provider endpoint; theme controls; taxonomy routes. | `pages/DesktopSettings.tsx`. |
| P0 | As Arun, I want Login, setup, unlock, and session states to match the design without false offline/security claims. | Implement AI Memory-branded login/unlock/setup/session states, errors, loading, recovery copy, and server-required offline copy. Do not claim offline cache, device-only storage, or E2EE unless implemented. | Auth/session code; unlock/setup routes. | `pages/DesktopLogin.tsx`. |
| P0 | As Arun, I want Pair Device to be clear and truthful. | Implement code-entry pairing, generated code lifecycle, expiration, accepted/rejected states, regenerate, exchange, and error handling. Hide QR and fake synced-device claims unless separately approved and validated. | Pairing APIs; token exchange; Android validation; route map. | `pages/DesktopPairDevice.tsx`. |
| P0 | As Arun, I want Topic and Collection pages to match the design, so organization and scoped Ask feel complete. | Implement topic/collection pages, item lists, scope health, scoped Ask, search/filter if supported, empty states, and safe mutation affordances only if real. | Topics/collections routes/data; Ask scopes; mutation audit. | `pages/DesktopTopic.tsx`; `pages/DesktopCollection.tsx`. |
| P0 | As Arun, I want visual fidelity evidence, so the implementation can be checked against the design. | Complete the Visual Acceptance Rubric for every screen/state, capture screenshot matrix, compare expected structure, run copy scans, contrast checks, zoom checks, reduced-motion checks, and interaction smoke. | Browser automation; seeded fixtures; MP2 file list. | All MP2 screens. |
| P0 | As Arun, I want safe deploy and rollback. | Before deploy, run tests/build, create SQLite backup, document rollback source, smoke local and staging/deploy-preview routes, smoke live routes, verify protected routes, and document storage/API changes. | `scripts/deploy.sh`; production backup path; deploy access. | N/A |
| P1 | As Arun, I want keyboard and accessibility support, so the desktop app works like a serious tool. | Validate tab order, visible focus, labels, drawer close behavior, escape/back behavior, 4.5:1 text contrast, 3:1 control boundary contrast, no hover-only critical actions, 200% zoom, and reduced-motion. | Accessibility QA; browser automation. | All MP2 screens. |
| P1 | As Arun, I want production-safe organization controls, so tags and collections do not fake success. | Implement tag/collection add, rename, apply, and remove only if real APIs/tests exist and Mutation Validation Matrix passes. Otherwise adapt to read-only or disabled roadmap UI. | Tag/collection API and tests. | Library, Item Detail, Topic, Collection, Settings. |
| P1 | As Arun, I want provider and privacy settings to be useful without overclaiming. | Show provider health only from real endpoint and pass Provider Health Validation Matrix. Keep privacy controls disabled roadmap if not active. | Provider health endpoint; privacy copy. | `DesktopSettings.tsx`. |
| P2 | As Arun, I want web responsive safety beyond desktop, so the revamp does not regress tablet/small-window use. | Validate 1024px, 1280px, 1440px, and 1920px widths; no text overlap; drawers remain usable; main content scrolls correctly. | Browser screenshots. | All MP2 screens. |
| P3 | As Arun, I want future offline, QR, analytics, backups, and destructive controls captured without accidental shipment. | Document deferred follow-ups with product decision, data safety, UX, and validation requirements. Do not code them in this revamp. | W-016B, W-016C, W-017, W-018, W-014 follow-ups. | Settings, Login, Pair Device. |

## **Magic Patterns To Production Route Map**

This table is required before coding. Every MP2 screen must map to exactly one production route or route state. No prototype route names may be added unless explicitly approved.

| MP2 file | Production route/state | Current route file or component | Auth state | Nav entry | Required smoke |
| --- | --- | --- | --- | --- | --- |
| `components/DesktopLayout.tsx` | Authenticated app shell across protected routes | `/src/components/sidebar.tsx`, `/src/app/(protected layout if present)` | Authenticated | Sidebar + mobile nav | Expanded/collapsed shell on Library, Item Detail, Settings. |
| `pages/DesktopLibrary.tsx` | `/library` and `/` redirect/state | `/src/app/library/page.tsx`, `/src/app/page.tsx` | Authenticated | Library | Default, filtered, tag context, selected state, empty state. |
| `pages/DesktopNeedsUpgrade.tsx` | `/needs-upgrade` | `/src/app/needs-upgrade/page.tsx` | Authenticated | Needs Upgrade | Weak queue, reason groups, empty, repair link. |
| `pages/DesktopItemDetail.tsx` | `/items/[id]`, `/items/[id]?mode=focus` | `/src/app/items/[id]/page.tsx` | Authenticated | Library active | Full item, weak item, metadata-only item, focus mode, related items. |
| `pages/DesktopAsk.tsx` | `/ask`, `/items/[id]/ask`, scoped query states | `/src/app/ask/page.tsx`, `/src/app/items/[id]/ask/page.tsx`, `/src/app/api/ask/route.ts` | Authenticated | Ask | Library scope, selected items, item, tag/topic/collection, citations. |
| `pages/DesktopCapture.tsx` | `/capture` | `/src/app/capture/page.tsx`, `/src/app/api/capture/*` | Authenticated | Capture | URL, PDF, note, invalid, duplicate/update, limited/failure. |
| `pages/DesktopSettings.tsx` | `/settings`, `/settings/tags`, `/settings/collections` | `/src/app/settings/page.tsx`, `/src/app/settings/tags/page.tsx`, `/src/app/settings/collections/page.tsx` | Authenticated | Settings | Categories, active/disabled settings, export, provider, copy scan. |
| `pages/DesktopLogin.tsx` | `/unlock`, `/setup`, `/setup-apk`, expired/session states | `/src/app/unlock/page.tsx`, `/src/app/setup/page.tsx`, `/src/app/setup-apk/page.tsx` | Public/session-dependent | N/A | Unlock, setup, expired, invalid PIN, loading, server unavailable. |
| `pages/DesktopPairDevice.tsx` | `/settings/device-pairing` | `/src/app/settings/device-pairing/page.tsx`, `/src/app/api/settings/device-pairing/*` | Authenticated with redirect from public | Pair Device/settings | Generate, expire, regenerate, exchange, rejected, Android validation. |
| `pages/DesktopTopic.tsx` | `/topics/[slug]` | `/src/app/topics/[slug]/page.tsx` | Authenticated | Library active | Populated topic, limited-source warning, not found, scoped Ask. |
| `pages/DesktopCollection.tsx` | `/collections/[id]` | `/src/app/collections/[id]/page.tsx` | Authenticated | Library active | Populated collection, empty collection, search/sort if supported, scoped Ask. |

## **Web Screen Acceptance Matrix**

| Surface | Magic Patterns reference | Must ship in this revamp | Required adaptations and forbidden content | Required evidence |
| --- | --- | --- | --- | --- |
| Desktop shell/sidebar | `components/DesktopLayout.tsx` | AI Memory identity, sidebar, collapsed state, Capture entry, route-active states, Needs Upgrade badge, Pair Device link, lower trust/privacy row, overflow-safe main area. | Use real badge count. No fake privacy controls. Pair Device link must route to `/settings/device-pairing`. | Authenticated screenshots expanded/collapsed, Library active, Item Detail active-as-Library, Settings active, keyboard nav. |
| Library | `pages/DesktopLibrary.tsx` | Header, search, type filters, quality filters, tag context banner, item rows, quality badges, select controls, selected toolbar, Ask selected. | Bulk tags/collections only if audit passes. Bulk delete hidden/disabled unless destructive flow is real. No fake success toast. | Screenshots for default, filtered, tag view, selected state, empty state, dark theme; selected Ask interaction. |
| Needs Upgrade | `pages/DesktopNeedsUpgrade.tsx` | Grouped weak-source queue, repair-oriented actions, reason groups, item metadata, empty state. | Hide mark-good-enough. Delete hidden/disabled unless destructive flow is real. Retry only if real retry exists. | Screenshots for queue, each reason group where fixture exists, empty state; repair route smoke. |
| Item Detail | `pages/DesktopItemDetail.tsx` | Detail hierarchy, source metadata, trust/quality treatment, repair panel, tags/topics/collections, related items, Ask item, focus mode. | No fake mutation drawers. No embedded YouTube player unless approved. No fake source text. | Screenshots for full item, weak item, metadata-only item, related items, focus mode, tags/topics/collections; Ask item smoke. |
| Ask | `pages/DesktopAsk.tsx` | History/sidebar only if supported, scope banner, readable-source count, weak-source warning, enough/not-enough-text states, citations, composer. | Replace `AI Brain` with `AI Memory`. No unsupported attachments, high-quality-only toggle, or new persisted scope-history. | Screenshots for library scope, selected scope, tag/topic/collection scope, not-enough-readable-text, answer with citations; API interaction evidence. |
| Capture | `pages/DesktopCapture.tsx` | URL/PDF/note tabs, validation, loading, result panel, full/metadata/preview/updated/duplicate/needs-upgrade/failure states. | No demo result cycling. Duplicate/merge/keep-both only if real. PDF size copy must match actual limit. | Screenshots and tests for URL, PDF, note, invalid input, duplicate/update, limited capture, failure. |
| Settings | `pages/DesktopSettings.tsx` | Settings navigation, appearance, tags/collections, provider health if real, privacy roadmap, manual export if valid, truthful offline/backups state. | Hide/disable offline sync, automatic backups, storage charts, fake connected devices, fake provider metrics, telemetry, E2EE, delete-all-data unless implemented. Preserve manual export if validation passes. | Settings Capability Inventory, screenshots for each category, copy scan, disabled-state accessibility, provider/export validation. |
| Login/setup/session | `pages/DesktopLogin.tsx` | Unlock, setup, expired session, server-unreachable/offline fallback, validation error, loading state. | No read-only offline cache claim unless real. No "data stays on your devices" if server stores data. AI Memory naming only. | Public route screenshots for unlock/setup/expired/offline/error/loading; forbidden-copy scan. |
| Pair Device | `pages/DesktopPairDevice.tsx` | Code-entry pairing, code generation/expiry, regenerate, accepted, rejected, expired, server error states. | Hide QR unless Android QR scanner is approved. No "synced" device claim unless actual device state exists. No fake Pixel device. | Pairing Contract, screenshots for code/expired/accepted/rejected/server error, pairing API tests, Android code-entry validation. |
| Topic | `pages/DesktopTopic.tsx` | Topic header, explanation/evidence, item list, scope health, related topics, Ask this topic. | Topics are derived. Create tag/add to collection only if audit and mutation validation pass. Remove "prototype sample" copy from production. | Screenshots for topic with items, limited-source warning, no-topic/not-found, empty topic if possible; scoped Ask smoke. |
| Collection | `pages/DesktopCollection.tsx` | Collection header, description, item count, item list, Ask collection, search/sort if supported, empty state. | Add items/rename only if audit and mutation validation pass. No fake mutation success. | Screenshots for populated collection, empty collection, search/sort, mutation drawer only if real; scoped Ask smoke. |
| UI primitives | `components/ui/Button.tsx`, `Badge.tsx`, `Input.tsx`, `Drawer.tsx`, `Tabs.tsx`, `Card.tsx`, `Checkbox.tsx`, `Select.tsx`, `Separator.tsx` | Desktop component styling aligned to MP2: compact, tool-like, clear focus, consistent radii, readable badges, usable drawers. | No one-off button styles that reintroduce dark-mode contrast bug. No inaccessible icon-only buttons. | Component scan, contrast check, keyboard/focus smoke, 200% zoom check. |

## **Web Capability Audit Matrix**

This matrix must be completed before coding. The initial status below is based on current evidence and must be rechecked by the implementation agent.

| Conditional capability | MP2 source | Current production evidence | Initial decision | Required validation before active UI |
| --- | --- | --- | --- | --- |
| Bulk add tags/collections | Library selected toolbar | Tag/collection actions exist in `/src/app/taxonomy-actions.ts`; bulk UI/API needs audit. | Conditional; fail closed. | Bulk action support, validation errors, persistence, reload, no fake toast, tests. |
| Topic create tag | Topic drawers | Tag actions exist; topic-to-tag product model needs audit. | Conditional; fail closed. | Product model, action support, duplicate handling, persistence, tests. |
| Topic add to collection | Topic drawers | Collection attach action is item-based; topic bulk behavior needs audit. | Conditional; fail closed. | Real target model, item selection behavior, persistence, tests. |
| Collection add items | Collection drawer | Collection attach action exists for item-to-collection. | Conditional; likely active only if UI can use real action. | Add, validation error, duplicate, reload persistence, tests. |
| Collection rename | Collection drawer | `renameCollectionAction` exists. | Conditional; likely active if tests pass. | Rename, validation error, duplicate/name collision behavior, reload persistence, tests. |
| Manual library export | Settings export | `/src/app/api/library/export.zip/route.ts` exists; Settings links `/api/library/export.zip`. | Preserve if validation passes. | Auth 200, unauth 401, zip download, filename, expected Markdown files, no token/secret leakage. |
| Provider health | Settings provider status | `/src/app/api/settings/provider-status/route.ts` exists. | Active if validation passes. | Success, degraded/missing config, unauth 401, no secrets, truthful copy. |
| Appearance/theme | Settings appearance | Theme toggle exists in current Settings. | Active if wired. | Toggle works, persists, keyboard/focus, contrast. |
| Backups/automatic backups | Settings backups | Current Settings shows backup info, but active backup controls require audit. | Disabled roadmap or hidden unless proven real. | Real backup execution, restore, retention, failure state, tests. |
| Offline sync/cache/clear cache | Login/Settings | No approved offline system in this revamp. | Deferred/hidden/disabled. | Separate offline PRD required. |
| Connected devices | Pair/Settings | No approved connected-device registry. | Deferred/hidden/disabled. | Separate registry/data model required. |
| Telemetry/crash report controls | Settings | No telemetry in scope. | Deferred/hidden/disabled. | Separate analytics/consent review required. |
| E2EE/delete-all-data | Settings | No approved E2EE or destructive delete-all-data. | Deferred/hidden/disabled. | Separate security/data-deletion design required. |

## **Settings Capability Inventory**

Every Settings category/control must be classified before implementation and before release.

| Setting/control | Classification | Product rule | Required evidence |
| --- | --- | --- | --- |
| Appearance/theme | Active if current theme toggle is wired | May ship with MP2 styling. | Toggle interaction, persistence, focus, contrast. |
| Collections settings | Active if real settings route/actions pass | May ship with real collection list/create/rename/delete only if tested. | Mutation validation and route screenshots. |
| Tags settings | Active if real settings route/actions pass | May ship with real tag list/rename/delete/promote only if tested. | Mutation validation and route screenshots. |
| Device Pairing | Active | Code-entry pairing only. No QR/fake synced devices. | Pairing Contract evidence. |
| Provider Health | Active only if endpoint validation passes | Show real LLM/embed status; no fake metrics. | Provider Health Validation Matrix. |
| Privacy controls | Disabled Roadmap unless real controls exist | Disabled controls must be clearly noninteractive and truthful. | Screenshot, keyboard/focus, copy scan. |
| Offline | Disabled Roadmap or hidden | No offline mode/cache/sync claim. Server-required copy only. | Forbidden-copy scan. |
| Manual export | Active if validation passes | Preserve real library zip export. | Manual Export Validation. |
| Backups | Disabled Roadmap or hidden unless real backup/restore validated | No fake automatic backup/status/storage charts. | Backup/restore evidence if active; otherwise screenshot of disabled/hidden state. |
| Connected devices | Hidden or Disabled Roadmap | No fake device list or sync status. | Copy scan. |
| Telemetry/crash reports | Hidden or Disabled Roadmap | No analytics controls in this revamp. | Copy scan. |
| E2EE | Hidden or Disabled Roadmap | No active encryption claim. | Copy scan. |
| Delete all data | Hidden | No destructive delete-all-data control in this revamp. | Copy scan. |
| About/version/storage | Active if truthful | Show real app version and storage mode only. | Screenshot, no secrets. |

## **Pairing Contract**

Pair Device is complete only when the real code-entry pairing flow works end to end.

| Contract area | Requirement | Evidence |
| --- | --- | --- |
| Production route | Use `/settings/device-pairing`. Unauthenticated users redirect to `/unlock?next=/settings/device-pairing`. | Browser route smoke. |
| Generate code | Use real `/api/settings/device-pairing` POST behavior. Code must be short-lived. | API/browser interaction evidence. |
| Code expiry | Expired codes are rejected and show truthful recovery. | API test and screenshot. |
| Regenerate | Regenerate creates a new valid code and invalidates or supersedes the old state according to current backend behavior. | API/browser interaction evidence. |
| Exchange | Android or equivalent client can exchange the code through `/api/settings/device-pairing/exchange`. | Android code-entry validation or documented blocker. |
| Failure states | Invalid, expired, already-used, missing-token, unauthenticated, and server-error states are visible and truthful. | Screenshots and API results. |
| Token handling | Tokens, cookies, pairing secrets, and bearer values are never shown in screenshots, logs, reports, or URLs. | Redaction check. |
| QR | QR remains hidden unless web QR generation and Android QR scanning are separately approved and validated. | Copy/DOM scan. |
| Synced device claims | No "synced", fake Pixel, fake last-sync, or fake connected-device claim unless actual device state exists. | Forbidden-copy scan. |

## **Manual Export Validation**

Manual library export is not a fake backup. It is an existing capability that may remain visible if this validation passes.

| Validation | Pass criteria |
| --- | --- |
| Authenticated download | Authenticated request to `/api/library/export.zip` returns `200` and `application/zip`. |
| Unauthenticated request | Unauthenticated request returns `401` or redirects without leaking data. |
| Filename | Response filename is deterministic and user-safe, such as `ai-brain-library-YYYY-MM-DD.zip`. |
| Zip content | Zip contains Markdown files grouped by source type plus README. |
| Redaction | Zip does not include tokens, cookies, server secrets, or internal environment values. |
| UI copy | UI says manual library export, not automatic backup, sync, storage chart, or restore. |
| Failure state | Failed export shows truthful retry/error copy and does not fake success. |

## **Provider Health Validation Matrix**

| State | Requirement | Evidence |
| --- | --- | --- |
| Authenticated success | Provider endpoint returns real LLM/embed state and UI shows truthful status. | API result and screenshot. |
| Unauthenticated | Endpoint rejects unauthenticated request. | API result. |
| Missing/degraded config | UI does not show green/healthy state when provider is degraded or missing. | Forced/configured test or documented blocker. |
| Copy | Copy avoids fake metrics, fake uptime, fake latency, or fake model claims. | Copy scan and screenshot. |
| Secret safety | No provider keys, model secrets, stack traces, or env values are displayed. | API/body scan. |

## **Mutation Validation Matrix**

Any active tag or collection mutation must pass this matrix before release.

| Mutation | Positive path | Negative path | Persistence path | Release rule |
| --- | --- | --- | --- | --- |
| Create collection | Creates real collection from UI. | Empty/duplicate/invalid names handled truthfully. | Reload shows collection. | Active only if all pass. |
| Rename collection | Renames real collection. | Empty/duplicate/invalid names handled truthfully. | Library, collection page, settings reflect rename after reload. | Active only if all pass. |
| Delete collection | Only if destructive flow approved. | Confirmation/recovery/rollback required. | Deleted state persists and does not orphan UI. | Hidden unless separately approved. |
| Add item to collection | Adds real item to collection. | Duplicate/missing item errors handled truthfully. | Item and collection pages reflect change after reload. | Active only if all pass. |
| Remove item from collection | Removes real item from collection. | Missing item/collection errors handled truthfully. | Item and collection pages reflect change after reload. | Active only if all pass. |
| Create/apply tag | Creates or applies real tag. | Empty/duplicate/invalid names handled truthfully. | Item, tag context, settings reflect change after reload. | Active only if all pass. |
| Rename tag | Renames real tag. | Empty/duplicate/invalid names handled truthfully. | Library/tag views/settings reflect rename after reload. | Active only if all pass. |
| Delete tag | Only if destructive flow approved. | Confirmation/recovery/rollback required. | Deleted state persists and does not break filters. | Hidden unless separately approved. |

## **Visual Acceptance Rubric**

Each row in the Web Screen Acceptance Matrix must produce a matching visual evidence row with these fields:

| Field | Required content |
| --- | --- |
| Screen/state | Exact production URL and state, not a prototype route name. |
| MP2 reference | MP2 file and, where available, screenshot or component source snapshot. |
| Required visible regions | Header, sidebar/nav, content areas, panels, drawers, badges, controls, result states. |
| Required interactions | Clicks, keyboard path, form validation, drawer/modal open/close, API-backed action. |
| Forbidden visible text | Any matching forbidden-copy scan terms unless explicitly allowed for disabled roadmap copy. |
| Production adaptations | Specific reason for any difference from MP2. |
| Screenshot paths | Local/staging/live screenshot paths. |
| Evidence label | One of the Web Evidence Levels below. |
| Pass/fail | Explicit pass, fail, blocked, or deferred. |

Visual parity means the production screen matches MP2's layout, hierarchy, density, spacing, interaction intent, component treatment, and state coverage after documented production-truth adaptation. "Looks close" or "matches intent" is not sufficient without completed rubric evidence.

## **Forbidden Copy Scan List**

Release is blocked if these strings or close variants appear as active user-facing claims without explicit disabled-roadmap context and approval:

```text
AI Brain
Offline Mode
read-only access to cached
cached items
stays on your devices
Your Android app is synced
synced
Pixel 8 Pro
Last synced
QR
scan QR
E2EE
end-to-end
delete all data
automatic backups
clear cache
offline sync
telemetry
crash reporting
connected devices
provider metrics
storage chart
```

Required scans:

```bash
rg -n "AI Brain|Offline Mode|read-only access to cached|cached items|stays on your devices|Your Android app is synced|Pixel 8 Pro|Last synced|scan QR|E2EE|end-to-end|delete all data|automatic backups|clear cache|offline sync|telemetry|crash reporting|connected devices|provider metrics|storage chart" src/app src/components
```

If a term appears in code solely as a forbidden-scan test fixture or disabled-roadmap copy, the evidence row must explain why it is safe.

---

# **Milestones / Sequencing Plan**

Launch tier is informational only. This is a private single-user product; GTM tier does not reduce release gates. Treat as Tier 4 for public/customer GTM and Tier 3-equivalent engineering validation rigor.

| MILESTONE | DESCRIPTION OF WHAT'S SHIPPING (Requirements) | TEST KITCHEN (Y/N) | LAUNCH TIER | GA DATE | JPD LINK |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **M0 - Source Freeze, Versioning, And Baseline** | Re-check MP2 artifact, snapshot exact source docs, commit/copy/track execution docs, create baseline, route inventory, and current-state screenshots. | N | N/A private app | TBD | N/A |
| **M1 - Audit Matrices And Truth Contracts** | Complete Web Capability Audit Matrix, Magic Patterns To Production Route Map, Settings Capability Inventory, Pairing Contract, Manual Export Validation plan, Provider Health Validation plan, Mutation Validation plan, and Visual Acceptance Rubric. | N | N/A private app | TBD | N/A |
| **M2 - Foundations And Shell** | Desktop tokens/components, contrast repair, sidebar/collapsed shell, route-active states, safe layout/overflow. | N | N/A private app | TBD | N/A |
| **M3 - Library And Organization Surfaces** | Library filters/select/Ask selected, Topic, Collection, safe tag/collection handling according to audit. | N | N/A private app | TBD | N/A |
| **M4 - Reading, Repair, And Ask** | Item Detail, focus mode, Needs Upgrade, Repair links, Desktop Ask scopes/citations/composer. | N | N/A private app | TBD | N/A |
| **M5 - Capture And Result States** | Desktop Capture URL/PDF/note flows, result states, duplicate/update/limited/failure handling. | N | N/A private app | TBD | N/A |
| **M6 - Settings, Login, Pairing Truth Cleanup** | Settings categories, Login/setup/session states, Pair Device, disabled roadmap controls, manual export, provider status, copy cleanup. | N | N/A private app | TBD | N/A |
| **M7 - QA, Pre-Production Smoke, Release, Deploy** | Full tests/build, screenshot matrix, accessibility, backup, rollback, local smoke, staging/deploy-preview smoke, deploy, live smoke, release notes. | N | N/A private app | TBD | N/A |

---

# **Additional Components & Resources**

The sections below are included because the web revamp touches auth/session states, private content, mutating organization controls, destructive-control prototypes, provider/privacy settings, manual export, device pairing, and production deploy gates.

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

This revamp should not introduce new categories of personal data. It changes presentation and flow handling for existing AI Memory data. Any new logging, analytics, offline storage, QR scanner, export expansion, destructive delete, connected-device registry, or account feature requires separate review.

| Information field | Is collection mandatory or voluntary? | Storage location | Storage: persistent or temporary? |
| :---- | :---- | :---- | :---- |
| Saved item title/source metadata | Existing app behavior; voluntary through capture/share | SQLite on AI Memory server | Persistent |
| Saved note/body/PDF extracted text | Existing app behavior; voluntary through capture/share/repair | SQLite/artifacts on AI Memory server | Persistent |
| Tags/topics/collections | Existing or approved organization behavior | SQLite on AI Memory server | Persistent |
| Session cookie/PIN session state | Existing behavior for authenticated web routes | Browser cookie/session storage | Temporary/persistent per current auth behavior |
| Pairing code and exchange state | Existing pairing behavior; temporary | Server-side pairing/token handling | Temporary |
| Capture result display state | Existing or refined UI state | Browser session/local state and server response | Temporary UI state |
| Manual export zip | User-initiated download | Generated by server and downloaded to user's device | Temporary server response; persistent only if user saves locally |
| Client/server error logs | Existing or extended observability; redacted error codes only | Server logs/client error endpoint | Temporary or retained per existing policy |
| Screenshot/log evidence | QA artifact; may include private item titles | Local execution evidence folder | Temporary/project artifact; redact before sharing |

## **Privacy And Evidence Handling**

- Do not put full titles, URLs, note text, PDF names, tokens, cookies, raw errors, or sensitive payloads in query strings.
- Client/server logs must use stable error codes and redact tokens, cookies, session identifiers, signed URLs, and file names.
- Screenshots and videos are local/private evidence by default.
- Before any screenshot or log is shared outside Arun's local workspace, redact private item titles, URLs, notes, PDF names, tokens, cookies, and session details.
- Final release notes may reference evidence paths, but must not quote private saved content.
- Pairing codes, bearer tokens, cookies, and session values must never appear in screenshots, logs, reports, URLs, tracker rows, or final summaries.
- Manual export validation must not attach or share the full generated zip outside Arun's local workspace.
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
   - User scans saved items in a dense but readable desktop list.
   - User filters by type, quality, and tag.
   - User selects items and asks selected items.
   - Bulk tag/collection actions appear only if the Web Capability Audit Matrix and Mutation Validation Matrix pass.

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
   - Mutation drawers appear only where production supports them and validation passes.

7. **Use Settings**
   - User sees only real active settings or clearly disabled roadmap controls.
   - User can use manual library export if validation passes.
   - Provider health appears only if backed by the real endpoint and validated states.
   - Offline, backups, telemetry, E2EE, connected devices, and destructive controls do not overclaim.

8. **Pair Android**
   - User opens Pair Device at `/settings/device-pairing`.
   - User generates a short-lived code.
   - Android enters the code and exchanges it through the real API.
   - Web shows truthful accepted, rejected, expired, and regenerate states.
   - No QR or fake synced-device claim appears.

9. **Recover and release safely**
   - User receives fresh deployed assets after release.
   - Rollback can restore previous source and database state if needed.
   - Stale assets, broken protected routes, missing source docs, or incomplete visual evidence block release.

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

1. This revised web PRD's product decisions, hard gates, and resolution matrices.
2. Current product truth and existing production behavior.
3. Approved UX v2 final plan and source PRD snapshot.
4. Magic Patterns desktop artifact for visual layout, hierarchy, density, component treatment, spacing, and interaction intent.
5. Current production code and deploy constraints.
6. Prior release reports and open-decision packets.

## **Execution Source Versioning Gate**

Before coding:

- All execution-source docs must be committed, copied into the source snapshot, or linked from the execution tracker.
- If docs remain untracked, create a source snapshot manifest proving the implementation agent has the current files.
- The implementation agent must record the exact git branch, commit hash, dirty state, and untracked source docs in `WEB_EXPERIENCE_REVAMP_BASELINE_<timestamp>.md`.
- No implementation begins until this revised PRD and adversarial review are included in the source snapshot manifest.

## **Required Source Snapshot Checklist**

Snapshot these sources into `UX_v2/execution/source-prds/web-<timestamp>/` before coding:

| Source | Required |
| --- | --- |
| Revised web PRD: this file | Yes |
| Original web PRD: `WEB_EXPERIENCE_REVAMP_PRD_2026-06-15_18-57-16_IST.md` | Yes |
| Adversarial review: `WEB_EXPERIENCE_REVAMP_PRD_ADVERSARIAL_REVIEW_2026-06-15_20-20-16_IST.md` | Yes |
| UX final plan directory: `/private/tmp/ai-brain-ux-v2-main-ready/UX_v2/UX_Final_Plan` if present | Yes |
| Existing implementation matrix: `UX_V2_MAGIC_PATTERNS_IMPLEMENTATION_MATRIX_2026-06-15.md` | Yes |
| Existing production release report: `UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md` | Yes |
| Open decisions packet: `UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md` if present | Yes |
| Button contrast plan: `BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md` | Yes |
| Android companion PRD: `ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Yes, context only |
| Magic Patterns MP2 URL and active artifact/file list | Yes |

The source manifest must include original path, copied path, file size, checksum, timestamp, and read status. Missing required source docs block coding unless explicitly marked unavailable with rationale.

## **Source Freeze And Staleness Gate**

Before coding and again before release:

- Re-check Magic Patterns `isGenerating`, active artifact ID, and file list.
- If active artifact changed, refresh the Web Screen Acceptance Matrix, route map, Visual Acceptance Rubric, and web design truth matrix before implementation continues.
- Create `WEB_EXPERIENCE_REVAMP_DESIGN_TRUTH_MATRIX_<timestamp>.md`.
- Create `WEB_EXPERIENCE_REVAMP_BASELINE_<timestamp>.md`.
- Create or update `WEB_EXPERIENCE_REVAMP_CAPABILITY_AUDIT_<timestamp>.md`.
- Create or update `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_MATRIX_<timestamp>.md`.

## **Web Evidence Levels**

Use these exact labels in tracker, release notes, and final summary:

| Label | Meaning | Completion use |
| --- | --- | --- |
| Web public route validated | Public route loads and renders expected screen/state. | Enough only for public surfaces. |
| Web authenticated route validated | Protected route validated with real authenticated session. | Required for changed protected screens. |
| Web interaction path validated | User can complete the primary interaction using real data/API. | Required for capture, Ask, pairing, repair, export, provider, and mutations. |
| Browser visual only | Screenshot confirms visual layout only, without real data/API interaction. | Cannot claim functional feature completion. |
| Deferred/disabled truth state | Prototype behavior is absent, hidden, disabled, or truthfully labeled. | Counts only as exclusion hygiene, not implementation. |

Evidence thresholds:

- 100% of P0 screens must have screenshot evidence.
- 100% of functional P0 flows must have `Web interaction path validated`.
- `Browser visual only` is acceptable only for nonfunctional visual states or disabled roadmap states.
- Any active API-backed UI without interaction validation blocks release.

Non-waivable changed protected routes:

- `/library`
- `/needs-upgrade`
- `/items/[id]`
- `/items/[id]?mode=focus`
- `/items/[id]/ask`
- `/ask`
- `/capture`
- `/settings`
- `/settings/tags`
- `/settings/collections`
- `/settings/device-pairing`
- `/topics/[slug]`
- `/collections/[id]`

Non-waivable public/session routes:

- `/unlock`
- `/setup`
- `/setup-apk`
- expired-session state if supported
- server-unavailable/offline fallback state if testable

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
- Every screenshot row includes Visual Acceptance Rubric pass/fail.
- Layout hierarchy, nav position, density, badges, cards, drawers, and action placement match MP2 after production-truth adaptation.
- Required visible regions and required interactions are checked explicitly.
- Forbidden visible text is absent or documented as safe disabled-roadmap copy.
- No text overlaps, clipped controls, unstable layout shifts, or hidden critical actions.
- Sidebar collapsed/expanded states are captured.
- Drawer/modal states are captured where included.
- Empty/error/loading states are captured where applicable.
- At least Library, Ask, Capture, Item Detail, Settings, Login/Unlock, and Pair Device are validated in supported light/dark themes if theme support exists.

## **Accessibility Gate**

Release is blocked unless changed P0/P1 screens pass:

- Keyboard tab order for nav, filters, forms, drawers, dialogs, and primary actions.
- Visible focus on all interactive controls.
- Escape/back behavior for drawers/dialogs where present.
- Labels for inputs, selects, toggles, icon-only buttons, and destructive/disabled controls.
- 4.5:1 text contrast for normal text and 3:1 control boundary contrast.
- No hover-only critical actions.
- 200% browser zoom on Library, Ask, Capture, Item Detail, Settings, Unlock, and Pair Device.
- Reduced-motion compatibility for drawers, loading states, transitions, and toasts.

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
- Light/dark screenshots prove the fix on Library, Ask, Capture, Item Detail, Settings, Login/Unlock, and Pair Device.

## **Storage, API, And Data Change Rules**

- No storage/API/data change without migration plan, backup/restore, rollback, test data validation, and failure notes.
- No destructive delete without confirmation, audit/recovery path, tests, and rollback notes.
- No offline storage, queue, cache, or sync behavior in this revamp.
- No new analytics/event collection.
- No fake backup, automatic backup, backup status, restore claim, or storage chart.
- No fake provider health.
- No fake connected-device registry or sync status.
- Manual library export is allowed only if Manual Export Validation passes.
- Existing real API-backed capabilities must not be removed without a completed audit row and explicit rationale.

## **Pre-Production Visual Smoke Gate**

Before production deploy:

1. Run local authenticated smoke for all non-waivable changed routes.
2. Capture local screenshots for required desktop viewports.
3. Run staging or deploy-preview smoke if deploy tooling supports it.
4. Capture staging/deploy-preview screenshots for representative P0 routes.
5. Confirm source docs, screenshot matrix, capability audit, and release notes are attached to tracker.
6. Only then deploy production.

If no staging/deploy-preview environment exists, document that explicitly and perform a local production-build smoke before deploy.

---

## **Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| ----- | ----- | ----- | ----- |
| Prototype behavior copied literally | High | High | Use web decision table, route map, capability audit, and design truth matrix before coding. Block fake QR/offline/privacy/backup/delete/provider claims. |
| "Exact design" interpreted as fake functionality | High | Medium | Visual parity is required only after production-truth adaptation. Deferred controls cannot count as implementation. |
| Conditional controls hide real features or ship fake ones | High | High | Conditional controls fail closed and require Web Capability Audit Matrix rows. |
| Route mismatch creates duplicate or unvisited screens | High | Medium | Magic Patterns To Production Route Map is release-blocking. |
| Manual export regresses because backup/export is treated as fake | High | Medium | Manual export has its own decision row and validation matrix. |
| Pairing looks correct but does not pair Android | High | Medium | Pairing Contract and Android code-entry validation are release-blocking. |
| Settings mixes real, fake, and roadmap controls | High | High | Settings Capability Inventory is release-blocking. |
| Destructive or mutating controls fake success | High | Medium | Require real APIs/tests/persistence/error handling or hide/disable controls. |
| Ask scopes or citations overclaim source quality | High | Medium | Show readable-source health and citations only from real retrieved items. |
| Capture result states misreport save outcome | High | Medium | Use real capture responses and result contract. Remove demo cycling. |
| Private evidence leaks saved content | High | Low | Local-only evidence default, redaction checklist, no raw content in reports. |
| Dark-mode contrast remains broken | High | Medium | Contrast/token gate blocks broader parity work and release. |
| Magic Patterns artifact changes mid-work | Medium | Medium | Staleness gate before coding and release. Refresh matrices on change. |
| Source docs are untracked or missing | High | Medium | Execution Source Versioning Gate and source snapshot manifest block coding. |
| Web deploy risks production data | High | Low | Fresh SQLite backup, restore plan, tests/build, pre-production smoke, live smoke, rollback notes. |

---

# **Agent Execution Contract**

The implementation agent must:

1. Treat this revised PRD as the product source for web/desktop revamp.
2. Re-check Magic Patterns status and active artifact before coding.
3. Snapshot required source docs before coding.
4. Satisfy Execution Source Versioning Gate before coding.
5. Create the web design truth matrix and baseline evidence before coding.
6. Complete the Magic Patterns To Production Route Map before coding.
7. Complete the Web Capability Audit Matrix before coding or hiding conditional controls.
8. Complete the Settings Capability Inventory before implementing Settings.
9. Complete the Pairing Contract before claiming Pair Device completion.
10. Complete Manual Export Validation before showing manual export as active.
11. Complete Provider Health Validation Matrix before showing provider health as active.
12. Complete Mutation Validation Matrix before enabling tag/collection mutations.
13. Implement every screen in the Web Screen Acceptance Matrix.
14. Match Magic Patterns visual and interaction model after documented production-truth adaptation.
15. Exclude deferred/blocked prototype behavior from completion metrics and release claims.
16. Fix contrast/token gate before broader web parity work.
17. Maintain `UX_v2/execution/UX_V2_EXECUTION_TRACKER.md` and `/private/tmp/ai-brain-ux-v2-main-ready/RUNNING_LOG.md` after milestones, blockers, decisions, QA, deploy, and final result.
18. Run code review and fix P0/P1 before release.
19. Run local plus staging/deploy-preview smoke before production deploy, or document why staging is unavailable and run local production-build smoke.
20. Deploy only when every hard gate below passes.
21. Final summary must state shipped, validated, adapted, deferred, blocked, live URL, evidence paths, and next steps.

## **Release Gate**

No release if any of these are true:

- failing tests/build;
- unresolved P0/P1;
- missing backup or rollback source;
- broken primary action, selected-control, nav, drawer, badge, or focus contrast;
- Magic Patterns artifact status not freshly checked;
- missing source snapshot/manifest;
- execution-source docs absent from commit, tracker, or source snapshot;
- incomplete Magic Patterns To Production Route Map;
- incomplete Web Capability Audit Matrix for any conditional control;
- incomplete Settings Capability Inventory;
- incomplete Pairing Contract evidence if Pair Device is claimed complete;
- incomplete Manual Export Validation if export is visible;
- incomplete Provider Health Validation if provider health is visible;
- incomplete Mutation Validation if tag/collection mutations are visible;
- incomplete Web Screen Acceptance Matrix validation;
- incomplete Visual Acceptance Rubric for any P0 screen/state;
- P0 functional flows validated only as `Browser visual only`;
- missing local smoke or staging/deploy-preview smoke evidence;
- deferred/blocked prototype behavior visible as active shipped UI;
- destructive/mutating action visible without real behavior and tests;
- unvalidated changed critical web screen;
- unknown data/client-state risk;
- missing deploy access;
- stale `AI Brain`, fake offline sync, offline cache, QR, telemetry, E2EE, backup, automatic backup, provider-health, connected-device, sync, storage-chart, or delete-all-data claim;
- unredacted token/content evidence in shared reports.

## **Definition Of Done**

The web revamp is done when:

- every screen in the Web Screen Acceptance Matrix is implemented or production-truth adapted;
- every MP2 screen maps to a production route/state;
- every conditional control has an audit decision and evidence;
- every deferred/excluded prototype behavior is absent, disabled, or truthfully labeled and excluded from completion;
- manual export, provider health, pairing, and mutations are either validated or hidden/disabled with rationale;
- visual fidelity evidence exists for required desktop viewports;
- Visual Acceptance Rubric passes for all P0 screens/states;
- contrast/token gate passes;
- accessibility gate passes, including 200% zoom and reduced-motion checks for key flows;
- authenticated web route validation passes for all changed protected routes;
- public/session route validation passes for unlock/setup/session states;
- capture, Ask, pairing, repair, export, provider, topic, collection, and safe organization interactions are validated with real data/API behavior where active;
- tests/build/code review pass with no unresolved P0/P1;
- backup, rollback, local smoke, staging/deploy-preview smoke or documented equivalent, deploy, and live smoke are documented;
- final release notes state shipped, validated, adapted, deferred, blocked, live URL, evidence paths, and residual risk.
