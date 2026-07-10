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
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-[440px] flex-col px-5 pb-28 pt-10 md:min-h-screen md:justify-center md:px-8 md:py-12">
      <Image
        src="/ai-memory-logo.png"
        alt=""
        width={64}
        height={64}
        className="mb-5 rounded-xl"
        unoptimized
      />
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
        Unlock AI Memory
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Enter your PIN to continue.
      </p>
      {showSessionNote && (
        <div
          role="status"
          className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"
        >
          <p className="font-medium text-[var(--text-primary)]">Session expired</p>
          <p className="mt-1">
            Unlock this device again to return to the page you requested.
          </p>
        </div>
      )}
      <UnlockForm next={next ?? "/"} />
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Forgot your PIN? Reset requires access to the AI Memory server. After a
        server reset, you can create a new PIN on first run.
      </p>
      <Link href="/library" className="sr-only">
        Home
      </Link>
    </div>
  );
}
