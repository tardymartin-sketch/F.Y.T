// ============================================================
// F.Y.T - PROFILE EDIT MODAL (ATH-008)
// src/components/athlete/ProfileEditModal.tsx
// Modal d'édition du profil (prénom/nom modifiables)
// ============================================================

import React, { useState } from 'react';
import { User } from '../../../types';
import { X, Lock, Loader2 } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  onSave: (updates: { firstName: string; lastName: string }) => Promise<void>;
  onClose: () => void;
}

// ===========================================
// COMPONENT
// ===========================================

export const ProfileEditModal: React.FC<Props> = ({
  user,
  onSave,
  onClose
}) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      onClose();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Erreur sauvegarde profil:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme-secondary border border-theme rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="text-lg font-semibold text-theme">Modifier le profil</h2>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Prénom - modifiable */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              className="w-full bg-theme-tertiary border border-theme rounded-xl px-4 py-3 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Nom - modifiable */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Votre nom"
              className="w-full bg-theme-tertiary border border-theme rounded-xl px-4 py-3 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Username - readonly */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5 flex items-center gap-1.5">
              Nom d'utilisateur
              <Lock className="w-3.5 h-3.5 text-theme-muted" />
            </label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full bg-theme-tertiary border border-theme/50 rounded-xl px-4 py-3 text-theme-muted cursor-not-allowed"
            />
            <p className="text-xs text-theme-muted mt-1">
              Le nom d'utilisateur ne peut pas être modifié
            </p>
          </div>

          {/* Email - readonly */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1.5 flex items-center gap-1.5">
              Email
              <Lock className="w-3.5 h-3.5 text-theme-muted" />
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full bg-theme-tertiary border border-theme/50 rounded-xl px-4 py-3 text-theme-muted cursor-not-allowed"
            />
            <p className="text-xs text-theme-muted mt-1">
              L'email est lié à votre compte et ne peut pas être modifié ici
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-xl text-[var(--color-danger)] text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-theme-tertiary hover:bg-theme-secondary text-theme rounded-xl font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
