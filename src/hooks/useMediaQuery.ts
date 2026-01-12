// ===========================================
// F.Y.T - Hook useMediaQuery
// src/hooks/useMediaQuery.ts
// Détection responsive pour adapter l'interface
// ===========================================

import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour détecter les media queries
 * @param query - La media query CSS à surveiller (ex: "(max-width: 768px)")
 * @returns boolean indiquant si la query match
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR safety
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // Mettre à jour l'état initial
    setMatches(mediaQuery.matches);

    // Handler pour les changements
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ajouter le listener
    mediaQuery.addEventListener('change', handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

// ===========================================
// BREAKPOINTS CONSTANTS
// ===========================================

export const BREAKPOINTS = {
  mobile: 768,    // < 768px = mobile
  tablet: 1024,   // 768px - 1023px = tablet
  desktop: 1024,  // >= 1024px = desktop
} as const;

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  touchDevice: '(hover: none) and (pointer: coarse)',
} as const;

// ===========================================
// CONVENIENCE HOOKS
// ===========================================

/**
 * Hook simplifié pour détecter si on est sur mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_QUERIES.mobile);
}

/**
 * Hook simplifié pour détecter si on est sur tablette
 */
export function useIsTablet(): boolean {
  return useMediaQuery(MEDIA_QUERIES.tablet);
}

/**
 * Hook simplifié pour détecter si on est sur desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(MEDIA_QUERIES.desktop);
}

/**
 * Hook pour détecter un appareil tactile
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery(MEDIA_QUERIES.touchDevice);
}

/**
 * Hook combiné retournant le type d'appareil actuel
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
