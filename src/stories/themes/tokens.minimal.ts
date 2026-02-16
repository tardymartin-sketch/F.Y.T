// ===========================================
// THEME: Clean Minimal (Clair)
// Direction C: Épuré, moderne type Apple
// ===========================================

export const tokensMinimal = {
  name: 'minimal',
  label: 'Clean Minimal (Clair)',

  colors: {
    primary: {
      main: '#2563eb',      // Blue-600 (plus subtil)
      light: '#3b82f6',     // Blue-500
      dark: '#1d4ed8',      // Blue-700
      contrast: '#ffffff',
    },
    accent: {
      main: '#059669',      // Emerald-600 (plus subtil)
      light: '#10b981',     // Emerald-500
      dark: '#047857',      // Emerald-700
      contrast: '#ffffff',
    },
    background: {
      primary: '#ffffff',   // Blanc pur
      secondary: '#f8fafc', // Slate-50
      tertiary: '#f1f5f9',  // Slate-100
      elevated: '#e2e8f0',  // Slate-200
    },
    text: {
      primary: '#0f172a',   // Slate-900
      secondary: '#475569', // Slate-600
      muted: '#94a3b8',     // Slate-400
    },
    border: {
      default: '#e2e8f0',   // Slate-200
      subtle: '#f1f5f9',    // Slate-100
    },
    status: {
      success: '#16a34a',   // Green-600
      warning: '#d97706',   // Amber-600
      error: '#dc2626',     // Red-600
      info: '#2563eb',      // Blue-600
    },
  },

  gradients: {
    primary: 'from-blue-600 to-blue-500',
    primaryHover: 'from-blue-500 to-blue-400',
    card: 'from-white to-slate-50',
  },

  effects: {
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBlur: '8px',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
  },

  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },
} as const;
