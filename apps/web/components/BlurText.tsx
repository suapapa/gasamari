"use client";

import { memo, useState } from "react";
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface BlurTextProps {
  text: string;
  className?: string;
  glowColor?: string;
}

interface TransitionVariant {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
}

/** 0.8 = 20% slower entrance animations */
const TRANSITION_SPEED = 0.8;

function withTransitionSpeed(transition: Transition): Transition {
  const duration = transition.duration ?? 0.5;
  if (typeof duration !== "number") return transition;

  return { ...transition, duration: duration / TRANSITION_SPEED };
}

const TRANSITION_VARIANTS: TransitionVariant[] = [
  {
    initial: { opacity: 0, filter: "blur(12px)", y: 10 },
    animate: { opacity: 1, filter: "blur(0px)", y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },
  {
    initial: { opacity: 0, scale: 1.15 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.45, ease: "easeOut" },
  },
  {
    initial: { opacity: 0, rotate: -4, y: 15 },
    animate: { opacity: 1, rotate: 0, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  {
    initial: { opacity: 0, rotate: 4, y: -10 },
    animate: { opacity: 1, rotate: 0, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  {
    initial: { opacity: 0, filter: "blur(8px)", scale: 0.92 },
    animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  {
    initial: { opacity: 0, y: 20, skewY: 3 },
    animate: { opacity: 1, y: 0, skewY: 0 },
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
  },
  {
    initial: { opacity: 0, x: -20, filter: "blur(6px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    transition: { duration: 0.5, ease: "easeOut" },
  },
];

function pickRandomVariant() {
  return TRANSITION_VARIANTS[
    Math.floor(Math.random() * TRANSITION_VARIANTS.length)
  ];
}

interface AnimatedParagraphProps {
  text: string;
  glowColor: string;
  className?: string;
}

const AnimatedParagraph = memo(function AnimatedParagraph({
  text,
  glowColor,
  className,
}: AnimatedParagraphProps) {
  const reducedMotion = useReducedMotion();
  const [variant] = useState(pickRandomVariant);

  if (reducedMotion) {
    return (
      <p
        className={cn("font-lyrics text-center font-medium", className)}
        style={{ textShadow: `0 0 20px ${glowColor}80` }}
      >
        {text}
      </p>
    );
  }

  return (
    <motion.p
      className={cn("font-lyrics text-center font-medium", className)}
      initial={variant.initial}
      animate={variant.animate}
      transition={withTransitionSpeed(variant.transition)}
      style={{ textShadow: `0 0 20px ${glowColor}80` }}
    >
      {text}
    </motion.p>
  );
});

export const BlurText = memo(function BlurText({
  text,
  className,
  glowColor = "#4338CA",
}: BlurTextProps) {
  const paragraphs = text.split(/\n+/).filter(Boolean);

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      aria-live="polite"
    >
      {paragraphs.map((paragraph, index) => (
        <AnimatedParagraph
          key={`${paragraph}-${index}`}
          text={paragraph}
          glowColor={glowColor}
        />
      ))}
    </div>
  );
});
