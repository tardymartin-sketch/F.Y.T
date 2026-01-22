// ============================================================
// F.Y.T - PR CELEBRATION MODAL
// src/components/athlete/PRCelebrationModal.tsx
// Modal de célébration des nouveaux records personnels
// ============================================================

import React, { useEffect, useState } from 'react';
import { X, Trophy, TrendingUp, Dumbbell, Flame } from 'lucide-react';
import type { PRDetected, PRType } from '../../../types';

// ===========================================
// CONSTANTS
// ===========================================

const PR_TYPE_CONFIG: Record<PRType, {
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  weight: {
    label: 'Poids Max',
    unit: 'kg',
    icon: <Dumbbell className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30'
  },
  volume: {
    label: 'Volume',
    unit: 'kg',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30'
  },
  '1rm': {
    label: '1RM Estimé',
    unit: 'kg',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30'
  }
};

// ===========================================
// TYPES
// ===========================================

interface Props {
  prs: PRDetected[];
  onClose: () => void;
}

// ===========================================
// HELPERS
// ===========================================

function formatValue(value: number, prType: PRType): string {
  if (prType === 'volume') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${Math.round(value)}kg`;
  }
  return `${value.toFixed(1)}kg`;
}

function formatImprovement(pr: PRDetected): string {
  const sign = pr.improvement > 0 ? '+' : '';
  if (pr.prType === 'volume' && pr.improvement >= 1000) {
    return `${sign}${(pr.improvement / 1000).toFixed(1)}t`;
  }
  return `${sign}${pr.improvement.toFixed(1)}kg`;
}

// ===========================================
// COMPONENT
// ===========================================

export const PRCelebrationModal: React.FC<Props> = ({ prs, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

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

  if (prs.length === 0) return null;

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
          w-full max-w-md shadow-2xl overflow-hidden
          transition-all duration-200 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 text-center">
          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Titre */}
          <h2 className="text-xl font-bold text-white mb-1">
            {prs.length === 1 ? 'Nouveau Record Personnel !' : 'Nouveaux Records Personnels !'}
          </h2>
          <p className="text-slate-400 text-sm">
            {prs.length === 1
              ? 'Tu viens de battre ton record'
              : `Tu viens de battre ${prs.length} records`}
          </p>
        </div>

        {/* Liste des PRs */}
        <div className="px-6 pb-6 space-y-3 max-h-80 overflow-y-auto">
          {prs.map((pr, index) => {
            const config = PR_TYPE_CONFIG[pr.prType];
            return (
              <div
                key={`${pr.exerciseName}-${pr.prType}-${index}`}
                className={`
                  ${config.bgColor} border rounded-xl p-4
                  transition-all duration-300
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Nom exercice + type */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white truncate mr-2">
                    {pr.exerciseName}
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </span>
                </div>

                {/* Valeurs */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 line-through">
                      {formatValue(pr.previousRecord, pr.prType)}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className={`font-bold ${config.color}`}>
                      {formatValue(pr.newRecord, pr.prType)}
                    </span>
                  </div>

                  {/* Amélioration */}
                  <span className="text-green-400 text-sm font-medium">
                    {formatImprovement(pr)} ({pr.improvementPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bouton continuer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/20"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PRCelebrationModal;
