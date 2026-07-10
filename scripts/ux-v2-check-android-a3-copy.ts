import fs from "node:fs";
import path from "node:path";

interface Match {
  file: string;
  pattern: string;
  excerpt: string;
}

const targets = [
  "src/app/ask/page.tsx",
  "src/app/ask/ask-client.tsx",
  "src/app/ask/ask-request.ts",
  "src/app/items/[id]/ask/page.tsx",
  "src/app/items/[id]/page.tsx",
  "src/components/ask-input.tsx",
  "src/components/related-items.tsx",
];

const forbidden = [
  /Paste link/i,
  /Write note/i,
  /Attach file/i,
  /Attachments/i,
  /high-quality-only/i,
  /scope history/i,
  /offline queue/i,
  /available offline/i,
  /offline sync/i,
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /biometric/i,
  /package migration/i,
  /telemetry/i,
  /E2EE/i,
  /delete all data/i,
];

const matches: Match[] = [];

for (const file of targets) {
  const body = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  for (const pattern of forbidden) {
    const found = body.match(pattern);
    if (found?.index !== undefined) {
      const start = Math.max(0, found.index - 80);
      const end = Math.min(body.length, found.index + found[0].length + 80);
      matches.push({
        file,
        pattern: pattern.toString(),
        excerpt: body.slice(start, end).replace(/\s+/g, " ").trim(),
      });
    }
  }
}

const report = {
  checkedFiles: targets,
  matches,
  issueCount: matches.length,
};

console.log(JSON.stringify(report, null, 2));

if (matches.length > 0) {
  process.exitCode = 1;
}
