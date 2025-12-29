import React, { useState } from 'react';
import { User } from '../../types';
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
  AlertCircle
} from 'lucide-react';

interface Props {
  user: User;
  onUpdateProfile?: (updates: Partial<User>) => Promise<void>;
  onLogout: () => void;
}

export const SettingsView: React.FC<Props> = ({ user, onUpdateProfile, onLogout }) => {
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

  const roleBadge = getRoleBadge();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-slate-400 mt-1">Gérez votre profil et vos préférences</p>
      </div>

      {/* Profil */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Profil</h2>
              <p className="text-sm text-slate-400">Vos informations personnelles</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar et badge */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
              {firstName?.[0] || user.username[0]}{lastName?.[0] || ''}
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {firstName || lastName ? `${firstName} ${lastName}` : user.username}
              </p>
              <p className="text-slate-400">@{user.username}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm border ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                <Mail className="w-5 h-5 text-slate-500" />
                <span className="text-slate-400">{user.email || 'Non renseigné'}</span>
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
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
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
