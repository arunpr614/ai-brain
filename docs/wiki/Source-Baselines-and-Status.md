# Source Baselines and Status

Purpose: Define authoritative revisions, verification scope, status, availability, and confidence vocabulary.
Audience: AI agents, reviewers, and documentation/release maintainers.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10 at `6858529ef179a51442d319c6c58e5ace79757619` for its dated verification scope.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

## Recorded baselines

| Baseline | Revision | Meaning |
|---|---|---|
| Current application/documentation source | `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` | Latest verified `origin/main` for this wiki build |
| Latest verified deployed application code | `6858529ef179a51442d319c6c58e5ace79757619` | Dated Note Focus release/hotfix tree; later repository commits are documentation closeout |
| Existing wiki before this revision | `3d578c3f66e61de3f124a855253e713758f6a49b` | Eight-commit wiki baseline audited before editing |
| Feature Council artifact source | `9de8de87de915e874e8290aa556e2b6772d6fabf` | Dated planning/research corpus, not product runtime |

The former default-branch/worktree divergence is resolved in current main. Both historical `017` migrations now coexist with distinct full filenames; the runner tracks/applies full filenames lexicographically. Duplicate numeric prefixes remain technical debt, not an unmerged branch conflict.

## Status taxonomy

| Status | Meaning |
|---|---|
| Implemented | Reachable current code supports the documented behavior under stated availability conditions |
| Partially implemented | Meaningful current behavior exists, but an important contract element is missing |
| Experimental | Implemented but explicitly unstable/evaluation-oriented |
| Feature-flagged | Material behavior is controlled by rollout configuration |
| Inactive | Code exists but is deliberately unavailable or not wired |
| Deprecated | Present but no longer recommended or scheduled for removal |
| Explored | Research/design/prototype evidence without implementation commitment |
| Planned | Explicit future intent without current implementation evidence |
| Deferred | Intentionally postponed |
| Rejected | Intentionally not pursued |
| Superseded | Replaced by a later design or implementation |
| Unknown | Evidence is insufficient |

Availability is `Default`, `Feature-flagged`, `Inactive`, or `Not applicable`. Confidence is High/Medium/Low evidence strength. Runtime evidence is separate and must be dated and scoped; a deployed tree does not prove every feature was end-to-end tested.

## Staleness traps

- The root README and package version describe older stages.
- Roadmap version lanes record intent/history, not necessarily current product or runtime.
- Historical Feature Council “current/approved” labels apply within the 2026-06-28 package only.
- Provider/settings health is point-in-time.
- Unknown should not be upgraded by inference.
