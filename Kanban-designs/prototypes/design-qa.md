# Card Processing Workflow prototype — design QA

**Date:** 2026-07-11
**Classification:** **Explored — not implemented**
**Selected direction:** Direction B — Processing, Inbox-first
**Final result:** **passed** for stakeholder exploration; this is not production accessibility, implementation, or release approval.

## Visual truth and tested build

- Source visual: `../ux/concepts/direction-b-processing-inbox-first.png` (generated concept, 1487×1058).
- Implemented source: `src/App.jsx`, `src/styles.css`, and `item-detail.html` in this isolated prototype project.
- Final tested source SHA-256: `App.jsx dfd593afcc0a8f28763d951cc8491e176f967d1ef0e03f17c7a0f501c37d6c32`; `styles.css 58019201f39f9a6aa3d938844e1e7b500b21f84ef4cda02585fb7de0e8d795be`; `item-detail.html fb61a8f83af52b587c6693def83b54e3bcff900c285dd3c79193458af2ac6973`.
- Selected-direction capture: `screenshots/direction-b-inbox-reference-1487x1058.png` from an in-app Browser viewport configured to 1487×1058. The browser capture surface emitted a 1404×1058 pixel payload; the configured CSS viewport and payload size are recorded separately rather than mislabeled as pixel-identical evidence.
- Required side-by-side comparison input: `screenshots/direction-b-reference-vs-prototype-1487x1058.png` (source on the left, implementation on the right).
- Discovery viewport captures: Direction A, B, and C at configured 1440×1024 and 390×844; selected detail route, loading, error, offline, empty, filtered-empty, local move failure, and conflict evidence.
- Build: `npm run build` passes with five HTML entries: gallery, A, B, C, and route-based item detail.

## Full-view comparison

The implementation preserves the source composition and existing AI Brain language:

- 240px dark application sidebar, current logo, Prism Memory color family, typography hierarchy, thin dividers, and compact controls.
- Inbox-first split between an oldest-first source queue and a read-only decision preview.
- Persistent backlog/throughput/completion metrics, separate User tags and AI topics filters, and Inbox/Board/List/Archived views.
- Source-first rows, quiet status markers, bounded decision actions, and a calm no-streak/no-debt visual tone.

Intentional differences from the generated visual:

- Fictional review data uses 5 Inbox sources rather than the concept's 32; the UI now says `5 sources match in Inbox · 5 total sources in Inbox` instead of mixing incompatible scopes.
- `Process next 3` was narrowed to the honest `Process next` interaction after review showed there was no bounded three-source session.
- Quick preview keeps notes read-only. Full source and note editing use the isolated `item-detail.html` route simulation so return context and draft protection can be tested.
- Generated add-tag/add-topic controls were omitted from quick preview because v2 keeps organization editing in the canonical item surface; the prototype is evaluating workflow decisions, not taxonomy editing.
- Batch controls are absent because v2 removes batch mutation from first-release scope instead of pretending an untested partial-outcome contract is ready.

## Focused-region checks

### Header, metrics, and counts

- Fixed impossible default count (`12 matching · 5 total Inbox`).
- Inbox uses Inbox-scoped matching and total counts; Board/List explicitly say active across all statuses; Archived uses archived scope.
- Loading and initial-load error use em dashes and `unavailable` rather than stale numeric confidence.
- Empty Inbox shows Inbox total 0 while retaining historical processed/completed measures.

### Inbox and decision preview

- No source is selected before `Process next` or an explicit row selection.
- `Leave in Inbox` advances the review cursor without counting a processed event.
- Status changes focus the next Inbox source; Undo restores logical focus.
- User tags, AI topics, workflow state, and archive remain visually and semantically distinct.

### Detail and notes

- Replaced the editable modal described as “canonical” with a separate item-detail route simulation.
- Return URL records direction, view, and source focus; returning restores the source trigger.
- Unsaved notes block in-product return with Save and return / Discard draft / Keep editing and also install a native unload guard for refresh/browser navigation.
- Workflow controls do not save, clear, or submit the note.

### Failure and recovery

- Added directly reviewable local move-failure and version-conflict states.
- Failure copy states whether the source moved, what remained unchanged, and the recovery action.
- Offline keeps read/filter access, disables mutation entry, associates disabled writes with the offline explanation, and does not promise an offline mutation queue.

### Mobile and accessibility-oriented layout

- 390×844 has one-status-at-a-time Board behavior, no four-column horizontal Board, a Library Inbox summary preview, and Processing under More.
- Mobile task controls are at least 44px; the document reserves fixed-navigation clearance with `scroll-padding-bottom` and focus `scroll-margin-bottom`.
- View/status switchers use ordinary pressed buttons rather than incomplete ARIA tabs.
- Added a visible-on-focus skip link, native list semantics for Board columns, source-specific repeated action names, reduced-motion handling, and a measured `--control-border` token. The token contrast is 4.78:1 on background, 4.29:1 on surface, and 3.88:1 on raised controls.
- Dialog focus risk was removed from the selected direction by using a route. Post-mutation focus and route-return focus were verified through the in-app Browser accessibility tree and active-element reads.

## Interaction verification

Using semantic in-app Browser controls, the following were exercised without console warnings or errors:

- start with Process next; select and leave an Inbox source;
- change status via the native source-specific Move control;
- focus the next source after removal from Inbox;
- Undo a move;
- filter User tags and AI topics together and clear them;
- open the full-source route, edit/save a fictional note, protect an unsaved draft, discard, and return to the exact source;
- switch Inbox, Board, List, and Archived;
- archive Done, restore to Done, and explicitly reprocess to Inbox;
- load Normal, Loading, initial load error, Offline, Empty Inbox, Filtered empty, Move failure, and Version conflict states, including stable direct review links through the `scenario` query parameter;
- inspect A, B, and C at desktop and mobile, with zero horizontal document overflow at 390px.

## Finding history

| Severity | Finding | Resolution |
|---|---|---|
| P1 | Matching count compared all statuses/archived against Inbox total | Fixed with view-scoped typed counts and exact labels. |
| P1 | Editable modal contradicted canonical full-route decision | Fixed with isolated `item-detail.html` route and return context. |
| P1 | Unsaved note could be silently discarded | Fixed with explicit Save and return / Keep editing / Discard draft plus unload guard. |
| P1 | Trust-critical mutation failure/conflict not reviewable | Fixed with source-local rollback and 409 conflict fixtures. |
| P1 | Mobile core controls below 44px | Fixed across buttons/selects with fixed-nav focus clearance. |
| P1 | Modal and mutation focus contract incomplete | Modal removed; next-source, Undo, Retry, and route-return focus implemented and verified. |
| P1 | Incomplete ARIA tab pattern | Replaced with ordinary pressed-button semantics. |
| P1 | Required control boundaries below 3:1 | Added measured control-border token above 3:1 on every adjacent dark surface. |
| P2 | Board cards lacked list relationships | Replaced generic card container with native `ul`/`li` semantics. |
| P2 | Repeated Open/Archive/Restore actions lacked source context | Added action-plus-source accessible names. |
| P2 | Offline disabled writes lacked associated reason | Added stable explanation ID and per-control associations; Process next is disabled offline. |
| P2 | Gallery/full-page browser captures showed repaint artifacts | Retained only inspected stable viewport captures or clearly named main-region crops; documented capture-surface dimensions. |

## Residual validation limits

- Multi-value OR-within-facet filtering, production URL normalization, server CAS/idempotency, unknown-outcome reconciliation, deleted/AI-topic-change fixtures, virtualization, 10k/50k performance, and real ingestion defaults remain implementation-plan gates, not prototype proof.
- Batch move/archive is deliberately removed from recommended first-release scope and retained as a future opportunity after single-item trust is validated.
- Manual NVDA, VoiceOver, TalkBack, switch-control, 200%/400% zoom, and production virtualization checks remain no-go gates before implementation authorization. This prototype pass does not supersede `../reviews/accessibility-review.md`.
- The in-app Browser occasionally emitted partially repainted unchanged regions during rapid captures. Unstable files were removed; cropped files are explicitly named as main-region evidence rather than passed off as full-viewport captures.

## Console and final result

- Gallery, Directions A/B/C, item detail, Process next, protected Save-and-return, status movement, filters, archive/restore/reprocess, notes, and all retained direct-link state scenarios: **0 console errors, 0 console warnings** in the final in-app Browser pass.
- Isolated production build: **pass**.
- Visual comparison and responsive inspection: **pass for stakeholder exploration**.
- Production accessibility/release readiness: **not claimed**.

**Final result: passed.**

---

## Stakeholder iteration QA — shared Group & sort, Light and Dark

**Date:** 2026-07-11
**Scope:** Direction B Board and List only
**Classification:** **Explored — not implemented**

### Visual truth and comparison input

- Source visual truth: `references/group-sort-popover-reference.png` (user-supplied compact dark organization popover).
- Focused implementation state: `screenshots/direction-b-group-sort-focused-dark-445x300.jpg`.
- Required combined comparison input: `screenshots/direction-b-group-sort-reference-vs-implementation.png`.
- Full-view evidence: `screenshots/direction-b-board-group-sort-menu-dark-1440x1024.jpg`, `screenshots/direction-b-board-grouped-light-1440x1024.jpg`, `screenshots/direction-b-list-grouped-dark-1440x1024.jpg`, and `screenshots/direction-b-list-grouped-light-1440x1024.jpg`.
- Responsive evidence: `screenshots/direction-b-board-group-sort-mobile-dark-390x844.jpg`, `screenshots/direction-b-board-grouped-mobile-dark-390x844.jpg`, and `screenshots/direction-b-list-grouped-mobile-light-390x844.jpg`.
- Final tested source SHA-256: `App.jsx bc90dc851b876860740a567748d7cb785d7a95ee53e32c23fe975792545e5b17`; `styles.css 9fd48652e8de277ab53b092fd5d092b8bcc63a74fba10272037f65a882943a52`; `item-detail.html fb61a8f83af52b587c6693def83b54e3bcff900c285dd3c79193458af2ac6973`.

### Comparison judgment

- The compact trigger and two-row popover preserve the reference's hierarchy: organization icon, clear Group by / Sort by labels, right-aligned current values, chevrons, dark raised surface, measured border, and restrained shadow.
- The implementation intentionally adds a labeled trigger and one quiet reset action because the requested design needs both discoverability and a safe way back to the recommended Status · Oldest defaults.
- The component uses the prototype's existing typography, Lucide icon set, spacing, radii, color tokens, and focus treatment rather than introducing a separate design language.
- Light mode is composed with explicit surface, border, text, status, navigation, and raised-control tokens; it is not a blanket color inversion.

### Interaction and responsive verification

- Board and List expose the same Group and Sort options and update the URL with `group`, `sort`, and `theme`.
- All eight grouping options and all eight sorting options were exercised through direct review states; every state rendered its expected group count with no console issues.
- Primary AI topic + Title A–Z was exercised in both Board and List; grouped headings, counts, and within-group ordering matched the selected state.
- Workflow-status grouping retains desktop status drag. Every other grouping is view-only and preserves the source-specific Move control as the only status-changing path.
- Light and Dark switches were exercised at 1440×1024. Both layouts had `scrollWidth === clientWidth`.
- Direction B Board and List were inspected at 390×844. Both layouts had `scrollWidth === clientWidth`; mobile Board displayed one selected group at a time; the open organization menu remained legible and reachable above fixed navigation.
- Final in-app Browser pass: **0 console errors, 0 console warnings**.
- Isolated five-entry production build: **pass**.

### Finding history

| Severity | Finding | Resolution |
|---|---|---|
| P1 | Grouping by a taxonomy dimension could be mistaken for moving workflow status | Added explicit view-only copy; disabled pointer drag outside Workflow status grouping; retained source-specific Move controls and status pills. |
| P1 | A dark-only control would not satisfy the requested appearance scope | Added intentional Light and Dark tokens, appearance control, shareable URL state, and full-view evidence. |
| P2 | Separate Board/List organization controls would increase relearning | Reused one component, one option model, one summary format, and one URL contract in both views. |
| P2 | Mobile multi-group Board could collapse into an unusable horizontal canvas | Reused the one-group-at-a-time mobile switcher with horizontally scrollable group choices. |
| P2 | Rapid full-browser menu capture contained an unchanged-region repaint artifact | Removed the unstable capture and retained a stable full capture plus focused comparison crop. |

### Residual validation limits

- This remains fictional in-memory prototype evidence. Real persistence, query performance at 10k/50k, stable-ID normalization, locale-aware title sorting, preference storage/system theme, forced colors, and server parity are not proven.
- Manual VoiceOver/NVDA/TalkBack, switch control, 320px, 200%/400% zoom, text spacing, and real-device validation remain implementation no-go gates.

final result: passed

---

## Approved-design HTML handoff QA

**Date:** 2026-07-11
**Scope:** Direction B design handoff, component specimen, and AI-agent pickup assets
**Classification:** **Explored — not implemented**

### Source truth and rendered evidence

- Approved product source: `screenshots/direction-b-board-group-sort-menu-compact-dark-1440x1024.jpg`.
- Approved focused component source: `screenshots/direction-b-group-sort-focused-compact-dark-324x194.jpg`.
- HTML overview implementation: `screenshots/direction-b-design-handoff-desktop-1440x1024.jpg` at 1440×1024.
- HTML pickup implementation: `screenshots/direction-b-agent-pickup-desktop-1440x1024.jpg` at 1440×1024.
- HTML component implementation: `screenshots/direction-b-group-sort-specimen-desktop-1280x720.jpg`, `screenshots/direction-b-group-sort-specimen-components-1280x720.jpg`, and `screenshots/direction-b-group-sort-specimen-full-1280.jpg` at 1280×720 / 1280×2888 full page.
- Full-view combined comparison: `screenshots/direction-b-handoff-full-reference-vs-html.png`.
- Focused combined comparison: `screenshots/direction-b-handoff-specimen-reference-vs-html.png`.
- Focused rendered specimen crop: `screenshots/direction-b-handoff-dark-specimen-focused-610x333.jpg`.
- Final source SHA-256: `App.jsx 3cc2b8c86fa196412219aa854a1a314478a468a2bcaf759af8f9ecc178f6c2dd`; `styles.css 32bb4a0ad8b59573bf29e51e8fa526050294bd91d9cc463548927cd8e2bad735`; `Handoff.jsx 541a08efd3851a1c4875d895c517b7815487aef472134f9bcf287cdfd4cb4bd0`; `handoff.css 96940093fd7bc6cec9c41edb4b17ea2199ab32cbe286e7597f00c1753e38cdca`; `agent-handoff.json bc9f11b31036c690b6812331ef8d7844223b6cff90592b0e9743b011443ad6e6`. The Handoff and manifest hashes changed only for the 2026-07-12 package relocation metadata and runnable-path correction.

### Required fidelity surfaces

- **Typography:** the handoff reuses the prototype's Georgia display hierarchy and compact system UI scale. The live specimen preserves the approved 11px trigger, 13px row labels, 12px values, and 10px reset text.
- **Spacing and layout:** the live specimen preserves 36px/44px triggers, 322×148px desktop popover, 50px desktop rows, 12px radius, and 390px no-overflow behavior. Documentation sections use the existing 1240px content frame, borders, radii, and spacing rhythm.
- **Colors and tokens:** handoff Light/Dark controls use the existing prototype variables. The component specimen scopes the same semantic surfaces locally so Light and Dark can be inspected side by side without color inversion.
- **Image quality and assets:** approved screenshots are imported as build assets without stretching or lossy recapture. All UI icons use the existing Lucide library; no handcrafted SVG, CSS art, emoji, or placeholder icon was introduced.
- **Copy and content:** the handoff records Direction B, the exact options/defaults, non-status grouping safety, compact measurements, review URLs, branch/PR context, source files, and explicit non-authorization language.

### Interaction and responsive verification

- The handoff appearance switch changed the document from Dark to Light and exposed the pressed state correctly.
- The dark live specimen changed grouping through a native select; Reset restored `Workflow status · Oldest captured`.
- All three HTML assets rendered with zero horizontal document overflow at desktop and emulated 390×844.
- At 390px, the live specimen trigger measured 44px and the navigation/container scroll widths remained equal to their client widths.
- All three pages exposed landmarks, skip link, unique page titles, native links/buttons/selects, exact route URLs, and readable source/guardrail content.
- Final in-app Browser pass across the three assets: **0 console errors, 0 console warnings**.
- Eight-entry Vite production build: **pass**.

### Comparison history

| Severity | Finding | Fix | Post-fix evidence |
|---|---|---|---|
| P2 | New HTML assets were initially absent from the production build input. | Added `designHandoff`, `groupSortSpecimen`, and `agentPickup` Rollup inputs plus handoff warmup entry. | Eight HTML entries in final build output. |
| P2 | Dark desktop and mobile specimens initially shared duplicate accessible select names. | Added unique variant labels and stable specimen test IDs. | Final accessibility snapshot and interaction pass. |
| P2 | First focused QA capture showed a reset-modified state rather than the approved Primary AI topic · Title A–Z state. | Reloaded the pristine specimen, captured the exact source-equivalent state, and regenerated the combined focused comparison. | `direction-b-handoff-specimen-reference-vs-html.png`. |
| P3 | Browser viewport override intermittently changed CSS metrics without matching the capture surface. | Retained only correctly dimensioned desktop captures; verified 390px behavior through same-browser DOM bounds and removed the misleading mobile raster. | File dimension audit plus recorded 390px client/scroll measurements. |

### Residual limits

- These are handoff and exploration assets, not production code or implementation authorization.
- Manual screen-reader, switch-control, forced-colors, 320px, zoom/reflow, text-spacing, and real-device validation remain implementation no-go gates.
- Clipboard copy buttons depend on the browser's secure-context clipboard permission; the commands remain fully readable without clipboard access.

final result: passed

---

## Stakeholder density correction QA — compact existing-pattern alignment

**Date:** 2026-07-11
**Scope:** Direction B Board/List organization trigger and popover
**Classification:** **Explored — not implemented**

### Visual truth and evidence

- Existing compact visual pattern: `references/group-sort-popover-reference.png`.
- Stakeholder-marked oversized state: `references/group-sort-popover-oversized-feedback.png`.
- Revised dark Board full view at 1440×1024: `screenshots/direction-b-board-group-sort-menu-compact-dark-1440x1024.jpg`.
- Revised light List full view at 1440×1024: `screenshots/direction-b-list-group-sort-menu-compact-light-1440x1024.jpg`.
- Revised mobile Board at 390×844: `screenshots/direction-b-board-group-sort-menu-compact-mobile-dark-390x844.jpg`.
- Focused revised implementation: `screenshots/direction-b-group-sort-focused-compact-dark-324x194.jpg`.
- Combined comparison input: `screenshots/direction-b-group-sort-density-reference-feedback-revised.png`.
- Final tested source SHA-256: `App.jsx bc90dc851b876860740a567748d7cb785d7a95ee53e32c23fe975792545e5b17`; `styles.css 7473abcea633a214c1c9d6db1607293927a4d3256d7043277099f7cffda21316`.

### Required fidelity surfaces

- **Typography:** Group by / Sort by moved from 16px to 13px, values to 12px, trigger label to 11px, summary value to 9px, and reset to 10px. These sizes now follow adjacent filter, card-action, and view-control hierarchy.
- **Spacing and layout rhythm:** desktop trigger changed from 42px to 36px, popover from 390px to 322px, rows from 68px to 50px, padding from 10px to 6px, and radius from 18px to 12px. The result reads as a utility menu beside 40px filters rather than a primary task surface.
- **Colors and tokens:** existing theme, border, accent, raised-surface, and popover tokens are unchanged in both Light and Dark; only density changed.
- **Image and icon fidelity:** no raster imagery is part of this control. Existing Lucide organization/sort/reset icons were retained and reduced from 24px/14px to 18px/12px to match the product icon scale.
- **Copy and content:** Group & sort, Group by, Sort by, current values, and Reset to Status · Oldest remain unchanged.

### Comparison history

| Severity | Earlier finding | Fix | Post-fix evidence |
|---|---|---|---|
| P1 | The open popover dominated the Board and did not align with existing control density. | Reduced width, row height, padding, type, icons, radius, and shadow footprint while preserving the two-row anatomy. | Dark Board and combined density comparison. |
| P2 | The trigger was taller and wider than needed beside the 40px filters. | Reduced desktop height to 36px and minimum width to 238px; preserved truncation for long values. | Dark Board and light List full views. |
| P2 | A blanket compact rule would reduce the mobile touch target below the established 44px minimum. | Kept the mobile trigger at 44px while using compact 54px popover rows and 13px labels. | 390×844 Board capture and measured bounds. |

### Verification

- Measured desktop dark and light states: trigger `36px` high; popover `322×148px`; rows `50px`; zero horizontal document overflow.
- Measured mobile state: trigger `44px` high; popover `350×156px`; zero horizontal document overflow.
- Board and List option behavior, URL persistence, status-movement separation, and Light/Dark theme behavior remain unchanged.
- Final in-app Browser pass: **0 console errors, 0 console warnings**.
- Isolated five-entry production build: **pass**.

final result: passed
