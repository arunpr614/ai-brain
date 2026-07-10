# Source Baselines and Status

Purpose: Define the exact source revisions and status vocabulary used throughout this wiki.
Audience: AI agents and release/documentation maintainers.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Recorded Baselines

| Baseline | Revision | Meaning |
|---|---|---|
| Default branch | `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` | Latest fetched `origin/main` during documentation build |
| Documentation worktree source | `8178117c80923e5724e355fb2684cbc836013d39` | UX v2 and Recall-oriented branch used for this documentation build |
| Feature Council artifact source | `9de8de87de915e874e8290aa556e2b6772d6fabf` | Immutable source for the 44 planning and research documents published under Feature Council Research |
| Wiki before Feature Council publication | `dab9267124b55571f03ad56c6776c6827723229a` | Published wiki base recorded before the research-category update |
| Complete production tree | Unknown | Public-safe evidence does not prove one current complete production SHA |

The default branch has 12 commits not present in the worktree baseline. The worktree baseline has 16 commits not present in the default branch. Neither is a descendant of the other.

Default branch source: [main baseline](https://github.com/arunpr614/ai-brain/tree/2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a). Worktree source: [documentation baseline](https://github.com/arunpr614/ai-brain/tree/8178117c80923e5724e355fb2684cbc836013d39).

Feature Council source: [planning artifact baseline](https://github.com/arunpr614/ai-brain/tree/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council). Its research evidence date is 2026-06-28. These documents are planning evidence; they do not update the production runtime baseline.

## Known Divergence

Main contains later review-inbox, browser-selected-text, YouTube transcript recovery, provider-resilience, and production backfill work. The worktree contains UX v2, later capture-quality structures, topics/transcript segments, and Recall sync that are absent from the fetched main tree.

Migration number `017` is used for different changes on the two baselines. This is an active integration hazard. Do not merge migrations by filename or renumber them without a dedicated schema reconciliation plan and database-state evidence.

## Status Dimensions

Product status, code status, and runtime status are independent. Code presence alone never proves deployment. A tracker or package version never proves current runtime. Historical production evidence may verify one feature at an older source revision without proving the entire current production tree.

## Staleness Traps

- The root README describes an older product stage.
- `package.json` reports `0.6.2` while later source and roadmaps exist.
- Roadmap versions are document revisions and product lanes, not necessarily the deployed application version.
- Branch commits may have been deployed without being merged to main.

When evidence conflicts, retain the conflict and mark the runtime Unknown rather than choosing the newest-looking value.
