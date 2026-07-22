"use client";

import Image from "next/image";
import type { NowPlayingTrack } from "@/types";

interface NowPlayingHeaderProps {
  track: NowPlayingTrack | null;
}

export function NowPlayingHeader({ track }: NowPlayingHeaderProps) {
  if (!track) return null;

  return (
    <header className="flex items-center gap-4 px-6 pt-safe">
      {track.albumArt && (
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg shadow-lg">
          <Image
            src={track.albumArt}
            alt={`${track.albumName} album art`}
            fill
            className="object-cover"
            sizes="56px"
            unoptimized
          />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{track.trackName}</p>
        <p className="truncate text-xs text-foreground/60">{track.artistName}</p>
      </div>
    </header>
  );
}
