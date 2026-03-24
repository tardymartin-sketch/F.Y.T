import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ExerciseSubstitutionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  exerciseName: string;
}

const PREDEFINED_REASONS = [
  "Douleur ou gêne",
  "Matériel indisponible",
  "Trop difficile",
  "Trop facile",
  "Manque de temps",
];

export function ExerciseSubstitutionReasonModal({
  isOpen,
  onClose,
  onSubmit,
  exerciseName,
}: ExerciseSubstitutionReasonModalProps) {
  const [reason, setReason] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason);
    setReason("");
    setIsCustom(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-theme w-full max-w-sm rounded-2xl shadow-xl flex flex-col border border-theme animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme">Raison du changement</h2>
          <button onClick={onClose} className="p-2 text-theme-muted hover:bg-theme-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <p className="text-sm text-theme-muted">
            Indiquez à votre coach pourquoi vous remplacez l'exercice <span className="font-semibold text-theme">{exerciseName}</span> (optionnel).
          </p>

          {!isCustom ? (
            <div className="flex flex-col gap-2">
              {PREDEFINED_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    onSubmit(r);
                    setReason("");
                  }}
                  className="w-full text-left px-4 py-3 bg-theme-secondary/50 hover:bg-theme-secondary rounded-xl text-sm text-theme transition-colors border border-transparent hover:border-theme"
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className="w-full text-left px-4 py-3 bg-theme-secondary/50 hover:bg-theme-secondary rounded-xl text-sm text-theme transition-colors border border-transparent hover:border-theme text-center font-medium mt-2"
              >
                Autre raison...
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Épaule droite douloureuse sur ce mouvement..."
                className="w-full p-3 bg-theme-secondary border border-theme rounded-xl text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px] resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setReason("");
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-theme bg-theme-secondary hover:bg-theme-secondary/80 transition-colors"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  Valider
                </button>
              </div>
            </div>
          )}

          {!isCustom && (
            <button
              type="button"
              onClick={() => {
                onSubmit("");
                setReason("");
              }}
              className="w-full py-2.5 mt-2 text-sm text-theme-muted hover:text-theme transition-colors font-medium"
            >
              Passer (Ne pas justifier)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
