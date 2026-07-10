# Adversarial Review - A21 Final Post-A20 Review PRD V1

Created: 2026-06-16 21:11:00 IST
Reviewer: Codex adversarial review pass
Target: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_PRD_V1_2026-06-16_21-10-00_IST.md`
Recommendation: Revise before implementation planning

## Findings

| Severity | Finding | Evidence | Revision Input |
| --- | --- | --- | --- |
| P1 | The PRD does not require independent inspection of the actual staged diff slices. | It says review `git diff --cached`, but does not require materialized diff files or reviewer-specific slices. | Add durable `/tmp` staged inputs for source/security/public/governance review and record their paths in the review report. |
| P1 | The PRD could produce a false "go" without revalidating the staged index after A21 docs are added. | A21 itself will create/stage governance docs, changing the staged path count. | Require final staging/checks after A21 docs are added, and record the final count. |
| P2 | The PRD does not require a clear residual-gate distinction between commit readiness and publication readiness. | APK publication, TalkBack, URL-share, and heavy-evidence decisions remain open. | Recommendation labels must separate commit consideration from deployment/publication readiness. |
| P2 | The PRD does not require checking whether root `RUNNING_LOG.md` stayed unstaged after the final log append. | A20 intentionally left it unstaged; A21 will append again. | Require a final no-running-log-in-index check after the A21 running-log update. |

## Required Revisions

1. Add staged diff slices as explicit review inputs.
2. Add final post-A21 staging and exclusion checks.
3. Separate commit recommendation from publication/deployment recommendation.
4. Require root running-log exclusion after the final log update.
