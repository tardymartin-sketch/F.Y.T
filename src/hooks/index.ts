// ===========================================
// F.Y.T - Hooks Index
// src/hooks/index.ts
// Export centralisé de tous les hooks personnalisés
// ===========================================

// Media Query & Responsive
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  useDeviceType,
  BREAKPOINTS,
  MEDIA_QUERIES,
} from './useMediaQuery';

// Swipe & Gestures
export {
  useSwipe,
  useSwipeNavigation,
  useSwipeToClose,
} from './useSwipe';
export type { SwipeHandlers, SwipeOptions } from './useSwipe';

// Local Storage & Persistence
export {
  useLocalStorage,
  useSessionStorage,
  useActiveSession,
  useUserPreferences,
  STORAGE_KEYS,
} from './useLocalStorage';
export type { ActiveSessionData, UserPreferences } from './useLocalStorage';
