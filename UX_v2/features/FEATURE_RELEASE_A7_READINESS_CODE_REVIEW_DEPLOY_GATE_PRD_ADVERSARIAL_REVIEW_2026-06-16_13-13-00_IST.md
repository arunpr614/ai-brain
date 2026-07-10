# Adversarial Review: A7 Release Readiness PRD V1

Created: 2026-06-16 13:13:00 IST
Reviewer: Main Codex using adversarial-review rubric
Verdict: No-go until revised

## Findings

| Severity | Finding | Evidence | Required Revision |
| --- | --- | --- | --- |
| P1 | PRD allows ambiguous `Go only for web-local candidate` status that could be mistaken for production approval. | V1 Goals include that status without defining release semantics. | Replace with exact status model: `go_for_production`, `no_go_release_blocked`, `local_candidate_only`. |
| P1 | PRD does not require dirty-worktree attribution, which is critical because the repository contains many pre-existing modified/untracked files. | Current `git status --short` shows broad dirty state across docs, source, Android assets, and scripts. | Require the review packet to separate A7-intentional files from pre-existing project/user/agent changes and avoid ownership over unrelated diffs. |
| P1 | PRD under-specifies deploy safety. | Non-goals say do not deploy with blockers, but acceptance does not require backup integrity, item-count sanity, rollback command, service status, live smoke, or observability proof. | Add mandatory deploy evidence rows; no production deploy without all required rows green. |
| P2 | PRD does not define code-review scope tightly enough for a huge diff. | Current worktree contains historical modifications beyond this agent's slice. | Scope review to changed UX v2 release surfaces and release-critical contracts; explicitly document residual risk from broad uncommitted state. |
| P2 | PRD does not require sidecar findings to be integrated or recorded as unavailable. | Sidecar agents may finish after local packet drafting. | Require the final packet to either incorporate sidecar results or mark them pending. |
| P2 | PRD does not specify no-secret handling for generated JSON/artifacts beyond a general sentence. | A5/A6 evidence touches sessions, tokens, pairing codes, APK hashes. | Require explicit redaction checks for tokens/cookies/PINs/pairing codes in generated release artifacts. |

## Required V2 Changes

- Use exact release status values.
- Add dirty-worktree attribution.
- Add explicit deploy evidence checklist.
- Scope code review to release-critical changed surfaces and state residual risk.
- Require sidecar result integration or pending marker.
- Add artifact redaction check.
