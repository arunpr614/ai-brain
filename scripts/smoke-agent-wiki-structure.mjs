#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const pages = [
  "Home.md", "_Sidebar.md", "_Footer.md", "Agent-Onboarding.md", "Product-Overview.md",
  "Source-Baselines-and-Status.md", "Feature-Catalog.md", "Ideas-and-Exploration-Catalog.md",
  "Card-Processing-Workflow-Exploration.md", "Card-Processing-Workflow.md",
  "Manual-Content-Notes.md", "System-Architecture.md", "Feature-Architecture.md",
  "Technology-Stack.md", "Repository-Map.md", "Data-Model.md", "APIs-and-Integrations.md",
  "Library-and-Item-Management.md", "Capture-and-Ingestion.md",
  "Capture-Quality-Review-and-Repair.md", "Organization-Tags-Topics-and-Collections.md",
  "Search-RAG-and-Ask.md", "Enrichment-and-AI-Providers.md",
  "Authentication-Sessions-and-Device-Pairing.md", "Mobile-Extension-and-Pairing.md",
  "Browser-Extension.md", "Telegram-Capture.md", "Recall-Synchronization.md",
  "NotebookLM-One-Click-Export.md",
  "NotebookLM-Synchronization-Research.md",
  "Backups-and-Restore.md", "Security-Privacy-and-Redaction.md",
  "Local-Development-and-Testing.md", "Configuration-Reference.md", "Command-Safety.md",
  "Deployment-and-Operations.md", "Agent-Workflows.md", "Troubleshooting.md",
  "Known-Limitations-and-Technical-Debt.md", "Glossary.md", "Documentation-Maintenance.md",
  "Documentation-Changelog.md", "Feature-Page-Template.md", "Explored-Idea-Template.md",
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
    } else if (page === "_Footer.md") {
      writeFileSync(target, `Verified against ${sha}. [Home](Home)\n`);
    } else if (page === "Feature-Catalog.md") {
      writeFileSync(target, `${metadata}\n\n# Feature Catalog\n\n| Feature | Status | Availability | Confidence | Runtime evidence | Detailed page | Verified baseline | Key boundary |\n|---|---|---|---|---|---|---|---|\n| Synthetic | Implemented | Default | High | Unknown | [Home](Home) | ${sha} | None |\n`);
    } else if (page === "System-Architecture.md") {
      writeFileSync(target, `${metadata}\n\n# Architecture\n\n\`\`\`mermaid\ngraph TD\n  A --> B\n\`\`\`\n`);
    } else {
      writeFileSync(target, `${metadata}\n\n# ${page.replace(/\.md$/, "")}\n\nStatus and Confidence. Target user and user journey. Empty, Loading, Success, and Failure states. Architecture and runtime flow. Data storage and schema. API entrypoint. Security, privacy, and authentication. Configuration and feature flag. Tests and verification. Operational limitations and boundary. Related features and ideas. Pinned evidence.\n`);
    }
  }

  const researchMetadata = (entry) => [
    "Purpose: Synthetic research page",
    "Audience: Tests",
    `Artifact source commit: \`${sourceManifest.artifactSourceCommit}\``,
    `Audited application baseline: \`${sourceManifest.auditedApplicationBaseline}\``,
    `Research evidence date: ${sourceManifest.researchEvidenceDate}.`,
    `Lifecycle: ${{
      current: "Latest revision within the 2026-06-28 planning package",
      historical: "Superseded draft within the 2026-06-28 planning package - do not implement",
      review: "Review record within the 2026-06-28 planning package",
    }[entry.lifecycle]}.`,
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
