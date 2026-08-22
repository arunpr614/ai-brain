import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { findItemByUrl } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import { CaptureTabs } from "./tabs";

type Tab = "url" | "pdf" | "note";

function extractUrlFromText(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; url?: string; text?: string; title?: string }>;
}) {
  const { tab, url: rawUrl, text, title } = await searchParams;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(captureNextPath({ tab, url: rawUrl, text, title }))}`);
  }

  const extractedUrl = rawUrl?.trim() || extractUrlFromText(text) || "";
  const hasExtractedUrl = Boolean(extractedUrl);

  let active: Tab;
  if (tab === "pdf" || tab === "note") {
    active = tab;
  } else if (hasExtractedUrl) {
    active = "url";
  } else if (text || title) {
    active = "note";
  } else {
    active = "url";
  }

  const initialDuplicate =
    active === "url" && extractedUrl ? findItemByUrl(extractedUrl) : null;

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10">
      <Link
        href="/library"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <header className="mb-6">
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Capture
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Save a URL, PDF, or note to AI Memory.
        </p>
      </header>

      <CaptureTabs
        active={active}
        prefilledUrl={extractedUrl}
        prefilledTitle={title ?? ""}
        prefilledBody={!hasExtractedUrl && text ? text : ""}
        initialDuplicate={
          initialDuplicate
            ? {
                itemId: initialDuplicate.id,
                url: initialDuplicate.source_url ?? extractedUrl,
              }
            : null
        }
      />
    </div>
  );
}

function captureNextPath(params: { tab?: string; url?: string; text?: string; title?: string }): string {
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.url) qs.set("url", params.url);
  if (params.text) qs.set("text", params.text);
  if (params.title) qs.set("title", params.title);
  const query = qs.toString();
  return query ? `/capture?${query}` : "/capture";
}

