import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { isPinConfigured } from "@/lib/auth";
import { UnlockForm } from "./form";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  if (!isPinConfigured()) {
    redirect(`/setup${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  const showSessionNote = reason === "session-expired";

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-8">
      <Image
        src="/ai-memory-logo.png"
        alt=""
        width={64}
        height={64}
        className="mb-5 rounded-xl"
        unoptimized
      />
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        Unlock AI Memory
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Enter your PIN to continue.
      </p>
      {showSessionNote && (
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          Your session expired, or this device is not unlocked yet. Unlock to
          return to the page you requested.
        </div>
      )}
      <UnlockForm next={next ?? "/"} />
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Forgot it? SSH into your AI Memory server and remove{" "}
        <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono">/opt/brain/data/brain.sqlite</code>,
        then restart <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono">brain.service</code>.
        A new PIN can then be set on first run.
      </p>
      <Link href="/library" className="sr-only">
        Home
      </Link>
    </div>
  );
}
