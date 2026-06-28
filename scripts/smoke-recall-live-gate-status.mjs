#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const tempManifestPath = `data/private/recall-live-spikes/controlled-samples-status-smoke-${process.pid}-${Date.now()}.json`;
const unsafeManifestPath = `controlled-samples-status-smoke-unsafe-${process.pid}-${Date.now()}.json`;
const tempEnvPath = `data/private/recall-live-spikes/recall-status-smoke-${process.pid}-${Date.now()}.env`;
const unsafeEnvPath = `recall-status-smoke-unsafe-${process.pid}-${Date.now()}.env`;
const ignoredWrongRootEnvPath = `data/recall-status-smoke-wrong-root-${process.pid}-${Date.now()}.env`;
const missingManifestPath = `data/private/recall-live-spikes/missing-status-smoke-${process.pid}-${Date.now()}.json`;

try {
  const missing = runStatus(["--manifest", missingManifestPath], {});
  assert(missing.status === "needs_manifest_template", "missing manifest should request template init");
  assert(missing.ok === false, "missing manifest status should not be ok");
  assert(missing.readyForApprovedLiveSpikes === false, "missing manifest should not be live-ready");
  assert(missing.privateEvidenceOk === true, "missing manifest should still report private evidence safety separately");
  assert(missing.manifest.exists === false, "missing manifest should report exists=false");

  const missingRequireReady = runStatusExpectExit(["--manifest", missingManifestPath, "--require-ready"], {}, 1);
  assert(missingRequireReady.status === "needs_manifest_template", "require-ready missing manifest should still print status JSON");
  assert(missingRequireReady.ok === false, "require-ready missing manifest should print ok=false");

  writeFileSync(tempManifestPath, `${JSON.stringify(validManifest(), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  writeFileSync(unsafeManifestPath, `${JSON.stringify(validManifest(), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  const unsafeManifest = runStatus(["--manifest", unsafeManifestPath], {});
  assert(
    unsafeManifest.status === "needs_manifest_file_safety_fix",
    "existing manifest outside ignored private paths should block live-gate readiness",
  );
  assert(unsafeManifest.ok === false, "unsafe manifest status should not be ok");
  assert(
    unsafeManifest.manifest.fileSafety.safeForPrivateValues === false,
    "status should report unsafe manifest location",
  );

  const trackedManifest = runStatus(["--manifest", "package.json"], {});
  assert(
    trackedManifest.status === "needs_manifest_file_safety_fix",
    "tracked manifest path should block live-gate readiness",
  );
  assert(trackedManifest.manifest.fileSafety.tracked === true, "tracked manifest path should report tracked=true");

  chmodSync(tempManifestPath, 0o644);
  const insecureManifest = runStatus(["--manifest", tempManifestPath], {});
  assert(
    insecureManifest.status === "needs_manifest_permission_fix",
    "group-readable manifest should block live-gate readiness",
  );
  assert(insecureManifest.ok === false, "insecure manifest status should not be ok");
  assert(
    insecureManifest.manifest.fileSafety.securePermissions === false,
    "status should report insecure manifest permissions",
  );
  chmodSync(tempManifestPath, 0o600);

  writeFileSync(unsafeEnvPath, 'export RECALL_API_KEY=""\nexport BRAIN_RECALL_CONFIRM_LIVE_API=0\n', {
    encoding: "utf8",
    mode: 0o600,
  });
  const unsafeEnvFile = runStatus(["--manifest", tempManifestPath, "--env-file", unsafeEnvPath], {});
  assert(
    unsafeEnvFile.status === "needs_env_file_safety_fix",
    "existing env file outside ignored private paths should block live-gate readiness",
  );
  assert(
    unsafeEnvFile.credential.recallEnvFile.safeForSecretHandling === false,
    "status should report unsafe env file location",
  );
  assert(unsafeEnvFile.credential.recallEnvFile.ignored === false, "unsafe env file should not be ignored");

  writeFileSync(ignoredWrongRootEnvPath, 'export RECALL_API_KEY=""\nexport BRAIN_RECALL_CONFIRM_LIVE_API=0\n', {
    encoding: "utf8",
    mode: 0o600,
  });
  const ignoredWrongRootEnvFile = runStatus(["--manifest", tempManifestPath, "--env-file", ignoredWrongRootEnvPath], {});
  assert(
    ignoredWrongRootEnvFile.status === "needs_env_file_safety_fix",
    "ignored env file outside the private Recall evidence root should block live-gate readiness",
  );
  assert(
    ignoredWrongRootEnvFile.credential.recallEnvFile.ignored === true,
    "wrong-root env file should prove ignored alone is not sufficient",
  );
  assert(
    ignoredWrongRootEnvFile.credential.recallEnvFile.underPrivateRecallEvidencePath === false,
    "status should report env file outside private Recall evidence root",
  );
  assert(
    ignoredWrongRootEnvFile.credential.recallEnvFile.safeForSecretHandling === false,
    "wrong-root env file should not be safe for secret handling",
  );

  const trackedEnvFile = runStatus(["--manifest", tempManifestPath, "--env-file", "package.json"], {});
  assert(
    trackedEnvFile.status === "needs_env_file_safety_fix",
    "tracked env file path should block live-gate readiness",
  );
  assert(trackedEnvFile.credential.recallEnvFile.tracked === true, "tracked env file path should report tracked=true");

  writeFileSync(tempEnvPath, 'export RECALL_API_KEY=""\nexport BRAIN_RECALL_CONFIRM_LIVE_API=0\n', {
    encoding: "utf8",
    mode: 0o644,
  });
  chmodSync(tempEnvPath, 0o644);
  const insecureEnvFile = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {});
  assert(
    insecureEnvFile.status === "needs_env_permission_fix",
    "insecure env file permissions should block live-gate readiness",
  );
  assert(insecureEnvFile.credential.recallEnvFile.mode === "644", "status should report env file mode");
  assert(
    insecureEnvFile.credential.recallEnvFile.securePermissions === false,
    "status should report insecure env file permissions",
  );
  chmodSync(tempEnvPath, 0o600);
  const secureEnvFile = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {});
  assert(
    secureEnvFile.status === "needs_env_key_or_approval",
    "secure env file without a key should request adding the key or approval",
  );
  assert(secureEnvFile.ok === false, "missing env-file key should not be ok");
  assert(secureEnvFile.credential.recallEnvFile.mode === "600", "status should report secure env file mode");
  assert(
    secureEnvFile.credential.recallEnvFile.securePermissions === true,
    "status should report secure env file permissions",
  );
  assert(secureEnvFile.credential.recallEnvFile.loaded === true, "secure env file should be loaded");
  assert(
    secureEnvFile.credential.recallApiKeyEnvPresent === false,
    "empty env file key should not count as present",
  );

  writeFileSync(
    tempEnvPath,
    'export RECALL_API_KEY="redacted-local-smoke"\nexport BRAIN_RECALL_CONFIRM_LIVE_API=1\n',
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(tempEnvPath, 0o600);
  const secureEnvFileReady = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {});
  assert(
    secureEnvFileReady.status === "ready_for_approved_live_spikes",
    "secure env file with key and confirmation should report ready",
  );
  assert(secureEnvFileReady.ok === true, "ready env file status should be ok");
  assert(secureEnvFileReady.credential.recallEnvFile.loaded === true, "ready env file should be loaded");
  assert(
    secureEnvFileReady.credential.recallApiKeyEnvPresent === true,
    "ready env file key should count as present",
  );
  assert(
    secureEnvFileReady.credential.liveApiConfirmationPresent === true,
    "ready env file confirmation should count as present",
  );
  assert(
    !JSON.stringify(secureEnvFileReady).includes("redacted-local-smoke"),
    "ready env file status must not leak API key value",
  );

  writeFileSync(tempEnvPath, 'export RECALL_API_KEY=""\nexport BRAIN_RECALL_CONFIRM_LIVE_API=0\n', {
    encoding: "utf8",
    mode: 0o600,
  });

  const validNoKey = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {});
  assert(validNoKey.manifest.valid === true, "valid manifest should pass");
  assert(validNoKey.manifest.sampleCount === 6, "valid manifest should summarize six samples");
  assert(
    validNoKey.status === "needs_env_key_or_approval",
    "valid manifest with empty safe env file should request adding an API key",
  );
  assert(validNoKey.credential.recallApiKeyEnvPresent === false, "key presence should be false without env");
  assert(validNoKey.ok === false, "valid manifest without key should not be ok");

  writeFileSync(tempManifestPath, `${JSON.stringify(publicReportManifest(), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  const publicReportRequested = runStatus(["--manifest", tempManifestPath], {});
  assert(
    publicReportRequested.status === "needs_manifest_fix",
    "manifest requesting public title/source URL exposure should require a manifest fix",
  );
  assert(publicReportRequested.ok === false, "public-report exposure request should not be ok");
  assert(publicReportRequested.manifest.valid === false, "public-report manifest should be invalid");
  assert(
    JSON.stringify(publicReportRequested.manifest.findings).includes("redacted-only public reports"),
    "public-report manifest finding should explain redacted-only policy",
  );

  writeFileSync(tempManifestPath, `${JSON.stringify(validManifest(), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  const validWithKey = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {
    RECALL_API_KEY: "redacted-local-smoke",
  });
  assert(
    validWithKey.status === "needs_live_api_confirmation",
    "valid manifest with env key should require explicit live API confirmation",
  );
  assert(validWithKey.ok === false, "valid manifest with key but without live confirmation should not be ok");
  assert(validWithKey.credential.recallApiKeyEnvPresent === true, "key presence should be true with env");
  const serialized = JSON.stringify(validWithKey);
  assert(!serialized.includes("redacted-local-smoke"), "status output must not include API key value");

  const validWithKeyAndConfirmation = runStatus(["--manifest", tempManifestPath, "--env-file", tempEnvPath], {
    RECALL_API_KEY: "redacted-local-smoke",
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
  });
  assert(
    validWithKeyAndConfirmation.status === "ready_for_approved_live_spikes",
    "valid manifest with env key and confirmation should report ready for approved live spikes",
  );
  assert(validWithKeyAndConfirmation.ok === true, "ready status should be ok");
  assert(
    validWithKeyAndConfirmation.readyForApprovedLiveSpikes === true,
    "ready status should expose readyForApprovedLiveSpikes=true",
  );

  const readyRequireReady = runStatusExpectExit(
    ["--manifest", tempManifestPath, "--env-file", tempEnvPath, "--require-ready"],
    {
      RECALL_API_KEY: "redacted-local-smoke",
      BRAIN_RECALL_CONFIRM_LIVE_API: "1",
    },
    0,
  );
  assert(readyRequireReady.ok === true, "require-ready should exit 0 and print ok=true when ready");
} finally {
  if (existsSync(resolve(tempManifestPath))) rmSync(resolve(tempManifestPath), { force: true });
  if (existsSync(resolve(unsafeManifestPath))) rmSync(resolve(unsafeManifestPath), { force: true });
  if (existsSync(resolve(tempEnvPath))) rmSync(resolve(tempEnvPath), { force: true });
  if (existsSync(resolve(unsafeEnvPath))) rmSync(resolve(unsafeEnvPath), { force: true });
  if (existsSync(resolve(ignoredWrongRootEnvPath))) rmSync(resolve(ignoredWrongRootEnvPath), { force: true });
}

assert(!existsSync(resolve(tempManifestPath)), "smoke temp manifest must be removed");
assert(!existsSync(resolve(unsafeManifestPath)), "smoke unsafe manifest must be removed");
assert(!existsSync(resolve(tempEnvPath)), "smoke temp env file must be removed");
assert(!existsSync(resolve(unsafeEnvPath)), "smoke unsafe env file must be removed");
assert(!existsSync(resolve(ignoredWrongRootEnvPath)), "smoke wrong-root env file must be removed");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "missing manifest next action",
        "unsafe manifest location gate",
        "tracked manifest path gate",
        "insecure manifest permission gate",
        "valid manifest summary",
        "public report exposure manifest rejected",
        "unsafe env file location gate",
        "ignored wrong-root env file gate",
        "tracked env file path gate",
        "insecure env file permission gate",
        "secure env file permission summary",
        "secure env file load without printing key",
        "ready status using key and confirmation loaded from secure env file",
        "API-key approval gate",
        "existing ignored env template next action",
        "explicit live API confirmation gate",
        "ready status with env key and confirmation present",
        "ok is true only for ready-for-approved-live-spikes status",
        "require-ready exits nonzero when not ready",
        "require-ready exits zero when ready",
        "API key value not printed",
        "temp manifest cleanup",
        "temp env cleanup",
      ],
      noPersistentPrivateManifest: true,
      noPersistentUnsafeManifest: true,
      noPersistentPrivateEnvFile: true,
      noPersistentUnsafeEnvFile: true,
      noPersistentWrongRootEnvFile: true,
    },
    null,
    2,
  ),
);

function runStatus(args, env) {
  return runStatusExpectExit(args, env, 0);
}

function runStatusExpectExit(args, env, expectedStatus) {
  const result = spawnSync(process.execPath, ["--", "scripts/check-recall-live-gate-status.mjs", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, RECALL_API_KEY: "", ...env },
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    throw new Error(
      `live gate status expected exit ${expectedStatus}, got ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`live gate status did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validManifest() {
  const manifest = templateManifest();
  manifest.dateWindow = {
    dateFrom: "2026-06-24T00:00:00Z",
    dateTo: "2026-06-24T23:59:59Z",
  };
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-status-smoke-${index + 1}`,
    expectedTitle: `Status smoke ${sample.label}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : `https://example.com/status-smoke/${sample.label}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-status-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Status smoke outside window",
  };
  return manifest;
}

function publicReportManifest() {
  const manifest = validManifest();
  manifest.samples[0].allowTitleInPublicReport = true;
  manifest.samples[1].allowSourceUrlInPublicReport = true;
  return manifest;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
