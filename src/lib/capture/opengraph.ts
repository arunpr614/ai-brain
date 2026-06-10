import { JSDOM } from "jsdom";

export interface OpenGraphMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  canonicalUrl: string | null;
  siteName: string | null;
}

export function extractOpenGraph(html: string, pageUrl: string): OpenGraphMetadata {
  const dom = new JSDOM(html, { url: pageUrl });
  const doc = dom.window.document;

  const title =
    meta(doc, "og:title") ??
    meta(doc, "twitter:title") ??
    doc.querySelector("title")?.textContent?.trim() ??
    null;
  const description =
    meta(doc, "og:description") ??
    meta(doc, "twitter:description") ??
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ??
    null;
  const image = absolutize(
    meta(doc, "og:image") ?? meta(doc, "twitter:image"),
    pageUrl,
  );
  const canonicalUrl = absolutize(
    meta(doc, "og:url") ?? doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    pageUrl,
  );
  const siteName = meta(doc, "og:site_name");

  return {
    title: clean(title),
    description: clean(description),
    image,
    canonicalUrl,
    siteName: clean(siteName),
  };
}

function meta(doc: Document, property: string): string | null {
  const selector =
    property.startsWith("og:") || property.startsWith("twitter:")
      ? `meta[property="${property}"], meta[name="${property}"]`
      : `meta[name="${property}"]`;
  return doc.querySelector(selector)?.getAttribute("content")?.trim() || null;
}

export function absolutize(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || null;
}
