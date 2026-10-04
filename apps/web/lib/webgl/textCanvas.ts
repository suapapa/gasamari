const FONT_FAMILY = "Paperozi, sans-serif";

export interface TextCanvasResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function isCjk(char: string): boolean {
  return /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(char);
}

function wrapLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [];

  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char === " " ? "" : char;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= 1 || text.split("").some(isCjk)) return lines;

  return lines;
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  const words = paragraph.split(/(\s+)/);
  if (words.length <= 1 || paragraph.split("").some(isCjk)) {
    return wrapLine(ctx, paragraph, maxWidth);
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current + word;
    if (ctx.measureText(next).width > maxWidth && current.trim()) {
      lines.push(current.trimEnd());
      current = word.trimStart();
    } else {
      current = next;
    }
  }

  if (current.trim()) lines.push(current.trimEnd());
  return lines;
}

export async function ensureLyricsFont(weight = 500): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      document.fonts.load(`${weight} 64px ${FONT_FAMILY}`),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 400);
      }),
    ]);
  } catch {
    // Fall through with system fallback if remote font fails.
  }
}

export function renderLyricsTexture(
  text: string,
  cssWidth: number,
  cssHeight: number,
  glowColor: string,
  dpr = Math.min(window.devicePixelRatio || 1, 2),
): TextCanvasResult {
  const width = Math.max(2, Math.floor(Math.max(cssWidth, 320) * dpr));
  const height = Math.max(2, Math.floor(Math.max(cssHeight, 180) * dpr));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width, height };

  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Match CurrentLyrics clamp(2.75rem, 7vw + 1rem, 8rem) roughly.
  const layoutWidth = Math.max(cssWidth, 320);
  const vw = layoutWidth / 100;
  const cssFontPx = Math.min(128, Math.max(44, 7 * vw + 16));
  const fontPx = cssFontPx * dpr;
  const maxTextWidth = width * 0.88;
  const lineHeight = fontPx * 1.15;

  ctx.font = `500 ${fontPx}px ${FONT_FAMILY}`;

  const paragraphs = text.split(/\n+/).filter(Boolean);
  const lines = paragraphs.flatMap((p) => wrapParagraph(ctx, p, maxTextWidth));
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  const startY = height / 2 - blockHeight / 2 + lineHeight / 2;

  ctx.fillStyle = "#F8FAFC";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 28 * dpr;

  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i] ?? "", width / 2, startY + i * lineHeight);
  }

  // Second pass without blur for crisp glyph cores.
  ctx.shadowBlur = 0;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i] ?? "", width / 2, startY + i * lineHeight);
  }

  return { canvas, width, height };
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return [0.26, 0.22, 0.79];
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}
