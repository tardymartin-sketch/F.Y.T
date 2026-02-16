// ============================================================
// F.Y.T - ACTIVE SESSION DESKTOP (V3 Desktop Adaptation)
// src/components/desktop/ActiveSessionDesktop.tsx
// Réutilise ActiveSessionMobile avec layout desktop
// Comportements critiques mobile préservés:
// - Sauvegarde auto localStorage toutes les 5s
// - Restauration session au rechargement
// - Ghost Mode basé sur tonnage (pas 1RM)
// - Messages conditionnels ("Complète cette série...")
// - Support tous types de charge (single, double, barbell, machine, assisted, distance)
// - Un seul onglet de session actif (pas de multi-sessions)
// ============================================================

import React from 'react';
import { WorkoutRow, SessionLog, AthleteComment } from '../../../types';
import { ActiveSessionMobile } from '../mobile/ActiveSessionMobile';

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[];
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
  userId?: string;
  onSaveComment?: (exerciseName: string, comment: string, sessionId: string) => Promise<void>;
  existingComments?: AthleteComment[];
  onMarkCommentsAsRead?: (commentIds: string[]) => Promise<void>;
  onNavigateToCoachTab?: (exerciseName: string) => void;
}

/**
 * ActiveSessionDesktop - Version desktop de la séance active
 *
 * Réutilise intégralement ActiveSessionMobile avec layout="desktop"
 * pour garantir la préservation de tous les comportements critiques:
 * - Ghost Mode avec suggestions intelligentes basées sur le tonnage
 * - Tous les types de charge (single, double, barbell, machine, assisted, distance)
 * - Sauvegarde automatique localStorage
 * - Restauration de session au rechargement
 */
export const ActiveSession: React.FC<Props> = ({
  sessionData,
  history,
  onSave,
  onCancel,
  initialLog,
  userId,
  onSaveComment,
  // Props desktop non utilisées par mobile mais acceptées pour compatibilité
  existingComments,
  onMarkCommentsAsRead,
  onNavigateToCoachTab
}) => {
  return (
    <div className="h-full overflow-auto">
      <ActiveSessionMobile
        sessionData={sessionData}
        history={history}
        onSave={onSave}
        onCancel={onCancel}
        initialLog={initialLog}
        userId={userId}
        onSaveComment={onSaveComment}
        layout="desktop"
      />
    </div>
  );
};

// Alias pour nouveau nom + compatibilité
export const ActiveSessionDesktop = ActiveSession;
export default ActiveSessionDesktop;
