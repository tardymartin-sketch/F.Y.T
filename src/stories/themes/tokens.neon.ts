// ===========================================
// THEME: Neon Gym (Néon)
// Direction D: Gaming/Esport, couleurs vives
// ===========================================

export const tokensNeon = {
  name: 'neon',
  label: 'Neon Gym (Néon)',

  colors: {
    primary: {
      main: '#00ffff',      // Cyan néon
      light: '#67ffff',     // Cyan clair
      dark: '#00cccc',      // Cyan foncé
      contrast: '#000000',
    },
    accent: {
      main: '#ff00ff',      // Magenta néon
      light: '#ff66ff',     // Magenta clair
      dark: '#cc00cc',      // Magenta foncé
      contrast: '#000000',
    },
    background: {
      primary: '#030712',   // Gray-950 (très sombre)
      secondary: '#0a0f1a', // Bleu très foncé
      tertiary: '#111827',  // Gray-900
      elevated: '#1f2937',  // Gray-800
    },
    text: {
      primary: '#f9fafb',   // Gray-50
      secondary: '#9ca3af', // Gray-400
      muted: '#6b7280',     // Gray-500
    },
    border: {
      default: '#374151',   // Gray-700
      subtle: '#1f2937',    // Gray-800
    },
    status: {
      success: '#00ff88',   // Vert néon
      warning: '#ffff00',   // Jaune néon
      error: '#ff0055',     // Rouge néon
      info: '#00ffff',      // Cyan (info = primary)
    },
  },

  gradients: {
    primary: 'from-cyan-400 to-fuchsia-500',
    primaryHover: 'from-cyan-300 to-fuchsia-400',
    card: 'from-gray-900/90 to-gray-950/90',
  },

  effects: {
    glassBg: 'rgba(10, 15, 26, 0.9)',
    glassBlur: '16px',
    shadowColor: 'rgba(0, 255, 255, 0.4)',
    glowCyan: '0 0 20px rgba(0, 255, 255, 0.5)',
    glowMagenta: '0 0 20px rgba(255, 0, 255, 0.5)',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
} as const;
