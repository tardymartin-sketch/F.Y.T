// ===========================================
// THEME: Energetic Sport (Orange/Rose)
// Direction B: Dynamique, motivante
// ===========================================

export const tokensEnergetic = {
  name: 'energetic',
  label: 'Energetic Sport (Orange/Rose)',

  colors: {
    primary: {
      main: '#f97316',      // Orange-500
      light: '#fb923c',     // Orange-400
      dark: '#ea580c',      // Orange-600
      contrast: '#ffffff',
    },
    accent: {
      main: '#ec4899',      // Pink-500
      light: '#f472b6',     // Pink-400
      dark: '#db2777',      // Pink-600
      contrast: '#ffffff',
    },
    background: {
      primary: '#0c0a09',   // Stone-950
      secondary: '#1c1917', // Stone-900
      tertiary: '#292524',  // Stone-800
      elevated: '#44403c',  // Stone-700
    },
    text: {
      primary: '#fafaf9',   // Stone-50
      secondary: '#a8a29e', // Stone-400
      muted: '#78716c',     // Stone-500
    },
    border: {
      default: '#44403c',   // Stone-700
      subtle: '#292524',    // Stone-800
    },
    status: {
      success: '#22c55e',
      warning: '#fbbf24',
      error: '#ef4444',
      info: '#f97316',      // Orange (info = primary)
    },
  },

  gradients: {
    primary: 'from-orange-500 to-pink-500',
    primaryHover: 'from-orange-400 to-pink-400',
    card: 'from-stone-800/80 to-stone-900/80',
  },

  effects: {
    glassBg: 'rgba(28, 25, 23, 0.85)',
    glassBlur: '12px',
    shadowColor: 'rgba(249, 115, 22, 0.3)',
  },

  borderRadius: {
    sm: '2px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
} as const;
