# Direction B AI Agent Handoff

**Recorded:** 2026-07-11
**Classification:** **Explored — not implemented**
**Approved direction:** Direction B — Processing, Inbox-first
**Review branch:** `concept/card-processing-workflow`
**Review-only PR:** <https://github.com/arunpr614/ai-brain/pull/21>
**Current local package:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs`

## Start here

1. Read `../AGENTS.md` completely.
2. Open `../design-handoff.html`, `../group-sort-specimen.html`, and `../agent-pickup.html` through the local prototype server.
3. Read `../../decisions/decision-log.md`, `../../ux/ux-ui-v2.md`, `../../product/prd-v2.md`, `../../technical/technical-plan-v2.md`, and `../design-qa.md`.
4. Confirm the current branch and worktree before editing.
5. Preserve the **Explored — not implemented** classification unless a stakeholder explicitly authorizes a different phase.

## Approved component contract

- Board and List share one Group & sort component and the same option arrays.
- Group options: Workflow status, Primary user tag, Primary AI topic, Source type, Capture channel, Capture quality, Capture age, and No grouping.
- Sort options: Custom order, Oldest captured, Newest captured, Title A–Z, Title Z–A, Workflow status, Source type, and Capture channel.
- Defaults: Workflow status + Oldest captured + Dark.
- Desktop: 36px trigger, 238px minimum trigger width, 322×148px popover, 50px rows, 13px labels, 12px values, 18px icons, 12px popover radius.
- Mobile: at least 44px trigger height, 54px rows, menu in normal flow, and zero horizontal page overflow at 390px.
- Non-status grouping changes layout only and disables pointer drag. The source-specific native Move control remains the status-changing path.
- Light and Dark must have equivalent content, hierarchy, state, and behavior.
- Review URLs persist `view`, `group`, `sort`, and `theme`.

## Do not infer authorization

This package does not authorize production UI, schema, migration, API, persistence, background-worker, feature-flag, analytics, rollout, deployment, or merge work. It also does not remove the implementation no-go gates in the v2 PRD, UX, technical plan, accessibility review, and traceability matrix.

## Verification commands

```bash
cd "/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/prototypes"
npm ci
npm run build
```

The repository-level documentation gate remains available only from an AI Brain repository worktree:

```bash
npm run check:agent-docs
```

Visual verification must use the in-app browser at desktop and 390×844 mobile sizes. Any Product Design handoff must retain a combined source-versus-implementation comparison and a `design-qa.md` result of exactly `passed`.
