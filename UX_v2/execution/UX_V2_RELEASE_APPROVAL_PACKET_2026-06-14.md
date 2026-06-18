# UX v2 Release Approval Packet

Created: 2026-06-14 13:16 IST
Updated: 2026-06-15 13:05 IST
Owner: Codex lead integrator
Release verdict: **DEPLOYED after explicit user approval; post-deploy smoke passed**
Production/live status: **deployed to `https://brain.arunp.in`**

## Purpose

This packet turns the current UX v2 release gate into an operator-ready approval checklist. It does not approve release, publish the shared APK, run production deployment, or treat blocked Android checks as accepted.

## 2026-06-15 Production Release Update

This packet originally captured the pre-approval no-go state. It was superseded after the user approved production with `Approved for production. proceed continue goal`.

Current release record:

- Final deployed code head: `7c28ba5 fix(ux-v2): attribute android share captures`.
- Release source: clean worktree `/private/tmp/ai-brain-ux-v2-main-ready`, branch `codex/ai-brain-ux-v2-main-ready`, PR [#6](https://github.com/arunpr614/ai-brain/pull/6).
- Production backups: verified SQLite snapshots under `/opt/brain/data/backups/`, including `ux-v2-predeploy-android-share-source-2026-06-15_124103.sqlite`.
- Deploy result: `scripts/deploy.sh` completed, restarted `brain.service`, and passed authenticated production health and remote provider checks.
- Post-deploy smoke: `/unlock`, `/setup-apk`, `/offline.html`, `/ai-memory-logo.png`, service active status, brand-copy scan, and production item-count cleanup passed.
- Android validation: versioned APK `data/artifacts/brain-debug-v1.0.2-code3.apk` installed, launched, relaunched, paired, shared, and passed offline fallback checks on emulator.
- Final release report: `UX_v2/execution/UX_V2_PRODUCTION_RELEASE_2026-06-15.md`.

## Candidate Snapshot

| Item | Current value |
| --- | --- |
| Branch | Original candidate: `codex/ai-brain-ux-v2-execution`; current PR-ready integration branch: `codex/ai-brain-ux-v2-main-ready` |
| Integration base | `origin/main` at `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` |
| Integration commits | `e596b9a feat(ux-v2): stage approved local release candidate`; `9bd4ad7 docs(ux-v2): record release candidate commit review`; `95a98bd docs(ux-v2): record main integration readiness`; `921f8cc docs(ux-v2): record draft pr state`; `75b3889 test(ux-v2): cover transcript recovery result payload`; `70d6cc8 docs(ux-v2): record pr validation refresh` |
| Draft PR | [#6 UX v2 approved local release candidate](https://github.com/arunpr614/ai-brain/pull/6), open/draft/mergeable as of 2026-06-15 11:05 IST |
| Validated code head | `70d6cc8c180a6f0d3c695cba1640f108ced60310` |
| Baseline HEAD | `c33166e4c9b9a3af86165b1b83aaea355174ccd7` |
| Worktree | Original project worktree remains dirty; clean integration worktree is `/private/tmp/ai-brain-ux-v2-main-ready` |
| Web deploy target in script | `https://brain.arunp.in` |
| SSH target default | `brain` |
| Remote app dir default | `/opt/brain` |
| Service | `brain.service`, `node /opt/brain/server.js`, `PORT=3000`, `HOSTNAME=127.0.0.1` |
| Android package | `com.arunprakash.brain` |
| Android label | `AI Memory` |
| Current local Gradle APK | `android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk` |
| Current local Gradle APK SHA-256 | `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245` |
| Shared APK artifact | `data/artifacts/brain-debug-v1.0.2-code3.apk`, SHA-256 `6ac0bad378c3b214c1b3d32517be685ed1e079054c41fff371fe65fbc6e1753f` |
| Release candidate change manifest | `UX_v2/execution/UX_V2_RELEASE_CANDIDATE_CHANGE_MANIFEST_2026-06-14.md` |
| PR readiness report | `UX_v2/execution/UX_V2_PR_READINESS_AND_MAIN_INTEGRATION_2026-06-14.md` |

## Sources Inspected

- `scripts/deploy.sh`
- `scripts/backup-offsite.sh`
- `scripts/restore-from-backup.sh`
- `scripts/deploy/brain.service`
- `scripts/deploy/cutover.sh`
- `.env.example`
- `README.md`
- `UX_v2/execution/UX_V2_FINAL_QA_RELEASE_GATE_2026-06-14.md`
- `UX_v2/execution/ANDROID_RUNTIME_CHECK_2026-06-14.md`
- `UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`
- `UX_v2/execution/UX_V2_RELEASE_CANDIDATE_CHANGE_MANIFEST_2026-06-14.md`

## Current Evidence That Can Support Approval

| Gate | Evidence |
| --- | --- |
| Local web tests/build | `UX_V2_FINAL_QA_RELEASE_GATE_2026-06-14.md` records typecheck, lint, focused tests, full `npm test`, and `npm run build` passing with known warnings |
| Deploy script local gates | `scripts/deploy.sh` runs typecheck, lint, full tests, env hygiene, AI-provider checks, standalone build, build-artifact check, rsync, native dependency repair, service restart, authenticated health check, remote AI-provider check, and webhook reachability |
| Android APK build validation | `npm run build:apk` validates typecheck, Next build, Capacitor sync, and Gradle before stopping at the same-version shared-artifact guard |
| Android emulator mechanics | Latest local Gradle APK installs, opens, relaunches, receives text share intents, and shows the bundled AI Memory offline fallback on clean first offline launch |
| Data safety for implemented local slices | PRD-06 has no migration; PRD-10 repair is transactional and preserves manual organization metadata; PRD-14/15 copy/fallback work has no schema migration |
| Main-based PR branch | `codex/ai-brain-ux-v2-main-ready` resolves the current `main` conflicts and passed typecheck, full tests, lint, build, and APK script syntax |
| PR-head validation refresh | 2026-06-14 14:42 IST on validated code head `75b3889`: `git diff --check origin/main...HEAD`, `npm run typecheck`, `npm run lint`, `npm test` (503 tests, 76 suites), `npm run build`, and `bash -n scripts/build-apk.sh` passed |
| Current PR-head validation refresh | 2026-06-15 11:05 IST on head `70d6cc8`: `git diff --check origin/main...HEAD`, typecheck, lint, full tests (503 tests, 76 suites), build, and APK script syntax passed. Sandbox-only failures were documented and cleared by rerunning local HTTP mock tests and font-fetching build with the needed permissions. |

## Release Blockers

These rows were P0 blockers before approval. They are now resolved, accepted for production-first smoke, or deferred as documented below and in `UX_V2_PRODUCTION_RELEASE_2026-06-15.md`.

| Severity | Blocker | Current state | Required resolution |
| --- | --- | --- | --- |
| P0 | Explicit release approval | Resolved | User approved production on 2026-06-15. |
| P0 | Staging/smoke verification | Accepted for production-first smoke | No separate staging target was supplied; live smoke passed after approval. |
| P0 | Production DB backup | Resolved | Verified SQLite backups created under `/opt/brain/data/backups/`. |
| P0 | Release owner | Resolved | Codex lead integrator owned deploy, smoke, rollback watch, Android retest, and docs closure. |
| P0 | Rollback readiness | Resolved | Previous-source redeploy plus verified DB restore path documented; backups available. |
| P0 | Android online/share UX v2 validation | Resolved with caveat | Production Android emulator launch/share/offline validation passed; existing WebView caches may require clear/reinstall for the new offline fallback. |
| P0 | Android pairing/token validation | Resolved | Single-use pairing flow was generated, consumed, and token persistence was verified with redaction. |
| P0 | Shared APK publication | Resolved | Android version bump published `data/artifacts/brain-debug-v1.0.2-code3.apk`; no same-version overwrite. |
| P0 | Release commit hygiene | Resolved | Deployed from clean branch `codex/ai-brain-ux-v2-main-ready`, not the dirty original worktree. |
| P1 | Product decisions D-001..D-014 | Deferred for release | Gated behavior was not coded; open decisions remain follow-up work. |

## Recommended Approval Decision

Updated recommendation: **production release is complete for the approved scope**.

Historical pre-approval reason: the local implementation needed updated live assets before Android online/share and paired capture behavior could be proven. That condition was resolved by the approved production deploy and follow-up Android emulator validation.

The production-first smoke path was accepted by approval and completed with rollback backups ready.

## Pre-Deploy Checklist

All rows were filled or accepted by the release owner flow before the production deploy.

| Check | Required value / action | Status |
| --- | --- | --- |
| Release owner | Codex lead integrator | Complete |
| Approval sentence | User approved production: `Approved for production. proceed continue goal` | Complete |
| Release commit or accepted dirty state | Clean branch `codex/ai-brain-ux-v2-main-ready`; deployed code head `7c28ba5`; dirty original worktree not used | Complete |
| Staging target | Production-first smoke accepted by approval; no separate staging target supplied | Complete |
| Backup snapshot path | Latest final snapshot `ux-v2-predeploy-android-share-source-2026-06-15_124103.sqlite`; earlier verified UX v2 snapshots also retained | Complete |
| Backup integrity | `ok`, item count 15 for release snapshots | Complete |
| Rollback source | Previous-source redeploy through `scripts/deploy.sh`; DB restore path via verified snapshots | Complete |
| Android APK publication decision | Version bump to `1.0.2` / code `3`; shared artifact hash `897627f6b71180de3766f2731f9bc478c746c3ae5e992a7381d8d657a6c3ebd0` | Complete |
| Pairing code/token path | Single-use code generated and consumed during emulator validation; token persistence confirmed redacted | Complete |
| Post-deploy smoke owner | Codex lead integrator | Complete |

## Backup Plan

The production DB is SQLite at `/opt/brain/data/brain.sqlite` according to the deploy/backup scripts. Before release, run a WAL-safe backup on the production host.

Example operator command, to adapt only after confirming SSH alias and permissions:

```bash
ssh brain 'set -euo pipefail
ts=$(date -u +%Y-%m-%d_%H%M)
backup="/opt/brain/data/backups/ux-v2-predeploy-${ts}.sqlite"
sudo -u brain mkdir -p /opt/brain/data/backups
sudo -u brain sqlite3 /opt/brain/data/brain.sqlite ".backup ${backup}"
sudo -u brain sqlite3 "${backup}" "PRAGMA integrity_check;"
sudo -u brain sqlite3 "${backup}" "SELECT COUNT(*) AS items FROM items;"
echo "${backup}"'
```

If off-site backup is in scope and `/opt/brain/scripts/backup-offsite.sh` is installed/configured:

```bash
ssh brain 'sudo -u brain /opt/brain/scripts/backup-offsite.sh'
```

Backup acceptance:

- Backup file path recorded.
- `PRAGMA integrity_check` returns `ok`.
- Item count is plausible and recorded.
- Backup is not stored in an untracked local QA artifact.
- If off-site backup is run, upload success is recorded without secrets.

## Rollback Plan

Current deploy mechanics sync `.next/standalone`, `.next/static`, and `public/` into `/opt/brain`; no atomic release-directory rollback was found in `scripts/deploy.sh`. Therefore rollback must be confirmed before deploy.

Minimum acceptable rollback:

1. Identify previous known-good commit or artifact before release.
2. Keep the pre-deploy DB backup path from this packet.
3. If the release fails before data-changing user activity, rebuild/redeploy the previous known-good commit through `scripts/deploy.sh`.
4. If DB rollback is required, stop `brain.service`, restore the backup using the restore script pattern, restart service, then smoke.

Restore command pattern from `scripts/restore-from-backup.sh`:

```bash
ssh brain 'sudo systemctl stop brain && \
  sudo -u brain /opt/brain/scripts/restore-from-backup.sh /opt/brain/data/backups/<snapshot>.sqlite && \
  sudo systemctl start brain'
```

Rollback acceptance:

- Release owner has shell access.
- Previous deploy source is available.
- Backup restore path is known.
- Rollback smoke list below is ready.

## Production Deploy Command

This command pattern was run after approval with the same production target. The final deploy used local provider warn-only mode because local Ollama was unavailable; remote provider checks passed on the production host.

```bash
BRAIN_BASE_URL=https://brain.arunp.in \
BRAIN_SSH_HOST=brain \
BRAIN_REMOTE_DIR=/opt/brain \
BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE=remote \
bash scripts/deploy.sh
```

Optional only when Telegram live validation is intentionally in scope:

```bash
TELEGRAM_RELEASE=1 \
BRAIN_BASE_URL=https://brain.arunp.in \
BRAIN_SSH_HOST=brain \
BRAIN_REMOTE_DIR=/opt/brain \
BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE=remote \
bash scripts/deploy.sh
```

Expected deploy-script gates:

- local toolchain and remote env preflight
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run check:env`
- `npm run check:ai-providers`
- `npm run build`
- `npm run check:build-artifacts`
- rsync standalone/static/public assets
- remote native dependency repair
- `sudo systemctl restart brain`
- authenticated health check
- remote AI-provider check
- unauthenticated Telegram webhook returns `401`

## Post-Deploy Smoke Checklist

Run immediately after deploy.

| Smoke | Expected result | Evidence |
| --- | --- | --- |
| Health | Authenticated `https://brain.arunp.in/api/health` returns `200` | Status/time recorded |
| Unlock/setup copy | Web and Android online launch show AI Memory copy, not `Unlock AI Brain` | Screenshot |
| Library | Existing library loads without data loss | Screenshot and item count if safe |
| Capture note | Save a disposable note and see capture result state | URL/item ID redacted if needed |
| Capture URL | Save a disposable URL and see source/quality/captured-via state | URL/item ID redacted if needed |
| Repair | Needs Upgrade item can open repair route and repair full text/transcript | Disposable or preselected item |
| Ask | Ask works against a known safe item; citations remain scoped | Screenshot with private text redacted |
| Settings/More trust copy | Coming-soon/privacy/offline copy matches PRD-14 | Screenshot |
| Android install/open/relaunch | Latest APK or shared artifact opens and relaunches | Screenshot |
| Android pairing | Pairing code saves token and survives relaunch | Screenshot |
| Android share | Text share reaches paired app and returns UX v2 capture/result state | Screenshot |
| Android post-online offline | After an online visit, turn offline and relaunch; UX v2 fallback appears | Screenshot |
| Service worker/cache | Clear cache or verify updated SW/offline assets are active | Evidence note |

## APK Publication Decision

Current state after release:

- `npm run build:apk` validates successfully through Gradle.
- Publication is complete through a version bump to `versionName` `1.0.2` and `versionCode` `3`.
- The released shared artifact is `data/artifacts/brain-debug-v1.0.2-code3.apk`.
- Released artifact SHA-256 is `897627f6b71180de3766f2731f9bc478c746c3ae5e992a7381d8d657a6c3ebd0`.

Release-safe path completed:

1. Android `versionName` and `versionCode` were bumped.
2. `npm run build:apk` produced the shared artifact.
3. The new shared artifact hash, signature, package label, install/open/relaunch, share intent, pairing, and offline fallback were verified.

Alternative only with explicit approval:

```bash
ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk
```

This overwrites/publishes the same-version shared artifact and should be treated as a deliberate operator decision, not a default.

## Approval Prompt

To approve the next release step, provide all required values in one message:

```text
I approve [staging deploy | production deploy | APK publication only] for UX v2.
Release owner: <name>
Deploy source: <commit SHA or "current dirty worktree approved">
Staging target: <URL/SSH alias or "skip staging accepted">
Backup plan: <snapshot command/path confirmation>
Rollback source: <previous commit/artifact>
APK publication: <bump version to X/code Y | allow same-version publication | skip APK publication>
Pairing validation path: <how Codex should obtain/use pairing code>
Product decisions: <approve Decision Bundle A | approve specific D-ids for follow-up>
Post-deploy smoke owner: <name>
```

This prompt has been satisfied for the 2026-06-15 production release. Future releases should repeat this approval flow.
