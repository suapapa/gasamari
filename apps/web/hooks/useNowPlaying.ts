"use client";

import { useEffect, useRef, useState } from "react";
import type { NowPlayingTrack } from "@/types";

const POLL_INTERVAL_MS = 2_000;

interface NowPlayingState {
  track: NowPlayingTrack | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useNowPlaying(): NowPlayingState & { refetch: () => void } {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const pollRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active) return;

      try {
        const statusRes = await fetch("/api/auth/status");
        const statusData = (await statusRes.json()) as { authenticated: boolean };
        if (!active) return;

        setIsAuthenticated(statusData.authenticated);

        if (!statusData.authenticated) {
          setTrack(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/spotify/now-playing");
        if (!active) return;

        if (res.status === 401) {
          setIsAuthenticated(false);
          setTrack(null);
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          if (res.status !== 502) {
            setError("Spotify API error");
          }
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as { track: NowPlayingTrack | null };
        if (!active) return;

        setError(null);

        if (data.track) {
          trackIdRef.current = data.track.trackId;
          setTrack(data.track);
        } else {
          trackIdRef.current = null;
          setTrack(null);
        }
      } catch {
        if (active) setError("Network error");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    pollRef.current = poll;
    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return {
    track,
    isAuthenticated,
    isLoading,
    error,
    refetch: () => pollRef.current?.() ?? Promise.resolve(),
  };
}
