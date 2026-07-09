import fs from "node:fs";
import path from "node:path";

const targetFiles = [
  "src/components/sidebar.tsx",
  "src/components/sidebar-routing.ts",
  "src/components/mobile-library-filters.tsx",
  "src/components/library-list.tsx",
  "src/app/library/page.tsx",
  "src/app/more/page.tsx",
  "src/lib/settings/trust-copy.ts",
  "public/offline.html",
];

const allowedStrings = [
  "End-to-end encryption is not active yet.",
  "Privacy controls are coming soon.",
  "Ask, capture, export, and sync require the AI Memory server.",
  "There is no offline queue in UX v2.",
  "Server required.",
  "Not active yet.",
  "A verified destructive delete flow is planned.",
];

const forbiddenPatterns: Array<{ id: string; pattern: RegExp }> = [
  { id: "stale_brand", pattern: /AI Brain/i },
  {
    id: "email_address",
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  },
  { id: "available_offline", pattern: /available offline/i },
  { id: "read_offline", pattern: /read offline/i },
  { id: "offline_item", pattern: /offline item/i },
  { id: "offline_sync", pattern: /offline sync/i },
  { id: "offline_capture_queue", pattern: /offline capture queue/i },
  { id: "qr_scan", pattern: /QR scan/i },
  { id: "biometric", pattern: /biometric/i },
  { id: "fingerprint_unlock", pattern: /fingerprint unlock/i },
  { id: "package_migration", pattern: /package migration|package rename/i },
  { id: "active_telemetry", pattern: /active telemetry|telemetry toggle/i },
  { id: "active_crash", pattern: /active crash|crash-report toggle/i },
  { id: "e2ee_claim", pattern: /end-to-end encrypted/i },
  { id: "delete_all_data", pattern: /delete everything|delete all data/i },
];

interface Match {
  file: string;
  line: number;
  id: string;
  text: string;
}

function isAllowed(lineText: string): boolean {
  return allowedStrings.some((allowed) => lineText.includes(allowed));
}

const matches: Match[] = [];
const allowedMatches: Match[] = [];

for (const file of targetFiles) {
  const absolute = path.join(process.cwd(), file);
  const text = fs.readFileSync(absolute, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const { id, pattern } of forbiddenPatterns) {
      if (!pattern.test(lineText)) continue;
      const match = {
        file,
        line: index + 1,
        id,
        text: lineText.trim(),
      };
      if (isAllowed(lineText)) allowedMatches.push(match);
      else matches.push(match);
    }
  });
}

const report = {
  checkedFiles: targetFiles,
  allowedStrings,
  matches,
  allowedMatches,
  issueCount: matches.length,
};

console.log(JSON.stringify(report, null, 2));

if (matches.length > 0) {
  process.exitCode = 1;
}
