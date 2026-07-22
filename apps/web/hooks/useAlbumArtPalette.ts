"use client";

import { useEffect, useState } from "react";
import { FastAverageColor } from "fast-average-color";
import { DEFAULT_THEME, themeFromHex } from "@/lib/theme";
import type { ThemeColors } from "@/types";

export function useAlbumArtPalette(albumArtUrl: string | null): ThemeColors {
  const [palette, setPalette] = useState<{ url: string; theme: ThemeColors } | null>(
    null,
  );

  useEffect(() => {
    if (!albumArtUrl) return;

    const fac = new FastAverageColor();
    let cancelled = false;

    const extract = async () => {
      try {
        const result = await fac.getColorAsync(albumArtUrl, {
          algorithm: "dominant",
          mode: "speed",
        });

        if (!cancelled && result.hex) {
          setPalette({ url: albumArtUrl, theme: themeFromHex(result.hex) });
        }
      } catch {
        if (!cancelled) {
          setPalette({ url: albumArtUrl, theme: DEFAULT_THEME });
        }
      }
    };

    void extract();

    return () => {
      cancelled = true;
      fac.destroy();
    };
  }, [albumArtUrl]);

  if (!albumArtUrl) return DEFAULT_THEME;
  if (palette?.url !== albumArtUrl) return DEFAULT_THEME;
  return palette.theme;
}
