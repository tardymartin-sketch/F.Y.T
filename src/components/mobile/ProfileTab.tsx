// ============================================================
// F.Y.T - PROFILE TAB (ATH-008, ATH-009, ATH-012)
// src/components/athlete/ProfileTab.tsx
// Page profil complète de l'athlète avec badges
// ============================================================

import React, { useState } from 'react';
import { User } from '../../../types';
import { ProfileInfoSection } from './ProfileInfoSection';
import { ProfileEditModal } from './ProfileEditModal';
import { BadgesGrid } from './BadgesGrid';
import { AthleteSettings } from './AthleteSettings';
import { ThemeSelector } from './ThemeSelector';
import { LogOut } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  onUpdateProfile: (updates: { firstName: string; lastName: string }) => Promise<void>;
  onLogout: () => void;
  className?: string;
  // Desktop adaptation - default preserves mobile behavior
  layout?: 'mobile' | 'desktop';
}

// ===========================================
// COMPONENT
// ===========================================

export const ProfileTab: React.FC<Props> = ({
  user,
  onUpdateProfile,
  onLogout,
  className = '',
  layout = 'mobile' // Desktop adaptation - default preserves mobile behavior
}) => {
  // Layout helpers
  const isDesktop = layout === 'desktop';
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Infos Profil */}
      <ProfileInfoSection
        user={user}
        onEdit={() => setShowEditModal(true)}
      />

      {/* Section Badges (ATH-009) */}
      <BadgesGrid userId={user.id} />

      {/* Section Préférences */}
      <AthleteSettings />

      {/* Section Thème */}
      <div className="bg-theme-secondary border border-theme rounded-2xl p-4">
        <ThemeSelector />
      </div>

      {/* Bouton Déconnexion */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-theme-secondary border border-theme hover:border-[var(--color-danger)]/50 hover:bg-[var(--color-danger)]/10 text-theme-muted hover:text-[var(--color-danger)] rounded-2xl font-medium transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Se déconnecter
      </button>

      {/* Modal Édition */}
      {showEditModal && (
        <ProfileEditModal
          user={user}
          onSave={onUpdateProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default ProfileTab;
