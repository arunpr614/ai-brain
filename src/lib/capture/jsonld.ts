import { JSDOM } from "jsdom";

export interface ArticleJsonLd {
  headline: string | null;
  author: string | null;
  datePublished: string | null;
  image: string | null;
  description: string | null;
}

export function extractArticleJsonLd(html: string): ArticleJsonLd | null {
  const dom = new JSDOM(html);
  const scripts = Array.from(
    dom.window.document.querySelectorAll('script[type="application/ld+json"]'),
  );

  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    const parsed = safeJson(raw);
    const candidates = flattenJsonLd(parsed);
    const article = candidates.find(isArticleLike);
    if (article) return normalizeArticle(article);
  }
  return null;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const graph = record["@graph"];
  const own = [record];
  return Array.isArray(graph) ? own.concat(graph.flatMap(flattenJsonLd)) : own;
}

function isArticleLike(record: Record<string, unknown>): boolean {
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((entry) => {
    const value = typeof entry === "string" ? entry.toLowerCase() : "";
    return value === "article" || value === "blogposting" || value === "newsarticle";
  });
}

function normalizeArticle(record: Record<string, unknown>): ArticleJsonLd {
  return {
    headline: asText(record.headline ?? record.name),
    author: authorName(record.author),
    datePublished: asText(record.datePublished ?? record.dateCreated),
    image: imageUrl(record.image),
    description: asText(record.description),
  };
}

function authorName(value: unknown): string | null {
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) {
    return value.map(authorName).filter(Boolean).join(", ") || null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record.name);
  }
  return null;
}

function imageUrl(value: unknown): string | null {
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) return imageUrl(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record.url ?? record.contentUrl);
  }
  return null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? clean(value) : null;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || null;
}
