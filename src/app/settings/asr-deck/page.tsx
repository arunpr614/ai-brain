import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth";
import { getAsrPipelineDashboardData } from "@/db/transcript-jobs";
import { AsrDeckClient } from "@/components/asr-deck/asr-deck-client";

export const dynamic = "force-dynamic";

export default async function AsrDeckPage() {
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect("/unlock?next=/settings/asr-deck");
  }

  const initialData = getAsrPipelineDashboardData("mac-m5-pro");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/settings" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Settings
            </Link>
            <span>/</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">Mac ASR Pipeline Deck</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Local Mac ASR Workstation Deck
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time pipeline monitoring, queue backlog management, and local Apple Silicon MLX Whisper telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/needs-upgrade"
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Needs Upgrade Triage
          </Link>
          <Link
            href="/processing"
            className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
          >
            Processing Stream
          </Link>
        </div>
      </div>

      {/* Main interactive Neural Deck */}
      <AsrDeckClient initialData={initialData} />
    </div>
  );
}
