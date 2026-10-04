const FONT_FAMILY = "Paperozi, sans-serif";

export interface TextCanvasResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Last-resort wrap when a single token is wider than the line. */
function wrapOversizedToken(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [];

  const lines: string[] = [];
  let current = "";

  for (const char of text) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Wrap at whitespace (Korean 어절 / English words). Only split inside a token
 * when that token alone exceeds maxWidth — never break "같아" into "같"/"아"
 * just because the line is getting full.
 */
function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  const tokens = paragraph.split(/(\s+)/).filter((token) => token.length > 0);
  if (tokens.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trimEnd();
    if (trimmed) lines.push(trimmed);
    current = "";
  };

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      if (current) current += token;
      continue;
    }

    const candidate = current ? current + token : token;
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();

    if (ctx.measureText(token).width <= maxWidth) {
      current = token;
      continue;
    }

    const chunks = wrapOversizedToken(ctx, token, maxWidth);
    lines.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] ?? "";
  }

  flush();
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

  // Match CurrentLyrics clamp(3.25rem, 9vw + 1rem, 10rem) roughly.
  const layoutWidth = Math.max(cssWidth, 320);
  const vw = layoutWidth / 100;
  const cssFontPx = Math.min(160, Math.max(52, 9 * vw + 16));
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
