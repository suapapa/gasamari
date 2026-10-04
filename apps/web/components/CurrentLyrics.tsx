"use client";

import { memo, useSyncExternalStore } from "react";
import { BlurText } from "@/components/BlurText";
import { isWebGLAvailable, WebGLLyrics } from "@/components/WebGLLyrics";
import type { LyricLine, ThemeColors } from "@/types";

interface CurrentLyricsProps {
  line: LyricLine | null;
  theme: ThemeColors;
  isLoading: boolean;
}

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function usePreferWebGL(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => isWebGLAvailable() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export const CurrentLyrics = memo(function CurrentLyrics({
  line,
  theme,
  isLoading,
}: CurrentLyricsProps) {
  const preferWebGL = usePreferWebGL();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/30" />
      </div>
    );
  }

  if (!line) {
    return (
      <p className="text-center text-lg text-foreground/50 font-body">
        ...
      </p>
    );
  }

  // Reduced motion / no WebGL: keep the lightweight DOM transition.
  if (!preferWebGL) {
    return (
      <BlurText
        key={line.timeMs}
        text={line.text}
        className="w-full px-4 sm:px-8 md:px-12 text-[clamp(3.25rem,9vw+1rem,10rem)] leading-[1.15] break-keep text-foreground"
        glowColor={theme.glow}
      />
    );
  }

  return (
    <WebGLLyrics
      text={line.text}
      glowColor={theme.glow}
      className="h-[min(58vh,34rem)] w-full max-w-6xl px-2 sm:px-4"
    />
  );
});
