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

interface LyricsFetchState {
  /** 이 결과를 가져온 곡. 현재 곡과 다르면 아직 로딩 중인 것으로 취급한다. */
  forTrackId: string | null;
  lyrics: SyncedLyrics | null;
  error: string | null;
  isLoading: boolean;
}

const IDLE_FETCH_STATE: LyricsFetchState = {
  forTrackId: null,
  lyrics: null,
  error: null,
  isLoading: false,
};

export function useSyncedLyrics(track: NowPlayingTrack | null): SyncedLyricsState {
  const [fetchState, setFetchState] = useState<LyricsFetchState>(IDLE_FETCH_STATE);
  const [currentProgressMs, setCurrentProgressMs] = useState(0);
  const [offset, setOffset] = useState(0);

  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const trackId = track?.trackId ?? null;

  const trackName = track?.trackName;
  const artistName = track?.artistName;
  const albumName = track?.albumName;

  useEffect(() => {
    if (!trackId || !trackName || !artistName || !albumName) return;

    let cancelled = false;
    const params = new URLSearchParams({
      track: trackName,
      artist: artistName,
      album: albumName,
    });

    async function loadLyrics() {
      setFetchState({
        forTrackId: trackId,
        lyrics: null,
        error: null,
        isLoading: true,
      });

      try {
        const res = await fetch(`/api/lyrics?${params.toString()}`);
        if (cancelled) return;

        if (res.status === 404) {
          setFetchState({
            forTrackId: trackId,
            lyrics: null,
            error: "no_lyrics",
            isLoading: false,
          });
          return;
        }
        if (!res.ok) {
          setFetchState({
            forTrackId: trackId,
            lyrics: null,
            error: "lyrics_error",
            isLoading: false,
          });
          return;
        }

        const data = (await res.json()) as SyncedLyrics;
        if (!cancelled) {
          setFetchState({
            forTrackId: trackId,
            lyrics: data,
            error: null,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setFetchState({
            forTrackId: trackId,
            lyrics: null,
            error: "network_error",
            isLoading: false,
          });
        }
      }
    }

    void loadLyrics();
    return () => {
      cancelled = true;
    };
  }, [trackId, trackName, artistName, albumName]);

  // 결과가 현재 곡의 것이 아니면 이전 곡 가사를 보여주지 않고 로딩으로 취급한다.
  const canFetchLyrics = Boolean(
    trackId && trackName && artistName && albumName,
  );
  const isCurrentFetch = canFetchLyrics && fetchState.forTrackId === trackId;
  const lyrics = isCurrentFetch ? fetchState.lyrics : null;
  const lyricsError = isCurrentFetch ? fetchState.error : null;
  const lyricsLoading = canFetchLyrics
    ? !isCurrentFetch || fetchState.isLoading
    : false;

  const progressMs = track?.progressMs;
  const durationMs = track?.durationMs;
  const isPlaying = track?.isPlaying;

  // 서버 스냅샷이 바뀌면 표시 중인 진행 시간을 그 값으로 되돌린다.
  // effect가 아닌 렌더 중 조정 패턴이라 곡이 바뀌어도 이전 곡의
  // 진행 시간이 한 프레임 번쩍이지 않는다.
  const [syncedSnapshot, setSyncedSnapshot] = useState({
    trackId,
    progressMs,
    durationMs,
    isPlaying,
  });
  if (
    syncedSnapshot.trackId !== trackId ||
    syncedSnapshot.progressMs !== progressMs ||
    syncedSnapshot.durationMs !== durationMs ||
    syncedSnapshot.isPlaying !== isPlaying
  ) {
    setSyncedSnapshot({ trackId, progressMs, durationMs, isPlaying });
    setCurrentProgressMs(
      progressMs === undefined || durationMs === undefined
        ? 0
        : clampProgress(progressMs, durationMs),
    );
  }

  // rAF 틱이 이어받을 기준값(ref)만 effect에서 맞춘다.
  useLayoutEffect(() => {
    if (progressMs === undefined || durationMs === undefined) {
      progressRef.current = 0;
      durationRef.current = 0;
      lastUpdateRef.current = performance.now();
      return;
    }

    progressRef.current = clampProgress(progressMs, durationMs);
    durationRef.current = durationMs;
    lastUpdateRef.current = performance.now();
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
    isLoading: track ? lyricsLoading : false,
    error: track ? lyricsError : null,
    syncOffsetMs: offset,
    setSyncOffsetMs: setOffset,
  };
}
