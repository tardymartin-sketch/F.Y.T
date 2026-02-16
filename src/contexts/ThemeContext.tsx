// ============================================================
// F.Y.T - THEME CONTEXT
// src/contexts/ThemeContext.tsx
// Contexte pour gérer les thèmes visuels de l'application
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

export type ThemeName =
  | 'minimal-lavender'
  | 'minimal-slate'
  | 'minimal-warm'
  | 'dark-lavender'
  | 'dark-warm';

export interface ThemeInfo {
  id: ThemeName;
  label: string;
  color: string;
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeInfo[];
}

// ============================================================
// CONFIGURATION DES THÈMES
// ============================================================

export const AVAILABLE_THEMES: ThemeInfo[] = [
  // Thèmes clairs
  { id: 'minimal-lavender', label: 'Lavande', color: '#6366f1' },
  { id: 'minimal-slate', label: 'Ardoise', color: '#475569' },
  { id: 'minimal-warm', label: 'Chaleureux', color: '#c2410c' },
  // Thèmes sombres
  { id: 'dark-lavender', label: 'Nuit Lavande', color: '#818cf8' },
  { id: 'dark-warm', label: 'Nuit Chaude', color: '#fb923c' },
];

const STORAGE_KEY = 'F.Y.T_theme';
const DEFAULT_THEME: ThemeName = 'minimal-lavender';

// ============================================================
// CONTEXTE
// ============================================================

const ThemeContext = createContext<ThemeContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    // Lecture initiale depuis localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_THEMES.some(t => t.id === stored)) {
      return stored as ThemeName;
    }
    return DEFAULT_THEME;
  });

  // Appliquer le thème au DOM
  const applyTheme = useCallback((themeName: ThemeName) => {
    document.documentElement.setAttribute('data-theme', themeName);
  }, []);

  // Changer de thème
  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Appliquer le thème au montage initial
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    themes: AVAILABLE_THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
