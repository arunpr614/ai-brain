# Master Feature Inventory Tracker

Created: 2026-06-14 07:40 IST

Source of truth for classification is `../07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`.

| ID | Feature | Classification | Priority | Owner | Artifact | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| PRD-06-FU | Capture duplicate, updated-existing, error-with-save result states | Partial | P1 | Implementation agent | `../features/PRD-06-FU-capture-result-states-package.md` | Start only after PRD-11-SHELL verification; define shared result type first |
| PRD-09-FU | Attached context, high-quality-only scope, extended Ask history | Partial/Missing | P1 | Implementation agent | `../features/PRD-09-FU-ask-context-scope-history-package.md` | Resolve attachment persistence decision |
| PRD-10 | Weak-source repair workflow | Partial | P1 | Implementation agent | `../features/PRD-10-weak-source-repair-package.md` | Wait for PRD-06-FU contract; keep mark-good-enough decision-gated |
| PRD-11-SHELL | Mobile bottom nav, route-aware Capture, More | Implemented pending verification | P0 | Implementation agent | Existing handover plus tracker | Finish mobile smoke |
| PRD-11-FU | Mobile select mode, long press, mobile item tabs/focus polish | Partial/Missing | P2 | Implementation agent | `../features/PRD-11-FU-mobile-shell-select-item-package.md` | Decide Android item tabs scope |
| PRD-12 | Android unified Ask composer and add-context sheets | Missing | P1 | Implementation agent | `../features/PRD-12-android-unified-ask-composer-package.md` | Blocked by PRD-09-FU decisions |
| PRD-13 | Android share capture landing and result states | Partial/Missing | P1 | Implementation agent | `../features/PRD-13-android-share-capture-package.md` | Tie to capture result contract and device/emulator gate |
| PRD-14 | Settings, privacy, offline, trust states | Partial | P2 | Implementation agent | `../features/PRD-14-settings-privacy-offline-package.md` | Confirm offline-control scope |
| PRD-15 | Login, unlock, pairing, session, offline entry states | Partial/Missing | P2 | Implementation agent | `../features/PRD-15-entry-pairing-session-offline-package.md` | Resolve QR/package decisions and device/emulator gate |
| PRD-16 | QA evidence and release gates | Missing | P1 release gate | Implementation agent | `../features/PRD-16-qa-evidence-release-gates-package.md` | Prepare checklist copy and evidence folders |
| OPS-01 | Transcript operator visibility | Needs user decision | P3 | Arun/Product | `../lightweight-specs/OPS-01-transcript-operator-visibility.md` | Decide if in UX v2 |
| OPS-02 | Transcript provider fallback strategy | Needs user decision | P3 | Arun/Product | `../lightweight-specs/OPS-02-transcript-fallback-strategy.md` | Research before implementation |
| COPY-01 | Prototype legacy copy migration | UX redesign only | P1 QA | Implementation agent | `../lightweight-specs/COPY-01-brand-copy-and-prototype-normalization.md` | Block literal AI Brain copy |
| DS-01 | Design-system visual parity | UX redesign only | P2 | Implementation agent | `../lightweight-specs/DS-01-design-system-visual-parity.md` | Audit tokens/components |
| YT-01 | YouTube item detail and media metadata polish | Partial | P2 | Implementation agent | `../lightweight-specs/YT-01-youtube-item-detail-and-media-metadata.md` | Decide whether generic item detail is enough |
| EXT-01 | Browser extension parity with capture result contracts | Partial | P3 | Implementation agent | `../lightweight-specs/EXT-01-browser-extension-parity.md` | Keep extension compatible if capture API changes |
| ANALYTICS-01 | Analytics/events for UX flows | Needs user decision | P3 | Arun/Product | `../lightweight-specs/ANALYTICS-01-events-and-privacy.md` | Decide if any local telemetry is desired |
