import { redirect } from "next/navigation";
import { isPinConfigured } from "@/lib/auth";
import { SetupForm } from "./form";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (isPinConfigured()) {
    redirect(`/unlock${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        Welcome to AI Brain
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Set a PIN to protect your library. You&rsquo;ll enter it once per device.
      </p>
      <SetupForm next={next ?? "/"} />
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Your PIN is hashed on the server. Your library is stored on your Brain
        server (Hetzner). AI enrichment uses Anthropic and Google APIs &mdash;
        content you save is sent to those services for processing.
      </p>
    </div>
  );
}
