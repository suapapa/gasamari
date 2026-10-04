"use client";

import { useEffect, useRef, useState } from "react";
import { BlurText } from "@/components/BlurText";
import { LyricsEngine } from "@/lib/webgl/LyricsEngine";
import { cn } from "@/lib/utils";

interface WebGLLyricsProps {
  text: string;
  glowColor: string;
  className?: string;
}

export function isWebGLAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") || canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function WebGLLyrics({ text, glowColor, className }: WebGLLyricsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LyricsEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef({ text, glowColor });
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    latestRef.current = { text, glowColor };
  }, [text, glowColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let engine: LyricsEngine | null = null;
    let relayoutTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      engine = new LyricsEngine(canvas, {
        onError: () => setUseFallback(true),
      });
    } catch {
      const id = window.setTimeout(() => setUseFallback(true), 0);
      return () => window.clearTimeout(id);
    }

    engineRef.current = engine;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      engine?.resize(Math.max(clientWidth, 1), Math.max(clientHeight, 1));
    };

    resize();
    void engine.setLine(latestRef.current.text, latestRef.current.glowColor);

    const observer = new ResizeObserver(() => {
      resize();
      if (relayoutTimer) clearTimeout(relayoutTimer);
      relayoutTimer = setTimeout(() => {
        void engine?.relayout(
          latestRef.current.text,
          latestRef.current.glowColor,
        );
      }, 80);
    });
    observer.observe(container);

    return () => {
      if (relayoutTimer) clearTimeout(relayoutTimer);
      observer.disconnect();
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (useFallback) return;
    const engine = engineRef.current;
    const container = containerRef.current;
    if (!engine || !container) return;

    engine.resize(
      Math.max(container.clientWidth, 1),
      Math.max(container.clientHeight, 1),
    );
    void engine.setLine(text, glowColor);
  }, [text, glowColor, useFallback]);

  if (useFallback) {
    return (
      <BlurText
        text={text}
        className="w-full px-4 sm:px-8 md:px-12 text-[clamp(2.75rem,7vw+1rem,8rem)] leading-[1.15] break-keep text-foreground"
        glowColor={glowColor}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      aria-live="polite"
      aria-label={text}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <span className="sr-only">{text}</span>
    </div>
  );
}
