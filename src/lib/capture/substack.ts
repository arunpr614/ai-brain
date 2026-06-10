import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { CAPTURE_EXTRACTION_VERSION } from "./quality";
import { fetchPublicHtml, CaptureFetchError } from "./http";
import { extractArticleJsonLd } from "./jsonld";
import { extractOpenGraph } from "./opengraph";
import { discoverRssUrls, fetchBestRssEntry } from "./rss";
import { UrlCaptureError } from "./url";
import type { CapturedContent, CaptureQuality } from "./types";

type SubstackBodySource = "readability" | "rss" | "metadata";

export async function extractSubstackFromUrl(url: string): Promise<CapturedContent> {
  let html: string;
  try {
    html = await fetchPublicHtml(url);
  } catch (err) {
    if (err instanceof CaptureFetchError) {
      throw new UrlCaptureError(err.code, err.message);
    }
    throw err;
  }

  const dom = new JSDOM(html, { url });
  const readable = new Readability(dom.window.document).parse();
  const articleBody = readable?.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "";
  const jsonLd = extractArticleJsonLd(html);
  const og = extractOpenGraph(html, url);
  const rssEntry = await fetchBestRssEntry(discoverRssUrls(html, url), og.canonicalUrl ?? url);
  const rssBody = rssEntry?.content ?? rssEntry?.description ?? "";

  const selectedBody = chooseBody(articleBody, rssBody);
  const bodyText = selectedBody.body;
  const title = jsonLd?.headline ?? rssEntry?.title ?? readable?.title?.trim() ?? og.title ?? "Substack post";
  const author = jsonLd?.author ?? rssEntry?.author ?? readable?.byline?.trim() ?? null;
  const description = jsonLd?.description ?? og.description ?? rssEntry?.description ?? readable?.excerpt?.trim() ?? null;
  const publishedAt = parseDate(jsonLd?.datePublished ?? rssEntry?.published);
  const sourceUrl = og.canonicalUrl ?? rssEntry?.link ?? url;
  const thumbnail = jsonLd?.image ?? og.image;
  const quality = substackQuality(bodyText, html, selectedBody.source);

  return {
    title,
    author,
    source_url: sourceUrl,
    body: buildSubstackBody({
      title,
      author,
      publishedAt,
      sourceUrl,
      description,
      body: bodyText || description || "Substack metadata was saved, but full text was not available.",
      quality,
    }),
    extraction_warning: quality === "paywall_preview" ? "paywall_preview" : null,
    source_platform: "substack",
    capture_quality: quality,
    extraction_method: selectedBody.source === "rss" ? "substack_rss_enriched" : "substack_readability_metadata",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: publishedAt,
    thumbnail_url: thumbnail,
    description,
    artifacts: [
      {
        kind: "html_snapshot",
        content_type: "text/html",
        suggested_filename: "substack-page.html",
        body: html,
      },
      {
          kind: "metadata_json",
          content_type: "application/json",
          suggested_filename: "substack-metadata.json",
          body: JSON.stringify({ jsonLd, og, body_source: selectedBody.source, paywall_signal: hasStrongPaywallSignal(bodyText, html) }, null, 2),
        },
      ...(rssEntry
        ? [{
            kind: "rss_entry_json",
            content_type: "application/json",
            suggested_filename: "substack-rss-entry.json",
            body: JSON.stringify(rssEntry, null, 2),
          }]
        : []),
    ],
  };
}

function chooseBody(
  readabilityBody: string,
  rssBody: string,
): { body: string; source: SubstackBodySource } {
  if (!readabilityBody && rssBody) return { body: rssBody, source: "rss" };
  if (rssBody.length > readabilityBody.length * 1.2 && rssBody.length > 800) {
    return { body: rssBody, source: "rss" };
  }
  if (readabilityBody) return { body: readabilityBody, source: "readability" };
  return { body: "", source: "metadata" };
}

function substackQuality(
  body: string,
  html: string,
  source: SubstackBodySource,
): CaptureQuality {
  const paywall = hasStrongPaywallSignal(body, html);
  if (paywall && source !== "metadata") return "paywall_preview";
  if (paywall) return "paywall_preview";
  if (source === "metadata") return "metadata_only";
  if (body.length >= 500) return "full_text";
  if (body.length >= 100) return "full_text";
  return "metadata_only";
}

function hasStrongPaywallSignal(body: string, html: string): boolean {
  const combined = `${body}\n${html.slice(0, 10_000)}`.toLowerCase();
  return (
    combined.includes("subscribe to continue reading") ||
    combined.includes("subscribe to keep reading") ||
    combined.includes("paid subscribers") ||
    combined.includes("for paid subscribers") ||
    combined.includes("only paid subscribers") ||
    combined.includes("upgrade to paid") ||
    combined.includes("this post is for paid subscribers") ||
    combined.includes("unlock this post") ||
    combined.includes("become a paid subscriber")
  );
}

function buildSubstackBody(input: {
  title: string;
  author: string | null;
  publishedAt: number | null;
  sourceUrl: string;
  description: string | null;
  body: string;
  quality: CaptureQuality;
}): string {
  const header = [
    `Title: ${input.title}`,
    `Author: ${input.author ?? "Unknown"}`,
    input.publishedAt ? `Published: ${new Date(input.publishedAt).toISOString()}` : null,
    `URL: ${input.sourceUrl}`,
    `Capture quality: ${input.quality}`,
  ].filter(Boolean);
  const sections = [header.join("\n")];
  if (input.description) sections.push(`Description:\n${input.description}`);
  sections.push(`Article:\n${input.body.trim()}`);
  return sections.join("\n\n");
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}
