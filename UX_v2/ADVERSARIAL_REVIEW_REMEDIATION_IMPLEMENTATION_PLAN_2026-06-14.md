# AI Memory UX v2 Adversarial Review Remediation Implementation Plan

Created: 2026-06-14 08:14 IST
Status: Execution plan for fixing planning-package defects only
Target review: `AI_MEMORY_UX_V2_PLANNING_PACKAGE_ADVERSARIAL_REVIEW_2026-06-14_08-03-59_IST.md`

## Scope

This plan addresses every issue raised in the adversarial review of the UX v2 planning package. It does not implement app features, change production behavior, or claim UX v2 release readiness. Execution means revising the planning package so a future implementation agent cannot confuse draft, decision-gated, unverified, and implementation-ready work.

## Review Findings To Resolve

| Finding | Severity | Required remediation | Execution artifact |
| --- | --- | --- | --- |
| Ready language conflicts with open decisions | P1 | Replace broad ready labels with decision-aware statuses and add top-level no-go gates | `00_PLANNING_PACKAGE_INDEX.md`, PRD/implementation trackers |
| Older baseline docs can overpower new roadmap | P1 | Add precedence banners and a status reconciliation tracker | `01`-`05` docs, `trackers/baseline_status_reconciliation.*` |
| Missing design-to-feature traceability | P1 | Add design artifact matrix mapping screenshots/source/docs to PRD/spec rows | `trackers/design_traceability_matrix.*` |
| Reproducibility gap in dirty worktree | P1 | Record branch, commit, dirty count, design/package counts, and critical source citations | `trackers/source_snapshot_2026-06-14.md`, index |
| Inconsistent PRD v1 section coverage | P2 | Add explicit not-applicable sections where requested sections were intentionally omitted | PRD-11 through PRD-16 packages |
| Missing tracker parity validation | P2 | Record Markdown/CSV row counts and source-of-truth rule | `trackers/TRACKER_PARITY_CHECK.md` |
| Android viewport confidence is not device confidence | P2 | Make device/emulator checks hard gates for Android share/pairing/offline/APK claims | PRD-13, PRD-15, PRD-16, QA tracker |
| Live Magic Patterns freshness risk | P2 | Add a design freshness gate before visual implementation | roadmap, QA tracker, traceability matrix |
| Running log missing final validation | P3 | Append validation/remediation entry without editing old content | `RUNNING_LOG.md` |
| Path alias confusion | P3 | Document `Documents/arunvault` and CloudStorage path alias | index, running log |

## Execution Order

1. Freeze source evidence and create a reproducibility snapshot.
2. Add a package-level no-go/readiness table.
3. Reword PRD and implementation trackers to distinguish `Ready`, `Blocked by decision`, `Blocked by dependency`, `Verification-only`, and `Release gate`.
4. Add baseline precedence banners and reconciliation tracker.
5. Build design traceability matrix and CSV.
6. Patch PRD packages with explicit not-applicable sections.
7. Harden Android QA gates and Magic Patterns freshness gates.
8. Record tracker parity.
9. Append running log entry.
10. Validate every review finding against the revised package.

## Acceptance Criteria

- No broad `PRD v2 ready` or `Plan v2 ready` language remains where a blocker, dependency, or product decision is open.
- The package index has a no-go table before recommended implementation order.
- Old baseline docs explicitly point readers to `00`, `06`, `07`, and trackers for current planning status.
- A design traceability matrix exists in Markdown and CSV, covering screenshots, relevant design docs, and source-export page/component references.
- A source snapshot records branch, commit, dirty count, artifact counts, and critical line-level source citations.
- PRD-11 through PRD-16 show requested PRD v1 sections or explicit not-applicable rationale.
- Markdown and CSV tracker row counts are recorded, with Markdown declared authoritative.
- Android device/emulator validation is a hard gate for Android share/pairing/offline/APK claims.
- Design freshness is a documented gate before visual implementation starts.
- `RUNNING_LOG.md` contains an appended entry recording validation and remediation.

## Non-Goals

- No app-code implementation.
- No deployment, APK build, production smoke, or release-readiness claim.
- No removal or rewriting of prior log entries.
- No deletion of historical baseline docs.
