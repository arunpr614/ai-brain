# Feature Release A32 - Roadmap Status Reconciliation PRD v1

Created: 2026-06-17 01:25:00 IST
Owner: Codex
Status: Draft for adversarial review
Related gates: A31 APK publication authorization packet, delivery gate tracker, root roadmap tracker

## Objective

Reconcile `ROADMAP_TRACKER.md` with the current UX v2 release state after A31, without changing app code, deploying, publishing, or staging unrelated dirty files. A32 exists because the strategic roadmap still names older APK artifacts and "next product lane" language that can mislead the next agent away from the active UX v2 release gate.

## Problem Statement

`ROADMAP_TRACKER.md` currently says the latest Android artifact is `brain-debug-v1.0.2-code3.apk`, while A31 freshly verified `brain-debug-v1.0.5-code6.apk`. The roadmap also points to Library Offline Reads as the next product lane even though the active thread goal is still UX v2 release closure and APK publication authorization. This creates a status split between the strategic roadmap and the release trackers.

## Source Evidence

| Evidence | A32 interpretation |
| --- | --- |
| `ROADMAP_TRACKER.md` | Strategic tracker is stale for current UX v2/APK status. |
| `UX_v2/execution/UX_V2_A31_APK_PUBLICATION_AUTHORIZATION_PACKET_2026-06-17_01-15-00_IST.md` | Current authoritative APK decision packet. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Current release status source after A31. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Current gate matrix. |
| `UX_v2/trackers/milestone_tracker.md` | Current milestone state through A31. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A32-R1 | Add a new current-status changelog entry to `ROADMAP_TRACKER.md`. | P0 | Top changelog records web production, Android `1.0.5/code6`, A31 packet, and publication blocked state. |
| A32-R2 | Preserve older roadmap history rather than rewriting it as if it never existed. | P0 | Older v0.9.8/v0.9.9 entries remain historical. |
| A32-R3 | Update the version lane summary so UX v2 is the active release gate. | P0 | Summary includes a current UX v2 row and marks APK publication as gated by owner decisions. |
| A32-R4 | Avoid overclaiming APK publication. | P0 | Roadmap says decision packet ready, not published/signed/uploaded. |
| A32-R5 | Keep scope to roadmap/status docs. | P0 | No app source, APK, artifacts, Telegram docs, or root running-log staging. |
| A32-R6 | Create an A32 PM update and milestone tracker row. | P1 | Tracker update and milestone row record reconciliation complete. |
| A32-R7 | Append root running log entry. | P1 | Running log records A32 as append-only and remains unstaged unless explicitly approved. |

## Acceptance Criteria

1. A32 PRD/review/plan/review files exist before execution.
2. `ROADMAP_TRACKER.md` no longer presents `1.0.2/code3` as the latest current APK; it remains only as historical v0.9.9 evidence.
3. Current roadmap status aligns with A31: `web_production_deployed_a31_android_1_0_5_publication_decision_packet_ready_publication_gated`.
4. A32 validation confirms no broad staging, no root `RUNNING_LOG.md`, no Telegram docs, no APKs/artifacts, and no app source changes staged.

## Out Of Scope

- App code changes.
- APK build, signing, upload, or publication.
- Web production deploy.
- Rewriting old roadmap history beyond adding a new superseding entry.
- Resolving the owner publication decision.
- Editing unrelated Telegram plan docs.

## No-Go Conditions

- A32 claims full goal completion.
- A32 marks APK publication authorized.
- A32 stages `RUNNING_LOG.md`, Telegram docs, APKs, AABs, keystores, DBs, `.env`, raw evidence, `assets/`, or `data/artifacts/`.
- A32 erases older roadmap history instead of superseding it.
