#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const pages = [
  "Home.md", "_Sidebar.md", "Agent-Onboarding.md", "Product-Overview.md",
  "Source-Baselines-and-Status.md", "Feature-Catalog.md", "System-Architecture.md",
  "Manual-Content-Notes.md",
  "Data-Model.md", "Capture-and-Ingestion.md", "Search-RAG-and-Ask.md",
  "Enrichment-and-AI-Providers.md", "Mobile-Extension-and-Pairing.md",
  "Security-Privacy-and-Redaction.md", "Command-Safety.md", "Deployment-and-Operations.md",
  "Agent-Workflows.md", "Troubleshooting.md", "Documentation-Maintenance.md",
];
const root = mkdtempSync(join(tmpdir(), "agent-wiki-structure-"));
const wiki = join(root, "wiki");
const baseline = join(root, "baseline.json");
const manifestPath = join(root, "feature-council-wiki-manifest.json");
const checker = resolve("scripts/check-agent-wiki-structure.mjs");
const sha = "a".repeat(40);
const sourceManifest = JSON.parse(readFileSync(resolve("docs/agent-docs/feature-council-wiki-manifest.json"), "utf8"));

try {
  mkdirSync(wiki, { recursive: true });
  writeFileSync(baseline, JSON.stringify({
    defaultBranchSha: sha,
    worktreeSha: "b".repeat(40),
    productionSha: null,
    featureCouncilArtifactSha: sourceManifest.artifactSourceCommit,
  }));
  writeFileSync(manifestPath, JSON.stringify(sourceManifest));
  const metadata = [
    "Purpose: Synthetic page",
    "Audience: Tests",
    `Verified against: ${sha}`,
    "Runtime evidence through: Unknown",
    "Last reviewed: 2026-07-10",
    "Owner: Documentation maintainer",
  ].join("\n");

  for (const page of pages) {
    const target = join(wiki, page);
    if (page === "_Sidebar.md") {
      writeFileSync(target, [
        ...pages.filter((name) => name !== "_Sidebar.md").map((name) => `- [${name}](${name})`),
        `- [Feature Council Research](${sourceManifest.landingPage})`,
      ].join("\n"));
    } else if (page === "Feature-Catalog.md") {
      writeFileSync(target, `${metadata}\n\n# Feature Catalog\n\n| Feature | Product status | Code status | Runtime status | User surface | API/action entrypoint | Core modules | Data touched | Jobs/scripts | Verification | Baseline SHA | Known gaps |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n| Synthetic | Internal | Main | Unknown | None | None | None | None | None | None | ${sha} | None |\n`);
    } else if (page === "System-Architecture.md") {
      writeFileSync(target, `${metadata}\n\n# Architecture\n\n\`\`\`mermaid\ngraph TD\n  A --> B\n\`\`\`\n`);
    } else {
      writeFileSync(target, `${metadata}\n\n# ${page.replace(/\.md$/, "")}\n`);
    }
  }

  const researchMetadata = (entry) => [
    "Purpose: Synthetic research page",
    "Audience: Tests",
    `Artifact source commit: \`${sourceManifest.artifactSourceCommit}\``,
    `Audited application baseline: \`${sourceManifest.auditedApplicationBaseline}\``,
    `Research evidence date: ${sourceManifest.researchEvidenceDate}.`,
    `Lifecycle: ${{ current: "Current feature-council artifact", historical: "Historical draft - do not implement", review: "Review record" }[entry.lifecycle]}.`,
    "Runtime verification: Not provided.",
    `Superseded by: ${entry.successors.length ? entry.successors.map((page) => `[${page}](${page.replace(/\.md$/, "")})`).join(", ") : "None"}.`,
    "Public disclosure: Reviewed and sanitized.",
    "Owner: AI Brain maintainer.",
  ].join("\n");

  for (const entry of sourceManifest.documents) {
    const allResearchLinks = entry.destination === sourceManifest.landingPage
      ? `\n\n${sourceManifest.documents.map((document) => `[${document.destination}](${document.destination.replace(/\.md$/, "")})`).join("\n")}`
      : "";
    writeFileSync(
      join(wiki, entry.destination),
      `# ${entry.destination}\n\n${researchMetadata(entry)}${allResearchLinks}\n`,
    );
  }

  const valid = run(wiki, baseline, manifestPath);
  assert.equal(valid.status, 0, valid.stderr);

  writeFileSync(join(wiki, "Home.md"), `${metadata}\n\n# Home\n\n[Broken](Missing-Page)\n`);
  const broken = run(wiki, baseline, manifestPath);
  assert.equal(broken.status, 1, "broken internal links must fail");
  assert.match(broken.stderr, /broken_internal_link/);

  console.log("[smoke-agent-wiki-structure] ok");
} finally {
  rmSync(root, { recursive: true, force: true });
}

function run(wiki, baselinePath, researchManifestPath) {
  return spawnSync(process.execPath, [checker, wiki, baselinePath, researchManifestPath], { encoding: "utf8" });
}
