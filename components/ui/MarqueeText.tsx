"use client";

import { type ReactNode } from "react";

interface MarqueeTextProps {
  children: ReactNode;
}

/**
 * Animate overflowing text on hover with accessibility support.
 * - Clips overflow text by default (overflow-hidden, whitespace-nowrap)
 * - On hover, animate scroll if text overflows
 * - Respects prefers-reduced-motion with fallback underline
 */
export default function MarqueeText({ children }: MarqueeTextProps) {
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <span
        className="
          inline-block
          hover:animate-marquee
          motion-reduce:hover:animate-none
          motion-reduce:hover:underline
        "
      >
        {children}
      </span>
    </div>
  );
}
