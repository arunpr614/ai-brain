# Documentation Changelog

Purpose: Record material wiki revisions, baselines, and publication state without replacing Git history.
Audience: Maintainers and future AI agents.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c` plus retained historical baselines.
Runtime evidence through: 2026-07-12 for Card Processing; older entries retain their dated scope.
Last reviewed: 2026-07-22.
Owner: AI Brain maintainer.

## 2026-07-22 — NotebookLM one-click export release candidate

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Added a deliberately narrow one-item export to one locally bound owner-only private consumer NotebookLM notebook, with a local Chrome trust boundary, durable no-blind-retry state machine, retention/backup controls, and staged write gate | Current feature worktree based on `4736ba3`; replace with the final protected-main release SHA before publication | None yet; production deployment and signed-in private synthetic canary are still required | **Experimental, default off, and not yet claimed as deployed** |

- Added [NotebookLM One-Click Export](NotebookLM-One-Click-Export) while preserving the broader synchronization decision as Deferred research.
- Distinguished the public entrance at `https://notebooklm.google/` from the authenticated application/connector host at `https://notebooklm.google.com/`.
- Publication must wait for the exact merged release, immutable artifact verification, dark production migration, private synthetic canary, final redacted evidence, and fresh-clone Wiki checks.

## 2026-07-21 — NotebookLM synchronization research decision

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Added edition-specific platform research, source mapping, capacity/security analysis, 46/46 credential-free local checks, three independent PM recommendations, adversarial review, and final council decision | Current-code audit at `ad78d77495dcaa90f62aab038fe63ae95cf36862`; research-only branch | None; no Google account, credential, file, notebook, source, production content, migration, dependency, or deployment used | **Deferred pending account eligibility and official live synthetic evidence — not implemented** |

- Added [NotebookLM Synchronization Research](NotebookLM-Synchronization-Research) and cross-linked the feature catalog, ideas catalog, Home, source baselines, and sidebar.
- Distinguished consumer, paid-consumer, ordinary Workspace, and separately licensed Gemini Notebook Enterprise surfaces. A Drive write is not represented as verified NotebookLM refresh.
- Recorded one-source-per-item as capacity-infeasible by default, retained aggregation only as a future bounded hypothesis, and rejected unofficial consumer RPC/browser automation.
- Because the council decision is Defer, no PRD, UX/UI package, product prototype, or production technical plan was created.
- Revalidation is due by 2026-08-21 or earlier after Gate 0, an authorized official synthetic spike, or a relevant platform change.

## 2026-07-12 — Card Processing production release

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Dedicated Inbox/Board/List/Archived processing workflow, migration 025, authenticated APIs, exact metrics/counts, staged flags/readiness, immutable rollback, operations, and user guidance | `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` | Staged private production rollout on 2026-07-12 | Implemented and enabled |
| Direct selected-source **Add to Inbox** from Library with exact accounting, retry recovery, idempotent replay, scoped summary refresh, and responsive pending feedback | `8c1341100b174fe4ca518e6a745c30b9078df21c` | Staged private production follow-up on 2026-07-12 | Implemented and enabled |

- Replaced the explored-only catalog status with the shipped [Card Processing Workflow](Card-Processing-Workflow) page.
- Updated Library integration, API, data, configuration, security, deployment/rollback, source-baseline, Home, and navigation documentation.
- Authenticated desktop/mobile Light/Dark tasks, keyboard/focus/live-region behavior, staged private headers, and exact synthetic cleanup back to 129 retained items passed on the deployed application.
- The original exploration remains historical design evidence; it no longer describes current product availability.
- The Library and Card Processing guides now document the direct selected-source path and distinguish it from the existing Recent/All preview flow.

## 2026-07-11 — Recall manual-sync review candidate

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Durable Settings request UI/API, whole-wrapper lifecycle, trusted worker/unit model, migration `024`, operations/security boundaries, tests, and visual evidence | `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync` | No new runtime baseline; manual control remains disabled and undeployed | Review candidate; canonical Wiki publication recorded separately |

- Updated Recall, API, data, configuration, deployment, security, limitations, catalog, and source-baseline pages from implementation and independent review evidence.
- Local verification covers the full code gates, six process-fixture groups, responsive states, keyboard behavior, reduced motion, dark mode, zoom/reflow, contrast, and automated accessibility checks.
- Physical assistive-technology validation and actual-host identity/credential/unit proof remain explicit pre-enablement activities. No merge or deployment is part of this entry.

## 2026-07-11 — Card Processing Workflow exploration

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Added Card Processing Workflow research, three directions, recommendation, adversarially reviewed v2 product/UX/technical plans, fictional prototypes, and architecture/status/catalog records | Application baseline `1cb5d36f37611e60442b4f2c4433b45455273500`; exploration package `df4c42b9869f8a35b9557bc64bf6ecdb9d11b416` | None; no production change | **Explored — not implemented** |

- Added [Card Processing Workflow Exploration](https://github.com/arunpr614/ai-brain/wiki/Card-Processing-Workflow-Exploration) and cross-linked the ideas catalog, feature-status matrix, product roadmap posture, architecture proposals, and sidebar.
- The recommended Direction B is an Inbox-first Processing section. Batch mutation and manual rank are deferred; no production implementation, migration, API, flag, rollout, or merge is claimed.
- Canonical exploration evidence was committed in `df4c42b9869f8a35b9557bc64bf6ecdb9d11b416`, pinned in successor `13ed06a9f7cab853b33fa0c20c51fefc222313ff`, and opened for review in [pull request #21](https://github.com/arunpr614/ai-brain/pull/21). Live-wiki commit and publication verification are recorded in final delivery rather than preclaimed here.

## 2026-07-11 — definitive project wiki

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Definitive living-wiki reconciliation, status taxonomy, detailed feature families, architecture/reference pages, and explicit historical boundary | `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` | `6858529ef179a51442d319c6c58e5ace79757619` for dated verification scope | Published and verified |

- Repository source was published in `5f001e9`, followed by rendered-diagram and exact idea-catalog refinements in `4c91e68` and `4f583d0`. Pull request [#19](https://github.com/arunpr614/ai-brain/pull/19) passed its required check and merged to `main` as `0b1cb475bb179626e9357d6f427ef2a2345ee679`.
- The separate wiki was concurrency-checked at `3d578c3f66e61de3f124a855253e713758f6a49b`, then the 84-page definitive corpus was published normally as `8909215124883e5b0d24a09bc3bec0ec6ff79b83`. This changelog is recorded in the immediate normal successor commit visible in wiki history.
- A fresh clone reproduced all 84 canonical pages byte-for-byte and passed privacy, structure, and link-graph checks. All 82 user-facing wiki content URLs and all 16 unique external source/prototype URLs returned HTTP 200.
- Live GitHub rendering was inspected for Home, the grouped sidebar and footer, both catalogs and their long tables, System Architecture, a representative feature page, and a representative historical page. The Home, architecture, and historical Mermaid diagrams rendered successfully.

## 2026-07-10

- Published the dated Feature Council research corpus with lifecycle/successor metadata.
- Added Manual Content Notes, global note AI-default, and Note Focus documentation/release records.
- Published existing wiki commit `3d578c3f66e61de3f124a855253e713758f6a49b`.

Future entries record date, pages, implementation/runtime baselines, canonical commit, wiki commit, validation, and live verification.
