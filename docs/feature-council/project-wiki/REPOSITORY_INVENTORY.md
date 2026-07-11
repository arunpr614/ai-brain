# Repository Inventory

**Verified:** 2026-07-11
**Remote:** `https://github.com/arunpr614/ai-brain.git`
**Remote main:** `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`

## Selected setup

- Administrative clone: `ai-brain-git-main` because it owns the linked worktrees and has the correct origin.
- Project worktree: sibling `ai-brain-definitive-project-wiki-20260711`.
- Branch: `docs/definitive-project-wiki`.
- Base: exact `origin/main` SHA `23868faf…`.
- Initial status: clean and tracking `origin/main`.
- Existing modifications in the administrative clone and research worktrees were not changed.

## Candidate assessment

| Candidate | Result |
|---|---|
| Source 1 — historical Recall app | Not a repository; Git resolves to the broad parent vault. Historical documents only. |
| `ai-brain` | Parent container with nested repositories; not itself the canonical clone. |
| Feature Council worktree | Correct origin, one untracked review; research source only. |
| Wiki-research worktree | Correct origin and clean; useful documentation source. |
| `ai-brain-git-main` | Correct primary clone; five user-modified scripts preserved. |

## Current implementation surface

- UI and routes: `src/app/`.
- Domain capabilities: `src/lib/`.
- Persistence: `src/db/` and `src/db/migrations/`.
- Web client components: `src/components/`.
- Browser extension: `extension/`.
- Android shell: `android/` plus `capacitor.config.ts`.
- Operator/build tooling: `scripts/`.
- Documentation validation: `.github/workflows/agent-docs.yml` and `scripts/check-agent-*`.
- Canonical wiki source: `docs/wiki/`.
- Existing machine-readable documentation ledgers: `docs/agent-docs/`.

## Known repository documentation conflicts

- `README.md` describes an older stage and exposes a retired product/version framing.
- `package.json` reports `0.6.2` while current code includes later review, Notes, AI-default, and Focus work.
- Existing wiki baselines point to pre-merge divergent branches; current main now contains the relevant merged source.
- The application commit after `6858529…` changes only release/documentation records, so `6858529…` remains the latest verified deployed application tree while `23868faf…` is the current documentation/code inspection baseline.
