# Documentation Changelog

Purpose: Record material wiki revisions, baselines, and publication state without replacing Git history.
Audience: Maintainers and future AI agents.
Verified against: main documentation baseline `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` plus review candidate `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync`.
Runtime evidence through: 2026-07-10 at `6858529ef179a51442d319c6c58e5ace79757619` for its dated scope.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

## 2026-07-11 — Recall manual-sync review candidate

| Change | Implementation baseline | Runtime baseline | State |
|---|---|---|---|
| Durable Settings request UI/API, whole-wrapper lifecycle, trusted worker/unit model, migration `024`, operations/security boundaries, tests, and visual evidence | `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync` | No new runtime baseline; manual control remains disabled and undeployed | Review candidate; canonical Wiki publication recorded separately |

- Updated Recall, API, data, configuration, deployment, security, limitations, catalog, and source-baseline pages from implementation and independent review evidence.
- Local verification covers the full code gates, six process-fixture groups, responsive states, keyboard behavior, reduced motion, dark mode, zoom/reflow, contrast, and automated accessibility checks.
- Physical assistive-technology validation and actual-host identity/credential/unit proof remain explicit pre-enablement activities. No merge or deployment is part of this entry.

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
