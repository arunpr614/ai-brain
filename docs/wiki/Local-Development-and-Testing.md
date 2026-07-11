# Local Development and Testing

Purpose: Provide a safe source-level setup and verification path without private production instructions.
Audience: AI agents and contributors.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: Not applicable to production; commands are local unless Command Safety says otherwise.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

Use Node 22 and install the lockfile exactly. Work in an isolated worktree, preserve existing local data, and use an isolated temporary SQLite path for tests/builds that can migrate or write.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run check:agent-docs
npm run smoke:agent-docs
```

Consult [Command Safety](Command-Safety) before scripts outside this list. Test ownership follows the module under change: route contracts, DB repositories/migrations, capture/provider policy, queue state, retrieval/citations, notes/journal/consent, client result mapping, and Recall fidelity/locks.

The repository contains extensive product tests, but GitHub CI currently runs only the agent-documentation workflow. Do not treat a green documentation check as product-suite evidence.
