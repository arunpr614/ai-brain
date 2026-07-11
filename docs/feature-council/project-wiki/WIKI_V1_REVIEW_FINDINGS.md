# Wiki v1 Review Findings and Disposition

**Review date:** 2026-07-11
**Reviewed baseline:** `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` worktree candidate
**Reviewers:** independent feature-status auditor, QA/evidence and AI-agent-usability reviewer, security/privacy reviewer

## Initial verdict

No P0 factual corruption or secret disclosure was found. Wiki v1 was **NO-GO** because independent reviewers found P1 feature-detail, inventory auditability, catalog completeness/runtime traceability, and one security-accuracy overstatement.

## P1 findings and disposition

| Finding | Disposition |
|---|---|
| Feature-family pages did not satisfy the repository's feature-page contract | Expanded all 13 significant feature-family pages with status/confidence, target user/journey, state behavior, architecture/runtime/data/API, security/privacy, configuration/flags, exact test families, operations/change impact, related ideas and pinned evidence. Added semantic enforcement to the structure checker. |
| Master inventory lacked required per-feature and per-idea evidence fields | Added `MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv` with 46 normalized current-feature rows and 37 normalized idea/capability rows, all with required evidence fields. |
| Local research inventory was aggregate rather than file-level | Added `LOCAL_DOCUMENTATION_FILE_INVENTORY.csv` with 17,989 relevant rows after excluding 393 `.npm-cache` entries, 8,176 non-sensitive duplicate mappings, and 6,236 redacted/restricted candidates. Sensitive names and exact metadata are omitted. |
| Existing-wiki audit/migration was grouped rather than page-level | Added `EXISTING_WIKI_PAGE_AUDIT_AND_MIGRATION.csv` with all 63 prior pages and 22 additions, before/after hashes and decisions. |
| Public catalogs omitted current capabilities and discovered ideas | Added theme/shell, production backfill and local-status rows; expanded planned/explored/deferred/rejected/superseded ideas. |
| Generic “Verified release” runtime wording exceeded evidence scope | Replaced with feature-scoped 2026-07-10 labels, historical-not-reverified labels, code/test-only or Unknown as appropriate. |
| Security docs overstated Origin/client-version enforcement | Corrected bearer-primary behavior: version is checked only when present; Origin may be absent; Chrome-extension origins are broadly accepted. |
| Browser Extension incorrectly described configurable endpoint | Corrected to hard-coded/read-only endpoint; only token is stored. |

## P2 findings and disposition

- Reconciled stale main/worktree language in the machine ledger.
- Remapped source-inventory rows to the new detailed owning pages.
- Aligned actual AI Agent Start Here filename/title decision with the migration map.
- Added a successor/current-baseline banner to the historical publication report.
- Separated proposal status from implemented substrate: Repair Center, Evidence Scan and Trust Center proposals remain Planned while current primitives are documented independently.
- Reclassified current settings and offline fallback on their actual contracts; full Trust Center/offline-library ideas remain separate.
- Reclassified global note AI default as Feature-flagged because parent note flags control reachability.
- Clarified Recall as broad partial synchronization with a narrower implemented, flag-controlled daily-import contract.

## Validation added

The structure checker now verifies the exact 84-page corpus, current-main metadata on every living page, Feature Council historical lifecycle wording, and required semantic concepts on every detailed feature page. The privacy checker covers Markdown, CSV, and JSON. The project-artifact checker validates CSV schemas, row counts, page hashes, wiki coverage, required fields, and feature-ledger drift. Synthetic smoke coverage was updated accordingly.

## Re-review result

Independent product/AI-agent-usability, feature-status, security/privacy, and adversarial re-reviews returned **GO** after the recorded fixes. The local v2 candidate is complete; publication remains blocked only by repository PR/render checks, wiki concurrency, fresh-clone/live QA, and delivery recording.
