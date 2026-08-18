"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PlayerSyncContextType {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
  seekTargetMs: number | null;
  setCurrentTimeMs: (ms: number) => void;
  setDurationMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  seekTo: (timestampMs: number) => void;
  clearSeekTarget: () => void;
}

const PlayerSyncContext = createContext<PlayerSyncContextType | null>(null);

export function PlayerSyncProvider({ children }: { children: ReactNode }) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);

  const seekTo = useCallback((timestampMs: number) => {
    setCurrentTimeMs(timestampMs);
    setSeekTargetMs(timestampMs);
  }, []);

  const clearSeekTarget = useCallback(() => {
    setSeekTargetMs(null);
  }, []);

  return (
    <PlayerSyncContext.Provider
      value={{
        currentTimeMs,
        durationMs,
        isPlaying,
        playbackRate,
        seekTargetMs,
        setCurrentTimeMs,
        setDurationMs,
        setIsPlaying,
        setPlaybackRate,
        seekTo,
        clearSeekTarget,
      }}
    >
      {children}
    </PlayerSyncContext.Provider>
  );
}

export function usePlayerSync(): PlayerSyncContextType {
  const context = useContext(PlayerSyncContext);
  if (!context) {
    throw new Error("usePlayerSync must be used within a PlayerSyncProvider");
  }
  return context;
}
