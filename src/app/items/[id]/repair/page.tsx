import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getItem } from "@/db/items";
import { getActiveTranscriptSourceForItem } from "@/db/transcripts";
import { verifySessionCookie } from "@/lib/auth";
import {
  captureSourceLabel,
  improvementHint,
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { isYoutubeItem } from "@/lib/capture/policy";
import {
  buildYoutubeTranscriptRecoveryStatus,
  type YoutubeTranscriptRecoveryOption,
} from "@/lib/capture/transcripts/recovery-options";
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
  const isYoutube = isYoutubeItem(item);
  const reason =
    needsUpgradeReason({
      source_platform: item.source_platform,
      capture_quality: item.capture_quality,
      extraction_warning: item.extraction_warning,
    }) ?? "Needs readable text";
  const hint = improvementHint(item.source_platform, item.capture_quality);
  const defaultTextKind = isYoutube ? "transcript" : "text";
  const activeTranscriptSource = isYoutube
    ? getActiveTranscriptSourceForItem(item.id)
    : null;
  const transcriptRecovery = isYoutube
    ? buildYoutubeTranscriptRecoveryStatus({
        item,
        activeTranscriptSource,
        repairHref: `/items/${item.id}/repair`,
      })
    : null;

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
            via {captureSourceLabel(item.capture_source)}
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

      {transcriptRecovery && (
        <TranscriptRecoveryOptions options={transcriptRecovery.options} />
      )}

      <RepairForm
        itemId={item.id}
        title={item.title}
        defaultTextKind={defaultTextKind}
        minChars={MIN_REPAIR_TEXT_CHARS}
        allowTranscriptFileUpload={isYoutube}
      />
    </div>
  );
}

function TranscriptRecoveryOptions({
  options,
}: {
  options: YoutubeTranscriptRecoveryOption[];
}) {
  return (
    <section
      aria-labelledby="transcript-recovery-heading"
      className="mb-6 border-y border-[var(--border)] py-4"
    >
      <div className="mb-3">
        <h2
          id="transcript-recovery-heading"
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          Transcript recovery options
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Use pasted text or a transcript file now. Other routes stay visible only
          where ownership, authorization, and production wiring are still missing.
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {options.map((option) => (
          <li
            key={option.id}
            data-recovery-option-id={option.id}
            data-recovery-option-status={option.status}
            className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RecoveryStatusBadge status={option.status} />
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {option.label}
                </h3>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {option.description}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {option.blocker ?? option.requires}
              </p>
            </div>
            {option.href && option.actionLabel && (
              <a
                href={option.href}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-9"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                {option.actionLabel}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecoveryStatusBadge({
  status,
}: {
  status: YoutubeTranscriptRecoveryOption["status"];
}) {
  const config =
    status === "available"
      ? {
          label: "Available",
          className: "border-[var(--quality-good)] text-[var(--quality-good)]",
          icon: CheckCircle2,
        }
      : status === "gated"
        ? {
            label: "Not wired",
            className: "border-[var(--border-strong)] text-[var(--text-secondary)]",
            icon: LockKeyhole,
          }
        : {
            label: "Blocked",
            className: "border-[var(--quality-needs-upgrade)] text-[var(--quality-needs-upgrade)]",
            icon: ShieldAlert,
          };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {config.label}
    </span>
  );
}
