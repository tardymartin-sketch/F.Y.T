// ============================================
// F.Y.T V3 — HOOK useUnreadCount
// src/hooks/useUnreadCount.ts
// Compteur temps réel messages non lus
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '../services/messagesService';

// ============================================
// TYPES
// ============================================

export interface UseUnreadCountReturn {
  count: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// ============================================
// HOOK PRINCIPAL (avec userId en paramètre)
// ============================================

/**
 * Hook pour gérer le compteur de messages non lus
 * - Fetch initial au mount
 * - Expose une fonction refresh pour mise à jour manuelle
 * 
 * @param userId - ID de l'utilisateur connecté
 */
export function useUnreadCount(userId: string | undefined): UseUnreadCountReturn {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const unreadCount = await getUnreadCount(userId);
      setCount(unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch unread count'));
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch initial au mount et quand userId change
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Fonction refresh exposée
  const refresh = useCallback(async () => {
    await fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    error,
    refresh,
  };
}

// ============================================
// HOOK AVEC AUTO-REFRESH
// ============================================

export interface UseUnreadCountAutoRefreshOptions {
  /** Intervalle de refresh automatique en ms (défaut: 30000) */
  intervalMs?: number;
  /** Activer/désactiver l'auto-refresh (défaut: true) */
  enabled?: boolean;
}

/**
 * Version avec auto-refresh périodique
 * Utile pour maintenir le badge à jour sans actions utilisateur
 * 
 * @param userId - ID de l'utilisateur connecté
 * @param options - Options de configuration
 */
export function useUnreadCountAutoRefresh(
  userId: string | undefined,
  options: UseUnreadCountAutoRefreshOptions = {}
): UseUnreadCountReturn {
  const { intervalMs = 30000, enabled = true } = options;
  const result = useUnreadCount(userId);

  useEffect(() => {
    if (!enabled || !userId) return;

    const interval = setInterval(() => {
      result.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, userId, result]);

  return result;
}

export default useUnreadCount;
