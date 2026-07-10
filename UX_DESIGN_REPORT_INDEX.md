# AI Brain Phase 2 UX Design Report Pack

Created: 2026-06-11
Scope: Design synthesis for the AI Brain Android and web redesign effort.
Output folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

This report pack turns the existing AI Brain PRDs, implementation plans, decision logs, handovers, review reports, and current app surface into a design-facing brief. It is meant to support design direction, critique, journey mapping, and throwaway prototype work. It is not an implementation plan.

## Reports

1. `UX_DESIGN_PRODUCT_MODEL.md`
   - What AI Brain is, who it is for, what problem it solves, and the core mental model.

2. `UX_DESIGN_FEATURE_AND_INTERACTION_INVENTORY.md`
   - Current and planned product surfaces, features, states, and interactions across web, Android/APK, extension, Telegram, and API.

3. `UX_DESIGN_REQUIREMENTS_DOCUMENT.md`
   - Design requirements document covering IA, screens, components, mobile adaptation, accessibility, states, and future feature requirements.

4. `UX_DESIGN_USER_JOURNEYS.md`
   - Journey maps and service-blueprint style flows for capture, upgrade, reading, Ask, mobile, onboarding, and future review/generative workflows.

5. `UX_DESIGN_GAP_ANALYSIS_AND_REDESIGN_PRIORITIES.md`
   - Design gaps, risks, recommended redesign priorities, prototype plan, and decision points.

6. `UX_DESIGN_SYSTEM_PRISM_MEMORY.md`
   - Logo-inspired visual design system for AI Brain, including color tokens, semantic mappings, typography, component guidance, platform adaptation, and Magic Patterns project links.

7. `UX_DESIGN_SYSTEM_PRISM_MEMORY.html`
   - Standalone HTML design-system document with logo reference, tokens, component examples, applied web example, and applied Android example.

## Prototype And Design Production Plans

1. `MAGIC_PATTERNS_WIREFRAMES_PROJECT.md`
   - Magic Patterns wireframe project handoff, iteration log, active artifacts, and key wireframe decisions.

2. `UX_WIREFRAME_WEB_ANDROID_PARITY_AUDIT.md`
   - Feature parity audit for web and Android wireframes, including intentional platform differences and remaining judgment calls.

3. `HIGH_FIDELITY_MAGIC_PATTERNS_DESIGN_PLAN.md`
   - Phase-by-phase plan for creating separate high-fidelity Magic Patterns projects for web and Android using the AI Memory design system.

4. `HIGH_FIDELITY_STYLE_BRIEF.md`
   - Compact high-fidelity visual and interaction brief used to prompt the Magic Patterns web and Android projects.

5. `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`
   - Review handoff for the high-fidelity Magic Patterns projects, including links, artifacts, scope coverage, parity notes, and known issues.

6. `HIGH_FIDELITY_WEB_LIBRARY_SELECTION_RCA.md`
   - Root-cause analysis for the web Library bulk-selection action bar visibility issue and the broken selected-items Ask/bulk-action flow.

7. `UX_ITEM_DETAIL_FOCUS_READ_MODE_IMPLEMENTATION_PLAN.md`
   - Web and Android UX implementation plan for turning the item-detail expand affordance into a proper focus/read mode.

8. `UX_ITEM_DETAIL_FOCUS_READ_MODE_REVISED_IMPLEMENTATION_PLAN_2026-06-13_15-33-34_IST.md`
   - Revised execution-ready focus/read mode plan addressing the adversarial review findings, with locked state model, weak-content behavior, Magic Patterns checklist, and validation gates.

9. `UX_TAGS_TOPICS_COLLECTIONS_INTERACTION_EXPANSION_PLAN_2026-06-13_16-08-07_IST.md`
   - UX implementation plan for making tags, included topics, and collections clickable, editable where appropriate, and connected to Tag, Topic, Collection, and scoped Ask destinations across web and Android.

10. `UX_TAGS_TOPICS_COLLECTIONS_INTERACTION_EXPANSION_REVISED_IMPLEMENTATION_PLAN_2026-06-13_16-25-59_IST.md`
   - Revised execution-ready plan addressing the adversarial review findings, with Magic Patterns artifact safety, prototype-honesty rules, entity models, Android navigation matrix, scoped Ask contracts, guardrails, and validation gates.

## Source Coverage

I treated the human-authored product/design corpus as source material and ignored generated dependencies/build output such as `node_modules`, `.git`, `.next`, Android build intermediates, temporary data, and compiled artifacts.

Primary weighted sources:

- `README.md`
- `AI_DESIGNER_BRIEF.md`
- `DESIGN.md`
- `DESIGN_SYSTEM.md`
- `DESIGN_STRUCTURED_CALM_GREEN.md`
- `FEATURE_INVENTORY.md`
- `BUILD_PLAN.md`
- `STRATEGY.md`
- `BACKLOG.md`
- `PROJECT_TRACKER.md`
- `ROADMAP_TRACKER.md`
- `Phase_2_RUNNING_LOG.md`
- `ReviewReport/*`
- `docs/plans/v0.7.5-*`, `v0.7.6-*`, `v0.8.0-*`, `v0.8.3-*`, `v0.8.4-*`
- `docs/plans/v0.6.x-library-offline-from-db.md`
- Relevant route/component files in `src/app` and `src/components` to confirm the current UI surface.

Historical sources used for context:

- Dated handover folders under `Handover_docs/`
- Older v0.3-v0.6 implementation plans and self-critiques
- Research spikes under `docs/research/` and `docs/plans/spikes/`

## Key Synthesis

AI Brain's strongest design direction is not "another AI chat app" or a full Recall/Knowly clone. It is a trustworthy personal memory system where every saved source has a clear provenance, quality level, repair path, and source-grounded way back into the original content.

The redesign should therefore prioritize:

- Capture quality review and repair
- Source-grounded reading and citation navigation
- Scoped, quality-aware Ask
- Mobile capture and offline reading trust
- Calm editorial IA that keeps advanced power features discoverable without making the default experience feel like a dashboard

Major features like GenPages, recursive GenLinks, graph, Flow, and full SRS remain important future design tracks, but they should not visually dominate the next redesign until the capture-to-memory loop feels trustworthy.
