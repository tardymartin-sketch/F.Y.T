// ============================================================
// F.Y.T - RELAUNCH CONFIRM MODAL
// src/components/common/history/RelaunchConfirmModal.tsx
// Confirmation avant de relancer une séance (avec liste des exercices)
// ============================================================

import React from 'react';
import { createPortal } from 'react-dom';
import { SessionLog } from '../../../../types';
import { RefreshCw, X, Dumbbell } from 'lucide-react';

interface Props {
  session: SessionLog;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RelaunchConfirmModal: React.FC<Props> = ({ session, onConfirm, onCancel }) => {
  const name = session.sessionKey.seance || session.templateName || 'Séance';
  const exercises = session.exercises ?? [];

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent)]/20 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme">Relancer cette séance ?</h3>
            <p className="text-sm text-theme-muted">Les séries seront vides</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Session name */}
      <div className="mx-5 mb-3">
        <p className="text-sm font-semibold text-theme">{name}</p>
      </div>

      {/* Exercise list */}
      <div className="mx-5 mb-5 bg-theme-tertiary/50 rounded-xl border border-theme/50 overflow-hidden">
        {exercises.length === 0 ? (
          <div className="px-4 py-3 text-sm text-theme-muted">Aucun exercice</div>
        ) : (
          exercises.map((ex, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-2.5 ${idx < exercises.length - 1 ? 'border-b border-theme/30' : ''}`}
            >
              <Dumbbell className="w-4 h-4 text-theme-muted flex-shrink-0" />
              <span className="flex-1 text-sm text-theme truncate">{ex.exerciseName}</span>
              <span className="text-xs text-theme-muted flex-shrink-0">
                {ex.sets.length} série{ex.sets.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 pb-5">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-theme-tertiary hover:opacity-90 text-theme rounded-xl font-medium transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 bg-[var(--color-accent)] hover:opacity-90 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Lancer
        </button>
      </div>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-end justify-center sm:items-center p-4">
      <div className="bg-theme-secondary border border-theme rounded-2xl w-full max-w-sm shadow-2xl">
        {content}
      </div>
    </div>,
    document.body
  );
};

export default RelaunchConfirmModal;
