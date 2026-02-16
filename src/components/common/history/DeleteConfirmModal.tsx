// ============================================================
// F.Y.T - DELETE CONFIRM MODAL
// src/components/common/history/DeleteConfirmModal.tsx
// Modal de confirmation de suppression partagée Desktop/Mobile
// Utilise Popover en mode desktop pour positionnement relatif
// ============================================================

import React from 'react';
import { createPortal } from 'react-dom';
import { SessionLog } from '../../../../types';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { RpeBadge } from '../../common/RpeSelector';
import { Popover } from '../Popover';

// ===========================================
// TYPES
// ===========================================

interface Props {
  session: SessionLog;
  onConfirm: () => void;
  onCancel: () => void;
  /** Afficher le bouton X en haut à droite (mode mobile) */
  showCloseButton?: boolean;
  /** Ref vers le bouton déclencheur pour mode popover (desktop) */
  anchorRef?: React.RefObject<HTMLElement>;
}

// ===========================================
// HELPERS
// ===========================================

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// ===========================================
// COMPONENT
// ===========================================

export const DeleteConfirmModal: React.FC<Props> = ({
  session,
  onConfirm,
  onCancel,
  showCloseButton = false,
  anchorRef
}) => {
  const fullDate = formatFullDate(session.date);

  // Contenu partagé entre les deux modes
  const content = (
    <>
      {/* Header - sans le X car géré par Popover en mode desktop */}
      <div className={`flex items-center ${showCloseButton && !anchorRef ? 'justify-between' : 'gap-3'} mb-4 px-5 pt-5`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-danger)]/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme">Supprimer la séance ?</h3>
            <p className="text-sm text-theme-muted">Cette action est irréversible</p>
          </div>
        </div>
        {showCloseButton && !anchorRef && (
          <button
            onClick={onCancel}
            className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Session info */}
      <div className="bg-theme-tertiary/50 rounded-xl p-4 mb-6 border border-theme/50 mx-5">
        <h4 className="font-semibold text-theme text-lg mb-1">
          {session.sessionKey.seance}
        </h4>
        <div className="flex items-center gap-2 text-sm text-theme-muted mb-2">
          <Calendar className="w-4 h-4" />
          {fullDate}
        </div>
        {session.sessionRpe && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted uppercase font-bold">RPE</span>
            <RpeBadge rpe={session.sessionRpe} size="sm" />
          </div>
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
          className="flex-1 py-3 bg-[var(--color-danger)] hover:opacity-90 text-white rounded-xl font-medium transition-colors"
        >
          Supprimer
        </button>
      </div>
    </>
  );

  // Mode Popover (desktop avec anchorRef)
  if (anchorRef) {
    return (
      <Popover
        anchorRef={anchorRef}
        isOpen={true}
        onClose={onCancel}
        position="top-right"
        maxWidth={380}
        showCloseButton={true}
      >
        {content}
      </Popover>
    );
  }

  // Mode Modal classique (mobile ou sans anchorRef)
  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-theme-secondary border border-theme rounded-2xl max-w-sm w-full shadow-2xl">
        {content}
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
