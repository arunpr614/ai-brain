# UX v2 Release Approval Packet

Created: 2026-06-14 13:16 IST
Updated: 2026-06-15 11:05 IST
Owner: Codex lead integrator
Release verdict: **NO-GO until approval blockers below are resolved**
Production/live status: **not deployed**

## Purpose

This packet turns the current UX v2 release gate into an operator-ready approval checklist. It does not approve release, publish the shared APK, run production deployment, or treat blocked Android checks as accepted.

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

Do not deploy production/live while any P0 row is open.

| Severity | Blocker | Current state | Required resolution |
| --- | --- | --- | --- |
| P0 | Explicit release approval | Not granted | Arun must explicitly approve production/live deploy after reviewing this packet and current QA reports |
| P0 | Staging/smoke verification | Not done | Either provide a staging target compatible with `scripts/deploy.sh` or explicitly approve skipping staging with risk accepted |
| P0 | Production DB backup | Not performed for this candidate | Create and verify a pre-deploy SQLite backup on the production host before deploying |
| P0 | Release owner | Not confirmed | Name the person watching deploy, smoke, rollback, and Android retest |
| P0 | Rollback readiness | Partial only | Confirm previous deployable commit/artifact and exact rollback command before deploy |
| P0 | Android online/share UX v2 validation | Blocked by stale live assets | Deploy approved web/offline assets to staging/live, then rerun Android online launch, share, and post-online offline checks |
| P0 | Android pairing/token validation | Blocked by missing authenticated pairing-code path | Generate/provide a pairing code and run token save, relaunch, paired share, and capture-result checks |
| P0 | Shared APK publication | Blocked by same-version artifact guard | Bump `versionName`/`versionCode` or explicitly approve same-version publication |
| P0 | Release commit hygiene | Clean integration branch is pushed as draft PR #6 and validated; original project worktree remains dirty | Use draft PR #6 / `codex/ai-brain-ux-v2-main-ready` as the release source after approval; do not deploy from the dirty original worktree |
| P1 | Product decisions D-001..D-014 | Still open | Use `UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md` to defer explicitly or approve PRD-specific follow-up work; do not silently include gated behavior |

## Recommended Approval Decision

Recommended: **do not approve production/live deploy yet**.

Reason: the current local implementation is materially better and has Android evidence, but production Android online/share paths are known to load stale live assets until deploy. Because paired Android share/capture and post-online offline behavior still cannot be proven before updated web assets are available, the release owner should either:

1. approve a staging deployment first and run the full smoke matrix there, or
2. explicitly accept a production-first smoke window with rollback ready.

## Pre-Deploy Checklist

All rows must be filled by the release owner before production deploy.

| Check | Required value / action | Status |
| --- | --- | --- |
| Release owner | Name and contact path | Open |
| Approval sentence | "I approve deploying UX v2 to production/live" | Open |
| Release commit or accepted dirty state | Recommended source is draft PR [#6](https://github.com/arunpr614/ai-brain/pull/6) / branch `codex/ai-brain-ux-v2-main-ready`; dirty original worktree is not approved | Open |
| Staging target | Host/base URL or accepted skip rationale | Open |
| Backup snapshot path | Production path under `/opt/brain/data/backups/` | Open |
| Backup integrity | `PRAGMA integrity_check` result and item count | Open |
| Rollback source | Previous commit/artifact and redeploy command | Open |
| Android APK publication decision | Version bump or same-version publication approval | Open |
| Pairing code/token path | Authenticated setup route/code available | Open |
| Post-deploy smoke owner | Name | Open |

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

Do not run this until all P0 pre-deploy rows are complete and explicit approval is granted.

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

Current state:

- `npm run build:apk` validates successfully through Gradle.
- Publication to `data/artifacts/brain-debug-v1.0.2-code3.apk` is blocked because that shared artifact already exists.
- The existing shared artifact hash is `6ac0bad378c3b214c1b3d32517be685ed1e079054c41fff371fe65fbc6e1753f`.
- The latest local Gradle output hash is `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245`.

Recommended release-safe path:

1. Bump Android `versionName` and `versionCode`.
2. Run `npm run build:apk`.
3. Verify the new shared artifact hash, signature, package label, install/open/relaunch, share intent, pairing, and offline fallback.

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

Without that explicit approval, the correct state is deploy-ready documentation only, production/live untouched.
