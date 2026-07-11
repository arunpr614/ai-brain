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
