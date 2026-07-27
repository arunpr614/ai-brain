# Reference and Evidence Inventory

## How to use this inventory

This document identifies the sources that governed the work and explains what each can and cannot prove. It supplements, but does not replace:

- [Source inventory](../../SOURCE_INVENTORY.md)
- [Source hash manifest](../../source-reconciliation/SOURCE_HASH_MANIFEST.md)
- [Source reconciliation](../../SOURCE_RECONCILIATION.md)
- [Dependency graph](../../DEPENDENCY_GRAPH.md)
- [Implementation baseline](../../IMPLEMENTATION_BASELINE.md)

The frozen source inventory recorded 140 readable local paths, 126 unique SHA-256 values, 14 exact duplicate groups, and zero missing files at inventory time. The filename-level record and duplicate groups are in the hash manifest.

## Governing goal

| Source | SHA-256 | Role |
|---|---|---|
| [Governing-goal public snapshot](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md) | Sealed by this package's manifest | Portable execution authority, release boundary, stage order, evidence gates, source precedence, worktree rules, and definition of done |
| Original user-supplied goal | `cc36749e07396736baa30515ea5b18cad6038c3024f9ab57fb7d5fa4e2a68235` | Provenance only: 899-line source from which the public snapshot was derived; no machine-local source path is required |

Read the repo-relative public snapshot before resuming the parent implementation
goal. If it conflicts with a current approved source, apply the precedence rules
and record the resolution; do not seek a machine-local attachment.

## Final manual-enrichment package

**Repo-relative root:** [manual-enrichment planning package](../../../../plans/youtube-item-recovery-enrichment)

The source inventory recorded 49 files: 28 Markdown, 2 HTML, 17 PNG, 1 JavaScript, and 1 JPEG.

| Primary artifact | SHA-256 | Role |
|---|---|---|
| `README.md` | `ab4bba95ac6f7ca844f1f3c2eeeac9fc04964786ebae7d72e1aa7e6f7e3d0ea7` | Package index and review order |
| `2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v2_final.md` | `0ca6e4bc16ad4b1774d65f7ecd942f10246831e6ee3375ee439cb6026c7f5a7d` | Final reconciled product/design/architecture decisions |
| `2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v2_final.md` | `616f1eb38142aaf10cce560adff3b8f773ae97f906ec1f4cedc086145eaf72cd` | `ME-F01` through `ME-F38` and product acceptance |
| `2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v2_final.md` | `355ef84ae54f82e396d3fc99eb80b81d9e4e3ae3aa5da5ae0b64662d0c1a3bf9` | Data, service, worker, security, migration, and rollout plan |
| `2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v2_final.md` | `444191dff9cd24ed2c6938c2fad9da5197f837d75de2ab2e1f8595df55d7937c` | Desktop/mobile state, copy, interaction, and accessibility contract |
| `2026-07-22_manual_enrichment_v2_requirement_traceability.md` | `585625e55a3277db60b6c5304da4b55b107f6178a15c4599a40208aef84a2cbe` | Deterministic 38-requirement mapping |
| `2026-07-22_v1_review_disposition_matrix_v2_final.md` | `b6a4437504eda64fbe0f70ad253a895bf7fd9036a81839f1c82add8986e6ec48` | V1 finding disposition |
| `MANUAL_ENRICHMENT_V2_FINAL_CROSS_ARTIFACT_ADVERSARIAL_REVIEW_2026-07-22_17-47-51_IST.md` | `29cc936176b6b18f46ceabbb4505c2b20208f3b9063815249ff2678e0586b214` | Final planning-package review and residual implementation blockers |
| `2026-07-22_current_state_audit_v2_final.md` | `81f71bbb64063164207f2fbdd3dfddb6916bdd07fe4f31e5ac1b73775bb67a49` | Historical code audit pinned to `cbaed78`; not current-main truth |
| Final delivery report | `00be71a10b8735376346dfc3906cc849b3621f197b85e64fd600a4096b16293e` | Final planning-package delivery and validation record |
| `prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v2_final.html` | `0436dc4d4bc7d96f600de8d6bec5635a466a03ef511b06d20b9e521191c10739` | Inert final experience reference |

The sibling screenshots and prototype QA evidence define review, authorization, held, running, partial, retry, drift, deletion, and completion states. They are design evidence, not runtime implementation evidence.

## DOM capture and exact-item recovery package

**Repo-relative root:** [DOM capture planning package](../../../../plans/youtube-dom-capture)

The source inventory recorded 29 files: 18 Markdown, 2 HTML, and 9 PNG.

| Primary artifact | SHA-256 | Role |
|---|---|---|
| `2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md` | `9f4d28f26d843507d0244cfb9d379c3b44b885b793d7e93250cd1542d457c886` | 27 P0 capture requirements and 9 NFRs |
| `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md` | `d4bf6ebe0ec2680ef148ad88c56558f27bba765040b8faf02805baa75b010ca6` | Generic capture architecture and stage sequence |
| `2026-07-22_youtube_dom_capture_review_resolution_matrix.md` | `f50235fb790d641bf6e542a6a57792c86d40f55af6060e412f47244dfd655ffb` | V1 finding resolution |
| `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md` | `d6cb468815f14a1c26434eb7ccaa12e8fcee26702ada489447f8f8fe63f980d6` | Later exact-item intent-bound narrowing |
| `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html` | `8ed4fd11d7f0d504289733822ced2e7194db58c59500cf7e38287c708a98f0de` | Integrated item-to-side-panel journey |
| `prototype/2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html` | `96a84ffc28aeb77a3c2dc13fe0d5da31166ace2ce143859231ab4c76489e26a7` | Generic capture prototype; subordinate when it conflicts with exact-item recovery |

The exact-item Product Council decision supersedes generic URL-dedup destination selection. It defines a 30-minute intent bound to user/account, item, item revision, canonical video, extension version, and return path.

## Post-planning verification package

**Repo-relative root:** [post-planning verification package](../../../../research/youtube-transcripts)

The source inventory recorded 11 files: 6 Markdown and 5 CSV.

| Primary artifact | SHA-256 | Role |
|---|---|---|
| `2026-07-22_18-23-41_IST_ai_brain_chrome_companion_post_planning_verification_v2_final.md` | `999cad416c163eed89237b1084a8c5cf54bd5128f9023f467cb69aae000dcf53` | Highest-ranked supplied V2 architecture addendum |
| `AI_BRAIN_CHROME_COMPANION_POST_PLANNING_VERIFICATION_ADVERSARIAL_REVIEW_2026-07-22_18-31-04_IST.md` | `41865862da76cf2dcb621e63780f3d3f1e4650c549805a84cc3a348bd7746692` | Independent review of the verification addendum |

The linked GitHub landscape, repository inventory, validation matrix, commit-pinned source evidence, and decision addenda must be interpreted as their recorded snapshots unless revalidated against current repository state.

## Historical visual context

| Artifact | SHA-256 | Authority |
|---|---|---|
| Historical generic DOM-capture prototype (hash-only; not required for execution) | `917da0ad67af38e52bcc6b44ecbbb17a998328446962a3840212b865cad0f378` | Lowest-precedence context only; intentionally has no machine-local path |

Do not copy behavior from the historical prototype when a final V2 or exact-item artifact differs.

## Pull-request lineage

| PR | Final state | Final head | Merge commit | Role |
|---|---|---|---|---|
| [#41](https://github.com/arunpr614/ai-brain/pull/41) | Merged | `8bfe5274c9c070244d2c5f57898d29fccf012458` | `ea801efa024914d601b495f968153aa5680e2e1e` | Final generic DOM-capture plan |
| [#42](https://github.com/arunpr614/ai-brain/pull/42) | Merged | `35700f7b469fe9d5c7d02263ab921508949ad201` | `508d9f2c1552833d59f3056fa84abd7dadc9ae17` | Exact-item recovery prototype and Product Council |
| [#48](https://github.com/arunpr614/ai-brain/pull/48) | Merged | `42ad6570854870153ff10a105e380044715ef2fb` | `bf08e3a3500c21e4c860abc85fa273fa936dfd5e` | Held manual-enrichment plan |
| #50 | Merged | `9f437f24c2557899117e0b9c1f414a2e5273d24a` | `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` | Post-planning verification publication |
| [#57](https://github.com/arunpr614/ai-brain/pull/57) | Open draft | `4786b079e88cc01ec8e9c300faa93e3832ae2678` at snapshot | Not merged | Current implementation foundations |

At the 2026-07-27 snapshot, #41, #42, and #48 were rechecked as merged. PR #57 was open, draft, mergeable, and targeted `main`.

## Current feature-council implementation corpus

Before this handover package, the implementation folder contained 70 tracked files plus the one untracked D-021 addendum: 71 filesystem artifacts in total. The primary control documents are:

- [Source inventory](../../SOURCE_INVENTORY.md)
- [Dependency graph](../../DEPENDENCY_GRAPH.md)
- [Source reconciliation](../../SOURCE_RECONCILIATION.md)
- [Implementation baseline](../../IMPLEMENTATION_BASELINE.md)
- [Migration collision resolution](../../MIGRATION_COLLISION_RESOLUTION.md)
- [Implementation tracker](../../IMPLEMENTATION_TRACKER.md)
- [Decision log](../../DECISION_LOG.md)
- [Risk register](../../RISK_REGISTER.md)
- [Requirement traceability](../../REQUIREMENT_TRACEABILITY.md)
- [Two-channel transfer addendum](../../decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md)
- [Caller containment inventory](../../implementation/CALLER_CONTAINMENT_INVENTORY.md)
- [Release authority matrix](../../implementation/RELEASE_AUTHORITY_MATRIX.md)
- [Security and privacy review](../../implementation/SECURITY_PRIVACY_REVIEW.md)

### Important staleness warning

Some earlier control documents still describe the pre-D-020 feature sequence as 027/028/029. Protected main later consumed ordinary migration 027. D-020 and the current tracker shift the coordinated feature sequence to:

1. `028_youtube_browser_transcript.sql`;
2. `029_manual_transcript_enrichment_expand.sql`;
3. `030_manual_transcript_enrichment_contract.sql`.

Do not implement the stale filenames from older matrices. Reconcile and update those documents before treating them as current release evidence.

## Frozen Stage 2 contract package

| Artifact | SHA-256 | Mode | Meaning |
|---|---|---:|---|
| [Physical-schema addendum](../../implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md) | `d1eef042423d7d2d3413637f62bd8ed5842b64846db6f656a0b8e1cb7e5eed48` | hash authoritative; local mode may be `0444` | Accepted exact contract; 16,988 lines |
| `implementation/fixtures/stage2-acceptance-registry-v2.json` | `7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45` | hash authoritative | AC01–AC17 registry |
| `implementation/fixtures/stage2-contract-static-authority-index-v1.json` | `e691edfd0edcade37d439906f3b97dee9a3b05d57baae995ae23fb0254bbfd5d` | hash authoritative; local mode may be `0444` | Static authority index |
| `implementation/fixtures/verify-stage2-contract-static-authority-index.mjs` | `133d55fae063244e7c6d413c64acbe88ebf0d1e83736296d9a00ca00de2e68a6` | hash authoritative; local mode may be `0444` | Exact verifier |

Git records ordinary tracked files as `100644` and does not preserve the local
read-only bits. A fresh-checkout `0644` mode is not tampering. Exact content
hashes and the verifier are authoritative; `0444` is only a local best-effort
guard.

One durable final Contract GO report consolidated three independent session
review passes. Contract GO permits disposable implementation and
private/synthetic evidence only. It is not migration, runtime, lab, production,
or release authority.

## Stage reviews used

The following reviews materially governed advancement:

- Stage 0 initial review and focused recheck in the feature-council root;
- Stage 1 final gate and focused final recheck in the feature-council root;
- Stage 2 physical-schema rejected draft and one durable final Contract GO
  report informed by three independent session review passes;
- `implementation/STAGE_2_DISPOSABLE_NATIVE_ROUTE_FINAL_GATE_ADVERSARIAL_REVIEW_2026-07-27_09-45-26_IST.md`;
- `ReviewReport/YOUTUBE_STAGE_2_DISPOSABLE_FILE_FACTORY_NOMINAL_CI_GATE_ADVERSARIAL_REVIEW_2026-07-27_12-08-23_IST.md`;
- the 2026-07-27 D-021 review summarized in [session findings](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md).

Each review is valid only for the exact bytes and authority described in that review. Material byte changes require a new review.

## SQLite advisory sources

The D-021 work used current official SQLite documentation:

- <https://www.sqlite.org/wal.html#the_wal_reset_bug>
- <https://www.sqlite.org/wal.html>
- <https://www.sqlite.org/walformat.html>
- <https://www.sqlite.org/lang_transaction.html>

The verified claim is narrow: SQLite 3.7.0 through 3.51.2 is in the published affected range; the issue is fixed in 3.51.3 and later, with official 3.50.7 and 3.44.6 backports. The current AI Brain native pin is SQLite 3.49.2. This proves an affected source selection, not that AI Brain experienced the race.

The uncommitted D-021 addendum currently hashes to `b8d38446b7a40b0e60536a899abd31f0afdc9946367433618a9220fdc482878b` and is **not accepted**; its first review returned four P1 findings.

## Direct code evidence named by the planning packages

The exhaustive per-file paths and hashes remain in `source-reconciliation/SOURCE_HASH_MANIFEST.md`. They were rehashed on 2026-07-27: all 140 were readable, with zero missing and zero mismatches. Direct evidence outside the package roots is grouped as follows:

| Historical alias | Count | Portable replacement | Contents |
|---|---:|---|---|
| `RW` | 10 | Current repository paths named in the source manifest; revalidate current bytes | Extension, capture, route, database, policy, and Telegram source snapshot |
| `DW` | 11 | [Repo-relative DOM capture package](../../../../plans/youtube-dom-capture) plus current source paths | Historical plans/research plus extension/backend source snapshot |
| `MW` | 24 | [Repo-relative manual-enrichment package](../../../../plans/youtube-item-recovery-enrichment) plus current source paths | Five copied planning inputs plus 19 audited implementation paths |
| `GD` | 1 | [Repo-relative verification package](../../../../research/youtube-transcripts) | Byte-identical verification-review mirror at inventory time |

The original inventory lists 21 directly linked files outside the four package roots plus 19 implementation files named by the manual audit. Major current subsystems that must be re-audited before implementation include:

- `src/db/client.ts`;
- item repair and upgrade paths;
- existing `/enrich` and enrichment-status routes;
- enrichment, batch, embedding, note-index, transcript, and recovery workers;
- item status, retrieval, Ask, Related, and search projections;
- `src/instrumentation.ts`;
- configured-origin, deployment, processing HTTP, and redaction helpers;
- current item-page and enrichment UI components; and
- release, retention, backup, migration, and deployment scripts.

Use [caller containment inventory](../../implementation/CALLER_CONTAINMENT_INVENTORY.md) as the starting list, then generate a fresh machine-checkable opener/claimant/checkpoint inventory. Historical code hashes do not prove current behavior.

## Requirement corpus

- 27 DOM-capture P0 functional IDs.
- 9 DOM-capture non-functional IDs.
- 38 manual-enrichment P0 functional IDs.
- Total: 65 P0 functional IDs plus 9 capture NFRs.

The implementation mapping lives in [requirement traceability](../../REQUIREMENT_TRACEABILITY.md). A row is verified only when exact landed code, exact test path/case, executed command and counts, durable evidence, independent review, environment authority, and residual risk are all recorded.
