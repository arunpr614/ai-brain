import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

type EvidenceLabel =
  | "Browser mobile only"
  | "Android runtime blocked"
  | "Android manifest inspected"
  | "APK artifact stale or unproven"
  | "Not supported by manifest";

interface ToolStatus {
  name: string;
  found: boolean;
  path?: string;
  source?: string;
  version?: string;
}

interface ApkInfo {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  mtimeIso?: string;
  sha256?: string;
}

interface EvidenceRow {
  surface: string;
  currentLabel: EvidenceLabel;
  runtimeRequired: boolean;
  status:
    | "browser_validated"
    | "preflight_only"
    | "runtime_blocked"
    | "release_blocked"
    | "not_supported_by_manifest";
  note: string;
}

const projectRoot = process.cwd();
const defaultOutputPath = path.join(
  projectRoot,
  "UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_PREFLIGHT_2026-06-16_13-04-00_IST.json",
);
const outputPath = process.env.A6_PREFLIGHT_OUT
  ? path.resolve(projectRoot, process.env.A6_PREFLIGHT_OUT)
  : defaultOutputPath;

const files = {
  gradle: "android/app/build.gradle",
  capacitor: "capacitor.config.ts",
  manifest: "android/app/src/main/AndroidManifest.xml",
  offline: "public/offline.html",
  sw: "public/sw.js",
};

function readRequired(relativePath: string): string {
  const absolute = path.join(projectRoot, relativePath);
  return fs.readFileSync(absolute, "utf8");
}

function firstMatch(body: string, pattern: RegExp): string | null {
  const match = body.match(pattern);
  return match?.[1] ?? null;
}

function fileInfo(absolutePath: string): ApkInfo {
  if (!fs.existsSync(absolutePath)) {
    return { path: path.relative(projectRoot, absolutePath), exists: false };
  }
  const stat = fs.statSync(absolutePath);
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolutePath))
    .digest("hex");
  return {
    path: path.relative(projectRoot, absolutePath),
    exists: true,
    sizeBytes: stat.size,
    mtimeIso: stat.mtime.toISOString(),
    sha256: hash,
  };
}

function commandVersion(command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 3_000,
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return out ? out.split(/\r?\n/)[0] : undefined;
}

function pathCommand(name: string): string | undefined {
  const result = spawnSync("zsh", ["-lc", `command -v ${name}`], {
    encoding: "utf8",
    timeout: 3_000,
  });
  const candidate = result.stdout.trim().split(/\r?\n/)[0];
  return candidate || undefined;
}

function findExecutable(name: string, candidates: string[]): ToolStatus {
  const fromPath = pathCommand(name);
  if (fromPath) {
    return {
      name,
      found: true,
      path: fromPath,
      source: "PATH",
      version: versionForTool(name, fromPath),
    };
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return {
        name,
        found: true,
        path: candidate,
        source: "bounded common path",
        version: versionForTool(name, candidate),
      };
    }
  }

  return { name, found: false };
}

function versionForTool(name: string, executable: string): string | undefined {
  if (name === "adb") return commandVersion(executable, ["version"]);
  if (name === "emulator") return commandVersion(executable, ["-version"]);
  if (name === "java") return commandVersion(executable, ["-version"]);
  if (name === "keytool") return commandVersion(executable, ["-help"]);
  return undefined;
}

function sdkCandidates(): string[] {
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library/Android/sdk"),
    "/opt/android-sdk",
    "/usr/local/share/android-sdk",
  ].filter(Boolean) as string[];

  return [...new Set(roots)];
}

function toolCandidates(tool: "adb" | "emulator"): string[] {
  const roots = sdkCandidates();
  const relative =
    tool === "adb"
      ? ["platform-tools/adb"]
      : ["emulator/emulator", "tools/emulator"];
  return roots.flatMap((root) => relative.map((segment) => path.join(root, segment)));
}

function parseAdbDevices(adbPath?: string) {
  if (!adbPath) {
    return {
      attempted: false,
      deviceCount: 0,
      devices: [],
      note: "adb was not found, so no Android runtime was inspected.",
    };
  }

  const result = spawnSync(adbPath, ["devices", "-l"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("List of devices"));

  const devices = lines.map((line) => {
    const [serial = "", state = "unknown"] = line.split(/\s+/);
    return {
      serialFingerprint: crypto
        .createHash("sha256")
        .update(serial)
        .digest("hex")
        .slice(0, 12),
      state,
      transport: line.includes("emulator") ? "emulator_or_virtual" : "device_or_unknown",
    };
  });

  return {
    attempted: true,
    exitCode: result.status,
    stderr: stderr.trim() ? stderr.trim().slice(0, 300) : undefined,
    deviceCount: devices.filter((device) => device.state === "device").length,
    rawLineCount: lines.length,
    devices,
  };
}

function parseCacheNames(sw: string): Record<string, string> {
  const caches: Record<string, string> = {};
  const pattern = /const\s+(SHELL_CACHE|STATIC_CACHE|PAGES_CACHE)\s*=\s*"([^"]+)"/g;
  let match = pattern.exec(sw);
  while (match) {
    caches[match[1]] = match[2];
    match = pattern.exec(sw);
  }
  return caches;
}

const gradle = readRequired(files.gradle);
const capacitor = readRequired(files.capacitor);
const manifest = readRequired(files.manifest);
const offline = readRequired(files.offline);
const sw = readRequired(files.sw);

const namespace = firstMatch(gradle, /namespace\s*=\s*"([^"]+)"/);
const applicationId = firstMatch(gradle, /applicationId\s+"([^"]+)"/);
const versionCode = firstMatch(gradle, /versionCode\s+([0-9]+)/);
const versionName = firstMatch(gradle, /versionName\s+"([^"]+)"/);
const apkName =
  versionName && versionCode
    ? `brain-debug-v${versionName}-code${versionCode}.apk`
    : null;
const expectedGradleOutput = apkName
  ? path.join(projectRoot, "android/app/build/outputs/apk/debug", apkName)
  : null;
const expectedArtifact = apkName
  ? path.join(projectRoot, "data/artifacts", apkName)
  : null;

const capacitorMetadata = {
  appId: firstMatch(capacitor, /appId:\s*"([^"]+)"/),
  appName: firstMatch(capacitor, /appName:\s*"([^"]+)"/),
  webDir: firstMatch(capacitor, /webDir:\s*"([^"]+)"/),
  serverUrl: firstMatch(capacitor, /url:\s*"([^"]+)"/),
  androidScheme: firstMatch(capacitor, /androidScheme:\s*"([^"]+)"/),
  errorPath: firstMatch(capacitor, /errorPath:\s*"([^"]+)"/),
  capacitorHttpEnabled: /CapacitorHttp[\s\S]*?enabled:\s*false/.test(capacitor)
    ? false
    : /CapacitorHttp[\s\S]*?enabled:\s*true/.test(capacitor)
      ? true
      : null,
};

const manifestSupport = {
  launcher:
    manifest.includes('android.intent.action.MAIN') &&
    manifest.includes('android.intent.category.LAUNCHER'),
  shareText:
    manifest.includes('android.intent.action.SEND') &&
    manifest.includes('android:mimeType="text/plain"'),
  sharePdf:
    manifest.includes('android.intent.action.SEND') &&
    manifest.includes('android:mimeType="application/pdf"'),
  shareMultiplePdf:
    manifest.includes('android.intent.action.SEND_MULTIPLE') &&
    manifest.includes('android:mimeType="application/pdf"'),
  cameraPermission: manifest.includes('android.permission.CAMERA'),
  cameraRequiredFalse: manifest.includes('android.hardware.camera') && manifest.includes('android:required="false"'),
  directViewSetup:
    manifest.includes('android.intent.action.VIEW') &&
    manifest.includes('/setup-apk'),
  directViewSetupStatus:
    manifest.includes('android.intent.action.VIEW') &&
    manifest.includes('/setup-apk')
      ? "supported_by_manifest"
      : "not_supported_by_manifest",
};

const offlineServiceWorker = {
  offlineTitlePresent: offline.includes("AI Memory needs the server"),
  serverRequiredFallbackCopy: /Ask,\s*capture,\s*export,\s*and\s*sync\s*require\s*server\s*access/i.test(
    offline,
  ),
  noOfflineQueueCopy: offline.includes("There is no offline queue in UX v2"),
  activeOfflineSyncClaimAbsent:
    !/offline sync/i.test(offline) &&
    !/sync (is|will be|available) offline/i.test(offline),
  offlineReadClaimAbsent:
    !/read offline/i.test(offline) &&
    !/available offline/i.test(offline),
  retryHealthProbe: offline.includes("/api/health"),
  productionOriginMapping: offline.includes('const primaryServerOrigin = "https://brain.arunp.in"'),
  capacitorLocalOriginMapping: offline.includes('"https://localhost"') && offline.includes('"http://localhost"'),
  cacheNames: parseCacheNames(sw),
  precacheOfflineHtml: sw.includes('"/offline.html"'),
  networkOnlyApi: sw.includes('"/api/"'),
  networkOnlyUnlock: sw.includes('"/unlock"'),
  networkOnlySetupApk: sw.includes('"/setup-apk"'),
  localDevBypass: sw.includes("LOCAL_DEV_HOSTS") && sw.includes("IS_LOCAL_DEV"),
  purgesLegacyCaches:
    sw.includes('n.startsWith("brain-")') &&
    sw.includes('n.startsWith("ai-memory-")') &&
    sw.includes("caches.delete"),
  staleWhileRevalidatePages: sw.includes("staleWhileRevalidate") && sw.includes("PAGES_CACHE"),
};

const sdkRoots = sdkCandidates().map((candidate) => ({
  path: candidate,
  exists: fs.existsSync(candidate),
}));
const adb = findExecutable("adb", toolCandidates("adb"));
const emulator = findExecutable("emulator", toolCandidates("emulator"));
const java = findExecutable("java", [
  "/opt/homebrew/opt/openjdk@21/bin/java",
  "/usr/local/opt/openjdk@21/bin/java",
  "/usr/bin/java",
]);
const keytool = findExecutable("keytool", [
  "/opt/homebrew/opt/openjdk@21/bin/keytool",
  "/usr/local/opt/openjdk@21/bin/keytool",
  "/usr/bin/keytool",
]);
const adbDevices = parseAdbDevices(adb.path);

const gradleOutput = expectedGradleOutput
  ? fileInfo(expectedGradleOutput)
  : { path: "unknown", exists: false };
const publishedArtifact = expectedArtifact
  ? fileInfo(expectedArtifact)
  : { path: "unknown", exists: false };

type ApkFreshness = "current" | "stale_or_unproven" | "missing";

const apkFreshness: ApkFreshness =
  gradleOutput.exists || publishedArtifact.exists ? "stale_or_unproven" : "missing";
const runtimeBlockedReasons: string[] = [];
if (!adb.found) runtimeBlockedReasons.push("adb was not found in PATH or bounded SDK locations.");
if (adb.found && adbDevices.deviceCount === 0) {
  runtimeBlockedReasons.push("No adb device or emulator was available for runtime inspection.");
}
if (apkFreshness === "missing" || apkFreshness === "stale_or_unproven") {
  runtimeBlockedReasons.push(
    "No fresh A6 APK build was run; existing APK artifacts predate the current UX v2 execution evidence.",
  );
}
if (!manifestSupport.directViewSetup) {
  runtimeBlockedReasons.push("Direct Android VIEW launch into /setup-apk is not supported by the manifest.");
}

const evidenceLabels: EvidenceRow[] = [
  "/library",
  "/ask",
  "/capture",
  "/capture/share-result",
  "/items/[id]",
  "/items/[id]/ask",
  "/items/[id]/repair",
  "/needs-upgrade",
  "/more",
  "/topics/[slug]",
  "/collections/[id]",
  "/settings/device-pairing",
  "/setup",
  "/unlock",
  "/setup-apk",
].map((surface) => ({
  surface,
  currentLabel: "Browser mobile only" as const,
  runtimeRequired: true,
  status: "browser_validated" as const,
  note: "Validated in mobile browser harness only; Android WebView runtime evidence is still required.",
}));

evidenceLabels.push(
  {
    surface: "offline fallback",
    currentLabel: "Android runtime blocked",
    runtimeRequired: true,
    status: "runtime_blocked",
    note: "Offline page and service worker were inspected statically; WebView offline launch and cache behavior still need device proof.",
  },
  {
    surface: "native share URL",
    currentLabel: "Android manifest inspected",
    runtimeRequired: true,
    status: "preflight_only",
    note: "text/plain SEND filter exists, but Android share-sheet delivery into the app was not run.",
  },
  {
    surface: "native share PDF",
    currentLabel: "Android manifest inspected",
    runtimeRequired: true,
    status: "preflight_only",
    note: "application/pdf SEND and SEND_MULTIPLE filters exist, but WebView memory/runtime handling was not run.",
  },
  {
    surface: "pairing token persistence",
    currentLabel: "Android runtime blocked",
    runtimeRequired: true,
    status: "runtime_blocked",
    note: "Browser cookie injection does not prove Capacitor/WebView storage persistence after restart.",
  },
  {
    surface: "WebView asset pickup",
    currentLabel: "APK artifact stale or unproven",
    runtimeRequired: true,
    status: "release_blocked",
    note: "Existing APK artifacts were inspected, but no fresh A6 build or device install was run.",
  },
  {
    surface: "stale cache recovery",
    currentLabel: "Android runtime blocked",
    runtimeRequired: true,
    status: "runtime_blocked",
    note: "Service-worker cache cleanup was inspected statically; stale-cache recovery needs WebView runtime proof.",
  },
  {
    surface: "direct VIEW /setup-apk",
    currentLabel: manifestSupport.directViewSetup
      ? "Android manifest inspected"
      : "Not supported by manifest",
    runtimeRequired: false,
    status: manifestSupport.directViewSetup
      ? "preflight_only"
      : "not_supported_by_manifest",
    note: manifestSupport.directViewSetup
      ? "A VIEW intent filter appears present and still needs runtime proof."
      : "No Android VIEW intent filter targets /setup-apk; do not claim direct deep-link support.",
  },
);

const statuses = ["preflight_passed"];
if (runtimeBlockedReasons.length > 0) statuses.push("runtime_blocked", "release_blocked");

const report = {
  createdAt: new Date().toISOString(),
  projectRoot,
  statuses,
  preflightPassed: true,
  runtimeBlocked: runtimeBlockedReasons.length > 0,
  releaseBlocked: true,
  runtimeBlockedReasons,
  sourceFiles: files,
  androidMetadata: {
    gradle: {
      namespace,
      applicationId,
      versionName,
      versionCode: versionCode ? Number(versionCode) : null,
      apkOutputName: apkName,
    },
    capacitor: capacitorMetadata,
  },
  apk: {
    expectedGradleOutput: gradleOutput,
    expectedPublishedArtifact: publishedArtifact,
    apkFreshness,
    freshnessReason:
      apkFreshness === "missing"
        ? "No expected APK output or published artifact exists for the current Android version."
        : "Existing APK output/artifact exists, but A6 did not run a fresh APK build or Android install.",
  },
  tooling: {
    sdkRoots,
    adb,
    emulator,
    java,
    keytool,
    adbDevices,
  },
  manifestSupport,
  offlineServiceWorker,
  evidenceLabels,
  validationNextCommands: [
    "ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk",
    "adb devices -l",
    apkName ? `adb install -r data/artifacts/${apkName}` : "adb install -r data/artifacts/<current-apk>",
    "adb shell monkey -p com.arunprakash.brain 1",
    "Use chrome://inspect or equivalent WebView inspection to verify loaded origin, cookies, service worker, and cache behavior.",
  ],
  noBehaviorChangeExpected: true,
  notes: [
    "A6 is a preflight evidence gate, not a substitute for Android device or emulator validation.",
    "Do not promote the APK to production until runtime validation, backup/rollback, live smoke, WebView asset pickup, and stale-cache recovery are complete.",
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
