# Recall manual sync final implementation report

Date: 2026-07-11
Branch: `feat/recall-manual-sync`
Implementation commit: `fdd740617685c1ce730a6150c306152a04070f86`
Delivery status: Review-ready pull request [#22](https://github.com/arunpr614/ai-brain/pull/22) open with passing required check; default off; not merged, deployed, or enabled

## Outcome

The Settings experience now supports a truthful, durable **Sync now** request for Recall while reusing the complete existing guarded daily wrapper. The web process persists intent and writes an empty wake marker only. A distinct trusted worker owns Recall credentials and wrapper execution. Automatic and manual runs share a private outer lock and retain the existing inner database lock.

The complete feature includes:

- responsive Settings card and confirmation dialog with durable state recovery;
- authenticated exact-origin status/request API with bounded bodies and idempotency;
- exact request-ID and idempotency-key acknowledgements for refresh, reconnect, and multi-tab supersession;
- migration `024` with durable requests, whole-wrapper executions, trusted schedule state, and validated last success;
- atomic claim, immutable expiry, terminal cooldown, progress, heartbeat, and conservative crash reconciliation;
- built trusted worker/lifecycle bundles, path activation, one-minute lost-wake fallback, and default-off unit assets;
- continuous deployment exclusion across Recall runtime switching with daily-timer state invariants;
- public-safe documentation, architecture, security, rollback, and verification evidence.

## Truth and safety invariants

1. Last success advances only after a linked apply is complete and final wrapper validation passes.
2. Partial or failed work preserves exact committed counts and never overwrites the prior success.
3. An existing running/terminal occurrence never re-enters core work.
4. Only one active request is claimable, and all active/terminal idempotency outcomes are explicit.
5. The 30-minute request deadline is immutable; the five-minute cooldown uses server-observed monotonic time.
6. Exact request A remains recoverable after a newer request B becomes the reduced current activity.
7. Manual and automatic wrapper stages cannot interleave across the private outer lock.
8. The web identity receives no Recall credential, raw report/source data, executable wrapper path, or private lock authority.
9. New UI/worker/unit paths default off and preserve the existing daily timer definition and state.

## Verification summary

Independent QA and adversarial review initially issued no-go findings for lifecycle re-entry, expiry extension, premature success, terminal replay, process proof, deploy exclusion, client ambiguity, exact request supersession, and the absence bound. Every accepted finding was remediated and independently re-reviewed. The final reports record no unresolved Critical, High, P1, or P2 implementation finding.

Automated evidence includes full typecheck, lint, repository tests, production build, Recall bundles, scheduled-wrapper smoke, artifact/security checks, privacy gates, shell syntax, diff checks, and six isolated multi-process/crash/fake-systemd fixture groups. The fixtures cover independent SQLite races, real `flock`, killed heartbeat, six wrapper crash stages, expired work without spawn, built worker/lifecycle path and fallback activation, continuous deploy exclusion, and timer hash/state preservation.

Browser evidence covers 1440, 1024, 390, and 320 pixel layouts; light and dark themes; no horizontal overflow; 200% zoom; 44px mobile targets; dialog focus containment, Escape, non-dismissable overlay, and focus restoration; transition-only polite live announcements; exactly one POST; reduced motion; Recall-section contrast; and axe checks. The two 4.48:1 light-page warning badges are pre-existing and outside Recall.

## Delivery and enablement boundary

This report supports review-ready pull request [#22](https://github.com/arunpr614/ai-brain/pull/22) only. The PR is open, non-draft, mergeable, and its required Agent documentation check passed. It does not authorize merge, deployment, feature enablement, production timer mutation, credential access, or real Recall data access.

Before any future enablement, an authorized operator must verify the effective Linux identity/group, credential readability and web denial, private lock and tmpfiles permissions, data/SQLite/WAL/backup access, installed unit contents, actual path/timer behavior, timer continuity, rollback/lock cleanup, one controlled request, and the following daily completion. Physical VoiceOver/TalkBack and touch-hardware validation also remain separate from the browser AX/keyboard evidence recorded here.

## Evidence index

- `prd-v2.md`, `ux-ui-v2.md`, `technical-plan-v2.md`
- `decision-log.md`, `project-tracker.md`, `qa-acceptance-matrix.md`
- `acceptance-criteria-traceability-report.md`
- `qa-release-risk-report.md`
- `implementation-adversarial-review.md`
- `visual-accessibility-qa-report.md`
- `visual-evidence/implementation-*`
