# Definitive Wiki Maintenance Plan

## Canonical source and publication

`docs/wiki/` is the version-controlled source. The separate GitHub Wiki repository is a published mirror. Edit canonical source first, run checks, merge through the normal repository process, then synchronize the wiki with a normal non-force push after verifying the remote base has not changed.

## Required updates

Update the catalog and owning feature page when a change affects user behavior, routes, APIs, schemas, storage, AI providers, integrations, authentication, flags, tests, deployment, monitoring, limitations, or idea status. Update architecture/data/API/operations pages when a contract changes.

## Verification convention

- Record current-main SHA and date on living pages.
- Record feature-specific runtime evidence separately; never infer it from code presence.
- Use High/Medium/Low confidence for evidence strength.
- Do not refresh only a date. Verification means rechecking cited source, tests, and status.
- Historical pages keep their artifact commit, research date, lifecycle, successor, and explicit absence of runtime proof.

## Status workflow

1. Locate the capability in the master/catalog row.
2. Re-evaluate against current code/config/tests.
3. Record availability: default, feature-flagged, inactive, or not applicable.
4. Re-evaluate runtime evidence independently.
5. Update related ideas and boundaries so proposals cannot masquerade as shipped behavior.

## Validation and publication workflow

1. Run Feature Council generation/checks.
2. Run wiki privacy, structure, internal-link, baseline, and coverage checks.
3. Run the documentation smoke suite and whitespace checks.
4. Review the complete repository diff and publication candidate for sensitive content.
5. Commit/push the canonical source and create/merge the repository PR.
6. Fetch the wiki remote and compare it with the recorded base.
7. Copy canonical pages to the separate wiki clone; preserve history and unrelated remote changes.
8. Run privacy/structure/byte comparisons in the clone.
9. Commit and push normally.
10. Fresh-clone and visually inspect Home, sidebar, catalog, changed feature pages, Mermaid, and links.
11. Record repository/wiki commits and live verification in the changelog, final report, and running log.

## Ownership model

The AI Brain maintainer owns status/runtime decisions and publication. Future agents may research and draft, but should not upgrade status without evidence or publish private operational material. Independent feature-status, privacy, QA, and adversarial review are required for large baseline reconciliations.

## Generated evidence refresh contract

The local inventory requires private read-only access to the same five source roots; the command accepts stable public aliases so private paths never enter the output. Set the private environment variables locally and do not commit their values or an expanded command.

```bash
node scripts/build-project-wiki-source-inventory.mjs \
  source-1-historical-recall-app="${PRIVATE_SOURCE_1}" \
  source-2-research-container="${PRIVATE_SOURCE_2}" \
  source-3-feature-council="${PRIVATE_SOURCE_3}" \
  source-4-wiki-research="${PRIVATE_SOURCE_4}" \
  source-5-current-clone="${PRIVATE_SOURCE_5}" \
  --output docs/feature-council/project-wiki/LOCAL_DOCUMENTATION_FILE_INVENTORY.csv

node scripts/build-existing-wiki-page-audit.mjs \
  "${EXISTING_WIKI_CLONE}" docs/wiki \
  docs/feature-council/project-wiki/EXISTING_WIKI_PAGE_AUDIT_AND_MIGRATION.csv

node scripts/build-master-feature-evidence.mjs \
  docs/agent-docs/feature-coverage-ledger.md \
  docs/feature-council/project-wiki/MASTER_FEATURE_AND_IDEA_INVENTORY.md \
  docs/feature-council/project-wiki/MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv

npm run check:agent-docs
```

The artifact gate requires exactly one normalized record for every feature-ledger and master-idea row, current hashes for all wiki pages, redaction of sensitive paths and metadata, and the recorded source/page counts. A changed private source set may legitimately change the local inventory count; update the expected count and summary only after reviewing the full delta and rerunning privacy/adversarial review.
