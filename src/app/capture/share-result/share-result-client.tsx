"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createShareResultPayload,
  loadShareResult,
  shareResultActions,
  type AndroidShareResultState,
  type AndroidShareResultPayload,
  type ShareResultAction,
} from "@/lib/android-share/result";

interface ShareResultClientProps {
  resultKey: string | null;
  fixtureState: string | null;
}

interface LoadedSharePayload {
  loaded: boolean;
  payload: AndroidShareResultPayload | null;
}

const EXPIRED_FALLBACK_PAYLOAD = createShareResultPayload({
  state: "expired_result",
  sourceKind: "unknown",
  now: 0,
});

const STATE_ICONS: Record<AndroidShareResultState, LucideIcon> = {
  saved_full: CheckCircle2,
  saved_limited: CheckCircle2,
  duplicate_existing: CheckCircle2,
  updated_existing: CheckCircle2,
  unsupported_share: AlertTriangle,
  missing_token: LinkIcon,
  server_unreachable: AlertTriangle,
  pdf_missing_uri: FileWarning,
  pdf_read_failed: FileWarning,
  pdf_checksum_failed: FileWarning,
  pdf_upload_failed: FileWarning,
  multi_pdf_rejected: FileWarning,
  expired_result: AlertTriangle,
};

export function ShareResultClient({ resultKey, fixtureState }: ShareResultClientProps) {
  const [result, setResult] = useState<LoadedSharePayload>({
    loaded: false,
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (process.env.NODE_ENV !== "production") {
        const fixture = fixturePayload(fixtureState);
        if (fixture) {
          setResult({ loaded: true, payload: fixture });
          return;
        }
      }

      setResult({
        loaded: true,
        payload: loadShareResult(window.sessionStorage, resultKey, Date.now()),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fixtureState, resultKey]);

  const viewPayload = useMemo(() => result.payload ?? EXPIRED_FALLBACK_PAYLOAD, [result.payload]);
  const content = copyForState(viewPayload);
  const actions = shareResultActions(viewPayload);
  const Icon = STATE_ICONS[viewPayload.state];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[680px] flex-col px-6 py-8 sm:px-8 sm:py-10">
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Library
      </Link>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Android share
            </p>
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
              {content.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {result.loaded ? content.body : "Loading share result..."}
            </p>
            {viewPayload.quality && (
              <p className="mt-3 inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {viewPayload.quality}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {actions.map((action) => (
            <ResultActionLink key={action} action={action} payload={viewPayload} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultActionLink({
  action,
  payload,
}: {
  action: ShareResultAction;
  payload: AndroidShareResultPayload;
}) {
  const itemId = payload.itemId ?? payload.existingItemId;
  const config = actionConfig(action, itemId);
  if (!config) return null;
  return (
    <Link
      href={config.href}
      className={
        config.primary
          ? "inline-flex h-9 items-center rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]"
          : "inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }
    >
      {config.label}
    </Link>
  );
}

function actionConfig(action: ShareResultAction, itemId: string | undefined) {
  switch (action) {
    case "open_item":
      return itemId ? { href: `/items/${itemId}`, label: "Open item", primary: true } : null;
    case "ask":
      return itemId ? { href: `/items/${itemId}/ask`, label: "Ask", primary: false } : null;
    case "add_text":
      return itemId
        ? { href: `/items/${itemId}/repair`, label: "Add text", primary: true }
        : null;
    case "pair_device":
      return { href: "/setup-apk", label: "Pair device", primary: true };
    case "capture":
      return { href: "/capture", label: "Capture manually", primary: true };
    case "library":
      return { href: "/library", label: "Library", primary: true };
    case "done":
      return { href: "/library", label: "Done", primary: false };
  }
}

function copyForState(payload: AndroidShareResultPayload) {
  switch (payload.state) {
    case "saved_full":
      return {
        title: "Saved to AI Memory",
        body: "This shared item was saved with readable text and is ready for search and Ask.",
      };
    case "saved_limited":
      return {
        title: "Saved, but needs better text",
        body: "The item is saved, but it may need more source text before Ask can use it well.",
      };
    case "duplicate_existing":
      return {
        title: "Already saved",
        body: "AI Memory found an existing item and did not create a duplicate.",
      };
    case "updated_existing":
      return {
        title: "Existing item updated",
        body: "AI Memory updated the existing item with the shared content.",
      };
    case "missing_token":
      return {
        title: "Pair this Android app",
        body: "This Android app is not paired yet. Pair it from the web app before sharing again.",
      };
    case "unsupported_share":
      return {
        title: "Share not supported",
        body: "AI Memory can save links, text notes, and one PDF at a time from Android share.",
      };
    case "server_unreachable":
      return {
        title: "Could not reach AI Memory",
        body: "Nothing was saved. Check the server connection, then try sharing again.",
      };
    case "pdf_missing_uri":
      return {
        title: "PDF was not available",
        body: "Android did not provide a usable file for this PDF share. Try sharing the PDF again.",
      };
    case "pdf_read_failed":
      return {
        title: "PDF could not be read",
        body: "Nothing was saved. Try sharing the PDF again from the source app.",
      };
    case "pdf_checksum_failed":
      return {
        title: "PDF upload needs a retry",
        body: "The PDF upload did not pass the integrity check. Nothing was saved.",
      };
    case "pdf_upload_failed":
      return {
        title: "PDF upload failed",
        body: "Nothing was saved. Check the connection, then try sharing the PDF again.",
      };
    case "multi_pdf_rejected":
      return {
        title: "Share one PDF at a time",
        body: "Multiple PDFs are not supported in this revamp. Share a single PDF to save it.",
      };
    case "expired_result":
      return {
        title: "Share result expired",
        body: "This share result is no longer available. Open Library or capture the item manually.",
      };
  }
}

function fixturePayload(state: string | null): AndroidShareResultPayload | null {
  if (!state || !isFixtureState(state)) return null;
  const now = Date.now();
  return createShareResultPayload({
    state,
    sourceKind: fixtureSourceKind(state),
    itemId: fixtureItemId(state),
    existingItemId: state === "duplicate_existing" ? "share-result-existing" : undefined,
    quality: state === "saved_limited" ? "metadata_only" : undefined,
    errorCode: state,
    now: state === "expired_result" ? now - 31 * 60 * 1000 : now,
  });
}

function isFixtureState(value: string): value is AndroidShareResultState {
  return [
    "saved_full",
    "saved_limited",
    "duplicate_existing",
    "updated_existing",
    "unsupported_share",
    "missing_token",
    "server_unreachable",
    "pdf_missing_uri",
    "pdf_read_failed",
    "pdf_checksum_failed",
    "pdf_upload_failed",
    "multi_pdf_rejected",
    "expired_result",
  ].includes(value);
}

function fixtureSourceKind(state: AndroidShareResultState) {
  if (state.startsWith("pdf_") || state === "multi_pdf_rejected") return "pdf";
  if (state === "unsupported_share" || state === "missing_token" || state === "expired_result") {
    return "unknown";
  }
  return state === "updated_existing" ? "note" : "url";
}

function fixtureItemId(state: AndroidShareResultState): string | undefined {
  if (state === "saved_full") return "share-result-full";
  if (state === "saved_limited") return "share-result-limited";
  if (state === "updated_existing") return "share-result-updated";
  return undefined;
}
