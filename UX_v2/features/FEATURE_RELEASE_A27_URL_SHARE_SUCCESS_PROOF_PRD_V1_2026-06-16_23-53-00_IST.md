# Feature Release A27 URL Share Success Proof PRD v1

Created: 2026-06-16 23:53:00 IST
Owner: PM sidecar / Codex
Status: Draft for adversarial review

## Problem

The delivery gate tracker still marks `url_share_success_not_proven` as open. A12 proved native note share and cleanup, while A25/A26 proved honest URL failure and native share-target log hygiene. None of those artifacts prove that a URL shared from Android can create a successful saved item.

## User Outcome

Arun and future agents should be able to say whether the URL-share path is release-ready with evidence. If the current environment cannot run native Android tooling, the evidence must be explicit about what was proven and what remains unproven.

## Scope

This feature creates a deterministic production URL success proof using a stable, public, readable URL:

`https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`

The fixture was locally preflighted through `extractArticleFromUrl` and returned:

- title: `Example Domains`
- body length: 757
- capture quality: `full_text`

## Requirements

1. Run a production `/api/capture/url` request with the fixture URL using the configured bearer token without printing the token.
2. Verify the response is a successful save, preferably `201` with `capture_result.state=created_full_text`.
3. Verify the saved item exists in production and has the expected source URL, title, source type, and capture quality.
4. Delete the fixture item from production after proof collection.
5. Verify the fixture item count is zero after cleanup.
6. Record that this is production server/API URL success proof, not native Android share proof, if Android tooling is unavailable.
7. Keep raw tokens, raw private DB dumps, and raw evidence out of git.
8. Update QA, PM tracker, milestone tracker, delivery gate tracker, A7 release packet, and root running log.

## Non-Goals

- Do not publish, sign, upload, or distribute an APK.
- Do not claim full native Android URL-share success unless an emulator/device share intent is actually run.
- Do not add a public app-only QA fixture route unless the IANA fixture fails or becomes unstable.
- Do not stage root `RUNNING_LOG.md`, raw heavy evidence, APK outputs, `data/artifacts/`, `assets/`, secrets, SQLite files, or keystores.

## Acceptance Criteria

| Gate | Acceptance |
| --- | --- |
| Fixture preflight | Local extraction returns `full_text` with body length greater than 100. |
| Production capture | Production API returns a saved item and `capture_result.state=created_full_text`. |
| Production DB verification | Production DB shows exactly one item for the fixture after capture. |
| Cleanup | Production DB shows zero items for the fixture after cleanup. |
| Evidence hygiene | No raw bearer token or raw DB dump is written to tracked docs. |
| Status honesty | Trackers distinguish server/API proof from native Android share proof. |

## Risks

- The IANA page can change, be unavailable, or reject fetches.
- Production cleanup could miss related rows if cleanup is not run with SQLite foreign keys enabled.
- A direct API proof could be mistaken for native Android proof.
- Android tooling is currently unavailable in this resumed environment, so native share-intent proof may remain open.

## Rollback / Recovery

If capture creates a fixture item but cleanup fails, run a production cleanup with `PRAGMA foreign_keys=ON` targeting the exact fixture `source_url`, then recheck the count. If DB cleanup cannot be proven, keep the gate open and document the orphaned fixture.

## Open Questions

1. Is server/API URL success sufficient to retire `url_share_success_not_proven`, or does the release owner require native Android share-intent proof?
2. If native proof is required, should Android SDK tools be restored locally or should the proof move to a physical device?
