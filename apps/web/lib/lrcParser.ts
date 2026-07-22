import type { LyricLine } from "@/types";

const LRC_LINE_REGEX = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of lrc.split("\n")) {
    const match = rawLine.trim().match(LRC_LINE_REGEX);
    if (!match) continue;

    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseInt(match[2], 10);
    const fraction = match[3] ? Number.parseInt(match[3].padEnd(3, "0"), 10) : 0;
    const text = match[4].trim();

    if (!text) continue;

    lines.push({
      timeMs: minutes * 60_000 + seconds * 1_000 + fraction,
      text,
    });
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function findActiveLineIndex(
  lines: LyricLine[],
  progressMs: number,
  offsetMs = 0,
): number {
  if (lines.length === 0) return -1;

  const adjusted = progressMs + offsetMs;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (adjusted >= lines[i].timeMs) return i;
  }

  return -1;
}
