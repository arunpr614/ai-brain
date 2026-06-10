# AI Brain Agent Rules

## APK Versioning

Whenever creating a new Android APK that will be shared, installed, or treated as a fresh build, bump both Android version fields first:

- `android/app/build.gradle` `versionName`
- `android/app/build.gradle` `versionCode`

Use a patch-style bump for normal debug APKs, for example `1.0`/`1` to `1.0.1`/`2`.

The APK filename must include the Android version metadata, for example:

```text
brain-debug-v1.0.1-code2.apk
```

Do not reuse an existing APK filename for a new build. `scripts/build-apk.sh` enforces this by failing when the versioned artifact already exists, unless `ALLOW_REBUILD_SAME_APK_VERSION=1` is set for a local-only throwaway rebuild.
