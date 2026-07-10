import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  REPO_ROOT,
  RESULTS_DIR,
  buildScoreRow,
  cleanText,
  printSummary,
  timestampSlug,
  writeJsonl,
} from "./capture-quality-lib.mjs";

const sampleDir = resolve(REPO_ROOT, "data/spikes/substack-email/samples");

function parseHeadersAndBody(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const split = normalized.search(/\n\s*\n/);
  const headerText = split >= 0 ? normalized.slice(0, split) : "";
  const bodyText = split >= 0 ? normalized.slice(split).trim() : normalized;
  const headers = {};
  for (const line of headerText.split("\n")) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) headers[match[1].toLowerCase()] = match[2];
  }
  return { headers, bodyText };
}

function cleanEmailBody(text) {
  const stopPatterns = [
    /^thanks for reading/i,
    /^subscribe$/i,
    /^unsubscribe$/i,
    /^manage your subscription$/i,
    /^forwarded from substack$/i,
    /^view in browser$/i,
  ];
  return cleanText(
    text
      .split("\n")
      .filter((line) => !stopPatterns.some((pattern) => pattern.test(line.trim())))
      .join("\n"),
  );
}

function findCanonicalUrl(text) {
  const urls = text.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  return urls.find((url) => /\.substack\.com\/p\//i.test(url)) ?? urls[0] ?? "";
}

const rows = [];
const files = (await readdir(sampleDir)).filter((file) => /\.(txt|eml|html)$/i.test(file));
for (const file of files) {
  const raw = await readFile(resolve(sampleDir, file), "utf8");
  const { headers, bodyText } = parseHeadersAndBody(raw);
  const cleanBody = cleanEmailBody(bodyText);
  const canonicalUrl = findCanonicalUrl(raw);
  rows.push(
    buildScoreRow(
      {
        fixture_id: file,
        platform: "substack_email",
        input_type: file.split(".").pop(),
        url: canonicalUrl || "email://sample",
        candidate: "email_body",
        synthetic_sample: /synthetic/i.test(raw),
        explicit_user_action: true,
        canonical_url_found: Boolean(canonicalUrl),
        raw_body_chars: bodyText.length,
        clean_body_chars: cleanBody.length,
        footer_removed: cleanBody.length < cleanText(bodyText).length,
        link_count: (cleanBody.match(/https?:\/\//g) ?? []).length,
        elapsed_ms: 0,
      },
      {
        title: headers.subject ?? "",
        author: headers.from ?? "",
        published_at: headers.date ?? "",
        source_url: canonicalUrl || "email://sample",
        body: cleanBody,
        extraction_warning: /synthetic/i.test(raw) ? "synthetic_fixture" : null,
      },
    ),
  );
}

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `substack-email-ingestion-${stamp}.jsonl`);
await writeJsonl(jsonlPath, rows);
printSummary(rows, "candidate");
console.log(`wrote ${jsonlPath}`);
