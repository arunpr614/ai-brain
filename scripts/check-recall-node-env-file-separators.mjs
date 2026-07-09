#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const PACKAGE_ENV_FILE_SCRIPT_PATHS = [
  "scripts/run-recall-live-spikes.mjs",
  "scripts/run-recall-live-auth-probe.mjs",
  "scripts/check-recall-live-gate-status.mjs",
  "scripts/check-recall-key-rotation-evidence.mjs",
  "scripts/record-recall-key-rotation-evidence.mjs",
  "scripts/print-recall-production-key-evidence-repair-command.mjs",
  "scripts/run-recall-production-key-evidence-repair.mjs",
  "scripts/run-recall-production-env-key-install.mjs",
  "scripts/prepare-recall-first-apply-after-rotation.mjs",
  "scripts/check-recall-first-apply-readiness.mjs",
  "scripts/check-recall-first-apply-status.mjs",
  "scripts/run-recall-first-apply-live-diagnostic.mjs",
  "scripts/run-recall-first-apply-live-diagnostic-prompt.mjs",
  "scripts/smoke-recall-live-spikes.mjs",
  "scripts/smoke-recall-live-auth-probe.mjs",
  "scripts/smoke-recall-live-gate-status.mjs",
  "scripts/smoke-recall-key-rotation-evidence.mjs",
  "scripts/smoke-recall-key-rotation-evidence-record.mjs",
  "scripts/smoke-recall-production-key-evidence-repair.mjs",
  "scripts/smoke-recall-production-env-key-install.mjs",
  "scripts/smoke-recall-first-apply-prepare-after-rotation.mjs",
  "scripts/smoke-recall-first-apply-readiness.mjs",
  "scripts/smoke-recall-first-apply-status.mjs",
  "scripts/smoke-recall-first-apply-live-diagnostic.mjs",
];

const SHELL_WRAPPER_EXPECTATIONS = [
  {
    path: "scripts/recall-first-apply-ready-or-refresh.sh",
    required: [
      "node -- scripts/check-recall-key-rotation-evidence.mjs",
      "node -- scripts/check-recall-first-apply-readiness.mjs",
    ],
    forbidden: [
      "node scripts/check-recall-key-rotation-evidence.mjs",
      "node scripts/check-recall-first-apply-readiness.mjs",
    ],
  },
  {
    path: "scripts/recall-first-apply-proof-refresh.sh",
    required: [
      "node -- scripts/check-recall-key-rotation-evidence.mjs",
      "node --import tsx -- scripts/sync-recall.ts",
      "node -- scripts/check-recall-dry-run-report.mjs",
      "node -- scripts/recall-first-apply-preflight.mjs",
      "node -- scripts/check-recall-first-apply-readiness.mjs",
    ],
    forbidden: [
      "node scripts/check-recall-key-rotation-evidence.mjs",
      "node --import tsx scripts/sync-recall.ts",
      "node scripts/check-recall-dry-run-report.mjs",
      "node scripts/recall-first-apply-preflight.mjs",
      "node scripts/check-recall-first-apply-readiness.mjs",
    ],
  },
  {
    path: "scripts/recall-first-capped-apply.sh",
    required: [
      "node -- scripts/check-recall-key-rotation-evidence.mjs",
      "node -- scripts/check-recall-first-apply-readiness.mjs",
      "node --import tsx -- scripts/sync-recall.ts",
      "node -- scripts/check-recall-apply-report.mjs",
    ],
    forbidden: [
      "node scripts/check-recall-key-rotation-evidence.mjs",
      "node scripts/check-recall-first-apply-readiness.mjs",
      "node --import tsx scripts/sync-recall.ts",
      "node scripts/check-recall-apply-report.mjs",
    ],
  },
  {
    path: "scripts/recall-scheduled-apply.sh",
    required: [
      "node -- scripts/check-recall-key-rotation-evidence.mjs",
      "node -- scripts/sync-recall-prod.mjs",
      "node -- scripts/check-recall-dry-run-report.mjs",
      "node -- scripts/recall-first-apply-preflight.mjs",
      "node -- scripts/check-recall-apply-report.mjs",
    ],
    forbidden: [
      "node scripts/check-recall-key-rotation-evidence.mjs",
      "node scripts/sync-recall-prod.mjs",
      "node scripts/check-recall-dry-run-report.mjs",
      "node scripts/recall-first-apply-preflight.mjs",
      "node scripts/check-recall-apply-report.mjs",
    ],
  },
];

const CHILD_SPAWN_EXPECTATIONS = [
  {
    path: "scripts/check-recall-first-apply-readiness.mjs",
    checks: [{ id: "readiness_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.commandArgs\]/s }],
  },
  {
    path: "scripts/check-recall-first-apply-status.mjs",
    checks: [{ id: "status_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.commandArgs\]/s }],
  },
  {
    path: "scripts/run-recall-first-apply-live-diagnostic.mjs",
    checks: [
      { id: "live_diagnostic_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.commandArgs\]/s },
    ],
  },
  {
    path: "scripts/run-recall-first-apply-live-diagnostic-prompt.mjs",
    checks: [
      {
        id: "prompt_child_starts_with_separator",
        pattern: /const childArgs = \[\s*"--",\s*script\("run-recall-first-apply-live-diagnostic\.mjs"\)/s,
      },
    ],
  },
  {
    path: "scripts/prepare-recall-first-apply-after-rotation.mjs",
    checks: [{ id: "prepare_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.commandArgs\]/s }],
  },
  {
    path: "scripts/record-recall-key-rotation-evidence.mjs",
    checks: [
      {
        id: "record_gate_child_uses_separator",
        pattern: /spawnSync\(\s*process\.execPath,\s*\[\s*"--",\s*"scripts\/check-recall-key-rotation-evidence\.mjs"/s,
      },
      { id: "record_probe_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.probeArgs\]/s },
    ],
  },
  {
    path: "scripts/check-recall-live-gate-status.mjs",
    checks: [{ id: "live_gate_child_uses_separator", pattern: /spawnSync\(process\.execPath,\s*\["--",\s*\.\.\.args\]/s }],
  },
  {
    path: "scripts/run-recall-live-spikes.mjs",
    checks: [
      { id: "live_spikes_child_uses_helper", pattern: /spawnSync\(process\.execPath,\s*nodeArgsWithScriptSeparator\(args\)/s },
      { id: "live_spikes_import_separator", pattern: /return \["--import",\s*args\[1\],\s*"--",\s*\.\.\.args\.slice\(2\)\]/s },
      { id: "live_spikes_plain_separator", pattern: /return \["--",\s*\.\.\.args\]/s },
    ],
  },
];

const findings = [];
const checked = [];

checkPackageScripts();
checkShellWrappers();
checkChildSpawns();

if (findings.length > 0) {
  console.error("[check:recall-node-env-file-separators] failed");
  console.error(JSON.stringify({ ok: false, checked, findings }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked,
    },
    null,
    2,
  ),
);

function checkPackageScripts() {
  const packageJson = readJson("package.json");
  if (!packageJson) return;

  let matches = 0;
  for (const [scriptName, command] of Object.entries(packageJson.scripts ?? {})) {
    for (const scriptPath of PACKAGE_ENV_FILE_SCRIPT_PATHS) {
      if (!command.includes(scriptPath)) continue;
      matches += 1;
      if (!commandUsesNodeScriptSeparator(command, scriptPath)) {
        findings.push({
          area: "package_scripts",
          scriptName,
          scriptPath,
          message: "Package script can receive AI Brain --env-file arguments without a Node script separator.",
          expected: `node -- ${scriptPath}`,
        });
      }
    }
  }

  checked.push({
    id: "package env-file scripts use node separator",
    packageScriptsMatched: matches,
  });
}

function checkShellWrappers() {
  let filesChecked = 0;
  for (const expectation of SHELL_WRAPPER_EXPECTATIONS) {
    const content = readText(expectation.path);
    if (!content) continue;
    filesChecked += 1;

    for (const snippet of expectation.required) {
      if (!content.includes(snippet)) {
        findings.push({
          area: "shell_wrappers",
          path: expectation.path,
          message: "Shell wrapper is missing the required Node script separator.",
          expected: snippet,
        });
      }
    }

    for (const snippet of expectation.forbidden) {
      if (content.includes(snippet)) {
        findings.push({
          area: "shell_wrappers",
          path: expectation.path,
          message: "Shell wrapper still contains an unsafe Node invocation.",
          forbidden: snippet,
        });
      }
    }
  }

  checked.push({
    id: "shell wrappers use node separator for env-file gates",
    filesChecked,
  });
}

function checkChildSpawns() {
  let filesChecked = 0;
  let checksRun = 0;
  for (const expectation of CHILD_SPAWN_EXPECTATIONS) {
    const content = readText(expectation.path);
    if (!content) continue;
    filesChecked += 1;

    for (const check of expectation.checks) {
      checksRun += 1;
      if (!check.pattern.test(content)) {
        findings.push({
          area: "child_spawns",
          path: expectation.path,
          check: check.id,
          message: "Child process invocation is missing the expected Node script separator pattern.",
        });
      }
    }
  }

  checked.push({
    id: "child spawns use node separator for env-file gates",
    filesChecked,
    checksRun,
  });
  checked.push({
    id: "tsx commands place separator after node options",
    filesChecked: SHELL_WRAPPER_EXPECTATIONS.length + 1,
  });
}

function commandUsesNodeScriptSeparator(command, scriptPath) {
  const escapedPath = escapeRegExp(scriptPath);
  const plainNodeSeparator = new RegExp(`(^|\\s|[;&|])node\\s+--\\s+${escapedPath}(\\s|$)`);
  const nodeImportSeparator = new RegExp(`(^|\\s|[;&|])node\\s+--import\\s+\\S+\\s+--\\s+${escapedPath}(\\s|$)`);
  return plainNodeSeparator.test(command) || nodeImportSeparator.test(command);
}

function readJson(path) {
  const content = readText(path);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    findings.push({
      area: "read_json",
      path,
      message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function readText(path) {
  if (!existsSync(path)) {
    findings.push({
      area: "read_file",
      path,
      message: "Required Recall env-file separator file is missing.",
    });
    return "";
  }
  return readFileSync(path, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
