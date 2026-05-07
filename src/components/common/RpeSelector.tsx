import React, { useState, useRef } from 'react';
import { Info, X, Check } from 'lucide-react';
import { RPE_SCALE, getRpeInfo, getRpeColor, getRpeBgColor } from '../../../types.ts';
import { Popover } from './Popover';

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
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const selectedInfo = value ? getRpeInfo(value) : null;

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-muted">{label}</span>
          <button
            ref={infoButtonRef}
            type="button"
            onClick={() => setShowInfo(true)}
            className="p-1 text-theme-muted hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
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
                : 'bg-theme-secondary text-theme-muted hover:bg-theme-tertiary hover:text-theme'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={`${rpe.value} - ${rpe.label}`}
          >
            {rpe.value}
          </button>
        ))}
      </div>

      {value && selectedInfo && (
        <p className="text-xs text-theme-muted italic">
          {selectedInfo.description}
        </p>
      )}

      {showInfo && (
        <RpeInfoModal onClose={() => setShowInfo(false)} anchorRef={infoButtonRef} />
      )}
    </div>
  );
};

interface RpeInfoModalProps {
  onClose: () => void;
  /** Ref vers le bouton déclencheur pour mode popover (desktop) */
  anchorRef?: React.RefObject<HTMLElement>;
}

export const RpeInfoModal: React.FC<RpeInfoModalProps> = ({ onClose, anchorRef }) => {
  // Contenu partagé
  const content = (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-theme border-b border-theme p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center">
            <Info className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme">Qu'est-ce que le RPE ?</h3>
            <p className="text-sm text-theme-muted">Rating of Perceived Exertion</p>
          </div>
        </div>
        {!anchorRef && (
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme hover:bg-theme-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        <div className="bg-theme-secondary rounded-xl p-4 border border-theme/50">
          <p className="text-theme leading-relaxed">
            Le <strong className="text-theme">RPE</strong> (Rating of Perceived Exertion) est une échelle
            de <strong className="text-theme">1 à 10</strong> qui mesure l'intensité <em>ressentie</em> de
            votre effort pendant un exercice ou une séance.
          </p>
          <p className="text-theme-muted text-sm mt-3">
            C'est un outil précieux pour adapter votre entraînement et communiquer avec votre coach
            sur comment vous vous sentez vraiment.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-theme uppercase tracking-wider mb-3">
            L'échelle RPE
          </h4>
          <div className="space-y-2">
            {RPE_SCALE.map((rpe) => (
              <div
                key={rpe.value}
                className="flex items-center gap-3 p-3 bg-theme-secondary/50 rounded-lg hover:bg-theme-secondary transition-colors"
              >
                <div className={`w-10 h-10 ${rpe.color} rounded-lg flex items-center justify-center font-bold text-white`}>
                  {rpe.value}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-theme">{rpe.label}</span>
                  <p className="text-sm text-theme-muted">{rpe.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-2">💡 Conseils d'utilisation</h4>
          <ul className="text-sm text-theme space-y-2">
            <li>• <strong>Soyez honnête</strong> - Le RPE reflète VOTRE ressenti, pas un objectif</li>
            <li>• <strong>RPE 6-7</strong> - Zone idéale pour la plupart des entraînements</li>
            <li>• <strong>RPE 8-10</strong> - À réserver pour les séances intensives</li>
            <li>• <strong>Surveillez les tendances</strong> - Un RPE élevé constant peut indiquer une fatigue</li>
          </ul>
        </div>
      </div>

      <div className="sticky bottom-0 bg-theme border-t border-theme p-4">
        <button
          onClick={onClose}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white py-3 rounded-xl font-semibold transition-colors"
        >
          J'ai compris !
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
        onClose={onClose}
        position="bottom-left"
        maxWidth={450}
        showCloseButton={true}
      >
        {content}
      </Popover>
    );
  }

  // Mode Modal classique (mobile ou sans anchorRef)
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme border border-theme rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
        {content}
      </div>
    </div>
  );
};

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

interface SessionRpeModalProps {
  onSubmit: (rpe: number) => void;
  onSkip: () => void;
  sessionName: string;
  exerciseCount: number;
}

export const SessionRpeModal: React.FC<SessionRpeModalProps> = ({
  onSubmit,
  onSkip,
  sessionName,
  exerciseCount
}) => {
  const [selectedRpe, setSelectedRpe] = useState<number | undefined>();
  const [showInfo, setShowInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (selectedRpe && !isSubmitting) {
      setIsSubmitting(true);
      onSubmit(selectedRpe);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme border border-theme rounded-2xl max-w-md w-full shadow-2xl animate-fade-in">
        <div className="p-6 text-center border-b border-theme">
          <div className="w-16 h-16 bg-[var(--color-success)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💪</span>
          </div>
          <h3 className="text-xl font-bold text-theme mb-2">Séance terminée !</h3>
          <p className="text-theme-muted text-sm">
            {sessionName} • {exerciseCount} exercices
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-theme font-medium">Comment avez-vous ressenti cette séance ?</p>
            <button
              onClick={() => setShowInfo(true)}
              className="p-1.5 text-theme-muted hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-center gap-2">
            {RPE_SCALE.map((rpe) => (
              <button
                key={rpe.value}
                onClick={() => setSelectedRpe(rpe.value)}
                className={`
                  w-9 h-9 rounded-lg font-bold transition-all duration-200
                  ${selectedRpe === rpe.value
                    ? `${rpe.color} text-white shadow-lg scale-110 ring-2 ring-white/30`
                    : 'bg-theme-secondary text-theme-muted hover:bg-theme-tertiary hover:text-theme'
                  }
                `}
              >
                {rpe.value}
              </button>
            ))}
          </div>

          {selectedRpe && (
            <div className={`text-center p-3 rounded-xl ${getRpeBgColor(selectedRpe)} animate-fade-in`}>
              <span className={`font-semibold ${getRpeColor(selectedRpe)}`}>
                {getRpeInfo(selectedRpe).label}
              </span>
              <p className="text-sm text-theme-muted mt-1">
                {getRpeInfo(selectedRpe).description}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedRpe || isSubmitting}
            className={`
              w-full py-3.5 rounded-xl font-semibold text-lg transition-all duration-300
              ${selectedRpe && !isSubmitting
                ? 'bg-[var(--color-success)] hover:opacity-90 text-white'
                : 'bg-theme-secondary text-theme-muted cursor-not-allowed'
              }
              ${isSubmitting ? 'bg-[var(--color-success)] text-white' : ''}
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2 animate-fade-in">
                <Check className="w-6 h-6 animate-scale-in" />
              </span>
            ) : selectedRpe ? (
              `Valider (RPE ${selectedRpe})`
            ) : (
              'Sélectionnez un RPE'
            )}
          </button>

          <button
            onClick={onSkip}
            className="w-full py-3 rounded-xl font-medium text-theme-muted hover:text-theme hover:bg-theme-secondary transition-colors"
          >
            Passer cette étape
          </button>
        </div>
      </div>

      {showInfo && (
        <RpeInfoModal onClose={() => setShowInfo(false)} />
      )}

      {/* CSS pour l'animation de la coche */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RpeSelector;
