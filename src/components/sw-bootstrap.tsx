"use client";

import { useEffect } from "react";
import { registerAppShellSW } from "@/lib/client/register-sw";

/*
 * Tiny client component that calls registerAppShellSW once on mount.
 * Lives in the root layout next to <ShareHandler />. No props, no
 * children, no UI surface.
 */
export function SWBootstrap(): null {
  useEffect(() => {
    registerAppShellSW();
  }, []);
  return null;
}
