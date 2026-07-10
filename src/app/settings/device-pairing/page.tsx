import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import { AdvancedTokenSetup, AndroidPairingCodeActions } from "./actions-client";

export const dynamic = "force-dynamic";

export default async function DevicePairingPage() {
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect("/unlock?next=/settings/device-pairing");
  }
  // Touch headers so this page is always rendered per-request; the
  // force-dynamic flag already does this but the call makes the intent
  // explicit in the server bundle.
  await headers();

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10">
      <h1 className="mb-2 text-[30px] font-semibold leading-[1.2] text-[var(--text-primary)]">
        Device pairing
      </h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        AI Memory is accessible at{" "}
        <code className="break-all font-mono text-[var(--text-primary)]">
          {BRAIN_TUNNEL_URL}
        </code>{" "}
        via the Cloudflare tunnel. Pair Android with a short-lived code, or use
        the advanced token flow for the Chrome extension.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          This device
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <p>Already paired through your unlocked browser session.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Add Android device
        </h2>
        <AndroidPairingCodeActions />
      </section>

      {/*
        v0.5.0 T-17 / F-038 / gap G-4 — Chrome extension bootstrap UX.
        The extension itself ships in wave 5 (T-CF-15..T-CF-21); until
        then the link targets chrome://extensions so the user can at
        least find the Extensions page after sideloading. Once the
        extension publishes an options page at a known
        chrome-extension://<id>/options.html the link will be updated —
        but for a locally-loaded unpacked extension, chrome://extensions
        is the canonical entry point (click "Details" on the AI Memory row →
        "Extension options").
      */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Advanced token setup
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-xs text-[var(--text-secondary)]">
            <li>
              Install the AI Memory extension (see{" "}
              <code className="font-mono text-[var(--text-primary)]">
                extension/README.md
              </code>{" "}
              for sideload steps).
            </li>
            <li>
              Open{" "}
              <a
                href="chrome://extensions"
                className="font-mono text-[var(--accent-11)] underline decoration-dotted underline-offset-2"
              >
                chrome://extensions
              </a>
              , find <strong>AI Memory</strong>, click <strong>Details → Extension options</strong>.
            </li>
            <li>
              Set <strong>AI Memory URL</strong> to{" "}
              <code className="break-all font-mono text-[var(--text-primary)]">
                {BRAIN_TUNNEL_URL}
              </code>{" "}
              and copy the token from advanced setup into the <strong>Token</strong> field.
            </li>
            <li>Click <strong>Test connection</strong>, then <strong>Save</strong>.</li>
          </ol>
          <AdvancedTokenSetup />
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Chrome does not allow a website to open an extension&apos;s options
            page automatically; <code className="font-mono">chrome://</code>{" "}
            links must be navigated manually.
          </p>
        </div>
      </section>
    </div>
  );
}
