// ============================================================
// F.Y.T - PROFILE INFO SECTION (ATH-008)
// src/components/athlete/ProfileInfoSection.tsx
// Affichage des infos profil avec bouton édition
// ============================================================

import React from 'react';
import { User } from '../../../types';
import { Pencil } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  onEdit: () => void;
  className?: string;
}

// ===========================================
// HELPERS
// ===========================================

function getInitials(user: User): string {
  const first = user.firstName?.charAt(0) || '';
  const last = user.lastName?.charAt(0) || '';
  if (first || last) {
    return (first + last).toUpperCase();
  }
  return user.username.charAt(0).toUpperCase();
}

function getDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.username;
}

// ===========================================
// COMPONENT
// ===========================================

export const ProfileInfoSection: React.FC<Props> = ({
  user,
  onEdit,
  className = ''
}) => {
  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  return (
    <div className={`bg-theme-secondary border border-theme rounded-2xl p-6 ${className}`}>
      <div className="flex items-start justify-between">
        {/* Avatar + Infos */}
        <div className="flex items-center gap-4">
          {/* Avatar avec initiales */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>

          {/* Infos texte */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-theme">{displayName}</h2>
            <p className="text-theme-muted text-sm">@{user.username}</p>
            {user.email && (
              <p className="text-theme-muted text-sm">{user.email}</p>
            )}
          </div>
        </div>

        {/* Bouton édition */}
        <button
          onClick={onEdit}
          className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
          aria-label="Modifier le profil"
        >
          <Pencil className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ProfileInfoSection;
