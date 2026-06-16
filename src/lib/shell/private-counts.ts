export interface PrivateShellCountDeps {
  sessionToken: string | null | undefined;
  verifySession: (token: string | null | undefined) => boolean;
  countNeedsUpgrade: () => number;
}

export interface PrivateShellCounts {
  needsUpgradeCount: number;
}

export function resolvePrivateShellCounts({
  sessionToken,
  verifySession,
  countNeedsUpgrade,
}: PrivateShellCountDeps): PrivateShellCounts {
  if (!verifySession(sessionToken)) {
    return { needsUpgradeCount: 0 };
  }

  return { needsUpgradeCount: countNeedsUpgrade() };
}
