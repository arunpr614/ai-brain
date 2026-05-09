#!/usr/bin/env bash
# v0.5.0 T-18 / F-017 — one-shot debug-APK build.
#
# Usage:  npm run build:apk
# Output: data/artifacts/brain-debug-<version>.apk
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
#   4. Copy android/app/build/outputs/apk/debug/app-debug.apk →
#      data/artifacts/brain-debug-<version>.apk. The <version> tag comes
#      from package.json so a checkout at tag v0.5.0 produces a self-
#      identifying APK.
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

# Package version lives in package.json; grep-and-trim avoids requiring
# `jq` on a fresh machine.
VERSION="$(grep -E '^\s*"version":' package.json | head -1 | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/')"
if [[ -z "$VERSION" ]]; then
  echo "[build-apk] FAIL: could not read version from package.json" >&2
  exit 1
fi

ARTIFACT_DIR="$REPO_ROOT/data/artifacts"
ARTIFACT_PATH="$ARTIFACT_DIR/brain-debug-${VERSION}.apk"
GRADLE_OUTPUT="$REPO_ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

echo "[build-apk] version=${VERSION}"
echo "[build-apk] artifact=${ARTIFACT_PATH}"

echo "[build-apk] step 1/4  typecheck + next build"
npx tsc --noEmit
npm run build

echo "[build-apk] step 2/4  capacitor sync"
npx cap sync android

echo "[build-apk] step 3/4  gradle assembleDebug"
cd "$REPO_ROOT/android"
./gradlew assembleDebug
cd "$REPO_ROOT"

if [[ ! -f "$GRADLE_OUTPUT" ]]; then
  echo "[build-apk] FAIL: expected $GRADLE_OUTPUT not produced" >&2
  exit 1
fi

echo "[build-apk] step 4/4  copy APK to data/artifacts"
mkdir -p "$ARTIFACT_DIR"
cp "$GRADLE_OUTPUT" "$ARTIFACT_PATH"

APK_SIZE_BYTES="$(wc -c < "$ARTIFACT_PATH")"
APK_SIZE_MB="$(awk "BEGIN {printf \"%.1f\", $APK_SIZE_BYTES/1024/1024}")"

echo "[build-apk] OK  $ARTIFACT_PATH  ($APK_SIZE_MB MB)"
echo "[build-apk] install:  adb install -r '$ARTIFACT_PATH'"
