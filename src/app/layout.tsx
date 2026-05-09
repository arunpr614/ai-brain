import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ShareHandler } from "@/components/share-handler";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

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
  title: "AI Brain",
  description: "Local-first personal knowledge app",
};

async function resolveTheme(): Promise<{ pref: Theme; resolved: "light" | "dark" }> {
  const c = await cookies();
  const raw = c.get(THEME_COOKIE)?.value;
  const pref: Theme = isTheme(raw) ? raw : "system";
  const resolved = pref === "dark" ? "dark" : "light";
  return { pref, resolved };
}

const themeScript = `(function(){try{var m=document.cookie.match(/${THEME_COOKIE}=([^;]+)/);var p=m?m[1]:'system';if(p==='system'){var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';}else{document.documentElement.dataset.theme=p;}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { pref, resolved } = await resolveTheme();

  return (
    <html
      lang="en"
      data-theme={resolved}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      // The `themeScript` below reconciles `data-theme` to the client's
      // real preference BEFORE React hydrates, so the server's guess
      // ("light" or the stored cookie) and the actual browser attribute
      // may legitimately differ. Tell React it's OK.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CommandPaletteProvider>
          <ShareHandler />
          <div className="flex min-h-full">
            <Sidebar />
            {/*
              v0.5.0 T-15 / F-019 — bottom padding on mobile keeps the
              content clear of the fixed bottom-nav (see sidebar.tsx).
              ~3.5rem nav height + safe-area inset; cleared at `md:`.
            */}
            <main
              className="flex-1 overflow-x-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
              data-theme-pref={pref}
            >
              {children}
            </main>
          </div>
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
