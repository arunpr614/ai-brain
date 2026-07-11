# Definitive AI Brain Wiki Publication Candidate - Adversarial Review

**Created:** 2026-07-11 11:54:25 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `docs/wiki/`, agent-doc ledgers, project-wiki artifacts/CSVs, validation scripts, current-main evidence, existing-wiki migration, and the complete candidate diff
**Report path:** `docs/feature-council/project-wiki/DEFINITIVE_AI_BRAIN_WIKI_PUBLICATION_CANDIDATE_ADVERSARIAL_REVIEW_2026-07-11_11-54-25_IST.md`

## Executive Verdict

Initial verdict: **NO-GO**. No P0 was found. Two P1 acceptance failures required source-generator and validation changes before publication. Final re-review verdict: **GO**. All P1/P2 fixes, including later raw-log/live/runtime and plural-screenshot policy gaps found during independent security re-review, are closed and regression-tested.

## Evidence Inspected

- Complete repository diff from `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
- All 84 candidate wiki pages and global navigation.
- Feature, source, baseline, command-safety, and publication ledgers under `docs/agent-docs/`.
- Required project-wiki Markdown artifacts and all three audit CSVs.
- Builders/checkers/smokes for generated pages, privacy, structure, coverage, and project artifacts.
- Representative current-main auth, extension, database, capture, search, notes, Recall, operations, and test evidence.
- Existing-wiki baseline and the page-level audit/migration output.
- Local documentation, documentation smoke, privacy, link/reachability, lint, type, application-test, and whitespace gates.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Sensitive local artifacts were misclassified as publication candidates

**Evidence:** The first reviewed CSV preserved paths and exact size/time/hash metadata for a debug keystore, timestamped SQLite backups, packaged client binaries, and production-key/live-evidence records. The initial path denylist and artifact checker did not reject these classes.
**Why it matters:** Even without file contents, names and exact metadata disclosed private operational/security artifact structure and contradicted the public exclusion policy.
**Failure mode:** The definitive public inventory would claim sensitive operational artifacts were safe and could make stable identifiers available for correlation.
**Recommendation:** Conservatively redact sensitive classes, omit exact metadata, enforce the boundary independently, regenerate, and re-review.

**Disposition:** Fixed locally. One shared policy used by generator, checker, and smoke covers database/backup, signing/keystore, packaged client, generic log/JSONL, nested data artifacts/errors, standalone live/runtime, Android/device/ADB/UI-automation/singular-or-plural-screenshot evidence, key/credential, private/session, and equivalent path classes; generated `.npm-cache` is excluded. Every excluded-sensitive row publishes only a one-way `redacted-path/` identifier plus type/classification; size, modification time, and content hash are `<redacted>`. Regression fixtures include every missed class. The regenerated inventory contains 17,989 relevant rows after 393 generated-cache exclusions, 8,176 non-sensitive duplicate mappings, and 6,236 restricted/excluded rows.

#### 2. Full-context evidence existed for features but not every idea

**Evidence:** The first 46-row detailed dataset represented current features only. The 37 planned/explored/deferred/rejected/superseded rows had only six summary fields, and validation compared detailed records only with the feature ledger.
**Why it matters:** A future agent could not reliably distinguish an idea's user opportunity, absence boundary, adjacent substrate, data/config/integration implications, relations, aliases, runtime state, and evidence age.
**Failure mode:** Planning work would repeat research or accidentally promote adjacent substrate into an implementation claim.
**Recommendation:** Add a complete normalized record for every master idea and enforce exact one-to-one coverage.

**Disposition:** Fixed locally. `MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv` now contains 46 `feature` and 37 `idea` records. Every idea explicitly states the opportunity, target, absent journey/coverage, adjacent code evidence, lack of end-to-end test/runtime proof, documentation source, route/data/config absence, dependencies, limitations, relations, aliases, runtime status, and verified commit/date. The artifact checker compares exact names and counts against both source tables and rejects missing, unexpected, duplicate, blank, or invalid records.

### P2 - Medium Risk

#### 1. Two machine-readable contract descriptions were inaccurate

**Evidence:** The master row called the extension endpoint configurable, while source makes it hard-coded/read-only; the auth ledger called bearer storage settings state, while source uses process environment and repository-root `.env`.
**Why it matters:** These are change-entry and security-boundary fields used directly by agents.
**Failure mode:** An agent could implement configuration in the wrong layer or search for nonexistent database state.
**Recommendation:** Align both fields with current source.

**Disposition:** Fixed. Only the extension token is described as configurable; bearer state is recorded as `BRAIN_API_TOKEN` in process environment/repository-root `.env`.

#### 2. Local inventory summary counts disagreed with the CSV

**Evidence:** Three folder-summary rows were 18, 1, and 1 files higher than their exact CSV group counts.
**Why it matters:** A definitive audit must not contain avoidable count drift.
**Failure mode:** Reviewers cannot tell whether sources were omitted or the summary was stale.
**Recommendation:** Recompute and align source-group totals.

**Disposition:** Fixed at 14 / 12,584 / 664 / 2,273 / 2,454, totaling 17,989 relevant files after generated-cache exclusion.

#### 3. Page-by-page audit fields were mostly category boilerplate

**Evidence:** The first builder assigned quality/accuracy/duplication/completeness using broad core-versus-research categories.
**Why it matters:** A page audit must explain why each existing URL is preserved or changed.
**Failure mode:** A mechanically complete CSV could hide a low-quality migration decision.
**Recommendation:** Add page-specific content analysis and preserve the audit as a checked artifact.

**Disposition:** Fixed. All 19 prior living/core pages now have individual quality, accuracy, duplication, completeness, preservation, action, and rationale notes plus measured word/heading/link counts. Each of the 44 historical pages records its exact artifact class, revision relationship, measured content, lifecycle limitation, and preservation rationale. Page hashes and all 84 destinations remain checked.

### P3 - Low Risk Or Polish

#### 1. Generated-artifact refresh prerequisites were implicit

**Disposition:** Fixed. `MAINTENANCE_PLAN.md` and the published Documentation Maintenance page contain placeholder-safe commands and private-prerequisite/count-review rules for all three builders.

#### 2. Mermaid validation is structural, not rendered

**Disposition:** Accepted only as a remote publication gate. Local checks validate fences, page graph, and written fallbacks. GitHub-rendered Home/System Architecture/Feature Architecture diagrams remain mandatory visual QA before merge and again on the live wiki.

## What The Original Plan Or Work Gets Wrong

The initial candidate treated a path denylist as sufficient without independently enforcing sensitive artifact classes, and it equated a complete feature ledger with a complete feature-and-idea context dataset. It also claimed the page audit was page-by-page before its assessment fields were meaningfully page-specific. These assumptions are removed from the revised artifacts and gates.

## Missing Validation

- Fresh independent privacy/adversarial re-review of the exact regenerated CSVs.
- GitHub-rendered Mermaid, long-table, sidebar, and representative-page inspection.
- Repository PR checks and protection behavior.
- Wiki remote-SHA concurrency check, byte-equal fresh clone, and live page/link/render verification.

## Revised Recommendations

1. Keep publication blocked until the regenerated 17,989-row inventory and 83-row feature/idea record receive independent GO.
2. Run the complete local suite after all report/count updates.
3. Use the PR render as the first GitHub visual gate; fix rendering before merge.
4. Publish only after normal PR checks/merge and wiki remote-SHA protection.
5. Re-run link/privacy/structure/byte checks from a fresh wiki clone and inspect live rendering.

## Go / No-Go Recommendation

**GO for the local publication candidate.** Independent adversarial and security/privacy re-reviews confirm all P1 dispositions, and the full local suite remains green. The candidate may proceed to the remote PR/render gates. This GO does not waive PR checks, wiki remote-SHA concurrency, fresh-clone equality, or live-render verification.

## Plan Revision Inputs

### Required Deletions

- Delete the assumption that every non-secret-looking relative filename and metadata tuple is publication-safe.
- Delete the assumption that summary idea rows satisfy the same context requirement as detailed feature records.

### Required Additions

- Sensitive-class path and metadata redaction invariants.
- One normalized detailed record per master idea row.
- Page-specific audit evidence and reproducible builder commands.

### Required Acceptance Criteria Changes

- Require exact 46-feature plus 37-idea detailed-record coverage, not feature count alone.
- Require excluded-sensitive rows to hide original path, size, time, and hash.
- Require every prior page's audit decision to contain page-specific evidence.

### Required Validation Changes

- Compare exact feature/idea names and counts across source tables and the normalized CSV.
- Fail when a sensitive path class is a publication candidate or sensitive metadata is not redacted.
- Keep remote rendered-diagram/table QA as a hard pre-merge and post-publication check.

### Required No-Go Gates

- Any P0/P1 finding lacks a verified disposition.
- Any sensitive inventory class or exact sensitive metadata survives regeneration.
- Any feature/idea lacks one normalized evidence record.
- Any PR/wiki concurrency, protection, privacy, link, byte-equality, or render gate fails.

## Residual Risks

Pattern-based disclosure checks cannot prove semantic safety for every future filename. Future new binary/evidence classes need denylist and invariant updates. Idea detail is explicit about unknown/uncommitted behavior but cannot manufacture decisions absent from sources. GitHub rendering and remote state remain outside local validation until the publication workflow reaches those gates.
