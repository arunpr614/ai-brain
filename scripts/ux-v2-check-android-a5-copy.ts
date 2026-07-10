import fs from "node:fs";
import path from "node:path";

interface Match {
  file: string;
  pattern: string;
  excerpt: string;
}

const targets = [
  "src/app/setup/page.tsx",
  "src/app/setup/form.tsx",
  "src/app/unlock/page.tsx",
  "src/app/unlock/form.tsx",
  "src/app/setup-apk/page.tsx",
  "src/app/settings/device-pairing/page.tsx",
  "src/app/settings/device-pairing/actions-client.tsx",
];

const forbidden = [
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /QR code/i,
  /biometric/i,
  /fingerprint/i,
  /Face ID/i,
  /offline sync/i,
  /available offline/i,
  /read offline/i,
  /package migration/i,
  /telemetry/i,
  /E2EE/i,
  /SSH into/i,
  /\/opt\/brain/i,
  /brain\.service/i,
  /brain\.sqlite/i,
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
