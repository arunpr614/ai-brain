import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Phase 3 WCAG theme variables and contrast audit", async (t) => {
  const rootDir = process.cwd();

  await t.test("HeroWorkspaceBanner uses 2-tier layout and high-contrast badges", () => {
    const file = readFileSync(join(rootDir, "src/components/reading-studio/hero-workspace-banner.tsx"), "utf8");
    assert.ok(file.includes("YouTubeIcon"), "HeroWorkspaceBanner should import YouTubeIcon");
    assert.ok(file.includes("Reading Studio & Synchronized Media Player"), "HeroWorkspaceBanner should use purposeful headline");
    assert.ok(file.includes("text-emerald-700"), "Quality badge should use high-contrast text in light mode");
    assert.ok(file.includes("text-rose-700"), "Degraded badge should use high-contrast text in light mode");
    assert.ok(!file.includes("h-24 w-36 sm:h-28 sm:w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] shadow-inner md:flex-row md:items-start md:justify-between"), "Hero banner should avoid squeezed 3-column layout");
  });

  await t.test("AsrRecoveryCallout uses WCAG AAA contrast typography and solid badges", () => {
    const file = readFileSync(join(rootDir, "src/components/reading-studio/asr-recovery-callout.tsx"), "utf8");
    assert.ok(file.includes("text-rose-950"), "Heading should use high-contrast text-rose-950");
    assert.ok(file.includes("bg-rose-100"), "Badge should use high-contrast bg-rose-100");
    assert.ok(file.includes("bg-emerald-50") && file.includes("text-emerald-950"), "Queued badge should use solid light-mode tokens");
  });

  await t.test("ProcessingItemCard uses YouTubeIcon and theme-adaptive Studio button", () => {
    const file = readFileSync(join(rootDir, "src/components/processing/item-card.tsx"), "utf8");
    assert.ok(file.includes("YouTubeIcon"), "ProcessingItemCard should import YouTubeIcon");
    assert.ok(file.includes("bg-emerald-50") && file.includes("text-emerald-950"), "Studio button should use adaptive high-contrast styling");
    assert.ok(file.includes("bg-emerald-50") && file.includes("text-emerald-900"), "⚡ ASR badge should use adaptive high-contrast styling");
    assert.ok(file.includes("bg-purple-50") && file.includes("text-purple-900"), "📥 Recall badge should use adaptive high-contrast styling");
  });

  await t.test("SplitPaneContainer and ReadingStudioApp use high-contrast Focus Mode styling", () => {
    const splitPane = readFileSync(join(rootDir, "src/components/reading-studio/split-pane-container.tsx"), "utf8");
    const studioApp = readFileSync(join(rootDir, "src/components/reading-studio/reading-studio-app.tsx"), "utf8");
    
    assert.ok(splitPane.includes("bg-indigo-50 text-indigo-950"), "SplitPaneContainer should use high-contrast active Focus styling");
    assert.ok(splitPane.includes("Exit Focus (⌥F)"), "SplitPaneContainer should have dynamic label");
    assert.ok(studioApp.includes("bg-indigo-50 text-indigo-950"), "ReadingStudioApp should use high-contrast active Focus styling");
    assert.ok(studioApp.includes("bg-emerald-50 text-emerald-700"), "ReadingStudioApp header icon should use theme-adaptive styling");
  });

  await t.test("MultiLayerCompanionTabs uses high-contrast Recall and Ask AI tokens", () => {
    const file = readFileSync(join(rootDir, "src/components/reading-studio/multi-layer-companion-tabs.tsx"), "utf8");
    assert.ok(file.includes("bg-purple-50 border border-purple-200"), "Recall banner should use light theme token");
    assert.ok(file.includes("text-purple-950"), "Recall headline should use high-contrast text");
    assert.ok(file.includes("bg-cyan-50 border border-cyan-200"), "Ask AI banner should use light theme token");
    assert.ok(file.includes("text-cyan-950"), "Ask AI headline should use high-contrast text");
  });
});
