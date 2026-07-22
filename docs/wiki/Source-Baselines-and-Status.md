# Source Baselines and Status

Purpose: Define authoritative revisions, verification scope, status, availability, and confidence vocabulary.
Audience: AI agents, reviewers, and documentation/release maintainers.
Verified against: deployed application `167a15d57b8f70574a017ea4cda507870f3600d4` plus retained historical baselines below.
Runtime evidence through: 2026-07-22 for the NotebookLM UI-only production stage; older rows retain their dated scope.
Last reviewed: 2026-07-22 for the NotebookLM one-click export release; other baselines retain their prior evidence dates.
Owner: AI Brain maintainer.

## Recorded baselines

| Baseline | Revision | Meaning |
|---|---|---|
| Card Processing production release | `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` | Protected-main implementation and release-hardening SHA deployed with schema 025 and staged read/write/navigation enablement |
| Recall manual-sync review candidate | `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync` | Implemented and locally verified; not merged, deployed, or enabled |
| Repository main at candidate start | `1cb5d36f37611e60442b4f2c4433b45455273500` | Clean base for the Recall candidate; includes the definitive Wiki closeout |
| Current merged living-Wiki documentation source | `dd3b88a2bab637ddccf717945f1b6cd39aa3705c` | PR #46 merge containing the NotebookLM UI-only release record and the 88-page repository corpus; published through the no-delete Wiki preservation merge below |
| Latest verified deployed application code | `167a15d57b8f70574a017ea4cda507870f3600d4` | Protected-main tree deployed with migration 026; NotebookLM schema, health, retention/operations timers, and authenticated UI-only state passed while queue/provider writes remained off |
| Existing wiki before this revision | `3d578c3f66e61de3f124a855253e713758f6a49b` | Eight-commit wiki baseline audited before editing |
| Feature Council artifact source | `9de8de87de915e874e8290aa556e2b6772d6fabf` | Dated planning/research corpus, not product runtime |
| NotebookLM one-click export release | `167a15d57b8f70574a017ea4cda507870f3600d4` | Experimental, production-deployed UI-only (`1:0:0`); extension artifact attested and installed but not loaded/paired; signed-in private synthetic canary and owner-only real-content enablement remain pending |
| NotebookLM Wiki content publication | `b04c5940977a09ecc9e5b34c6c7ad7767092920f` | Fresh-clone-verified 91-page preservation union: all 88 current repository pages plus three unchanged live-only research pages; all 91 reachable and privacy-clean |
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
