import { readFileSync, writeFileSync } from "node:fs";

import { runLocalModelHarness, type HarnessOptions } from "../harness";

async function main(): Promise<void> {
  const [optionsPath, markerPath] = process.argv.slice(2);
  if (!optionsPath || !markerPath) {
    process.exitCode = 2;
    return;
  }
  const options = JSON.parse(readFileSync(optionsPath, "utf8")) as HarnessOptions;
  let clockCalls = 0;
  options.now = () => {
    clockCalls += 1;
    if (clockCalls === 2) {
      writeFileSync(markerPath, "claimed-and-synchronized\n", { mode: 0o600, flag: "wx" });
      process.kill(process.pid, "SIGKILL");
    }
    return new Date("2026-07-18T20:00:00.000Z");
  };
  await runLocalModelHarness(options);
  process.exitCode = 3;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
