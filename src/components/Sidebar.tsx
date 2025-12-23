import React from 'react';
import { Home, Play, History, Users, Settings, LogOut, Shield } from 'lucide-react';
import { User } from '../../types';

interface Props {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
  user: User | null;
}

export const Sidebar: React.FC<Props> = ({ currentView, setCurrentView, isAdmin, onLogout, user }) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'team', label: 'Mon Équipe', icon: Users },
    { id: 'settings', label: 'Réglages', icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="bg-slate-900 w-64 h-full flex flex-col border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl rotate-3">
          UP
        </div>
        <div>
            <h1 className="font-bold text-white text-lg">UltiPrepa</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{user?.role || 'Guest'}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};