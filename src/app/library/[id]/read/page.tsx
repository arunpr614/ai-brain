import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getItem } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listActiveTranscriptSegmentsForItem,
} from "@/db/transcripts";
import { listTopicsForItem } from "@/db/topics";
import { listTagsForItem } from "@/db/tags";
import { verifySessionCookie } from "@/lib/auth";
import { ReadingStudioApp } from "@/components/reading-studio/reading-studio-app";

function parseQuotes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = getItem(id);
  if (!item) return { title: "Reading Studio · AI Brain" };
  return {
    title: `${item.title || "Untitled"} · Reading Studio · AI Brain`,
  };
}

export default async function ReadingStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const isAuthenticated = verifySessionCookie(cookieStore);

  const { id } = await params;
  if (!isAuthenticated) {
    redirect(`/unlock?next=${encodeURIComponent(`/library/${id}/read`)}`);
  }

  const item = getItem(id);
  if (!item) notFound();

  const transcriptSource = getActiveTranscriptSourceForItem(item.id);
  const segments = listActiveTranscriptSegmentsForItem(item.id, { limit: 2500 });
  const topics = listTopicsForItem(item.id);
  const tags = listTagsForItem(item.id);
  const parsedQuotes = parseQuotes(item.quotes);

  return (
    <ReadingStudioApp
      item={item}
      transcriptSource={transcriptSource}
      segments={segments}
      topics={topics}
      tags={tags}
      parsedQuotes={parsedQuotes}
    />
  );
}
