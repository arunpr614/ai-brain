#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const pluginPath = path.join(
  repoRoot,
  "node_modules/@capgo/capacitor-share-target/android/src/main/java/app/capgo/sharetarget/CapacitorShareTargetPlugin.java",
);

if (!fs.existsSync(pluginPath)) {
  console.error(`[patch-capgo-share-target] missing plugin source: ${pluginPath}`);
  process.exit(1);
}

const replacements = [
  {
    unsafe: 'Log.d(TAG, "Share received: " + shareData.toString());',
    safe: 'Log.d(TAG, "Share received: texts=" + texts.length() + " files=" + files.length());',
  },
  {
    unsafe: 'Log.e(TAG, "Error getting file data for URI: " + uri, e);',
    safe: 'Log.e(TAG, "Error getting file data for shared file", e);',
  },
];

let body = fs.readFileSync(pluginPath, "utf8");
let changed = false;

for (const { unsafe, safe } of replacements) {
  if (body.includes(unsafe)) {
    body = body.replace(unsafe, safe);
    changed = true;
  } else if (!body.includes(safe)) {
    console.error(
      `[patch-capgo-share-target] expected neither unsafe nor safe pattern was found: ${unsafe}`,
    );
    process.exit(1);
  }
}

for (const { unsafe } of replacements) {
  if (body.includes(unsafe)) {
    console.error(`[patch-capgo-share-target] unsafe log remains after patch: ${unsafe}`);
    process.exit(1);
  }
}

if (changed) {
  fs.writeFileSync(pluginPath, body);
}

console.log(
  `[patch-capgo-share-target] ok: sanitized share-target logs${changed ? "" : " (already patched)"}`,
);
