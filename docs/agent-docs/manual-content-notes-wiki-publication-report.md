# Manual Content Notes Wiki Publication Report

Date: 2026-07-10 IST
Result: Passed

## Published revisions

| Artifact | Revision |
|---|---|
| Application branch | `codex/manual-content-notes` |
| Main integration | PR #10, merge commit `b5910b250ea4de62bae7af2059324786a3e23410` |
| Canonical documentation commit | `463c56ffa8293e2b6d37d6084bea9b2d5472d03c` |
| Wiki base before publication | `a9f27341fd48e88c6c9606a420d9b428dd9cc668` |
| Initial production wiki commit | `70f6fa8c041bf3f86ca67129ce5240d2d253af2a` |
| Canonical main-status closeout commit | `a813c2eb6421c854d0489779ef20d5622305e92e` |
| Final published wiki commit | `a9c1214b7a19c47bba5248998d207e95dd84fa18` |
| Verified production application tree | `8654f293d0f8615617df883e4703c0ca098a6029` |

## Delivered documentation

- Added the core `Manual-Content-Notes.md` product, privacy, data, search/Ask/Related, deletion, rollout, and verification page.
- Updated the sidebar, feature catalog, source baselines, data model, search/RAG, security/privacy, deployment, and maintenance pages.
- Preserved the manifest-locked 44-page Feature Council research corpus separately from the current core product page.
- Published 63 canonical Markdown files: 19 core files including the sidebar and 44 research files. GitHub renders 62 user-facing pages because the sidebar is metadata.

## Validation

| Check | Result |
|---|---|
| Canonical generator check | Passed; 44 source documents and 44 generated research pages |
| Canonical privacy scan | Passed; 70 Markdown files, zero findings |
| Canonical structure scan | Passed; 63 required, actual, and reachable pages |
| Feature/source/command coverage | Passed; 42 features, 216 inventory rows, 143 package scripts |
| Synthetic documentation smokes | Passed |
| Pre-push remote concurrency check | Passed; remote still matched the recorded base |
| Fresh-clone privacy and structure checks | Passed at `70f6fa8c041bf3f86ca67129ce5240d2d253af2a` |
| Canonical versus fresh-clone byte comparison | Passed; no differences |
| Rendered Manual Content Notes page | Passed; current production SHA, product contract, privacy boundary, and release evidence visible |
| Post-merge catalog reconciliation | Passed; feature code status is Main and fresh clone again matches canonical source |

## Safety result

Only the public GitHub Wiki repository was changed during publication. The publication included no credentials, private host paths, raw user content, production commands, or owner-only audit/backup locations. The normal non-force push followed a fetch-and-compare concurrency gate.

## Global-default follow-on publication

The global **Include in AI & connections by default** follow-on merged through PR #12 at `01721d1c2bbb686b9768d38c688352f78933205f`, was production released, and received its final canonical closeout through PR #13 at `eefd09a71226ebf591ad826278a9c23b8418613f`.

The final `Manual-Content-Notes.md` update was published from wiki base `a9c1214b7a19c47bba5248998d207e95dd84fa18` as wiki commit `734706050a9b2efba58d51e666f33e3fbe6ca404`. The normal non-force push was protected by a fetch-and-compare remote-SHA gate. A fresh clone passed privacy and structure checks with 63 required, actual, and reachable Markdown files, and matched canonical `docs/wiki/` byte-for-byte.
