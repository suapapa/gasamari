import type { ThemeColors } from "@/types";

export const DEFAULT_THEME: ThemeColors = {
  background: "#0F0F23",
  primary: "#1E1B4B",
  accent: "#22C55E",
  glow: "#4338CA",
};

export function themeFromHex(hex: string): ThemeColors {
  return {
    background: "#0F0F23",
    primary: darkenHex(hex, 0.4),
    accent: hex,
    glow: hex,
  };
}

function darkenHex(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return DEFAULT_THEME.primary;

  const r = Math.max(0, Math.floor(parseInt(normalized.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(normalized.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(normalized.slice(4, 6), 16) * (1 - amount)));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
