// ============================================================
// F.Y.T - RPE SELECTOR COMPONENT
// src/components/RpeSelector.tsx
// Sélecteur de RPE (Rating of Perceived Exertion) avec info
// ============================================================

import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { RPE_SCALE, getRpeInfo, getRpeColor, getRpeBgColor } from '../../types';

interface RpeSelectorProps {
  value?: number;
  onChange: (rpe: number | undefined) => void;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const RpeSelector: React.FC<RpeSelectorProps> = ({
  value,
  onChange,
  label = 'RPE',
  showLabel = true,
  size = 'md',
  disabled = false
}) => {
  const [showInfo, setShowInfo] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const selectedInfo = value ? getRpeInfo(value) : null;

  return (
    <div className="space-y-2">
      {/* Label avec bouton info */}
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-400">{label}</span>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
            title="Qu'est-ce que le RPE ?"
          >
            <Info className="w-4 h-4" />
          </button>
          {value && selectedInfo && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRpeBgColor(value)} ${getRpeColor(value)}`}>
              {selectedInfo.label}
            </span>
          )}
        </div>
      )}

      {/* Sélecteur 1-10 */}
      <div className="flex items-center gap-1.5">
        {RPE_SCALE.map((rpe) => (
          <button
            key={rpe.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === rpe.value ? undefined : rpe.value)}
            className={`
              ${sizeClasses[size]} 
              rounded-lg font-bold transition-all duration-200
              ${value === rpe.value
                ? `${rpe.color} text-white shadow-lg scale-110`
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={`${rpe.value} - ${rpe.label}`}
          >
            {rpe.value}
          </button>
        ))}
      </div>

      {/* Description du RPE sélectionné */}
      {value && selectedInfo && (
        <p className="text-xs text-slate-500 italic">
          {selectedInfo.description}
        </p>
      )}

      {/* Modal Info RPE */}
      {showInfo && (
        <RpeInfoModal onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
};

// ============================================================
// RPE INFO MODAL
// ============================================================

interface RpeInfoModalProps {
  onClose: () => void;
}

export const RpeInfoModal: React.FC<RpeInfoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Qu'est-ce que le RPE ?</h3>
              <p className="text-sm text-slate-400">Rating of Perceived Exertion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Description */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-300 leading-relaxed">
              Le <strong className="text-white">RPE</strong> (Rating of Perceived Exertion) est une échelle 
              de <strong className="text-white">1 à 10</strong> qui mesure l'intensité <em>ressentie</em> de 
              votre effort pendant un exercice ou une séance.
            </p>
            <p className="text-slate-400 text-sm mt-3">
              C'est un outil précieux pour adapter votre entraînement et communiquer avec votre coach 
              sur comment vous vous sentez vraiment.
            </p>
          </div>

          {/* Échelle complète */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              L'échelle RPE
            </h4>
            <div className="space-y-2">
              {RPE_SCALE.map((rpe) => (
                <div 
                  key={rpe.value}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className={`w-10 h-10 ${rpe.color} rounded-lg flex items-center justify-center font-bold text-white`}>
                    {rpe.value}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-white">{rpe.label}</span>
                    <p className="text-sm text-slate-400">{rpe.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conseils */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Conseils d'utilisation</h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• <strong>Soyez honnête</strong> - Le RPE reflète VOTRE ressenti, pas un objectif</li>
              <li>• <strong>RPE 6-7</strong> - Zone idéale pour la plupart des entraînements</li>
              <li>• <strong>RPE 8-10</strong> - À réserver pour les séances intensives</li>
              <li>• <strong>Surveillez les tendances</strong> - Un RPE élevé constant peut indiquer une fatigue</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            J'ai compris !
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// RPE DISPLAY BADGE (pour l'affichage en lecture seule)
// ============================================================

interface RpeBadgeProps {
  rpe: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RpeBadge: React.FC<RpeBadgeProps> = ({ 
  rpe, 
  showLabel = true,
  size = 'md' 
}) => {
  const info = getRpeInfo(rpe);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg ${getRpeBgColor(rpe)} ${sizeClasses[size]}`}>
      <span className={`font-bold ${getRpeColor(rpe)}`}>{rpe}</span>
      {showLabel && (
        <span className={`${getRpeColor(rpe)} opacity-80`}>{info.label}</span>
      )}
    </div>
  );
};

// ============================================================
// SESSION RPE MODAL (pour le RPE global de la séance)
// ============================================================

interface SessionRpeModalProps {
  onSubmit: (rpe: number) => void;
  onSkip: () => void;
  sessionName: string;
  durationMinutes: number;
  exerciseCount: number;
}

export const SessionRpeModal: React.FC<SessionRpeModalProps> = ({
  onSubmit,
  onSkip,
  sessionName,
  durationMinutes,
  exerciseCount
}) => {
  const [selectedRpe, setSelectedRpe] = useState<number | undefined>();
  const [showInfo, setShowInfo] = useState(false);

  const handleSubmit = () => {
    if (selectedRpe) {
      onSubmit(selectedRpe);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
    }
    return `${mins} min`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💪</span>
          </div>
          <h3 className="text-xl font-bold text-white">Séance terminée !</h3>
          <p className="text-slate-400 mt-1">Comment avez-vous ressenti cette séance ?</p>
        </div>

        {/* Stats de la séance */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{sessionName}</span>
              <span className="text-slate-500">Séance</span>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <span className="block text-2xl font-bold text-emerald-400">{formatDuration(durationMinutes)}</span>
              <span className="text-slate-500">Durée</span>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <span className="block text-2xl font-bold text-blue-400">{exerciseCount}</span>
              <span className="text-slate-500">Exercices</span>
            </div>
          </div>
        </div>

        {/* Sélecteur RPE */}
        <div className="p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm font-medium text-slate-300">RPE global de la séance</span>
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Boutons RPE */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {RPE_SCALE.map((rpe) => (
              <button
                key={rpe.value}
                type="button"
                onClick={() => setSelectedRpe(rpe.value)}
                className={`
                  w-10 h-10 rounded-xl font-bold text-lg transition-all duration-200
                  ${selectedRpe === rpe.value
                    ? `${rpe.color} text-white shadow-lg scale-110 ring-2 ring-white/30`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                {rpe.value}
              </button>
            ))}
          </div>

          {/* Description du RPE sélectionné */}
          {selectedRpe && (
            <div className={`text-center p-3 rounded-xl ${getRpeBgColor(selectedRpe)} animate-fade-in`}>
              <span className={`font-semibold ${getRpeColor(selectedRpe)}`}>
                {getRpeInfo(selectedRpe).label}
              </span>
              <p className="text-sm text-slate-400 mt-1">
                {getRpeInfo(selectedRpe).description}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedRpe}
            className={`
              w-full py-3.5 rounded-xl font-semibold text-lg transition-all
              ${selectedRpe
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {selectedRpe ? `Valider (RPE ${selectedRpe})` : 'Sélectionnez un RPE'}
          </button>
          
          <button
            onClick={onSkip}
            className="w-full py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Passer cette étape
          </button>
        </div>
      </div>

      {/* Modal Info RPE */}
      {showInfo && (
        <RpeInfoModal onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
};

export default RpeSelector;
