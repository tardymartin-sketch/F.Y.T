// ===========================================
// ThemeProvider - Wrapper pour appliquer les thèmes dans Storybook
// ===========================================

import React, { useMemo } from 'react';
import { tokensCurrent, type ThemeTokens } from './tokens.current';
import { tokensPremium } from './tokens.premium';
import { tokensEnergetic } from './tokens.energetic';
import { tokensMinimal } from './tokens.minimal';
import { tokensNeon } from './tokens.neon';

// Map des thèmes disponibles
const themes: Record<string, ThemeTokens> = {
  current: tokensCurrent,
  premium: tokensPremium as unknown as ThemeTokens,
  energetic: tokensEnergetic as unknown as ThemeTokens,
  minimal: tokensMinimal as unknown as ThemeTokens,
  neon: tokensNeon as unknown as ThemeTokens,
};

interface ThemeProviderProps {
  theme: string;
  children: React.ReactNode;
}

/**
 * ThemeProvider - Applique les CSS variables du thème sélectionné
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, children }) => {
  const tokens = themes[theme] || themes.current;

  // Générer les CSS variables à partir des tokens
  const cssVariables = useMemo(() => ({
    // Couleurs primaires
    '--color-primary': tokens.colors.primary.main,
    '--color-primary-light': tokens.colors.primary.light,
    '--color-primary-dark': tokens.colors.primary.dark,
    '--color-primary-contrast': tokens.colors.primary.contrast,

    // Couleurs accent
    '--color-accent': tokens.colors.accent.main,
    '--color-accent-light': tokens.colors.accent.light,
    '--color-accent-dark': tokens.colors.accent.dark,

    // Background
    '--color-bg-primary': tokens.colors.background.primary,
    '--color-bg-secondary': tokens.colors.background.secondary,
    '--color-bg-tertiary': tokens.colors.background.tertiary,
    '--color-bg-elevated': tokens.colors.background.elevated,

    // Text
    '--color-text-primary': tokens.colors.text.primary,
    '--color-text-secondary': tokens.colors.text.secondary,
    '--color-text-muted': tokens.colors.text.muted,

    // Border
    '--color-border-default': tokens.colors.border.default,
    '--color-border-subtle': tokens.colors.border.subtle,

    // Status
    '--color-success': tokens.colors.status.success,
    '--color-warning': tokens.colors.status.warning,
    '--color-error': tokens.colors.status.error,
    '--color-info': tokens.colors.status.info,

    // Effects
    '--glass-bg': tokens.effects.glassBg,
    '--glass-blur': tokens.effects.glassBlur,
    '--shadow-color': tokens.effects.shadowColor,

    // Border radius
    '--radius-sm': tokens.borderRadius.sm,
    '--radius-md': tokens.borderRadius.md,
    '--radius-lg': tokens.borderRadius.lg,
    '--radius-xl': tokens.borderRadius.xl,
  }), [tokens]);

  // Déterminer si c'est un thème clair
  const isLightTheme = theme === 'minimal';

  return (
    <div
      style={cssVariables as React.CSSProperties}
      className={`min-h-screen p-6 ${isLightTheme ? 'bg-white' : 'bg-slate-950'}`}
    >
      {/* Badge indiquant le thème actif */}
      <div className={`fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium ${
        isLightTheme
          ? 'bg-slate-200 text-slate-700'
          : 'bg-slate-800 text-slate-300'
      }`}>
        🎨 {tokens.label}
      </div>

      {children}
    </div>
  );
};

// Export des thèmes pour usage direct
export { themes };
export type { ThemeTokens };
