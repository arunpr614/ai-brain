"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, ExternalLink } from "lucide-react";

export interface YouTubePlayerSyncProps {
  videoId: string;
  sourceUrl: string;
  title: string;
  onTimeUpdate?: (currentTimeMs: number) => void;
  seekTargetMs?: number | null;
  onSeekHandled?: () => void;
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

interface YTEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      events?: {
        onReady?: (event: YTEvent) => void;
        onStateChange?: (event: YTEvent) => void;
      };
    },
  ) => YTPlayer;
}

function getYT(): YTNamespace | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { YT?: YTNamespace }).YT;
}

export function YouTubePlayerSync({
  videoId,
  sourceUrl,
  title,
  onTimeUpdate,
  seekTargetMs,
  onSeekHandled,
}: YouTubePlayerSyncProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const playerRef = useRef<YTPlayer | null>(null);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initPlayer = () => {
      const yt = getYT();
      if (!yt || !yt.Player) {
        return false;
      }

      if (iframeRef.current && !playerRef.current) {
        playerRef.current = new yt.Player(iframeRef.current, {
          events: {
            onReady: (event: YTEvent) => {
              const dur = event.target.getDuration();
              if (dur) setDurationSec(dur);
            },
            onStateChange: (event: YTEvent) => {
              // YT.PlayerState.PLAYING === 1, PAUSED === 2
              setIsPlaying(event.data === 1);
            },
          },
        });
      }
      return true;
    };

    if (!getYT()) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    if (!initPlayer()) {
      checkInterval = setInterval(() => {
        if (initPlayer()) {
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Periodic time polling when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (playerRef.current) {
        try {
          const sec = playerRef.current.getCurrentTime();
          setCurrentTimeSec(sec);
          onTimeUpdate?.(Math.floor(sec * 1000));
        } catch {
          // ignore
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, onTimeUpdate]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTargetMs != null && seekTargetMs >= 0 && playerRef.current) {
      try {
        const sec = seekTargetMs / 1000;
        playerRef.current.seekTo(sec, true);
        onTimeUpdate?.(seekTargetMs);
        onSeekHandled?.();
      } catch {
        // ignore
      }
    }
  }, [seekTargetMs, onSeekHandled, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {
      // ignore
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  }, [isMuted]);

  const seekRelative = useCallback((deltaSec: number) => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime();
      const target = Math.max(0, current + deltaSec);
      playerRef.current.seekTo(target, true);
    } catch {
      // ignore
    }
  }, []);

  const formatTime = (totalSeconds: number) => {
    const sec = Math.floor(totalSeconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      {/* 16:9 Video Container */}
      <div className="relative w-full aspect-video bg-black">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Synchronized Media Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="p-1.5 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-[var(--text-primary)] transition-colors border border-[var(--border)]"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={() => seekRelative(-10)}
            aria-label="Seek backward 10 seconds"
            className="px-2 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] transition-colors border border-[var(--border)] font-mono text-[11px]"
          >
            -10s
          </button>
          <button
            type="button"
            onClick={() => seekRelative(10)}
            aria-label="Seek forward 10 seconds"
            className="px-2 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] transition-colors border border-[var(--border)] font-mono text-[11px]"
          >
            +10s
          </button>
          <span className="font-mono text-xs text-[var(--text-primary)] ml-1">
            {formatTime(currentTimeSec)}
            {durationSec > 0 && <span className="text-[var(--text-tertiary)]"> / {formatTime(durationSec)}</span>}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="p-1.5 rounded-lg hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] transition-colors"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open on YouTube"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
          >
            <span>YouTube</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
