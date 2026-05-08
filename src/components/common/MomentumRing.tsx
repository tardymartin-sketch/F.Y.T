// ============================================================
// F.Y.T - MOMENTUM RING
// src/components/common/MomentumRing.tsx
// Animated SVG arc showing session momentum score (0-100).
// Colors: indigo (0-40) → emerald (40-70) → amber (70-100)
// Respects prefers-reduced-motion. ARIA live region for updates.
// ============================================================

import React, { useMemo } from 'react';
import type { MomentumBreakdown } from '../../utils/momentum';

interface MomentumRingProps {
  breakdown: MomentumBreakdown;
  size?: number;
  strokeWidth?: number;
}

function getColor(score: number): string {
  if (score < 40) return 'var(--color-primary, #6366f1)';   // indigo
  if (score < 70) return 'var(--color-success, #059669)';   // emerald
  return 'var(--color-warning, #d97706)';                    // amber
}

export function MomentumRing({ breakdown, size = 48, strokeWidth = 4 }: MomentumRingProps) {
  const { total } = breakdown;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(total / 100, 1);
  const dashOffset = circumference * (1 - progress);
  const color = useMemo(() => getColor(total), [total]);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="meter"
      aria-label={`Score momentum : ${Math.round(total)} sur 100`}
      aria-valuenow={Math.round(total)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-live="polite"
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={prefersReducedMotion ? undefined : {
            transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.4s ease',
          }}
        />
      </svg>
      {/* Score text */}
      <span
        className="absolute text-xs font-bold"
        style={{ color }}
      >
        {Math.round(total)}
      </span>
    </div>
  );
}
