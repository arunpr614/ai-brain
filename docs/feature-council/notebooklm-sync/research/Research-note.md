# AI Brain → NotebookLM Synchronization — Research Note

**Started:** 2026-07-21
**Current status:** Broad-sync research, three independent PM reviews, and council v1/review/v2 are complete with product decision **Defer**. The later, narrower consumer one-click repository analysis is complete: `notebooklm-py` ranks first and S11 raises credential-free validation to 59/59. Live Google evidence and implementation remain separately gated.

## Research questions

1. Which NotebookLM editions currently expose a documented source-management path?
2. What account, license, Cloud project, location, OAuth/IAM, and Drive conditions apply?
3. Which source types and lifecycle operations are supported, and at what release stage?
4. What supported fallback exists for consumer or Workspace users without the Enterprise API?
5. Which existing AI Brain Recall/job/auth/data patterns can be reused without coupling the adapters?
6. Which mapping and aggregation strategy remains viable at 10, 50, and 100 items/day?
7. Can retries, overlapping triggers, and lost responses be reconciled without duplicate sources?
8. What privacy disclosure, exclusion controls, credential storage, observability, and disconnect behavior are mandatory?
9. For one explicit item and one preconfigured consumer notebook, which unofficial repository has the safest copied-text, readiness, ambiguity, and local-credential contract?

## Evidence discipline

- Official Google claims are separated from observed behavior.
- Third-party projects are assessed at a recorded release/tag or commit.
- Community reports may identify questions but do not establish official support.
- Current code and tests outrank older plans for AI Brain behavior.
- Unverified inferences are explicitly labeled and receive a revalidation date.

Broad-sync findings are integrated into dated research-synthesis v1/review/v2 and council v1/review/v2 artifacts. The Gate 0 request was issued once and is not repeated. The later one-click repository-fit report makes a technical recommendation for one separately authorized local synthetic feasibility spike; it does not issue a product Go/Limited-go decision. Neither the 59 local checks nor static third-party source inspection establishes live provider compatibility or authorizes implementation.
