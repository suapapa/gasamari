"use client";

import { memo } from "react";
import { BlurText } from "@/components/BlurText";
import type { LyricLine, ThemeColors } from "@/types";

interface CurrentLyricsProps {
  line: LyricLine | null;
  theme: ThemeColors;
  isLoading: boolean;
}

export const CurrentLyrics = memo(function CurrentLyrics({
  line,
  theme,
  isLoading,
}: CurrentLyricsProps) {
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

  return (
    <BlurText
      key={line.timeMs}
      text={line.text}
      className="w-full px-4 sm:px-8 md:px-12 text-[clamp(2.75rem,7vw+1rem,8rem)] leading-[1.15] break-keep text-foreground"
      glowColor={theme.glow}
    />
  );
});
