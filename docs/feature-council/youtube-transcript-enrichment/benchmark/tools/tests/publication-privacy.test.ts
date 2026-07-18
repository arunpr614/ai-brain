import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const MAX_PUBLICATION_FILE_BYTES = 10 * 1024 * 1024;
const PUBLICATION_EXTENSIONS = new Set([".json", ".md", ".sb", ".srt", ".ts", ".txt", ".vtt"]);

const FORBIDDEN: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ["personal home path", /\/(?:Users|home)\/(?!<|USER(?:\/|\b)|user(?:\/|\b))[^/`"'\s]+(?:\/|$)/u],
  ["Codex private attachment path", /\.codex\/attachments\//u],
  ["Google OAuth client identifier", /\b[0-9]{10,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com\b/iu],
  ["Google OAuth client secret", /\bGOCSPX-[A-Za-z0-9_-]{10,}\b/u],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/u],
  ["GitHub access token", /\bgh[pousr]_[0-9A-Za-z]{20,}\b/u],
  ["provider API key", /\bsk-(?:proj-)?[0-9A-Za-z_-]{20,}\b/u],
  ["private key material", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ["populated client_secret field", /["']client_secret["']\s*:\s*["'][^"'\s]{8,}["']/u],
  ["URL embedded credentials", /https?:\/\/[^/@\s]+:[^/@\s]+@/u],
];

function publicationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) return [];
      return entry.isDirectory() ? publicationFiles(absolute) : [absolute];
    })
    .filter((absolute) => PUBLICATION_EXTENSIONS.has(path.extname(absolute)))
    .sort();
}

test("publication artifacts contain no credential or workstation-path material", () => {
  const failures: string[] = [];
  for (const filePath of publicationFiles(PROJECT_ROOT)) {
    const info = lstatSync(filePath);
    const relative = path.relative(PROJECT_ROOT, filePath);
    if (!info.isFile() || info.nlink !== 1 || info.size > MAX_PUBLICATION_FILE_BYTES) {
      failures.push(`${relative}: unsafe publication file shape`);
      continue;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(filePath));
    } catch {
      failures.push(`${relative}: invalid UTF-8 publication bytes`);
      continue;
    }
    for (const [label, pattern] of FORBIDDEN) {
      if (pattern.test(text)) failures.push(`${relative}: ${label}`);
    }
  }
  assert.deepEqual(failures, []);
});
