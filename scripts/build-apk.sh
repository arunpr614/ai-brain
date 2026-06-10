#!/usr/bin/env bash
# v0.5.0 T-18 / F-017 — one-shot debug-APK build.
#
# Usage:  npm run build:apk
# Output: data/artifacts/brain-debug-v<android-versionName>-code<android-versionCode>.apk
#
# Pipeline:
#   1. Sanity: typecheck + next build. The APK is a thin WebView shell
#      that points at the live Mac dev server, so the `.next/` output is
#      not bundled into the APK — but `next build` is still our strongest
#      pre-flight signal (route collisions, dynamic config errors, strict
#      TS failures that `tsc --noEmit` alone can miss).
#   2. `npx cap sync android` — copies capacitor.config.json + plugin
#      manifests into android/app/. Safe to run repeatedly; idempotent.
#   3. `./gradlew assembleDebug` inside android/. Android's Gradle plugin
#      reuses incremental output; cold build ~90s, warm build ~2s.
#   4. Copy android/app/build/outputs/apk/debug/brain-debug-v<versionName>-code<versionCode>.apk →
#      data/artifacts/brain-debug-v<versionName>-code<versionCode>.apk.
#      The version tag comes from Android's installable version metadata,
#      so the filename matches what Android reports after installation.
#
# Exit non-zero on any failure — `set -euo pipefail` + explicit check on
# the final APK existence. 3-minute target from the plan is comfortable
# on an M1 Pro; warm rebuilds are <10s.
#
# T-19 will extend this with keytool auto-gen if the debug keystore is
# missing; T-20 will add the external keystore-backup step. Keeping T-18
# lean so those land as isolated diffs.

set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

ANDROID_BUILD_FILE="$REPO_ROOT/android/app/build.gradle"
VERSION_NAME="$(grep -E '^\s*versionName[[:space:]]+"' "$ANDROID_BUILD_FILE" | head -1 | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/')"
VERSION_CODE="$(grep -E '^\s*versionCode[[:space:]]+[0-9]+' "$ANDROID_BUILD_FILE" | head -1 | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/')"
if [[ -z "$VERSION_NAME" || -z "$VERSION_CODE" ]]; then
  echo "[build-apk] FAIL: could not read Android versionName/versionCode from $ANDROID_BUILD_FILE" >&2
  exit 1
fi

ARTIFACT_DIR="$REPO_ROOT/data/artifacts"
APK_NAME="brain-debug-v${VERSION_NAME}-code${VERSION_CODE}.apk"
ARTIFACT_PATH="$ARTIFACT_DIR/$APK_NAME"
GRADLE_OUTPUT="$REPO_ROOT/android/app/build/outputs/apk/debug/$APK_NAME"
KEYSTORE_PATH="$REPO_ROOT/android/app/debug.keystore"

echo "[build-apk] versionName=${VERSION_NAME}"
echo "[build-apk] versionCode=${VERSION_CODE}"
echo "[build-apk] artifact=${ARTIFACT_PATH}"

# APK versioning rule: every newly shared APK should have a fresh Android
# versionName + versionCode. The output filename includes both values, so
# an existing artifact at this path means this version was already built.
# Use ALLOW_REBUILD_SAME_APK_VERSION=1 only for a local throwaway rebuild
# that will not be handed to a tester/device as a new APK.
if [[ -f "$ARTIFACT_PATH" && "${ALLOW_REBUILD_SAME_APK_VERSION:-0}" != "1" ]]; then
  echo "[build-apk] FAIL: $ARTIFACT_PATH already exists." >&2
  echo "[build-apk]       Bump android/app/build.gradle versionName and versionCode before creating a new APK." >&2
  echo "[build-apk]       For a local-only rebuild, set ALLOW_REBUILD_SAME_APK_VERSION=1." >&2
  exit 1
fi

# v0.5.0 T-19 / F-018 — ensure a project-local debug keystore exists.
# Signing identity pinned at android/app/debug.keystore so all machines
# building this branch produce mutually-installable APKs. Defaults match
# what AGP's auto-generated debug keystore uses (storepass / keypass
# "android", alias "androiddebugkey", CN "Android Debug"), so there's no
# divergence from the Gradle convention. File is gitignored; scripts/
# recreate on first run.
if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "[build-apk] step 0/5  debug keystore missing — generating at $KEYSTORE_PATH"
  if ! command -v keytool >/dev/null 2>&1; then
    echo "[build-apk] FAIL: keytool not on PATH (install JDK to continue)" >&2
    exit 1
  fi
  keytool -genkeypair \
    -keystore "$KEYSTORE_PATH" \
    -storepass android \
    -keypass android \
    -alias androiddebugkey \
    -keyalg RSA -keysize 2048 \
    -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US" \
    -noprompt >/dev/null
  echo "[build-apk]         keystore generated (alias=androiddebugkey, validity=10000d)"
else
  echo "[build-apk] step 0/5  debug keystore present"
fi

# v0.5.0 T-20 / F-018 / gap G-3 / REVIEW P1-2 — keystore backup.
#
# Copies the active debug keystore to data/backups/debug.keystore.backup
# on every build. F-009's pruneOldBackups() only matches *.sqlite, so
# this file persists indefinitely — intentional: losing the signing
# identity means every paired device needs `adb uninstall` to accept a
# rebuilt APK.
#
# The in-tree backup protects against accidental deletion of
# android/app/debug.keystore. It does NOT protect against a full repo
# wipe or laptop loss. For that, the README documents a one-time
# operator step: copy data/backups/debug.keystore.backup to an
# external, non-repo path (e.g., ~/Documents/Brain-keystore-backup/)
# after the first successful build.
KEYSTORE_BACKUP_DIR="$REPO_ROOT/data/backups"
KEYSTORE_BACKUP_PATH="$KEYSTORE_BACKUP_DIR/debug.keystore.backup"
mkdir -p "$KEYSTORE_BACKUP_DIR"
cp "$KEYSTORE_PATH" "$KEYSTORE_BACKUP_PATH"
echo "[build-apk]         keystore backup → $KEYSTORE_BACKUP_PATH"

echo "[build-apk] step 1/5  typecheck + next build"
npx tsc --noEmit
npm run build

echo "[build-apk] step 2/5  capacitor sync"
npx cap sync android

echo "[build-apk] step 3/5  gradle assembleDebug"
cd "$REPO_ROOT/android"
./gradlew assembleDebug
cd "$REPO_ROOT"

if [[ ! -f "$GRADLE_OUTPUT" ]]; then
  echo "[build-apk] FAIL: expected $GRADLE_OUTPUT not produced" >&2
  exit 1
fi

echo "[build-apk] step 4/5  copy APK to data/artifacts"
mkdir -p "$ARTIFACT_DIR"
cp "$GRADLE_OUTPUT" "$ARTIFACT_PATH"

APK_SIZE_BYTES="$(wc -c < "$ARTIFACT_PATH")"
APK_SIZE_MB="$(awk "BEGIN {printf \"%.1f\", $APK_SIZE_BYTES/1024/1024}")"

echo "[build-apk] OK  $ARTIFACT_PATH  ($APK_SIZE_MB MB)"
echo "[build-apk] install:  adb install -r '$ARTIFACT_PATH'"
