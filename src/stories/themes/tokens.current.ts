// ===========================================
// THEME: Current (Actuel - Bleu/Emerald)
// Direction: Design actuel de F.Y.T
// ===========================================

export const tokensCurrent = {
  name: 'current',
  label: 'Actuel (Bleu/Emerald)',

  colors: {
    primary: {
      main: '#3b82f6',      // blue-500
      light: '#60a5fa',     // blue-400
      dark: '#2563eb',      // blue-600
      contrast: '#ffffff',
    },
    accent: {
      main: '#10b981',      // emerald-500
      light: '#34d399',     // emerald-400
      dark: '#059669',      // emerald-600
      contrast: '#ffffff',
    },
    background: {
      primary: '#020617',   // slate-950
      secondary: '#0f172a', // slate-900
      tertiary: '#1e293b',  // slate-800
      elevated: '#334155',  // slate-700
    },
    text: {
      primary: '#f8fafc',   // slate-50
      secondary: '#94a3b8', // slate-400
      muted: '#64748b',     // slate-500
    },
    border: {
      default: '#334155',   // slate-700
      subtle: '#1e293b',    // slate-800
    },
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  gradients: {
    primary: 'from-blue-600 to-emerald-600',
    primaryHover: 'from-blue-500 to-emerald-500',
    card: 'from-slate-800/80 to-slate-900/80',
  },

  effects: {
    glassBg: 'rgba(15, 23, 42, 0.8)',
    glassBlur: '12px',
    shadowColor: 'rgba(59, 130, 246, 0.25)',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
} as const;

export type ThemeTokens = typeof tokensCurrent;
