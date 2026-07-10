# PRD Tracker

Created: 2026-06-14 10:15 IST
Source of truth: this Markdown file. CSV is a convenience export.

`Draft v2` means reviewed planning exists. It does not authorize implementation while decisions, dependencies, or verification gates remain open.

| PRD | Final status | Package | Review disposition |
| --- | --- | --- | --- |
| PRD-06-FU | No-go until verification; first feature candidate after PRD-11-SHELL | `../../features/PRD-06-FU-capture-result-states-package.md` | Conditional go only after shared capture result contract is explicit |
| PRD-09-FU | Draft v2 - blocked by decision | `../../features/PRD-09-FU-ask-context-scope-history-package.md` | No-go until D-001/D-002/D-003 close |
| PRD-10 | Draft v2 - blocked by dependency and decision | `../../features/PRD-10-weak-source-repair-package.md` | PRD-06 contract first; mark-good-enough no-go until D-004 |
| PRD-11-FU | No-go until verification and scope decision | `../../features/PRD-11-FU-mobile-shell-select-item-package.md` | Conditional go for select polish only after shell smoke and D-005 |
| PRD-12 | Draft v2 - blocked by PRD-09 decisions | `../../features/PRD-12-android-unified-ask-composer-package.md` | No-go until effective Ask scope and attachment model are settled |
| PRD-13 | Draft v2 - blocked by dependency and device gate | `../../features/PRD-13-android-share-capture-package.md` | Conditional go after PRD-06 and Android share can be device-tested |
| PRD-14 | Draft v2 - ready only for informational offline/privacy copy | `../../features/PRD-14-settings-privacy-offline-package.md` | Active offline downloads/queues no-go until D-007 |
| PRD-15 | Draft v2 - blocked by decisions and device gate | `../../features/PRD-15-entry-pairing-session-offline-package.md` | No Android claim without device/emulator evidence |
| PRD-16 | Ready for QA planning only | `../../features/PRD-16-qa-evidence-release-gates-package.md` | Mandatory evidence gate; failed evidence blocks release |
