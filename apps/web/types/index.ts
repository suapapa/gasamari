export interface NowPlayingTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface SyncedLyrics {
  track: string;
  artist: string;
  album: string;
  lines: LyricLine[];
  synced: boolean;
}

export interface ThemeColors {
  background: string;
  primary: string;
  accent: string;
  glow: string;
}

export type AppStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "no_track"
  | "no_lyrics"
  | "error"
  | "unauthenticated";
