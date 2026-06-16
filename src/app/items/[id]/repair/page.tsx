import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getItem } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import {
  improvementHint,
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { MIN_REPAIR_TEXT_CHARS } from "@/lib/repair/item-repair";
import { RepairForm } from "./repair-form";

export default async function RepairItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(`/items/${id}/repair`)}`);
  }

  const item = getItem(id);
  if (!item) notFound();

  const platform = platformLabel(item.source_platform, item.source_type);
  const quality = qualityLabel(item.capture_quality);
  const reason =
    needsUpgradeReason({
      source_platform: item.source_platform,
      capture_quality: item.capture_quality,
      extraction_warning: item.extraction_warning,
    }) ?? "Needs readable text";
  const hint = improvementHint(item.source_platform, item.capture_quality);
  const defaultTextKind =
    item.source_platform === "youtube" || item.source_platform === "youtube_short"
      ? "transcript"
      : "text";

  return (
    <div className="mx-auto max-w-[760px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10">
      <Link
        href={`/items/${item.id}`}
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to item
      </Link>

      <header className="mb-6 border-b border-[var(--border)] pb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--quality-needs-upgrade)]">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
          {reason}
        </div>
        <h1 className="text-[28px] font-semibold leading-[1.25] text-[var(--text-primary)]">
          Repair source text
        </h1>
        <p className="mt-2 break-words text-sm leading-6 text-[var(--text-secondary)]">
          {item.title}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {platform}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {quality}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            via {item.capture_source}
          </span>
        </div>
        {hint && (
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
            {hint}
          </p>
        )}
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--accent-11)] hover:underline md:min-h-0"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Open source
          </a>
        )}
      </header>

      <RepairForm
        itemId={item.id}
        title={item.title}
        defaultTextKind={defaultTextKind}
        minChars={MIN_REPAIR_TEXT_CHARS}
      />
    </div>
  );
}
