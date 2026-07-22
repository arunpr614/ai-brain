# NotebookLM one-click export — Wiki publication verification

**Date:** 2026-07-22

**Repository documentation:** [PR #46](https://github.com/arunpr614/ai-brain/pull/46), merge `dd3b88a2bab637ddccf717945f1b6cd39aa3705c`

**Live Wiki base:** `6b0e90a91d374dc88a746ab6b11a1dcf2c091d3c`

**Published content commit:** `b04c5940977a09ecc9e5b34c6c7ad7767092920f`

**Final verified Wiki head:** `5ccdeebea11190c10e8b06ed153d0df7d36d5aed`

**Verdict:** **Pass — qualified no-delete preservation union**

This record proves documentation publication only. NotebookLM, now publicly branded Gemini Notebook, remains Experimental and production UI-only (`1:0:0`). Queueing, provider writes, target binding, the signed-in private synthetic canary, and owner-only real-content enablement remain pending.

## Publication boundary

The repository corpus contains 88 Markdown pages. The live Wiki already contained 90 pages because three pages from separate Graphify and YouTube research lanes had been published without yet joining the repository manifest. A blind exact mirror would have deleted those pages and overwritten their navigation, catalog, and changelog changes.

The publication therefore used a no-delete three-way preservation merge:

- exact last-published repository source: `8028fcbe23e58dc9889895278126447472b972e2`;
- byte-identical corresponding Wiki commit: `5a9e100134141770ed87d959b7cd67aa4460f3ca` (86/86 paths and blob identities matched);
- live Wiki base before this publication: `6b0e90a91d374dc88a746ab6b11a1dcf2c091d3c`;
- current merged repository source: `dd3b88a2bab637ddccf717945f1b6cd39aa3705c`.

The result is a 91-page union: all 88 repository pages plus three unchanged live-only research pages. No path was deleted or renamed. This is intentionally not described as a byte-identical mirror of the repository's 88-page manifest.

## Concurrency-safe publication

1. Fresh-cloned the current repository `main` and verified it resolved to `dd3b88a2bab637ddccf717945f1b6cd39aa3705c`.
2. Re-ran the complete agent-documentation gate: generated Feature Council pages, privacy, structure/reachability, documentation coverage, and project-Wiki artifacts all passed for the 88-page repository corpus.
3. Fresh-cloned the Wiki and recorded live base `6b0e90a91d374dc88a746ab6b11a1dcf2c091d3c`.
4. Proved the exact 86-page three-way base and reconciled all later repository and live-Wiki deltas.
5. Verified all 44 current repository delta paths were represented. Thirty-seven matched the merged repository byte-for-byte; seven deliberately combined current repository truth with unrelated live Graphify/YouTube/Recall/organization material.
6. Verified the two NotebookLM pages matched merged repository source byte-for-byte before the publication-status follow-up.
7. Verified the three live-only pages stayed byte-identical and that the merged tree had 91 pages, zero deletions, zero conflict markers, and a clean diff check.
8. Queried both fetched `origin/master` and independent `ls-remote` immediately before each commit and push. Both remained at the expected base each time.
9. Pushed normally to `master`; no force push or history rewrite was used.

## Independent post-push verification

- A fresh clone resolved exactly to content commit `b04c5940977a09ecc9e5b34c6c7ad7767092920f` and later to final metadata head `5ccdeebea11190c10e8b06ed153d0df7d36d5aed`.
- Both fresh clones were clean and byte-identical to their prepared publication trees.
- Final page count: 91 Markdown pages.
- Privacy scan: 91 files, zero findings.
- Link graph: all 91 pages reachable, with no broken internal target.
- Rendered public pages: 89/89 user-facing Wiki URLs returned HTTP 200 after bounded retry; NotebookLM heading, UI-only status, publication SHA, source baseline, deployment gate, public-brand alias, and preserved Graphify/YouTube pages rendered expected text.
- Three live-only page hashes remained unchanged from the pre-publication base.

The exact-manifest structure checker reports six expected findings: `unexpected_page` and `stale_current_main_baseline` for each of the three preserved live-only research pages. There is no unreachable-page or broken-link finding. This is a documented manifest exception, not a publication failure.

## Remaining release gates

The Wiki publication gate is complete. The release verdict remains **PARTIAL** until the extension is manually loaded and paired, an authorized personal owner account (or organizationally authorized managed account) is confirmed, the private synthetic canary passes without provider/security friction, and owner-only real-content enablement is observed safely.

This artifact contains no account identifier, notebook/source identifier, content, cookie, private path, host detail, or credential.
