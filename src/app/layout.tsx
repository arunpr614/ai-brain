import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ShareHandler } from "@/components/share-handler";
import { SWBootstrap } from "@/components/sw-bootstrap";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
import { countNeedsUpgradeItems } from "@/db/items";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { resolvePrivateShellCounts } from "@/lib/shell/private-counts";
import { resolveThemePreference, THEME_COOKIE } from "@/lib/theme";
import { processingNavigationEnabled } from "@/lib/processing/flags";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AI Memory",
    template: "%s · AI Memory",
  },
  applicationName: "AI Memory",
  description: "Private source-grounded memory for saved knowledge.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

function resolveThemeFromCookieStore(c: Awaited<ReturnType<typeof cookies>>): {
  resolved: "light" | "dark";
} {
  const raw = c.get(THEME_COOKIE)?.value;
  return { resolved: resolveThemePreference(raw) };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const c = await cookies();
  const { resolved } = resolveThemeFromCookieStore(c);
  const { needsUpgradeCount } = resolvePrivateShellCounts({
    sessionToken: c.get(SESSION_COOKIE)?.value,
    verifySession: verifySessionToken,
    countNeedsUpgrade: countNeedsUpgradeItems,
  });
  const processingNavigation = processingNavigationEnabled();

  return (
    <html
      lang="en"
	      data-theme={resolved}
	      className={`${inter.variable} ${jetbrainsMono.variable}`}
	      // ThemeBootstrap only migrates legacy/invalid cookies; it never follows OS dark mode.
	      suppressHydrationWarning
    >
      <head />
      <body>
        <CommandPaletteProvider processingEnabled={processingNavigation}>
          <ThemeBootstrap />
          <SWBootstrap />
          <ShareHandler />
          <div className="flex min-h-full">
            <Sidebar needsUpgradeCount={needsUpgradeCount} processingEnabled={processingNavigation} />
            {/*
              v0.5.0 T-15 / F-019 — bottom padding on mobile keeps the
              content clear of the fixed bottom-nav (see sidebar.tsx).
              ~3.5rem nav height + safe-area inset; cleared at `md:`.
            */}
	            <main
	              className="flex-1 overflow-x-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
	              data-theme-pref={resolved}
	            >
              {children}
            </main>
          </div>
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
