import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CirclePlus,
  Download,
  EyeOff,
  ExternalLink,
  FileText,
  Maximize2,
  MessageSquare,
  Minimize2,
  Quote,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteItemAction } from "@/app/actions";
import { ignoreTranscriptJobAction, retryTranscriptJobAction } from "@/app/review/actions";
import { CollectionEditor } from "@/components/collection-editor";
import { ItemEnrichmentWatch } from "@/components/item-enrichment-watch";
import { ItemCompanionTabs } from "@/components/item-companion-tabs";
import { ManualNoteEditor } from "@/components/manual-note-editor";
import { ItemWorkflowSection } from "@/components/processing/workflow-controls";
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
import {
  getTranscriptJobForItem,
  listTranscriptAttemptsForItem,
  type TranscriptAttemptRow,
  type TranscriptJobRow,
} from "@/db/transcript-jobs";
import { listTagsForItem } from "@/db/tags";
import { listTopicsForItem, type ItemTopicRow } from "@/db/topics";
import {
  getActiveTranscriptSourceForItem,
  listTranscriptSegmentsForSource,
  type TranscriptSegmentRow,
  type TranscriptSourceRow,
} from "@/db/transcripts";
import { getItemProcessingStatus, type ItemProcessingStatus } from "@/lib/items/status";
import {
  captureSourceLabel,
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
import { verifySessionCookie } from "@/lib/auth";
import { manualNotesUiEnabled, noteFocusModeEnabled } from "@/lib/notes/flags";
import { canUpgradeWithPastedText } from "@/lib/capture/upgrade-policy";
import { findRelatedItems } from "@/lib/related";
import {
  processingNavigationEnabled,
  processingReadEnabled,
  processingWriteEnabled,
} from "@/lib/processing/flags";
import { UpgradeTextForm } from "./upgrade-text-form";

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

function isYoutubeSource(item: ItemRow): boolean {
  return (
    item.source_type === "youtube" ||
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short"
  );
}

type CaptureResultKind = "url" | "pdf" | "note";
type ItemDetailTab = "original" | "digest" | "ask" | "related" | "details" | "notes";
const TRANSCRIPT_PANEL_SEGMENT_PREVIEW_LIMIT = 200;

type TranscriptPreview = {
  source: TranscriptSourceRow;
  segments: TranscriptSegmentRow[];
  hiddenCount: number;
};

function parseCaptureResultKind(value: string | undefined): CaptureResultKind | null {
  if (value === "url" || value === "pdf" || value === "note") return value;
  return null;
}

function parseItemDetailTab(value: string | undefined, notesEnabled: boolean): ItemDetailTab {
  if (
    value === "digest" ||
    value === "ask" ||
    value === "related" ||
    value === "details" ||
    (notesEnabled && value === "notes")
  ) {
    return value;
  }
  return "original";
}

function validatedProcessingReturn(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://ai-memory.local");
    if (url.origin !== "https://ai-memory.local" || url.pathname !== "/processing") return null;
    const allowed = new Set(["view", "group", "sort", "userTag", "aiTopic", "noUserTags", "noAiTopics"]);
    const normalized = new URLSearchParams();
    for (const [key, entry] of url.searchParams) {
      if (allowed.has(key) && entry.length <= 128) normalized.append(key, entry);
    }
    return normalized.size ? `/processing?${normalized}` : "/processing";
  } catch {
    return null;
  }
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
    note_mode?: string;
    repair?: string;
    tab?: string;
    return?: string;
    anchor?: string;
  }>;
}) {
  const { id } = await params;
  const detailParams = await searchParams;
  const { highlight, mode, capture, capture_state, note_mode, repair, tab, anchor } = detailParams;
  const processingReturn = validatedProcessingReturn(detailParams.return);
  const notesEnabled = manualNotesUiEnabled();
  const focusEnabled = notesEnabled && noteFocusModeEnabled();
  const validNoteFocusRequest =
    focusEnabled && note_mode === "focus" && mode !== "focus";
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(itemDetailNextPath({
      id,
      highlight,
      mode,
      capture,
      capture_state,
      note_mode: validNoteFocusRequest ? "focus" : undefined,
      repair,
      tab: validNoteFocusRequest ? "notes" : tab,
    }))}`);
  }

  if (
    note_mode !== undefined &&
    (!validNoteFocusRequest || tab !== "notes")
  ) {
    redirect(itemDetailNextPath({
      id,
      highlight,
      mode,
      capture,
      capture_state,
      note_mode: validNoteFocusRequest ? "focus" : undefined,
      repair,
      tab: validNoteFocusRequest ? "notes" : tab,
    }));
  }

  const item = getItem(id);
  if (!item) notFound();
  const activeTranscriptSource = getActiveTranscriptSourceForItem(item.id);
  const transcriptPreview =
    activeTranscriptSource && activeTranscriptSource.segment_count > 0
      ? {
          source: activeTranscriptSource,
          segments: listTranscriptSegmentsForSource(activeTranscriptSource.id, {
            limit: TRANSCRIPT_PANEL_SEGMENT_PREVIEW_LIMIT,
          }),
          hiddenCount: Math.max(
            0,
            activeTranscriptSource.segment_count - TRANSCRIPT_PANEL_SEGMENT_PREVIEW_LIMIT,
          ),
        }
      : null;

  const captured = new Date(item.captured_at).toLocaleString();
  const tags = listTagsForItem(item.id).filter((tag) => tag.kind === "manual");
  const topics = listTopicsForItem(item.id);
  const attachedCollections = listCollectionsForItem(item.id);
  const availableCollections = listCollections("manual");
  const quotes = parseQuotes(item.quotes);
  const hasDigest =
    item.enrichment_state === "done" &&
    (Boolean(item.summary) || quotes.length > 0);
  const hasAnyCollections =
    attachedCollections.length > 0 || availableCollections.length > 0;
  const processingStatus = getItemProcessingStatus(item.id);
  const platform = platformLabel(item.source_platform, item.source_type);
  const quality = qualityLabel(item.capture_quality);
  const hint = improvementHint(item.source_platform, item.capture_quality);
  const canUpgradeWithText = canUpgradeWithPastedText(item);
  const transcriptJob = getTranscriptJobForItem(item.id);
  const transcriptAttempts = transcriptJob
    ? listTranscriptAttemptsForItem(item.id).slice(0, 3)
    : [];
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
  const activeTab = parseItemDetailTab(tab, notesEnabled);
  const processingRead = processingReadEnabled();
  const processingWrite = processingWriteEnabled();
  const processingNavigation = processingNavigationEnabled();

  // T-12: when arriving via an Ask citation chip, resolve the chunk body so
  // we can render a highlight panel with an anchor the scroll-to-hash hook
  // can find. Silently ignore invalid/foreign chunk_ids — the chip just
  // looks like a regular item link.
  const highlightedChunk = highlight
    ? listChunksForItem(item.id).find(
        (chunk) =>
          chunk.id === highlight &&
          (notesEnabled || chunk.source_kind !== "manual_note"),
      ) ?? null
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
    <div className="mx-auto max-w-[1180px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10">
      <ScrollToHash />
      <Link
        href={processingReturn ?? "/library"}
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        {processingReturn ? "Back to Processing" : "Back to Library"}
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
          processingNavigation={processingNavigation}
        />
      )}

      {highlightedChunk && (
        <aside
          id={`chunk-${highlightedChunk.id}`}
          className="mb-8 rounded-lg border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--accent-11)]">
            <Quote className="h-3.5 w-3.5" strokeWidth={2} />
            {highlightedChunk.source_kind === "manual_note"
              ? "Your note"
              : highlightedChunk.source_kind === "ai_summary"
                ? "AI digest"
                : highlightedChunk.source_kind === "original_content"
                  ? "Original source"
                  : "Saved item context"}
          </div>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {highlightedChunk.body}
          </p>
        </aside>
      )}

      <div className="md:hidden">
        <MobileItemDetailTabs
          item={item}
          activeTab={activeTab}
          captured={captured}
          platform={platform}
          quality={quality}
          limitedQuality={limitedQuality}
          upgradeReason={upgradeReason}
          processingStatus={processingStatus}
          hint={hint}
          topics={topics}
          tags={tags}
          attachedCollections={attachedCollections}
          availableCollections={availableCollections}
          hasAnyCollections={hasAnyCollections}
          hasDigest={hasDigest}
          quotes={quotes}
          related={related}
          transcriptPreview={transcriptPreview}
          transcriptJob={transcriptJob}
          transcriptAttempts={transcriptAttempts}
          canUpgradeWithText={canUpgradeWithText}
          notesEnabled={notesEnabled}
          focusEnabled={focusEnabled}
          processingRead={processingRead}
          processingWrite={processingWrite}
          preserveQuery={{ capture_state, repair, highlight, processingReturn, anchor }}
        />
      </div>

      <div className="hidden gap-10 md:grid lg:grid-cols-[minmax(0,68ch)_360px]">
        {/* LEFT: original content */}
        <article className="article hidden md:block">
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
                  className="inline-flex min-h-11 items-center gap-1.5 font-sans text-xs text-[var(--accent-11)] hover:underline md:min-h-0"
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

          {transcriptPreview && <TranscriptPanel preview={transcriptPreview} />}

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
          {notesEnabled ? (
            <ItemCompanionTabs
              notes={
                <ManualNoteEditor
                  itemId={item.id}
                  itemTitle={item.title}
                  focusEnabled={focusEnabled}
                />
              }
              digest={<DesktopDigestPanel item={item} hasDigest={hasDigest} quotes={quotes} />}
              mobileNotesOnly
            />
          ) : (
            <DesktopDigestPanel item={item} hasDigest={hasDigest} quotes={quotes} />
          )}
          <div className="hidden flex-col gap-6 md:flex">
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
            {transcriptJob && (
              <TranscriptRecoveryPanel
                job={transcriptJob}
                attempts={transcriptAttempts}
                itemId={item.id}
              />
            )}
            {canUpgradeWithText && <UpgradeTextForm itemId={item.id} />}
          </div>

          {processingRead && (<div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Processing
            </p>
            <ItemWorkflowSection itemId={item.id} itemTitle={item.title} writeEnabled={processingWrite} />
          </div>)}

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
          </div>

        </aside>
      </div>
    </div>
  );
}

function TranscriptRecoveryPanel({
  job,
  attempts,
  itemId,
}: {
  job: TranscriptJobRow;
  attempts: TranscriptAttemptRow[];
  itemId: string;
}) {
  const active = job.state !== "done" && job.state !== "ignored";
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Transcript recovery
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            {transcriptJobDetail(job)}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
          {transcriptJobLabel(job.state)}
        </span>
      </div>

      {active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={retryTranscriptJobAction}>
            <input type="hidden" name="item_id" value={itemId} />
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Retry
            </button>
          </form>
          <form action={ignoreTranscriptJobAction}>
            <input type="hidden" name="item_id" value={itemId} />
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
              Ignore
            </button>
          </form>
        </div>
      )}

      {attempts.length > 0 && (
        <ol className="mt-3 flex flex-col gap-2">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{attempt.provider}</span>
              <span className="mx-1 text-[var(--text-muted)]">·</span>
              {attempt.state.replace(/_/g, " ")}
              {attempt.error_code && (
                <>
                  <span className="mx-1 text-[var(--text-muted)]">·</span>
                  {attempt.error_code}
                </>
              )}
              <span className="mx-1 text-[var(--text-muted)]">·</span>
              {formatAttemptTime(attempt.created_at)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function itemDetailNextPath(params: {
  id: string;
  highlight?: string;
  mode?: string;
  capture?: string;
  capture_state?: string;
  note_mode?: string;
  repair?: string;
  tab?: string;
}): string {
  const { id, ...queryParams } = params;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/items/${id}?${query}` : `/items/${id}`;
}

const ITEM_TABS: { id: ItemDetailTab; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "digest", label: "Digest" },
  { id: "ask", label: "Ask" },
  { id: "related", label: "Related" },
  { id: "details", label: "Details" },
];

function itemTabHref({
  itemId,
  tab,
  preserveQuery,
}: {
  itemId: string;
  tab: ItemDetailTab;
  preserveQuery: {
    capture_state?: string;
    repair?: string;
    highlight?: string;
    processingReturn?: string | null;
    anchor?: string;
  };
}) {
  const params = new URLSearchParams();
  if (tab !== "original") params.set("tab", tab);
  if (preserveQuery.capture_state) {
    params.set("capture_state", preserveQuery.capture_state);
  }
  if (preserveQuery.repair) params.set("repair", preserveQuery.repair);
  if (preserveQuery.highlight) params.set("highlight", preserveQuery.highlight);
  if (preserveQuery.processingReturn) params.set("return", preserveQuery.processingReturn);
  if (preserveQuery.anchor) params.set("anchor", preserveQuery.anchor);
  const qs = params.toString();
  return qs ? `/items/${itemId}?${qs}` : `/items/${itemId}`;
}

function MobileItemDetailTabs({
  item,
  activeTab,
  captured,
  platform,
  quality,
  limitedQuality,
  upgradeReason,
  processingStatus,
  hint,
  topics,
  tags,
  attachedCollections,
  availableCollections,
  hasAnyCollections,
  hasDigest,
  quotes,
  related,
  transcriptPreview,
  transcriptJob,
  transcriptAttempts,
  canUpgradeWithText,
  notesEnabled,
  focusEnabled,
  processingRead,
  processingWrite,
  preserveQuery,
}: {
  item: ItemRow;
  activeTab: ItemDetailTab;
  captured: string;
  platform: string;
  quality: string;
  limitedQuality: boolean;
  upgradeReason: string | null;
  processingStatus: ItemProcessingStatus;
  hint: string | null;
  topics: ItemTopicRow[];
  tags: ReturnType<typeof listTagsForItem>;
  attachedCollections: ReturnType<typeof listCollectionsForItem>;
  availableCollections: ReturnType<typeof listCollections>;
  hasAnyCollections: boolean;
  hasDigest: boolean;
  quotes: string[];
  related: ReturnType<typeof findRelatedItems>;
  transcriptPreview: TranscriptPreview | null;
  transcriptJob: TranscriptJobRow | null;
  transcriptAttempts: TranscriptAttemptRow[];
  canUpgradeWithText: boolean;
  notesEnabled: boolean;
  focusEnabled: boolean;
  processingRead: boolean;
  processingWrite: boolean;
  preserveQuery: {
    capture_state?: string;
    repair?: string;
    highlight?: string;
    processingReturn?: string | null;
    anchor?: string;
  };
}) {
  const tabs = notesEnabled
    ? [...ITEM_TABS, { id: "notes" as const, label: "Notes" }]
    : ITEM_TABS;
  return (
    <section aria-label="Item detail mobile tabs" className="space-y-5">
      <nav
        aria-label="Item detail sections"
        className={`grid gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 ${
          notesEnabled ? "grid-cols-6" : "grid-cols-5"
        }`}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={itemTabHref({
              itemId: item.id,
              tab: tab.id,
              preserveQuery,
            })}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`inline-flex h-11 min-w-0 items-center justify-center rounded-sm px-0 text-[11px] font-medium sm:px-1 sm:text-xs md:h-10 ${
              activeTab === tab.id
                ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="truncate">{tab.label}</span>
          </Link>
        ))}
      </nav>

      {activeTab === "original" && (
        <MobileOriginalTab
          item={item}
          captured={captured}
          platform={platform}
          quality={quality}
          limitedQuality={limitedQuality}
          upgradeReason={upgradeReason}
          processingStatus={processingStatus}
          transcriptPreview={transcriptPreview}
          processingRead={processingRead}
          processingWrite={processingWrite}
        />
      )}
      {activeTab === "digest" && (
        <MobileDigestTab item={item} hasDigest={hasDigest} quotes={quotes} />
      )}
      {activeTab === "ask" && (
        <MobileAskTab
          item={item}
          limitedQuality={limitedQuality}
          upgradeReason={upgradeReason}
        />
      )}
      {activeTab === "related" && <MobileRelatedTab related={related} />}
      {activeTab === "details" && (
        <MobileDetailsTab
          item={item}
          platform={platform}
          quality={quality}
          hint={hint}
          topics={topics}
          tags={tags}
          attachedCollections={attachedCollections}
          availableCollections={availableCollections}
          hasAnyCollections={hasAnyCollections}
          transcriptJob={transcriptJob}
          transcriptAttempts={transcriptAttempts}
          canUpgradeWithText={canUpgradeWithText}
          processingRead={processingRead}
          processingWrite={processingWrite}
        />
      )}
      {activeTab === "notes" && notesEnabled && (
        <div className="space-y-4">
          {processingRead && <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Processing
            </p>
            <ItemWorkflowSection itemId={item.id} itemTitle={item.title} writeEnabled={processingWrite} />
          </section>}
          <ManualNoteEditor
            itemId={item.id}
            itemTitle={item.title}
            focusEnabled={focusEnabled}
          />
        </div>
      )}
    </section>
  );
}

function MobileOriginalTab({
  item,
  captured,
  platform,
  quality,
  limitedQuality,
  upgradeReason,
  processingStatus,
  transcriptPreview,
  processingRead,
  processingWrite,
}: {
  item: ItemRow;
  captured: string;
  platform: string;
  quality: string;
  limitedQuality: boolean;
  upgradeReason: string | null;
  processingStatus: ItemProcessingStatus;
  transcriptPreview: TranscriptPreview | null;
  processingRead: boolean;
  processingWrite: boolean;
}) {
  return (
    <article className="article">
      <header className="mb-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-3">
          <h1 className="font-sans text-[26px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)]">
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
          <p className="mt-3">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 font-sans text-xs text-[var(--accent-11)] hover:underline"
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
          <WeakSourceRepairPanel item={item} upgradeReason={upgradeReason} />
        )}
      </header>

      {transcriptPreview && <TranscriptPanel preview={transcriptPreview} />}

      {processingRead && (
        <section className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 font-sans">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Processing
          </p>
          <ItemWorkflowSection itemId={item.id} itemTitle={item.title} writeEnabled={processingWrite} />
        </section>
      )}

      <div className="whitespace-pre-wrap">{item.body}</div>

      <footer className="mt-8 flex flex-col gap-2 border-t border-[var(--border)] pt-5 font-sans">
        <Link
          href={`/items/${item.id}?mode=focus`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
          Focus mode
        </Link>
        <Link
          href={`/items/${item.id}/ask`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
          Ask this item
        </Link>
        <a
          href={`/api/items/${item.id}/export.md`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2} />
          Export as .md
        </a>
      </footer>
    </article>
  );
}

function MobileDigestTab({
  item,
  hasDigest,
  quotes,
}: {
  item: ItemRow;
  hasDigest: boolean;
  quotes: string[];
}) {
  if (!hasDigest) return <DigestPlaceholder state={item.enrichment_state} />;
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 font-sans text-sm">
      {item.category && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Category
          </p>
          <span className="inline-flex rounded-full bg-[var(--control-selected-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--control-selected-fg)]">
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
                className="border-l-2 border-[var(--action-primary-focus)] pl-3 italic text-[var(--text-secondary)]"
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
    </section>
  );
}

function MobileAskTab({
  item,
  limitedQuality,
  upgradeReason,
}: {
  item: ItemRow;
  limitedQuality: boolean;
  upgradeReason: string | null;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 font-sans">
      <div className="flex items-start gap-3">
        <MessageSquare
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-11)]"
          strokeWidth={2}
        />
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Ask this item
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Ask questions using this saved source as the active scope.
          </p>
        </div>
      </div>
      {limitedQuality && (
        <div className="mt-4 flex gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--quality-needs-upgrade)]">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            strokeWidth={2}
          />
          <p>
            {upgradeReason ??
              "This source may answer better after adding text or a transcript."}
          </p>
        </div>
      )}
      <Link
        href={`/items/${item.id}/ask`}
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]"
      >
        Open scoped Ask
      </Link>
    </section>
  );
}

function MobileRelatedTab({
  related,
}: {
  related: ReturnType<typeof findRelatedItems>;
}) {
  if (related.length > 0) return <RelatedItems items={related} />;
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 font-sans text-sm">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        No related sources yet.
      </h2>
      <p className="mt-1 leading-6 text-[var(--text-secondary)]">
        Related sources appear after this item and nearby library items have semantic indexes.
      </p>
    </section>
  );
}

function MobileDetailsTab({
  item,
  platform,
  quality,
  hint,
  topics,
  tags,
  attachedCollections,
  availableCollections,
  hasAnyCollections,
  transcriptJob,
  transcriptAttempts,
  canUpgradeWithText,
  processingRead,
  processingWrite,
}: {
  item: ItemRow;
  platform: string;
  quality: string;
  hint: string | null;
  topics: ItemTopicRow[];
  tags: ReturnType<typeof listTagsForItem>;
  attachedCollections: ReturnType<typeof listCollectionsForItem>;
  availableCollections: ReturnType<typeof listCollections>;
  hasAnyCollections: boolean;
  transcriptJob: TranscriptJobRow | null;
  transcriptAttempts: TranscriptAttemptRow[];
  canUpgradeWithText: boolean;
  processingRead: boolean;
  processingWrite: boolean;
}) {
  return (
    <section className="flex flex-col gap-5 font-sans text-sm">
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
              <dd className="text-right text-[var(--text-primary)]">
                {item.extraction_method}
              </dd>
            </div>
          )}
          {item.capture_source && (
            <div className="flex justify-between gap-3">
              <dt>Via</dt>
              <dd className="text-right text-[var(--text-primary)]">
                {item.capture_source}
              </dd>
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
        {transcriptJob && (
          <TranscriptRecoveryPanel
            job={transcriptJob}
            attempts={transcriptAttempts}
            itemId={item.id}
          />
        )}
        {canUpgradeWithText && <UpgradeTextForm itemId={item.id} />}
      </div>

      {processingRead && (<div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Processing
        </p>
        <ItemWorkflowSection itemId={item.id} itemTitle={item.title} writeEnabled={processingWrite} />
      </div>)}

      <IncludedTopicsPanel topics={topics} />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Tags
        </p>
        <TagEditor itemId={item.id} tags={tags} />
      </div>

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

      <form
        action={async () => {
          "use server";
          await deleteItemAction(item.id);
        }}
      >
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--danger)] bg-transparent px-3 font-medium text-[var(--danger)]"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Delete item
        </button>
      </form>
    </section>
  );
}

function TranscriptPanel({ preview }: { preview: TranscriptPreview }) {
  const { source, segments, hiddenCount } = preview;
  const timestamped = source.timestamp_mode === "timestamped";
  return (
    <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 font-sans">
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Transcript
          </p>
          <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
            {timestamped ? "Timestamped transcript" : "Transcript paragraphs"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-[var(--text-secondary)]">
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {sourceKindLabel(source.source_kind)}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {timestampModeLabel(source.timestamp_mode)}
          </span>
          {source.language_code && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
              {source.language_code}
            </span>
          )}
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {source.segment_count.toLocaleString()} segments
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm sm:grid-cols-[72px_minmax(0,1fr)]"
          >
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {timestamped
                ? formatTranscriptTimestamp(segment.start_ms)
                : `#${segment.idx + 1}`}
            </span>
            <span className="whitespace-pre-wrap leading-6 text-[var(--text-primary)]">
              {segment.text}
            </span>
          </li>
        ))}
      </ol>

      {hiddenCount > 0 && (
        <p className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Showing first {TRANSCRIPT_PANEL_SEGMENT_PREVIEW_LIMIT.toLocaleString()} of{" "}
          {source.segment_count.toLocaleString()} segments. Full text is in the item body.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Imported {new Date(source.created_at).toLocaleString()}.
      </p>
    </section>
  );
}

function sourceKindLabel(kind: TranscriptSourceRow["source_kind"]): string {
  switch (kind) {
    case "uploaded_file":
      return "Uploaded file";
    case "user_paste":
      return "User paste";
    case "youtube_official_caption":
      return "Official captions";
    case "owned_media_stt":
      return "Owned media STT";
    case "lab_public_caption":
      return "Lab captions";
  }
}

function timestampModeLabel(mode: TranscriptSourceRow["timestamp_mode"]): string {
  switch (mode) {
    case "timestamped":
      return "Timestamped";
    case "paragraph_only":
      return "Paragraphs";
    case "inferred":
      return "Inferred";
  }
}

function formatTranscriptTimestamp(ms: number | null): string {
  if (ms === null) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] md:h-8"
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
  const isYoutube = isYoutubeSource(item);
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
          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] md:h-8"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          {isYoutube ? "Add transcript" : "Add text"}
        </Link>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] md:h-8"
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
  processingNavigation,
}: {
  item: ItemRow;
  result: CaptureResultPayload;
  platform: string;
  quality: string;
  limitedQuality: boolean;
  upgradeReason: string | null;
  processingNavigation: boolean;
}) {
  const isWarning =
    limitedQuality ||
    result.state === "error_with_saved_item" ||
    result.state === "duplicate_existing";
  const label = captureResultTitle(item, result, limitedQuality);
  const createdNew = result.state.startsWith("created_");
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
            {createdNew && processingNavigation && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Saved to Library and Processing Inbox.{" "}
                <Link href="/processing" className="font-medium text-[var(--accent-11)] hover:underline">
                  Open Inbox
                </Link>
              </p>
            )}
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
              className="inline-flex h-8 items-center rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]"
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

function transcriptJobLabel(state: TranscriptJobRow["state"]): string {
  if (state === "pending") return "Queued";
  if (state === "running") return "Running";
  if (state === "retryable_error") return "Retrying";
  if (state === "manual_needed") return "Needs help";
  if (state === "ignored") return "Ignored";
  return "Recovered";
}

function transcriptJobDetail(job: TranscriptJobRow): string {
  if (job.state === "done") return "A transcript or pasted text has been saved for this item.";
  if (job.state === "ignored") return "Automatic recovery is ignored for this item.";
  if (job.state === "pending") return "Brain will try to recover the transcript in the background.";
  if (job.state === "running") return "Brain is trying to recover the transcript now.";
  if (job.state === "retryable_error") {
    return job.next_run_at
      ? `A retry is scheduled for ${new Date(job.next_run_at).toLocaleString()}.`
      : "A retry is scheduled.";
  }
  return job.last_error_message
    ? `Automatic recovery needs help. Last result: ${job.last_error_message}`
    : "Automatic recovery needs help. Paste a transcript or notes below.";
}

function formatAttemptTime(ts: number): string {
  return new Date(ts).toLocaleString();
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
    <div className="mx-auto max-w-[820px] px-6 py-8 md:px-8 md:py-10">
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
                className="inline-flex h-8 items-center rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]"
              >
                {isYoutubeSource(item) ? "Add transcript" : "Add text"}
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

function DesktopDigestPanel({
  item,
  hasDigest,
  quotes,
}: {
  item: ItemRow;
  hasDigest: boolean;
  quotes: string[];
}) {
  if (!hasDigest) return <DigestPlaceholder state={item.enrichment_state} />;
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      {item.category && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Category
          </p>
          <span className="inline-flex rounded-full bg-[var(--control-selected-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--control-selected-fg)]">
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
            {quotes.map((quote, index) => (
              <li
                key={index}
                className="border-l-2 border-[var(--action-primary-focus)] pl-3 italic text-[var(--text-secondary)]"
              >
                &ldquo;{quote}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-[var(--text-muted)]">AI-generated summary.</p>
    </div>
  );
}
