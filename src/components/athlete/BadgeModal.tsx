// ============================================================
// F.Y.T - BADGE MODAL (ATH-010)
// src/components/athlete/BadgeModal.tsx
// Modal détail badge avec progression ou statut débloqué
// ============================================================

import React, { useEffect, useState } from 'react';
import { X, Trophy, Target, Calendar, Sparkles } from 'lucide-react';
import type { BadgeWithProgress, BadgeCategory } from '../../../types';

// ===========================================
// CONSTANTS
// ===========================================

const CATEGORY_STYLES: Record<BadgeCategory, {
  gradient: string;
  glow: string;
  text: string;
}> = {
  regularity: {
    gradient: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-400'
  },
  endurance: {
    gradient: 'from-green-500 to-green-600',
    glow: 'shadow-green-500/30',
    text: 'text-green-400'
  },
  perseverance: {
    gradient: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-500/30',
    text: 'text-purple-400'
  },
  community: {
    gradient: 'from-orange-500 to-orange-600',
    glow: 'shadow-orange-500/30',
    text: 'text-orange-400'
  },
  exploration: {
    gradient: 'from-cyan-500 to-cyan-600',
    glow: 'shadow-cyan-500/30',
    text: 'text-cyan-400'
  }
};

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  regularity: 'Régularité',
  endurance: 'Endurance',
  perseverance: 'Persévérance',
  community: 'Communauté',
  exploration: 'Exploration'
};

// ===========================================
// TYPES
// ===========================================

interface Props {
  badge: BadgeWithProgress;
  onClose: () => void;
}

// ===========================================
// HELPERS
// ===========================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getMotivationalMessage(progress: number, conditionValue: number): string {
  const remaining = conditionValue - progress;
  const percent = conditionValue > 0 ? (progress / conditionValue) * 100 : 0;

  if (percent >= 80) {
    return `Tu y es presque ! Plus que ${remaining} pour débloquer ce badge.`;
  } else if (percent >= 50) {
    return `Bonne progression ! Continue comme ça.`;
  } else if (percent >= 20) {
    return `Tu es sur la bonne voie, persévère !`;
  } else {
    return `Commence ton parcours vers ce badge !`;
  }
}

function getCongratulationMessage(): string {
  const messages = [
    'Bravo, tu as débloqué ce badge !',
    'Félicitations pour cette réussite !',
    'Excellent travail, continue ainsi !',
    'Super, un badge de plus à ta collection !',
    'Tu progresses à pas de géant !'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ===========================================
// COMPONENT
// ===========================================

export const BadgeModal: React.FC<Props> = ({ badge, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [congratsMessage] = useState(() =>
    badge.isUnlocked ? getCongratulationMessage() : ''
  );

  const styles = CATEGORY_STYLES[badge.category];
  const categoryLabel = CATEGORY_LABELS[badge.category];

  // Calcul des valeurs de progression
  const currentProgress = badge.progress ?? 0;
  const progressPercent = badge.conditionValue > 0
    ? Math.min((currentProgress / badge.conditionValue) * 100, 100)
    : 0;

  // Animation d'entrée
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Fermeture avec animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  // Fermer sur Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 bg-black/70 backdrop-blur-sm z-50
        flex items-center justify-center p-4
        transition-opacity duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          bg-slate-900 border border-slate-800 rounded-2xl
          w-full max-w-sm shadow-2xl overflow-hidden
          transition-all duration-200 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec badge */}
        <div className="relative p-6 pb-4">
          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge Icon - 64x64 */}
          <div className="flex justify-center mb-4">
            <div
              className={`
                relative w-20 h-20 rounded-2xl flex items-center justify-center
                ${badge.isUnlocked
                  ? `bg-gradient-to-br ${styles.gradient} shadow-lg ${styles.glow}`
                  : 'bg-slate-800 border border-slate-700'
                }
              `}
            >
              <div
                className={`w-10 h-10 ${badge.isUnlocked ? 'text-white' : 'text-slate-500'}`}
                dangerouslySetInnerHTML={{ __html: badge.iconSvg }}
              />

              {/* Sparkle effect pour les badges débloqués */}
              {badge.isUnlocked && (
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400" />
              )}
            </div>
          </div>

          {/* Catégorie */}
          <div className="flex justify-center mb-2">
            <span className={`text-xs font-medium ${styles.text} bg-slate-800 px-3 py-1 rounded-full`}>
              {categoryLabel}
            </span>
          </div>

          {/* Nom du badge */}
          <h2 className="text-xl font-bold text-white text-center">
            {badge.name}
          </h2>
        </div>

        {/* Contenu */}
        <div className="px-6 pb-6 space-y-4">
          {/* Description de la condition */}
          <p className="text-slate-400 text-center text-sm leading-relaxed">
            {badge.description}
          </p>

          {/* Statut */}
          {badge.isUnlocked ? (
            // Badge débloqué
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Trophy className="w-5 h-5" />
                <span className="font-medium">Badge débloqué !</span>
              </div>

              {badge.unlockedAt && (
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Obtenu le {formatDate(badge.unlockedAt)}</span>
                </div>
              )}

              <p className="text-green-300 text-sm text-center italic">
                {congratsMessage}
              </p>
            </div>
          ) : (
            // Badge verrouillé - afficher progression
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  Progression
                </span>
                <span className="text-white font-medium">
                  {currentProgress}/{badge.conditionValue}
                </span>
              </div>

              {/* Barre de progression */}
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${styles.gradient} transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${styles.text}`}>
                  {Math.round(progressPercent)}%
                </span>
                <span className="text-slate-500 text-xs">
                  Plus que {badge.conditionValue - currentProgress} !
                </span>
              </div>

              {/* Message motivationnel */}
              <p className="text-slate-400 text-xs text-center italic pt-1 border-t border-slate-700">
                {getMotivationalMessage(currentProgress, badge.conditionValue)}
              </p>
            </div>
          )}

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeModal;
