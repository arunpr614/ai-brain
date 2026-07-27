import { spawn } from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const FIXTURE_PATH = fileURLToPath(import.meta.url);
const WORKER_PATH = resolve(
  dirname(FIXTURE_PATH),
  "..",
  "run-youtube-stage2-file-factory-proof-worker.mjs",
);
const BUILD_OUTPUT_PREFIX = "brain-s28-file-factory-build-";
const BUILD_RETAINED_SUFFIX = ".cleanup-fixture-retained";
const BUILD_REPLACEMENT_SENTINEL = "replacement-sentinel";
const FIXTURE_SCENARIOS = Object.freeze([
  "valid",
  "timeout",
  "cap-equality",
  "cap-plus-one",
  "signal",
  "truncated-json",
  "trailing-byte",
  "stderr",
  "nonzero",
  "held-pipe",
]);
const FIXTURE_SCENARIO_SET = new Set(FIXTURE_SCENARIOS);
const VALID_TRANSPORT_DOCUMENT = '{"fixture":"valid"}\n';

function refuse() {
  process.stderr.write("File-factory transport fixture refused.\n");
  process.exit(64);
}

function exactCanonicalJsonDocument(byteLength) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 3) {
    refuse();
  }
  return `${JSON.stringify("x".repeat(byteLength - 3))}\n`;
}

function exactEntries(path, expected) {
  const entries = fs.readdirSync(path).sort();
  return (
    entries.length === expected.length &&
    entries.every((entry, index) => entry === expected[index])
  );
}

function installBuildCleanupReplacementFixture() {
  if (
    process.argv.length !== 2 ||
    process.argv[1] !== WORKER_PATH
  ) {
    refuse();
  }
  const originalRmdirSync = fs.rmdirSync;
  let injected = false;
  fs.rmdirSync = function patchedRmdirSync(path, options) {
    if (
      !injected &&
      typeof path === "string"
    ) {
      const root = fs.realpathSync(process.cwd());
      const outputDirectory = path;
      const outputStat = fs.lstatSync(
        outputDirectory,
        { bigint: true },
      );
      const retainedDirectory =
        outputDirectory + BUILD_RETAINED_SUFFIX;
      if (
        dirname(outputDirectory) !== root ||
        !basename(outputDirectory).startsWith(
          BUILD_OUTPUT_PREFIX,
        ) ||
        fs.realpathSync(outputDirectory) !== outputDirectory ||
        !outputStat.isDirectory() ||
        Number(outputStat.mode & 0o7777n) !== 0o700 ||
        outputStat.uid !== BigInt(process.getuid()) ||
        !exactEntries(outputDirectory, []) ||
        fs.existsSync(retainedDirectory)
      ) {
        return Reflect.apply(
          originalRmdirSync,
          fs,
          [path, options],
        );
      }

      injected = true;
      fs.renameSync(outputDirectory, retainedDirectory);
      fs.mkdirSync(outputDirectory, { mode: 0o700 });
      fs.mkdirSync(
        join(outputDirectory, BUILD_REPLACEMENT_SENTINEL),
        { mode: 0o700 },
      );
      const rootDescriptor = fs.openSync(
        root,
        fs.constants.O_RDONLY |
          fs.constants.O_DIRECTORY |
          fs.constants.O_NOFOLLOW,
      );
      try {
        fs.fsyncSync(rootDescriptor);
      } finally {
        fs.closeSync(rootDescriptor);
      }
    }
    return Reflect.apply(originalRmdirSync, fs, [path, options]);
  };
  syncBuiltinESMExports();
}

function runTransportFixture() {
  if (
    process.argv.length !== 3 ||
    !FIXTURE_SCENARIO_SET.has(process.argv[2])
  ) {
    refuse();
  }
  const scenario = process.argv[2];

  switch (scenario) {
    case "valid":
      process.stdout.write(VALID_TRANSPORT_DOCUMENT);
      break;
    case "timeout":
      setInterval(() => undefined, 60_000);
      break;
    case "cap-equality":
      process.stdout.write(
        exactCanonicalJsonDocument(MAX_OUTPUT_BYTES),
      );
      break;
    case "cap-plus-one":
      process.stdout.write(
        exactCanonicalJsonDocument(MAX_OUTPUT_BYTES + 1),
      );
      break;
    case "signal":
      process.kill(process.pid, "SIGTERM");
      break;
    case "truncated-json":
      process.stdout.write('{"fixture":"truncated"');
      break;
    case "trailing-byte":
      process.stdout.write(`${VALID_TRANSPORT_DOCUMENT}x`);
      break;
    case "stderr":
      process.stdout.write(VALID_TRANSPORT_DOCUMENT);
      process.stderr.write(
        "File-factory transport fixture stderr.\n",
      );
      break;
    case "nonzero":
      process.stdout.write(VALID_TRANSPORT_DOCUMENT);
      process.exitCode = 7;
      break;
    case "held-pipe": {
      const descendant = spawn(
        process.execPath,
        ["-e", "setInterval(() => undefined, 60_000)"],
        {
          shell: false,
          stdio: ["ignore", "inherit", "ignore"],
        },
      );
      descendant.unref();
      process.stdout.write(
        VALID_TRANSPORT_DOCUMENT,
        () => {
          process.exit(0);
        },
      );
      break;
    }
    default:
      refuse();
  }
}

if (process.argv[1] === FIXTURE_PATH) {
  runTransportFixture();
} else {
  installBuildCleanupReplacementFixture();
}
