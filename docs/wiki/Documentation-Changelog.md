# Documentation Changelog

Purpose: Record material wiki revisions, baselines, and publication state without replacing Git history.
Audience: Maintainers and future AI agents.
Verified against: deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` plus retained historical baselines.
Runtime evidence through: 2026-07-12 for Card Processing; older entries retain their dated scope.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

## 2026-07-12 — Card Processing production release

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Dedicated Inbox/Board/List/Archived processing workflow, migration 025, authenticated APIs, exact metrics/counts, staged flags/readiness, immutable rollback, operations, and user guidance | `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` | Staged private production rollout on 2026-07-12 | Implemented and enabled |

- Replaced the explored-only catalog status with the shipped [Card Processing Workflow](Card-Processing-Workflow) page.
- Updated Library integration, API, data, configuration, security, deployment/rollback, source-baseline, Home, and navigation documentation.
- Authenticated desktop/mobile Light/Dark tasks, keyboard/focus/live-region behavior, staged private headers, and exact synthetic cleanup back to 129 retained items passed on the deployed application.
- The original exploration remains historical design evidence; it no longer describes current product availability.

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
