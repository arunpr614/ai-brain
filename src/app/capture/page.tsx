import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CaptureTabs } from "./tabs";

type Tab = "url" | "pdf" | "note";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; url?: string }>;
}) {
  const { tab, url } = await searchParams;
  const active: Tab =
    tab === "pdf" ? "pdf" : tab === "note" ? "note" : "url";

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <h1 className="mb-6 text-[24px] font-semibold leading-[1.33] tracking-[-0.01em] text-[var(--text-primary)]">
        Capture
      </h1>

      <CaptureTabs active={active} prefilledUrl={url ?? ""} />
    </div>
  );
}
