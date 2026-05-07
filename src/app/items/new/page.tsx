import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewNoteForm } from "./form";

export default function NewNotePage() {
  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <h1 className="mb-6 text-[24px] font-semibold leading-[1.33] tracking-[-0.01em] text-[var(--text-primary)]">
        New note
      </h1>

      <NewNoteForm />
    </div>
  );
}
