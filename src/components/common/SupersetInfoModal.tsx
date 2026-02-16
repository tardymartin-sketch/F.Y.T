// ============================================================
// F.Y.T - SUPERSET INFO MODAL
// src/components/common/SupersetInfoModal.tsx
// Modal d'information sur les modes d'exécution (superset, triset, etc.)
// ============================================================

import React from 'react';
import { X, Link2, Layers, ArrowDownCircle, ArrowUpCircle, Dumbbell } from 'lucide-react';
import { ExecutionMode, EXECUTION_MODES } from '../../../types';
import { Popover } from './Popover';

interface Props {
  executionMode: ExecutionMode;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  layout?: 'mobile' | 'desktop';
}

const ICON_MAP: Record<ExecutionMode, React.ReactNode> = {
  straight: <Dumbbell className="w-6 h-6 text-theme-muted" />,
  superset: <Link2 className="w-6 h-6 text-[var(--color-primary)]" />,
  triset: <Link2 className="w-6 h-6 text-[var(--color-primary)]" />,
  giant_set: <Layers className="w-6 h-6 text-[var(--color-primary)]" />,
  pre_fatigue: <ArrowDownCircle className="w-6 h-6 text-[var(--color-warning)]" />,
  post_fatigue: <ArrowUpCircle className="w-6 h-6 text-[var(--color-success)]" />,
};

const MODE_INSTRUCTIONS: Record<ExecutionMode, string[]> = {
  straight: [
    'Fais toutes tes séries pour cet exercice',
    'Prends ton temps de repos entre chaque série',
    'Passe à l\'exercice suivant une fois terminé',
  ],
  superset: [
    'Enchaîne les 2 exercices sans pause entre eux',
    'Prends ton repos uniquement après avoir fait les 2',
    'Répète jusqu\'à compléter toutes tes séries',
  ],
  triset: [
    'Enchaîne les 3 exercices sans pause entre eux',
    'Prends ton repos uniquement après avoir fait les 3',
    'Répète jusqu\'à compléter toutes tes séries',
  ],
  giant_set: [
    'Enchaîne tous les exercices du groupe sans pause',
    'Prends ton repos uniquement après avoir fait tous les exercices',
    'Répète jusqu\'à compléter toutes tes séries',
  ],
  pre_fatigue: [
    'Commence par l\'exercice d\'isolation',
    'Enchaîne directement avec l\'exercice composé',
    'Le muscle ciblé travaille plus malgré les muscles assistants',
  ],
  post_fatigue: [
    'Commence par l\'exercice composé avec charge lourde',
    'Enchaîne avec l\'exercice d\'isolation pour la finition',
    'Bonne finition musculaire après l\'effort principal',
  ],
};

export const SupersetInfoModal: React.FC<Props> = ({
  executionMode,
  onClose,
  anchorEl,
  layout = 'mobile',
}) => {
  const modeInfo = EXECUTION_MODES[executionMode];
  const instructions = MODE_INSTRUCTIONS[executionMode];
  const icon = ICON_MAP[executionMode];

  const content = (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-theme">{modeInfo.label}</h3>
          {modeInfo.exerciseCount && modeInfo.exerciseCount > 1 && (
            <span className="text-sm text-theme-muted">{modeInfo.exerciseCount} exercices</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-theme-tertiary/50 rounded-xl p-4 border border-theme">
        <p className="text-theme-secondary leading-relaxed">
          {modeInfo.description}
        </p>

        {/* Instructions */}
        <div className="mt-4 space-y-2">
          <p className="text-theme font-medium text-sm">Comment ça marche:</p>
          <ul className="text-theme-muted text-sm space-y-1">
            {instructions.map((instruction, idx) => (
              <li key={idx}>• {instruction}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full mt-4 py-3 bg-theme-tertiary hover:bg-theme-secondary text-theme rounded-xl font-medium transition-colors"
      >
        Compris !
      </button>
    </div>
  );

  // Desktop: Popover ancré
  if (layout === 'desktop' && anchorEl) {
    return (
      <Popover
        anchorEl={anchorEl}
        onClose={onClose}
        position="bottom"
        className="w-80"
      >
        {content}
      </Popover>
    );
  }

  // Mobile: Modal fullscreen/bottom sheet
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-theme-secondary w-full sm:w-96 sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-y-auto">
        {/* Header avec close */}
        <div className="sticky top-0 bg-theme-secondary p-4 border-b border-theme flex items-center justify-between">
          <span className="text-lg font-bold text-theme">{modeInfo.label}</span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-theme-muted hover:text-theme transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};

export default SupersetInfoModal;
