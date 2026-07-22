# Source Baselines and Status

Purpose: Define authoritative revisions, verification scope, status, availability, and confidence vocabulary.
Audience: AI agents, reviewers, and documentation/release maintainers.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c` plus retained historical baselines below.
Runtime evidence through: 2026-07-12 for the Card Processing release; older rows retain their dated scope.
Last reviewed: 2026-07-22 for the NotebookLM one-click export candidate; other baselines retain their prior evidence dates.
Owner: AI Brain maintainer.

## Recorded baselines

| Baseline | Revision | Meaning |
|---|---|---|
| Card Processing production release | `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` | Protected-main implementation and release-hardening SHA deployed with schema 025 and staged read/write/navigation enablement |
| Recall manual-sync review candidate | `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync` | Implemented and locally verified; not merged, deployed, or enabled |
| Repository main at candidate start | `1cb5d36f37611e60442b4f2c4433b45455273500` | Clean base for the Recall candidate; includes the definitive Wiki closeout |
| Living Wiki documentation baseline | `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` | Application baseline used by unchanged core pages and the structure gate |
| Latest verified deployed application code | `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` | Dated Card Processing release tree; staged API/domain, authenticated browser, cleanup, readiness, integrity, and rollback evidence passed |
| Existing wiki before this revision | `3d578c3f66e61de3f124a855253e713758f6a49b` | Eight-commit wiki baseline audited before editing |
| Feature Council artifact source | `9de8de87de915e874e8290aa556e2b6772d6fabf` | Dated planning/research corpus, not product runtime |
| NotebookLM one-click export candidate | Current feature worktree based on `4736ba3` | Experimental default-off implementation candidate; final protected-main release SHA, production deployment evidence, and signed-in private synthetic canary remain required before publication claims |
| NotebookLM synchronization research audit | `ad78d77495dcaa90f62aab038fe63ae95cf36862` | Current-code audit baseline for the 2026-07-21 deferred research decision; no implementation or runtime claim |

The former default-branch/worktree divergence is resolved in current main. Both historical `017` migrations now coexist with distinct full filenames; the runner tracks/applies full filenames lexicographically. Duplicate numeric prefixes remain technical debt, not an unmerged branch conflict.

The Recall candidate adds migration `024` and a default-off manual Settings control without changing the recorded production baseline. Repository/local verification is strong evidence for review readiness; physical assistive-technology checks and real-host credential/permission/unit verification are separately required before enablement.

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
