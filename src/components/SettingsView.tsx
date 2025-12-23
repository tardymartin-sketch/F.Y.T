import React from 'react';
import { User } from '../../types';
import { Settings, User as UserIcon, Mail, Bell, Shield } from 'lucide-react';

interface Props {
  user: User;
}

export const SettingsView: React.FC<Props> = ({ user }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-4">Réglages</h2>

      {/* Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            {user.firstName?.[0] || user.username?.[0] || '?'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-slate-400">@{user.username}</p>
            <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white">{user.email || 'Non défini'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Rôle</p>
                <p className="text-white capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-400" />
          Notifications
        </h3>
        <p className="text-slate-500 text-sm">
          Les notifications seront disponibles dans une prochaine mise à jour.
        </p>
      </div>

      {/* App Info */}
      <div className="text-center text-slate-600 text-sm">
        <p>UltiPrepa v1.0.0</p>
        <p className="mt-1">© 2024 - Tous droits réservés</p>
      </div>
    </div>
  );
};
