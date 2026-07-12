import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProcessingApp } from "@/components/processing/processing-app";
import { verifySessionCookie } from "@/lib/auth";
import { processingReadEnabled, processingWriteEnabled } from "@/lib/processing/flags";

export const dynamic = "force-dynamic";

export default async function ProcessingPage() {
  const cookieStore = await cookies();
  if (!verifySessionCookie(cookieStore)) redirect("/unlock?next=/processing");
  if (!processingReadEnabled()) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center md:px-8">
        <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">Processing is not available yet</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Your Library and saved sources are unchanged. Processing will appear here after its private read gate is enabled.</p>
      </div>
    );
  }
  return <ProcessingApp writeEnabled={processingWriteEnabled()} />;
}
