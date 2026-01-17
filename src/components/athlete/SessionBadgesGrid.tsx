// ============================================================
// F.Y.T - SESSION BADGES GRID
// src/components/athlete/SessionBadgesGrid.tsx
// Grille 3x3 réutilisable pour afficher les badges de séances
// ============================================================

import React, { useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { SessionLog } from '../../../types';

// ===========================================
// TYPES
// ===========================================

export interface SessionChipData {
  name: string;
  isCompleted?: boolean;
  isSuggested?: boolean;
}

interface Props {
  sessions: SessionChipData[] | string[];
  selectedSessions: Set<string>;
  selectionOrder: Map<string, number>;
  onToggle: (sessionName: string) => void;
  showCompletionStatus?: boolean;
  showSuggestedIndicator?: boolean;
  maxVisibleItems?: number;
  className?: string;
  history?: SessionLog[]; // Historique pour détecter les séances combinées
  weekStartDate?: string;
  weekEndDate?: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Vérifie si une séance a été complétée cette semaine
 * Gère les séances combinées (format "Séance 1 + Séance 2")
 */
function isSessionCompleted(
  sessionName: string,
  history: SessionLog[] | undefined,
  weekStartDate: string | undefined,
  weekEndDate: string | undefined
): boolean {
  if (!history || !weekStartDate || !weekEndDate) return false;

  const start = new Date(weekStartDate);
  const end = new Date(weekEndDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // Trouver les logs de cette semaine
  const weekLogs = history.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= start && logDate <= end;
  });

  console.log(`[isSessionCompleted] Recherche "${sessionName}" dans ${weekLogs.length} logs de la semaine`);

  // Vérifier si la séance est dans les logs (directe ou combinée)
  const result = weekLogs.some(log => {
    const logSessionName = log.sessionKey.seance;
    if (!logSessionName) return false;

    // Gérer différents formats de séparateurs : " + ", "+", " - ", etc.
    const sessionNames = logSessionName
      .split(/\s*\+\s*/) // Split sur "+" avec ou sans espaces
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    console.log(`  - Log "${logSessionName}" → Sessions parsées:`, sessionNames);

    // Normaliser les noms pour la comparaison (insensible à la casse et espaces)
    const normalizedSessionName = sessionName.trim().toLowerCase();
    const found = sessionNames.some((name: string) => name.trim().toLowerCase() === normalizedSessionName);

    if (found) {
      console.log(`    ✓ TROUVÉ "${sessionName}" dans "${logSessionName}"`);
    }

    return found;
  });

  console.log(`[isSessionCompleted] Résultat pour "${sessionName}":`, result);
  return result;
}

// ===========================================
// COMPONENT
// ===========================================

export const SessionBadgesGrid: React.FC<Props> = ({
  sessions,
  selectedSessions,
  selectionOrder,
  onToggle,
  showCompletionStatus = false,
  showSuggestedIndicator = false,
  maxVisibleItems = 9,
  className = '',
  history,
  weekStartDate,
  weekEndDate,
}) => {
  const [showAll, setShowAll] = useState(false);

  // DEBUG: Vérifier que le composant se charge et les props reçues
  console.log('=== SessionBadgesGrid RENDER ===', {
    showCompletionStatus,
    hasHistory: !!history,
    historyCount: history?.length || 0,
    weekStartDate,
    weekEndDate,
    sessionsCount: sessions.length
  });

  // Normaliser les sessions en objets
  const normalizedSessions: SessionChipData[] = sessions.map(s => {
    if (typeof s === 'string') {
      // Vérifier si complétée via l'historique
      const completed = showCompletionStatus
        ? isSessionCompleted(s, history, weekStartDate, weekEndDate)
        : false;

      // Debug: Log pour comprendre ce qui se passe
      if (showCompletionStatus && history && weekStartDate && weekEndDate) {
        console.log(`[SessionBadgesGrid] Vérification séance "${s}":`, {
          completed,
          weekStart: weekStartDate,
          weekEnd: weekEndDate,
          historyCount: history.length
        });
      }

      return {
        name: s,
        isCompleted: completed,
        isSuggested: false
      };
    }

    // Si showCompletionStatus activé, toujours recalculer via l'historique
    // (pour gérer les séances combinées "Séance 1 + Séance 2")
    // Sinon, utiliser la valeur existante
    const completed = showCompletionStatus
      ? isSessionCompleted(s.name, history, weekStartDate, weekEndDate)
      : (s.isCompleted || false);

    return {
      ...s,
      isCompleted: completed
    };
  });

  // Limiter l'affichage si nécessaire
  const visibleSessions = showAll
    ? normalizedSessions
    : normalizedSessions.slice(0, maxVisibleItems);

  const hasMore = normalizedSessions.length > maxVisibleItems;

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        {visibleSessions.map(session => {
          const isSelected = selectedSessions.has(session.name);
          const isCompleted = showCompletionStatus && session.isCompleted;
          const isSuggested = showSuggestedIndicator && session.isSuggested && !session.isCompleted;

          return (
            <button
              key={session.name}
              onClick={() => onToggle(session.name)}
              className={`
                relative flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : isCompleted
                    ? 'bg-slate-800/50 text-slate-500 line-through hover:bg-slate-700/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              {/* Icône de sélection */}
              {isSelected && !isCompleted && (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {isCompleted && (
                <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
              )}

              {/* Nom de la séance */}
              <span className="truncate">{session.name}</span>

              {/* Pastille numérotée d'ordre de sélection */}
              {isSelected && selectionOrder.has(session.name) && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-blue-600 text-xs font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-600">
                  {selectionOrder.get(session.name)}
                </span>
              )}

              {/* Pastille verte de suggestion (visible uniquement si pas sélectionné) */}
              {!isSelected && isSuggested && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Bouton d'expansion "..." */}
        {!showAll && hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          >
            ...
          </button>
        )}
      </div>

      {/* Bouton "Réduire" si grille étendue */}
      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-2 w-full text-xs text-slate-400 hover:text-white transition-colors py-2"
        >
          Réduire
        </button>
      )}
    </div>
  );
};

export default SessionBadgesGrid;
