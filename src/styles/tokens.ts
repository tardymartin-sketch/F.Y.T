// ===========================================
// F.Y.T - Design Tokens
// src/styles/tokens.ts
// Système de design unifié
// ===========================================

// ===========================================
// COULEURS
// ===========================================

export const colors = {
  // Couleurs principales
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Bleu principal
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  accent: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Emerald principal
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Couleurs de fond (dark mode)
  background: {
    primary: '#020617',   // slate-950
    secondary: '#0f172a', // slate-900
    tertiary: '#1e293b',  // slate-800
    elevated: '#334155',  // slate-700
  },

  // Texte
  text: {
    primary: '#f8fafc',   // slate-50
    secondary: '#94a3b8', // slate-400
    muted: '#64748b',     // slate-500
    disabled: '#475569',  // slate-600
  },

  // Bordures
  border: {
    default: '#334155',   // slate-700
    subtle: '#1e293b',    // slate-800
    focus: '#3b82f6',     // blue-500
  },

  // États
  success: '#22c55e',     // green-500
  warning: '#f59e0b',     // amber-500
  error: '#ef4444',       // red-500
  info: '#3b82f6',        // blue-500
} as const;

// ===========================================
// COULEURS RPE (Rating of Perceived Exertion)
// ===========================================

export const rpeColors = {
  1: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  2: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  3: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/30' },
  4: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/30' },
  5: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  6: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  7: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  8: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  9: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  10: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
} as const;

export const rpeLabels: Record<number, string> = {
  1: 'Très facile',
  2: 'Facile',
  3: 'Léger',
  4: 'Modéré',
  5: 'Un peu dur',
  6: 'Dur',
  7: 'Très dur',
  8: 'Extrêmement dur',
  9: 'Maximum',
  10: 'Échec',
};

/**
 * Obtenir les classes de couleur pour un RPE donné
 */
export function getRpeColorClasses(rpe: number): { bg: string; text: string; border: string } {
  const clampedRpe = Math.max(1, Math.min(10, Math.round(rpe))) as keyof typeof rpeColors;
  return rpeColors[clampedRpe];
}

/**
 * Obtenir le niveau de RPE (pour les alertes)
 */
export function getRpeLevel(rpe: number | null): 'low' | 'medium' | 'high' | 'critical' {
  if (rpe === null) return 'low';
  if (rpe <= 5) return 'low';
  if (rpe <= 7) return 'medium';
  if (rpe <= 8) return 'high';
  return 'critical';
}

/**
 * Obtenir une couleur RPE spécifique (bg, text, ou border)
 */
export function getRpeColor(rpe: number, type: 'bg' | 'text' | 'border'): string {
  const clampedRpe = Math.max(1, Math.min(10, Math.round(rpe))) as keyof typeof rpeColors;
  return rpeColors[clampedRpe][type];
}

// ===========================================
// ESPACEMENTS
// ===========================================

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// Alias sémantiques
export const spacingTokens = {
  micro: spacing[1],          // 4px - Micro-espacement
  compact: spacing[2],        // 8px - Espacement interne compact
  standard: spacing[3],       // 12px - Espacement interne standard
  card: spacing[4],           // 16px - Padding de carte
  section: spacing[6],        // 24px - Gap entre sections
  page: spacing[8],           // 32px - Marge de page
} as const;

// ===========================================
// TYPOGRAPHIE
// ===========================================

export const typography = {
  // Tailles
  sizes: {
    'display': '36px',
    'h1': '30px',
    'h2': '24px',
    'h3': '20px',
    'body': '16px',
    'body-sm': '14px',
    'caption': '12px',
    'tiny': '10px',
  },
  
  // Poids
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ===========================================
// TOUCH TARGETS (Zones tactiles)
// ===========================================

export const touchTargets = {
  minimum: '44px',      // Minimum recommandé (Apple/Google)
  standard: '48px',     // Standard confortable
  large: '56px',        // Zones importantes (FAB, CTA)
  listItem: '56px',     // Hauteur de ligne de liste
} as const;

// ===========================================
// ANIMATIONS
// ===========================================

export const animations = {
  // Durées
  durations: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // Easings
  easings: {
    default: 'ease-out',
    smooth: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

// Classes Tailwind pour les animations
export const animationClasses = {
  // Transitions standards
  transitionFast: 'transition-all duration-150 ease-out',
  transitionNormal: 'transition-all duration-200 ease-out',
  transitionSlow: 'transition-all duration-300 ease-in-out',
  
  // Hover states
  hoverScale: 'hover:scale-105 active:scale-95',
  hoverOpacity: 'hover:opacity-80 active:opacity-60',
  hoverBrightness: 'hover:brightness-110 active:brightness-90',
  
  // Press feedback
  pressScale: 'active:scale-95 transition-transform duration-100',
} as const;

// ===========================================
// OMBRES & ÉLÉVATIONS
// ===========================================

export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  
  // Ombres colorées
  blue: 'shadow-lg shadow-blue-500/25',
  emerald: 'shadow-lg shadow-emerald-500/25',
  orange: 'shadow-lg shadow-orange-500/25',
  red: 'shadow-lg shadow-red-500/25',
} as const;

// ===========================================
// BORDURES & RADIUS
// ===========================================

export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

// ===========================================
// Z-INDEX
// ===========================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const;

// ===========================================
// GRADIENTS
// ===========================================

export const gradients = {
  // Gradient principal (bleu → emerald)
  primary: 'bg-gradient-to-r from-blue-600 to-emerald-600',
  primaryHover: 'bg-gradient-to-r from-blue-500 to-emerald-500',
  
  // Gradient pour les cartes
  cardShine: 'bg-gradient-to-br from-slate-800/80 to-slate-900/80',
  
  // Gradient d'alerte (orange)
  warning: 'bg-gradient-to-r from-orange-500 to-amber-500',
  
  // Gradient de succès
  success: 'bg-gradient-to-r from-green-500 to-emerald-500',
} as const;

// ===========================================
// KEYFRAMES CSS (pour index.css)
// ===========================================

export const keyframes = {
  pulse: `
    @keyframes pulse-session {
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); 
      }
      50% { 
        transform: scale(1.05); 
        box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); 
      }
    }
  `,
  
  fadeIn: `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  
  slideUp: `
    @keyframes slide-up {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  slideInRight: `
    @keyframes slide-in-right {
      from { 
        opacity: 0;
        transform: translateX(20px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
} as const;

// ===========================================
// BOTTOM NAV DIMENSIONS
// ===========================================

export const bottomNav = {
  height: '64px',
  safeAreaPadding: 'env(safe-area-inset-bottom, 0px)',
  totalHeight: 'calc(64px + env(safe-area-inset-bottom, 0px))',
  fabSize: '56px',
  fabOffset: '16px', // Distance au-dessus de la bar
  iconSize: '24px',
  labelSize: '10px',
  tabWidth: '20%',
} as const;

// ===========================================
// SIDEBAR DIMENSIONS (Coach)
// ===========================================

export const sidebar = {
  widthExpanded: '240px',
  widthCollapsed: '72px',
  headerHeight: '64px',
} as const;
