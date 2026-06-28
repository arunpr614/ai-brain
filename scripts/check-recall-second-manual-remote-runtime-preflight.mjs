#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const commandBuilder = args.remoteBuildCommandEnv
  ? skippedCommandBuilder("remote_build_command_env")
  : runLocalNode(commandBuilderArgs(args));
const commandBuilderJson = parseMaybeJson(commandBuilder.stdout || commandBuilder.stderr);
const findings = [];

if (
  !args.remoteBuildCommandEnv &&
  (commandBuilder.status !== 0 || commandBuilderJson?.ok !== true || !commandBuilderJson.commandEnv)
) {
  findings.push({
    id: "command_builder",
    message: "Second-manual command builder did not produce a ready commandEnv.",
    exitCode: commandBuilder.status,
  });
}

let remote = null;
let remoteJson = null;
if (findings.length === 0) {
  const payload = Buffer.from(
    JSON.stringify({
      commandEnv: commandBuilderJson.commandEnv,
      selectedReports: commandBuilderJson.selectedReports ?? null,
      remoteBuildCommandEnv: args.remoteBuildCommandEnv,
      acceptedFidelityRisk: args.acceptedFidelityRisk ?? DEFAULT_ACCEPTED_FIDELITY_RISK,
      maxImports: args.maxImports ?? 5,
      skipRemoteSystemChecks: args.skipRemoteSystemChecks,
    }),
    "utf8",
  ).toString("base64");
  const remoteCommand = `cd ${shellQuote(args.remoteDir)} && node --input-type=module - ${shellQuote(payload)}`;
  remote = spawnSync(args.sshCommand, [args.host, remoteCommand], {
    input: remoteNodeScript(),
    encoding: "utf8",
  });
  remoteJson = parseMaybeJson(remote.stdout || remote.stderr);
  if (remote.status !== 0 || remoteJson?.ok !== true) {
    findings.push({
      id: "remote_runtime_preflight",
      message: "Remote second-manual runtime preflight failed.",
      exitCode: remote.status,
      remoteStatus: remoteJson?.status ?? null,
    });
  }
}

const ok = findings.length === 0;
const output = {
  ok,
  status: ok ? "ready_for_second_manual_remote_runtime_preflight" : "blocked_second_manual_remote_runtime_preflight",
  noLiveNoWrite: true,
  host: args.host,
  remoteDir: args.remoteDir,
  selectedReports: commandBuilderJson?.selectedReports ?? null,
  runtimeManifestPath: commandBuilderJson?.runtimeManifestPath ?? null,
  commandEnvSource: args.remoteBuildCommandEnv ? "remote_deployed_latest_spike_pair" : "local_command_builder",
  commandBuilder: summarizeCommandBuilder(commandBuilder, commandBuilderJson),
  remote: summarizeRemote(remote, remoteJson),
  findings,
  safetyNote:
    "This remote preflight is no-live and no-write. It uses SSH only to validate production runtime files and guarded env inputs before any approved manual apply.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[check-recall-second-manual-remote-runtime-preflight] failed");
  console.error(text);
  process.exit(1);
}

process.stdout.write(text);

function runLocalNode(commandArgs) {
  return spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function commandBuilderArgs(options) {
  return [
    "scripts/print-recall-second-manual-verification-command.mjs",
    "--json",
    ...(options.spikeDir ? ["--spike-dir", options.spikeDir] : []),
    ...(options.manifestPath ? ["--manifest", options.manifestPath] : []),
    ...(options.enumerationPath ? ["--enumeration", options.enumerationPath] : []),
    ...(options.fidelityPath ? ["--fidelity", options.fidelityPath] : []),
    ...(options.acceptedFidelityRisk ? ["--accepted-fidelity-risk", options.acceptedFidelityRisk] : []),
    ...(options.maxImports ? ["--max-imports", String(options.maxImports)] : []),
    ...(options.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
    ...(options.includeRuntimeManifest ? ["--include-runtime-manifest"] : []),
    ...(options.skipReadiness ? ["--skip-readiness"] : []),
    ...(options.skipLiveSpikeGate ? ["--skip-live-spike-gate"] : []),
  ];
}

function skippedCommandBuilder(status) {
  return {
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      skipped: true,
      status,
      noLiveNoWrite: true,
      readiness: { skipped: true },
      liveSpikeGate: { verdict: "skipped" },
    }),
    stderr: "",
  };
}

function summarizeCommandBuilder(result, parsed) {
  return {
    ok: result.status === 0 && parsed?.ok === true,
    skipped: parsed?.skipped === true,
    status: parsed?.status ?? null,
    exitCode: result.status,
    readinessStatus: parsed?.readiness?.status ?? (parsed?.readiness?.skipped ? "skipped" : null),
    liveSpikeVerdict: parsed?.liveSpikeGate?.verdict ?? null,
    noLiveNoWrite: parsed?.noLiveNoWrite ?? null,
  };
}

function summarizeRemote(result, parsed) {
  if (!result) return null;
  return {
    ok: result.status === 0 && parsed?.ok === true,
    exitCode: result.status,
    status: parsed?.status ?? null,
    host: parsed?.host ?? null,
    timer: parsed?.timer ?? null,
    envFlags: parsed?.envFlags ?? null,
    runtimePreflight: parsed?.runtimePreflight
      ? {
          ok: parsed.runtimePreflight.ok,
          exitCode: parsed.runtimePreflight.exitCode,
          status: parsed.runtimePreflight.parsed?.status ?? null,
          liveApplyDelegationAllowed: parsed.runtimePreflight.parsed?.liveApplyDelegationAllowed ?? null,
          findings: parsed.runtimePreflight.parsed?.findings ?? [],
      }
      : null,
    proofReports: summarizeProofReports(parsed?.runtimePreflight?.parsed),
    deployedLatestReports: parsed?.deployedLatestReports ?? null,
    remoteBuildCommandEnv: parsed?.remoteBuildCommandEnv ?? null,
  };
}

function summarizeProofReports(runtimePreflightJson) {
  const checked = Array.isArray(runtimePreflightJson?.checked) ? runtimePreflightJson.checked : [];
  return {
    enumeration: checkedFile(checked, "brain_recall_live_spike_enumeration_report_path"),
    fidelity: checkedFile(checked, "brain_recall_live_spike_fidelity_report_path"),
    manifest: checkedFile(checked, "brain_recall_live_spike_manifest_path"),
  };
}

function checkedFile(checked, id) {
  const entry = checked.find((item) => item?.id === id);
  if (!entry) return null;
  return {
    ok: entry.ok === true,
    path: entry.path ?? null,
  };
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv) {
  const parsed = {
    host: DEFAULT_HOST,
    remoteDir: DEFAULT_REMOTE_DIR,
    sshCommand: process.env.BRAIN_RECALL_REMOTE_PREFLIGHT_SSH_COMMAND || "ssh",
    spikeDir: null,
    manifestPath: null,
    enumerationPath: null,
    fidelityPath: null,
    acceptedFidelityRisk: null,
    maxImports: null,
    allowUnsafeManifestForSmoke: false,
    includeRuntimeManifest: false,
    skipReadiness: false,
    skipLiveSpikeGate: false,
    skipRemoteSystemChecks: false,
    remoteBuildCommandEnv: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--remote-dir" && next) {
      parsed.remoteDir = next;
      i += 1;
    } else if (arg === "--ssh-command" && next) {
      parsed.sshCommand = next;
      i += 1;
    } else if (arg === "--spike-dir" && next) {
      parsed.spikeDir = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--max-imports" && next) {
      parsed.maxImports = Number(next);
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") {
      parsed.allowUnsafeManifestForSmoke = true;
    } else if (arg === "--include-runtime-manifest") {
      parsed.includeRuntimeManifest = true;
    } else if (arg === "--skip-readiness") {
      parsed.skipReadiness = true;
    } else if (arg === "--skip-live-spike-gate") {
      parsed.skipLiveSpikeGate = true;
    } else if (arg === "--skip-remote-system-checks") {
      parsed.skipRemoteSystemChecks = true;
    } else if (arg === "--remote-build-command-env") {
      parsed.remoteBuildCommandEnv = true;
    } else if (arg === "--local-build-command-env") {
      parsed.remoteBuildCommandEnv = false;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (Boolean(parsed.enumerationPath) !== Boolean(parsed.fidelityPath)) {
    throw new Error("Pass both --enumeration and --fidelity, or neither.");
  }
  if (parsed.maxImports !== null && (!Number.isInteger(parsed.maxImports) || parsed.maxImports < 1)) {
    throw new Error("--max-imports must be a positive integer.");
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall second manual remote runtime preflight

Usage:
  npm run recall:second-manual:remote-runtime-preflight
  npm run recall:second-manual:remote-runtime-preflight -- --host brain --remote-dir /opt/brain

This command is no-live and no-write. It builds the current guarded
second-manual command env from the deployed remote SPIKE proof pair by default,
then uses SSH to validate the production runtime preflight from the remote
project root. Pass --local-build-command-env only for debugging local proof
selection.
`);
}

function remoteNodeScript() {
  return String.raw`
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const APPROVAL = ${JSON.stringify(APPROVAL)};
const DEFAULT_ACCEPTED_FIDELITY_RISK = ${JSON.stringify(DEFAULT_ACCEPTED_FIDELITY_RISK)};
const payload = JSON.parse(Buffer.from(process.argv[2], "base64").toString("utf8"));
const remoteBuild = payload.remoteBuildCommandEnv === true ? buildRemoteCommandEnv(payload) : null;
const commandEnv = remoteBuild?.commandEnv ?? payload.commandEnv ?? {};
const selectedReports = remoteBuild?.selectedReports ?? payload.selectedReports ?? null;
const skipRemoteSystemChecks = payload.skipRemoteSystemChecks === true;

const host = run("hostname", []);
const timer = skipRemoteSystemChecks
  ? { skipped: true }
  : {
      enabled: run("systemctl", ["is-enabled", "--quiet", "brain-recall-sync.timer"]).status === 0,
      active: run("systemctl", ["is-active", "--quiet", "brain-recall-sync.timer"]).status === 0,
    };

const envFlags = skipRemoteSystemChecks
  ? { skipped: true }
  : checkEnvFlags();

const runtimePreflightRaw = spawnSync(process.execPath, ["--", "scripts/check-recall-second-manual-runtime-preflight.mjs"], {
  env: { ...process.env, ...commandEnv },
  encoding: "utf8",
});
const runtimePreflight = {
  ok: runtimePreflightRaw.status === 0,
  exitCode: runtimePreflightRaw.status,
  parsed: parseMaybeJson(runtimePreflightRaw.stdout || runtimePreflightRaw.stderr),
};
const deployedLatestReports = remoteBuild?.deployedLatestReports ?? findLatestDeployedReports(selectedReports, commandEnv);

const timerOk = timer.skipped === true || (timer.enabled === false && timer.active === false);
const envFlagsOk = envFlags.skipped === true || envFlags.ok === true;
const remoteBuildOk = remoteBuild?.ok ?? true;
const ok = remoteBuildOk && timerOk && envFlagsOk && runtimePreflight.ok && runtimePreflight.parsed?.ok === true;

console.log(
  JSON.stringify(
    {
      ok,
      status: ok ? "ready_for_second_manual_remote_runtime_preflight" : "blocked_second_manual_remote_runtime_preflight",
      noLiveNoWrite: true,
      host: host.stdout.trim(),
      timer,
      envFlags,
      runtimePreflight,
      deployedLatestReports,
      remoteBuildCommandEnv: remoteBuild
        ? {
            ok: remoteBuild.ok,
            status: remoteBuild.status,
            selectedBy: remoteBuild.selectedReports?.selectedBy ?? null,
          }
        : null,
    },
    null,
    2,
  ),
);

process.exit(ok ? 0 : 1);

function checkEnvFlags() {
  const script = [
    "set -euo pipefail",
    "if [[ ! -f /etc/brain/.env ]]; then",
    "  echo '{\"ok\":false,\"status\":\"missing_remote_env_file\",\"enabledFlags\":[]}'",
    "  exit 1",
    "fi",
    "enabled=()",
    "for key in BRAIN_RECALL_SYNC_ENABLED BRAIN_RECALL_SCHEDULER_ENABLED BRAIN_RECALL_CONFIRM_LIVE_API; do",
    "  if grep -Eq \"^(export[[:space:]]+)?\${key}[[:space:]]*=[[:space:]]*[\\\"']?1[\\\"']?[[:space:]]*$\" /etc/brain/.env; then",
    "    enabled+=(\"\$key\")",
    "  fi",
    "done",
    "if (( \${#enabled[@]} > 0 )); then",
    "  printf '{\"ok\":false,\"status\":\"enabled_flags_present\",\"enabledFlags\":['",
    "  for i in \"\${!enabled[@]}\"; do",
    "    if (( i > 0 )); then printf ','; fi",
    "    printf '\"%s\"' \"\${enabled[$i]}\"",
    "  done",
    "  printf ']}\\n'",
    "  exit 1",
    "fi",
    "echo '{\"ok\":true,\"status\":\"recall_remote_enable_flags_disabled\",\"enabledFlags\":[]}'",
  ].join("\n");
  const result = run("sudo", ["bash", "-lc", script]);
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(result.stdout || result.stderr),
  };
}

function buildRemoteCommandEnv(payload) {
  const latest = findLatestDeployedReports(null, {});
  if (latest.ok !== true) {
    return {
      ok: false,
      status: "remote_spike_pair_unavailable",
      commandEnv: {},
      selectedReports: null,
      deployedLatestReports: latest,
    };
  }
  const selectedReports = {
    enumerationPath: latest.enumerationPath,
    fidelityPath: latest.fidelityPath,
    timestamp: latest.timestamp,
    selectedBy: "remote_latest_deployed_pair",
  };
  return {
    ok: true,
    status: "remote_command_env_built_from_deployed_latest_spike_pair",
    selectedReports,
    deployedLatestReports: {
      ...latest,
      selectedTimestamp: latest.timestamp,
      selectedMatchesRemoteLatest: true,
      selectedBy: selectedReports.selectedBy,
    },
    commandEnv: {
      BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_CONFIRM_LIVE_API: "1",
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: latest.enumerationPath,
      BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: latest.fidelityPath,
      BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES: "1",
      BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK: payload.acceptedFidelityRisk || DEFAULT_ACCEPTED_FIDELITY_RISK,
      BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
      BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT: "1",
      BRAIN_RECALL_WARNING_UI_AVAILABLE: "1",
      BRAIN_RECALL_MAX_IMPORTS: String(payload.maxImports || 5),
    },
  };
}

function findLatestDeployedReports(selectedReports, commandEnv) {
  const spikeDir = "docs/plans/spikes";
  const selectedTimestamp = selectedTimestampFrom(selectedReports, commandEnv);
  try {
    const files = readdirSync(spikeDir);
    const enumeration = collectByTimestamp(files, /^SPIKE-013-recall-rest-enumeration-(.+)[.]md$/);
    const fidelity = collectByTimestamp(files, /^SPIKE-014-recall-content-fidelity-(.+)[.]md$/);
    const pairedTimestamps = [...enumeration.keys()].filter((timestamp) => fidelity.has(timestamp)).sort().reverse();
    const timestamp = pairedTimestamps[0] ?? null;
    if (!timestamp) {
      return {
        ok: false,
        status: "missing_deployed_spike_pair",
        spikeDir,
        timestamp: null,
        selectedTimestamp,
        selectedMatchesRemoteLatest: false,
      };
    }
    return {
      ok: true,
      status: "deployed_latest_spike_pair_found",
      spikeDir,
      timestamp,
      selectedTimestamp,
      selectedMatchesRemoteLatest: selectedTimestamp === timestamp,
      selectedBy: selectedReports?.selectedBy ?? null,
      enumerationPath: spikeDir + "/" + enumeration.get(timestamp),
      fidelityPath: spikeDir + "/" + fidelity.get(timestamp),
    };
  } catch (error) {
    return {
      ok: false,
      status: "deployed_spike_pair_scan_failed",
      spikeDir,
      timestamp: null,
      selectedTimestamp,
      selectedMatchesRemoteLatest: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function collectByTimestamp(files, pattern) {
  const byTimestamp = new Map();
  for (const file of files) {
    const match = file.match(pattern);
    if (match) byTimestamp.set(match[1], file);
  }
  return byTimestamp;
}

function selectedTimestampFrom(selectedReports, commandEnv) {
  if (selectedReports?.timestamp) return selectedReports.timestamp;
  const selectedEnumeration = selectedReports?.enumerationPath ?? commandEnv.BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH;
  const selectedFidelity = selectedReports?.fidelityPath ?? commandEnv.BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH;
  const enumerationTimestamp = timestampFromPath(selectedEnumeration);
  const fidelityTimestamp = timestampFromPath(selectedFidelity);
  if (enumerationTimestamp && fidelityTimestamp && enumerationTimestamp === fidelityTimestamp) return enumerationTimestamp;
  return enumerationTimestamp ?? fidelityTimestamp ?? null;
}

function timestampFromPath(path) {
  const match = String(path ?? "").match(/SPIKE-0(?:13|14)-recall-(?:rest-enumeration|content-fidelity)-(.+)[.]md$/);
  return match?.[1] ?? null;
}

function run(command, args) {
  return spawnSync(command, args, { encoding: "utf8" });
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}
`;
}
