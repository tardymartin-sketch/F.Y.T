// ============================================
// F.Y.T V3 — HOOK useDeviceDetect
// src/hooks/useDeviceDetect.ts
// Détection device mobile/desktop SSR-safe
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface DeviceInfo {
  isMobile: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  hasTouch: boolean;
  hasMouse: boolean;
}

export interface UseDeviceDetectReturn extends DeviceInfo {
  /** Force une mise à jour de la détection */
  refresh: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const DEBOUNCE_MS = 200;

// Regex pour détection mobile via User-Agent
const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_REGEX = /iPad|Android(?!.*Mobile)/i;

// ============================================
// HELPER: DEBOUNCE
// ============================================

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Détecte si on est côté serveur (SSR)
 */
function isSSR(): boolean {
  return typeof window === 'undefined' || typeof navigator === 'undefined';
}

/**
 * Détection via User-Agent
 */
function detectFromUserAgent(): { isMobile: boolean; isTablet: boolean } {
  if (isSSR()) {
    return { isMobile: false, isTablet: false };
  }

  const ua = navigator.userAgent;
  const isMobile = MOBILE_REGEX.test(ua);
  const isTablet = TABLET_REGEX.test(ua);

  return { isMobile, isTablet };
}

/**
 * Détection via Media Queries (pointer)
 */
function detectFromMediaQueries(): { hasTouch: boolean; hasMouse: boolean } {
  if (isSSR()) {
    return { hasTouch: false, hasMouse: true };
  }

  const hasTouch = window.matchMedia('(pointer: coarse)').matches;
  const hasMouse = window.matchMedia('(pointer: fine)').matches;

  return { hasTouch, hasMouse };
}

/**
 * Combine les méthodes de détection pour un résultat fiable
 */
function detectDevice(): DeviceInfo {
  if (isSSR()) {
    // Valeurs par défaut SSR (desktop)
    return {
      isMobile: false,
      isDesktop: true,
      isTablet: false,
      hasTouch: false,
      hasMouse: true,
    };
  }

  const { isMobile: mobileFromUA, isTablet } = detectFromUserAgent();
  const { hasTouch, hasMouse } = detectFromMediaQueries();

  // Logique combinée :
  // - Mobile si UA dit mobile OU (touch sans mouse)
  // - Desktop si pas mobile ET a une souris
  const isMobile = mobileFromUA || (hasTouch && !hasMouse);
  const isDesktop = !isMobile && hasMouse;

  return {
    isMobile,
    isDesktop,
    isTablet,
    hasTouch,
    hasMouse,
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook de détection device
 * - SSR-safe (retourne desktop par défaut côté serveur)
 * - Recalcule au resize avec debounce 200ms
 * - Combine User-Agent et Media Queries
 *
 * @example
 * const { isMobile, isDesktop, hasTouch } = useDeviceDetect();
 *
 * if (isMobile) {
 *   return <BottomNavigation />;
 * } else {
 *   return <CoachSidebar />;
 * }
 */
export function useDeviceDetect(): UseDeviceDetectReturn {
  // État initial SSR-safe
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDevice());

  // Fonction de rafraîchissement
  const refresh = useCallback(() => {
    const newInfo = detectDevice();
    setDeviceInfo(newInfo);
  }, []);

  // Handler resize avec debounce
  const debouncedRefresh = useMemo(
    () => debounce(refresh, DEBOUNCE_MS),
    [refresh]
  );

  useEffect(() => {
    // Vérifier qu'on est côté client
    if (isSSR()) return;

    // Détection initiale (peut différer de l'état SSR)
    refresh();

    // Écouter les changements de taille
    window.addEventListener('resize', debouncedRefresh);

    // Écouter les changements de media queries
    const touchMediaQuery = window.matchMedia('(pointer: coarse)');
    const mouseMediaQuery = window.matchMedia('(pointer: fine)');

    const handleMediaChange = () => {
      refresh();
    };

    // Utiliser addEventListener si disponible (moderne) sinon addListener (legacy)
    if (touchMediaQuery.addEventListener) {
      touchMediaQuery.addEventListener('change', handleMediaChange);
      mouseMediaQuery.addEventListener('change', handleMediaChange);
    } else {
      // Fallback pour anciens navigateurs
      touchMediaQuery.addListener(handleMediaChange);
      mouseMediaQuery.addListener(handleMediaChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedRefresh);

      if (touchMediaQuery.removeEventListener) {
        touchMediaQuery.removeEventListener('change', handleMediaChange);
        mouseMediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        touchMediaQuery.removeListener(handleMediaChange);
        mouseMediaQuery.removeListener(handleMediaChange);
      }
    };
  }, [refresh, debouncedRefresh]);

  return {
    ...deviceInfo,
    refresh,
  };
}

// ============================================
// HOOKS SIMPLIFIÉS
// ============================================

/**
 * Retourne uniquement si mobile
 */
export function useIsMobile(): boolean {
  const { isMobile } = useDeviceDetect();
  return isMobile;
}

/**
 * Retourne uniquement si desktop
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = useDeviceDetect();
  return isDesktop;
}

// ============================================
// UTILITY: GET DEVICE TYPE STRING
// ============================================

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Retourne le type de device sous forme de string
 */
export function useDeviceType(): DeviceType {
  const { isMobile, isTablet } = useDeviceDetect();

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

// ============================================
// SERVER-SIDE DETECTION
// ============================================

/**
 * Détection côté serveur via User-Agent header
 * À utiliser dans getServerSideProps ou middleware
 *
 * @param userAgent - Header User-Agent de la requête
 */
export function detectDeviceFromUserAgent(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) {
    return {
      isMobile: false,
      isDesktop: true,
      isTablet: false,
      hasTouch: false,
      hasMouse: true,
    };
  }

  const isMobile = MOBILE_REGEX.test(userAgent);
  const isTablet = TABLET_REGEX.test(userAgent);

  return {
    isMobile,
    isDesktop: !isMobile,
    isTablet,
    hasTouch: isMobile,
    hasMouse: !isMobile,
  };
}

export default useDeviceDetect;
