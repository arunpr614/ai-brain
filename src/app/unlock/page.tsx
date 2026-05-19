import Link from "next/link";
import { redirect } from "next/navigation";
import { isPinConfigured } from "@/lib/auth";
import { UnlockForm } from "./form";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (!isPinConfigured()) {
    redirect(`/setup${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        Unlock AI Brain
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Enter your PIN to continue.
      </p>
      <UnlockForm next={next ?? "/"} />
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Forgot it? SSH into your Brain server and remove{" "}
        <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono">/opt/brain/data/brain.sqlite</code>,
        then restart <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono">brain.service</code>.
        A new PIN can then be set on first run.
      </p>
      <Link href="/" className="sr-only">
        Home
      </Link>
    </div>
  );
}
