import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { findItemByUrl } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import { CaptureTabs } from "./tabs";

type Tab = "url" | "pdf" | "note";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; url?: string }>;
}) {
  const { tab, url } = await searchParams;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(captureNextPath({ tab, url }))}`);
  }

  const active: Tab =
    tab === "pdf" ? "pdf" : tab === "note" ? "note" : "url";
  const initialDuplicate =
    active === "url" && url ? findItemByUrl(url) : null;

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
        prefilledUrl={url ?? ""}
        initialDuplicate={
          initialDuplicate
            ? {
                itemId: initialDuplicate.id,
                url: initialDuplicate.source_url ?? url ?? "",
              }
            : null
        }
      />
    </div>
  );
}

function captureNextPath(params: { tab?: string; url?: string }): string {
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.url) qs.set("url", params.url);
  const query = qs.toString();
  return query ? `/capture?${query}` : "/capture";
}
