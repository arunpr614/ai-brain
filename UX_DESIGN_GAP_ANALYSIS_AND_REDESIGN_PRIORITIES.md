# AI Brain UX Gap Analysis And Redesign Priorities

Created: 2026-06-11
Purpose: Design critique and recommended redesign sequence.

## Executive Summary

AI Brain has a strong technical and product foundation, but the next redesign should not chase all planned features at once. The most valuable design work is to make the current capture-to-memory loop feel trustworthy and intentional.

The next UI/UX focus should be:

1. Capture Review Inbox.
2. Weak capture upgrade flow.
3. Source-grounded item detail.
4. Quality-aware scoped Ask.
5. Android capture/offline reading.
6. Browser selected-text capture.

GenPage, GenLink, Flow, graph, and full SRS should be designed later, after the source-quality loop is stable.

## What Is Working

### 1. The Product Has A Clear Soul

The "Structured Calm" design philosophy is right for this product. The app should feel like a reading/thinking environment, not a dashboard.

### 2. The Pipeline Mental Model Is Strong

Capture -> extract -> enrich -> store -> surface is a good foundation. The current product now needs to formalize repair/reuse as part of that loop.

### 3. Current Screens Already Have Trust Seeds

The app already includes:

- Capture quality labels.
- Item detail capture diagnostics.
- Related items.
- Citation chips.
- Per-item Ask.
- Bulk organization.
- Device pairing.

These should be refined, not thrown away.

### 4. Recent Product Strategy Is Mature

The competitor research correctly recommends avoiding clone behavior. The current best wedge is trustworthy personal capture and retrieval, especially for YouTube, Shorts, LinkedIn, Substack, PDFs, and notes.

## Main UX Gaps

## Gap 1: Weak Captures Are Visible But Not Yet Workflowed

Current:

- Library rows show platform and quality.
- Item detail has capture diagnostics and hints.

Missing:

- Dedicated Needs Upgrade / Capture Review surface.
- Inline upgrade action.
- Row-level next action.
- Clear "updated existing item" state.

Design impact:

- The product knows a capture is weak, but the user still has to figure out what to do.

Priority:

- P0.

## Gap 2: Ask Is Not Yet Quality-Aware

Current:

- Ask retrieves chunks and shows citation chips.
- Per-item Ask exists.

Missing:

- Scope selector.
- Selected-item Ask.
- Quality filter.
- Weak-source warnings.
- Citation expansions showing quality and passage.

Design impact:

- The user may over-trust answers from weak sources or under-use Ask because scope control is vague.

Priority:

- P1 after Capture Review.

## Gap 3: Item Detail Mixes Reading And Operations

Current:

- Item body and right rail contain many useful pieces.

Missing:

- Clear hierarchy between source reading, digest, diagnostics, organization, and repair.
- Focus mode.
- Mobile tabbed item detail.
- Passage/highlight model.

Design impact:

- The item page risks feeling like a database record instead of a reading surface.

Priority:

- P0/P1 because item detail is the core trust screen.

## Gap 4: Android Is Responsive Web, Not Yet A Designed Companion

Current:

- Mobile bottom nav exists.
- APK/share/offline plans exist.

Missing:

- Android-first capture sheet.
- Share landing flow.
- Offline read state.
- Sync/available-offline feedback.
- Mobile-specific item detail tabs.

Design impact:

- The phone is strategically important, but the UX is still inherited from desktop.

Priority:

- P1 if phone is a daily reading surface; P2 if phone is mostly capture input.

## Gap 5: Visual Direction Has An Open Fork

Current:

- Production design: indigo, Inter, Charter, Radix Slate.
- Alternative spec: green, Newsreader, Inter, Material-style surfaces.

Issue:

- The alternative green spec has good editorial potential but carries adoption risks and unresolved dark-mode decisions.

Design impact:

- A redesign should evaluate visual direction through prototypes, not adopt a token swap by default.

Priority:

- P1 design decision before high-fidelity mockups.

## Gap 6: Future Nav Creates Expectation Debt

Current:

- Current code shows GenPages and Review as disabled "soon."
- Design docs include Flows, Explore, Review, GenPages, etc.

Issue:

- Disabled nav can make the product feel unfinished.

Recommendation:

- Keep future features out of primary nav until the next design direction defines their purpose.
- Use command palette or roadmap/settings for future labels if needed.

## Recommended Redesign Sequence

## Phase A: Product Frame And IA

Design questions:

- Is the first screen Library or Home/Inbox?
- Is "Needs Upgrade" a top-level nav item, Library filter, or Home module?
- Should future features appear in nav now?
- What is the naming system: Capture Review, Needs Attention, Inbox, or Triage?

Deliverables:

- IA map for web and Android.
- Navigation model.
- Quality state language system.

## Phase B: Capture Quality Loop

Prototype:

- Library with quality filters.
- Needs Upgrade queue.
- Weak item detail.
- Upgrade form.
- Upgrade success/refreshing state.

Design details:

- Platform-specific hints.
- "Good enough" action.
- Repair vs retry distinction.
- Duplicate/upgrade copy.

## Phase C: Source-Grounded Ask

Prototype:

- Ask page with scope selector.
- Ask selected items from Library.
- Citation expansion.
- Weak-source warning.
- Source panel.

Design details:

- Citation chip variants.
- Scope summary.
- Retrieval state.
- Follow-up behavior.

## Phase D: Android Companion

Prototype:

- Mobile home/library.
- Share-sheet landing.
- Capture sheet.
- Weak capture upgrade on mobile.
- Offline item detail.
- Sync status.

Design details:

- Bottom nav.
- FAB vs capture tab.
- Safe area.
- Offline vs unreachable copy.

## Phase E: Browser Selected-Text Capture

Prototype:

- Extension popup.
- Context-menu selected text save.
- Success/upgrade acknowledgement.
- Optional note.

Design details:

- Minimal permissions explanation.
- "Upgrade existing item" state.
- LinkedIn/Substack use cases.

## Phase F: Future Learning/Generation

Prototype after the trust loop:

- Weekly digest.
- Briefing from selected sources.
- GenPage and GenLink.
- Lightweight Review.
- Flow.
- Graph/Explore.

## Screen Priority Matrix

| Screen/Flow | Priority | Why |
|---|---|---|
| Library with quality filters | P0 | Main browse/triage surface |
| Needs Upgrade queue | P0 | Turns quality labels into workflow |
| Weak item detail + upgrade form | P0 | Repairs trust loop |
| Ask with scope/quality | P1 | Prevents over-trusting weak sources |
| Citation passage navigation | P1 | Makes answers verifiable |
| Android share landing | P1 | Phone capture is key |
| Android offline item read | P1/P2 | Depends on phone reading usage |
| Browser selected-text capture | P1 | Best path for LinkedIn/Substack |
| Settings/device trust | P2 | Important but not primary daily use |
| Weekly review | P2 | Useful after capture quality stabilizes |
| GenPage/GenLink | P3 | Big bet, later |
| Graph | P3 | Defer until corpus is large/clean |

## Visual Direction Recommendation

Run three lightweight visual directions before committing:

1. Refined Current
   - Indigo, Charter, Inter, Radix Slate.
   - Best if continuity and low adoption risk matter.

2. Editorial Green
   - Green/Newsreader direction from `DESIGN_STRUCTURED_CALM_GREEN.md`.
   - Best if the product needs stronger reading/editorial identity.
   - Must solve dark mode and avoid Material-heavy app feel.

3. Neutral Archive
   - Warmer monochrome neutral with restrained blue/green accent.
   - Best if the app should feel more like a private library/archive than a productivity tool.

Evaluate each against the same five screens:

- Library populated.
- Needs Upgrade queue.
- Item detail with weak capture repair.
- Ask with citations.
- Android share/capture.

## Naming Recommendations

Prefer:

- Needs Upgrade
- Source Quality
- Add transcript or notes
- Pasted text
- Preview only
- Metadata only
- Ask selected
- High-quality sources only

Avoid:

- `metadata_only`
- `capture_quality`
- `extraction_method`
- `RAG`
- `chunks`
- `embeddings`
- `provider`
- `pipeline`

Use technical language only in debug/admin contexts.

## Design Decisions To Make Next

1. Should the main first screen be Library or Home/Inbox?
2. Should Needs Upgrade be a first-class nav item?
3. Should the visual refresh use current indigo, green/Newsreader, or a third direction?
4. Is Android a daily reading surface or mainly capture input?
5. Should disabled GenPages/Review remain in nav?
6. What should be the first throwaway prototype: web Library/Needs Upgrade or Android capture?

## Success Criteria For The Redesign

The redesign is successful if:

- A weak capture is visible and repairable in under 30 seconds.
- A user can tell whether an Ask answer used strong or weak sources.
- Item detail feels like a reading surface with trustworthy metadata, not a backend record.
- Android capture and offline states are understandable without technical knowledge.
- The app feels calm and editorial while still exposing power features quickly.
- Future features have a place in the IA without making the current product feel unfinished.

## Recommended Immediate Prototype

Create a throwaway HTML prototype for:

1. Desktop Library with:
   - All / Needs Upgrade / Full Text / Metadata Only filters.
   - Mixed YouTube, LinkedIn, Substack, PDF, note rows.
   - Bulk select and "Ask selected."

2. Capture Review Inbox with:
   - Metadata-only YouTube.
   - Metadata-only LinkedIn.
   - Substack preview.
   - Actions: Add text, open source, mark good enough, delete.

3. Item detail weak capture:
   - Source body/metadata.
   - Right rail source quality.
   - Add transcript/notes form.
   - Success state.

This prototype should be static/clickable and disposable. It should not touch production code.
