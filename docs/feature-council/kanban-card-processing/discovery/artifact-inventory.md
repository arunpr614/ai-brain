# Kanban Card Processing — artifact inventory

**Inventoried:** 2026-07-12
**Immutable source:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs`
**Relevant deliverables:** 131 files after excluding only dependency/cache trees (`prototypes/node_modules/`, `prototypes/.npm-cache/`)
**Unreadable relevant files:** none

The dependency/cache trees were identified but are not product artifacts. Generated `prototypes/dist/` files are retained as runnable evidence and explicitly inventoried even where they mirror source entries.

## Count by type

| Type | Count | Treatment |
|---|---:|---|
| Markdown | 35 | Read and routed by authority/use |
| HTML | 16 | Opened in a browser at 1440×1024 and 390×844; source and built mirrors compared |
| JSX | 4 | Read as interactive prototype source |
| CSS | 4 | Read for measurements/tokens/responsive behavior |
| JavaScript/MJS | 4 | Read as built/runtime configuration evidence |
| JSON | 3 | Parsed; includes package manifests and canonical handoff contract |
| PNG | 41 | Inspected/routed as concepts, references, current-product evidence, or state captures |
| JPG | 22 | Inspected/routed as design/state/fidelity evidence |
| package/support files | 2 | `.npmrc` and `.gitignore`; environment/build-only |
| **Total** | **131** | Complete relevant package |

## Product, decisions, and package authority

| Artifact | Role | Authority/disposition |
|---|---|---|
| `README.md` | Package index/status/source links | Current package map; historical “Explored” status superseded only by the new execution goal’s authority |
| `decisions/decision-log.md` | CPW-001–026 decisions | Later decisions supersede older research where material |
| `product/prd-v1.md` | Original product v1 | Preserved review input |
| `reviews/prd-v1-adversarial-review.md` | Original v1 challenge | Preserved evidence, not a substitute for current-goal review |
| `product/prd-v2.md` | Reviewed product proposal | Primary semantic baseline, reconciled to latest main and current authority |
| `product/metrics-framework.md` | Detailed metric exploration | Supporting; first-lifetime Processed text is superseded by later episode-based decision |
| `product/product-directions.md` | A/B/C direction evaluation | Direction B selection rationale |
| `product/project-management-tracker.md` | Historical exploration tracker | Historical milestone context |

## UX/UI and prototype sources

- `ux/ux-ui-v1.md`, `reviews/ux-ui-v1-adversarial-review.md`, `ux/ux-ui-v2.md`.
- Three source concepts under `ux/concepts/`: Direction A board-first, Direction B Processing/Inbox-first, Direction C Library-integrated queue.
- `prototypes/AGENTS.md` is the durable stakeholder decision record for Direction B, compact Group & sort, Light/Dark parity, and the cold-start handoff.
- `prototypes/handoff/AI_AGENT_HANDOFF.md` and `prototypes/handoff/agent-handoff.json` provide the exact selected component/behavior contract.
- Interactive source: `prototypes/src/App.jsx`, `styles.css`, `Handoff.jsx`, `handoff.css`, `main.jsx`, `handoff-main.jsx`.
- Runtime/build inputs: `prototypes/package.json`, `package-lock.json`, `vite.config.mjs`, `.npmrc`, `.gitignore`, `README.md`.
- QA: `prototypes/design-qa.md`.

### HTML entries (all opened at desktop and mobile)

Source entries:

1. `prototypes/index.html`
2. `prototypes/direction-a.html`
3. `prototypes/direction-b.html`
4. `prototypes/direction-c.html`
5. `prototypes/item-detail.html`
6. `prototypes/design-handoff.html`
7. `prototypes/group-sort-specimen.html`
8. `prototypes/agent-pickup.html`

Built mirrors:

9. `prototypes/dist/index.html`
10. `prototypes/dist/direction-a.html`
11. `prototypes/dist/direction-b.html`
12. `prototypes/dist/direction-c.html`
13. `prototypes/dist/item-detail.html`
14. `prototypes/dist/design-handoff.html`
15. `prototypes/dist/group-sort-specimen.html`
16. `prototypes/dist/agent-pickup.html`

Browser evidence is under `discovery/screenshots/`: canonical source and built pages at both viewports plus Direction B Inbox, Board, Group & sort, loading, error, offline, empty, filtered-empty, move failure, conflict, grouped List, Archived, and item-detail states.

## Technical and review artifacts

- `technical/architecture-options.md`, `technical/technical-plan-v1.md`, `reviews/technical-plan-v1-adversarial-review.md`, `technical/technical-plan-v2.md`.
- `reviews/qa-review.md`, `accessibility-review-input.md`, `accessibility-review.md`, `traceability-matrix-v1.md`, `traceability-matrix-v2.md`, `v2-consistency-review.md`, `final-delivery.md`.

## Research artifacts

- `research/current-state-report.md`, `relevant-code-map.md`, `existing-data-model-summary.md`, `design-system-inventory.md`, `constraints-and-opportunities.md`, `source-reconciliation.md`.
- PM perspectives: `growth-engagement-assessment.md`, `platform-data-workflow-assessment.md`, `power-user-workflow-assessment.md`.
- Six current-product reference screenshots under `research/screenshots/current-product/`: Library, item detail, and card notes at desktop/mobile.

## Image and built-asset sets

- 3 direction concept PNGs are repeated intentionally in `ux/concepts/`, `prototypes/public/concepts/`, and `prototypes/dist/concepts/`.
- 2 supplied Group & sort references under `prototypes/references/`.
- 39 retained prototype screenshot files under `prototypes/screenshots/`, covering A/B/C, mobile/desktop, Light/Dark, handoff/specimen comparisons, trust states, and selected reference fidelity.
- 1 logo repeated in public/dist.
- 4 built screenshot/reference assets plus compiled CSS/JS under `prototypes/dist/assets/`.

## Integrity notes

- Every relevant file could be read or rendered. No silent skip is recorded.
- The source folder was never modified, reorganized, cleaned, or used as the implementation worktree.
- Absolute local paths in source metadata are input evidence only and must not enter public repository/Wiki documentation.
