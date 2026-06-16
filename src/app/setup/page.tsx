import { redirect } from "next/navigation";
import Image from "next/image";
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
        Welcome to AI Memory
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Set a PIN to protect your library. You&rsquo;ll enter it once per device.
      </p>
      <SetupForm next={next ?? "/"} />
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Your PIN is hashed on the AI Memory server. Saved content stays in your
        private library; enrichment may send saved content to configured AI
        providers for processing.
      </p>
    </div>
  );
}
