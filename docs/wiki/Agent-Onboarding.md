# Agent Onboarding

Purpose: Establish a safe, evidence-first starting workflow for AI Brain work.
Audience: AI agents and engineers entering the repository.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Repository Orientation

AI Brain uses Next.js 16, React 19, TypeScript, SQLite through `better-sqlite3`, and `sqlite-vec`. Node 22 is required. The web app is under `src/app`, persistent modules under `src/db`, domain logic under `src/lib`, deployment tooling under `scripts`, the Android shell under `android`, and the browser extension under `extension`.

The [package manifest](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/package.json) is more current than the root README for dependencies and available scripts. It is not authoritative release evidence.

## First Inspection

Before editing:

```bash
git status --short --branch
git worktree list
npm run typecheck
npm run lint
```

`typecheck` and `lint` are classified R0 read-only local. Tests are W1 because they create isolated fixture state:

```bash
npm test
```

Do not run another script until its classification is checked in [Command Safety](Command-Safety).

## Worktree Safety

- Assume existing changes belong to the user.
- Do not reset, restore, or overwrite unrelated changes.
- Check whether the current branch differs from `origin/main` before treating source as current product truth.
- Use a separate worktree for substantial work or conflicting baselines.
- Never move credentials or private evidence into a new worktree.

## Production and Private Boundaries

Do not run deploys, restores, migrations, backfills, key operations, Recall live calls, scheduler changes, or production writes from public documentation. These require current private context and explicit authorization.

Private runbooks may be available through the owner-local location described by `docs/agent-docs/private-docs-locator.md`. If absent, report `private runbook unavailable on this machine` and stop sensitive work.

## Baseline Discipline

Read [Source Baselines and Status](Source-Baselines-and-Status). A feature may be merged only on main, present only on the worktree branch, deployed from an older branch commit, or merely planned. Preserve those distinctions in code, documentation, and handoff messages.

## Safe Completion

For ordinary code changes, run the smallest relevant tests plus typecheck and lint. For documentation changes, run the agent documentation privacy, structure, and coverage checks. Public publication requires a second validation against a fresh wiki clone.
