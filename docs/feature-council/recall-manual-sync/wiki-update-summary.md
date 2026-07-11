# Recall manual sync Wiki update summary

Published: 2026-07-11 17:12 IST
Wiki repository: `arunpr614/ai-brain.wiki`
Protected base: `9e3f7d93f8d7cbc6a5a615c078ac4fbe4e475f3c`
Published commit: `703077dd74c3cbc18936357a9b5bde0397f972a3`
Application candidate: `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync`

## Publication scope

The following ten canonical pages were published through a normal Git commit and push:

1. `APIs-and-Integrations.md`
2. `Configuration-Reference.md`
3. `Data-Model.md`
4. `Deployment-and-Operations.md`
5. `Documentation-Changelog.md`
6. `Feature-Catalog.md`
7. `Known-Limitations-and-Technical-Debt.md`
8. `Recall-Synchronization.md`
9. `Security-Privacy-and-Redaction.md`
10. `Source-Baselines-and-Status.md`

The pages document the owner journey, truthful lifecycle states, API/idempotency contract, migration `024`, full-wrapper reuse, trusted worker/identity model, concurrency/crash handling, deployment exclusion, default-off rollout, tests, browser evidence, limitations, and the separately authorized production-enablement gate.

## Concurrency preservation

The Wiki advanced after the earlier definitive publication: `9e3f7d9` added the unrelated Card Processing Workflow exploration while this feature was in progress. Publication stopped, re-fetched that head, and verified it exactly before making changes.

The Recall publication updated only the ten listed pages. The concurrent exploration page, Home/sidebar/navigation, architecture/ideas/product pages, and all other Wiki content were left untouched. The two overlapping pages—Feature Catalog and Documentation Changelog—were reconciled to retain both the Card exploration and Recall manual-sync entries. No force push, history rewrite, deletion, or whole-corpus overwrite occurred.

## Verification

- The publication worktree matched remote base `9e3f7d9` immediately before copying.
- The staged diff contained exactly the ten intended pages and passed whitespace checks.
- Privacy scanning passed for all 85 Markdown pages before publication.
- A separate fresh clone resolved to `703077dd74c3cbc18936357a9b5bde0397f972a3`.
- All ten published pages in that fresh clone were byte-identical to repository canonical source.
- The concurrent Card Processing Workflow page was byte-identical before and after publication.
- The fresh clone was clean, contained 85 Markdown pages, and passed the Wiki privacy scanner.
- Live GitHub rendering was inspected for Recall Synchronization, Feature Catalog, Documentation Changelog, and Card Processing Workflow Exploration. Recall status/journey/API/security content rendered; both catalog entries and both changelog entries were present; the preserved exploration retained its explicit “Explored — not implemented” boundary.

## Runtime boundary

Wiki publication changed documentation only. It did not merge application code, deploy, enable the manual UI/worker/path/fallback timer, mutate the daily timer, access a Recall credential, or call Recall. The Wiki labels the application content as a review candidate and keeps actual-host proof as a separate authorization gate.
