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
import { LogOut, Link2 } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  onUpdateProfile: (updates: { firstName: string; lastName: string }) => Promise<void>;
  onLogout: () => void;
  className?: string;
}

// ===========================================
// COMPONENT
// ===========================================

export const ProfileTab: React.FC<Props> = ({
  user,
  onUpdateProfile,
  onLogout,
  className = ''
}) => {
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

      {/* Section Connexions (Strava, etc.) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Connexions</h3>
        </div>

        <div className="p-4">
          {/* Strava */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FC4C02]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.008 13.828h4.172" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-medium">Strava</h4>
                <p className="text-sm text-slate-400">Non connecté</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-xl text-sm font-medium transition-colors">
              Connecter
            </button>
          </div>
        </div>
      </div>

      {/* Bouton Déconnexion */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-2xl font-medium transition-colors"
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
