import {
  ArrowLeft,
  FileText,
  Globe,
  MessageSquare,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { countItemsForTopic, getTopicBySlug, listItemsForTopic } from "@/db/topics";
import { verifySessionCookie } from "@/lib/auth";
import { platformLabel, qualityLabel } from "@/lib/capture/quality";
import { getScopeHealth } from "@/lib/library/scope-health";

function formatRelative(ts: number): string {
  const minutes = Math.round((Date.now() - ts) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function iconFor(type: string) {
  if (type === "pdf") return FileText;
  if (type === "url" || type === "youtube") return Globe;
  return StickyNote;
}

function excerpt(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).trim()}...`;
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(`/topics/${slug}`)}`);
  }

  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const itemCount = countItemsForTopic(topic.id);
  const items = listItemsForTopic(topic.id, 100);
  const scopeHealth = getScopeHealth(items);

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-32 pt-8 md:px-8 md:py-10">
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <header className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--accent-11)]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Included Topic
          </p>
          <h1 className="break-words text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
            {topic.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {itemCount} {itemCount === 1 ? "source" : "sources"} matched by AI.
          </p>
          {topic.description && (
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--text-secondary)]">
              {topic.description}
            </p>
          )}
          <ScopeHealthSummary
            total={scopeHealth.total}
            readable={scopeHealth.readable}
            weak={scopeHealth.weak}
          />
        </div>
        {items.length > 0 && (
          <Link
            href={`/ask?scope=topic&topic=${topic.slug}`}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] md:h-9 md:w-auto"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={2} />
            Ask topic
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            No sources currently include this topic.
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Topics are derived from saved sources. This topic will fill in when
            matching sources are attached by enrichment.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon = iconFor(item.source_type);
            const platform = platformLabel(item.source_platform, item.source_type);
            const quality = qualityLabel(item.capture_quality);
            return (
              <li key={item.id}>
                <Link
                  href={`/items/${item.id}`}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                    strokeWidth={2}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-[16px] font-medium leading-snug text-[var(--text-primary)]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      <span className="uppercase tracking-wide">{platform}</span>
                      <span className="mx-2 text-[var(--text-muted)]">-</span>
                      {quality}
                      <span className="mx-2 text-[var(--text-muted)]">-</span>
                      {formatRelative(item.captured_at)}
                    </p>
                    {item.body && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {excerpt(item.body)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScopeHealthSummary({
  total,
  readable,
  weak,
}: {
  total: number;
  readable: number;
  weak: number;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      <span className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)]">
        {total} {total === 1 ? "source" : "sources"}
      </span>
      <span className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)]">
        {readable} readable
      </span>
      {weak > 0 && (
        <span className="inline-flex h-7 items-center rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--quality-needs-upgrade)]">
          {weak} need upgrade
        </span>
      )}
      {weak > 0 && (
        <p className="basis-full text-sm text-[var(--text-secondary)]">
          Some sources in this topic may produce thinner answers until they are upgraded.
        </p>
      )}
    </div>
  );
}
