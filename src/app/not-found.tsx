import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center px-8 py-20 text-center">
      <h1 className="text-[24px] font-semibold leading-[1.33] tracking-[-0.01em] text-[var(--text-primary)]">
        Not found
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        The item or page you requested doesn&rsquo;t exist.
      </p>
      <Link
        href="/library"
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)]"
      >
        Back to Library
      </Link>
    </div>
  );
}
