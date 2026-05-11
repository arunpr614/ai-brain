/**
 * /settings/lan-info — pair APK + Chrome extension (v0.5.0 T-8 / F-038;
 * pivoted to Cloudflare tunnel T-CF-9).
 *
 * Shows the public Brain URL (the Cloudflare named tunnel), the current
 * BRAIN_LAN_TOKEN, a scannable QR code of the setup URI, and a "Rotate
 * token" button. The APK QR scanner reads the QR directly; the extension
 * options page reads the copyable token.
 *
 * Internal directory name kept as `lan-info` to avoid breaking deep links;
 * all user-visible copy is tunnel-aware.
 *
 * Server-rendered so the token never reaches a client bundle at build time
 * — it's only present in the PIN-unlocked response body. Cache-Control:
 * no-store is set at both the page (via { dynamic: 'force-dynamic' }) and
 * the Response headers (see API route).
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { toDataURL } from "qrcode";
import { SESSION_COOKIE } from "@/lib/auth";
import { loadLanToken } from "@/lib/auth/bearer";
import { buildSetupUri } from "@/lib/lan/info";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import { LanInfoActions } from "./actions-client";

export const dynamic = "force-dynamic";

export default async function LanInfoPage() {
  const c = await cookies();
  if (!c.get(SESSION_COOKIE)?.value) {
    redirect("/unlock?next=/settings/lan-info");
  }
  // Touch headers so this page is always rendered per-request; the
  // force-dynamic flag already does this but the call makes the intent
  // explicit in the server bundle.
  await headers();

  const token = loadLanToken();

  if (!token) {
    return (
      <div className="mx-auto max-w-[680px] px-8 py-10">
        <h1 className="mb-4 text-[30px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          Device pairing
        </h1>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <p>
            The bearer token is not configured. Restart the server with{" "}
            <code className="font-mono">npm run dev</code> to auto-generate, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  const setupUri = buildSetupUri(token);
  const qrDataUri = await toDataURL(setupUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
  });

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <h1 className="mb-2 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Device pairing
      </h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        Your Brain is accessible at{" "}
        <code className="font-mono text-[var(--text-primary)]">{BRAIN_TUNNEL_URL}</code>{" "}
        via the Cloudflare tunnel. Use the token below to pair the Chrome extension.
        Each paired device keeps working until you rotate the token.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          This device
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <p>
            Already paired. The Android app is built with the tunnel URL baked in
            and authenticates with a session cookie, so no QR scan is needed on
            this device.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Pair another device
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUri}
            alt="Setup QR code — url and token for pairing a second device"
            width={256}
            height={256}
            className="rounded-md border border-[var(--border)]"
          />
          <p className="font-mono text-xs text-[var(--text-muted)]">
            {BRAIN_TUNNEL_URL}
          </p>
          {/*
            Kept `details` collapsible so casual viewers aren't greeted with a
            raw secret token. The URL is a build-time constant and safe in
            plaintext; the token is the actual shared secret.
          */}
          <details className="mt-2 w-full text-xs text-[var(--text-muted)]">
            <summary className="cursor-pointer select-none">
              Show URL and token
            </summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[var(--text-primary)]">
              <dt className="text-[var(--text-muted)]">URL</dt>
              <dd className="break-all">{BRAIN_TUNNEL_URL}</dd>
              <dt className="text-[var(--text-muted)]">Token</dt>
              <dd className="break-all">{token}</dd>
            </dl>
          </details>
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            The QR encodes the URL + token. A future APK build with a QR scanner
            could consume it on first launch. For now it&apos;s for the extension
            flow below.
          </p>
        </div>
      </section>

      {/*
        v0.5.0 T-17 / F-038 / gap G-4 — Chrome extension bootstrap UX.
        The extension itself ships in wave 5 (T-CF-15..T-CF-21); until
        then the link targets chrome://extensions so the user can at
        least find the Extensions page after sideloading. Once the
        extension publishes an options page at a known
        chrome-extension://<id>/options.html the link will be updated —
        but for a locally-loaded unpacked extension, chrome://extensions
        is the canonical entry point (click "Details" on the Brain row →
        "Extension options").
      */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Chrome extension — paste token
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-xs text-[var(--text-secondary)]">
            <li>
              Install the Brain extension (see{" "}
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
              , find <strong>Brain</strong>, click <strong>Details → Extension options</strong>.
            </li>
            <li>
              Set <strong>Brain URL</strong> to{" "}
              <code className="font-mono text-[var(--text-primary)]">
                {BRAIN_TUNNEL_URL}
              </code>{" "}
              and paste the token below into the <strong>Token</strong> field.
            </li>
            <li>Click <strong>Test connection</strong>, then <strong>Save</strong>.</li>
          </ol>
          <LanInfoActions token={token} />
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
