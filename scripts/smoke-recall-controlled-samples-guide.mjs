#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const markdown = run(["scripts/print-recall-controlled-samples-guide.mjs"], "markdown guide").stdout;
const jsonResult = run(["scripts/print-recall-controlled-samples-guide.mjs", "--json"], "json guide").stdout;
const help = run(["scripts/print-recall-controlled-samples-guide.mjs", "--help"], "help").stdout;

const guide = parseJson(jsonResult, "json guide");

assert(markdown.includes("# Recall Controlled Samples Setup Guide"), "markdown guide must include title");
assert(markdown.includes("No live Recall API call"), "markdown guide must state no live API call");
assert(markdown.includes("allowTitleInPublicReport"), "markdown guide must mention public-title guard");
assert(markdown.includes("allowSourceUrlInPublicReport"), "markdown guide must mention public-source guard");
assert(markdown.includes("npm run check:recall-prelive"), "markdown guide must include pre-live validation");
assert(help.includes("prints no private Recall data"), "help must state no private data");

const requiredLabels = [
  "sample-note",
  "sample-article",
  "sample-youtube",
  "sample-pdf",
  "sample-no-url",
  "sample-long",
];

for (const label of requiredLabels) {
  assert(markdown.includes(label), `markdown guide missing ${label}`);
  assert(JSON.stringify(guide).includes(label), `json guide missing ${label}`);
}

assert(guide.ok === true, "json guide must report ok");
assert(guide.samples.length === requiredLabels.length, "json guide must include six positive samples");
assert(
  guide.samples.some((sample) => sample.label === "sample-no-url" && sample.sourceRule === "forbidden"),
  "json guide must mark no-url sample as source-forbidden",
);
assert(
  guide.commands.includes("npm run check:recall-private-ignore"),
  "json guide must include private ignore check",
);
assert(
  guide.negativeControl.label === "outside-window",
  "json guide must include outside-window negative control",
);

const serialized = `${markdown}\n${jsonResult}\n${help}`;
assert(!/\bsk_[A-Za-z0-9_-]{10,}\b/.test(serialized), "guide must not contain API-key-shaped values");
assert(!serialized.includes("paste-private"), "guide must not print manifest placeholders as usable values");
assert(!serialized.includes("redacted-local-smoke"), "guide must not leak smoke credential values");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "markdown guide prints all required labels",
        "json guide uses manifest source-of-truth labels",
        "no live API call warning",
        "redacted-only public report guard",
        "private validation commands",
        "no API-key-shaped values",
        "no private-value placeholders printed as values",
      ],
    },
    null,
    2,
  ),
);

function run(args, label) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result;
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
