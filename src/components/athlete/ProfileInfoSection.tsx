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
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 ${className}`}>
      <div className="flex items-start justify-between">
        {/* Avatar + Infos */}
        <div className="flex items-center gap-4">
          {/* Avatar avec initiales */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>

          {/* Infos texte */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">{displayName}</h2>
            <p className="text-slate-400 text-sm">@{user.username}</p>
            {user.email && (
              <p className="text-slate-500 text-sm">{user.email}</p>
            )}
          </div>
        </div>

        {/* Bouton édition */}
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Modifier le profil"
        >
          <Pencil className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ProfileInfoSection;
