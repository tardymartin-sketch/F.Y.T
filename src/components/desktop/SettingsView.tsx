import React, { useState } from 'react';
import { User, ActiveMode } from '../../../types';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Bell, 
  Palette,
  LogOut,
  ChevronRight,
  Check,
  Save,
  AlertCircle,
  Users,
  Dumbbell,
  RefreshCw,
  Settings
} from 'lucide-react';

interface Props {
  user: User;
  onUpdateProfile?: (updates: Partial<User>) => Promise<void>;
  onLogout: () => void;
  activeMode?: ActiveMode;
  canSwitchToCoach?: boolean;
  canSwitchToAthlete?: boolean;
  onSwitchMode?: (mode: ActiveMode) => void;
}

export const SettingsView: React.FC<Props> = ({ 
  user, 
  onUpdateProfile, 
  onLogout,
  activeMode,
  canSwitchToCoach = false,
  canSwitchToAthlete = false,
  onSwitchMode,
}) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!onUpdateProfile) return;
    
    setSaving(true);
    try {
      await onUpdateProfile({ firstName, lastName });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return { label: 'Administrateur', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'coach':
        return { label: 'Coach', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Athlète', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
  };

  const getModeBadge = () => {
    switch (activeMode) {
      case 'admin':
        return { label: 'Mode Admin', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'coach':
        return { label: 'Mode Coach', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Mode Athlète', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
  };

  const roleBadge = getRoleBadge();
  const modeBadge = getModeBadge();

  // Déterminer si on peut afficher le bouton switch
  const showSwitchToCoach = activeMode === 'athlete' && canSwitchToCoach;
  const showSwitchToAthlete = (activeMode === 'coach' || activeMode === 'admin') && canSwitchToAthlete;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="pl-12">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold text-theme">Paramètres</h1>
            <p className="text-theme-muted mt-1">Gérez votre profil et vos préférences</p>
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className="bg-theme-secondary border border-theme rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-theme">Profil</h2>
              <p className="text-sm text-theme-muted">Vos informations personnelles</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar et badges */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-theme font-bold text-2xl">
              {firstName?.[0] || user.username[0]}{lastName?.[0] || ''}
            </div>
            <div>
              <p className="text-xl font-bold text-theme">
                {firstName || lastName ? `${firstName} ${lastName}` : user.username}
              </p>
              <p className="text-theme-muted">@{user.username}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-sm border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                {activeMode && activeMode !== user.role && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm border ${modeBadge.color}`}>
                    {modeBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-xl text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-xl text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-theme-tertiary/50 border border-theme rounded-xl">
                <Mail className="w-5 h-5 text-theme-muted" />
                <span className="text-theme-muted">{user.email || 'Non renseigné'}</span>
              </div>
            </div>
          </div>

          {/* Bouton Sauvegarder */}
          {onUpdateProfile && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                saved
                  ? 'bg-emerald-600 text-theme'
                  : 'bg-blue-600 hover:bg-blue-500 text-theme'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Enregistré !
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Section Changer de mode */}
      {onSwitchMode && (showSwitchToCoach || showSwitchToAthlete) && (
        <div className="bg-theme-secondary border border-theme rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-theme">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-theme">Changer de mode</h2>
                <p className="text-sm text-theme-muted">Basculer vers une autre interface</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {showSwitchToCoach && (
              <button
                onClick={() => onSwitchMode(user.role === 'admin' ? 'admin' : 'coach')}
                className="w-full flex items-center justify-between gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  <span>Passer en mode Coach</span>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {showSwitchToAthlete && (
              <button
                onClick={() => onSwitchMode('athlete')}
                className="w-full flex items-center justify-between gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-5 h-5" />
                  <span>Passer en mode Athlète</span>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Déconnexion */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 font-semibold transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Se déconnecter
      </button>
    </div>
  );
};

export default SettingsView;
