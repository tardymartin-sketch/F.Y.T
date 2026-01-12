// ===========================================
// F.Y.T - Hook useSwipe
// src/hooks/useSwipe.ts
// Gestion des gestes tactiles (swipe)
// ===========================================

import { useEffect, useRef, useCallback } from 'react';

// ===========================================
// TYPES
// ===========================================

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface SwipeOptions {
  /** Seuil minimum en pixels pour déclencher un swipe (défaut: 50) */
  threshold?: number;
  /** Empêcher le scroll pendant le swipe (défaut: false) */
  preventScroll?: boolean;
  /** Direction(s) à écouter (défaut: toutes) */
  directions?: ('left' | 'right' | 'up' | 'down')[];
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

// ===========================================
// HOOK useSwipe
// ===========================================

/**
 * Hook pour détecter les gestes de swipe sur un élément
 * @param ref - Référence vers l'élément DOM à surveiller
 * @param handlers - Callbacks pour chaque direction de swipe
 * @param options - Options de configuration
 */
export function useSwipe<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
): void {
  const {
    threshold = 50,
    preventScroll = false,
    directions = ['left', 'right', 'up', 'down'],
  } = options;

  const startPosition = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startPosition.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventScroll && startPosition.current) {
      const touch = e.touches[0];
      const diffX = Math.abs(touch.clientX - startPosition.current.x);
      const diffY = Math.abs(touch.clientY - startPosition.current.y);
      
      // Empêcher le scroll si le mouvement horizontal est dominant
      if (diffX > diffY && diffX > 10) {
        e.preventDefault();
      }
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!startPosition.current) return;

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - startPosition.current.x;
    const diffY = touch.clientY - startPosition.current.y;
    const timeDiff = Date.now() - startPosition.current.time;

    // Ignorer les swipes trop lents (> 1 seconde)
    if (timeDiff > 1000) {
      startPosition.current = null;
      return;
    }

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // Déterminer la direction principale
    if (absX > absY && absX >= threshold) {
      // Swipe horizontal
      if (diffX > 0 && directions.includes('right')) {
        handlers.onSwipeRight?.();
      } else if (diffX < 0 && directions.includes('left')) {
        handlers.onSwipeLeft?.();
      }
    } else if (absY > absX && absY >= threshold) {
      // Swipe vertical
      if (diffY > 0 && directions.includes('down')) {
        handlers.onSwipeDown?.();
      } else if (diffY < 0 && directions.includes('up')) {
        handlers.onSwipeUp?.();
      }
    }

    startPosition.current = null;
  }, [handlers, threshold, directions]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Options pour le listener
    const listenerOptions: AddEventListenerOptions = {
      passive: !preventScroll,
    };

    element.addEventListener('touchstart', handleTouchStart, listenerOptions);
    element.addEventListener('touchmove', handleTouchMove, listenerOptions);
    element.addEventListener('touchend', handleTouchEnd, listenerOptions);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);
}

// ===========================================
// HOOK useSwipeNavigation
// ===========================================

/**
 * Hook simplifié pour la navigation par swipe (gauche/droite)
 * Utile pour la navigation entre onglets ou exercices
 */
export function useSwipeNavigation<T extends HTMLElement>(
  ref: React.RefObject<T>,
  onNext: () => void,
  onPrevious: () => void,
  options?: Omit<SwipeOptions, 'directions'>
): void {
  useSwipe(
    ref,
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrevious,
    },
    {
      ...options,
      directions: ['left', 'right'],
    }
  );
}

// ===========================================
// HOOK useSwipeToClose
// ===========================================

/**
 * Hook pour fermer un élément en swipant vers le bas
 * Utile pour les modals et les sheets
 */
export function useSwipeToClose<T extends HTMLElement>(
  ref: React.RefObject<T>,
  onClose: () => void,
  options?: Omit<SwipeOptions, 'directions'>
): void {
  useSwipe(
    ref,
    {
      onSwipeDown: onClose,
    },
    {
      ...options,
      directions: ['down'],
      threshold: options?.threshold ?? 100, // Seuil plus élevé pour éviter les fermetures accidentelles
    }
  );
}
