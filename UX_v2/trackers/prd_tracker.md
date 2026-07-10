# PRD Tracker

Created: 2026-06-14 07:40 IST

Each feature package contains PRD v1, adversarial PRD review, and PRD v2. `PRD v2` means the document has incorporated review findings; it does not mean implementation is authorized. Implementation is blocked whenever the status names an open decision, dependency, or verification gate.

| PRD | Status | Package | Review disposition |
| --- | --- | --- | --- |
| PRD-06-FU | Draft v2 - implementation next after PRD-11-SHELL verification | `../features/PRD-06-FU-capture-result-states-package.md` | Conditional go only after shared capture result contract is explicit |
| PRD-09-FU | Draft v2 - blocked by D-001, D-002, D-003 | `../features/PRD-09-FU-ask-context-scope-history-package.md` | No-go until attachment persistence, high-quality-only UX, and history snapshot semantics are chosen |
| PRD-10 | Draft v2 - blocked by PRD-06-FU contract and D-004 | `../features/PRD-10-weak-source-repair-package.md` | No-go for mark-good-enough; repair add-text path depends on derived-state reset contract |
| PRD-11-FU | Draft v2 - blocked by PRD-11-SHELL verification and D-005 | `../features/PRD-11-FU-mobile-shell-select-item-package.md` | Conditional go after shell smoke and Android tabs scope decision |
| PRD-12 | Draft v2 - blocked by PRD-09-FU decisions | `../features/PRD-12-android-unified-ask-composer-package.md` | No-go until effective Ask scope and attachment model are settled |
| PRD-13 | Draft v2 - blocked by PRD-06-FU contract and Android device/emulator gate | `../features/PRD-13-android-share-capture-package.md` | Conditional go after capture result states align and Android share can be device-tested |
| PRD-14 | Draft v2 - blocked by D-007 | `../features/PRD-14-settings-privacy-offline-package.md` | Go only for informational offline/privacy copy unless active offline scope is approved |
| PRD-15 | Draft v2 - blocked by D-008, D-013, and Android device/emulator gate | `../features/PRD-15-entry-pairing-session-offline-package.md` | Conditional go with no privacy overclaims and no Android claims without device/emulator evidence |
| PRD-16 | Release-gate plan - ready to execute as QA infrastructure, not a release claim | `../features/PRD-16-qa-evidence-release-gates-package.md` | Go as mandatory evidence gate; failed evidence blocks release |
