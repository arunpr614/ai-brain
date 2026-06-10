import { JSDOM } from "jsdom";
import { fetchPublicHtml } from "./http";
import { absolutize } from "./opengraph";

export interface RssEntry {
  title: string | null;
  link: string | null;
  author: string | null;
  published: string | null;
  description: string | null;
  content: string | null;
}

export function discoverRssUrls(html: string, pageUrl: string): string[] {
  const dom = new JSDOM(html, { url: pageUrl });
  const urls = new Set<string>();
  dom.window.document
    .querySelectorAll('link[rel="alternate"]')
    .forEach((node) => {
      const type = node.getAttribute("type")?.toLowerCase() ?? "";
      const href = node.getAttribute("href");
      if (href && (type.includes("rss") || type.includes("atom") || href.endsWith("/feed"))) {
        const absolute = absolutize(href, pageUrl);
        if (absolute) urls.add(absolute);
      }
    });
  try {
    const page = new URL(pageUrl);
    urls.add(`${page.origin}/feed`);
  } catch {}
  return Array.from(urls);
}

export async function fetchBestRssEntry(
  feedUrls: string[],
  pageUrl: string,
): Promise<RssEntry | null> {
  for (const feedUrl of feedUrls.slice(0, 3)) {
    try {
      const xml = await fetchPublicHtml(feedUrl);
      const entry = findMatchingRssEntry(xml, pageUrl);
      if (entry) return entry;
    } catch {
      // RSS enrichment is best-effort; page body should still save.
    }
  }
  return null;
}

export function findMatchingRssEntry(xml: string, pageUrl: string): RssEntry | null {
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const nodes = Array.from(doc.querySelectorAll("item, entry"));
  const page = normalizeUrlForMatch(pageUrl);
  const slug = slugForMatch(pageUrl);

  for (const node of nodes) {
    const link =
      text(node, "link") ??
      node.querySelector("link[href]")?.getAttribute("href") ??
      text(node, "guid");
    const normalized = link ? normalizeUrlForMatch(link) : null;
    if (normalized && normalized === page) return entryFromNode(node);
    if (slug && link && slugForMatch(link) === slug) return entryFromNode(node);
  }
  return null;
}

function entryFromNode(node: Element): RssEntry {
  return {
    title: text(node, "title"),
    link: text(node, "link") ?? node.querySelector("link[href]")?.getAttribute("href") ?? null,
    author: text(node, "author") ?? text(node, "dc\\:creator") ?? text(node, "creator"),
    published: text(node, "pubDate") ?? text(node, "published") ?? text(node, "updated"),
    description: htmlToText(text(node, "description") ?? text(node, "summary")),
    content: htmlToText(text(node, "content\\:encoded") ?? text(node, "encoded") ?? text(node, "content")),
  };
}

function text(node: Element, selector: string): string | null {
  return node.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || null;
}

function htmlToText(value: string | null): string | null {
  if (!value) return null;
  const dom = new JSDOM(`<main>${value}</main>`);
  const textContent = dom.window.document.body.textContent?.replace(/\n{3,}/g, "\n\n").trim();
  return textContent || null;
}

function normalizeUrlForMatch(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function slugForMatch(value: string): string | null {
  try {
    const parts = new URL(value).pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}
