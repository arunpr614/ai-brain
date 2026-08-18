import { AlertTriangle, ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ItemRow } from "@/db/client";
import { listNeedsUpgradeItems } from "@/db/items";
import { getTranscriptJobForItem } from "@/db/transcript-jobs";
import { verifySessionCookie } from "@/lib/auth";
import { improvementHint, needsUpgradeReason } from "@/lib/capture/quality";
import {
  NeedsUpgradeClient,
  type NeedsUpgradeGroup,
  type NeedsUpgradeViewItem,
} from "@/components/repair/needs-upgrade-client";

function groupNeedsUpgradeItems(items: ItemRow[]): NeedsUpgradeGroup[] {
  const groups = new Map<string, NeedsUpgradeViewItem[]>();
  for (const item of items) {
    const isYoutube =
      item.source_type === "youtube" ||
      item.source_platform === "youtube" ||
      item.source_platform === "youtube_short";
    const job = isYoutube ? getTranscriptJobForItem(item.id) : null;
    const reason =
      needsUpgradeReason({
        source_platform: item.source_platform,
        capture_quality: item.capture_quality,
        extraction_warning: item.extraction_warning,
      }) ?? "Needs readable text";

    const entry: NeedsUpgradeViewItem = {
      item,
      reason,
      hint: improvementHint(item.source_platform, item.capture_quality),
      hasJob: Boolean(job && (job.state === "pending" || job.state === "running")),
      isYoutube,
    };
    groups.set(reason, [...(groups.get(reason) ?? []), entry]);
  }
  return Array.from(groups, ([reason, groupedItems]) => ({
    reason,
    items: groupedItems,
  }));
}

export default async function NeedsUpgradePage() {
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect("/unlock?next=%2Fneeds-upgrade");
  }

  const items = listNeedsUpgradeItems({ limit: 200 });
  const groups = groupNeedsUpgradeItems(items);

  const totalCount = items.length;
  const youtubeCount = items.filter(
    (i) => i.source_type === "youtube" || i.source_platform?.includes("youtube"),
  ).length;
  const articleCount = totalCount - youtubeCount;

  return (
    <div className="mx-auto max-w-[1020px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10 font-sans">
      <Link
        href="/library"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--quality-needs-upgrade)]">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              Quality Repair Center & Triage
            </div>
            <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
              Needs Upgrade
            </h1>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--text-secondary)]">
              Identify, isolate, and remediate bookmarks with incomplete metadata or missing transcripts
              to restore searchability and Ask readiness.
            </p>
          </div>

          {/* Quality Health Metrics Widget */}
          <div className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-xl shadow-sm text-xs">
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-[var(--text-primary)]">{totalCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">Needs Repair</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-red-400">{youtubeCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">No Captions</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-amber-400">{articleCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">Metadata Only</span>
            </div>
          </div>
        </div>
      </header>

      <NeedsUpgradeClient
        items={items}
        groups={groups}
        totalCount={totalCount}
        youtubeCount={youtubeCount}
        articleCount={articleCount}
      />
    </div>
  );
}
