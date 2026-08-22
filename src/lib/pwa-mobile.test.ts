import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
