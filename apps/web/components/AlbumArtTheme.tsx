"use client";

import { cn } from "@/lib/utils";
import type { ThemeColors } from "@/types";

interface AlbumArtThemeProps {
  albumArtUrl: string | null;
  theme: ThemeColors;
  children: React.ReactNode;
}

export function AlbumArtTheme({ albumArtUrl, theme, children }: AlbumArtThemeProps) {
  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${theme.primary} 0%, ${theme.background} 70%)`,
      }}
    >
      {albumArtUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${albumArtUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px)",
          }}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background",
        )}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </div>
  );
}
