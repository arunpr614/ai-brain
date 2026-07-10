#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveLatestRecallSpikeReportPair } from "./lib/recall-latest-spike-reports.mjs";

const scratch = mkdtempSync(join(tmpdir(), "recall-latest-spike-reports-smoke-"));

try {
  const reportDir = join(scratch, "spikes");
  mkdirSync(reportDir, { recursive: true });
  writeReport(reportDir, "SPIKE-013-recall-rest-enumeration-2026-06-25_10-00-00_IST.md");
  writeReport(reportDir, "SPIKE-014-recall-content-fidelity-2026-06-25_10-00-00_IST.md");
  writeReport(reportDir, "SPIKE-013-recall-rest-enumeration-2026-06-26_10-00-00_IST.md");
  writeReport(reportDir, "SPIKE-014-recall-content-fidelity-2026-06-26_10-00-00_IST.md");
  writeReport(reportDir, "SPIKE-013-recall-rest-enumeration-2026-06-27_10-00-00_IST.md");

  const latest = resolveLatestRecallSpikeReportPair({ reportDir });
  assert(latest.source === "latest_paired_spike_reports", "should use latest paired reports");
  assert(latest.timestamp === "2026-06-26_10-00-00", "should ignore unpaired newer reports");
  assert(
    latest.enumerationPath.endsWith("SPIKE-013-recall-rest-enumeration-2026-06-26_10-00-00_IST.md"),
    "should select newest paired enumeration report",
  );
  assert(
    latest.fidelityPath.endsWith("SPIKE-014-recall-content-fidelity-2026-06-26_10-00-00_IST.md"),
    "should select newest paired fidelity report",
  );

  const fallback = resolveLatestRecallSpikeReportPair({
    reportDir: join(scratch, "missing"),
    enumerationFallback: "fallback-enumeration.md",
    fidelityFallback: "fallback-fidelity.md",
  });
  assert(fallback.source === "fallback_spike_reports", "missing report dir should use fallback paths");
  assert(fallback.enumerationPath === "fallback-enumeration.md", "fallback enumeration path should be preserved");
  assert(fallback.fidelityPath === "fallback-fidelity.md", "fallback fidelity path should be preserved");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "latest paired report timestamp selected",
          "unpaired newer reports ignored",
          "missing report dir falls back to configured defaults",
          "temp reports cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function writeReport(dir, name) {
  writeFileSync(join(dir, name), `# ${name}\n`, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
