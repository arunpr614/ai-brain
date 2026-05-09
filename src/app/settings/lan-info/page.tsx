/**
 * /settings/lan-info — pair APK + Chrome extension (v0.5.0 T-8 / F-038).
 *
 * Shows the Mac's LAN IP, the current BRAIN_LAN_TOKEN, a scannable QR code
 * of the setup URI, and a "Rotate token" button. The APK QR scanner reads
 * the QR directly; the extension options page reads the copyable token.
 *
 * Server-rendered so the token never reaches a client bundle at build time
 * — it's only present in the PIN-unlocked response body. Cache-Control:
 * no-store is set at both the page (via { dynamic: 'force-dynamic' } and
 * the Response headers) and the API route (see REVIEW missing-risk).
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { toDataURL } from "qrcode";
import { SESSION_COOKIE } from "@/lib/auth";
import { loadLanToken } from "@/lib/auth/bearer";
import { buildSetupUri, getLanIpv4 } from "@/lib/lan/info";
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
  const ip = getLanIpv4();

  if (!token || !ip) {
    return (
      <div className="mx-auto max-w-[680px] px-8 py-10">
        <h1 className="mb-4 text-[30px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          LAN pairing
        </h1>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          {!token && (
            <p>
              The LAN token is not configured. Restart the server with{" "}
              <code className="font-mono">npm run dev:lan</code> to auto-generate.
            </p>
          )}
          {!ip && (
            <p>
              No non-loopback network interface found. Connect to a Wi-Fi
              network and reload.
            </p>
          )}
        </div>
      </div>
    );
  }

  const setupUri = buildSetupUri(ip, token);
  const qrDataUri = await toDataURL(setupUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
  });

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <h1 className="mb-2 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        LAN pairing
      </h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        Scan this QR from the Brain APK on first launch, or paste the token
        into the Chrome extension settings. Each paired device keeps working
        until you rotate the token below.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Android APK — scan QR
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUri}
            alt="Setup QR code — scan with the Brain APK"
            width={256}
            height={256}
            className="rounded-md border border-[var(--border)]"
          />
          <p className="font-mono text-xs text-[var(--text-muted)]">
            {ip}:3000
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Chrome extension — paste token
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            In the extension options page, set <strong>Brain URL</strong> to{" "}
            <code className="font-mono text-[var(--text-primary)]">
              http://{ip}:3000
            </code>{" "}
            and paste the token below.
          </p>
          <LanInfoActions token={token} />
        </div>
      </section>
    </div>
  );
}
