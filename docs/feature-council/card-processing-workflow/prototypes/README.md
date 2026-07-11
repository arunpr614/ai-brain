# Card Processing Workflow Prototypes

**Status:** Throwaway exploration · **Explored — not implemented**

## Pages

- `index.html` — gallery, comparison, review prompts, and recommendation.
- `direction-a.html` — Workflow, board-first operations.
- `direction-b.html` — Processing, Inbox-first triage (**recommended**).
- `direction-c.html` — Queue, Library-integrated workflow lens.
- `item-detail.html` — isolated canonical item-detail route simulation.
- `design-handoff.html` — stakeholder-approved Direction B visual/interaction handoff.
- `group-sort-specimen.html` — runnable Light/Dark component states, exact measurements, options, and acceptance criteria.
- `agent-pickup.html` — cold-start file map, commands, guardrails, and remaining gates for another AI agent.
- `handoff/agent-handoff.json` — machine-readable approved design contract.
- `handoff/AI_AGENT_HANDOFF.md` — concise source-oriented pickup instructions.
- `design-qa.md` — final visual, interaction, console, and responsive QA evidence.

## Working interactions

- Inbox, Board, List, and Archived view switching.
- Shared Board/List **Group & sort** control with grouping by workflow status, primary User tag, primary AI topic, source type, capture channel, capture quality, capture age, or no grouping.
- Sorting by custom fixture order, oldest/newest capture, title A–Z/Z–A, workflow status, source type, or capture channel.
- Intentional Light and Dark appearance designs, persisted through review links.
- Cross-column pointer drag on desktop Board.
- Keyboard/touch/screen-reader compatible status `select` as the non-drag path.
- User-tag and AI-topic filters with clear-all and matching-versus-total copy.
- Read-only quick preview, route-based full detail, protected editable fictional My notes, and detail status control.
- Archive Done, restore to Done, reprocess to Inbox, and version-like Undo simulation.
- Normal, loading, load-error, offline, empty, filtered-empty, local move-failure, and version-conflict review scenarios.
- Responsive desktop and 390×844 mobile layouts; mobile Board shows one selected group at a time.

## Boundaries

- Static fictional data only.
- No production imports, APIs, persistence, migrations, analytics, or feature flags.
- Prototype interactions simulate product contracts; they do not represent implementation architecture.
