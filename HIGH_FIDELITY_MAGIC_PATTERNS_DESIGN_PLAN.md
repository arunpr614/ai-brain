# AI Brain High-Fidelity Magic Patterns Design Plan

Created: 2026-06-13
Purpose: Plan the next phase of AI Brain design work: converting the approved low-fidelity wireframes into high-fidelity Magic Patterns UI/UX designs for web and Android.
Status: Executed on 2026-06-13. High-fidelity web and Android Magic Patterns projects have been created.

## Execution Result

- Web project: https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx
- Web active artifact: `2ec436e0-3291-43ff-9043-56d79ec1f008`
- Android project: https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r
- Android active artifact: `301bfd78-c23b-4b11-b8ff-27ed3c425699`
- Review package: `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`

## Design Brief

AI Brain is a private, source-grounded personal knowledge and memory system.

The high-fidelity work should make the product feel:

- Private and trustworthy.
- Calm enough for long reading.
- Sharp enough for source repair and evidence-backed Ask.
- Visually connected to the prism brain identity.
- Cross-platform consistent in concepts, but platform-native in layout.

The core product loop remains:

```text
Capture -> Confirm -> Review -> Repair -> Read -> Ask -> Revisit
```

## Source References

### Magic Patterns Wireframes

- Wireframe editor: https://www.magicpatterns.com/c/ab5mjebwjwf7xvh8veffs2
- Wireframe preview: https://project-ai-brain-redesign-wireframes-web-and-android-988.magicpatterns.app
- Current wireframe active artifact: `accf3e98-6453-4e6a-b097-5c3cee36b9cb`
- Role: functional and interaction reference.

### Magic Patterns Design System

- Design system URL: https://www.magicpatterns.com/design-system/ds-360d8a8f-1194-4f6b-8365-16ba1e738db7/components
- Design system ID: `ds-360d8a8f-1194-4f6b-8365-16ba1e738db7`
- Design system name in Magic Patterns: `AI Memory`
- Role: visual source of truth for high-fidelity projects.

### Local Design References

- Design system markdown: `UX_DESIGN_SYSTEM_PRISM_MEMORY.md`
- Design system HTML: `UX_DESIGN_SYSTEM_PRISM_MEMORY.html`
- Wireframe handoff log: `MAGIC_PATTERNS_WIREFRAMES_PROJECT.md`
- Product/design approach: `UX_REDESIGN_APPROACH_WEB_AND_MOBILE.md`
- Web/Android parity audit: `UX_WIREFRAME_WEB_ANDROID_PARITY_AUDIT.md`
- Feature inventory: `UX_DESIGN_FEATURE_AND_INTERACTION_INVENTORY.md`
- User journeys: `UX_DESIGN_USER_JOURNEYS.md`

## Output Strategy

Create two separate Magic Patterns projects:

1. `AI Brain Web - High Fidelity`
2. `AI Brain Android - High Fidelity`

The projects should be separate so each platform can have its own layout density, navigation posture, and interaction model.

Shared design language should come from the `AI Memory` Magic Patterns design system.

Shared product concepts should include:

- Source platform.
- Captured via.
- Source quality.
- Capture result.
- Repair state.
- Ask scope.
- Ask citations.
- Ask history.
- Tags.
- Included topics.
- Collections.
- Offline/readability states.
- Login/unlock and device pairing.

## Non-Goals

This phase will not:

- Implement production code.
- Change backend behavior.
- Add real user/customer data.
- Add new product features beyond the approved wireframe scope unless explicitly approved.
- Design the Chrome extension or Telegram bot UI in high fidelity, except where their capture sources appear inside web and Android surfaces.

## Data And Privacy Rules

Magic Patterns should receive only sanitized product context and fake content examples.

Use realistic but fake sample data for:

- Article titles.
- YouTube transcripts.
- LinkedIn posts.
- Substack previews.
- PDF names.
- Manual notes.
- Ask conversations.
- Tags, included topics, and collections.

Do not send secrets, local environment values, private metrics, credentials, real personal notes, or non-public implementation details into Magic Patterns prompts.

## Design Direction

Use the Prism Memory direction:

- Near-white app surfaces.
- Deep ink/navy text and structure.
- Crisp borders over heavy shadows.
- Saturated prism colors as semantic accents, not decoration.
- 8px maximum card radius unless a Magic Patterns component requires otherwise.
- Source quality, source platform, Ask scope, and repair states drive color use.
- Reading content stays calm; operational state stays legible.

Important visual rule:

```text
Use color as information, not decoration.
```

## Phase 0: Plan And Source Lock

Goal:

- Confirm references before creating the high-fidelity projects.

Inputs:

- Current wireframe project.
- `AI Memory` design system.
- Local UX design documents.
- Existing parity audit and latest Android item-detail debug fix.

Tasks:

- Confirm the active wireframe artifact.
- Confirm the Magic Patterns design system ID.
- Create this phase plan.

Deliverable:

- `HIGH_FIDELITY_MAGIC_PATTERNS_DESIGN_PLAN.md`

Exit criteria:

- The plan identifies the project split, source references, phases, screen inventory, and review gates.

## Phase 1: High-Fidelity Foundation Pass

Goal:

- Translate the low-fidelity wireframe language into a high-fidelity visual system that can be applied consistently to both platforms.

Tasks:

- Review the `AI Memory` design system components and tokens in Magic Patterns.
- Review the Prism Memory local design system document.
- Create a compact high-fidelity style brief for Magic Patterns prompts:
  - typography usage,
  - layout density,
  - semantic color rules,
  - badge and chip behavior,
  - right rail/card behavior,
  - bottom sheet behavior,
  - Android tab and FAB behavior.
- Define shared fake content data for both projects so web and Android can be compared cleanly.

Deliverable:

- A short local brief section appended to this plan or a companion `HIGH_FIDELITY_STYLE_BRIEF.md`.

Exit criteria:

- The visual rules are precise enough to prompt Magic Patterns without drifting into generic SaaS UI.

## Phase 2: Create Web High-Fidelity Project

Goal:

- Create the separate Magic Patterns project for the web experience.

Magic Patterns action:

- Create a new design named `AI Brain Web - High Fidelity`.
- Use design system ID `ds-360d8a8f-1194-4f6b-8365-16ba1e738db7`.
- Use the approved wireframes as the functional reference.
- Generate desktop-first high-fidelity screens.

Required web screen inventory:

- Login / Unlock.
- First run / setup PIN.
- Device pairing.
- Library default.
- Library search results.
- Library source-type and quality filters.
- Library multi-select with Ask selected.
- Needs Upgrade queue.
- Capture page.
- Capture result states:
  - saved full text,
  - saved metadata only,
  - saved preview only,
  - updated existing item,
  - duplicate candidate,
  - needs upgrade action.
- Item detail: full-text article.
- Item detail: YouTube transcript.
- Item detail: PDF.
- Item detail: manual note.
- Item detail: metadata-only / needs upgrade.
- Item detail: preview-only.
- Item detail: transcript added / enriching.
- Item detail: citation jump.
- Item detail: item-scoped Ask.
- Ask: new conversation.
- Ask: selected conversation with history.
- Ask: collapsed global nav.
- Ask: collapsed Ask history sub-navigation.
- Ask: expanded Ask history sub-navigation.
- Ask: source evidence panel.
- Ask: weak-source warning.
- Settings.
- Settings detail groups:
  - access,
  - devices,
  - offline sync,
  - backup/export,
  - data and privacy,
  - providers/model health in user language,
  - appearance,
  - tags and collections.
- Empty, loading, enriching, offline/cache, and error states where relevant.

Required web interactions:

- Global left navigation expand/collapse.
- Ask history sub-navigation expand/collapse.
- Library row opens item detail.
- Source/quality filters update visible content.
- Bulk select enables Ask selected.
- Needs Upgrade row opens weak item detail.
- Add transcript/text leads to updated/enriching state.
- Citation chip jumps to source passage.
- Capture result opens item or repair action.
- Settings category navigation.

Exit criteria:

- Web project exists in Magic Patterns.
- Project uses the `AI Memory` design system.
- Screens are visually high fidelity.
- Key flows are clickable enough for design review.
- Project link and active artifact are logged locally.

## Phase 3: Web Review And Polish Pass

Goal:

- Make the web project feel like a coherent product, not a collection of generated screens.

Review criteria:

- Does Library feel calm, searchable, and source-aware?
- Does Needs Upgrade feel helpful rather than broken?
- Does item detail prioritize reading while keeping trust visible?
- Are Tags, Included topics, and Collections separate and easy to understand?
- Does Ask clearly show scope, citations, source evidence, and history?
- Are both navigation layers independently collapsible?
- Does the design system feel like AI Brain rather than generic component styling?

Polish tasks:

- Adjust density and spacing.
- Reduce color overuse if the screen feels too rainbow.
- Strengthen source quality and captured-via clarity.
- Improve empty/offline/error copy.
- Check that high-fidelity labels match the wireframe vocabulary.

Exit criteria:

- Web high-fidelity project is ready for user review.
- Known issues are logged.
- Preview is checked for basic render and route health.

## Phase 4: Create Android High-Fidelity Project

Goal:

- Create the separate Magic Patterns project for the Android experience.

Magic Patterns action:

- Create a new design named `AI Brain Android - High Fidelity`.
- Use design system ID `ds-360d8a8f-1194-4f6b-8365-16ba1e738db7`.
- Use the approved wireframes as the functional reference.
- Generate Android-first high-fidelity screens in a phone frame.

Required Android screen inventory:

- Android login / unlock.
- PIN keypad.
- First-time pairing.
- Scan QR from web.
- Enter pairing code.
- Pairing unreachable.
- Pairing success.
- Session expired / reconnect.
- Read offline items fallback.
- Library default.
- Library search.
- Library recent items.
- Library state filters.
- Library source-type filter row or sheet.
- Library selected-items mode.
- Lightweight Needs Upgrade list.
- Share-sheet capture result.
- Capture screen via bottom nav/FAB.
- Capture result:
  - saved full text,
  - metadata only,
  - preview only,
  - updated existing item,
  - duplicate candidate.
- Weak capture repair.
- Item detail: full-text article.
- Item detail: YouTube transcript.
- Item detail: PDF.
- Item detail: manual note.
- Item detail: weak metadata-only item.
- Item detail tabs:
  - Original,
  - Digest,
  - Ask,
  - Related,
  - Details.
- Details tab cards:
  - Source and capture,
  - Tags,
  - Included topics,
  - Collections,
  - Offline/searchable state,
  - Export/delete actions.
- Ask default.
- Ask with scope pill.
- Ask history bottom sheet.
- Ask conversation detail.
- Citation bottom sheet.
- Item Ask history.
- More / Settings.
- Offline/server unreachable state.

Required Android interactions:

- Bottom navigation.
- Floating capture action.
- Library item opens mobile item detail.
- Filter row or sheet changes library state.
- Long-press or overflow enters selected-items mode.
- Ask selected opens Ask with selected scope.
- Item detail tabs switch content.
- Ask history opens as a bottom drawer.
- Citation chip opens evidence sheet.
- Weak repair updates the existing item.
- Offline item remains readable while Ask is disabled.

Exit criteria:

- Android project exists in Magic Patterns.
- Project uses the `AI Memory` design system.
- Screens are phone-native, not squeezed desktop layouts.
- Key mobile flows are clickable enough for design review.
- Project link and active artifact are logged locally.

## Phase 5: Android Review And Polish Pass

Goal:

- Make the Android experience feel like a daily companion for capture, lookup, reading, and lightweight Ask.

Review criteria:

- Does Android start with useful mobile actions rather than admin density?
- Is capture easy from the FAB and share result?
- Is the item detail readable on a phone?
- Are Details, Tags, Included topics, and Collections clear without becoming a long metadata dump?
- Does Ask history work as a drawer/sheet rather than a desktop rail?
- Are offline and unreachable states understandable?
- Are tap targets, spacing, and hierarchy mobile-safe?

Polish tasks:

- Simplify crowded screens.
- Move secondary metadata into sheets or Details tabs.
- Keep source quality visible but compact.
- Tighten copy for phone moments.
- Verify item detail loading and tab switching.

Exit criteria:

- Android high-fidelity project is ready for user review.
- Known issues are logged.
- Preview is checked for basic render and route health.

## Phase 6: Cross-Platform Parity QA

Goal:

- Ensure web and Android represent the same product model while respecting platform posture.

Parity checklist:

| Product concept | Web expression | Android expression | Required status |
|---|---|---|---|
| Library browse | Dense rows/cards | Mobile cards/list | Present on both |
| Search | Persistent top search | Top search | Present on both |
| Source platform | Chips/row metadata | Compact badges | Present on both |
| Captured via | Row/detail provenance | Detail/header provenance | Present on both |
| Source quality | Filters, chips, right rail | Chips, filters, details | Present on both |
| Needs Upgrade | Dedicated queue | Summary/list plus item repair | Present on both |
| Capture result | Result panel/states | Bottom sheet/states | Present on both |
| Item detail | Reading column plus right rail | Tabs plus details cards | Present on both |
| Tags | Separate card | Separate card | Present on both |
| Included topics | Separate AI-detected card | Separate AI-detected card | Present on both |
| Collections | Separate card | Separate card | Present on both |
| Ask all | Main Ask | Main Ask | Present on both |
| Ask selected | Bulk-selected scope | Selected-items mode | Present on both |
| Ask this item | Item rail/panel | Item Ask tab | Present on both |
| Ask history | Collapsible secondary nav | Bottom drawer/sheet | Present on both |
| Citations | Inline chips plus evidence panel | Chips plus evidence sheet | Present on both |
| Login/unlock | Web access flow | Android unlock/pairing | Present on both |
| Settings | Full settings | More/settings | Present on both |
| Offline | Cache/read state | Strong offline/read state | Present on both |

Exit criteria:

- No major feature is missing from either platform.
- Intentional differences are documented.
- Any remaining gaps are written as design follow-ups.

## Phase 7: Interaction And State QA

Goal:

- Verify that the review prototypes behave well enough for feedback.

Checks:

- Routes or screen links do not dead-end unexpectedly.
- Main navigation works.
- Secondary Ask navigation works.
- Android bottom nav works.
- Item detail opens from Library.
- Android item detail renders and tabs work.
- Capture result actions route to the expected state.
- Ask citations and evidence affordances are visible.
- Offline/unreachable states do not feel like broken screens.
- Text does not overflow in buttons, cards, nav rails, or mobile tabs.
- Saturated colors are used sparingly.
- Important states are labeled, not color-only.

Exit criteria:

- Both Magic Patterns previews are ready to review.
- Any known prototype limitations are documented in the handoff.

## Phase 8: Review Package

Goal:

- Create a concise local handoff for review.

Deliverables:

- Web Magic Patterns editor URL.
- Web preview URL.
- Web active artifact ID.
- Android Magic Patterns editor URL.
- Android preview URL.
- Android active artifact ID.
- Design system source URL and ID.
- Screen inventory confirmation.
- Interaction checklist.
- Parity checklist.
- Known issues and open decisions.

Recommended local file:

- `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`

Exit criteria:

- The user can open both projects and review screens without needing implementation context.

## Phase 9: Feedback Rounds

Goal:

- Iterate from user review into a final approved design direction.

Suggested feedback sequence:

1. Web IA and screen completeness.
2. Web visual polish.
3. Android IA and screen completeness.
4. Android visual polish.
5. Cross-platform parity.
6. Final design-system alignment.

For each round:

- Capture requested changes.
- Apply them in Magic Patterns.
- Re-check the active artifact.
- Update the local review package.
- Keep rollback artifact IDs.

Exit criteria:

- Web and Android high-fidelity designs are approved for future production planning.

## Proposed Execution Order

Recommended order:

1. Web high-fidelity project first.
2. Review and stabilize web visual language.
3. Android high-fidelity project second.
4. Adapt the approved visual language to phone-native patterns.
5. Run parity QA.
6. Prepare review package.

Reason:

The web experience contains the densest information architecture and will expose design-system weaknesses first. Once the web language is stable, Android can inherit the same state model while staying lighter and more mobile-native.

## Key Design Risks To Watch

### Risk 1: Prism Colors Become Decorative

Mitigation:

- Keep most screens neutral.
- Use color for source type, source quality, Ask scope, and repair state only.

### Risk 2: Android Becomes A Squeezed Desktop App

Mitigation:

- Use tabs, sheets, bottom nav, and compact cards.
- Avoid right rails and dense metadata tables.

### Risk 3: Ask Looks Like A Generic Chatbot

Mitigation:

- Keep scope, citations, source evidence, and source quality visible.
- Treat history as source-scoped conversations.

### Risk 4: Needs Upgrade Feels Like An Error Dashboard

Mitigation:

- Use calm repair language.
- Show one next action per item.
- Keep saved source metadata visible.

### Risk 5: Tags, Included Topics, And Collections Blur Together

Mitigation:

- Keep each in its own card.
- Tags are user-managed.
- Included topics are AI-detected.
- Collections are saved groupings.

## Open Decisions For Review

These do not block creating the high-fidelity projects, but should be reviewed during feedback:

- Should Android selected-items mode be part of the primary high-fidelity flow, or remain a secondary/advanced state?
- Should web Library default to row view, card view, or a toggle?
- Should Needs Upgrade be a primary web nav item long term, or a Library filter plus review queue?
- How prominent should offline sync be on web compared with Android?
- Should Ask default to all sources, high-quality sources only, or the last-used scope?

## Definition Of Done

This high-fidelity phase is complete when:

- A separate web Magic Patterns project exists.
- A separate Android Magic Patterns project exists.
- Both use the `AI Memory` design system.
- Both reflect the approved wireframe features.
- Both have enough interactivity for design review.
- Web and Android pass the parity checklist.
- Local documentation records links, active artifacts, rollback candidates, known issues, and next decisions.
