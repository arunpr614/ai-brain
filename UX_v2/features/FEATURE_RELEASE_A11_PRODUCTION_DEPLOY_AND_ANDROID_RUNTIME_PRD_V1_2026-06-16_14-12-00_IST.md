# Feature Release A11 Production Deploy And Android Runtime PRD V1

Created: 2026-06-16 14:12:00 IST

## Objective

Clear the remaining UX v2 release gates by deploying the web experience to production, proving live providers/Ask on the production host, creating a fresh Android APK, and validating that the APK launches against the deployed production site.

## User Outcome

The user can rely on the UX v2 web experience at `https://brain.arunp.in`, and has a fresh Android APK candidate that is installable and visibly loads the deployed shell.

## Scope

- Run a predeploy production SQLite backup with integrity and item-count evidence.
- Deploy the current UX v2 web candidate using the repository deploy script.
- Prove postdeploy service health, public route health, provider health, and live Ask SSE completion.
- Build a fresh version-bumped debug APK.
- Install and launch the APK on the available Android emulator.
- Capture Android locked-screen evidence after deploy.
- Update release and PM trackers with exact residual blockers.

## Acceptance Criteria

- Backup path, integrity result, item count, and size are recorded.
- Deploy script completes successfully.
- Production service is active after restart.
- Public `/unlock`, `/setup-apk`, `/offline.html`, logo, and manifest routes return expected success statuses.
- Protected `/library` redirects to `/unlock` without a session.
- Telegram webhook without secret returns 401.
- Production provider preflight passes on the remote host.
- Live Ask request returns SSE status 200, retrieved chunks, token output, a done frame, and no error frames.
- APK artifact is fresh, versioned, SHA-256 recorded, installed on emulator, and launched.
- Locked Android screen does not expose private Needs Upgrade count.

## Out Of Scope

- Changing provider configuration or installing local Ollama.
- Resetting the production PIN.
- Publishing the APK as final to a user device.
- Claiming Android authenticated flows, native share, stale-cache recovery, or TalkBack are complete without direct runtime evidence.

## Risks

- Local provider checks fail because the laptop is not configured like production.
- Production logs may contain pre-existing background enrichment warnings even when live Ask works.
- Android WebView can show stale production code until the web deploy lands or app data is cleared.
- A locked emulator launch does not prove authenticated Android navigation, keyboard flow, native share, or TalkBack.

## Initial Go / No-Go

Conditional go for web production deploy after backup and deploy gates pass. No-go for final APK publication until authenticated Android runtime evidence, native share evidence, stale-cache recovery, and TalkBack/keyboard evidence are captured.
