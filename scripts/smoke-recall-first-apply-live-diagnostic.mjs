#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";

const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-live-diagnostic-smoke-"));
const privateSmokeDir = join("data/private/recall-live-spikes", `first-apply-live-diagnostic-smoke-${process.pid}`);
const requests = [];

const server = createServer((req, res) => {
  requests.push({
    url: req.url,
    authorization: req.headers.authorization ?? null,
  });

  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      total_count: 1,
      results: [
        {
          id: "private-live-diagnostic-card-id",
          title: "Private live diagnostic title",
          source_url: "https://example.com/private-live-diagnostic?token=secret123",
        },
      ],
    }),
  );
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

try {
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const backup = join(scratch, "backup.sqlite");
  const envFile = join(privateSmokeDir, "recall.env");
  const missingEnvFile = join(privateSmokeDir, "missing-recall.env");
  const manifest = join(privateSmokeDir, "controlled-samples.json");
  const envOutputFile = join(privateSmokeDir, "env-file-live-diagnostic-output.json");
  const promptOutputFile = join(privateSmokeDir, "prompt-live-diagnostic-output.json");
  const statusFailureOutputFile = join(privateSmokeDir, "status-helper-failure-live-diagnostic-output.json");
  const statusHelperFailer = join(scratch, "status-helper-failer.cjs");

  mkdirSync(privateSmokeDir, { recursive: true });
  writePrivateEnv(envFile);
  writeManifest(manifest);
  writeStatusHelperFailer(statusHelperFailer);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeSqliteBackup(backup);
  chmodSync(backup, 0o600);

  const staleDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(envFile, staleDate, staleDate);
  utimesSync(manifest, staleDate, staleDate);

  const unconfirmed = await runDiagnostic({ envFile, manifest, enumeration, fidelity, dryRunReport, backup, confirm: false });
  assert(unconfirmed.status === 2, "diagnostic should refuse without explicit live confirmation");
  assert(unconfirmed.stderr.includes("missing_live_api_confirmation"), "unconfirmed diagnostic should name missing confirmation");
  assertNoSecret(unconfirmed, "unconfirmed diagnostic");
  assertNoPrivateOutput(unconfirmed, "unconfirmed diagnostic");

  const rejectedEnvOutputFile = await runDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    confirm: true,
    extraArgs: ["--output-file", join(scratch, "unsafe-env-file-live-diagnostic-output.json")],
  });
  assert(
    rejectedEnvOutputFile.status === 2,
    "env-file diagnostic should reject output files outside the private Recall evidence path before probing",
  );
  assert(
    rejectedEnvOutputFile.stderr.includes("output_file_not_private"),
    "unsafe env-file output file rejection should name output_file_not_private",
  );
  assertNoSecret(rejectedEnvOutputFile, "rejected env-file output diagnostic");
  assertNoPrivateOutput(rejectedEnvOutputFile, "rejected env-file output diagnostic");
  assert(requests.length === 0, "rejected env-file output diagnostic should not add a live-read probe request");

  const ok = await runDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    confirm: true,
    extraArgs: ["--output-file", envOutputFile],
  });
  assert(
    ok.status === 0,
    `diagnostic should pass against the local read-only probe; status=${ok.status}; stdout=${ok.stdout}; stderr=${ok.stderr}`,
  );
  const okJson = parseJson(ok.stdout, "diagnostic stdout");
  assert(okJson.ok === true, "diagnostic JSON should report ok=true");
  assert(okJson.mode === "first_apply_live_read_diagnostic", "diagnostic mode should be first_apply_live_read_diagnostic");
  assert(
    okJson.statusBeforeProbe.status === "blocked_key_rotation_evidence",
    "diagnostic should preserve blocked first-write status",
  );
  assert(
    okJson.firstWriteSafety.blockedBeforeProofRefreshOrApply === true,
    "diagnostic should preserve first-write block",
  );
  assert(okJson.firstWriteSafety.proofRefreshAllowedNow === false, "diagnostic should not allow proof refresh");
  assert(okJson.firstWriteSafety.applyAllowedNow === false, "diagnostic should not allow apply");
  assert(okJson.liveAuthProbe.result.httpStatus === 200, "diagnostic should report HTTP 200");
  assert(okJson.liveAuthProbe.result.totalCount === 1, "diagnostic should report total count only");
  assert(okJson.liveAuthProbe.result.resultCount === 1, "diagnostic should report result count only");
  assert(
    okJson.liveAuthProbe.firstWriteSafety.keyRotationEvidenceGateRun === false,
    "diagnostic probe should not run key evidence gate",
  );
  assert(
    okJson.liveAuthProbe.firstWriteSafety.envFileMtimeAfterCheckpoint === false,
    "diagnostic should surface stale env-file rotation context",
  );
  assert(
    okJson.safetyNotes.some((note) => note.includes("did not create or refresh proof files")),
    "diagnostic safety notes should name no proof refresh",
  );
  assert(
    okJson.diagnosticOutputFile?.path === envOutputFile &&
      okJson.diagnosticOutputFile?.written === true &&
      okJson.diagnosticOutputFile?.mode === "0600",
    "diagnostic should report owner-only private output metadata when --output-file is used",
  );
  const envOutputFileJson = parseJson(readFileSync(envOutputFile, "utf8"), "env-file diagnostic output file");
  assert(
    envOutputFileJson.diagnosticOutputFile?.path === envOutputFile &&
      envOutputFileJson.diagnosticOutputFile?.written === true,
    "env-file diagnostic output file should preserve output metadata",
  );
  assert(
    (statSync(envOutputFile).mode & 0o777) === 0o600,
    "env-file diagnostic output file should be owner-readable only",
  );
  assertNoSecret({ stdout: readFileSync(envOutputFile, "utf8"), stderr: "" }, "env-file diagnostic output file");
  assertNoPrivateOutput({ stdout: readFileSync(envOutputFile, "utf8"), stderr: "" }, "env-file diagnostic output file");
  assertNoSecret(ok, "successful diagnostic");
  assertNoPrivateOutput(ok, "successful diagnostic");

  assert(requests.length === 1, "diagnostic should make exactly one live-read probe request");
  const requestUrl = new URL(requests[0].url, baseUrl);
  assert(requestUrl.pathname === "/api/v1/cards", "diagnostic should request /cards");
  assert(
    requestUrl.searchParams.get("date_from") === "2100-01-01T00:00:00.000Z",
    "diagnostic should use future date_from",
  );
  assert(
    requestUrl.searchParams.get("date_to") === "2100-01-02T00:00:00.000Z",
    "diagnostic should use future date_to",
  );
  assert(requests[0].authorization === "Bearer sk_test_live_diagnostic_secret_12345", "diagnostic should send bearer auth");

  const missingEphemeral = await runDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    confirm: true,
    probeNoEnvFile: true,
    probeApiKeyEnv: "RECALL_EPHEMERAL_API_KEY",
  });
  assert(
    missingEphemeral.status === 2,
    "ephemeral diagnostic should refuse before probing when the named process env key is missing",
  );
  assert(
    missingEphemeral.stderr.includes("missing_ephemeral_probe_api_key"),
    "missing ephemeral diagnostic should name the missing process env key",
  );
  assertNoSecret(missingEphemeral, "missing ephemeral diagnostic");
  assertNoPrivateOutput(missingEphemeral, "missing ephemeral diagnostic");
  assert(requests.length === 1, "missing ephemeral diagnostic should not add a live-read probe request");

  const ephemeral = await runDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    confirm: true,
    probeNoEnvFile: true,
    probeApiKeyEnv: "RECALL_EPHEMERAL_API_KEY",
    extraEnv: {
      RECALL_EPHEMERAL_API_KEY: "sk_test_ephemeral_live_diagnostic_secret_67890",
    },
  });
  assert(
    ephemeral.status === 0,
    `ephemeral diagnostic should pass against the local read-only probe; status=${ephemeral.status}; stdout=${ephemeral.stdout}; stderr=${ephemeral.stderr}`,
  );
  const ephemeralJson = parseJson(ephemeral.stdout, "ephemeral diagnostic stdout");
  assert(ephemeralJson.ok === true, "ephemeral diagnostic JSON should report ok=true");
  assert(
    ephemeralJson.statusBeforeProbe.status === "blocked_key_rotation_evidence",
    "ephemeral diagnostic should preserve blocked first-write status",
  );
  assert(
    ephemeralJson.probeCredential.envFileMode === "disabled_for_probe",
    "ephemeral diagnostic should disable env-file loading for the probe",
  );
  assert(
    ephemeralJson.probeCredential.apiKeyEnv === "RECALL_EPHEMERAL_API_KEY",
    "ephemeral diagnostic should report the key env name only",
  );
  assert(
    ephemeralJson.liveAuthProbe.envFile.loaded === false,
    "ephemeral diagnostic lower-level probe should not load an env file",
  );
  assertNoSecret(ephemeral, "ephemeral diagnostic");
  assertNoPrivateOutput(ephemeral, "ephemeral diagnostic");

  assert(requests.length === 2, "ephemeral diagnostic should add exactly one live-read probe request");
  const ephemeralRequestUrl = new URL(requests[1].url, baseUrl);
  assert(ephemeralRequestUrl.pathname === "/api/v1/cards", "ephemeral diagnostic should request /cards");
  assert(
    requests[1].authorization === "Bearer sk_test_ephemeral_live_diagnostic_secret_67890",
    "ephemeral diagnostic should send bearer auth from the ephemeral process env",
  );

  const statusHelperFailedButProbed = await runDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    confirm: true,
    probeNoEnvFile: true,
    probeApiKeyEnv: "RECALL_EPHEMERAL_API_KEY",
    extraEnv: {
      NODE_OPTIONS: `--require ${statusHelperFailer}`,
      RECALL_EPHEMERAL_API_KEY: "sk_test_status_helper_failed_live_diagnostic_secret_77889",
    },
    extraArgs: ["--output-file", statusFailureOutputFile],
  });
  assert(
    statusHelperFailedButProbed.status === 0,
    `env-file-disabled diagnostic should still probe when the local status helper fails; status=${statusHelperFailedButProbed.status}; stdout=${statusHelperFailedButProbed.stdout}; stderr=${statusHelperFailedButProbed.stderr}`,
  );
  const statusHelperFailedButProbedJson = parseJson(
    statusHelperFailedButProbed.stdout,
    "status-helper-failed diagnostic stdout",
  );
  assert(statusHelperFailedButProbedJson.ok === true, "status-helper-failed diagnostic should report ok=true");
  assert(
    statusHelperFailedButProbedJson.statusHelper?.failureBypassedForReadOnlyProbe === true &&
      statusHelperFailedButProbedJson.statusHelper?.failureCode === "injected_status_helper_failure",
    "status-helper-failed diagnostic should report that only the read-only probe bypassed the local status failure",
  );
  assert(
    statusHelperFailedButProbedJson.statusBeforeProbe.status === "local_private_gate_status_failed",
    "status-helper-failed diagnostic should preserve a blocked fallback status",
  );
  assert(
    statusHelperFailedButProbedJson.localPrivateGateHandling.statusHelperSucceeded === false &&
      statusHelperFailedButProbedJson.localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe === true,
    "status-helper-failed diagnostic should mark local status failure bypass for read-only probing only",
  );
  assert(
    statusHelperFailedButProbedJson.firstWriteSafety.blockedBeforeProofRefreshOrApply === true &&
      statusHelperFailedButProbedJson.firstWriteSafety.proofRefreshAllowedNow === false &&
      statusHelperFailedButProbedJson.firstWriteSafety.applyAllowedNow === false,
    "status-helper-failed diagnostic should keep first-write paths blocked",
  );
  const statusFailureOutputFileJson = parseJson(
    readFileSync(statusFailureOutputFile, "utf8"),
    "status-helper-failed diagnostic output file",
  );
  assert(
    statusFailureOutputFileJson.statusBeforeProbe.status === "local_private_gate_status_failed",
    "status-helper-failed diagnostic output file should preserve the fallback status",
  );
  const statusFailureReportCheck = runReportCheck(statusFailureOutputFile);
  assert(
    statusFailureReportCheck.status === 0,
    `status-helper-failed diagnostic output file should pass the private report checker; status=${statusFailureReportCheck.status}; stdout=${statusFailureReportCheck.stdout}; stderr=${statusFailureReportCheck.stderr}`,
  );
  assertNoSecret({ stdout: readFileSync(statusFailureOutputFile, "utf8"), stderr: "" }, "status-helper-failed output file");
  assertNoPrivateOutput(
    { stdout: readFileSync(statusFailureOutputFile, "utf8"), stderr: "" },
    "status-helper-failed output file",
  );
  assertNoSecret(statusHelperFailedButProbed, "status-helper-failed diagnostic");
  assertNoPrivateOutput(statusHelperFailedButProbed, "status-helper-failed diagnostic");

  assert(requests.length === 3, "status-helper-failed diagnostic should add exactly one live-read probe request");
  const statusHelperFailedRequestUrl = new URL(requests[2].url, baseUrl);
  assert(statusHelperFailedRequestUrl.pathname === "/api/v1/cards", "status-helper-failed diagnostic should request /cards");
  assert(
    requests[2].authorization === "Bearer sk_test_status_helper_failed_live_diagnostic_secret_77889",
    "status-helper-failed diagnostic should send bearer auth from the ephemeral process env",
  );

  const rejectedPromptProbeArg = await runPromptDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    key: "sk_test_prompt_rejected_controlled_arg_secret_11223",
    confirm: true,
    extraArgs: ["--probe-api-key-env=RECALL_API_KEY"],
  });
  assert(
    rejectedPromptProbeArg.status === 2,
    "prompt diagnostic should reject caller-supplied probe credential flags before probing",
  );
  assert(
    rejectedPromptProbeArg.stderr.includes("controlled_probe_argument"),
    "prompt diagnostic should name controlled probe arguments",
  );
  assertNoSecret(rejectedPromptProbeArg, "rejected prompt probe argument diagnostic");
  assertNoPrivateOutput(rejectedPromptProbeArg, "rejected prompt probe argument diagnostic");
  assert(requests.length === 3, "rejected prompt probe argument diagnostic should not add a live-read probe request");

  const rejectedPromptOutputFile = await runPromptDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    key: "sk_test_prompt_rejected_output_file_secret_44556",
    confirm: true,
    extraArgs: ["--output-file", join(scratch, "unsafe-live-diagnostic-output.json")],
  });
  assert(
    rejectedPromptOutputFile.status === 2,
    "prompt diagnostic should reject output files outside the private Recall evidence path before probing",
  );
  assert(
    rejectedPromptOutputFile.stderr.includes("output_file_not_private"),
    "unsafe prompt output file rejection should name output_file_not_private",
  );
  assertNoSecret(rejectedPromptOutputFile, "rejected prompt output file diagnostic");
  assertNoPrivateOutput(rejectedPromptOutputFile, "rejected prompt output file diagnostic");
  assert(requests.length === 3, "rejected prompt output file diagnostic should not add a live-read probe request");

  const prompted = await runPromptDiagnostic({
    envFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    key: "sk_test_prompt_live_diagnostic_secret_24680",
    confirm: true,
    extraArgs: ["--output-file", promptOutputFile],
  });
  assert(
    prompted.status === 0,
    `prompt diagnostic should pass against the local read-only probe; status=${prompted.status}; stdout=${prompted.stdout}; stderr=${prompted.stderr}`,
  );
  const promptedJson = parseJson(prompted.stdout, "prompt diagnostic stdout");
  assert(promptedJson.ok === true, "prompt diagnostic JSON should report ok=true");
  assert(
    promptedJson.statusBeforeProbe.status === "blocked_key_rotation_evidence",
    "prompt diagnostic should preserve blocked first-write status",
  );
  assert(
    promptedJson.probeCredential.envFileMode === "disabled_for_probe",
    "prompt diagnostic should disable env-file loading for the probe",
  );
  assert(
    promptedJson.probeCredential.apiKeyEnv === "RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY",
    "prompt diagnostic should report the internal prompt key env name only",
  );
  assert(
    promptedJson.liveAuthProbe.envFile.loaded === false,
    "prompt diagnostic lower-level probe should not load an env file",
  );
  assert(
    promptedJson.localPrivateGateHandling.envFileDisabledProbeRequested === true,
    "prompt diagnostic should report env-file-disabled probing",
  );
  assert(
    promptedJson.promptWrapper?.preKeyGuarded === true &&
      promptedJson.promptWrapper?.keyEntryMode === "stdin" &&
      promptedJson.promptWrapper?.credentialMode === "local_prompt_env_file_disabled",
    "prompt diagnostic output should include prompt-wrapper pre-key guard metadata",
  );
  assert(
    promptedJson.promptWrapper?.childApiKeyEnv === "RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY" &&
      promptedJson.promptWrapper?.envFileDisabledForProbe === true &&
      promptedJson.promptWrapper?.controlledProbeArgsRejectedBeforeKeyEntry === true,
    "prompt diagnostic output should prove the child key env, env-file-disabled probe, and controlled-arg guard",
  );
  assert(
    promptedJson.promptWrapper?.preflight?.controlledArgCases >= 8 &&
      promptedJson.promptWrapper?.preflight?.allowedArgCases >= 6,
    "prompt diagnostic output should include prompt guard preflight counts",
  );
  const promptOutputFileJson = parseJson(readFileSync(promptOutputFile, "utf8"), "prompt diagnostic output file");
  assert(promptOutputFileJson.promptWrapper?.preKeyGuarded === true, "prompt output file should keep guard proof");
  assert(
    promptOutputFileJson.probeCredential?.envFileMode === "disabled_for_probe",
    "prompt output file should preserve env-file-disabled probe metadata",
  );
  assert(
    (statSync(promptOutputFile).mode & 0o777) === 0o600,
    "prompt output file should be owner-readable only",
  );
  assertNoSecret({ stdout: readFileSync(promptOutputFile, "utf8"), stderr: "" }, "prompt diagnostic output file");
  assertNoPrivateOutput({ stdout: readFileSync(promptOutputFile, "utf8"), stderr: "" }, "prompt diagnostic output file");
  assertNoSecret(prompted, "prompt diagnostic");
  assertNoPrivateOutput(prompted, "prompt diagnostic");

  assert(requests.length === 4, "prompt diagnostic should add exactly one live-read probe request");
  const promptedRequestUrl = new URL(requests[3].url, baseUrl);
  assert(promptedRequestUrl.pathname === "/api/v1/cards", "prompt diagnostic should request /cards");
  assert(
    requests[3].authorization === "Bearer sk_test_prompt_live_diagnostic_secret_24680",
    "prompt diagnostic should send bearer auth from the prompted key",
  );

  const promptedMissingEnv = await runPromptDiagnostic({
    envFile: missingEnvFile,
    manifest,
    enumeration,
    fidelity,
    dryRunReport,
    backup,
    key: "sk_test_prompt_missing_env_live_diagnostic_secret_13579",
    confirm: true,
  });
  assert(
    promptedMissingEnv.status === 0,
    `prompt diagnostic should still probe with a missing env file when env-file loading is disabled; status=${promptedMissingEnv.status}; stdout=${promptedMissingEnv.stdout}; stderr=${promptedMissingEnv.stderr}`,
  );
  const promptedMissingEnvJson = parseJson(promptedMissingEnv.stdout, "prompt missing-env diagnostic stdout");
  assert(promptedMissingEnvJson.ok === true, "prompt missing-env diagnostic JSON should report ok=true");
  assert(
    promptedMissingEnvJson.statusBeforeProbe.status === "blocked_key_rotation_evidence",
    "prompt missing-env diagnostic should preserve blocked first-write status",
  );
  assert(
    promptedMissingEnvJson.localPrivateGateHandling.statusOptionalNoWriteCommandAvailable === false,
    "prompt missing-env diagnostic should surface that status did not expose a local-env optional command",
  );
  assert(
    promptedMissingEnvJson.localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe === true,
    "prompt missing-env diagnostic should bypass the local live gate only for the read-only env-file-disabled probe",
  );
  assert(
    promptedMissingEnvJson.probeCredential.envFileMode === "disabled_for_probe",
    "prompt missing-env diagnostic should keep env-file loading disabled",
  );
  assert(
    promptedMissingEnvJson.liveAuthProbe.envFile.loaded === false,
    "prompt missing-env diagnostic lower-level probe should not load an env file",
  );
  assert(
    promptedMissingEnvJson.promptWrapper?.preKeyGuarded === true &&
      promptedMissingEnvJson.promptWrapper?.envFileDisabledForProbe === true,
    "prompt missing-env diagnostic output should carry prompt-wrapper guard proof",
  );
  assertNoSecret(promptedMissingEnv, "prompt missing-env diagnostic");
  assertNoPrivateOutput(promptedMissingEnv, "prompt missing-env diagnostic");

  assert(requests.length === 5, "prompt missing-env diagnostic should add exactly one live-read probe request");
  const promptedMissingEnvRequestUrl = new URL(requests[4].url, baseUrl);
  assert(promptedMissingEnvRequestUrl.pathname === "/api/v1/cards", "prompt missing-env diagnostic should request /cards");
  assert(
    requests[4].authorization === "Bearer sk_test_prompt_missing_env_live_diagnostic_secret_13579",
    "prompt missing-env diagnostic should send bearer auth from the prompted key",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "first-apply live diagnostic refuses without explicit live confirmation",
          "first-apply live diagnostic preserves blocked_key_rotation_evidence status",
          "first-apply live diagnostic makes exactly one read-only /cards request",
          "first-apply live diagnostic rejects non-private output files before probing",
          "first-apply live diagnostic can write owner-only sanitized private output",
          "first-apply live diagnostic refuses env-file-disabled probing when the named ephemeral process env key is missing",
          "first-apply live diagnostic can force the probe to ignore env files and use a named ephemeral process env key",
          "first-apply live diagnostic prompt wrapper rejects caller-supplied probe credential flags before prompting",
          "first-apply live diagnostic prompt wrapper runs an internal no-live preflight before reading a key",
          "first-apply live diagnostic prompt wrapper output includes prompt-wrapper guard proof",
          "first-apply live diagnostic prompt wrapper rejects non-private output files before reading a key",
          "first-apply live diagnostic prompt wrapper can write owner-only sanitized private output",
          "first-apply live diagnostic prompt wrapper reads a key from stdin for the read-only probe without env-file loading",
          "first-apply live diagnostic prompt wrapper still probes when the local env file is missing and env-file loading is disabled",
          "first-apply live diagnostic still probes when the local status helper fails but env-file loading is disabled and an ephemeral credential is present",
          "first-apply live diagnostic report checker accepts the status-helper-failed fallback as diagnostic-only evidence",
          "first-apply live diagnostic reports only status/count metadata",
          "first-apply live diagnostic does not unlock proof refresh or apply",
          "first-apply live diagnostic output does not print env contents, keys, private card values, or raw response bodies",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(privateSmokeDir, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}

function runDiagnostic({
  envFile,
  manifest,
  enumeration,
  fidelity,
  dryRunReport,
  backup,
  confirm,
  probeNoEnvFile = false,
  probeApiKeyEnv = null,
  extraEnv = {},
  extraArgs = [],
}) {
  const env = { ...process.env, ...extraEnv };
  delete env.RECALL_API_KEY;
  delete env.BRAIN_RECALL_CONFIRM_LIVE_API;
  if (probeApiKeyEnv && !Object.prototype.hasOwnProperty.call(extraEnv, probeApiKeyEnv)) {
    delete env[probeApiKeyEnv];
  }
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
      "--",
      resolve("scripts/run-recall-first-apply-live-diagnostic.mjs"),
      ...(confirm ? ["--confirm-live-api"] : []),
      ...(probeNoEnvFile ? ["--probe-no-env-file"] : []),
      ...(probeApiKeyEnv ? ["--probe-api-key-env", probeApiKeyEnv] : []),
      ...extraArgs,
      "--base-url",
      baseUrl,
      "--env-file",
      envFile,
      "--manifest",
      manifest,
      "--enumeration",
      enumeration,
      "--fidelity",
      fidelity,
      "--dry-run-report",
      dryRunReport,
      "--backup-path",
      backup,
      "--skip-private-ignore",
      "--skip-approval-packet",
      "--skip-public-docs-privacy",
      "--allow-non-private-dry-run-report",
      "--allow-non-private-backup",
      ],
      {
        cwd: process.cwd(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolveResult({ status, stdout, stderr });
    });
  });
}

function runPromptDiagnostic({ envFile, manifest, enumeration, fidelity, dryRunReport, backup, key, confirm, extraArgs = [] }) {
  const env = { ...process.env };
  delete env.RECALL_API_KEY;
  delete env.RECALL_EPHEMERAL_API_KEY;
  delete env.RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY;
  delete env.BRAIN_RECALL_CONFIRM_LIVE_API;
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
      "--",
      resolve("scripts/run-recall-first-apply-live-diagnostic-prompt.mjs"),
      "--read-key-from-stdin",
      ...(confirm ? ["--confirm-live-api"] : []),
      ...extraArgs,
      "--base-url",
      baseUrl,
      "--env-file",
      envFile,
      "--manifest",
      manifest,
      "--enumeration",
      enumeration,
      "--fidelity",
      fidelity,
      "--dry-run-report",
      dryRunReport,
      "--backup-path",
      backup,
      "--skip-private-ignore",
      "--skip-approval-packet",
      "--skip-public-docs-privacy",
      "--allow-non-private-dry-run-report",
      "--allow-non-private-backup",
      ],
      {
        cwd: process.cwd(),
        env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolveResult({ status, stdout, stderr });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(`${key}\n`);
  });
}

function runReportCheck(reportPath) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-live-diagnostic-report.mjs"),
      "--report",
      reportPath,
      "--skip-ignore-check",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function writePrivateEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=sk_test_live_diagnostic_secret_12345\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function writeStatusHelperFailer(path) {
  writeFileSync(
    path,
    `if (process.argv.some((arg) => String(arg).endsWith("check-recall-first-apply-status.mjs"))) {
  console.error(JSON.stringify({
    ok: false,
    code: "injected_status_helper_failure",
    message: "Injected local status-helper failure before read-only probe."
  }));
  process.exit(9);
}
`,
    "utf8",
  );
}

function writeSqliteBackup(path) {
  const db = new Database(path);
  try {
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO proof (label) VALUES ('ok');");
  } finally {
    db.close();
  }
}

function writeManifest(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        dateWindow: { dateFrom: "2026-06-24T00:00:00Z", dateTo: "2026-06-24T23:59:59Z" },
        samples: requiredLabels().map((label, index) => ({
          label,
          contentType: label === "sample-no-url" ? "no_url" : label.replace("sample-", ""),
          cardId: `card-first-apply-live-diagnostic-${index + 1}`,
          expectedTitle: `First apply live diagnostic ${label}`,
          createdAt: "2026-06-24T12:00:00Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-live-diagnostic/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-live-diagnostic-outside-window",
          createdAt: "2026-06-23T12:00:00Z",
          expectedTitle: "First apply live diagnostic outside window",
        },
      },
      null,
      2,
    ),
    { encoding: "utf8", mode: 0o600 },
  );
  chmodSync(path, 0o600);
}

function writeReport(path, spikeId, verdict, evidence) {
  writeFileSync(
    path,
    `# ${spikeId} - First apply live diagnostic smoke report

| Field | Value |
|---|---|
| **Spike ID** | ${spikeId} |
| **Date** | 2026-06-24 00:00 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Smoke |
| **Triggered by** | Smoke |
| **Blocks** | Smoke |
| **Verdict** | ${verdict} |

## Evidence

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`
`,
    "utf8",
  );
}

function enumerationEvidence() {
  return {
    mode: "recall_rest_enumeration_probe",
    filteredFirst: { resultCount: 6, totalCount: 6 },
    filteredSecond: { resultCount: 6, totalCount: 6 },
    repeatedFilteredStable: true,
    expectedControls: {
      manifest: manifestSummary(),
      positiveIds: requiredLabels().map((label) => ({ id: `<redacted:${label}>`, present: true })),
      negativeIds: [{ id: "<redacted:outside-window>", absent: true }],
      positiveTitles: [],
    },
  };
}

function fidelityEvidence() {
  return {
    mode: "recall_content_fidelity_probe",
    cardCount: 6,
    expectedControls: manifestSummary(),
    cards: requiredLabels().map((label, index) => ({
      id: `<redacted:${label}>`,
      sampleLabel: label,
      contentFidelity: index === 5 ? "api_chunks_unverified" : "complete_enough_for_daily_import",
      maxChunksHit: false,
      policy: {
        shouldImport: index !== 5,
        shouldIndexForRetrieval: index !== 5,
      },
    })),
  };
}

function dryRunEvidence() {
  return {
    mode: "dry_run",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    dateFrom: "2026-06-24T00:00:00.000Z",
    dateTo: "2026-06-24T23:59:59.000Z",
    cardsSeen: 1,
    cardsAvailable: 1,
    enumerationComplete: true,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 1,
    totalCharsPlanned: 1200,
    totalChunksFetched: 1,
    fidelityCounts: { api_chunks_unverified: 1 },
    policyBlockCounts: {},
    policyBlockReasons: [],
    plannedActionCounts: { imported: 1 },
    checkpointAdvanced: false,
    lockAcquired: true,
    staleLockRecovered: false,
  };
}

function manifestSummary() {
  return {
    ok: true,
    sampleCount: 6,
    requiredLabels: requiredLabels().map((label) => ({ label, present: true })),
    negativeControlPresent: true,
    publicPrivacy: {
      allowTitleInPublicReportCount: 0,
      allowSourceUrlInPublicReportCount: 0,
    },
  };
}

function requiredLabels() {
  return ["sample-note", "sample-article", "sample-youtube", "sample-pdf", "sample-no-url", "sample-long"];
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertNoSecret(result, label) {
  const output = `${result.stdout}\n${result.stderr}`;
  assert(!output.includes("RECALL_API_KEY="), `${label} printed env contents`);
  assert(!/sk_test_live_diagnostic_secret/i.test(output), `${label} leaked test key`);
  assert(!/sk_test_[A-Za-z0-9_]+/i.test(output), `${label} leaked a test key`);
  assert(!/Bearer sk_/i.test(output), `${label} leaked bearer key`);
}

function assertNoPrivateOutput(result, label) {
  const output = `${result.stdout}\n${result.stderr}`;
  assert(!/private-live-diagnostic-card-id/i.test(output), `${label} leaked private card id`);
  assert(!/Private live diagnostic title/i.test(output), `${label} leaked private title`);
  assert(!/private-live-diagnostic\?token=secret123/i.test(output), `${label} leaked private source details`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
