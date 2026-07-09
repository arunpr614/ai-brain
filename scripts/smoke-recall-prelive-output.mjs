#!/usr/bin/env node
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectPrivatePreviewValues, preview, redactPreview } from "./lib/recall-prelive-output.mjs";

const tempManifestPath = `data/private/recall-live-spikes/prelive-output-smoke-${process.pid}-${Date.now()}.json`;
const privateCardId = "card-prelive-output-private-1234567890";
const privateTitle = "Private pre-live output smoke title";
const privateSourceUrl = "https://example.com/private/prelive-output-smoke?token=secret";
const privateNotes = "private notes should be redacted from previews";

try {
  writeFileSync(
    tempManifestPath,
    `${JSON.stringify(
      {
        samples: [
          {
            label: "sample-note",
            cardId: privateCardId,
            expectedTitle: privateTitle,
            sourceUrl: privateSourceUrl,
            notes: privateNotes,
          },
        ],
        negativeControl: {
          cardId: "card-prelive-output-negative-1234567890",
          expectedTitle: "Private negative title",
        },
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  const values = collectPrivatePreviewValues(tempManifestPath);
  assert(values.includes(privateCardId), "private card ID must be collected");
  assert(values.includes(privateTitle), "private title must be collected");
  assert(values.includes(privateSourceUrl), "private source URL must be collected");
  assert(values.includes("/private/prelive-output-smoke"), "private source URL path must be collected");
  assert(values.includes(privateNotes), "private notes must be collected");

  const raw = [
    `card=${privateCardId}`,
    `title=${privateTitle}`,
    `url=${privateSourceUrl}`,
    "path=/private/prelive-output-smoke",
    `notes=${privateNotes}`,
    "key=sk_test_PRELIVE_OUTPUT_PRIVATE_1234567890",
    "Authorization: Bearer secret-token-value",
  ].join("\n");

  const redacted = redactPreview(raw, values);
  assert(!redacted.includes(privateCardId), "redaction must remove private card ID");
  assert(!redacted.includes(privateTitle), "redaction must remove private title");
  assert(!redacted.includes(privateSourceUrl), "redaction must remove private source URL");
  assert(!redacted.includes("/private/prelive-output-smoke"), "redaction must remove private source URL path");
  assert(!redacted.includes(privateNotes), "redaction must remove private notes");
  assert(!redacted.includes("sk_test_PRELIVE_OUTPUT_PRIVATE_1234567890"), "redaction must remove API key-shaped value");
  assert(!redacted.includes("secret-token-value"), "redaction must remove bearer token");
  assert(
    redacted.includes("[REDACTED_PRIVATE_MANIFEST_VALUE]"),
    "redaction should mark private manifest values",
  );

  const shortPreview = preview(`${raw}\n${"x".repeat(800)}`, values, 120);
  assert(shortPreview.length <= 120, "preview should respect max length");
  assert(!shortPreview.includes(privateTitle), "preview must not include private title");
} finally {
  if (existsSync(resolve(tempManifestPath))) rmSync(resolve(tempManifestPath), { force: true });
}

assert(!existsSync(resolve(tempManifestPath)), "smoke temp manifest must be removed");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "private manifest preview values collected",
        "card IDs redacted from previews",
        "expected titles redacted from previews",
        "source URLs and source URL paths redacted from previews",
        "private notes redacted from previews",
        "API-key-shaped values redacted from previews",
        "bearer tokens redacted from previews",
        "preview length cap preserved",
        "temp manifest cleanup",
      ],
      noPersistentPrivateManifest: true,
    },
    null,
    2,
  ),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
