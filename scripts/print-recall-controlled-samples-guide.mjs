#!/usr/bin/env node
import { DEFAULT_MANIFEST_PATH, REQUIRED_SAMPLES } from "./lib/recall-controlled-samples.mjs";

const SAMPLE_GUIDANCE = {
  "sample-note": {
    goal: "Prove plain Recall notes can be enumerated and classified.",
    recallSetup: "Create or identify a benign manual note with a short body.",
    acceptanceSignal: "The card appears in SPIKE-013 and has a fidelity decision in SPIKE-014.",
  },
  "sample-article": {
    goal: "Prove web article source URLs and chunks are handled.",
    recallSetup: "Save a benign public article into Recall.",
    acceptanceSignal: "The card is present, source URL is privately checked, and content is not metadata-only unless accepted.",
  },
  "sample-youtube": {
    goal: "Prove video or YouTube captures have usable Recall content.",
    recallSetup: "Save a benign YouTube or video link into Recall.",
    acceptanceSignal: "The card is present and SPIKE-014 classifies whether chunks are transcript-like, summary-only, or metadata-only.",
  },
  "sample-pdf": {
    goal: "Prove PDF captures have usable extracted content.",
    recallSetup: "Save or upload a benign PDF that is easy to recognize privately.",
    acceptanceSignal: "The card is present and SPIKE-014 classifies PDF content fidelity.",
  },
  "sample-no-url": {
    goal: "Prove URL-less Recall cards do not break import identity or reporting.",
    recallSetup: "Create or identify a benign card without a source URL.",
    acceptanceSignal: "The card validates with sourceUrl set to null and no public source exposure.",
  },
  "sample-long": {
    goal: "Probe Recall chunk truncation and max-chunk behavior.",
    recallSetup: "Use a long benign note, article, or PDF likely to approach the 50 chunk limit.",
    acceptanceSignal: "SPIKE-014 records whether maxChunksHit is true and whether policy should import, block, or require review.",
  },
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const guide = buildGuide();

if (args.json) {
  console.log(JSON.stringify(guide, null, 2));
} else {
  console.log(toMarkdown(guide));
}

function buildGuide() {
  const samples = REQUIRED_SAMPLES.map((sample) => {
    const guidance = SAMPLE_GUIDANCE[sample.label];
    if (!guidance) throw new Error(`Missing controlled sample guidance for ${sample.label}`);
    return {
      label: sample.label,
      contentType: sample.contentType,
      sourceRule: sample.source,
      goal: guidance.goal,
      recallSetup: guidance.recallSetup,
      manifestFields: requiredManifestFields(sample.source),
      acceptanceSignal: guidance.acceptanceSignal,
    };
  });

  return {
    ok: true,
    title: "Recall Controlled Samples Setup Guide",
    manifestPath: DEFAULT_MANIFEST_PATH,
    safetyNotes: [
      "No live Recall API call is made by this guide.",
      "Do not paste API keys, private Recall card IDs, private titles, source URLs, or chunk text into chat or public docs.",
      "Keep allowTitleInPublicReport and allowSourceUrlInPublicReport false for every sample.",
      "Use benign throwaway sample content when possible.",
    ],
    dateWindow: {
      guidance:
        "Choose one narrow date window that contains the six positive samples. Create or identify one negative-control card outside that window.",
      manifestFields: ["dateWindow.dateFrom", "dateWindow.dateTo", "negativeControl.createdAt"],
    },
    samples,
    negativeControl: {
      label: "outside-window",
      goal: "Prove SPIKE-013 date filtering excludes cards outside the selected window.",
      recallSetup:
        "Create or identify a Recall card just before or after the positive sample window. It can be any benign content type.",
      manifestFields: ["negativeControl.cardId", "negativeControl.createdAt", "negativeControl.expectedTitle"],
      acceptanceSignal: "The live SPIKE-013 report marks this card absent from the filtered result.",
    },
    commands: [
      "npm run check:recall-private-ignore",
      "npm run recall:controlled-samples:init",
      `npm run check:recall-controlled-samples -- ${DEFAULT_MANIFEST_PATH}`,
      `npm run recall:live-gate:status -- --manifest ${DEFAULT_MANIFEST_PATH}`,
      `npm run check:recall-prelive -- --manifest ${DEFAULT_MANIFEST_PATH}`,
    ],
  };
}

function requiredManifestFields(sourceRule) {
  const fields = [
    "label",
    "contentType",
    "cardId",
    "expectedTitle",
    "createdAt",
    "allowTitleInPublicReport: false",
    "allowSourceUrlInPublicReport: false",
  ];
  if (sourceRule === "required") fields.push("sourceUrl");
  if (sourceRule === "optional") fields.push("sourceUrl or null");
  if (sourceRule === "forbidden") fields.push("sourceUrl: null");
  return fields;
}

function toMarkdown(guide) {
  const lines = [
    `# ${guide.title}`,
    "",
    "This guide is safe to print or share because it contains no private Recall values.",
    "",
    "## Safety Notes",
    "",
    ...guide.safetyNotes.map((note) => `- ${note}`),
    "",
    "## Setup Flow",
    "",
    "1. Pick a narrow date window for six positive Recall cards.",
    "2. Create or identify the six positive cards below inside that window.",
    "3. Create or identify one outside-window negative-control card.",
    `4. Create the private manifest at \`${guide.manifestPath}\` and fill it locally only.`,
    "5. Run the validation commands before any live API call.",
    "",
    "## Required Positive Samples",
    "",
    "| Label | Type | Source URL Rule | Purpose | Recall Setup | Manifest Fields | Acceptance Signal |",
    "|---|---|---|---|---|---|---|",
    ...guide.samples.map(
      (sample) =>
        `| \`${sample.label}\` | \`${sample.contentType}\` | ${sourceRuleText(sample.sourceRule)} | ${sample.goal} | ${sample.recallSetup} | ${sample.manifestFields.map((field) => `\`${field}\``).join(", ")} | ${sample.acceptanceSignal} |`,
    ),
    "",
    "## Negative Control",
    "",
    `Use \`${guide.negativeControl.label}\` to prove date filtering excludes an out-of-window card.`,
    "",
    `- Setup: ${guide.negativeControl.recallSetup}`,
    `- Manifest fields: ${guide.negativeControl.manifestFields.map((field) => `\`${field}\``).join(", ")}`,
    `- Acceptance: ${guide.negativeControl.acceptanceSignal}`,
    "",
    "## Commands",
    "",
    "```text",
    ...guide.commands,
    "```",
    "",
    "Stop before live API access if any command fails or if the manifest would expose titles/source URLs in public reports.",
  ];
  return `${lines.join("\n")}\n`;
}

function sourceRuleText(rule) {
  if (rule === "required") return "Required";
  if (rule === "forbidden") return "Must be null";
  return "Optional";
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall controlled samples setup guide

Usage:
  npm run recall:controlled-samples:guide
  node scripts/print-recall-controlled-samples-guide.mjs --json

This command prints no private Recall data and does not call the live Recall API.
`);
}
