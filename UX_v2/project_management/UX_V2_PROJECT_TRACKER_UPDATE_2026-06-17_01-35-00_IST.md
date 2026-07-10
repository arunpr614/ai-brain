# UX v2 Project Tracker Update - A32 Roadmap Status Reconciliation

Created: 2026-06-17 01:35:00 IST
Owner: Codex
Status: `roadmap_status_reconciled_publication_gated`
Scope: documentation/status tracking only. No app code changed.

## Summary

A32 reconciles the strategic roadmap with the A31 release gate. The root roadmap now says the current Android debug candidate is `1.0.5/code6`, the current release status is `web_production_deployed_a31_android_1_0_5_publication_decision_packet_ready_publication_gated`, and APK publication remains blocked until Arun responds to the A31 owner decision packet.

## Evidence

| Evidence | Status |
| --- | --- |
| `ROADMAP_TRACKER.md` | Updated to document version `v0.9.10-roadmap`. |
| `UX_V2_A32_ROADMAP_STATUS_RECONCILIATION_REPORT_2026-06-17_01-35-00_IST.md` | Created. |
| `UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Updated with A32 row and reconciliation notes. |
| `UX_v2/trackers/milestone_tracker.md` | Updated with M7.22. |
| PM sidecar Bernoulli | Read-only audit confirmed A32 was the correct next docs/status artifact. |

## Tracker Status

| Gate | A32 status |
| --- | --- |
| Strategic roadmap current state | Reconciled |
| Older `1.0.2/code3` roadmap claims | Preserved as historical, superseded by v0.9.10 |
| Library Offline Reads next-lane wording | Deferred until UX v2 publication gate closes |
| APK publication authorization | Still missing |
| Full goal completion | Not complete |

## Current Remaining Decisions

1. APK publication approval.
2. Distribution target.
3. Signing mode and authority.
4. A30 accessibility residual-risk acceptance or true spoken TalkBack audit.
5. Artifact/version and install/rollback posture.
6. Optional branch push or PR.

## Staging Reminder

Stage only the A32 allowlist. Keep root `RUNNING_LOG.md`, Telegram plan docs, app source, APKs, AABs, keystores, DBs, `.env`, raw evidence, `assets/`, and `data/artifacts/` out of the commit unless explicitly approved.
