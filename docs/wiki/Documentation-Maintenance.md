# Contribution and Documentation Maintenance

Purpose: Keep canonical and published documentation accurate, safe, reviewable and synchronized.
Audience: Documentation contributors, maintainers, and AI agents.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10; documentation publication does not alter runtime evidence.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

`docs/wiki/` is canonical. The GitHub Wiki is a published mirror. Update canonical files first and never hand-edit generated Feature Council pages.

## When to update

Update the catalog and owning feature page when a change affects behavior, routes, APIs, schemas, storage, AI providers, integrations, authentication, flags, tests, deployment, monitoring, limitations or idea status. Update architecture/data/API/operations pages when their contracts change.

## Verification convention

- Pin living pages to current-main SHA and verification date.
- Record feature-specific runtime evidence separately.
- Confidence describes evidence strength, not maturity.
- Do not refresh only a date; recheck cited code/tests/status.
- Historical pages keep their artifact SHA/date/lifecycle/successor and no-runtime label.

## Canonical workflow

1. Update catalog, detailed page and affected references with the code change.
2. Run Feature Council generation/checks and wiki privacy/structure/coverage/link checks.
3. Review the complete diff for unsupported claims and sensitive content.
4. Commit/push canonical source and merge through the normal repository process.
5. Re-fetch the wiki remote and confirm the recorded base has not moved.
6. Synchronize all canonical pages with a normal non-force push.
7. Fresh-clone, byte-compare and visually inspect Home, sidebar, catalog, changed pages, diagrams and links.
8. Record repository/wiki commits and live verification in [Documentation Changelog](Documentation-Changelog) and the running log.

Feature Council generation is manifest-owned. The implementation/release folders and `docs/feature-council/project-wiki/` are explicitly excluded from the fixed historical research corpus. See [Feature Page Template](Feature-Page-Template) and [Explored Idea Template](Explored-Idea-Template).

## Evidence-artifact regeneration

Three checked builders maintain the audit-level evidence. Private source paths are runtime inputs and must never be committed; use the five stable source aliases documented in the project maintenance plan.

```bash
node scripts/build-master-feature-evidence.mjs docs/agent-docs/feature-coverage-ledger.md docs/feature-council/project-wiki/MASTER_FEATURE_AND_IDEA_INVENTORY.md docs/feature-council/project-wiki/MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv
node scripts/build-existing-wiki-page-audit.mjs "${EXISTING_WIKI_CLONE}" docs/wiki docs/feature-council/project-wiki/EXISTING_WIKI_PAGE_AUDIT_AND_MIGRATION.csv
npm run check:agent-docs
```

The private five-root inventory uses `scripts/build-project-wiki-source-inventory.mjs`; see `docs/feature-council/project-wiki/MAINTENANCE_PLAN.md` in the application repository for the environment-variable command and prerequisites. Review count/hash changes rather than mechanically accepting them. Any new sensitive file class must update both the generator denylist and artifact invariant checker before regeneration.
