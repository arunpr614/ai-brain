# Graphify Opportunity — Source Inventory

## AI Brain

| Source | Type | Baseline | Status |
|---|---|---|---|
| AI Brain repository | Primary code, tests, schemas, config, docs | `8c1341100b174fe4ca518e6a745c30b9078df21c` | Verified 2026-07-12 |
| AI Brain GitHub Wiki | Maintained documentation | `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1` (`master`) | Verified 2026-07-12; 86 Markdown pages |
| AI Brain Git history | Change evidence | Through baseline SHA | Verified 2026-07-12: `fdd7406` introduced durable manual sync; PR #22 merged it at `4e917c7`; PR #23 merged rollout fixes at `5b92e68`; `5b92e68` is an ancestor of the audit baseline. Questions checked: merge identity, feature presence, rollout-fix ancestry, and Wiki candidate-language freshness. |
| AI Brain protected CI | Test/build/docs validation | Product CI run `29200243743`; Agent docs run `29200243741` at baseline SHA | Verified successful; 894/894 tests across 95 suites |
| Deployed behavior | Runtime evidence | Current deployment pending verification | Use only when safely verifiable |

## Graphify

| Source | Type | Baseline | Status |
|---|---|---|---|
| Graphify repository | Primary source and tests | Default branch `v8`, `eec7a0183847cbdc8a87d92b233759a5204b89fe`; latest GitHub release `v0.9.13` | Verified clone/API 2026-07-12; detailed inspection in progress |
| Graphify repository documentation | Official documentation | Default branch `v8`, same commit as source | Complete source-note review |
| Graphify website | Official product claims | Verification date 2026-07-12 | Complete claims map; qualifications retained |
| Issues/discussions/releases | Maintenance and limitation evidence | Exact references in product/risk notes | Complete targeted review |
| Synthetic Graphify proof of concept | Isolated executable evidence | Graphify `0.9.13` at `eec7a018`; fictional TypeScript fixture | Completed 2026-07-12; see POC report |

## Validation distinctions

- AI Brain exact-baseline protected Product CI: 894/894 tests, 95 suites, static/build/docs/release gates passed. In the nested worktree, four Processing suites could not resolve a declared package; this observed local dependency-resolution failure is not product evidence, and no more specific cause is asserted.
- Graphify exact-baseline upstream tests: 3,168 passed and 3 skipped on Python 3.10/3.12; the technical reviewer independently reproduced 3,168 passed and 3 skipped with all extras on Python 3.12.
- Graphify Bandit and dependency-audit commands exit nonzero but are configured `continue-on-error`; overall green CI is not evidence of a clean security scan.

### Version-line caution

The repository's remote default branch is `v8`. Its current `pyproject.toml` reports package version `0.9.13`, and GitHub marks `v0.9.13` as the latest release. A separate `v1.0.0` tag exists on an older lineage and is not contained by `v8` (`v8...v1.0.0` diverges by 1,073 versus 28 commits at verification). Research must state explicitly whether a claim applies to the default-branch baseline, the historical `v1.0.0` tag, or a published package release.

## Evidence labels

- **Verified source behavior:** supported directly by inspected implementation.
- **Verified test behavior:** supported by an inspected or executed test.
- **Official documentation claim:** asserted by repository documentation but not independently verified.
- **Official website claim:** marketing/product claim requiring qualification.
- **Inference:** conclusion drawn from evidence and explicitly labeled.
- **Unknown:** evidence not yet available.
