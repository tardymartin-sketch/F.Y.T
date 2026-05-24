import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Exercise, MuscleGroup, MovementPattern } from '../../../../../types';

interface ExerciseFormProps {
  exercise?: Exercise;
  muscleGroups: MuscleGroup[];
  movementPatterns: MovementPattern[];
  isCommon?: boolean;
  onSave: (data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'> | Partial<Exercise>) => Promise<void>;
  onClose: () => void;
}

export function ExerciseForm({
  exercise,
  muscleGroups,
  movementPatterns,
  isCommon = false,
  onSave,
  onClose,
}: ExerciseFormProps) {
  const [name, setName] = useState(exercise?.name || '');
  const [aliasEn, setAliasEn] = useState(exercise?.aliasEn || '');
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl || '');
  const [primaryMuscleGroupId, setPrimaryMuscleGroupId] = useState(exercise?.primaryMuscleGroupId || '');
  const [movementPatternId, setMovementPatternId] = useState(exercise?.movementPatternId || '');
  const [limbType, setLimbType] = useState<'bilateral' | 'unilateral' | 'asymmetrical' | ''>(
    exercise?.limbType || ''
  );
  const [tempo, setTempo] = useState(exercise?.tempo || '');
  const [coachInstructions, setCoachInstructions] = useState(exercise?.coachInstructions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!exercise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!primaryMuscleGroupId) {
      setError('Le groupe musculaire est requis');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        aliasEn: aliasEn.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        primaryMuscleGroupId,
        movementPatternId: movementPatternId || undefined,
        limbType: limbType || undefined,
        tempo: tempo.trim() || undefined,
        coachInstructions: coachInstructions.trim() || undefined,
      });
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Un exercice avec ce nom existe déjà. Veuillez choisir un autre nom.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-theme-secondary rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-theme">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="text-lg font-semibold text-theme">
            {isEditing ? (isCommon ? 'Creer une variante' : 'Modifier l\'exercice') : 'Nouvel exercice'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-theme-muted hover:text-theme rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning for common exercise */}
        {isEditing && isCommon && (
          <div className="mx-4 mt-4 p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-primary)]">
              Cet exercice est commun. La modification creera une copie personnelle avec vos changements.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)] text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder="Ex: Developpe couche"
            />
          </div>

          {/* Alias EN */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Alias anglais
            </label>
            <input
              type="text"
              value={aliasEn}
              onChange={(e) => setAliasEn(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder="Ex: Bench Press"
            />
            <p className="mt-1 text-xs text-theme-muted">
              Permet la recherche en anglais. L'historique reste partagé.
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              URL Video
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder="https://..."
            />
          </div>

          {/* Muscle Group */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Groupe musculaire *
            </label>
            <select
              value={primaryMuscleGroupId}
              onChange={(e) => setPrimaryMuscleGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Selectionner...</option>
              {muscleGroups.map(mg => (
                <option key={mg.id} value={mg.id}>{mg.nameFr}</option>
              ))}
            </select>
          </div>

          {/* Movement Pattern */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Pattern de mouvement
            </label>
            <select
              value={movementPatternId}
              onChange={(e) => setMovementPatternId(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Selectionner...</option>
              {movementPatterns.map(mp => (
                <option key={mp.id} value={mp.id}>{mp.nameFr}</option>
              ))}
            </select>
          </div>

          {/* Limb Type */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Type de mouvement
            </label>
            <select
              value={limbType}
              onChange={(e) => setLimbType(e.target.value as typeof limbType)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Selectionner...</option>
              <option value="bilateral">Bilateral</option>
              <option value="unilateral">Unilateral</option>
              <option value="asymmetrical">Asymetrique</option>
            </select>
          </div>

          {/* Tempo */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Tempo par defaut
            </label>
            <input
              type="text"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder="Ex: 2-0-2-0"
            />
          </div>

          {/* Coach Instructions */}
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Consignes
            </label>
            <textarea
              value={coachInstructions}
              onChange={(e) => setCoachInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
              placeholder="Instructions pour l'execution..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-theme hover:text-theme-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Sauvegarde...' : isEditing ? (isCommon ? 'Creer la variante' : 'Enregistrer') : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
