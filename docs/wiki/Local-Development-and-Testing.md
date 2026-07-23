# Local Development and Testing

Purpose: Provide a safe source-level setup and verification path without private production instructions.
Audience: AI agents and contributors.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: Not applicable to production; commands are local unless Command Safety says otherwise.
Last reviewed: 2026-07-22.
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

`npm run typecheck` is a safe local W1 command, not read-only: the incremental TypeScript configuration writes the ignored `tsconfig.tsbuildinfo` cache. Tests and documentation smokes also create local synthetic/fixture state; keep them isolated from private application data.

The protected-main release also has Product CI coverage for typecheck, lint, the complete product suite, production build, release smoke, and documentation gates. For extension changes, run the extension's own `npm run check` from `extension/`; a successful local build is not evidence that the attested release artifact was installed, loaded, paired, or exercised against NotebookLM. NotebookLM-specific operations/readiness checks are diagnostic or release-gated commands, not part of this public safe-local baseline.

Consult [Command Safety](Command-Safety) before scripts outside this list. Test ownership follows the module under change: route contracts, DB repositories/migrations, capture/provider policy, queue state, retrieval/citations, notes/journal/consent, client result mapping, Recall fidelity/locks, and NotebookLM mapper/auth/origin/protocol/retention/duplicate-safety boundaries. Use synthetic fixtures; do not use a signed-in consumer provider or enable queue/provider writes as a local test shortcut.

Do not treat a green documentation check, extension build, or mocked provider suite as live-provider evidence. The 2026-07-22 release passed 1,034 product tests and protected Product CI, while the signed-in private NotebookLM synthetic canary remains pending.
