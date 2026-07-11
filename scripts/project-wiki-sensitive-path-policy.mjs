export const SENSITIVE_PATH_REGRESSION_FIXTURES = [
  "docs/plans/recall-sync/RECALL_LIVE_SPIKE_EXECUTION_REPORT.md",
  "docs/plans/recall-sync/RECALL_PRODUCTION_SYSTEM_KEY_EVIDENCE_RECORDER.md",
  "UX_v2/execution/ANDROID_RUNTIME_CHECK.md",
  "UX_v2/evidence/android-runtime-a11/pairing-pin-state.png",
  "UX_v2/evidence/android-runtime-a12/uiautomator.xml",
  "UX_v2/execution/screenshots/device-pairing-code.png",
  "UX_v2/evidence/device-runtime/adb-install.txt",
  "data/errors.jsonl",
  "data/spikes/capture-artifacts/run-1/artifacts/raw-response.bin",
  "data/backups/brain-2026-07-10.sqlite",
  "android/app/debug.keystore",
  "data/artifacts/private-client.apk",
  ".npm-cache/_logs/install.log",
  "reports/item-ask-needs-upgrade-seed-raw.log",
];

export const SAFE_PATH_REGRESSION_FIXTURES = [
  "docs/wiki/System-Architecture.md",
  "src/lib/auth/bearer.ts",
  "scripts/check-agent-doc-coverage.mjs",
  "extension/src/options.ts",
  "docs/feature-council/FCP-002/PRD_v2.md",
];

const SENSITIVE_PUBLICATION_PATH = new RegExp([
  "secret|credential|private|token|key[-_ ]?rotation",
  "\\.env(?:\\.|$)|logcat|session|brain\\.sqlite|database",
  "production[-_ ]?(?:env|key|apply)",
  "(?:key|credential|secret).*evidence|evidence.*(?:key|credential|secret)",
  "(?:^|[/_. -])(?:live|runtime)(?:[/_. -]|$)",
  "android[-_ ]?runtime|device[-_ ]?(?:log|runtime|evidence)",
  "(?:^|[/_. -])(?:uiautomator|adb|screenshots?|screen[-_ ]?recordings?)(?:[/_. -]|$)",
  "personal|handover.*configuration|(?:^|[/_ .-])arun(?:[/_ .-]|$)",
  "(?:^|/)backups?(?:/|$)",
  "(?:^|/)data/(?:.*/)?(?:artifacts|private|backups?)(?:/|$)",
  "(?:^|/)data/(?:.*/)?errors(?:\\.[^/]*)?$",
  "\\.(?:log|jsonl|sqlite3?|db|keystore|jks|p12|pfx|apk)(?:[._-]|$)",
].join("|"), "i");

export function isSensitiveProjectWikiPath(value) {
  return SENSITIVE_PUBLICATION_PATH.test(value);
}
