# Card Processing Workflow — UX/UI v2

**Status:** **Explored — not implemented**
**Proposal state:** Recommended experience awaiting stakeholder feedback; not an approved build specification.
**Selected direction:** B — **Processing, Inbox-first**.
**Companion:** [PRD v2](../product/prd-v2.md), [technical plan v2](../technical/technical-plan-v2.md), [decision log](../decisions/decision-log.md), [prototype QA](../prototypes/design-qa.md).

## 1. Experience thesis

Processing should feel like making one calm decision about a saved source, not maintaining a project board. Inbox is the landing job; Board and List are alternate lenses over the same lifecycle. The source, notes, Library, tags, AI topics, search, Ask, Related, and Review remain AI Brain—not a second app hidden inside it.

## 2. Direction disposition

| Direction | V2 disposition | What it tests |
|---|---|---|
| A — Workflow, board-first | Preserve as alternative | Spatial overview, repeated desktop movement, board density and PM-drift risk. |
| B — Processing, Inbox-first | **Recommend** | Oldest-first deliberate decision, read-only context, mobile parity, calm metrics. |
| C — Queue, Library-integrated | Preserve as alternative | Maximum Library reuse, dense scanning, future batch posture, weak dedicated habit risk. |

The gallery and all three pages remain reviewable. Their shared fixture engine is a prototype economy, not evidence that the journeys are identical in production.

## 3. Navigation and discovery

### Desktop

- Processing is a sidebar peer of Library.
- Badge is the unfiltered enrolled Inbox total.
- Entering opens Inbox and restores the last valid view/filter only after the first explicit visit.

### Mobile

- Processing lives under More for the initial test.
- Library renders a summary card: `{N} saved sources waiting in Processing` → Open Inbox.
- Capture confirmation: `Saved to Library and Processing Inbox`.
- The prototype exposes the summary at 390×844 as an IA preview.
- Promotion gate: if >20% of test users fail to find Processing, move it to primary navigation before implementation approval.

## 4. Selected desktop layout

```text
Sidebar | Processing header + state selector + Process next
        | Inbox now/oldest | Processed week vs Added | Completed week
        | Inbox | Board | List | Archived
        | scoped matching count | User tags | AI topics | Clear
        | oldest-first Inbox queue | read-only quick preview / decision actions
```

- The queue and preview share the viewport at desktop.
- Nothing is selected initially.
- `Process next` selects the oldest matching Inbox source.
- Quick preview is a hypothesis: source excerpt, provenance/quality, User tags, AI topics, read-only note summary, and decision controls only.
- Full source and note editing navigate to canonical item detail.

## 5. Selected mobile layout

- Header order: classification marker, title, Process next, review-state control, Library summary, metrics, views, counts, filters, results.
- Inbox/List are linear.
- Board shows one status at a time through ordinary pressed buttons; no horizontal four-column board.
- Quick preview collapses; row Open goes to canonical detail.
- Fixed bottom navigation is offset by content/focus clearance.
- Every task target is at least 44×44 CSS px.

## 6. Core interaction flows

### A. Process one source

1. Inbox opens with no selected row.
2. User invokes Process next or a row.
3. Source becomes selected and preview announces title/current status.
4. User selects Leave in Inbox, To Do, In Progress, or Done.
5. Leave creates no workflow event and advances to next matching Inbox source.
6. Move shows Pending until confirmation.
7. Confirmed move announces outcome and places focus on the next matching source.
8. Undo is visible and announced once for the full server-provided 10-second eligibility window; expiry removes the control without moving focus and announces that confirmed state is unchanged.

### B. Board move

- Pointer drag is desktop enhancement; dropping on a status changes status only.
- Every card always has `Move {source title} to` select.
- Mobile uses only the native command.
- No within-column manual rank.

### C. List review

- Same Open/Move/Archive parity as Board for a single source.
- Deterministic status grouping/order.
- No batch selection in first-release proposal.

### D. Full detail and notes

1. Open route records `from=processing`, view, stable filters, anchor ID, and scroll/virtual cursor.
2. Existing item detail remains canonical.
3. Status control is separate from My notes.
4. Unsaved note navigation uses existing Save / Discard / Keep editing safety.
5. Back returns to exact valid anchor/focus; deleted/filtered source falls to nearest valid source or results heading.

Prototype v2 replaces the v1 editable modal with `item-detail.html` route simulation and a tested draft guard.

### E. Archive

- Archive appears only on Done.
- Pending → confirmed/failed/conflicted uses the normal mutation contract.
- Confirmed archive removes source from active Processing and announces it remains in Library.
- Archived view offers Restore to Done and Reprocess to Inbox.
- Reprocess is presented as one explicit compound action; the UI explains both effects.

## 7. View and place preservation

- URL: direction/view, stable filter IDs, status lens, source anchor, cursor/scroll key, and detail return context.
- Local preference: last view and filters after explicit use.
- Back/Forward and bookmark normalize invalid/deleted IDs instead of rendering a broken state.
- View switch keeps filters and best valid source anchor.
- Prototype proves route/view/source return; production filter/cursor URL normalization is an implementation gate.

## 8. Filtering UX

### Contract

- Facets: User tags and AI topics.
- OR within each facet; AND across facets.
- Active chips show value plus facet label where ambiguity exists.
- `No user tags` / `No AI topics` are first-class values.
- Individual remove and Clear all.

### Counts

- Inbox: `5 sources match in Inbox · 5 total sources in Inbox`.
- Board/List: `11 active sources match across all statuses · 5 total sources in Inbox`.
- Archived: archived matching count plus separately labeled Inbox health.
- Column/result headings repeat local matching counts.

Prototype v2 proves one selected value per facet, AND across facets, Clear all, and correct scoped counts. Multi-value chips remain a required production prototype/test before authorization; no artifact claims the current native selects prove OR-within.

## 9. Metrics presentation

- Tile 1: Inbox now + oldest current Inbox-entry age.
- Tile 2: Processed this week + Added this week comparison.
- Tile 3: Completed this week.
- No streak, red debt state, time-in-app, or raw transition total.
- Today may appear only in transient confirmation, not persistent header.
- Loading/initial error shows em dash + unavailable, never stale certainty.
- Empty Inbox shows 0 while historical week metrics remain.

## 10. State model and fixture copy

| State | Surface | Required copy/action/focus |
|---|---|---|
| Normal | full UI | typed counts, no preselection, Process next. |
| Loading | stable shell + skeleton | unavailable metrics; announce Loading Processing. |
| Initial load error | stable shell + alert | `Processing could not load. Your sources are unchanged.` Retry focused. |
| Empty Inbox | Inbox only empty; other views remain truthful | `Nothing waiting for a decision`; Capture, Browse Library. |
| Filtered empty | current view | `No sources match these filters`; total Inbox remains; Clear all. |
| Offline | banner + loaded data | read/filter/open allowed; writes disabled with explanation; no queue. |
| Mutation pending | one source | Pending marker; action remains mounted for focus. |
| Local failure | one source rollback | `{title} was not moved`; unchanged status; Retry. |
| Unknown outcome | one source | Checking outcome; do not invite blind retry until mutation lookup. |
| 409 conflict | one source | show authoritative status; Use current version; original intent not applied. |
| Deleted/inaccessible | result/detail | remove/close source-locally; announce; focus next valid target. |
| AI topic changed | filtered result | announce changed filter membership/count; focus next valid target. |
| Undo success/expiry/conflict | toast + live region | show the 10-second eligibility, restore/focus on success, or explain expiry/conflict without implying state changed. |
| Unsaved note | canonical detail | Save / Discard / Keep editing; workflow action never clears draft. |
| Legacy enrollment | first use / Library selection | exact count preview; selected/recent 30 days capped 25/all. |

The working prototype directly exposes Normal, Loading, initial error, Empty, Filtered empty, Offline, local move failure, and 409 conflict. The remaining trust states are specification fixtures and pre-implementation gates, not claimed prototype proof.

## 11. Accessibility specification

### Semantics

- Skip to Processing content is first focusable control.
- Sidebar `nav`, one `main`, native headings/lists.
- Board columns are labeled sections containing `ul`/`li` cards.
- View and mobile-status switches are ordinary pressed buttons unless a complete tabs pattern is chosen.
- Repeated names are `Open {title}`, `Archive {title} from Processing`, `Restore {title} to Done`, `Reprocess {title} to Inbox`.

### Keyboard and focus

- Native Move is the universal action.
- After Inbox exit: next matching source, then previous, then empty/results heading.
- Board move: moved card in destination, else destination heading.
- Archive/restore/reprocess: next valid source or view heading.
- Undo: restored source if visible, otherwise scoped result heading.
- Retry/conflict/deleted/filter changes follow the same deterministic fallback.
- Canonical detail return targets exact trigger/anchor.

### Dynamic announcements

- One pre-existing polite region: filter counts, pending/confirmed move, Undo availability, note save, view change.
- One alert region: failure, conflict, unknown outcome, deleted/inaccessible.
- Visual toast does not duplicate the live message.

### Visual/touch/motion

- 44×44 mobile task targets.
- 4.5:1 body text; 3:1 large text and meaningful control/focus boundaries.
- V2 prototype control-border measurements: 4.78:1 background, 4.29:1 surface, 3.88:1 raised.
- Visible 2px accent focus; status never color-only.
- Reduced motion disables travel/transition without removing outcome messaging.

### No-go manual matrix

- Keyboard-only at desktop/mobile widths.
- NVDA + Chrome, VoiceOver + Safari macOS/iOS, TalkBack + Chrome Android.
- 320px, 360×800, 390×844, 412×915, 1024×768, 1280×800, 1440×1024.
- 200% and 400% zoom, text spacing, high contrast, switch control.
- Virtualized focus after move/error/conflict/Undo.

## 12. Responsive specification

| Width | UX |
|---|---|
| ≥1180 | full split Inbox, four-column Board, dense List. |
| 768–1179 | single-column Inbox queue followed by preview; Board may horizontally contain columns inside its own region only if no page-level two-dimensional scroll. |
| ≤767 | sidebar hidden, bottom nav, one-status Board, quick preview hidden, route detail stacked, 44px controls. |

Fixed nav uses actual safe-area height in padding, `scroll-padding-bottom`, and focus `scroll-margin-bottom`.

## 13. Design language

- Reuse current AI Brain logo, sidebar density, Prism Memory dark surfaces, type scale, 6–10px radii, thin dividers, and Lucide icons.
- Stronger control-boundary token is scoped to interactive elements; decorative dividers stay quiet.
- No emoji, fake assets, decorative graph, bright backlog guilt, or new PM metaphors.

## 14. Prototype package

- Gallery: `../prototypes/index.html`.
- Direction A: `direction-a.html`.
- Direction B: `direction-b.html`.
- Direction C: `direction-c.html`.
- Canonical detail simulation: `item-detail.html`.
- QA evidence: `../prototypes/design-qa.md` and `../prototypes/screenshots/`.

The prototype uses fictional in-memory data, no production imports/API/persistence, and a persistent non-production marker.

## 15. Review finding resolutions

- Corrected impossible counts and recorded typed scopes.
- Replaced cosmetic Process next 3 with honest Process next; Leave now advances.
- Replaced modal-as-canonical with route simulation and draft protection.
- Implemented next-source/Undo/return focus, skip link, list semantics, pressed-button view controls, contextual names, contrast, and 44px targets.
- Added directly reviewable local failure and conflict.
- Explicitly narrowed current prototype evidence for multi-select, URL normalization, unknown/deleted/topic-change, AT, and scale.
- Removed batch from first-release scope rather than presenting a missing flow as accepted.

## 16. Stakeholder validation questions

1. Processing vs Inbox vs Queue comprehension.
2. Read-only quick preview value vs direct canonical detail.
3. Mobile More + Library summary discoverability.
4. Recent-enrollment cap 25.
5. Weekly metric pressure and usefulness.

## 17. No authorization

This UX package is a high-fidelity throwaway exploration. It does not authorize production UI, routes, migrations, APIs, flags, or rollout.

## 18. Stakeholder-selected Direction B iteration: organization and appearance

Direction B remains the selected design direction. Board and List now use the same compact **Group & sort** disclosure so a person can understand and change both dimensions from one predictable place.

### Grouping

- Workflow status
- Primary User tag
- Primary AI topic
- Source type
- Capture channel
- Capture quality
- Capture age
- No grouping

Grouping other than Workflow status is view-only. It never changes an item's workflow state, and the UI states this directly. On mobile, Board shows one selected group at a time to avoid a compressed multi-column canvas.

### Sorting

- Custom fixture order
- Oldest captured
- Newest captured
- Title A–Z
- Title Z–A
- Workflow status
- Source type
- Capture channel

The selection applies consistently to Board cards and List rows. Group and sort choices are encoded in the prototype URL so a reviewer can share an exact state.

### Light and Dark appearance

Both modes are intentionally composed from the prototype's existing tokens and components. The appearance switch is available in the main header and item-detail route, persists in review links, and retains the same content, interaction, and hierarchy across modes. This is prototype evidence only; production preference storage, system-preference behavior, forced-colors support, and manual contrast/zoom validation remain implementation gates.
