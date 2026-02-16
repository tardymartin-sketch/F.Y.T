// ===========================================
// THEME: Premium Fitness (Noir/Or)
// Direction A: App de luxe, haut de gamme
// ===========================================

export const tokensPremium = {
  name: 'premium',
  label: 'Premium Fitness (Noir/Or)',

  colors: {
    primary: {
      main: '#d4af37',      // Or/Gold
      light: '#e6c65a',     // Or clair
      dark: '#b8960c',      // Or foncé
      contrast: '#000000',
    },
    accent: {
      main: '#c9a227',      // Champagne
      light: '#dbb84a',     // Champagne clair
      dark: '#a68a1f',      // Champagne foncé
      contrast: '#000000',
    },
    background: {
      primary: '#000000',   // Noir pur
      secondary: '#0a0a0a', // Noir très léger
      tertiary: '#141414',  // Gris très foncé
      elevated: '#1f1f1f',  // Gris foncé
    },
    text: {
      primary: '#fafafa',   // Blanc cassé
      secondary: '#a3a3a3', // Gris neutre
      muted: '#737373',     // Gris moyen
    },
    border: {
      default: '#262626',   // Gris très foncé
      subtle: '#171717',    // Presque noir
    },
    status: {
      success: '#4ade80',   // Vert doux
      warning: '#fbbf24',   // Ambre
      error: '#f87171',     // Rouge doux
      info: '#d4af37',      // Or (info = primary)
    },
  },

  gradients: {
    primary: 'from-amber-600 to-yellow-500',
    primaryHover: 'from-amber-500 to-yellow-400',
    card: 'from-neutral-900/90 to-black/90',
  },

  effects: {
    glassBg: 'rgba(10, 10, 10, 0.9)',
    glassBlur: '16px',
    shadowColor: 'rgba(212, 175, 55, 0.2)',
  },

  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
} as const;
