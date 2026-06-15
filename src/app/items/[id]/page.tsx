import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CirclePlus,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  MessageSquare,
  Minimize2,
  Quote,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItemAction } from "@/app/actions";
import { CollectionEditor } from "@/components/collection-editor";
import { ItemEnrichmentWatch } from "@/components/item-enrichment-watch";
import { RelatedItems } from "@/components/related-items";
import { ScrollToHash } from "@/components/scroll-to-hash";
import { TagEditor } from "@/components/tag-editor";
import {
  listCollections,
  listCollectionsForItem,
} from "@/db/collections";
import { listChunksForItem } from "@/db/chunks";
import type { ItemRow } from "@/db/client";
import { getItem } from "@/db/items";
import { listTagsForItem } from "@/db/tags";
import { listTopicsForItem, type ItemTopicRow } from "@/db/topics";
import { getItemProcessingStatus, type ItemProcessingStatus } from "@/lib/items/status";
import {
  improvementHint,
  isLimitedCaptureQuality,
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import {
  parseCaptureResultState,
  toCaptureResultPayload,
  type CaptureResultPayload,
  type CaptureResultState,
} from "@/lib/capture/result";
import { findRelatedItems } from "@/lib/related";

function parseQuotes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function extractionWarningMessage(code: string): string {
  if (code === "youtube_antibot_metadata_only") {
    return "Transcript extraction was blocked by YouTube's sign-in check. This video was saved with metadata only.";
  }
  if (code === "youtube_transcript_fetch_metadata_only") {
    return "Transcript fetching failed after video metadata was found. This video was saved with metadata only.";
  }
  if (code === "no_transcript") return "No transcript was available for this video.";
  if (code === "transcript_truncated_2h") return "Transcript was truncated at 2 hours.";
  return code;
}

function captureSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case "android":
      return "Android";
    case "extension":
      return "Extension";
    case "telegram":
      return "Telegram";
    case "system":
      return "System";
    case "web":
      return "Web";
    default:
      return "Unknown";
  }
}

type CaptureResultKind = "url" | "pdf" | "note";

function parseCaptureResultKind(value: string | undefined): CaptureResultKind | null {
  if (value === "url" || value === "pdf" || value === "note") return value;
  return null;
}

function stateFromLegacyCaptureKind(
  item: ItemRow,
  kind: CaptureResultKind | null,
): CaptureResultState | null {
  if (!kind) return null;
  return toCaptureResultPayload(item).state;
}

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    highlight?: string;
    mode?: string;
    capture?: string;
    capture_state?: string;
    repair?: string;
  }>;
}) {
  const { id } = await params;
  const { highlight, mode, capture, capture_state, repair } = await searchParams;
  const item = getItem(id);
  if (!item) notFound();

  const captured = new Date(item.captured_at).toLocaleString();
  const tags = listTagsForItem(item.id).filter((tag) => tag.kind === "manual");
  const topics = listTopicsForItem(item.id);
  const attachedCollections = listCollectionsForItem(item.id);
  const availableCollections = listCollections("manual");
  const quotes = parseQuotes(item.quotes);
  const hasDigest =
    item.enrichment_state === "done" && (item.summary || quotes.length > 0);
  const hasAnyCollections =
    attachedCollections.length > 0 || availableCollections.length > 0;
  const processingStatus = getItemProcessingStatus(item.id);
  const platform = platformLabel(item.source_platform, item.source_type);
  const quality = qualityLabel(item.capture_quality);
  const hint = improvementHint(item.source_platform, item.capture_quality);
  const upgradeReason = needsUpgradeReason({
    source_platform: item.source_platform,
    capture_quality: item.capture_quality,
    extraction_warning: item.extraction_warning,
  });
  const limitedQuality = isLimitedCaptureQuality(item.capture_quality) || Boolean(upgradeReason);
  const captureResultKind = parseCaptureResultKind(capture);
  const parsedCaptureState = parseCaptureResultState(capture_state);
  const captureResultState =
    parsedCaptureState === "failed_without_saved_item"
      ? null
      : parsedCaptureState ?? stateFromLegacyCaptureKind(item, captureResultKind);
  const captureResult = captureResultState
    ? toCaptureResultPayload(item, { state: captureResultState })
    : null;
  const repairQueued = repair === "queued";

  // T-12: when arriving via an Ask citation chip, resolve the chunk body so
  // we can render a highlight panel with an anchor the scroll-to-hash hook
  // can find. Silently ignore invalid/foreign chunk_ids — the chip just
  // looks like a regular item link.
  const highlightedChunk = highlight
    ? listChunksForItem(item.id).find((c) => c.id === highlight) ?? null
    : null;

  // T-15 (EXP-3): pure DB operation — no network / Ollama. Safe on every
  // item-detail render. Returns [] if this item has no embedded chunks yet,
  // and RelatedItems component renders nothing in that case.
  const related = findRelatedItems(item.id, { limit: 5 });

  if (mode === "focus") {
    return (
      <FocusReadMode
        item={item}
        captured={captured}
        platform={platform}
        quality={quality}
        limitedQuality={limitedQuality}
        upgradeReason={upgradeReason}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      <ScrollToHash />
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      {repairQueued && <RepairResultBanner item={item} />}

      {captureResult && (
        <CaptureResultBanner
          item={item}
          result={captureResult}
          platform={platform}
          quality={quality}
          limitedQuality={limitedQuality}
          upgradeReason={upgradeReason}
        />
      )}

      {highlightedChunk && (
        <aside
          id={`chunk-${highlightedChunk.id}`}
          className="mb-8 rounded-lg border border-[var(--accent-9)] bg-[var(--accent-3)] p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--accent-11)]">
            <Quote className="h-3.5 w-3.5" strokeWidth={2} />
            Cited passage
          </div>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {highlightedChunk.body}
          </p>
        </aside>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,68ch)_360px]">
        {/* LEFT: original content */}
        <article className="article">
          <header className="mb-6 border-b border-[var(--border)] pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-sans text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)]">
                {item.title}
              </h1>
              <ItemEnrichmentWatch
                itemId={item.id}
                initialState={item.enrichment_state}
              />
            </div>
            <ItemProcessingBadge status={processingStatus} />
            <SourceTrustStrip
              item={item}
              captured={captured}
              platform={platform}
              quality={quality}
              limitedQuality={limitedQuality}
            />

            {item.source_url && (
              <p className="mt-2">
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-sans text-xs text-[var(--accent-11)] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  {new URL(item.source_url).hostname}
                </a>
              </p>
            )}

            {item.extraction_warning && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--warning)] bg-[var(--surface)] px-2 py-1 font-sans text-xs text-[var(--warning)]">
                ⚠ {extractionWarningMessage(item.extraction_warning)}
              </p>
            )}
            {limitedQuality && (
              <WeakSourceRepairPanel
                item={item}
                upgradeReason={upgradeReason}
              />
            )}
          </header>

          <div className="whitespace-pre-wrap">{item.body}</div>

          <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
            <Link
              href={`/items/${item.id}?mode=focus`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
              Focus mode
            </Link>
            <Link
              href={`/items/${item.id}/ask`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
              Ask this item
            </Link>
            <a
              href={`/api/items/${item.id}/export.md`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Export as .md
            </a>
            <form
              action={async () => {
                "use server";
                await deleteItemAction(item.id);
              }}
              className="ml-auto"
            >
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--surface)]"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Delete
              </button>
            </form>
          </footer>
        </article>

        {/* RIGHT: Collections + AI digest */}
        <aside className="flex flex-col gap-6 font-sans text-sm lg:sticky lg:top-8 lg:self-start">
          {/* F-302: inline tag editor — always visible so the user can
              attach/detach tags without going to /settings/tags. */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Tags
            </p>
            <TagEditor itemId={item.id} tags={tags} />
          </div>

          <IncludedTopicsPanel topics={topics} />

          {/* T-15 (EXP-3): related items by semantic similarity. Hidden
              when the item has no embeddings yet. */}
          <RelatedItems items={related} />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Capture
            </p>
            <dl className="flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between gap-3">
                <dt>Platform</dt>
                <dd className="text-right text-[var(--text-primary)]">{platform}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Quality</dt>
                <dd className="text-right text-[var(--text-primary)]">{quality}</dd>
              </div>
              {item.extraction_method && (
                <div className="flex justify-between gap-3">
                  <dt>Method</dt>
                  <dd className="text-right text-[var(--text-primary)]">{item.extraction_method}</dd>
                </div>
              )}
              {item.capture_source && (
                <div className="flex justify-between gap-3">
                  <dt>Via</dt>
                  <dd className="text-right text-[var(--text-primary)]">{item.capture_source}</dd>
                </div>
              )}
              {item.published_at && (
                <div className="flex justify-between gap-3">
                  <dt>Published</dt>
                  <dd className="text-right text-[var(--text-primary)]">
                    {new Date(item.published_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
            {item.description && (
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                {item.description}
              </p>
            )}
            {hint && (
              <p className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {hint}
              </p>
            )}
          </div>

          {/* F-301: Collections editor — always visible so the user can
              attach/detach without waiting for enrichment to finish. */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Collections
            </p>
            {hasAnyCollections ? (
              <CollectionEditor
                itemId={item.id}
                attached={attachedCollections}
                available={availableCollections}
              />
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Create one in{" "}
                <Link
                  href="/settings/collections"
                  className="text-[var(--accent-11)] hover:underline"
                >
                  Settings → Collections
                </Link>{" "}
                to start organizing.
              </p>
            )}
          </div>

          {hasDigest ? (
            <div className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              {item.category && (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Category
                  </p>
                  <span className="inline-flex rounded-full bg-[var(--accent-3)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-11)]">
                    {item.category}
                  </span>
                </div>
              )}

              {item.summary && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Summary
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)]">
                    {item.summary}
                  </div>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Key quotes
                  </p>
                  <ul className="flex flex-col gap-2">
                    {quotes.map((q, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[var(--accent-9)] pl-3 italic text-[var(--text-secondary)]"
                      >
                        &ldquo;{q}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-[var(--text-muted)]">
                AI-generated summary.
              </p>
            </div>
          ) : (
            <DigestPlaceholder state={item.enrichment_state} />
          )}
        </aside>
      </div>
    </div>
  );
}

function RepairResultBanner({ item }: { item: ItemRow }) {
  return (
    <section
      aria-label="Repair result"
      className="mb-8 rounded-lg border border-[var(--success)] bg-[var(--surface)] p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Source text updated
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              AI enrichment and semantic indexing are queued. Ask may improve after those finish.
            </p>
          </div>
        </div>
        <Link
          href={`/items/${item.id}/repair`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          Edit repair
        </Link>
      </div>
    </section>
  );
}

function WeakSourceRepairPanel({
  item,
  upgradeReason,
}: {
  item: ItemRow;
  upgradeReason: string | null;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--quality-needs-upgrade)] bg-[var(--surface)] p-4 font-sans text-sm">
      <p className="font-medium text-[var(--quality-needs-upgrade)]">
        {upgradeReason ?? "This source needs more readable text."}
      </p>
      <p className="mt-1 text-[var(--text-secondary)]">
        Add source text or a transcript to rebuild search, Ask, and AI topics from the repaired content.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/items/${item.id}/repair`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          Add text
        </Link>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Source
          </a>
        )}
      </div>
    </div>
  );
}

function CaptureResultBanner({
  item,
  result,
  platform,
  quality,
  limitedQuality,
  upgradeReason,
}: {
  item: ItemRow;
  result: CaptureResultPayload;
  platform: string;
  quality: string;
  limitedQuality: boolean;
  upgradeReason: string | null;
}) {
  const isWarning =
    limitedQuality ||
    result.state === "error_with_saved_item" ||
    result.state === "duplicate_existing";
  const label = captureResultTitle(item, result, limitedQuality);
  const Icon = isWarning ? AlertTriangle : CheckCircle2;
  return (
    <section
      aria-label="Capture result"
      className={`mb-8 rounded-lg border bg-[var(--surface)] p-4 ${
        isWarning
          ? "border-[var(--quality-needs-upgrade)]"
          : "border-[var(--success)]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Icon
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              isWarning
                ? "text-[var(--quality-needs-upgrade)]"
                : "text-[var(--success)]"
            }`}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {label}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {result.state === "created_needs_upgrade" && upgradeReason
                ? upgradeReason
                : result.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                {platform}
              </span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                via {captureSourceLabel(item.capture_source)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  limitedQuality
                    ? "border-[var(--quality-needs-upgrade)] text-[var(--quality-needs-upgrade)]"
                    : "border-[var(--border)]"
                }`}
              >
                {quality}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(limitedQuality || result.recommendedAction === "upgrade") && (
            <Link
              href={`/items/${item.id}/repair`}
              className="inline-flex h-8 items-center rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
            >
              Add text
            </Link>
          )}
          <Link
            href={`/items/${item.id}/ask`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
            Ask
          </Link>
          <Link
            href="/capture"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            <CirclePlus className="h-3.5 w-3.5" strokeWidth={2} />
            Capture
          </Link>
        </div>
      </div>
    </section>
  );
}

function captureResultTitle(
  item: ItemRow,
  result: CaptureResultPayload,
  limitedQuality: boolean,
): string {
  switch (result.state) {
    case "duplicate_existing":
      return "Already saved";
    case "updated_existing":
      return "Existing source upgraded";
    case "error_with_saved_item":
      return "Saved with issues";
    case "created_metadata_only":
    case "created_preview_only":
    case "created_needs_upgrade":
      return "Source saved with limited text";
    case "created_transcript":
      return "Transcript saved";
    case "created_full_text":
      if (item.source_type === "pdf") return "PDF saved";
      if (item.source_type === "note") return "Note saved";
      return limitedQuality ? "Source saved with limited text" : "Source saved";
    case "failed_without_saved_item":
      return "Capture failed";
  }
}

function SourceTrustStrip({
  item,
  captured,
  platform,
  quality,
  limitedQuality,
}: {
  item: ItemRow;
  captured: string;
  platform: string;
  quality: string;
  limitedQuality: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 font-sans text-xs text-[var(--text-secondary)]">
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
        <BookOpen className="h-3 w-3" strokeWidth={2} />
        {platform}
      </span>
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
        via {captureSourceLabel(item.capture_source)}
      </span>
      <span
        className={`inline-flex rounded-full border bg-[var(--surface)] px-2.5 py-1 font-medium ${
          limitedQuality
            ? "border-[var(--quality-needs-upgrade)] text-[var(--quality-needs-upgrade)]"
            : "border-[var(--border)] text-[var(--text-secondary)]"
        }`}
      >
        {quality}
      </span>
      {item.author && (
        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
          {item.author}
        </span>
      )}
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
        Saved {captured}
      </span>
      {item.total_pages && (
        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
          {item.total_pages} pages
        </span>
      )}
      {item.total_chars && (
        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
          {item.total_chars.toLocaleString()} chars
        </span>
      )}
    </div>
  );
}

function IncludedTopicsPanel({ topics }: { topics: ItemTopicRow[] }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Included Topics
        </p>
        <span className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          AI
        </span>
      </div>
      {topics.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                title={topic.evidence ?? `View ${topic.name}`}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
              >
                <Sparkles
                  className="h-3 w-3 shrink-0 text-[var(--accent-11)]"
                  strokeWidth={2}
                />
                <span className="truncate">{topic.name}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            AI-detected from this source.
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          No included topics yet.
        </p>
      )}
    </div>
  );
}

function FocusReadMode({
  item,
  captured,
  platform,
  quality,
  limitedQuality,
  upgradeReason,
}: {
  item: ItemRow;
  captured: string;
  platform: string;
  quality: string;
  limitedQuality: boolean;
  upgradeReason: string | null;
}) {
  const bodyIsThin = item.body.trim().length < 160;
  return (
    <div
      data-focus-mode="true"
      className="mx-auto max-w-[820px] px-6 py-8 md:px-8 md:py-10"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <Link
          href={`/items/${item.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Minimize2 className="h-3.5 w-3.5" strokeWidth={2} />
          Exit focus
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/items/${item.id}/ask`}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
            Ask
          </Link>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              Source
            </a>
          )}
        </div>
      </div>

      <article className="article">
        <header className="mb-7">
          <h1 className="font-sans text-[30px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)]">
            {item.title}
          </h1>
          <SourceTrustStrip
            item={item}
            captured={captured}
            platform={platform}
            quality={quality}
            limitedQuality={limitedQuality}
          />
        </header>

        {(upgradeReason || (limitedQuality && bodyIsThin)) && (
          <div className="mb-7 rounded-lg border border-[var(--quality-needs-upgrade)] bg-[var(--surface)] p-4 font-sans text-sm">
            <p className="font-medium text-[var(--quality-needs-upgrade)]">
              {upgradeReason ?? "This source may need more readable text."}
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Focus mode is showing the saved content, but this source may answer
              better after adding text or a transcript.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/items/${item.id}/repair`}
                className="inline-flex h-8 items-center rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
              >
                Add text
              </Link>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                >
                  Source
                </a>
              )}
            </div>
          </div>
        )}

        <div className="whitespace-pre-wrap">{item.body}</div>
      </article>
    </div>
  );
}

function ItemProcessingBadge({ status }: { status: ItemProcessingStatus }) {
  const tone =
    status.state === "semantic_indexing_ready"
      ? "border-[var(--success)] text-[var(--success)]"
      : status.state === "semantic_indexing_failed"
        ? "border-[var(--danger)] text-[var(--danger)]"
        : "border-[var(--border)] text-[var(--text-secondary)]";
  return (
    <p
      title={status.detail}
      className={`mt-3 inline-flex max-w-full items-center rounded-md border bg-[var(--surface)] px-2 py-1 font-sans text-xs ${tone}`}
    >
      {status.label}
    </p>
  );
}

function DigestPlaceholder({
  state,
}: {
  state: "pending" | "running" | "batched" | "done" | "error";
}) {
  const copy =
    state === "error"
      ? "AI enrichment failed. Check provider status in Settings."
      : state === "running"
        ? "AI digest will appear here once the enrichment worker finishes."
        : "AI digest will appear here once the enrichment worker picks this item up.";
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 font-sans text-sm text-[var(--text-secondary)]">
      {copy}
    </div>
  );
}
