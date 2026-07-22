"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { findActiveLineIndex } from "@/lib/lrcParser";
import type { LyricLine, NowPlayingTrack, SyncedLyrics } from "@/types";

interface SyncedLyricsState {
  lyrics: SyncedLyrics | null;
  activeLineIndex: number;
  activeLine: LyricLine | null;
  currentProgressMs: number;
  isLoading: boolean;
  error: string | null;
  syncOffsetMs: number;
  setSyncOffsetMs: (offset: number) => void;
}

function clampProgress(progressMs: number, durationMs: number): number {
  if (durationMs <= 0) return Math.max(0, progressMs);
  return Math.min(Math.max(0, progressMs), durationMs);
}

export function useSyncedLyrics(track: NowPlayingTrack | null): SyncedLyricsState {
  const [lyrics, setLyrics] = useState<SyncedLyrics | null>(null);
  const [currentProgressMs, setCurrentProgressMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const trackId = track?.trackId ?? null;

  const trackName = track?.trackName;
  const artistName = track?.artistName;
  const albumName = track?.albumName;

  useEffect(() => {
    if (!trackId || !trackName || !artistName || !albumName) {
      setLyrics(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      track: trackName,
      artist: artistName,
      album: albumName,
    });

    async function loadLyrics() {
      setIsLoading(true);
      setError(null);
      setLyrics(null);

      try {
        const res = await fetch(`/api/lyrics?${params.toString()}`);
        if (cancelled) return;

        if (res.status === 404) {
          setLyrics(null);
          setError("no_lyrics");
          return;
        }
        if (!res.ok) {
          setError("lyrics_error");
          return;
        }

        const data = (await res.json()) as SyncedLyrics;
        setLyrics(data);
      } catch {
        if (!cancelled) setError("network_error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLyrics();
    return () => {
      cancelled = true;
    };
  }, [trackId, trackName, artistName, albumName]);

  const progressMs = track?.progressMs;
  const durationMs = track?.durationMs;
  const isPlaying = track?.isPlaying;

  // Sync before paint so track skips don't flash the previous song's progress.
  useLayoutEffect(() => {
    if (progressMs === undefined || durationMs === undefined) {
      progressRef.current = 0;
      durationRef.current = 0;
      lastUpdateRef.current = performance.now();
      setCurrentProgressMs(0);
      return;
    }

    const next = clampProgress(progressMs, durationMs);
    progressRef.current = next;
    durationRef.current = durationMs;
    lastUpdateRef.current = performance.now();
    setCurrentProgressMs(next);
  }, [progressMs, durationMs, isPlaying, trackId]);

  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;

    const tick = () => {
      const elapsed = performance.now() - lastUpdateRef.current;
      const next = clampProgress(
        progressRef.current + elapsed,
        durationRef.current,
      );
      setCurrentProgressMs(next);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [trackId, isPlaying]);

  const activeLineIndex =
    track && lyrics?.lines.length
      ? findActiveLineIndex(lyrics.lines, currentProgressMs, offset)
      : -1;

  const activeLine =
    track && lyrics && activeLineIndex >= 0
      ? lyrics.lines[activeLineIndex]
      : null;

  return {
    lyrics: track ? lyrics : null,
    activeLineIndex,
    activeLine,
    currentProgressMs: track ? currentProgressMs : 0,
    isLoading: track ? isLoading : false,
    error: track ? error : null,
    syncOffsetMs: offset,
    setSyncOffsetMs: setOffset,
  };
}
