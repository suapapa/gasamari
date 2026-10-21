"use client";

import { Minus, Plus } from "lucide-react";
import { AlbumArtTheme } from "@/components/AlbumArtTheme";
import { CurrentLyrics } from "@/components/CurrentLyrics";
import { NowPlayingHeader } from "@/components/NowPlayingHeader";
import { SpotifyLoginButton } from "@/components/SpotifyLoginButton";
import { useAlbumArtPalette } from "@/hooks/useAlbumArtPalette";
import { useAutoHideControls } from "@/hooks/useAutoHideControls";
import { useNowPlaying } from "@/hooks/useNowPlaying";
import { useSyncedLyrics } from "@/hooks/useSyncedLyrics";
import { cn } from "@/lib/utils";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LyricsViewer() {
  const { track, isAuthenticated, isLoading, error } = useNowPlaying();
  const {
    activeLine,
    currentProgressMs,
    isLoading: lyricsLoading,
    error: lyricsError,
    syncOffsetMs,
    setSyncOffsetMs,
  } = useSyncedLyrics(track);

  const theme = useAlbumArtPalette(track?.albumArt ?? null);

  // 재생 중에는 상단 타이틀 바와 하단 프로그레스 바를 숨기고,
  // 화면을 톡 치면 3초간 보여준 뒤 다시 숨긴다.
  const { isVisible: controlsVisible, showControls } = useAutoHideControls(
    Boolean(track),
  );

  const renderMessage = () => {
    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-4xl text-foreground">Gasamari</h1>
          <p className="max-w-md text-foreground/70 font-body">
            Connect your Spotify account and play a song to see synced lyrics in real time.
          </p>
          <SpotifyLoginButton isAuthenticated={false} />
        </div>
      );
    }

    if (isLoading) {
      return <p className="text-foreground/50 font-body">Loading playback...</p>;
    }

    if (error) {
      return <p className="text-red-400 font-body">{error}</p>;
    }

    if (!track) {
      return (
        <p className="text-center text-foreground/60 font-body">
          Nothing is playing. Start a song on Spotify.
        </p>
      );
    }

    if (lyricsError === "no_lyrics") {
      return (
        <p className="text-center text-foreground/60 font-body">
          Synced lyrics not found for this track.
        </p>
      );
    }

    if (lyricsError) {
      return (
        <p className="text-center text-foreground/60 font-body">
          Could not load lyrics. Check that the API server is running.
        </p>
      );
    }

    return (
      <CurrentLyrics
        line={activeLine}
        theme={theme}
        isLoading={lyricsLoading}
      />
    );
  };

  return (
    <AlbumArtTheme albumArtUrl={track?.albumArt ?? null} theme={theme}>
      <div
        className="relative flex flex-1 flex-col"
        onPointerDown={showControls}
        onMouseMove={showControls}
        onFocus={showControls}
      >
        {(track || isAuthenticated) && (
          <header
            inert={!controlsVisible}
            className={cn(
              "absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-6 py-3 pt-safe",
              "bg-gradient-to-b from-background/70 to-transparent",
              "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              controlsVisible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0",
            )}
          >
            <NowPlayingHeader track={track} />
            {isAuthenticated && (
              <div className="ml-auto shrink-0">
                <SpotifyLoginButton isAuthenticated />
              </div>
            )}
          </header>
        )}

        <main className="flex w-full flex-1 flex-col items-center justify-center px-2 sm:px-4 pb-safe">
          {renderMessage()}
        </main>

        {track && (
          <footer
            inert={!controlsVisible}
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 px-6 pb-6 pb-safe",
              "bg-gradient-to-t from-background/70 to-transparent",
              "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              controlsVisible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs text-foreground/50 font-body">
            <span className="justify-self-start">
              {formatTime(Math.min(currentProgressMs, track.durationMs))}
            </span>
            <div className="flex items-center gap-3 justify-self-center">
              <button
                type="button"
                onClick={() => setSyncOffsetMs(syncOffsetMs - 500)}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full",
                  "bg-muted/50 text-foreground/70 hover:bg-muted transition-colors",
                )}
                aria-label="Decrease sync offset by 500ms"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-16 text-center text-xs text-foreground/70 font-body">
                {syncOffsetMs > 0 ? "+" : ""}
                {syncOffsetMs}ms
              </span>
              <button
                type="button"
                onClick={() => setSyncOffsetMs(syncOffsetMs + 500)}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full",
                  "bg-muted/50 text-foreground/70 hover:bg-muted transition-colors",
                )}
                aria-label="Increase sync offset by 500ms"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <span className="justify-self-end">{formatTime(track.durationMs)}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${
                  track.durationMs > 0
                    ? Math.min(
                        100,
                        Math.max(0, (currentProgressMs / track.durationMs) * 100),
                      )
                    : 0
                }%`,
                backgroundColor: theme.accent,
              }}
            />
          </div>
          </footer>
        )}
      </div>
    </AlbumArtTheme>
  );
}
