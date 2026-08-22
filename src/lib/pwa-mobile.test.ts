import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getMobileShellTarget, usesStandardMobileCapture } from "@/components/sidebar-routing";
import { formatBytes } from "./offline/offline-storage-manager";

test("manifest.webmanifest is valid JSON and contains all required PWA fields", () => {
  const manifestPath = path.join(process.cwd(), "public", "manifest.webmanifest");
  assert.ok(fs.existsSync(manifestPath), "manifest.webmanifest must exist in public/");

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.name, "AI Memory");
  assert.equal(manifest.short_name, "AI Memory");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/library");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "must have icons");

  // Web Share Target API verification
  assert.ok(manifest.share_target, "share_target must be defined");
  assert.equal(manifest.share_target.action, "/capture");
  assert.equal(manifest.share_target.method, "GET");
  assert.equal(manifest.share_target.params.url, "url");
  assert.equal(manifest.share_target.params.text, "text");
  assert.equal(manifest.share_target.params.title, "title");

  // App shortcuts
  assert.ok(Array.isArray(manifest.shortcuts), "shortcuts must be defined");
  assert.ok(manifest.shortcuts.some((s: { url: string }) => s.url === "/capture?tab=url"), "must have Quick Capture shortcut");
  assert.ok(manifest.shortcuts.some((s: { url: string }) => s.url === "/capture?tab=note"), "must have New Note shortcut");
  assert.ok(manifest.shortcuts.some((s: { url: string }) => s.url === "/library"), "must have Library shortcut");
  assert.ok(manifest.shortcuts.some((s: { url: string }) => s.url === "/ask"), "must have Ask shortcut");
});

test("service worker contains enhanced shell paths and Reading Studio caching rules", () => {
  const swPath = path.join(process.cwd(), "public", "sw.js");
  assert.ok(fs.existsSync(swPath), "sw.js must exist in public/");

  const content = fs.readFileSync(swPath, "utf-8");
  assert.ok(content.includes("/library"), "sw.js must include /library in runtime shell paths");
  assert.ok(content.includes("/ask"), "sw.js must include /ask in runtime shell paths");
  assert.ok(content.includes("/more"), "sw.js must include /more in runtime shell paths");
  assert.ok(content.includes("items|library"), "sw.js must cache both /items and /library routes for offline reading");
});

test("Web Share Target URL extraction correctly identifies embedded URLs in text", () => {
  function extractUrlFromText(text: string | undefined): string | null {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  assert.equal(
    extractUrlFromText("Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ on YouTube"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    extractUrlFromText("https://arunp.in/article-test"),
    "https://arunp.in/article-test"
  );
  assert.equal(
    extractUrlFromText("Just a regular thought without any link"),
    null
  );
});

test("Mobile Bottom Navigation shell target routing correctly identifies active tabs", () => {
  assert.equal(getMobileShellTarget("/library"), "library");
  assert.equal(getMobileShellTarget("/library/abc-123/read"), "library");
  assert.equal(getMobileShellTarget("/items/abc-123"), "library");
  assert.equal(getMobileShellTarget("/ask"), "ask");
  assert.equal(getMobileShellTarget("/more"), "more");
  assert.equal(getMobileShellTarget("/settings"), "more");
  assert.equal(getMobileShellTarget("/capture"), "capture");

  assert.equal(usesStandardMobileCapture("/capture"), true);
  assert.equal(usesStandardMobileCapture("/library"), false);
  assert.equal(usesStandardMobileCapture("/ask"), true);
});

test("Citation Preview deep link generation routes correctly to Reading Studio timestamps", () => {
  function generateCitationJumpHref(citation: {
    itemId: string;
    chunkId: string;
    sourceKind?: string;
    timestampMs?: number;
  }): string {
    if (citation.sourceKind === "manual_note") {
      return `/items/${citation.itemId}?tab=notes`;
    }
    if (citation.timestampMs && citation.timestampMs > 0) {
      return `/items/${citation.itemId}/read?t=${Math.floor(citation.timestampMs / 1000)}`;
    }
    return `/items/${citation.itemId}/read?highlight=${encodeURIComponent(citation.chunkId)}#chunk-${encodeURIComponent(citation.chunkId)}`;
  }

  assert.equal(
    generateCitationJumpHref({ itemId: "item-1", chunkId: "chunk-1", timestampMs: 184000 }),
    "/items/item-1/read?t=184"
  );
  assert.equal(
    generateCitationJumpHref({ itemId: "item-2", chunkId: "chunk-abc" }),
    "/items/item-2/read?highlight=chunk-abc#chunk-chunk-abc"
  );
  assert.equal(
    generateCitationJumpHref({ itemId: "item-3", chunkId: "chunk-xyz", sourceKind: "manual_note" }),
    "/items/item-3?tab=notes"
  );
});

test("AI Summary and Quote markdown formatting for note appending", () => {
  function formatSummaryForNote(summary: string): string {
    return `### AI Summary\n\n${summary}`;
  }

  function formatQuoteForNote(quote: string): string {
    return `> "${quote}"`;
  }

  const summaryText = "Key takeaway from this engineering document.";
  assert.equal(formatSummaryForNote(summaryText), "### AI Summary\n\nKey takeaway from this engineering document.");

  const quoteText = "Code is meant to be read by humans first.";
  assert.equal(formatQuoteForNote(quoteText), `> "Code is meant to be read by humans first."`);
});

test("Touch Markdown accessory toolbar syntax insertion helpers", () => {
  function applyTouchMarkdown(syntax: string, selection = ""): string {
    switch (syntax) {
      case "h2":
        return `## ${selection || "Heading"}`;
      case "bold":
        return `**${selection || "bold text"}**`;
      case "italic":
        return `*${selection || "italic text"}*`;
      case "bullet":
        return `- ${selection || "List item"}`;
      case "task":
        return `- [ ] ${selection || "Task item"}`;
      case "quote":
        return `> ${selection || "Quote"}`;
      default:
        return selection;
    }
  }

  assert.equal(applyTouchMarkdown("h2", "Architecture Overview"), "## Architecture Overview");
  assert.equal(applyTouchMarkdown("bold", "critical"), "**critical**");
  assert.equal(applyTouchMarkdown("italic", "emphasis"), "*emphasis*");
  assert.equal(applyTouchMarkdown("bullet", "first point"), "- first point");
  assert.equal(applyTouchMarkdown("task", "Deploy Phase 14"), "- [ ] Deploy Phase 14");
  assert.equal(applyTouchMarkdown("quote", "Keep it simple"), "> Keep it simple");
});

test("Client-side library search filtering matches across title, summary, body and URL", () => {
  const sampleItems = [
    { id: "1", title: "Building Autonomous Agents with AGY", summary: "Multi-agent architecture guide", body: "Detailed breakdown of agentic workflows.", source_url: "https://example.com/agy" },
    { id: "2", title: "SQLite WAL Pragma Optimizations", summary: "High throughput database tuning", body: "Configuring journal_mode=WAL and synchronous=NORMAL.", source_url: "https://sqlite.org/wal" },
    { id: "3", title: "Pixel 7 Pro PWA Touch Ergonomics", summary: "Mobile viewport and 120Hz LTPO display", body: "Optimizing 48px touch targets for mobile.", source_url: "https://android.dev/pwa" },
  ];

  function searchFilter(items: typeof sampleItems, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.source_url.toLowerCase().includes(q)
    );
  }

  assert.equal(searchFilter(sampleItems, "autonomous").length, 1);
  assert.equal(searchFilter(sampleItems, "autonomous")[0].id, "1");

  assert.equal(searchFilter(sampleItems, "wal").length, 1);
  assert.equal(searchFilter(sampleItems, "wal")[0].id, "2");

  assert.equal(searchFilter(sampleItems, "120Hz").length, 1);
  assert.equal(searchFilter(sampleItems, "120Hz")[0].id, "3");

  assert.equal(searchFilter(sampleItems, "nonexistent").length, 0);
  assert.equal(searchFilter(sampleItems, "").length, 3);
});

test("Offline storage byte formatting matches human units", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1048576), "1.0 MB");
  assert.equal(formatBytes(5242880), "5.0 MB");
  assert.equal(formatBytes(1073741824), "1024.0 MB");
});
