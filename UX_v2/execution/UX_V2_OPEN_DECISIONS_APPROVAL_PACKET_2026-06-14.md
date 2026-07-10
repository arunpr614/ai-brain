# UX v2 Open Decisions Approval Packet

Created: 2026-06-14 13:20 IST
Owner: Codex lead integrator
Source authority: `UX_v2/UX_Final_Plan/trackers/open_questions_decisions.md`
Release verdict impact: **blocking until accepted as deferred or explicitly approved for follow-up**

## Purpose

This packet converts the remaining UX v2 product decisions into explicit approval or deferral choices. It does not implement any gated behavior, approve production release, or override `UX_Final_Plan`.

## Recommended UX v2 Release Position

Recommended for the current UX v2 release candidate:

1. Accept the implemented local scope as UX v2 release candidate scope:
   - PRD-06 capture result contract.
   - PRD-10 limited add-text/transcript repair.
   - PRD-14 informational trust copy.
   - PRD-15 entry/session/pairing copy plus clean first-launch offline fallback.
   - PRD-16 QA evidence/release gate artifacts.
2. Explicitly defer all decision-gated behavior below.
3. Do not code any deferred item until Arun/Product reopens it with explicit approval and evidence gates.
4. Continue release only through `UX_V2_RELEASE_APPROVAL_PACKET_2026-06-14.md`.

## Decision Bundle A: Recommended Deferrals For This Release

If Arun approves Bundle A, the decision-gated rows below are accepted as deferred for UX v2 release. This does not approve production deploy by itself; release still needs backup, staging/smoke or accepted skip, rollback owner, APK decision, Android pairing validation path, and explicit deploy approval.

| ID | Recommended UX v2 release decision | Why this is safest now | Follow-up gate if reopened |
| --- | --- | --- | --- |
| D-001 | Defer attached Ask context behavior; keep current Ask scope behavior | Attachment persistence can affect retrieval boundaries and saved data semantics | Approve PRD-09-FU attachment model, then implement effective-scope API/UI tests |
| D-002 | Defer high-quality-only Ask control | It changes answer inclusion semantics and can confuse citation trust if rushed | Approve chip/toggle behavior and test weak-source exclusion/inclusion |
| D-003 | Defer scope-history persistence changes | Requires schema/product semantics for dynamic vs snapshot membership | Approve storage model, migration/rollback plan, and history QA |
| D-004 | Defer mark-good-enough | Could hide weak captures without actually improving source quality | Approve explicit removal semantics and audit trail before coding |
| D-005 | Split Android item detail tabs into a later PRD | Existing Android is WebView; tabs need mobile interaction and device QA | Create/approve separate PRD and emulator/device evidence plan |
| D-006 | Keep More route without special raised Capture behavior | Avoid route-specific shell change that is not product-approved | Approve exact route behavior and screenshot matrix if needed |
| D-007 | Keep offline controls informational only | Active offline queues/downloads imply storage/sync behavior not built in UX v2 | Approve offline project with storage, cache, backup, and failure-mode plan |
| D-008 | Keep Android pairing as code-entry only; no QR promise | Camera/QR behavior is not implemented and would need device validation | Approve QR flow, permission posture, and emulator/device QR smoke |
| D-009 | Defer transcript operator visibility to ops/admin track | Not required for current user-facing UX v2 release | Approve OPS-01 scope and owner |
| D-010 | Defer transcript provider fallback strategy to research | Provider fallback is not UI-only and has operational risk | Complete OPS-02 research before implementation |
| D-011 | Keep no product analytics | Fits private-memory trust posture and avoids telemetry scope creep | Approve analytics event list, privacy copy, and storage/retention policy |
| D-012 | Defer Chrome extension redesign | Current release focuses web/Android; extension parity can remain compatible | Approve EXT-01 redesign scope separately |
| D-013 | Retain `com.arunprakash.brain` Android package ID | Package-ID change would break upgrade/pairing expectations without migration | Approve migration plan, install/upgrade tests, and user communication |
| D-014 | Defer YouTube embedded player; keep generic item/detail behavior | Player/media treatment is not required to release the implemented trust/capture slices | Approve YT-01 metadata/player scope and copyright/privacy review |

## Decision Bundle B: Approve Follow-Up Implementation Tracks

If Arun wants any deferred item implemented before release, approve it by ID. Codex should then update the tracker and implement only the approved track after satisfying the required gates.

| Track | Decisions required | Implementation package | Pre-coding gate |
| --- | --- | --- | --- |
| Ask scope/context/history | D-001, D-002, D-003 | `UX_v2/features/PRD-09-FU-ask-context-scope-history-package.md` | Data-safety plan for scope persistence, retrieval escape tests, citation QA |
| Android Ask composer | D-001, D-002, D-003 | `UX_v2/features/PRD-12-android-unified-ask-composer-package.md` | PRD-09 completed and mobile/emulator QA plan ready |
| Mark good enough | D-004 | `UX_v2/features/PRD-10-weak-source-repair-package.md` | Explicit state semantics, audit trail, Needs Upgrade regression tests |
| Android item tabs/select polish | D-005, maybe D-006 | `UX_v2/features/PRD-11-FU-mobile-shell-select-item-package.md` | Device/emulator smoke and screenshot matrix |
| Active offline | D-007 | `UX_v2/features/PRD-14-settings-privacy-offline-package.md` plus new storage plan | Migration/backup/rollback/failure-mode plan |
| QR pairing | D-008 | `UX_v2/features/PRD-15-entry-pairing-session-offline-package.md` | Camera/permission decision, QR library/decoder plan, Android evidence |
| Android package migration | D-013 | New migration plan required | Upgrade/uninstall/pairing/keystore/rollback plan |
| YouTube media treatment | D-014 | `UX_v2/lightweight-specs/YT-01-youtube-item-detail-and-media-metadata.md` | Metadata/player scope, safe rendering, screenshot and mobile QA |
| Ops transcript work | D-009, D-010 | `UX_v2/lightweight-specs/OPS-01-transcript-operator-visibility.md`, `OPS-02-transcript-fallback-strategy.md` | Ops owner and provider-safety review |
| Product analytics | D-011 | `UX_v2/lightweight-specs/ANALYTICS-01-events-and-privacy.md` | Event list, privacy copy, retention, opt-out/no-analytics decision |
| Extension redesign | D-012 | `UX_v2/lightweight-specs/EXT-01-browser-extension-parity.md` | Extension UX scope and compatibility tests |

## Approval Prompts

### Approve Recommended Deferrals

Use this only if the current UX v2 implemented scope should proceed without the gated features:

```text
I approve UX v2 Decision Bundle A.
Defer D-001 through D-014 as recommended in UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md.
I understand this does not approve production deploy or APK publication.
```

### Approve Specific Follow-Up Work

Use this to reopen one or more decisions for implementation before release:

```text
I approve follow-up implementation for: D-<ids>.
Required behavior:
Release priority: before UX v2 release | after UX v2 release.
Acceptance evidence required:
```

## Current Release Relationship

Even if Bundle A is accepted, production/live still remains blocked until the release approval packet is completed:

- explicit deploy approval
- release owner
- production DB backup
- staging/smoke verification or accepted skip
- rollback source
- Android pairing-token path
- Android live/staging post-deploy checks
- APK publication decision

Primary release packet: `UX_v2/execution/UX_V2_RELEASE_APPROVAL_PACKET_2026-06-14.md`.

## Notes For Future Agents

- Do not update `UX_Final_Plan/trackers/open_questions_decisions.md` to closed unless Arun explicitly accepts a decision or deferral.
- Do not silently implement any Bundle B track because this packet exists.
- If Bundle A is accepted, update the execution tracker, final QA gate, completion audit, and running log to show the decisions are accepted as deferred for UX v2 release, not completed.
