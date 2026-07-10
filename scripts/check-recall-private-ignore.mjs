#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const PRIVATE_PATHS = [
  "data/private/",
  "data/private/recall-live-spikes/",
  "data/private/recall-live-spikes/recall.env",
  "data/private/recall-live-spikes/controlled-samples.json",
  "data/private/recall-live-spikes/dry-run-report.json",
  "data/private/recall-live-spikes/first-apply-report.json",
  "data/private/recall-live-spikes/live-diagnostic-report.json",
  "data/private/recall-live-spikes/production-deploy-evidence.json",
  "data/private/recall-live-spikes/scheduler-enable-evidence.json",
];

if (process.argv.includes("--help")) {
  printHelp();
  process.exit(0);
}

const findings = [];
const checks = PRIVATE_PATHS.map((path) => {
  const ignored = isIgnored(path);
  const tracked = isTracked(path);
  if (!ignored) {
    findings.push({
      path,
      rule: "not_ignored",
      message: "Recall private evidence path is not ignored by git.",
    });
  }
  if (tracked) {
    findings.push({
      path,
      rule: "tracked_private_path",
      message: "Recall private evidence path is already tracked by git.",
    });
  }
  return { path, ignored, tracked };
});

if (findings.length > 0) {
  console.error("[check:recall-private-ignore] failed");
  console.error(JSON.stringify({ findings, checks }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedPaths: checks.length,
      checks,
    },
    null,
    2,
  ),
);

function isIgnored(path) {
  const result = spawnSync("git", ["check-ignore", "-q", "--", path], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function isTracked(path) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", path], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function printHelp() {
  console.log(`Recall private evidence ignore check

Usage:
  npm run check:recall-private-ignore

The check verifies Recall private evidence paths under data/private/recall-live-spikes/
are ignored by git and are not already tracked.
`);
}
